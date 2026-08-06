import { useState, useEffect, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import {
  Search, Send, RefreshCw, ArrowLeft, AlertCircle, Paperclip,
  Image, FileText, Mic, X, ExternalLink, MessageSquare,
  MessageCircle, Bookmark, UserPlus, EyeOff, Trash2, Reply,
} from "lucide-react";
import { api } from "../../services/api";

// ── Instagram branding ────────────────────────────────────────────────────────
const IG_GRADIENT  = "linear-gradient(135deg, #E1306C, #833AB4, #F77737)";
const BACKEND_BASE = import.meta.env.VITE_SI_URI || "http://localhost:5000";

function resolveMediaUrl(url) {
  if (!url) return url;
  if (url.startsWith("/uploads/")) return `${BACKEND_BASE}${url}`;
  return url;
}

const IG_SVG = (size = 18, color = "white") => (
  <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtTime(date) {
  if (!date) return "";
  const d = new Date(date), now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff === 1) return "Yesterday";
  if (diff < 7)  return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { day: "2-digit", month: "short" });
}

function fmtMsgTime(date) {
  if (!date) return "";
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function isOver24h(date) {
  if (!date) return true;
  return Date.now() - new Date(date).getTime() > 24 * 60 * 60 * 1000;
}

function StatusIcon({ status }) {
  if (status === "seen")      return <span className="text-xs" style={{ color: "#E1306C" }}>✓✓</span>;
  if (status === "delivered") return <span className="text-xs text-gray-400">✓✓</span>;
  if (status === "sent")      return <span className="text-xs text-gray-400">✓</span>;
  if (status === "failed")    return <AlertCircle size={11} className="text-red-400" />;
  return <RefreshCw size={9} className="text-gray-300 animate-spin" />;
}

function MsgBubble({ msg }) {
  if (msg.type === "story_mention") {
    return (
      <div className="flex items-start gap-2">
        <Bookmark size={16} style={{ color: "#E1306C" }} className="shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium">Mentioned you in their Story</p>
          {msg.storyUrl && (
            <a href={msg.storyUrl} target="_blank" rel="noreferrer"
               className="text-xs underline mt-1 block" style={{ color: "#E1306C" }}>
              View Story
            </a>
          )}
        </div>
      </div>
    );
  }
  if (msg.type === "reaction") {
    return <p className="text-2xl">{msg.reactionEmoji || "❤️"}</p>;
  }
  if (msg.mediaUrl) {
    const src = resolveMediaUrl(msg.mediaUrl);
    if (msg.type === "image") return (
      <div>
        <img src={src} alt="" onClick={() => window.open(src, "_blank")}
             className="rounded-xl max-w-[220px] max-h-[220px] object-cover mb-1 cursor-pointer" />
        {msg.body && <p className="text-sm">{msg.body}</p>}
      </div>
    );
    if (msg.type === "video") return (
      <video controls src={src} className="rounded-xl max-w-[220px]" />
    );
    if (msg.type === "audio") return (
      <audio controls src={src} className="max-w-[200px]" />
    );
    if (msg.type === "file") return (
      <a href={src} target="_blank" rel="noreferrer"
         className="flex items-center gap-2 hover:opacity-80">
        <div className="p-2 bg-gray-200 rounded-lg"><FileText size={16} className="text-gray-600" /></div>
        <div>
          <p className="text-sm font-medium text-blue-600 underline">{msg.mediaFilename || "File"}</p>
          <p className="text-xs text-gray-500">{msg.mediaMimeType}</p>
        </div>
      </a>
    );
  }
  if (msg.type === "reel") return (
    <div className="flex items-start gap-2">
      <svg viewBox="0 0 24 24" fill="#E1306C" width="16" height="16"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
      <div>
        <p className="text-sm font-medium">Shared a Reel</p>
        {msg.mediaUrl && (
          <a href={msg.mediaUrl} target="_blank" rel="noreferrer"
             className="text-xs underline" style={{ color: "#E1306C" }}>View Reel</a>
        )}
      </div>
    </div>
  );
  if (msg.type === "ig_post") return (
    <div className="flex items-start gap-2">
      <svg viewBox="0 0 24 24" fill="#E1306C" width="16" height="16"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919z"/></svg>
      <div>
        <p className="text-sm font-medium">Shared a Post</p>
        {msg.mediaUrl && (
          <a href={msg.mediaUrl} target="_blank" rel="noreferrer"
             className="text-xs underline" style={{ color: "#E1306C" }}>View Post</a>
        )}
      </div>
    </div>
  );
  return <p className="text-sm whitespace-pre-wrap break-words">{msg.body || `[${msg.type}]`}</p>;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function InstagramInbox() {
  const { slug } = useSelector((s) => s.auth);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Integrations
  const [integrations, setIntegrations]   = useState([]);
  const [activeInt, setActiveInt]         = useState(null);
  const [loadingInts, setLoadingInts]     = useState(true);

  // Left tab: "messages" | "comments"
  const [leftTab, setLeftTab]             = useState("messages");
  const [searchQuery, setSearchQuery]     = useState("");

  // DM conversations
  const [conversations, setConversations] = useState([]);
  const [loadingConvs, setLoadingConvs]   = useState(false);

  // Comments
  const [comments, setComments]           = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [syncingComments, setSyncingComments] = useState(false);
  const [replyingTo, setReplyingTo]       = useState(null);
  const [replyText, setReplyText]         = useState("");

  // Selected DM
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages]           = useState([]);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);

  // Convert to lead modal (simple inline state)
  const [showCreateLead, setShowCreateLead] = useState(false);

  // Compose
  const [newMessage, setNewMessage]       = useState("");
  const [sending, setSending]             = useState(false);
  const [selectedFile, setSelectedFile]   = useState(null);
  const [filePreview, setFilePreview]     = useState(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef   = useRef(null);
  const fileTypeRef    = useRef("file");
  const selectedRef    = useRef(null);
  const socketRef      = useRef(null);

  selectedRef.current = selectedContact;

  // ── Socket ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user?._id) return;
    const socket = io(import.meta.env.VITE_SI_URI || "http://localhost:5000", {
      auth: { userId: user._id },
      transports: ["websocket"],
    });
    socketRef.current = socket;
    socket.emit("user_connected", user._id);

    socket.on("instagram:message", ({ message, senderIgsid, senderUsername }) => {
      setConversations((prev) => {
        const exists = prev.find((c) => c.senderIgsid === senderIgsid);
        const updated = {
          senderIgsid,
          senderUsername: senderUsername || senderIgsid,
          senderName:     senderUsername || senderIgsid,
          lastMessage:     message.body,
          lastMessageType: message.type,
          lastMessageTime: message.createdAt || new Date().toISOString(),
          lastDirection:   "inbound",
          unreadCount:     exists
            ? (selectedRef.current?.senderIgsid === senderIgsid ? 0 : (exists.unreadCount || 0) + 1)
            : 1,
        };
        return [updated, ...prev.filter((c) => c.senderIgsid !== senderIgsid)];
      });
      if (selectedRef.current?.senderIgsid === senderIgsid) {
        setMessages((prev) => prev.some((m) => m._id === message._id) ? prev : [...prev, message]);
      }
    });

    socket.on("instagram:status", ({ senderIgsid, status }) => {
      if (selectedRef.current?.senderIgsid === senderIgsid) {
        setMessages((prev) =>
          prev.map((m) => m.direction === "outbound" && m.status !== "seen" ? { ...m, status } : m)
        );
      }
    });

    socket.on("instagram:comment", ({ comment }) => {
      setComments((prev) => {
        const exists = prev.find((c) => c.commentId === comment.commentId);
        if (exists) return prev;
        return [comment, ...prev];
      });
    });

    return () => socket.disconnect();
  }, [user?._id]);

  // ── Data loading ───────────────────────────────────────────────────────────

  useEffect(() => { loadIntegrations(); }, []);

  const loadIntegrations = async () => {
    try {
      setLoadingInts(true);
      const { data } = await api.get("/instagram/integrations");
      const ints = data.integrations || [];
      setIntegrations(ints);
      if (ints.length) setActiveInt(ints[0]);
    } catch (_) {}
    finally { setLoadingInts(false); }
  };

  const loadConversations = useCallback(async (int) => {
    if (!int) return;
    try {
      setLoadingConvs(true);
      const { data } = await api.get("/instagram/conversations", { params: { integrationId: int._id } });
      setConversations(data.conversations || []);
    } catch (_) { toast.error("Failed to load conversations"); }
    finally { setLoadingConvs(false); }
  }, []);

  const loadComments = useCallback(async (int) => {
    if (!int) return;
    try {
      setLoadingComments(true);
      const { data } = await api.get("/instagram/comments", { params: { integrationId: int._id } });
      setComments(data.comments || []);
    } catch (_) {}
    finally { setLoadingComments(false); }
  }, []);

  useEffect(() => {
    if (activeInt) {
      loadConversations(activeInt);
      loadComments(activeInt);
    }
  }, [activeInt, loadConversations, loadComments]);

  // ── Open DM ────────────────────────────────────────────────────────────────

  const openChat = async (contact) => {
    setSelectedContact(contact);
    setMessages([]);
    setLeftTab("messages");
    if (!activeInt) return;
    try {
      setLoadingMsgs(true);
      const { data } = await api.get(`/instagram/messages/${contact.senderIgsid}`, {
        params: { integrationId: activeInt._id },
      });
      setMessages(data.messages || []);
    } catch (_) { toast.error("Failed to load messages"); }
    finally { setLoadingMsgs(false); }

    if (contact.unreadCount > 0) {
      try {
        await api.patch(`/instagram/messages/${contact.senderIgsid}/read`, { integrationId: activeInt?._id });
        setConversations((prev) =>
          prev.map((c) => c.senderIgsid === contact.senderIgsid ? { ...c, unreadCount: 0 } : c)
        );
      } catch (_) {}
    }
  };

  // ── Auto scroll ────────────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── File handling ──────────────────────────────────────────────────────────

  const openFilePicker = (type) => {
    fileTypeRef.current = type;
    setShowAttachMenu(false);
    fileInputRef.current.accept =
      type === "image" ? "image/*" :
      type === "video" ? "video/mp4,video/quicktime" :
      "audio/*";
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { toast.error("Max file size is 25 MB"); return; }
    setSelectedFile(file);
    setFilePreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
    e.target.value = "";
  };

  const clearFile = () => {
    if (filePreview) URL.revokeObjectURL(filePreview);
    setSelectedFile(null);
    setFilePreview(null);
  };

  // ── Send DM ────────────────────────────────────────────────────────────────

  const handleSend = async (e) => {
    e?.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !selectedContact || !activeInt || sending) return;

    setSending(true);
    const text = newMessage.trim();
    setNewMessage("");

    const optimistic = {
      _id:       `opt_${Date.now()}`,
      direction: "outbound",
      type:      selectedFile ? fileTypeRef.current : "text",
      body:      text,
      mediaUrl:  filePreview || null,
      mediaFilename: selectedFile?.name || null,
      status:    "pending",
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      let savedMsg;
      if (selectedFile) {
        const fd = new FormData();
        fd.append("file",          selectedFile);
        fd.append("integrationId", activeInt._id);
        fd.append("to",            selectedContact.senderIgsid);
        fd.append("caption",       text);
        const { data } = await api.post("/instagram/send-media", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        savedMsg = data.message;
        clearFile();
      } else {
        const { data } = await api.post("/instagram/send", {
          integrationId: activeInt._id,
          to:            selectedContact.senderIgsid,
          message:       text,
        });
        savedMsg = data.message;
      }

      setMessages((prev) =>
        prev.map((m) => m._id === optimistic._id ? { ...optimistic, ...savedMsg, status: "sent" } : m)
      );
      setConversations((prev) => {
        const updated = {
          ...selectedContact,
          lastMessage:     text || `[${fileTypeRef.current}]`,
          lastMessageType: selectedFile ? fileTypeRef.current : "text",
          lastMessageTime: new Date().toISOString(),
          lastDirection:   "outbound",
          unreadCount:     0,
        };
        return [updated, ...prev.filter((c) => c.senderIgsid !== selectedContact.senderIgsid)];
      });
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => m._id === optimistic._id ? { ...m, status: "failed" } : m)
      );
      toast.error(err.response?.data?.message || "Failed to send");
      setNewMessage(text);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Comment actions ────────────────────────────────────────────────────────

  const handleReplyComment = async (commentId) => {
    if (!replyText.trim()) return;
    try {
      await api.post(`/instagram/comments/${commentId}/reply`, {
        message:       replyText.trim(),
        integrationId: activeInt?._id,
      });
      toast.success("Reply posted");
      setReplyingTo(null);
      setReplyText("");
      setComments((prev) =>
        prev.map((c) => c.commentId === commentId ? { ...c, replied: true, replyText: replyText.trim() } : c)
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to post reply");
    }
  };

  const handleHideComment = async (commentId, currentlyHidden) => {
    try {
      await api.post(`/instagram/comments/${commentId}/hide`, {
        hidden:        !currentlyHidden,
        integrationId: activeInt?._id,
      });
      setComments((prev) =>
        prev.map((c) => c.commentId === commentId ? { ...c, isHidden: !currentlyHidden } : c)
      );
    } catch (err) {
      toast.error("Failed to update comment");
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Delete this comment? This cannot be undone.")) return;
    try {
      await api.delete(`/instagram/comments/${commentId}`, {
        data: { integrationId: activeInt?._id },
      });
      setComments((prev) => prev.filter((c) => c.commentId !== commentId));
      toast.success("Comment deleted");
    } catch (err) {
      toast.error("Failed to delete comment");
    }
  };

  const handleSyncComments = async () => {
    try {
      setSyncingComments(true);
      const { data } = await api.get("/instagram/comments/sync", { params: { integrationId: activeInt?._id } });
      toast.success(`Synced ${data.synced} comments from ${data.postsChecked} posts`);
      loadComments(activeInt);
    } catch (err) {
      toast.error("Failed to sync comments");
    } finally {
      setSyncingComments(false);
    }
  };

  // ── Filtered lists ─────────────────────────────────────────────────────────

  const filteredConvs = searchQuery
    ? conversations.filter((c) =>
        c.senderUsername?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.senderName?.toLowerCase().includes(searchQuery.toLowerCase()))
    : conversations;

  const filteredComments = searchQuery
    ? comments.filter((c) =>
        c.senderUsername?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.text?.toLowerCase().includes(searchQuery.toLowerCase()))
    : comments;

  // ── No integration guard ───────────────────────────────────────────────────

  if (loadingInts) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen text-gray-400">
        <RefreshCw size={22} className="animate-spin mr-2" /> Loading...
      </div>
    );
  }

  if (!integrations.length) {
    const connectInstagram = async () => {
      try {
        const { data } = await api.get("/instagram/auth-url");
        if (data.url) window.location.href = data.url;
      } catch {
        toast.error("Failed to start Instagram connection");
      }
    };
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-screen text-center px-4">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
             style={{ background: "linear-gradient(135deg, rgba(225,48,108,.1), rgba(131,58,180,.1))" }}>
          {IG_SVG(44, "#E1306C")}
        </div>
        <h2 className="text-slate-900 mb-2">Instagram not connected</h2>
        <p className="text-base text-slate-600 mb-5 max-w-xs">
          Connect your Instagram Business account to start receiving DMs and comments directly in the CRM
        </p>
        <button
          onClick={connectInstagram}
          className="px-5 py-2.5 rounded-xl text-white font-medium text-sm"
          style={{ background: IG_GRADIENT }}
        >
          Connect Instagram Account
        </button>
      </div>
    );
  }

  const lastInbound = [...messages].reverse().find((m) => m.direction === "inbound");
  const totalUnread = conversations.reduce((s, c) => s + (c.unreadCount || 0), 0);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex overflow-hidden bg-gray-100" style={{ height: "calc(100vh - 60px)" }}>

      {/* ══ LEFT PANEL ═════════════════════════════════════════════════════════ */}
      <div className={`w-full md:w-80 lg:w-96 flex flex-col bg-white border-r border-gray-200 shrink-0 ${selectedContact ? "hidden md:flex" : "flex"}`}>

        {/* Header */}
        <div className="px-4 pt-4 pb-2 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                 style={{ background: IG_GRADIENT }}>
              {IG_SVG(16)}
            </div>
            {integrations.length > 1 ? (
              <select
                value={activeInt?._id || ""}
                onChange={(e) => {
                  const i = integrations.find((x) => x._id === e.target.value);
                  setActiveInt(i);
                  setSelectedContact(null);
                  setMessages([]);
                }}
                className="flex-1 text-sm font-semibold text-gray-800 bg-transparent outline-none"
              >
                {integrations.map((i) => (
                  <option key={i._id} value={i._id}>@{i.username}</option>
                ))}
              </select>
            ) : (
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">
                  @{activeInt?.username || "Instagram"}
                </p>
                <p className="text-xs text-gray-400">{activeInt?.displayName}</p>
              </div>
            )}
            <button
              onClick={() => { loadConversations(activeInt); loadComments(activeInt); }}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <RefreshCw size={15} className={loadingConvs ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl bg-gray-100 p-1">
            <button
              onClick={() => { setLeftTab("messages"); setSearchQuery(""); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition ${leftTab === "messages" ? "bg-white shadow-sm text-gray-800" : "text-gray-500"}`}
            >
              <MessageSquare size={13} /> Messages
              {totalUnread > 0 && (
                <span className="min-w-[16px] h-4 rounded-full text-white text-xs flex items-center justify-center font-bold px-1"
                      style={{ background: "#E1306C" }}>
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
            </button>
            <button
              onClick={() => { setLeftTab("comments"); setSearchQuery(""); setSelectedContact(null); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition ${leftTab === "comments" ? "bg-white shadow-sm text-gray-800" : "text-gray-500"}`}
            >
              <MessageCircle size={13} /> Comments
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-1.5">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder={leftTab === "messages" ? "Search messages..." : "Search comments..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")}><X size={12} className="text-gray-400" /></button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Messages tab ── */}
          {leftTab === "messages" && (
            loadingConvs ? (
              <div className="flex items-center justify-center py-10 text-gray-400">
                <RefreshCw size={16} className="animate-spin mr-2" /> Loading...
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 px-4 text-center">
                {IG_SVG(36, "#d1d5db")}
                <p className="text-sm font-medium mt-2">
                  {searchQuery ? "No conversations found" : "No DMs yet"}
                </p>
                {!searchQuery && (
                  <p className="text-xs mt-1">Messages from your Instagram followers will appear here</p>
                )}
              </div>
            ) : (
              filteredConvs.map((conv) => {
                const active = selectedContact?.senderIgsid === conv.senderIgsid;
                return (
                  <button
                    key={conv.senderIgsid}
                    onClick={() => openChat(conv)}
                    className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition text-left ${active ? "bg-pink-50" : ""}`}
                  >
                    {conv.senderProfilePic ? (
                      <img src={conv.senderProfilePic} alt={conv.senderUsername}
                           className="w-11 h-11 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-white font-semibold text-lg"
                           style={{ background: IG_GRADIENT }}>
                        {(conv.senderUsername?.[0] || "?").toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-800 text-sm truncate">
                          @{conv.senderUsername || conv.senderIgsid}
                        </p>
                        <span className="text-xs text-gray-400 shrink-0 ml-2">{fmtTime(conv.lastMessageTime)}</span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-gray-500 truncate max-w-[170px]">
                          {conv.lastMessageType !== "text" ? `[${conv.lastMessageType}]` : conv.lastMessage}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="ml-2 shrink-0 min-w-[18px] h-[18px] rounded-full text-white text-xs font-bold flex items-center justify-center px-1"
                                style={{ background: "#E1306C" }}>
                            {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )
          )}

          {/* ── Comments tab ── */}
          {leftTab === "comments" && (
            <div>
              <div className="px-4 py-2 flex items-center justify-between border-b border-gray-100">
                <p className="text-xs text-gray-400">{filteredComments.length} comments</p>
                <button
                  onClick={handleSyncComments}
                  disabled={syncingComments}
                  className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg hover:bg-gray-100 transition"
                  style={{ color: "#E1306C" }}
                >
                  <RefreshCw size={11} className={syncingComments ? "animate-spin" : ""} /> Sync
                </button>
              </div>
              {loadingComments ? (
                <div className="flex items-center justify-center py-10 text-gray-400">
                  <RefreshCw size={16} className="animate-spin mr-2" /> Loading...
                </div>
              ) : filteredComments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400 px-4 text-center">
                  <MessageCircle size={36} className="text-gray-300 mb-2" />
                  <p className="text-sm font-medium">No comments yet</p>
                  <p className="text-xs mt-1">Click Sync to pull comments from your recent posts and ads</p>
                </div>
              ) : (
                filteredComments.map((comment) => (
                  <div key={comment.commentId}
                       className="px-4 py-3 border-b border-gray-50 hover:bg-gray-50">
                    <div className="flex items-start gap-2 mb-1">
                      <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold"
                           style={{ background: IG_GRADIENT }}>
                        {(comment.senderUsername?.[0] || "?").toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-gray-800">@{comment.senderUsername}</p>
                            {comment.isAd && (
                              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-purple-100 text-purple-600 leading-none">Ad</span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400 shrink-0 ml-2">{fmtTime(comment.igTimestamp)}</span>
                        </div>
                        <p className="text-sm text-gray-700 mt-0.5">{comment.text}</p>
                        {comment.postCaption && (
                          <p className="text-xs text-gray-400 mt-1 truncate">
                            On: {comment.postCaption.substring(0, 50)}...
                          </p>
                        )}
                        {comment.isHidden && (
                          <span className="text-xs text-amber-600 mt-1 block">Hidden</span>
                        )}
                        {comment.replied && (
                          <p className="text-xs text-green-600 mt-1">✓ Replied: {comment.replyText}</p>
                        )}
                      </div>
                    </div>
                    {/* Comment actions */}
                    <div className="flex items-center gap-1 ml-9 mt-1">
                      <button
                        onClick={() => { setReplyingTo(comment.commentId); setReplyText(""); }}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-100 transition"
                      >
                        <Reply size={11} /> Reply
                      </button>
                      <button
                        onClick={() => handleHideComment(comment.commentId, comment.isHidden)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-amber-600 px-2 py-1 rounded-lg hover:bg-amber-50 transition"
                      >
                        <EyeOff size={11} /> {comment.isHidden ? "Show" : "Hide"}
                      </button>
                      <button
                        onClick={() => handleDeleteComment(comment.commentId)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 transition"
                      >
                        <Trash2 size={11} /> Delete
                      </button>
                    </div>
                    {/* Reply input */}
                    {replyingTo === comment.commentId && (
                      <div className="ml-9 mt-2 flex items-center gap-2">
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleReplyComment(comment.commentId)}
                          placeholder="Write a reply..."
                          className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded-xl outline-none focus:border-pink-400 transition"
                          autoFocus
                        />
                        <button
                          onClick={() => handleReplyComment(comment.commentId)}
                          className="p-1.5 rounded-full text-white"
                          style={{ background: IG_GRADIENT }}
                        >
                          <Send size={12} />
                        </button>
                        <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-gray-600">
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══ RIGHT PANEL ════════════════════════════════════════════════════════ */}
      <div className={`flex-1 flex flex-col min-w-0 ${selectedContact ? "flex" : "hidden md:flex"}`}>

        {!selectedContact ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center bg-gray-50 px-4">
            <div className="w-24 h-24 rounded-full flex items-center justify-center mb-5"
                 style={{ background: "linear-gradient(135deg, rgba(225,48,108,.08), rgba(131,58,180,.08))" }}>
              {IG_SVG(48, "#E1306C")}
            </div>
            <h3 className="text-slate-700 mb-2">Instagram Inbox</h3>
            <p className="text-base text-slate-600 max-w-xs">
              Select a conversation from the Messages tab, or switch to Comments to manage post comments
            </p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shrink-0">
              <button onClick={() => setSelectedContact(null)} className="md:hidden p-1.5 text-gray-400 hover:text-gray-600">
                <ArrowLeft size={20} />
              </button>
              {selectedContact.senderProfilePic ? (
                <img src={selectedContact.senderProfilePic} alt={selectedContact.senderUsername}
                     className="w-10 h-10 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shrink-0"
                     style={{ background: IG_GRADIENT }}>
                  {(selectedContact.senderUsername?.[0] || "?").toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm">
                  @{selectedContact.senderUsername || selectedContact.senderIgsid}
                </p>
                <p className="text-xs text-gray-400">Instagram DM</p>
              </div>

              {selectedContact.leadId ? (
                <button
                  onClick={() => navigate(`/${slug}/leads/view/${selectedContact.leadId}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition shrink-0"
                >
                  <ExternalLink size={12} /> View Lead
                </button>
              ) : (
                <button
                  onClick={() => setShowCreateLead(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition shrink-0"
                  style={{ background: IG_GRADIENT }}
                >
                  <UserPlus size={12} /> Convert to Lead
                </button>
              )}

              <button
                onClick={() => openChat(selectedContact)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 shrink-0"
              >
                <RefreshCw size={15} className={loadingMsgs ? "animate-spin" : ""} />
              </button>
            </div>

            {/* 24h warning */}
            {messages.length > 0 && isOver24h(lastInbound?.createdAt) && (
              <div className="mx-4 mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-start gap-2 shrink-0">
                <AlertCircle size={12} className="shrink-0 mt-0.5" />
                <span>24-hour window closed. Instagram only allows replies within 24 hours of the user's last message.</span>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1"
                 style={{ background: "#FAFAFA" }}>
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <RefreshCw size={20} className="animate-spin mr-2" /> Loading...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm text-center">
                  <p>No messages yet.</p>
                  <p className="text-xs mt-1">You can only reply once the user sends you a message first.</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isOut = msg.direction === "outbound";
                  const showDate =
                    idx === 0 ||
                    new Date(messages[idx - 1]?.createdAt).toDateString() !==
                      new Date(msg.createdAt).toDateString();
                  return (
                    <div key={msg._id || idx}>
                      {showDate && (
                        <div className="flex justify-center my-3">
                          <span className="bg-white text-gray-400 text-xs px-3 py-0.5 rounded-full shadow-sm">
                            {new Date(msg.createdAt).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
                          </span>
                        </div>
                      )}
                      <div className={`flex mb-1 ${isOut ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-xs md:max-w-sm lg:max-w-md px-3 py-2 rounded-2xl shadow-sm ${isOut ? "rounded-tr-sm" : "rounded-tl-sm"}`}
                          style={{
                            background: isOut ? "#FDE" : "#FFFFFF",
                            border:     isOut ? "1px solid #E1306C22" : "1px solid #eee",
                            minWidth:   80,
                          }}
                        >
                          <MsgBubble msg={msg} />
                          <div className="flex items-center justify-end gap-1 mt-0.5">
                            <span className="text-xs" style={{ color: "#9aa3a3" }}>{fmtMsgTime(msg.createdAt)}</span>
                            {isOut && <StatusIcon status={msg.status} />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* File preview */}
            {selectedFile && (
              <div className="mx-4 mb-1 p-2 bg-white border border-gray-200 rounded-xl flex items-center gap-2 shrink-0">
                {filePreview
                  ? <img src={filePreview} className="w-10 h-10 rounded-lg object-cover" alt="" />
                  : <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center"><FileText size={18} className="text-gray-500" /></div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{selectedFile.name}</p>
                  <p className="text-xs text-gray-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <button onClick={clearFile} className="p-1 rounded-full hover:bg-gray-100">
                  <X size={14} className="text-gray-500" />
                </button>
              </div>
            )}

            {/* Compose */}
            <div className="p-3 bg-white border-t border-gray-200 shrink-0">
              <div className="flex items-end gap-2">
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowAttachMenu((v) => !v)}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition"
                  >
                    <Paperclip size={19} />
                  </button>
                  {showAttachMenu && (
                    <div className="absolute bottom-12 left-0 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 min-w-[150px] z-20">
                      {[
                        { label: "Image / GIF", type: "image",  icon: <Image size={15} className="text-pink-500" /> },
                        { label: "Video",        type: "video",  icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg> },
                        { label: "Audio",        type: "audio",  icon: <Mic size={15} className="text-blue-500" /> },
                      ].map(({ label, type, icon }) => (
                        <button key={type} onClick={() => openFilePicker(type)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
                          {icon} {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={selectedFile ? "Add a caption..." : "Reply to Instagram DM..."}
                  rows={1}
                  className="flex-1 px-4 py-2.5 rounded-2xl border border-gray-200 text-sm text-gray-700 placeholder-gray-400 outline-none resize-none overflow-hidden transition"
                  style={{ maxHeight: 120, minHeight: 44 }}
                  onInput={(e) => {
                    e.target.style.height = "auto";
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                  }}
                />

                <button
                  onClick={handleSend}
                  disabled={(!newMessage.trim() && !selectedFile) || sending}
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white transition disabled:opacity-40 shrink-0"
                  style={{ background: (newMessage.trim() || selectedFile) ? IG_GRADIENT : "#aaa" }}
                >
                  {sending ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1 ml-1">Enter to send · Shift+Enter for new line</p>
            </div>
          </>
        )}
      </div>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

      {/* Convert to Lead modal */}
      {showCreateLead && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreateLead(false); }}
        >
          <InstagramCreateLeadModal
            contact={selectedContact}
            onClose={() => setShowCreateLead(false)}
            onLeadCreated={(lead) => {
              setSelectedContact((prev) => ({ ...prev, leadId: lead._id, leadName: lead.leadName }));
              setConversations((prev) =>
                prev.map((c) => c.senderIgsid === selectedContact?.senderIgsid
                  ? { ...c, leadId: lead._id }
                  : c)
              );
              setShowCreateLead(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

// ── Inline Create Lead Modal ──────────────────────────────────────────────────

function InstagramCreateLeadModal({ contact, onClose, onLeadCreated }) {
  const [form, setForm] = useState({
    leadName:    contact?.senderName || contact?.senderUsername || "",
    phoneNumber: "",
    email:       "",
    companyName: "",
    requirement: "",
    source:      "Instagram",
    instagramUsername: contact?.senderUsername || "",
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.leadName.trim()) errs.leadName = "Name is required";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    try {
      setSaving(true);
      const { data } = await api.post("/leads/create", {
        leadName:          form.leadName.trim(),
        phoneNumber:       form.phoneNumber.trim() || undefined,
        email:             form.email.trim()       || undefined,
        companyName:       form.companyName.trim() || undefined,
        requirement:       form.requirement.trim() || undefined,
        source:            form.source,
        instagramUsername: form.instagramUsername.trim() || undefined,
      });
      const lead = data.lead || data;
      toast.success(`Lead "${form.leadName}" created!`);
      onLeadCreated(lead);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create lead");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
             style={{ background: IG_GRADIENT }}>
          <UserPlus size={16} className="text-white" />
        </div>
        <div>
          <h2 className="text-slate-900">Convert to Lead</h2>
          <p className="text-base text-slate-600">Create a CRM lead from this Instagram contact</p>
        </div>
        <button onClick={onClose} className="ml-auto p-1.5 rounded-full text-gray-400 hover:bg-gray-100 transition">
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium"
             style={{ background: "rgba(225,48,108,.06)", borderColor: "rgba(225,48,108,.15)", color: "#E1306C" }}>
          {IG_SVG(13, "#E1306C")}
          From Instagram · @{contact?.senderUsername}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text" name="leadName" value={form.leadName} onChange={handleChange}
            placeholder="Contact's full name"
            className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition ${errors.leadName ? "border-red-400" : "border-gray-200 focus:border-pink-400"}`}
          />
          {errors.leadName && <p className="text-xs text-red-500 mt-1">{errors.leadName}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="text" name="phoneNumber" value={form.phoneNumber} onChange={handleChange}
              placeholder="+91 98765 43210"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-pink-400 transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
            <input
              type="text" name="companyName" value={form.companyName} onChange={handleChange}
              placeholder="Company name"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-pink-400 transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email" name="email" value={form.email} onChange={handleChange}
            placeholder="email@example.com"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-pink-400 transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
          <select name="source" value={form.source} onChange={handleChange}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-pink-400 transition bg-white">
            {["Instagram", "Facebook", "WhatsApp", "Website", "Referral", "Other"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            name="requirement" value={form.requirement} onChange={handleChange}
            rows={2} placeholder="Any notes from the conversation..."
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-pink-400 transition resize-none"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
            Cancel
          </button>
          <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium transition disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: IG_GRADIENT }}>
            {saving ? <><RefreshCw size={15} className="animate-spin" /> Creating...</> : <><UserPlus size={15} /> Create Lead</>}
          </button>
        </div>
      </form>
    </div>
  );
}
