import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Send, Paperclip, X, Pin, Smile, Users, LogOut, UserMinus, Shield, MoreVertical, Trash2, Lock, UserPlus, Search, ChevronUp, ChevronDown } from "lucide-react";
import axios from "axios";
import { useChat } from "../../context/ChatContext";
import MessageBubble, { DateDivider, SystemMessage } from "./MessageBubble";
import EmojiPicker from "./EmojiPicker";
import DeleteModal from "./DeleteModal";
import AddMemberModal from "./AddMemberModal";

const API_BASE = import.meta.env.VITE_SI_URI || "";
const API_URL  = import.meta.env.VITE_API_URL;

const Avatar = ({ name, image, size = 9, isGroup }) => {
  const initials = (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const colors   = ["bg-blue-500", "bg-purple-500", "bg-green-500", "bg-orange-500", "bg-pink-500"];
  const color    = colors[(name?.charCodeAt(0) || 0) % colors.length];
  if (isGroup) {
    return (
      <div className={`w-${size} h-${size} rounded-full bg-gradient-to-br from-[#008ecc] to-[#0056b3] flex items-center justify-center`}>
        <Users size={size === 9 ? 16 : 13} className="text-white" />
      </div>
    );
  }
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
    if (msg.type !== "system") {
      const dateStr = new Date(msg.createdAt).toDateString();
      if (dateStr !== lastDate) {
        groups.push({ type: "divider", date: msg.createdAt, key: `d-${msg.createdAt}-${msg._id}` });
        lastDate = dateStr;
      }
    }
    groups.push({ ...msg, key: msg._id });
  });
  return groups;
};

