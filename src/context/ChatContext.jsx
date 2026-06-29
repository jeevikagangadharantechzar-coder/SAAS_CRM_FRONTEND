import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import { getSocket } from "../utils/socket";

const ChatContext = createContext(null);

const getDbName = () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    return JSON.parse(atob(token.split(".")[1])).dbName || null;
  } catch { return null; }
};

const getUser = () => {
  try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
};

export const ChatProvider = ({ children }) => {
  const API_URL    = import.meta.env.VITE_API_URL;
  const tenantSlug = localStorage.getItem("tenantSlug");
  const CHAT_BASE  = `${API_URL.replace("/api", "")}/${tenantSlug}/api/chat`;
  const GROUP_BASE = `${API_URL.replace("/api", "")}/${tenantSlug}/api/groups`;
  const token      = localStorage.getItem("token");
  const headers    = { Authorization: `Bearer ${token}` };

  const [contacts,      setContacts]      = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [messages,      setMessages]      = useState([]);
  const [onlineUsers,   setOnlineUsers]   = useState([]);
  const [totalUnread,   setTotalUnread]   = useState(0);
  const [typing,        setTyping]        = useState(null);
  const [loadingMsgs,   setLoadingMsgs]   = useState(false);

  const [groups,        setGroups]        = useState([]);
  const [activeGroup,   setActiveGroup]   = useState(null);
  const [groupMessages, setGroupMessages] = useState([]);
  const [groupTyping,   setGroupTyping]   = useState(null);

  const typingTimer      = useRef(null);
  const groupTypingTimer = useRef(null);
  const dbName           = getDbName();
  const currentUser      = getUser();

  // ── Contacts ─────────────────────────────────────────────────────
  const loadContacts = useCallback(async () => {
    try {
      const { data } = await axios.get(`${CHAT_BASE}/contacts`, { headers });
      setContacts(data.contacts || []);
    } catch {}
  }, [CHAT_BASE, token]);

  // ── DM Messages ──────────────────────────────────────────────────
  const loadMessages = useCallback(async (userId) => {
    setLoadingMsgs(true);
    try {
      const { data } = await axios.get(`${CHAT_BASE}/messages/${userId}`, { headers });
      // Annotate status for read receipt rendering
      const annotated = (data.messages || []).map((m) => ({
        ...m,
        status: m.isRead ? "read" : "sent",
      }));
      setMessages(annotated);
      await axios.post(`${CHAT_BASE}/messages/${userId}/read`, {}, { headers });
      setContacts((prev) => prev.map((c) => c._id === userId ? { ...c, unreadCount: 0 } : c));
      const socket = getSocket();
      if (socket) socket.emit("chat:mark_read", { senderId: userId, dbName });
    } catch {}
    finally { setLoadingMsgs(false); }
  }, [CHAT_BASE, token, dbName]);

  const loadUnreadCount = useCallback(async () => {
    try {
      const { data } = await axios.get(`${CHAT_BASE}/unread-count`, { headers });
      setTotalUnread(data.unreadCount || 0);
    } catch {}
  }, [CHAT_BASE, token]);

  const selectContact = useCallback((contact) => {
    setActiveContact(contact);
    setActiveGroup(null);
    setGroupMessages([]);
    setTyping(null);
    loadMessages(contact._id);
  }, [loadMessages]);

  const sendMessage = useCallback(({ receiverId, message, fileUrl, fileName, fileType, replyTo }) => {
    const socket = getSocket();
    if (!socket) return;

    // Optimistic message so sender sees single-tick immediately
    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const optimistic = {
      _id: tempId, tempId,
      senderId:   currentUser._id,
      receiverId,
      senderName: currentUser.name || "User",
      senderRole: currentUser.role?.name?.toLowerCase() || "user",
      message:    message || "",
      fileUrl:    fileUrl  || null,
      fileName:   fileName || null,
      fileType:   fileType || null,
      replyTo:    replyTo  || undefined,
      reactions:  [],
      isRead:     false,
      isDeleted:  false,
      status:     "sending",
      createdAt:  new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    socket.emit("chat:send", {
      receiverId, message, tempId,
      fileUrl: fileUrl || null, fileName: fileName || null, fileType: fileType || null,
      replyTo: replyTo || undefined,
      senderName: currentUser.name || "User",
      senderRole: currentUser.role?.name?.toLowerCase() || "user",
      dbName,
    });
  }, [dbName, currentUser]);

  const emitTyping = useCallback((receiverId) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit("chat:typing", { receiverId, senderName: currentUser.name || "User" });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket.emit("chat:stop_typing", { receiverId }), 2000);
  }, [currentUser]);

  // deleteForEveryone=true → socket event; deleteForEveryone=false → local only
  const deleteMessage = useCallback((messageId, forMeOnly = false) => {
    if (forMeOnly) {
      setMessages((prev) => prev.filter((m) => String(m._id) !== String(messageId)));
      return;
    }
    const socket = getSocket();
    if (!socket) return;
    socket.emit("chat:delete", { messageId, dbName });
  }, [dbName]);

  const reactToMessage = useCallback((messageId, emoji) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit("chat:react", { messageId, emoji, dbName });
  }, [dbName]);

  const clearChat = useCallback(async (userId) => {
    try {
      await axios.delete(`${CHAT_BASE}/clear/${userId}`, { headers });
      setMessages([]);
      setContacts((prev) => prev.map((c) => String(c._id) === String(userId) ? { ...c, lastMessage: null, unreadCount: 0 } : c));
    } catch {}
  }, [CHAT_BASE, token]);

  const deleteChat = useCallback(async (userId) => {
    try {
      await axios.delete(`${CHAT_BASE}/clear/${userId}`, { headers });
      setMessages([]);
      // Remove contact from sidebar; reload contacts to restore if they message again
      setContacts((prev) => prev.filter((c) => String(c._id) !== String(userId)));
      setActiveContact((prev) => (prev && String(prev._id) === String(userId) ? null : prev));
    } catch {}
  }, [CHAT_BASE, token]);

  // ── Groups ───────────────────────────────────────────────────────
  const loadGroups = useCallback(async () => {
    try {
      const { data } = await axios.get(`${GROUP_BASE}`, { headers });
      setGroups(data.groups || []);
    } catch {}
  }, [GROUP_BASE, token]);

  const createGroup = useCallback(async ({ name, description, memberIds, adminIds, onlyAdminsCanMessage }) => {
    const { data } = await axios.post(`${GROUP_BASE}`, { name, description, memberIds, adminIds, onlyAdminsCanMessage }, { headers });
    await loadGroups();
    return data.group;
  }, [GROUP_BASE, token, loadGroups]);

  const loadGroupMessages = useCallback(async (groupId) => {
    setLoadingMsgs(true);
    try {
      const { data } = await axios.get(`${GROUP_BASE}/${groupId}/messages`, { headers });
      setGroupMessages(data.messages || []);
      // Mark read via REST (updates DB) + socket (notifies senders in real-time)
      await axios.post(`${GROUP_BASE}/${groupId}/read`, {}, { headers });
      const socket = getSocket();
      if (socket) socket.emit("group:mark_read", { groupId, dbName });
      setGroups((prev) => prev.map((g) => String(g._id) === String(groupId) ? { ...g, unreadCount: 0 } : g));
    } catch {}
    finally { setLoadingMsgs(false); }
  }, [GROUP_BASE, token, dbName]);

  const selectGroup = useCallback((group) => {
    setActiveGroup(group);
    setActiveContact(null);
    setMessages([]);
    setGroupTyping(null);
    loadGroupMessages(group._id);
  }, [loadGroupMessages]);

  const sendGroupMessage = useCallback(({ groupId, message, fileUrl, fileName, fileType, replyTo }) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit("group:send", {
      groupId, message,
      fileUrl: fileUrl || null, fileName: fileName || null, fileType: fileType || null,
      replyTo: replyTo || undefined,
      senderName: currentUser.name || "User",
      senderRole: currentUser.role?.name?.toLowerCase() || "user",
      dbName,
    });
  }, [dbName, currentUser]);

  const emitGroupTyping = useCallback((groupId) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit("group:typing", { groupId, senderName: currentUser.name || "User", dbName });
    if (groupTypingTimer.current) clearTimeout(groupTypingTimer.current);
    groupTypingTimer.current = setTimeout(() => socket.emit("group:stop_typing", { groupId, dbName }), 2000);
  }, [currentUser, dbName]);

  const reactToGroupMessage = useCallback((messageId, emoji, groupId) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit("group:react", { messageId, emoji, groupId, dbName });
  }, [dbName]);

  const deleteGroupMessage = useCallback((messageId, groupId, forMeOnly = false) => {
    if (forMeOnly) {
      setGroupMessages((prev) => prev.filter((m) => String(m._id) !== String(messageId)));
      return;
    }
    const socket = getSocket();
    if (!socket) return;
    socket.emit("group:delete", { messageId, groupId, dbName });
  }, [dbName]);

  const deleteGroup = useCallback((groupId) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit("group:delete_group", { groupId, dbName });
  }, [dbName]);

  const addMembers = useCallback(async (groupId, memberIds) => {
    await axios.post(`${GROUP_BASE}/${groupId}/members`, { memberIds }, { headers });
    const { data } = await axios.get(`${GROUP_BASE}/${groupId}`, { headers });
    setActiveGroup((prev) => prev && String(prev._id) === String(groupId) ? { ...prev, ...data.group } : prev);
    setGroups((prev) => prev.map((g) => String(g._id) === String(groupId) ? { ...g, memberCount: data.group.members.length } : g));
  }, [GROUP_BASE, token]);

  const leaveGroup = useCallback(async (groupId) => {
    try {
      await axios.post(`${GROUP_BASE}/${groupId}/leave`, {}, { headers });
      setGroups((prev) => prev.filter((g) => String(g._id) !== String(groupId)));
      if (String(activeGroup?._id) === String(groupId)) { setActiveGroup(null); setGroupMessages([]); }
    } catch {}
  }, [GROUP_BASE, token, activeGroup]);

  const removeMember = useCallback(async (groupId, memberId) => {
    try {
      await axios.delete(`${GROUP_BASE}/${groupId}/members/${memberId}`, { headers });
      // Refresh group info
      const { data } = await axios.get(`${GROUP_BASE}/${groupId}`, { headers });
      setActiveGroup((prev) => prev && String(prev._id) === String(groupId) ? { ...prev, ...data.group } : prev);
      setGroups((prev) => prev.map((g) => String(g._id) === String(groupId) ? { ...g, memberCount: data.group.members.length } : g));
    } catch {}
  }, [GROUP_BASE, token]);

  const clearGroupChat = useCallback(async (groupId) => {
    try {
      await axios.delete(`${GROUP_BASE}/${groupId}/clear`, { headers });
      setGroupMessages([]);
      setGroups((prev) => prev.map((g) => String(g._id) === String(groupId) ? { ...g, lastMessage: null, unreadCount: 0 } : g));
    } catch {}
  }, [GROUP_BASE, token]);

  const uploadFile = useCallback(async (file) => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await axios.post(`${CHAT_BASE}/upload`, form, {
      headers: { ...headers, "Content-Type": "multipart/form-data" },
    });
    return data;
  }, [CHAT_BASE, token]);

  // ── Socket listeners ─────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onMessage = (msg) => {
      if (activeContact && String(msg.senderId) === String(activeContact._id)) {
        setMessages((prev) => [...prev, msg]);
        axios.post(`${CHAT_BASE}/messages/${msg.senderId}/read`, {}, { headers }).catch(() => {});
        socket.emit("chat:mark_read", { senderId: msg.senderId, dbName });
      } else {
        setContacts((prev) =>
          prev.map((c) =>
            String(c._id) === String(msg.senderId)
              ? { ...c, unreadCount: (c.unreadCount || 0) + 1, lastMessage: { message: msg.message, fileType: msg.fileType, createdAt: msg.createdAt } }
              : c
          )
        );
        setTotalUnread((p) => p + 1);
      }
    };

    const onMessageSent = (msg) => {
      // Replace optimistic message (matched by tempId) with real server message
      setMessages((prev) => {
        const idx = msg.tempId ? prev.findIndex((m) => m.tempId === msg.tempId) : -1;
        const confirmed = { ...msg, status: "sent" };
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = confirmed;
          return next;
        }
        return [...prev, confirmed];
      });
      setContacts((prev) =>
        prev.map((c) =>
          String(c._id) === String(msg.receiverId)
            ? { ...c, lastMessage: { message: msg.message, fileType: msg.fileType, createdAt: msg.createdAt } }
            : c
        )
      );
    };

    const onTyping = ({ senderId, senderName }) => {
      if (activeContact && String(senderId) === String(activeContact._id)) {
        setTyping({ senderId, senderName });
        setTimeout(() => setTyping(null), 3000);
      }
    };
    const onStopTyping = ({ senderId }) => {
      if (activeContact && String(senderId) === String(activeContact._id)) setTyping(null);
    };
    const onReadReceipt = ({ readBy }) => {
      setMessages((prev) => prev.map((m) =>
        String(m.receiverId) === String(readBy) ? { ...m, isRead: true, status: "read" } : m
      ));
    };
    const onDeleted = ({ messageId }) => {
      setMessages((prev) => prev.map((m) => String(m._id) === String(messageId) ? { ...m, isDeleted: true, message: "" } : m));
    };
    const onReacted = ({ messageId, reactions }) => {
      setMessages((prev) => prev.map((m) => String(m._id) === String(messageId) ? { ...m, reactions } : m));
    };

    // ── Online status — request fresh list after listeners are ready ──
    const onOnlineUsers = (list) => {
      setOnlineUsers(list.map((item) => typeof item === "object" ? String(item.userId) : String(item)));
    };
    const onUserStatus = ({ userId, isOnline }) => {
      setOnlineUsers((prev) =>
        isOnline ? [...new Set([...prev, String(userId)])] : prev.filter((id) => id !== String(userId))
      );
    };

    // ── Group events ─────────────────────────────────────────────
    const onGroupMessage = (msg) => {
      if (activeGroup && String(msg.groupId) === String(activeGroup._id)) {
        setGroupMessages((prev) => [...prev, msg]);
        axios.post(`${GROUP_BASE}/${msg.groupId}/read`, {}, { headers }).catch(() => {});
        socket.emit("group:mark_read", { groupId: msg.groupId, dbName });
      } else {
        setGroups((prev) =>
          prev.map((g) =>
            String(g._id) === String(msg.groupId)
              ? { ...g, unreadCount: (g.unreadCount || 0) + 1, lastMessage: { message: msg.message, fileType: msg.fileType, senderName: msg.senderName, createdAt: msg.createdAt } }
              : g
          )
        );
      }
    };
    const onGroupMessageSent = (msg) => {
      setGroupMessages((prev) => [...prev, msg]);
      setGroups((prev) =>
        prev.map((g) =>
          String(g._id) === String(msg.groupId)
            ? { ...g, lastMessage: { message: msg.message, fileType: msg.fileType, senderName: msg.senderName, createdAt: msg.createdAt } }
            : g
        )
      );
    };
    const onGroupTyping = ({ groupId, senderId, senderName }) => {
      if (activeGroup && String(groupId) === String(activeGroup._id) && String(senderId) !== String(currentUser._id)) {
        setGroupTyping({ senderId, senderName });
        setTimeout(() => setGroupTyping(null), 3000);
      }
    };
    const onGroupStopTyping = ({ groupId }) => {
      if (activeGroup && String(groupId) === String(activeGroup._id)) setGroupTyping(null);
    };
    const onGroupReacted = ({ messageId, reactions }) => {
      setGroupMessages((prev) => prev.map((m) => String(m._id) === String(messageId) ? { ...m, reactions } : m));
    };
    const onGroupDeleted = ({ messageId }) => {
      setGroupMessages((prev) => prev.map((m) => String(m._id) === String(messageId) ? { ...m, isDeleted: true, message: "" } : m));
    };
    const onGroupGroupDeleted = ({ groupId }) => {
      setGroups((prev) => prev.filter((g) => String(g._id) !== String(groupId)));
      setActiveGroup((prev) => { if (prev && String(prev._id) === String(groupId)) { setGroupMessages([]); return null; } return prev; });
    };
    const onGroupGroupCreated = (group) => {
      // Add the new group to the top of the list if not already present
      setGroups((prev) => {
        const exists = prev.some((g) => String(g._id) === String(group._id));
        if (exists) return prev;
        return [group, ...prev];
      });
    };
    const onGroupReadReceipt = ({ messageId, readBy }) => {
      // Update readBy array on the specific message so GroupTickIcon re-renders
      setGroupMessages((prev) =>
        prev.map((m) => String(m._id) === String(messageId) ? { ...m, readBy } : m)
      );
    };

    socket.on("chat:message",       onMessage);
    socket.on("chat:message_sent",  onMessageSent);
    socket.on("chat:typing",        onTyping);
    socket.on("chat:stop_typing",   onStopTyping);
    socket.on("chat:read_receipt",  onReadReceipt);
    socket.on("chat:deleted",       onDeleted);
    socket.on("chat:reacted",       onReacted);
    socket.on("chat:online_users",  onOnlineUsers);
    socket.on("chat:user_status",   onUserStatus);
    socket.on("group:message",      onGroupMessage);
    socket.on("group:message_sent", onGroupMessageSent);
    socket.on("group:typing",       onGroupTyping);
    socket.on("group:stop_typing",  onGroupStopTyping);
    socket.on("group:reacted",      onGroupReacted);
    socket.on("group:deleted",        onGroupDeleted);
    socket.on("group:group_deleted",  onGroupGroupDeleted);
    socket.on("group:group_created",  onGroupGroupCreated);
    socket.on("group:read_receipt",   onGroupReadReceipt);

    // ── FIX: request current online users AFTER registering listener ──
    socket.emit("chat:get_online_users");

    return () => {
      socket.off("chat:message",       onMessage);
      socket.off("chat:message_sent",  onMessageSent);
      socket.off("chat:typing",        onTyping);
      socket.off("chat:stop_typing",   onStopTyping);
      socket.off("chat:read_receipt",  onReadReceipt);
      socket.off("chat:deleted",       onDeleted);
      socket.off("chat:reacted",       onReacted);
      socket.off("chat:online_users",  onOnlineUsers);
      socket.off("chat:user_status",   onUserStatus);
      socket.off("group:message",      onGroupMessage);
      socket.off("group:message_sent", onGroupMessageSent);
      socket.off("group:typing",       onGroupTyping);
      socket.off("group:stop_typing",  onGroupStopTyping);
      socket.off("group:reacted",       onGroupReacted);
      socket.off("group:deleted",       onGroupDeleted);
      socket.off("group:group_deleted",  onGroupGroupDeleted);
      socket.off("group:group_created",  onGroupGroupCreated);
      socket.off("group:read_receipt",   onGroupReadReceipt);
    };
  }, [activeContact, activeGroup, CHAT_BASE, GROUP_BASE, dbName, token]);

  useEffect(() => { loadContacts(); loadGroups(); loadUnreadCount(); }, []);

  // Broadcast combined unread count to sidebar/header via window event
  useEffect(() => {
    const dmUnread    = contacts.reduce((s, c) => s + (c.unreadCount || 0), 0);
    const groupUnread = groups.reduce((s, g) => s + (g.unreadCount || 0), 0);
    window.dispatchEvent(new CustomEvent("crm:chat_unread", { detail: { count: dmUnread + groupUnread } }));
  }, [contacts, groups]);

  return (
    <ChatContext.Provider value={{
      contacts, activeContact, messages, onlineUsers,
      totalUnread, typing, loadingMsgs,
      selectContact, sendMessage, emitTyping,
      uploadFile, loadContacts, currentUser,
      deleteMessage, reactToMessage, clearChat, deleteChat,
      groups, activeGroup, groupMessages, groupTyping,
      selectGroup, sendGroupMessage, emitGroupTyping,
      createGroup, loadGroups, leaveGroup, removeMember, deleteGroup, addMembers,
      reactToGroupMessage, deleteGroupMessage, clearGroupChat,
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
