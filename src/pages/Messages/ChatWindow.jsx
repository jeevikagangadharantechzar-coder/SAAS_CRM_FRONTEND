import React, { useEffect, useRef, useState } from "react";
import { Send, Paperclip, X, Pin, Image } from "lucide-react";
import axios from "axios";
import { useChat } from "../../context/ChatContext";
import MessageBubble, { DateDivider } from "./MessageBubble";

const API_BASE  = import.meta.env.VITE_SI_URI || "";
const API_URL   = import.meta.env.VITE_API_URL;

const Avatar = ({ name, image, size = 9 }) => {
  const initials = (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const colors   = ["bg-blue-500", "bg-purple-500", "bg-green-500", "bg-orange-500", "bg-pink-500"];
  const color    = colors[(name?.charCodeAt(0) || 0) % colors.length];
  if (image)
    return <img src={`${API_BASE}/${image}`} alt={name} className={`w-${size} h-${size} rounded-full object-cover`} />;
  return (
    <div className={`w-${size} h-${size} rounded-full ${color} flex items-center justify-center text-white font-semibold text-sm`}>
      {initials}
    </div>
  );
};

const groupByDate = (messages) => {
  const groups = [];
  let lastDate = null;
  messages.forEach((msg) => {
    const dateStr = new Date(msg.createdAt).toDateString();
    if (dateStr !== lastDate) {
      groups.push({ type: "divider", date: msg.createdAt, key: `d-${msg.createdAt}` });
      lastDate = dateStr;
    }
    groups.push({ type: "message", ...msg, key: msg._id });
  });
  return groups;
};

const ChatWindow = () => {
  const {
    activeContact, messages, typing, loadingMsgs,
    sendMessage, emitTyping, uploadFile, currentUser,
    onlineUsers,
  } = useChat();

  const [text,        setText]        = useState("");
  const [filePreview, setFilePreview] = useState(null); // { file, url, name, type }
  const [uploading,   setUploading]   = useState(false);
  const [pinnedView,  setPinnedView]  = useState(false);

  const tenantSlug = localStorage.getItem("tenantSlug");
  const token      = localStorage.getItem("token");
  const BASE       = `${API_URL.replace("/api", "")}/${tenantSlug}/api/chat`;
  const headers    = { Authorization: `Bearer ${token}` };

  const bottomRef    = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!activeContact) return;
    if (!text.trim() && !filePreview) return;

    let fileUrl = null, fileName = null, fileType = null;

    if (filePreview) {
      setUploading(true);
      try {
        const result = await uploadFile(filePreview.file);
        fileUrl  = result.fileUrl;
        fileName = result.fileName;
        fileType = result.fileType;
      } catch {
        setUploading(false);
        return;
      }
      setUploading(false);
      setFilePreview(null);
    }

    sendMessage({
      receiverId: activeContact._id,
      message:    text.trim(),
      fileUrl, fileName, fileType,
    });
    setText("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url    = URL.createObjectURL(file);
    const isImg  = file.type.startsWith("image/");
    setFilePreview({ file, url, name: file.name, isImage: isImg });
    e.target.value = "";
  };

  const handlePin = async (messageId, isPinned) => {
    try {
      await axios.patch(`${BASE}/pin/${messageId}`, { isPinned }, { headers });
    } catch {}
  };

  const isOnline = activeContact && onlineUsers.includes(String(activeContact._id));
  const items    = groupByDate(messages);

  // ── Empty state ─────────────────────────────────────────────────
  if (!activeContact) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-center p-8">
        <div className="w-20 h-20 rounded-full bg-[#e8f7ff] flex items-center justify-center mb-4">
          <Send size={32} className="text-[#008ecc]" />
        </div>
        <h3 className="text-lg font-semibold text-gray-700">Your Messages</h3>
        <p className="text-sm text-gray-400 mt-1">Select a contact to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar name={activeContact.name} image={activeContact.profileImage} />
            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white
              ${isOnline ? "bg-green-500" : "bg-gray-300"}`}
            />
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">{activeContact.name}</p>
            <p className="text-xs text-gray-400">
              {isOnline ? (
                <span className="text-green-500">● Online</span>
              ) : (
                <span className="text-gray-400">● Offline</span>
              )}
              {" · "}{activeContact.role}
            </p>
          </div>
        </div>
        <button
          onClick={() => setPinnedView((v) => !v)}
          className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition
            ${pinnedView ? "bg-[#008ecc] text-white border-[#008ecc]" : "border-gray-200 text-gray-500 hover:border-[#008ecc] hover:text-[#008ecc]"}`}
        >
          <Pin size={12} /> Pinned
        </button>
      </div>

      {/* ── Messages ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-0.5">
        {loadingMsgs ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-[#008ecc] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm">
            <p>No messages yet</p>
            <p className="text-xs mt-1">Say hello to {activeContact.name}!</p>
          </div>
        ) : (
          items.map((item) =>
            item.type === "divider" ? (
              <DateDivider key={item.key} date={item.date} />
            ) : (
              <MessageBubble
                key={item.key}
                msg={item}
                isMine={String(item.senderId) === String(currentUser._id)}
                showPin
                onPin={handlePin}
              />
            )
          )
        )}

        {/* Typing indicator */}
        {typing && (
          <div className="flex items-center gap-2 mt-2">
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-2 shadow-sm flex gap-1 items-center">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <span className="text-xs text-gray-400">{typing.senderName} is typing…</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── File preview ────────────────────────────────────── */}
      {filePreview && (
        <div className="px-5 py-2 bg-white border-t border-gray-100">
          <div className="relative inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            {filePreview.isImage ? (
              <img src={filePreview.url} alt="preview" className="h-12 w-12 rounded object-cover" />
            ) : (
              <div className="h-12 w-12 rounded bg-[#e8f7ff] flex items-center justify-center">
                <Paperclip size={20} className="text-[#008ecc]" />
              </div>
            )}
            <span className="text-xs text-gray-600 max-w-[160px] truncate">{filePreview.name}</span>
            <button
              onClick={() => setFilePreview(null)}
              className="text-gray-400 hover:text-red-500 ml-1"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Input area ──────────────────────────────────────── */}
      <div className="px-4 py-3 bg-white border-t border-gray-100">
        <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus-within:border-[#008ecc] transition">
          {/* File button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 text-gray-400 hover:text-[#008ecc] transition p-1"
          >
            <Paperclip size={18} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
          />

          {/* Textarea */}
          <textarea
            rows={1}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              emitTyping(activeContact._id);
            }}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${activeContact.name}…`}
            className="flex-1 bg-transparent text-sm text-gray-700 resize-none focus:outline-none max-h-32 overflow-y-auto"
            style={{ minHeight: "24px" }}
          />

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={(!text.trim() && !filePreview) || uploading}
            className="flex-shrink-0 w-8 h-8 bg-[#008ecc] hover:bg-[#0078b0] disabled:opacity-40 text-white rounded-full flex items-center justify-center transition"
          >
            {uploading
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Send size={14} />
            }
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1 px-1">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
};

export default ChatWindow;
