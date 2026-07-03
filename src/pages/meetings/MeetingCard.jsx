import React from "react";
import { format } from "date-fns";
import { Video, Clock, Users, Pencil, ExternalLink, Ban } from "lucide-react";

const STATUS_STYLES = {
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const isPast = (date) => new Date(date) < new Date();

const getEffectiveStatus = (meeting) => {
  if (meeting.status === "cancelled") return "cancelled";
  if (isPast(meeting.endDateTime)) return "completed";
  return meeting.status;
};

export default function MeetingCard({ meeting, onEdit, onCancel }) {
  const started = isPast(meeting.startDateTime);
  const effectiveStatus = getEffectiveStatus(meeting);
  const canJoin =
    meeting.meetLink &&
    meeting.status === "scheduled" &&
    new Date(meeting.startDateTime) - Date.now() < 15 * 60_000;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="bg-blue-50 p-2 rounded-lg shrink-0">
            <Video className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-800 truncate text-sm">{meeting.title}</h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">
            {meeting.provider === "zoom" ? "Zoom" : "Google Meet"}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[effectiveStatus] || "bg-gray-100 text-gray-600"}`}
          >
            {effectiveStatus}
          </span>
        </div>
      </div>

      {/* Description */}
      {meeting.description && (
        <p className="text-xs text-gray-500 line-clamp-2">{meeting.description}</p>
      )}

      {/* Time */}
      <div className="flex items-center gap-1.5 text-xs text-gray-600">
        <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <span>
          {format(new Date(meeting.startDateTime), "MMM d, yyyy · h:mm a")}
          {" – "}
          {format(new Date(meeting.endDateTime), "h:mm a")}
        </span>
      </div>

      {/* Attendees */}
      {meeting.attendees?.length > 0 && (
        <div className="flex items-start gap-1.5 text-xs text-gray-600">
          <Users className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
          <span className="line-clamp-1">{meeting.attendees.join(", ")}</span>
        </div>
      )}

      {/* Reminder */}
      {effectiveStatus === "scheduled" && (
        <p className="text-xs text-gray-400">
          Reminder: {meeting.reminderMinutes} min before
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
        {meeting.meetLink && effectiveStatus === "scheduled" ? (
          <a
            href={meeting.meetLink}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              canJoin
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {canJoin ? "Join Now" : "Join Link"}
          </a>
        ) : null}

        <div className="ml-auto flex items-center gap-1">
          {/* Edit — only for upcoming scheduled */}
          {effectiveStatus === "scheduled" && !started && (
            <button
              onClick={() => onEdit(meeting)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Cancel — only for upcoming scheduled (future meetings) */}
          {effectiveStatus === "scheduled" && !started && (
            <button
              onClick={() => onCancel(meeting._id)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
              title="Cancel meeting"
            >
              <Ban className="w-3.5 h-3.5" />
            </button>
          )}

        </div>
      </div>
    </div>
  );
}
