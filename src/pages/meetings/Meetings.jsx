import React, { useState } from "react";
import { Plus, Video, AlertTriangle, RefreshCw, X } from "lucide-react";
import { format } from "date-fns";
import useMeetings from "./useMeetings";
import MeetingCard from "./MeetingCard";
import MeetingModal from "./MeetingModal";


// Alarm banner shown when a meeting is about to start
function AlarmBanner({ meeting, onDismiss }) {
  if (!meeting) return null;
  return (
    <div className="fixed top-4 right-4 left-4 sm:left-auto z-50 bg-white border-2 border-blue-500 rounded-2xl shadow-2xl p-4 w-auto sm:w-80 animate-bounce">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Video className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">Meeting Starting!</p>
            <p className="text-xs text-gray-500">{meeting.title}</p>
            <p className="text-xs text-gray-400">
              {format(new Date(meeting.startDateTime), "h:mm a")}
            </p>
          </div>
        </div>
        <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>
      {meeting.meetLink && (
        <a
          href={meeting.meetLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block text-center bg-blue-600 text-white text-sm py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Join Now
        </a>
      )}
    </div>
  );
}

// Banner shown when user hasn't connected Google account
function GoogleConnectBanner({ onConnect }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
        <p className="text-sm text-amber-700 flex-1 min-w-0">
          Connect your Google account to auto-generate Meet links when creating meetings.
        </p>
      </div>
      <button
        onClick={onConnect}
        className="text-sm font-medium bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 transition-colors shrink-0 w-full sm:w-auto"
      >
        Connect Google
      </button>
    </div>
  );
}


export function Meetings() {
  const {
    meetings,
    loading,
    googleConfigured,
    zoomConfigured,
    alarmFired,
    setAlarmFired,
    createMeeting,
    updateMeeting,
    cancelMeeting,
    connectGoogle,
    refetch,
  } = useMeetings();

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const hasGoogleMeetSync = user?.planFeatures?.google_meet_sync !== false;
  const hasZoomMeetings = user?.planFeatures?.zoom_meetings !== false;
  const [modalOpen, setModalOpen] = useState(false);
  const [editMeeting, setEditMeeting] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const openCreate = () => {
    setEditMeeting(null);
    setModalOpen(true);
  };

  const openEdit = (meeting) => {
    setEditMeeting(meeting);
    setModalOpen(true);
  };

  const handleSave = async (data) => {
    if (editMeeting) {
      await updateMeeting(editMeeting._id, data);
    } else {
      await createMeeting(data);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this meeting?")) return;
    await cancelMeeting(id);
  };

  const effectiveStatus = (m) => {
    if (m.status === "cancelled") return "cancelled";
    if (new Date(m.endDateTime) < new Date()) return "completed";
    return m.status;
  };

  const filtered = meetings.filter((m) => {
    const matchStatus = filter === "all" || effectiveStatus(m) === filter;
    const matchSearch = m.title.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const upcoming = filtered.filter((m) => new Date(m.startDateTime) >= new Date());
  const past = filtered.filter((m) => new Date(m.startDateTime) < new Date());

  const counts = {
    total:     meetings.length,
    scheduled: meetings.filter((m) => effectiveStatus(m) === "scheduled").length,
    cancelled: meetings.filter((m) => effectiveStatus(m) === "cancelled").length,
    completed: meetings.filter((m) => effectiveStatus(m) === "completed").length,
    upcoming:  meetings.filter((m) => effectiveStatus(m) === "scheduled" && new Date(m.startDateTime) >= new Date()).length,
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Alarm Banner */}
      <AlarmBanner meeting={alarmFired} onDismiss={() => setAlarmFired(null)} />

      {/* Google Connect Banner — shown when user hasn't connected Google */}
      {hasGoogleMeetSync && !googleConfigured && (
        <GoogleConnectBanner onConnect={connectGoogle} />
      )}

      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Meetings</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refetch}
            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Meeting
          </button>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search meetings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex flex-wrap gap-1">
          {[
            { key: "all",       label: "All",       count: null },
            { key: "scheduled", label: "Scheduled", count: counts.scheduled },
            { key: "completed", label: "Completed", count: counts.completed },
            { key: "cancelled", label: "Cancelled", count: counts.cancelled },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors whitespace-nowrap ${
                filter === key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label}
              {count !== null && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                  filter === key ? "bg-white/20 text-white" : "bg-white text-gray-700"
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-xl h-48 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Video className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No meetings found</p>
          <button
            onClick={openCreate}
            className="mt-3 text-sm text-blue-600 hover:underline"
          >
            Create your first meeting
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Upcoming
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcoming.map((m) => (
                  <MeetingCard key={m._id} meeting={m} onEdit={openEdit} onCancel={handleCancel} />
                ))}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Past
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {past.map((m) => (
                  <MeetingCard key={m._id} meeting={m} onEdit={openEdit} onCancel={handleCancel} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      <MeetingModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        editMeeting={editMeeting}
        zoomConfigured={zoomConfigured}
        googleMeetSyncEnabled={hasGoogleMeetSync}
        zoomMeetingsEnabled={hasZoomMeetings}
      />
    </div>
  );
}
