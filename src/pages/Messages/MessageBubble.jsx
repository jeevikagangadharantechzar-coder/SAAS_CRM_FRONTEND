import React, { useState, useRef, useEffect } from "react";
import { Check, CheckCheck, FileText, Pin, Trash2, Reply, Smile, Plus, CornerUpLeft } from "lucide-react";
import EmojiPicker from "./EmojiPicker";

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

// System message (group created / member removed etc.)
export const SystemMessage = ({ text, date }) => (
  <div className="flex flex-col items-center my-3">
    <span className="text-[11px] text-gray-400 bg-gray-100 rounded-full px-4 py-1 text-center max-w-xs">
      {text}
    </span>
    {date && (
      <span className="text-[10px] text-gray-300 mt-0.5">{formatTime(date)}</span>
    )}
  </div>
);

const groupReactions = (reactions = []) => {
  const map = {};
  reactions.forEach(({ emoji, userId }) => {
    if (!map[emoji]) map[emoji] = [];
    map[emoji].push(String(userId));
  });
  return Object.entries(map);
};

// WhatsApp-style 3-state tick
// Ticks rendered OUTSIDE the bubble on white background — full contrast
// sending → single gray ✓   (clock / uploading)
// sent    → double gray ✓✓  (delivered to server)
// read    → double blue ✓✓  (recipient opened chat)
const TickIcon = ({ status, isRead }) => {
  if (isRead || status === "read")
    return (
      <span className="inline-flex items-center flex-shrink-0" title="Read">
        <CheckCheck size={20} strokeWidth={2.2} className="text-[#008ecc]" />
      </span>
    );
  if (status === "sending")
    return (
      <span className="inline-flex items-center flex-shrink-0" title="Sending">
        <Check size={20} strokeWidth={2.2} className="text-gray-300" />
      </span>
    );
  return (
    <span className="inline-flex items-center flex-shrink-0" title="Sent">
      <CheckCheck size={20} strokeWidth={2.2} className="text-gray-400" />
    </span>
  );
};

// Highlight matching text in yellow
const HighlightText = ({ text, query }) => {
  if (!query?.trim() || !text) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts    = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bg-yellow-300 text-gray-900 rounded-sm px-0.5 not-italic">{part}</mark>
          : part
      )}
    </>
  );
};

// Group read-receipt tick
// readBy: array of { userId, readAt } from groupMessageSchema
// totalOthers: total group members minus sender
// memberNames: { userId: displayName } map
const GroupTickIcon = ({ readBy = [], totalOthers, memberNames = {}, senderId }) => {
  const [hover, setHover] = useState(false);

  // Exclude the sender themselves from the readBy list
  const readers = readBy.filter((r) => String(r.userId) !== String(senderId));
  const readByCount = readers.length;
  if (totalOthers <= 0) return null;

  const allRead  = readByCount >= totalOthers;
  const someRead = readByCount > 0;

  const formatReadTime = (dt) => {
    if (!dt) return "";
    const d = new Date(dt);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (isToday) return time;
    return `${d.toLocaleDateString([], { day: "numeric", month: "short" })}, ${time}`;
  };

  return (
    <span
      className="relative inline-flex items-center gap-0.5 flex-shrink-0 cursor-default"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {someRead
        ? <CheckCheck size={20} strokeWidth={2.2} className={allRead ? "text-[#008ecc]" : "text-gray-400"} />
        : <Check      size={20} strokeWidth={2.2} className="text-gray-300" />
      }

      {/* Hover tooltip — names + read times — drops BELOW the time row */}
      {hover && (
        <div className="absolute top-full right-0 mt-2 z-50 min-w-[200px] max-w-[280px]
                        bg-gray-900 text-white text-[11px] rounded-xl shadow-2xl py-2
                        border border-white/10 pointer-events-none"
             style={{ whiteSpace: "nowrap" }}>
          {/* Up-arrow pointing to the tick */}
          <div className="absolute -top-1.5 right-3 w-3 h-3 bg-gray-900 border-l border-t border-white/10 rotate-45" />
          <div className="px-3 pb-1.5 mb-1 border-b border-white/10 text-[10px] text-gray-400 font-semibold uppercase tracking-wide">
            {someRead ? `Read by ${readByCount} of ${totalOthers}` : "Not read yet"}
          </div>
          {someRead ? (
            readers.map((r, i) => {
              const rName = memberNames[String(r.userId)] || "Unknown";
              return (
                <div key={i} className="flex items-center justify-between gap-4 px-3 py-1.5">
                  <span className="font-medium text-white truncate">{rName}</span>
                  <span className="text-gray-400 flex-shrink-0 text-[10px]">{formatReadTime(r.readAt)}</span>
                </div>
              );
            })
          ) : (
            <div className="px-3 py-1.5 text-gray-400">No one has read this yet</div>
          )}
        </div>
      )}
    </span>
  );
};

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "👏"];

