import React, { useState, useRef, useEffect, useCallback } from "react";
import { Search, Users, Plus, MessageSquare, Trash2, Pin, MoreVertical, PinOff } from "lucide-react";
import { useChat } from "../../context/ChatContext";
import CreateGroupModal from "./CreateGroupModal";
import DeleteModal from "./DeleteModal";

const API_BASE = import.meta.env.VITE_SI_URI || "";

const buildImgUrl = (img) => {
  if (!img) return null;
  if (img.startsWith("http://") || img.startsWith("https://")) return img;
  const base = API_BASE.replace(/\/+$/, "");
  const name = img.replace(/^\/+/, "").replace(/^uploads\/users\//, "").replace(/^uploads\//, "");
  return `${base}/uploads/users/${name}`;
};

const PINNED_KEY = "crm_pinned_contacts";
const getPinnedIds = () => { try { return JSON.parse(localStorage.getItem(PINNED_KEY) || "[]"); } catch { return []; } };
const savePinnedIds = (ids) => localStorage.setItem(PINNED_KEY, JSON.stringify(ids));

const formatTime = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
};

const ContactAvatar = ({ name, image, size = 10 }) => {
  const [imgFailed, setImgFailed] = React.useState(false);
  const initials = (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const colors   = ["bg-blue-500", "bg-purple-500", "bg-green-500", "bg-orange-500", "bg-pink-500"];
  const color    = colors[(name?.charCodeAt(0) || 0) % colors.length];
  const url      = buildImgUrl(image);
  if (url && !imgFailed)
    return <img src={url} alt={name} className={`w-${size} h-${size} rounded-full object-cover flex-shrink-0`} onError={() => setImgFailed(true)} />;
  return (
    <div className={`w-${size} h-${size} rounded-full ${color} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}>
      {initials}
    </div>
  );
};

const GroupAvatar = ({ size = 10 }) => (
  <div className={`w-${size} h-${size} rounded-full bg-gradient-to-br from-[#008ecc] to-[#0056b3] flex items-center justify-center flex-shrink-0`}>
    <Users size={size === 10 ? 18 : 14} className="text-white" />
  </div>
);

// Three-dot context menu — shared by DM and Group cards
const CardMenu = ({ isPinned, onPin, onClear, onDelete, deleteLabel = "Delete Chat", onClose }) => {
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute right-2 top-8 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-40 overflow-hidden">
      <button
        onClick={(e) => { e.stopPropagation(); onPin(); onClose(); }}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
      >
        {isPinned ? <PinOff size={14} className="text-gray-400" /> : <Pin size={14} className="text-gray-400" />}
        {isPinned ? "Unpin Chat" : "Pin Chat"}
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onClear(); onClose(); }}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
      >
        <Trash2 size={14} className="text-gray-400" /> Clear Chat
      </button>
      {onDelete && (
        <>
          <div className="h-px bg-gray-100 mx-3" />
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); onClose(); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
          >
            <Trash2 size={14} /> {deleteLabel}
          </button>
        </>
      )}
    </div>
  );
};