const ChatWindow = () => {
  const {
    activeContact, messages, typing, loadingMsgs,
    sendMessage, emitTyping, uploadFile, currentUser, onlineUsers,
    activeGroup, groupMessages, groupTyping, sendGroupMessage, emitGroupTyping,
    deleteMessage, reactToMessage, reactToGroupMessage, deleteGroupMessage,
    leaveGroup, removeMember, clearChat, clearGroupChat,
  } = useChat();

  const [text,         setText]         = useState("");
  const [filePreview,  setFilePreview]  = useState(null);
  const [uploading,    setUploading]    = useState(false);
  const [pinnedView,   setPinnedView]   = useState(false);
  const [replyTo,      setReplyTo]      = useState(null);
  const [showEmoji,    setShowEmoji]    = useState(false);
  const [showMembers,    setShowMembers]    = useState(false);
  const [showMenu,       setShowMenu]       = useState(false);
  const [deleteModal,    setDeleteModal]    = useState(null);
  const [showAddMember,  setShowAddMember]  = useState(false);
  const [showSearch,     setShowSearch]     = useState(false);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [searchIndex,    setSearchIndex]    = useState(0);
  const searchInputRef = useRef(null);

  const tenantSlug = localStorage.getItem("tenantSlug");
  const token      = localStorage.getItem("token");
  const BASE       = `${API_URL.replace("/api", "")}/${tenantSlug}/api/chat`;
  const headers    = { Authorization: `Bearer ${token}` };

  const bottomRef   = useRef(null);
  const fileRef     = useRef(null);
  const emojiRef    = useRef(null);
  const menuRef     = useRef(null);
  const membersRef  = useRef(null);
  const textareaRef = useRef(null);

  const isGroupActive   = !!activeGroup;
  const displayMessages = isGroupActive ? groupMessages : messages;
  const displayTyping   = isGroupActive ? groupTyping   : typing;

  const currentIsAdmin = isGroupActive && (activeGroup?.admins || []).some(
    (a) => String(a) === String(currentUser._id) || String(a?._id) === String(currentUser._id)
  );

  // Non-admin in admin-only group cannot send messages
  const isInputBlocked = isGroupActive && activeGroup?.onlyAdminsCanMessage && !currentIsAdmin;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages]);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmoji) return;
    const h = (e) => { if (emojiRef.current && !emojiRef.current.contains(e.target)) setShowEmoji(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showEmoji]);

  // Close ⋮ menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showMenu]);

  // Close members panel on outside click
  useEffect(() => {
    if (!showMembers) return;
    const h = (e) => {
      if (membersRef.current && !membersRef.current.contains(e.target)) setShowMembers(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showMembers]);

  // Focus textarea when reply is set (WhatsApp behaviour)
  useEffect(() => {
    if (replyTo) textareaRef.current?.focus();
  }, [replyTo]);

  const handleSend = async () => {
    if (!activeContact && !activeGroup) return;
    if (!text.trim() && !filePreview) return;
    if (isInputBlocked) return;

    let fileUrl = null, fileName = null, fileType = null;
    if (filePreview) {
      setUploading(true);
      try {
        const result = await uploadFile(filePreview.file);
        fileUrl  = result.fileUrl;
        fileName = result.fileName;
        fileType = result.fileType;
      } catch { setUploading(false); return; }
      setUploading(false);
      setFilePreview(null);
    }

    const replyPayload = replyTo
      ? { messageId: replyTo._id, message: replyTo.message, senderName: replyTo.senderName || currentUser.name }
      : undefined;

    if (isGroupActive) {
      sendGroupMessage({ groupId: activeGroup._id, message: text.trim(), fileUrl, fileName, fileType, replyTo: replyPayload });
    } else {
      sendMessage({ receiverId: activeContact._id, message: text.trim(), fileUrl, fileName, fileType, replyTo: replyPayload });
    }
    setText("");
    setReplyTo(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilePreview({ file, url: URL.createObjectURL(file), name: file.name, isImage: file.type.startsWith("image/") });
    e.target.value = "";
  };

  const handlePin = async (messageId, isPinned) => {
    try { await axios.patch(`${BASE}/pin/${messageId}`, { isPinned }, { headers }); } catch {}
  };

  const handleDeleteClick = (msg) => setDeleteModal({ msg });

  const handleDeleteForEveryone = () => {
    const msg = deleteModal?.msg;
    if (!msg) return;
    if (isGroupActive) deleteGroupMessage?.(msg._id, activeGroup._id, false);
    else deleteMessage?.(msg._id, false);
  };

  const handleDeleteForMe = () => {
    const msg = deleteModal?.msg;
    if (!msg) return;
    if (isGroupActive) deleteGroupMessage?.(msg._id, activeGroup._id, true);
    else deleteMessage?.(msg._id, true);
  };

  const handleClearChat = () => {
    if (isGroupActive) clearGroupChat?.(activeGroup._id);
    else clearChat?.(activeContact._id);
  };

  const handleReact = (messageId, emoji) => {
    if (isGroupActive) reactToGroupMessage?.(messageId, emoji, activeGroup._id);
    else reactToMessage?.(messageId, emoji);
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Remove ${memberName} from the group?`)) return;
    await removeMember?.(activeGroup._id, memberId);
  };

  // Reply handler — sets reply context and focuses textarea
  const handleReply = useCallback((msg) => {
    const senderName = String(msg.senderId) === String(currentUser._id)
      ? (currentUser.name || "You")
      : (isGroupActive ? msg.senderName : activeContact?.name) || "User";
    setReplyTo({ ...msg, senderName });
    // textarea focus is handled by useEffect above
  }, [currentUser, isGroupActive, activeContact]);

  const isOnline = activeContact && onlineUsers.includes(String(activeContact._id));
  const items    = groupByDate(displayMessages);

  // Build { userId: displayName } map for reaction tooltips
  const memberNames = useMemo(() => {
    const map = {};
    if (isGroupActive && activeGroup?.members) {
      activeGroup.members.forEach((m) => {
        map[String(m._id || m)] = m.name || "Member";
      });
    } else if (!isGroupActive && activeContact) {
      map[String(activeContact._id)] = activeContact.name;
    }
    return map;
  }, [isGroupActive, activeGroup, activeContact]);

  // Search in chat
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return displayMessages
      .filter((m) => !m.isDeleted && m.message?.toLowerCase().includes(q))
      .map((m) => String(m._id));
  }, [searchQuery, displayMessages]);

  // Clamp index when results change
  useEffect(() => { setSearchIndex(0); }, [searchResults]);

  // Scroll to current match
  useEffect(() => {
    if (!searchResults.length) return;
    const el = document.getElementById(`msg-${searchResults[searchIndex]}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [searchIndex, searchResults]);

  // Focus search input when opened
  useEffect(() => {
    if (showSearch) setTimeout(() => searchInputRef.current?.focus(), 50);
    else { setSearchQuery(""); setSearchIndex(0); }
  }, [showSearch]);

  // ── Empty state ───────────────────────────────────────────────────
  if (!activeContact && !activeGroup) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-center p-8">
        <div className="w-20 h-20 rounded-full bg-[#e8f7ff] flex items-center justify-center mb-4">
          <Send size={32} className="text-[#008ecc]" />
        </div>
        <h3 className="text-lg font-semibold text-gray-700">Your Messages</h3>
        <p className="text-sm text-gray-400 mt-1">Select a contact or group to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar
              name={isGroupActive ? activeGroup.name : activeContact.name}
              image={isGroupActive ? null : activeContact.profileImage}
              isGroup={isGroupActive}
            />
            {!isGroupActive && (
              <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${isOnline ? "bg-green-500" : "bg-gray-300"}`} />
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">
              {isGroupActive ? activeGroup.name : activeContact.name}
            </p>
            <p className="text-xs">
              {isGroupActive ? (
                // Click member count to toggle panel; click outside closes it
                <button
                  onClick={() => setShowMembers((v) => !v)}
                  className="text-[#008ecc] hover:underline inline-flex items-center gap-1.5"
                >
                  {activeGroup.memberCount} members
                  {currentIsAdmin && (
                    <span className="text-[10px] bg-[#e8f7ff] text-[#008ecc] rounded px-1.5 py-0.5">
                      You're admin
                    </span>
                  )}
                  {activeGroup.onlyAdminsCanMessage && (
                    <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 rounded px-1.5 py-0.5 inline-flex items-center gap-0.5">
                      <Lock size={8} /> Admins only
                    </span>
                  )}
                </button>
              ) : (
                <span className={isOnline ? "text-green-500" : "text-gray-400"}>
                  {isOnline ? "● Online" : "● Offline"}
                  <span className="text-gray-400"> · {activeContact.role}</span>
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isGroupActive && (
            <button
              onClick={() => setPinnedView((v) => !v)}
              className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition
                ${pinnedView ? "bg-[#008ecc] text-white border-[#008ecc]" : "border-gray-200 text-gray-500 hover:border-[#008ecc] hover:text-[#008ecc]"}`}
            >
              <Pin size={12} /> Pinned
            </button>
          )}

          {/* Add Member — admin only, top-right header button */}
          {isGroupActive && currentIsAdmin && (
            <button
              onClick={() => setShowAddMember(true)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-[#008ecc]/40 text-[#008ecc] hover:bg-[#e8f7ff] transition"
            >
              <UserPlus size={13} /> Add Member
            </button>
          )}

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition"
            >
              <MoreVertical size={16} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-30 overflow-hidden">
                <button
                  onClick={() => { setShowSearch(true); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  <Search size={14} className="text-gray-400" /> Search in Chat
                </button>
                {isGroupActive && (
                  <button
                    onClick={() => { leaveGroup?.(activeGroup._id); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                  >
                    <LogOut size={14} className="text-gray-400" /> Leave Group
                  </button>
                )}
                <button
                  onClick={() => { setDeleteModal({ type: "clear" }); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                >
                  <Trash2 size={14} /> Clear Chat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Members panel — closes on outside click ─────────────── */}
      {isGroupActive && showMembers && (
        <div ref={membersRef} className="bg-white border-b border-gray-100 px-5 py-3 max-h-56 overflow-y-auto shadow-sm">
          <p className="text-[11px] font-semibold text-gray-400 mb-3 uppercase tracking-wider">Members</p>
          <div className="space-y-2.5">
            {(activeGroup.members || []).map((m) => {
              const mId       = String(m._id || m);
              const isOnlineM = onlineUsers.includes(mId);
              const isAdminM  = (activeGroup.admins || []).some((a) => String(a) === mId || String(a?._id) === mId);
              const isSelf    = mId === String(currentUser._id);

              return (
                <div key={mId} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <Avatar name={m.name} image={m.profileImage} size={8} />
                      <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${isOnlineM ? "bg-green-500" : "bg-gray-300"}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium text-gray-800">{m.name || "Member"}</span>
                        {isAdminM && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] bg-amber-50 text-amber-600 border border-amber-200 rounded px-1.5 py-0.5">
                            <Shield size={9} /> Admin
                          </span>
                        )}
                        {isSelf && <span className="text-[10px] text-gray-400">(you)</span>}
                      </div>
                      <span className={`text-[11px] ${isOnlineM ? "text-green-500" : "text-gray-400"}`}>
                        {isOnlineM ? "● Online" : "● Offline"}
                      </span>
                    </div>
                  </div>
                  {currentIsAdmin && !isSelf && !isAdminM && (
                    <button
                      onClick={() => handleRemoveMember(mId, m.name)}
                      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg px-2 py-1 transition"
                    >
                      <UserMinus size={13} /> Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Search bar ──────────────────────────────────────────── */}
      {showSearch && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-b border-gray-100 shadow-sm">
          <Search size={14} className="text-gray-400 flex-shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setSearchIndex((i) => (i + 1) % Math.max(searchResults.length, 1));
              if (e.key === "Escape") setShowSearch(false);
            }}
            placeholder="Search in this chat…"
            className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
          />
          {searchQuery.trim() && (
            <span className="text-xs text-gray-400 flex-shrink-0">
              {searchResults.length === 0 ? "No results" : `${searchIndex + 1} / ${searchResults.length}`}
            </span>
          )}
          <button
            onClick={() => setSearchIndex((i) => Math.max(i - 1, 0))}
            disabled={searchIndex === 0 || !searchResults.length}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 disabled:opacity-30 transition"
          >
            <ChevronUp size={14} className="text-gray-500" />
          </button>
          <button
            onClick={() => setSearchIndex((i) => Math.min(i + 1, searchResults.length - 1))}
            disabled={searchIndex >= searchResults.length - 1 || !searchResults.length}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 disabled:opacity-30 transition"
          >
            <ChevronDown size={14} className="text-gray-500" />
          </button>
          <button
            onClick={() => setShowSearch(false)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 transition"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Messages area ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 pr-8 py-4">
        {loadingMsgs ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-[#008ecc] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm">
            <p>No messages yet</p>
            <p className="text-xs mt-1">Say hello to {isGroupActive ? activeGroup.name : activeContact.name}!</p>
          </div>
        ) : (
          items.map((item) => {
            if (item.type === "divider") return <DateDivider key={item.key} date={item.date} />;
            if (item.type === "system")  return <SystemMessage key={item.key} text={item.message} date={item.createdAt} />;
            return (
              <MessageBubble
                key={item.key}
                id={`msg-${item._id}`}
                msg={item}
                isMine={String(item.senderId) === String(currentUser._id)}
                showPin={!isGroupActive}
                onPin={handlePin}
                onDelete={handleDeleteClick}
                onReact={handleReact}
                onReply={handleReply}
                currentUserId={currentUser._id}
                isGroup={isGroupActive}
                memberNames={memberNames}
                groupMemberCount={isGroupActive ? (activeGroup?.memberCount || activeGroup?.members?.length || 1) : 0}
                searchQuery={searchQuery}
                isHighlighted={searchResults[searchIndex] === String(item._id)}
              />
            );
          })
        )}

        {displayTyping && (
          <div className="flex items-center gap-2 mt-2">
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-2 shadow-sm flex gap-1 items-center">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <span className="text-xs text-gray-400">{displayTyping.senderName} is typing…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Reply bar ────────────────────────────────────────────── */}
      {replyTo && (
        <div className="mx-4 mb-1 flex items-center gap-2 bg-[#f0faff] border border-[#008ecc]/20 rounded-xl px-3 py-2">
          <div className="w-0.5 h-8 bg-[#008ecc] rounded-full flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-[#008ecc]">{replyTo.senderName}</p>
            <p className="text-xs text-gray-500 truncate">{replyTo.message || "📎 Attachment"}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── File preview ─────────────────────────────────────────── */}
      {filePreview && (
        <div className="px-5 py-2 bg-white border-t border-gray-100">
          <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            {filePreview.isImage
              ? <img src={filePreview.url} alt="preview" className="h-12 w-12 rounded object-cover" />
              : <div className="h-12 w-12 rounded bg-[#e8f7ff] flex items-center justify-center"><Paperclip size={20} className="text-[#008ecc]" /></div>
            }
            <span className="text-xs text-gray-600 max-w-[160px] truncate">{filePreview.name}</span>
            <button onClick={() => setFilePreview(null)} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
          </div>
        </div>
      )}

      {/* ── Input area ───────────────────────────────────────────── */}
      {isInputBlocked ? (
        /* Non-admin in admin-only group */
        <div className="px-4 py-4 bg-white border-t border-gray-100 flex items-center justify-center gap-2 text-gray-400">
          <Lock size={15} />
          <span className="text-sm">Only admins can send messages in this group</span>
        </div>
      ) : (
        <div className="px-4 py-3 bg-white border-t border-gray-100">
          <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus-within:border-[#008ecc] transition">
            <button onClick={() => fileRef.current?.click()} className="flex-shrink-0 text-gray-400 hover:text-[#008ecc] transition p-1">
              <Paperclip size={18} />
            </button>
            <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip" />

            <div className="relative flex-shrink-0" ref={emojiRef}>
              <button onClick={() => setShowEmoji((v) => !v)} className={`p-1 transition ${showEmoji ? "text-[#008ecc]" : "text-gray-400 hover:text-[#008ecc]"}`}>
                <Smile size={18} />
              </button>
              {showEmoji && (
                <div className="absolute bottom-full mb-2 left-0 z-50">
                  <EmojiPicker
                    onSelect={(emoji) => { setText((t) => t + emoji); setShowEmoji(false); textareaRef.current?.focus(); }}
                    onClose={() => setShowEmoji(false)}
                  />
                </div>
              )}
            </div>

            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (isGroupActive) emitGroupTyping?.(activeGroup._id);
                else emitTyping?.(activeContact._id);
              }}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${isGroupActive ? activeGroup.name : activeContact.name}…`}
              className="flex-1 bg-transparent text-sm text-gray-700 resize-none focus:outline-none max-h-32 overflow-y-auto"
              style={{ minHeight: "24px" }}
            />

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
          <p className="text-[10px] text-gray-400 mt-1 px-1">Enter to send · Shift+Enter new line</p>
        </div>
      )}

      {/* ── Delete modal ─────────────────────────────────────────── */}
      {deleteModal && (
        <DeleteModal
          type={deleteModal.type}
          onDeleteForEveryone={handleDeleteForEveryone}
          onDeleteForMe={handleDeleteForMe}
          onClearChat={handleClearChat}
          onClose={() => setDeleteModal(null)}
        />
      )}

      {/* ── Add Member modal ─────────────────────────────────────── */}
      {showAddMember && isGroupActive && (
        <AddMemberModal group={activeGroup} onClose={() => setShowAddMember(false)} />
      )}
    </div>
  );
};

export default ChatWindow;
