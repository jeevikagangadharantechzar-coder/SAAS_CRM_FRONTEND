import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, RefreshCw, X } from "lucide-react";
import { getSocket } from "../../utils/socket";

const API_URL = import.meta.env.VITE_API_URL;

// Vite doesn't resolve Leaflet's default marker image URLs correctly out of
// the box — without this, markers render as broken/invisible icons.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const DEFAULT_CENTER = [20.5937, 78.9629]; // India, used only when nobody has reported a location yet

const timeAgo = (dateStr) => {
  if (!dateStr) return "never";
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

// Recenters the map on the first load (fit everyone in view) and again
// whenever the selected salesperson changes (fly to just them) — but never
// fights the user's own pan/zoom on a routine live position update that
// isn't tied to a selection change.
function MapController({ selectedUserId, selectedPoint, allPoints }) {
  const map = useMap();
  const lastSelectionRef = useRef(undefined);

  useEffect(() => {
    if (lastSelectionRef.current === selectedUserId) return;
    lastSelectionRef.current = selectedUserId;

    if (selectedUserId) {
      if (selectedPoint) map.flyTo(selectedPoint, 14);
      return;
    }

    if (!allPoints.length) return;
    if (allPoints.length === 1) {
      map.flyTo(allPoints[0], 12);
    } else {
      map.fitBounds(allPoints, { padding: [40, 40] });
    }
  }, [selectedUserId, selectedPoint, allPoints, map]);

  return null;
}

export default function LiveLocations() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState(null);

  const fetchTeam = async () => {
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.get(`${API_URL}/location/team`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTeam(data.team || []);
    } catch (err) {
      console.error("Fetch team locations error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleLocationUpdate = (loc) => {
      setTeam((prev) => {
        const exists = prev.some((m) => m.userId === loc.userId);
        if (exists) {
          return prev.map((m) => (m.userId === loc.userId ? { ...m, ...loc } : m));
        }
        return [...prev, loc];
      });
    };

    socket.on("location_update", handleLocationUpdate);
    return () => socket.off("location_update", handleLocationUpdate);
  }, []);

  const located = team.filter((m) => m.latitude != null && m.longitude != null);
  const points = located.map((m) => [m.latitude, m.longitude]);

  const selectedMember = selectedUserId ? located.find((m) => m.userId === selectedUserId) : null;
  const selectedPoint = selectedMember ? [selectedMember.latitude, selectedMember.longitude] : null;
  // Map shows only the selected rep once one is picked; otherwise everyone
  // with a known location (clicking the same row again clears the selection).
  const visibleMarkers = selectedMember ? [selectedMember] : located;

  const handleSelectMember = (member) => {
    if (member.latitude == null) return; // nothing to show on the map for them
    setSelectedUserId((prev) => (prev === member.userId ? null : member.userId));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-[#008ecc]" />
            Live Team Locations
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Updates automatically as each sales rep's browser reports its position. Only reps who have
            granted location permission and have the app open will appear here.
            {selectedMember && " Showing only the selected rep — click them again or \"Show All\" to reset."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedMember && (
            <button
              onClick={() => setSelectedUserId(null)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Show All
            </button>
          )}
          <button
            onClick={fetchTeam}
            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Sales Team ({team.length})
          </div>
          <div className="divide-y divide-gray-100 max-h-[560px] overflow-y-auto">
            {team.map((m) => {
              const hasLocation = m.latitude != null;
              const isSelected = m.userId === selectedUserId;
              return (
                <div
                  key={m.userId}
                  onClick={() => handleSelectMember(m)}
                  className={`px-4 py-3 flex items-center justify-between transition-colors ${
                    hasLocation ? "cursor-pointer hover:bg-blue-50" : "cursor-not-allowed opacity-70"
                  } ${isSelected ? "bg-blue-50" : ""}`}
                  title={hasLocation ? "Click to show only this rep on the map" : "No location reported yet"}
                >
                  <div>
                    <p className={`text-sm font-medium ${isSelected ? "text-[#008ecc]" : "text-gray-800"}`}>
                      {m.name}
                    </p>
                    <p className="text-xs text-gray-400">{m.email}</p>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                      hasLocation
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-gray-50 text-gray-400 border-gray-200"
                    }`}
                  >
                    {hasLocation ? timeAgo(m.updatedAt) : "No location"}
                  </span>
                </div>
              );
            })}
            {team.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-gray-400">No sales users yet.</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden" style={{ height: 560 }}>
          <MapContainer center={DEFAULT_CENTER} zoom={5} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController selectedUserId={selectedUserId} selectedPoint={selectedPoint} allPoints={points} />
            {visibleMarkers.map((m) => (
              <Marker key={m.userId} position={[m.latitude, m.longitude]}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{m.name}</p>
                    <p className="text-gray-500">{m.email}</p>
                    <p className="text-gray-400 text-xs mt-1">Updated {timeAgo(m.updatedAt)}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