const ContactList = () => {
  const {
    contacts, activeContact, onlineUsers, selectContact,
    groups, activeGroup, selectGroup, currentUser, deleteGroup, clearChat, deleteChat,
  } = useChat();

  const [tab,         setTab]         = useState("dm");
  const [search,      setSearch]      = useState("");
  const [showCreate,  setShowCreate]  = useState(false);
  const [menuContact, setMenuContact] = useState(null);
  const [menuGroup,   setMenuGroup]   = useState(null);
  const [confirmModal, setConfirmModal] = useState(null); // { type, name, onConfirm }
  const [pinnedIds,   setPinnedIds]   = useState(getPinnedIds);
  const [pinnedGroupIds, setPinnedGroupIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("crm_pinned_groups") || "[]"); } catch { return []; }
  });

  const isSystemAdmin = currentUser?.role?.name?.toLowerCase() === "admin";

  const togglePin = useCallback((contactId) => {
    setPinnedIds((prev) => {
      const next = prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId];
      savePinnedIds(next);
      return next;
    });
  }, []);

  const handleClear = useCallback((contactId, contactName) => {
    setConfirmModal({
      type: "clear",
      name: contactName,
      onConfirm: () => clearChat?.(contactId),
    });
  }, [clearChat]);

  const handleDeleteChat = useCallback((contactId, contactName) => {
    setConfirmModal({
      type: "delete_chat",
      name: contactName,
      onConfirm: () => deleteChat?.(contactId),
    });
  }, [deleteChat]);

  const toggleGroupPin = useCallback((groupId) => {
    setPinnedGroupIds((prev) => {
      const next = prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId];
      localStorage.setItem("crm_pinned_groups", JSON.stringify(next));
      return next;
    });
  }, []);

  const handleDeleteGroup = useCallback((group) => {
    setConfirmModal({
      type: "delete_group",
      name: group.name,
      onConfirm: () => deleteGroup?.(group._id),
    });
  }, [deleteGroup]);

  // Sort contacts: pinned first, then by last message time
  const allContacts = contacts.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );
  const pinned   = allContacts.filter((c) => pinnedIds.includes(c._id));
  const unpinned = allContacts.filter((c) => !pinnedIds.includes(c._id));
  const filteredContacts = [...pinned, ...unpinned];

  const allGroups = (groups || []).filter((g) =>
    g.name?.toLowerCase().includes(search.toLowerCase())
  );
  const pinnedGroups   = allGroups.filter((g) => pinnedGroupIds.includes(String(g._id)));
  const unpinnedGroups = allGroups.filter((g) => !pinnedGroupIds.includes(String(g._id)));
  const filteredGroups = [...pinnedGroups, ...unpinnedGroups];

  const totalDmUnread    = contacts.reduce((s, c) => s + (c.unreadCount || 0), 0);
  const totalGroupUnread = (groups || []).reduce((s, g) => s + (g.unreadCount || 0), 0);

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-100">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Messages</h2>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-[#008ecc]"
          />
        </div>

        {/* Tabs */}
        <div className="flex mt-3 bg-gray-50 rounded-xl p-1 gap-1">
          <button
            onClick={() => setTab("dm")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition
              ${tab === "dm" ? "bg-white text-[#008ecc] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            <MessageSquare size={12} /> Direct
            {totalDmUnread > 0 && (
              <span className="bg-[#008ecc] text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 min-w-[16px] text-center">
                {totalDmUnread > 9 ? "9+" : totalDmUnread}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("groups")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition
              ${tab === "groups" ? "bg-white text-[#008ecc] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            <Users size={12} /> Groups
            {totalGroupUnread > 0 && (
              <span className="bg-[#008ecc] text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 min-w-[16px] text-center">
                {totalGroupUnread > 9 ? "9+" : totalGroupUnread}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Direct Messages ──────────────────────────────── */}
        {tab === "dm" && (
          filteredContacts.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">No contacts found</div>
          ) : (
            <>
              {/* Pinned section label */}
              {pinned.length > 0 && (
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 pt-3 pb-1">Pinned</p>
              )}
              {filteredContacts.map((contact, idx) => {
                const isOnline  = onlineUsers.includes(String(contact._id));
                const isActive  = activeContact?._id === contact._id && !activeGroup;
                const isPinned  = pinnedIds.includes(contact._id);
                const isMenuOpen = menuContact === contact._id;
                const showUnpinnedLabel = idx === pinned.length && pinned.length > 0;

                return (
                  <React.Fragment key={contact._id}>
                    {showUnpinnedLabel && (
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 pt-3 pb-1">All Chats</p>
                    )}
                    <div
                      className={`relative flex items-center gap-3 px-4 py-3 cursor-pointer transition-all group/dm
                        ${isActive ? "bg-[#f0faff] border-r-2 border-[#008ecc]" : "hover:bg-gray-50"}`}
                      onClick={() => selectContact(contact)}
                    >
                      {/* Avatar + online dot */}
                      <div className="relative flex-shrink-0">
                        <ContactAvatar name={contact.name} image={contact.profileImage} size={10} />
                        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white
                          ${isOnline ? "bg-green-500" : "bg-gray-300"}`}
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium truncate flex items-center gap-1 ${isActive ? "text-[#008ecc]" : "text-gray-800"}`}>
                            {contact.name}
                            {isPinned && <Pin size={10} className="text-[#008ecc] flex-shrink-0" />}
                          </span>
                          <span className="text-[10px] text-gray-400 flex-shrink-0 ml-1">
                            {contact.lastMessage ? formatTime(contact.lastMessage.createdAt) : ""}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-xs text-gray-400 truncate">
                            {contact.lastMessage
                              ? contact.lastMessage.fileType
                                ? `📎 ${contact.lastMessage.fileType === "image" ? "Image" : "File"}`
                                : contact.lastMessage.message
                              : contact.email}
                          </span>
                          {contact.unreadCount > 0 && (
                            <span className="ml-1 flex-shrink-0 bg-[#008ecc] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                              {contact.unreadCount > 9 ? "9+" : contact.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Three-dot button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuContact(isMenuOpen ? null : contact._id); }}
                        className="flex-shrink-0 w-7 h-7 rounded-full opacity-0 group-hover/dm:opacity-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition"
                      >
                        <MoreVertical size={14} />
                      </button>

                      {/* Dropdown menu */}
                      {isMenuOpen && (
                        <CardMenu
                          isPinned={isPinned}
                          onPin={() => togglePin(contact._id)}
                          onClear={() => handleClear(contact._id, contact.name)}
                          onDelete={() => handleDeleteChat(contact._id, contact.name)}
                          onClose={() => setMenuContact(null)}
                        />
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
            </>
          )
        )}

        {/* ── Groups ──────────────────────────────────────── */}
        {tab === "groups" && (
          <>
            {isSystemAdmin && (
              <div className="px-4 pt-3 pb-1">
                <button
                  onClick={() => setShowCreate(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-[#008ecc] border border-dashed border-[#008ecc]/40 rounded-xl hover:bg-[#f0faff] transition"
                >
                  <Plus size={14} /> New Group
                </button>
              </div>
            )}

            {filteredGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-sm text-gray-400 gap-1">
                <Users size={28} className="text-gray-200" />
                <span>No groups yet</span>
              </div>
            ) : (
              <>
                {pinnedGroups.length > 0 && (
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 pt-3 pb-1">Pinned</p>
                )}
                {filteredGroups.map((group, idx) => {
                  const isActive     = activeGroup?._id === group._id;
                  const isGroupAdmin = (group.admins || []).some(
                    (a) => String(a) === String(currentUser._id) || String(a?._id) === String(currentUser._id)
                  );
                  const isGroupPinned  = pinnedGroupIds.includes(String(group._id));
                  const isGMenuOpen    = menuGroup === String(group._id);
                  const showUnpinnedLabel = idx === pinnedGroups.length && pinnedGroups.length > 0;

                  return (
                    <React.Fragment key={group._id}>
                      {showUnpinnedLabel && (
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 pt-3 pb-1">All Groups</p>
                      )}
                      <div
                        onClick={() => selectGroup(group)}
                        className={`relative flex items-center gap-3 px-4 py-3 cursor-pointer transition-all group/grp
                          ${isActive ? "bg-[#f0faff] border-r-2 border-[#008ecc]" : "hover:bg-gray-50"}`}
                      >
                        {/* Avatar — no delete overlay */}
                        <div className="relative flex-shrink-0">
                          <GroupAvatar size={10} />
                        </div>

                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-medium truncate flex items-center gap-1 ${isActive ? "text-[#008ecc]" : "text-gray-800"}`}>
                              {group.name}
                              {isGroupPinned && <Pin size={10} className="text-[#008ecc] flex-shrink-0" />}
                            </span>
                            <span className="text-[10px] text-gray-400 flex-shrink-0 ml-1">
                              {group.lastMessage ? formatTime(group.lastMessage.createdAt) : ""}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="text-xs text-gray-400 truncate">
                              {group.lastMessage
                                ? group.lastMessage.fileType
                                  ? `📎 ${group.lastMessage.fileType === "image" ? "Image" : "File"}`
                                  : group.lastMessage.senderName
                                    ? `${group.lastMessage.senderName}: ${group.lastMessage.message}`
                                    : group.lastMessage.message
                                : `${group.memberCount} members`}
                            </span>
                            {group.unreadCount > 0 && (
                              <span className="ml-1 flex-shrink-0 bg-[#008ecc] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                {group.unreadCount > 9 ? "9+" : group.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Three-dot button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); setMenuGroup(isGMenuOpen ? null : String(group._id)); }}
                          className="flex-shrink-0 w-7 h-7 rounded-full opacity-0 group-hover/grp:opacity-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition"
                        >
                          <MoreVertical size={14} />
                        </button>

                        {/* Dropdown menu */}
                        {isGMenuOpen && (
                          <CardMenu
                            isPinned={isGroupPinned}
                            onPin={() => toggleGroupPin(String(group._id))}
                            onClear={() => handleClear(group._id, group.name)}
                            onDelete={isGroupAdmin ? () => handleDeleteGroup(group) : null}
                            deleteLabel="Delete Group"
                            onClose={() => setMenuGroup(null)}
                          />
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
              </>
            )}
          </>
        )}
      </div>

      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} />}

      {confirmModal && (
        <DeleteModal
          type={confirmModal.type}
          name={confirmModal.name}
          onConfirm={confirmModal.onConfirm}
          onClearChat={confirmModal.onConfirm}
          onClose={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
};

export default ContactList;
