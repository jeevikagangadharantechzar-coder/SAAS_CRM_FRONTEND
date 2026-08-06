import React, { useState, useEffect } from "react";
import { X, Phone, Activity, Building2, Clock, Download, Loader2 } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";

const fmt = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  if (isToday(dt)) return "Today, " + format(dt, "h:mm a");
  if (isYesterday(dt)) return "Yesterday, " + format(dt, "h:mm a");
  return format(dt, "dd MMM yyyy, h:mm a");
};

const SI_URI = import.meta.env.VITE_SI_URI || "http://localhost:5000";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const FollowUpAudioPlayer = ({ audioPath }) => {
  const [status, setStatus] = useState("loading"); // loading | done | error
  const [src, setSrc] = useState(null);

  useEffect(() => {
    const ctrl = new AbortController();
    let live = true;
    setStatus("loading");

    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${API_URL}/files/preview?filePath=${encodeURIComponent(audioPath)}`,
          { headers: { Authorization: `Bearer ${token}` }, signal: ctrl.signal }
        );
        if (!res.ok) throw new Error("Failed to load recording");
        const mime = res.headers.get("Content-Type") || "application/octet-stream";
        const buf = await res.arrayBuffer();
        if (!live) return;
        setSrc(URL.createObjectURL(new Blob([buf], { type: mime })));
        setStatus("done");
      } catch (err) {
        if (!live || err.name === "AbortError") return;
        setStatus("error");
      }
    })();

    return () => {
      live = false;
      ctrl.abort();
      setSrc((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [audioPath]);

  if (status === "loading") {
    return (
      <p className="text-xs text-orange-500 flex items-center justify-center gap-1.5 py-4 w-full font-medium">
        <Loader2 className="w-4 h-4 animate-spin text-orange-500" /> Loading audio stream...
      </p>
    );
  }
  if (status === "error") {
    return <p className="text-xs text-red-500 py-4 text-center w-full font-medium">Could not load audio</p>;
  }
  return <audio controls src={src} className="w-full max-w-sm" autoPlay />;
};

export default function ViewReportsModal({ isOpen, onClose, reports, type, isAdmin }) {
  const [expandedMedia, setExpandedMedia] = useState(null);

  if (!isOpen) return null;

  const getMediaUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    // Replace backslashes with forward slashes for Windows paths
    let normalized = path.replace(/\\/g, "/");
    if (normalized.startsWith("/")) normalized = normalized.substring(1);
    return `${SI_URI}/${normalized}`;
  };

  const isCall = type === "call";
  const icon = isCall ? <Phone size={18} /> : <Activity size={18} />;
  const title = isCall ? "Reported Calls" : "Reported Meetings";
  const color = isCall ? "orange" : "purple";
  
  const bgHeader = isCall ? "bg-gradient-to-r from-orange-50 to-white" : "bg-gradient-to-r from-purple-50 to-white";
  const iconBg = isCall ? "bg-orange-100 text-orange-600" : "bg-purple-100 text-purple-600";
  const listBg = isCall ? "bg-orange-50/50 border-orange-100" : "bg-purple-50/50 border-purple-100";
  const buildingColor = isCall ? "text-orange-400" : "text-purple-400";
  const innerBg = isCall ? "border-orange-50/50" : "border-purple-50/50";
  const badgeClass = isCall ? "bg-orange-100 text-orange-700 hover:bg-orange-200" : "bg-purple-100 text-purple-700 hover:bg-purple-200";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        <div className={`flex items-center justify-between p-5 border-b border-gray-100 ${bgHeader} shrink-0`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${iconBg}`}>
              {icon}
            </div>
            <div>
              <h2 className="text-slate-900">{title}</h2>
              <p className="text-base text-slate-600">History of logged {isCall ? "calls" : "meetings"} for this target</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
          {(!reports || reports.length === 0) ? (
            <div className="text-center py-10">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 text-gray-400 mb-3">
                {icon}
              </div>
              <p className="text-sm font-semibold text-gray-600">No {isCall ? "calls" : "meetings"} reported yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...reports].reverse().map((r, i) => (
                <div key={i} className={`border rounded-xl p-3.5 shadow-sm transition-all hover:shadow-md ${listBg}`}>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                      <Building2 size={13} className={buildingColor} /> 
                      {r.companyName}
                    </p>
                    <div className="flex items-center gap-2">
                      {isCall && r.recordingUrl && (
                        <button onClick={() => setExpandedMedia(expandedMedia === i ? null : i)} className={`text-xs px-2 py-0.5 rounded font-semibold transition-colors ${badgeClass}`}>
                          {expandedMedia === i ? "Close Audio" : "Play Audio"}
                        </button>
                      )}
                      {!isCall && r.screenshotUrl && (
                        <button onClick={() => setExpandedMedia(expandedMedia === i ? null : i)} className={`text-xs px-2 py-0.5 rounded font-semibold transition-colors ${badgeClass}`}>
                          {expandedMedia === i ? "Close Image" : "View Image"}
                        </button>
                      )}
                      {isAdmin && (isCall ? r.recordingUrl : r.screenshotUrl) && (
                        <a href={getMediaUrl(isCall ? r.recordingUrl : r.screenshotUrl)} target="_blank" rel="noopener noreferrer" download className="text-xs text-gray-500 hover:text-gray-800 font-semibold flex items-center gap-1 transition-colors">
                          <Download size={11} /> Download
                        </a>
                      )}
                      {r.companyUrl && (
                        <a href={r.companyUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline font-medium">Website</a>
                      )}
                      <span className="text-xs text-gray-500 font-semibold flex items-center gap-1 ml-1 bg-white px-2 py-1 rounded-full shadow-sm"><Clock size={10} /> {fmt(r.addedAt)}</span>
                    </div>
                  </div>
                  <p className={`text-sm text-gray-700 leading-relaxed bg-white border p-3 rounded-lg ${innerBg}`}>
                    {isCall ? r.callSummary : r.meetingSummary}
                  </p>
                  
                  {expandedMedia === i && isCall && r.recordingUrl && (
                    <div className="mt-3 bg-white p-3 rounded-lg border border-orange-100 flex justify-center animate-in slide-in-from-top-2 duration-200 shadow-sm">
                      <FollowUpAudioPlayer audioPath={r.recordingUrl} />
                    </div>
                  )}
                  {expandedMedia === i && !isCall && r.screenshotUrl && (
                    <div className="mt-3 bg-white p-2 rounded-lg border border-purple-100 flex justify-center animate-in zoom-in-95 duration-200 shadow-sm">
                      <img src={getMediaUrl(r.screenshotUrl)} alt="Meeting preview" className="max-h-64 object-contain rounded" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-white flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
