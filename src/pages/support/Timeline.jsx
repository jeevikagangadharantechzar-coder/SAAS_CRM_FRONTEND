import React from "react";

const formatDateTime = (iso) =>
  new Date(iso).toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

// Renders a ticket's timeline (messages + status-change events) as a
// chronological thread. `viewerSender` ("tenant" or "platform") decides which
// side's messages are styled as "you" — the same array renders correctly on
// both the tenant Admin's and the platform owner's screens.
const Timeline = ({ entries = [], viewerSender }) => {
  if (entries.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-4">No activity yet.</p>;
  }

  return (
    <div className="space-y-2.5">
      {entries.map((entry, idx) => {
        if (entry.type === "status_change") {
          return (
            <div key={idx} className="flex items-center justify-center">
              <span className="text-[11px] text-gray-400 bg-gray-50 border border-gray-100 rounded-full px-3 py-1">
                {entry.senderName} changed status to <strong>{entry.status}</strong> ·{" "}
                {formatDateTime(entry.createdAt)}
              </span>
            </div>
          );
        }

        const isViewer = entry.sender === viewerSender;

        return (
          <div key={idx} className={`flex ${isViewer ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-xl px-4 py-2.5 ${
                isViewer ? "bg-[#008ecc] text-white" : "bg-gray-100 text-gray-800"
              }`}
            >
              <div
                className={`text-[11px] font-semibold mb-0.5 ${
                  isViewer ? "text-white/80" : "text-gray-500"
                }`}
              >
                {isViewer ? "You" : entry.senderName}
              </div>
              <p className="text-sm whitespace-pre-line">{entry.text}</p>
              <div className={`text-[10px] mt-1 ${isViewer ? "text-white/70" : "text-gray-400"}`}>
                {formatDateTime(entry.createdAt)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Timeline;
