import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import { getSocket } from "../utils/socket";

const ChatContext = createContext(null);

const getDbName = () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.dbName || null;
  } catch {
    return null;
  }
};

const getUser = () => {
  try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
};

export const ChatProvider = ({ children }) => {
  const API_URL    = import.meta.env.VITE_API_URL;
  const tenantSlug = localStorage.getItem("tenantSlug");
  const BASE       = `${API_URL.replace("/api", "")}/${tenantSlug}/api/chat`;
  const token      = localStorage.getItem("token");

  const headers = { Authorization: `Bearer ${token}` };

  const [contacts,      setContacts]      = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [messages,      setMessages]      = useState([]);
  const [onlineUsers,   setOnlineUsers]   = useState([]);
  const [totalUnread,   setTotalUnread]   = useState(0);
  const [typing,        setTyping]        = useState(null); // { senderId, senderName }
  const [loadingMsgs,   setLoadingMsgs]   = useState(false);
  const typingTimer = useRef(null);
  const dbName      = getDbName();
  const currentUser = getUser();

  // ── Load contacts ───────────────────────────────────────────────
  const loadContacts = useCallback(async () => {
    try {
      const { data } = await axios.get(`${BASE}/contacts`, { headers });
      setContacts(data.contacts || []);
    } catch (err) {
      console.error("ChatContext loadContacts:", err.message);
    }
  }, [BASE, token]);

  // ── Load messages with a user ───────────────────────────────────
  const loadMessages = useCallback(async (userId) => {
    setLoadingMsgs(true);
    try {
      const { data } = await axios.get(`${BASE}/messages/${userId}`, { headers });
      setMessages(data.messages || []);
      // mark as read
      await axios.post(`${BASE}/messages/${userId}/read`, {}, { headers });
      // update unread in contact list
      setContacts((prev) =>
        prev.map((c) => (c._id === userId ? { ...c, unreadCount: 0 } : c))
      );
      setTotalUnread((prev) => Math.max(0, prev - (contacts.find((c) => c._id === userId)?.unreadCount || 0)));
      // notify sender via socket
      const socket = getSocket();
      if (socket) socket.emit("chat:mark_read", { senderId: userId, dbName });
    } catch (err) {
      console.error("ChatContext loadMessages:", err.message);
    } finally {
      setLoadingMsgs(false);
    }
  }, [BASE, token, dbName, contacts]);

  // ── Fetch total unread count ────────────────────────────────────
  const loadUnreadCount = useCallback(async () => {
    try {
      const { data } = await axios.get(`${BASE}/unread-count`, { headers });
      setTotalUnread(data.unreadCount || 0);
    } catch {}
  }, [BASE, token]);

  // ── Select a contact ───────────────────────────────────────────
  const selectContact = useCallback((contact) => {
    setActiveContact(contact);
    setTyping(null);
    loadMessages(contact._id);
  }, [loadMessages]);

  // ── Send a message ──────────────────────────────────────────────
  const sendMessage = useCallback(({ receiverId, message, fileUrl, fileName, fileType }) => {
    const socket = getSocket();
    if (!socket) return;

    socket.emit("chat:send", {
      receiverId,
      message,
      fileUrl:    fileUrl  || null,
      fileName:   fileName || null,
      fileType:   fileType || null,
      senderName: currentUser.name || "User",
      senderRole: currentUser.role?.name?.toLowerCase() || "user",
      dbName,
    });
  }, [dbName, currentUser]);

  // ── Typing events ───────────────────────────────────────────────
  const emitTyping = useCallback((receiverId) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit("chat:typing", { receiverId, senderName: currentUser.name || "User" });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit("chat:stop_typing", { receiverId });
    }, 2000);
  }, [currentUser]);

  // ── Upload file ─────────────────────────────────────────────────
  const uploadFile = useCallback(async (file) => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await axios.post(`${BASE}/upload`, form, {
      headers: { ...headers, "Content-Type": "multipart/form-data" },
    });
    return data; // { fileUrl, fileName, fileType }
  }, [BASE, token]);

  // ── Socket listeners ────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onMessage = (msg) => {
      // If message is from current active contact → append to messages
      if (activeContact && String(msg.senderId) === String(activeContact._id)) {
        setMessages((prev) => [...prev, msg]);
        // auto mark read
        axios.post(`${BASE}/messages/${msg.senderId}/read`, {}, { headers }).catch(() => {});
        socket.emit("chat:mark_read", { senderId: msg.senderId, dbName });
      } else {
        // Update unread count on contact
        setContacts((prev) =>
          prev.map((c) =>
            String(c._id) === String(msg.senderId)
              ? { ...c, unreadCount: (c.unreadCount || 0) + 1, lastMessage: { message: msg.message, fileType: msg.fileType, createdAt: msg.createdAt } }
              : c
          )
        );
        setTotalUnread((prev) => prev + 1);
      }
    };

    const onMessageSent = (msg) => {
      setMessages((prev) => [...prev, msg]);
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
      if (activeContact && String(senderId) === String(activeContact._id)) {
        setTyping(null);
      }
    };

    const onReadReceipt = ({ readBy }) => {
      setMessages((prev) =>
        prev.map((m) => String(m.receiverId) === String(readBy) ? { ...m, isRead: true } : m)
      );
    };

    const onOnlineUsers = (list) => {
      setOnlineUsers(list.map((item) =>
        typeof item === "object" ? String(item.userId) : String(item)
      ));
    };
    const onUserStatus  = ({ userId, isOnline }) => {
      setOnlineUsers((prev) =>
        isOnline ? [...new Set([...prev, String(userId)])] : prev.filter((id) => id !== String(userId))
      );
    };

    socket.on("chat:message",      onMessage);
    socket.on("chat:message_sent", onMessageSent);
    socket.on("chat:typing",       onTyping);
    socket.on("chat:stop_typing",  onStopTyping);
    socket.on("chat:read_receipt", onReadReceipt);
    socket.on("chat:online_users", onOnlineUsers);
    socket.on("chat:user_status",  onUserStatus);

    return () => {
      socket.off("chat:message",      onMessage);
      socket.off("chat:message_sent", onMessageSent);
      socket.off("chat:typing",       onTyping);
      socket.off("chat:stop_typing",  onStopTyping);
      socket.off("chat:read_receipt", onReadReceipt);
      socket.off("chat:online_users", onOnlineUsers);
      socket.off("chat:user_status",  onUserStatus);
    };
  }, [activeContact, BASE, dbName, token]);

  useEffect(() => { loadContacts(); loadUnreadCount(); }, []);

  return (
    <ChatContext.Provider value={{
      contacts, activeContact, messages, onlineUsers,
      totalUnread, typing, loadingMsgs,
      selectContact, sendMessage, emitTyping,
      uploadFile, loadContacts, currentUser,
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
