import React from "react";
import { Check, CheckCheck, FileText, Pin } from "lucide-react";

const API_BASE = import.meta.env.VITE_SI_URI || "";

const formatTime = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString())     return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
};

export const DateDivider = ({ date }) => (
  <div className="flex items-center gap-3 my-4">
    <div className="flex-1 h-px bg-gray-200" />
    <span className="text-xs text-gray-400 font-medium px-2">{formatDate(date)}</span>
    <div className="flex-1 h-px bg-gray-200" />
  </div>
);

const MessageBubble = ({ msg, isMine, showPin, onPin }) => {
  const isImage    = msg.fileType === "image";
  const isDocument = msg.fileType === "document";
  const fileUrl    = msg.fileUrl ? `${API_BASE}/${msg.fileUrl}` : null;

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1 group`}>
      <div className={`relative max-w-[70%] px-4 py-2 rounded-2xl shadow-sm
        ${isMine
          ? "bg-[#008ecc] text-white rounded-br-sm"
          : "bg-white text-gray-800 rounded-bl-sm border border-gray-100"
        }`}
      >
        {/* Pin indicator */}
        {msg.isPinned && (
          <Pin size={12} className="absolute -top-2 -right-1 text-yellow-500" />
        )}

        {/* Image attachment */}
        {isImage && fileUrl && (
          <a href={fileUrl} target="_blank" rel="noopener noreferrer">
            <img
              src={fileUrl}
              alt={msg.fileName || "image"}
              className="rounded-xl mb-1 max-w-[240px] max-h-[200px] object-cover cursor-pointer"
            />
          </a>
        )}

        {/* Document attachment */}
        {isDocument && fileUrl && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 mb-1 p-2 rounded-lg
              ${isMine ? "bg-white/20 hover:bg-white/30" : "bg-gray-50 hover:bg-gray-100"} transition`}
          >
            <FileText size={20} className={isMine ? "text-white" : "text-[#008ecc]"} />
            <span className="text-sm truncate max-w-[180px]">{msg.fileName || "File"}</span>
          </a>
        )}

        {/* Text */}
        {msg.message && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>
        )}

        {/* Time + Read receipt */}
        <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
          <span className={`text-[10px] ${isMine ? "text-white/70" : "text-gray-400"}`}>
            {formatTime(msg.createdAt)}
          </span>
          {isMine && (
            msg.isRead
              ? <CheckCheck size={12} className="text-white/80" />
              : <Check      size={12} className="text-white/60" />
          )}
        </div>

        {/* Pin action on hover */}
        {showPin && (
          <button
            onClick={() => onPin(msg._id, !msg.isPinned)}
            className={`absolute -top-6 ${isMine ? "right-0" : "left-0"}
              hidden group-hover:flex items-center gap-1 text-[10px] text-gray-500
              bg-white border border-gray-200 rounded px-2 py-0.5 shadow-sm`}
          >
            <Pin size={10} />
            {msg.isPinned ? "Unpin" : "Pin"}
          </button>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