// Reaction pill with hover tooltip showing who reacted
const ReactionPill = ({ emoji, userIds, names, isMine: myReaction, onToggle }) => {
  const [hover, setHover] = useState(false);
  const names_str = names.length <= 3
    ? names.join(", ")
    : `${names.slice(0, 3).join(", ")} +${names.length - 3}`;

  return (
    <div className="relative" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <button
        onClick={onToggle}
        className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition select-none
          ${myReaction
            ? "bg-[#e8f7ff] border-[#008ecc]/40 text-[#008ecc]"
            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
      >
        <span>{emoji}</span>
        <span className="font-semibold text-[11px]">{userIds.length}</span>
      </button>

      {/* Tooltip */}
      {hover && names.length > 0 && (
        <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="bg-gray-800 text-white text-[11px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg max-w-[180px] text-center leading-snug">
            <span className="font-medium">{emoji}</span>
            <span className="mx-1 text-gray-300">·</span>
            {names_str}
          </div>
          {/* Arrow */}
          <div className="w-2 h-2 bg-gray-800 rotate-45 mx-auto -mt-1" />
        </div>
      )}
    </div>
  );
};

// Add-reaction "+" button with quick-pick + full picker (Instagram style)
const AddReactionButton = ({ onReact, isMine }) => {
  const [open, setOpen]     = useState(false);
  const [full, setFull]     = useState(false);
  const ref                 = useRef(null);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setFull(false); } };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center w-6 h-6 rounded-full border border-dashed border-gray-300 text-gray-400 hover:border-[#008ecc] hover:text-[#008ecc] transition"
        title="Add reaction"
      >
        <Plus size={12} />
      </button>

      {open && !full && (
        <div className={`absolute ${isMine ? "right-0" : "left-0"} bottom-full mb-1.5 z-50`}>
          <div className="flex items-center gap-1 bg-white rounded-2xl shadow-xl border border-gray-100 px-2 py-1.5">
            {QUICK_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => { onReact(e); setOpen(false); }}
                className="text-xl hover:scale-125 transition-transform leading-none"
              >
                {e}
              </button>
            ))}
            <button
              onClick={() => setFull(true)}
              className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition text-xs font-bold"
              title="More emojis"
            >
              ···
            </button>
          </div>
        </div>
      )}

      {open && full && (
        <div className={`absolute ${isMine ? "right-0" : "left-0"} bottom-full mb-1.5 z-50`}>
          <EmojiPicker onSelect={(e) => { onReact(e); setOpen(false); setFull(false); }} onClose={() => { setOpen(false); setFull(false); }} />
        </div>
      )}
    </div>
  );
};

// memberNames: { userId: displayName } — used for reaction tooltips
const MessageBubble = ({
  id, msg, isMine, showPin, onPin, onDelete, onReact, onReply,
  currentUserId, isGroup, memberNames = {},
  groupMemberCount = 0, searchQuery = "", isHighlighted = false,
}) => {
  const [showEmoji, setShowEmoji] = useState(false);
  const emojiRef  = useRef(null);

  const isImage    = msg.fileType === "image";
  const isDocument = msg.fileType === "document";
  const fileUrl    = msg.fileUrl ? `${API_BASE}/${msg.fileUrl}` : null;
  const isDeleted  = msg.isDeleted;

  const reactionGroups = groupReactions(msg.reactions);

  useEffect(() => {
    if (!showEmoji) return;
    const handler = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) setShowEmoji(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmoji]);

  return (
    <div
      id={id}
      className={`flex ${isMine ? "justify-end" : "justify-start"} mb-3 group
        ${isHighlighted ? "rounded-xl bg-yellow-50 ring-2 ring-yellow-300 -mx-2 px-2 py-1 transition" : ""}`}
    >
      {/*
        KEY FIX: Actions are placed INSIDE the flex row (not absolutely outside),
        so overflow-y:auto on the scroll container never clips them.
        Order: [actions] [bubble] for sent, [bubble] [actions] for received.
      */}

      {/* ── Action bar (sent messages — appears to LEFT of bubble) ── */}
      {isMine && (
        <div className="flex items-center gap-1 mr-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {!isDeleted && (
            <>
              {/* Quick react */}
              <div className="relative" ref={isMine ? emojiRef : null}>
                <button
                  onClick={() => setShowEmoji((v) => !v)}
                  title="React"
                  className="w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-[#008ecc] hover:border-[#008ecc] transition"
                >
                  <Smile size={13} />
                </button>
                {showEmoji && (
                  <div className="absolute bottom-full right-0 mb-1 z-50">
                    <div className="flex gap-1 bg-white rounded-2xl shadow-xl border border-gray-100 px-2 py-1.5 mb-1">
                      {QUICK_EMOJIS.map((e) => (
                        <button key={e} onClick={() => { onReact?.(msg._id, e); setShowEmoji(false); }} className="text-xl hover:scale-125 transition-transform">{e}</button>
                      ))}
                    </div>
                    <EmojiPicker onSelect={(e) => { onReact?.(msg._id, e); setShowEmoji(false); }} onClose={() => setShowEmoji(false)} />
                  </div>
                )}
              </div>
              <button onClick={() => onReply?.(msg)} title="Reply" className="w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-[#008ecc] hover:border-[#008ecc] transition">
                <Reply size={13} />
              </button>
              {showPin && (
                <button onClick={() => onPin?.(msg._id, !msg.isPinned)} title={msg.isPinned ? "Unpin" : "Pin"} className={`w-7 h-7 rounded-full bg-white border shadow-sm flex items-center justify-center transition ${msg.isPinned ? "border-yellow-200 text-yellow-500" : "border-gray-200 text-gray-500 hover:border-yellow-200 hover:text-yellow-500"}`}>
                  <Pin size={13} />
                </button>
              )}
              <button onClick={() => onDelete?.(msg)} title="Delete" className="w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-red-500 hover:border-red-200 transition">
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Message bubble ─────────────────────────────────────── */}
      <div className="flex flex-col max-w-[68%]">
        {/* Sender name in groups */}
        {isGroup && !isMine && msg.senderName && (
          <span className="text-[11px] font-semibold text-[#008ecc] mb-0.5 ml-1">{msg.senderName}</span>
        )}

        {/* Reply quote preview */}
        {msg.replyTo?.messageId && (
          <div className={`flex items-stretch gap-0 rounded-xl mb-1 overflow-hidden
            ${isMine ? "bg-[#0078b0]" : "bg-gray-100"}`}
          >
            {/* Colored left bar */}
            <div className="w-1 flex-shrink-0 bg-[#008ecc] rounded-l-xl" />
            <div className="flex-1 px-2.5 py-1.5 min-w-0">
              {/* "Replying to" label */}
              <div className={`flex items-center gap-1 mb-0.5 ${isMine ? "text-white/70" : "text-[#008ecc]"}`}>
                <CornerUpLeft size={11} />
                <span className="text-[10px] font-semibold truncate">
                  {msg.replyTo.senderName || "Someone"}
                </span>
              </div>
              {/* Quoted message text */}
              <p className={`text-[12px] truncate leading-snug ${isMine ? "text-white/80" : "text-gray-500"}`}>
                {msg.replyTo.message || "📎 Attachment"}
              </p>
            </div>
          </div>
        )}

        {/* Bubble */}
        <div className={`relative px-4 py-2.5 rounded-2xl shadow-sm
          ${isMine
            ? "bg-[#008ecc] text-white rounded-br-sm"
            : "bg-white text-gray-800 rounded-bl-sm border border-gray-100"
          }`}
        >
          {msg.isPinned && !isDeleted && (
            <Pin size={11} className="absolute -top-2 -right-1 text-yellow-500 drop-shadow-sm" />
          )}

          {isDeleted ? (
            <p className={`text-sm italic ${isMine ? "text-white/60" : "text-gray-400"}`}>
              🚫 This message was deleted
            </p>
          ) : (
            <>
              {isImage && fileUrl && (
                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                  <img src={fileUrl} alt={msg.fileName || "image"} className="rounded-xl mb-1 max-w-[220px] max-h-[180px] object-cover cursor-pointer" />
                </a>
              )}
              {isDocument && fileUrl && (
                <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                  className={`flex items-center gap-2 mb-1 p-2 rounded-lg ${isMine ? "bg-white/20 hover:bg-white/30" : "bg-gray-50 hover:bg-gray-100"} transition`}
                >
                  <FileText size={20} className={isMine ? "text-white" : "text-[#008ecc]"} />
                  <span className="text-sm truncate max-w-[160px]">{msg.fileName || "File"}</span>
                </a>
              )}
              {msg.message && (
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  <HighlightText text={msg.message} query={searchQuery} />
                </p>
              )}
            </>
          )}
        </div>

        {/* ── Time + tick — OUTSIDE bubble, below it ──── */}
        <div className={`flex items-center gap-1.5 mt-1 ${isMine ? "justify-end pr-0.5" : "justify-start pl-0.5"}`}
             style={{ overflow: "visible" }}>
          <span className="text-[10px] text-gray-400 leading-none">{formatTime(msg.createdAt)}</span>
          {/* DM tick */}
          {isMine && !isGroup && !isDeleted && <TickIcon status={msg.status} isRead={msg.isRead} />}
          {/* Group tick — shows read count for messages sent by current user */}
          {isMine && isGroup && !isDeleted && (
            <GroupTickIcon
              readBy={msg.readBy || []}
              totalOthers={Math.max((groupMemberCount || 1) - 1, 0)}
              memberNames={memberNames}
              senderId={currentUserId}
            />
          )}
        </div>

        {/* Reactions + Add-reaction "+" — only visible when reactions already exist */}
        {reactionGroups.length > 0 && !isDeleted && (
          <div className={`flex flex-wrap items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
            {reactionGroups.map(([emoji, userIds]) => {
              const myReaction = userIds.includes(String(currentUserId));
              const names = userIds.map((uid) =>
                String(uid) === String(currentUserId)
                  ? "You"
                  : memberNames[String(uid)] || "Someone"
              );
              return (
                <ReactionPill
                  key={emoji}
                  emoji={emoji}
                  userIds={userIds}
                  names={names}
                  isMine={myReaction}
                  onToggle={() => onReact?.(msg._id, myReaction ? "" : emoji)}
                />
              );
            })}
            {/* "+" to add/change your reaction — Instagram style */}
            <AddReactionButton
              isMine={isMine}
              onReact={(emoji) => {
                const existing = reactionGroups.find(([, uids]) => uids.includes(String(currentUserId)));
                onReact?.(msg._id, existing && existing[0] === emoji ? "" : emoji);
              }}
            />
          </div>
        )}
      </div>

      {/* ── Action bar (received messages — appears to RIGHT of bubble) ── */}
      {!isMine && (
        <div className="flex items-center gap-1 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {!isDeleted && (
            <>
              <div className="relative" ref={!isMine ? emojiRef : null}>
                <button onClick={() => setShowEmoji((v) => !v)} title="React" className="w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-[#008ecc] hover:border-[#008ecc] transition">
                  <Smile size={13} />
                </button>
                {showEmoji && (
                  <div className="absolute bottom-full left-0 mb-1 z-50">
                    <div className="flex gap-1 bg-white rounded-2xl shadow-xl border border-gray-100 px-2 py-1.5 mb-1">
                      {QUICK_EMOJIS.map((e) => (
                        <button key={e} onClick={() => { onReact?.(msg._id, e); setShowEmoji(false); }} className="text-xl hover:scale-125 transition-transform">{e}</button>
                      ))}
                    </div>
                    <EmojiPicker onSelect={(e) => { onReact?.(msg._id, e); setShowEmoji(false); }} onClose={() => setShowEmoji(false)} />
                  </div>
                )}
              </div>
              <button onClick={() => onReply?.(msg)} title="Reply" className="w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-[#008ecc] hover:border-[#008ecc] transition">
                <Reply size={13} />
              </button>
              {showPin && (
                <button onClick={() => onPin?.(msg._id, !msg.isPinned)} title={msg.isPinned ? "Unpin" : "Pin"} className={`w-7 h-7 rounded-full bg-white border shadow-sm flex items-center justify-center transition ${msg.isPinned ? "border-yellow-200 text-yellow-500" : "border-gray-200 text-gray-500 hover:border-yellow-200 hover:text-yellow-500"}`}>
                  <Pin size={13} />
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
