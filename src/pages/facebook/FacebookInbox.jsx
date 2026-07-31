import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { io } from "socket.io-client";
import { toast } from "react-toastify";
import {
  MessageSquare, MessageCircle, Users, Send, RefreshCw, Search,
  X, ArrowLeft, UserPlus, ExternalLink, Reply, EyeOff, Trash2,
  CheckCircle, ChevronDown,
} from "lucide-react";
import { api } from "../../services/api";

const FB_BLUE = "#1877F2";
const FB_LIGHT = "#EBF3FF";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const FBIcon = ({ size = 20, color = "white" }) => (
  <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

function fmtTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function fmtMsgTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "messenger", label: "Messenger", icon: MessageSquare },
  { id: "comments", label: "Comments", icon: MessageCircle },
  { id: "leads", label: "Leads", icon: Users },
];

export default function FacebookInbox() {
  const navigate = useNavigate();
  const { slug, token } = useSelector((s) => s.auth);
  const socketRef = useRef(null);

  const [activeTab, setActiveTab] = useState("messenger");
  const [integrations, setIntegrations] = useState([]);
  const [integrationIdx, setIntegrationIdx] = useState(0);
  const [showPagePicker, setShowPagePicker] = useState(false);
  const [loadingInt, setLoadingInt] = useState(true);
  const autoSyncedPages = useRef(new Set());
  const pickerRef = useRef(null);

  // Messenger state
  const [conversations, setConversations] = useState([]);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [searchConv, setSearchConv] = useState("");
  const messagesEndRef = useRef(null);

  // Comments state
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [syncingComments, setSyncingComments] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [searchComment, setSearchComment] = useState("");

  // Syncing flags
  const [syncingConvs, setSyncingConvs] = useState(false);

  // Leads state
  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [searchLead, setSearchLead] = useState("");
  const [leadTotal, setLeadTotal] = useState(0);

  // ── Derive active integration ────────────────────────────────────────────────
  const integration = integrations[integrationIdx] || null;

  // ── Load integrations ────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/meta/integrations");
        setIntegrations(data.data || []);
      } catch (_) { }
      finally { setLoadingInt(false); }
    })();
  }, []);

  // ── Reset data when switching pages ─────────────────────────────────────────
  useEffect(() => {
    setConversations([]);
    setSelectedConv(null);
    setMessages([]);
    setComments([]);
    setLeads([]);
  }, [integrationIdx]);

  // ── Close page picker on outside click ──────────────────────────────────────
  useEffect(() => {
    if (!showPagePicker) return;
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPagePicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPagePicker]);

  // ── Socket ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    const socket = io(BACKEND_URL, { auth: { token }, transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("facebook:message", ({ message, senderPsid }) => {
      setConversations((prev) => {
        const exists = prev.find((c) => c.senderPsid === senderPsid);
        if (exists) {
          return prev.map((c) =>
            c.senderPsid === senderPsid
              ? {
                ...c, lastMessage: message.body, lastMessageAt: message.fbTimestamp,
                lastMessageDirection: message.direction,
                unreadCount: message.direction === "inbound" ? (c.unreadCount || 0) + 1 : c.unreadCount
              }
              : c
          ).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
        }
        return [{
          senderPsid, senderName: message.senderName, senderProfilePic: message.senderProfilePic,
          lastMessage: message.body, lastMessageAt: message.fbTimestamp,
          lastMessageDirection: message.direction, unreadCount: 1
        }, ...prev];
      });

      if (selectedConv?.senderPsid === senderPsid) {
        setMessages((prev) => [...prev, message]);
      }
    });

    return () => socket.disconnect();
  }, [token]);

  // ── Scroll to bottom ────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Load conversations ──────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    if (!integration) return;
    try {
      setLoadingConvs(true);
      const { data } = await api.get("/facebook/conversations", { params: { integrationId: integration._id } });
      setConversations(data.conversations || []);
    } catch (_) { }
    finally { setLoadingConvs(false); }
  }, [integration]);

  const handleSyncConversations = async () => {
    if (!integration) return;
    try {
      setSyncingConvs(true);
      const { data } = await api.get("/facebook/conversations/sync", { params: { integrationId: integration._id } });
      toast.success(data.message || "Conversations synced");
      await loadConversations();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to sync conversations");
    } finally {
      setSyncingConvs(false);
    }
  };

  // ── Open chat ───────────────────────────────────────────────────────────────
  const openChat = async (conv) => {
    setSelectedConv(conv);
    setMessages([]);
    try {
      setLoadingMsgs(true);
      const { data } = await api.get(`/facebook/messages/${conv.senderPsid}`, { params: { integrationId: integration?._id } });
      setMessages(data.messages || []);
      setConversations((prev) =>
        prev.map((c) => c.senderPsid === conv.senderPsid ? { ...c, unreadCount: 0 } : c)
      );
    } catch (_) { }
    finally { setLoadingMsgs(false); }
  };

  // ── Send message ────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConv || sending) return;
    const text = newMessage.trim();
    setNewMessage("");
    setSending(true);

    const optimistic = {
      _id: `opt_${Date.now()}`, senderPsid: selectedConv.senderPsid,
      direction: "outbound", type: "text", body: text,
      status: "sent", fbTimestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const { data } = await api.post("/facebook/send", {
        senderPsid: selectedConv.senderPsid,
        text,
        integrationId: integration?._id,
      });
      setMessages((prev) => prev.map((m) => m._id === optimistic._id ? data.message : m));
      setConversations((prev) =>
        prev.map((c) =>
          c.senderPsid === selectedConv.senderPsid
            ? { ...c, lastMessage: text, lastMessageAt: new Date().toISOString(), lastMessageDirection: "outbound" }
            : c
        )
      );
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m._id !== optimistic._id));
      toast.error(err.response?.data?.message || "Failed to send message");
      setNewMessage(text);
    } finally {
      setSending(false);
    }
  };

  // ── Load comments ───────────────────────────────────────────────────────────
  const handleSyncComments = useCallback(async () => {
    if (!integration) return;
    try {
      setSyncingComments(true);
      const { data } = await api.get("/facebook/comments/sync", { params: { integrationId: integration._id } });
      if (data.errors?.length) {
        toast.error(`Sync error: ${data.errors[0].error}`);
        console.error("Sync errors:", data.errors);
      } else {
        toast.success(`Synced ${data.synced} comments from ${data.postsChecked} posts`);
      }
      const { data: c } = await api.get("/facebook/comments", { params: { integrationId: integration._id } });
      setComments(c.comments || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to sync comments");
    } finally {
      setSyncingComments(false);
    }
  }, [integration]);

  const loadComments = useCallback(async () => {
    if (!integration) return;
    try {
      setLoadingComments(true);
      const { data } = await api.get("/facebook/comments", { params: { integrationId: integration._id } });
      const fetched = data.comments || [];
      setComments(fetched);
      // Auto-sync once per page if no comments in DB yet
      if (fetched.length === 0 && !autoSyncedPages.current.has(integration._id)) {
        autoSyncedPages.current.add(integration._id);
        handleSyncComments();
      }
    } catch (_) { }
    finally { setLoadingComments(false); }
  }, [integration, handleSyncComments]);

  const handleReply = async (commentId) => {
    if (!replyText.trim()) return;
    try {
      await api.post(`/facebook/comments/${commentId}/reply`, {
        message: replyText.trim(),
        integrationId: integration?._id,
      });
      toast.success("Reply posted");
      setReplyingTo(null);
      setReplyText("");
      loadComments();
    } catch (err) {
      toast.error(err.response?.data?.message || "Reply failed");
    }
  };

  const handleHide = async (commentId, isHidden) => {
    try {
      await api.post(`/facebook/comments/${commentId}/hide`, {
        hidden: !isHidden, integrationId: integration?._id,
      });
      setComments((prev) => prev.map((c) => c.commentId === commentId ? { ...c, isHidden: !isHidden } : c));
    } catch (_) { toast.error("Action failed"); }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm("Delete this comment permanently?")) return;
    try {
      await api.delete(`/facebook/comments/${commentId}`, {
        data: { integrationId: integration?._id },
      });
      setComments((prev) => prev.filter((c) => c.commentId !== commentId));
    } catch (_) { toast.error("Delete failed"); }
  };

  // ── Load leads ──────────────────────────────────────────────────────────────
  const loadLeads = useCallback(async (search = "") => {
    if (!integration) return;
    try {
      setLoadingLeads(true);
      const { data } = await api.get("/facebook/leads", { params: { search } });
      setLeads(data.leads || []);
      setLeadTotal(data.total || 0);
    } catch (_) { }
    finally { setLoadingLeads(false); }
  }, [integration]);

  // ── Tab effect ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!integration) return;
    if (activeTab === "messenger") loadConversations();
    if (activeTab === "comments") loadComments();
    if (activeTab === "leads") loadLeads();
  }, [activeTab, integration]);

  const filteredConvs = conversations.filter((c) =>
    (c.senderName || "").toLowerCase().includes(searchConv.toLowerCase())
  );
  const filteredComments = comments.filter((c) =>
    c.text?.toLowerCase().includes(searchComment.toLowerCase()) ||
    c.senderName?.toLowerCase().includes(searchComment.toLowerCase())
  );

  // ── Loading / not connected ─────────────────────────────────────────────────
  if (loadingInt) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        <RefreshCw size={22} className="animate-spin mr-2" /> Loading...
      </div>
    );
  }

  if (!integrations.length) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center px-4">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5" style={{ background: FB_LIGHT }}>
          <FBIcon size={40} color={FB_BLUE} />
        </div>
        <h2 className="text-xl font-bold text-gray-700 mb-2">No Facebook Page connected</h2>
        <p className="text-gray-400 text-sm max-w-xs mb-6">
          Connect your Facebook Business Page from the Integrations page to get started.
        </p>
        <button
          onClick={() => navigate(`/${slug}/integrations`)}
          className="px-5 py-2.5 rounded-xl text-white text-sm font-medium"
          style={{ background: FB_BLUE }}
        >
          Go to Integrations
        </button>
      </div>
    );
  }

  // ── Main layout ─────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── LEFT PANEL ─────────────────────────────────────────────────────── */}
      <div className={`w-80 shrink-0 bg-white border-r border-gray-200 flex flex-col ${selectedConv && activeTab === "messenger" ? "hidden md:flex" : "flex"}`}>

        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3 mb-3 relative">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: FB_BLUE }}>
              <FBIcon size={18} />
            </div>
            <div
              className={`min-w-0 flex-1 ${integrations.length > 1 ? "cursor-pointer" : ""}`}
              onClick={() => integrations.length > 1 && setShowPagePicker((v) => !v)}
            >
              <div className="flex items-center gap-1">
                <p className="font-semibold text-gray-800 text-sm truncate">{integration.pageName}</p>
                {integrations.length > 1 && <ChevronDown size={13} className="text-gray-400 shrink-0" />}
              </div>
              <p className="text-xs text-gray-400">Facebook Page {integrations.length > 1 ? `· ${integrations.length} pages` : ""}</p>
            </div>
            {/* Page picker dropdown */}
            {showPagePicker && integrations.length > 1 && (
              <div ref={pickerRef} className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                {integrations.map((intg, idx) => (
                  <button
                    key={intg._id}
                    onMouseDown={(e) => { e.preventDefault(); setIntegrationIdx(idx); setShowPagePicker(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50 transition ${idx === integrationIdx ? "bg-blue-50" : ""}`}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: FB_BLUE }}>
                      <FBIcon size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{intg.pageName}</p>
                      {intg.instagramUsername && <p className="text-xs text-gray-400">@{intg.instagramUsername}</p>}
                    </div>
                    {idx === integrationIdx && <CheckCircle size={13} className="ml-auto shrink-0 text-blue-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => { setActiveTab(id); setSelectedConv(null); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition ${activeTab === id ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── MESSENGER TAB ──────────────────────────────────────────────────── */}
        {activeTab === "messenger" && (
          <>
            <div className="px-3 py-2 shrink-0 flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-xl flex-1">
                <Search size={13} className="text-gray-400 shrink-0" />
                <input
                  value={searchConv}
                  onChange={(e) => setSearchConv(e.target.value)}
                  placeholder="Search conversations..."
                  className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
                />
              </div>
              <button
                onClick={handleSyncConversations}
                disabled={syncingConvs}
                className="flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg hover:bg-gray-100 transition"
                style={{ color: FB_BLUE }}
              >
                <RefreshCw size={11} className={syncingConvs ? "animate-spin" : ""} /> Sync
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingConvs ? (
                <div className="flex items-center justify-center py-10 text-gray-400">
                  <RefreshCw size={16} className="animate-spin mr-2" /> Loading...
                </div>
              ) : filteredConvs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400 px-4 text-center">
                  <MessageSquare size={36} className="text-gray-300 mb-2" />
                  <p className="text-sm font-medium">No messages yet</p>
                  <p className="text-xs mt-1">Messenger DMs will appear here</p>
                </div>
              ) : (
                filteredConvs.map((conv) => (
                  <div
                    key={conv.senderPsid}
                    onClick={() => openChat(conv)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition border-b border-gray-50 ${selectedConv?.senderPsid === conv.senderPsid ? "bg-blue-50" : "hover:bg-gray-50"
                      }`}
                  >
                    <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white text-sm font-bold"
                      style={{ background: FB_BLUE }}>
                      {conv.senderProfilePic
                        ? <img src={conv.senderProfilePic} className="w-10 h-10 rounded-full object-cover" alt="" />
                        : (conv.senderName?.[0] || "?").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-800 truncate">{conv.senderName || conv.senderPsid}</p>
                        <span className="text-xs text-gray-400 shrink-0 ml-1">{fmtTime(conv.lastMessageAt)}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {conv.lastMessageDirection === "outbound" && "You: "}
                        {conv.lastMessage || "..."}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="w-5 h-5 rounded-full text-white text-xs flex items-center justify-center shrink-0 font-bold"
                        style={{ background: FB_BLUE }}>
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* ── COMMENTS TAB ───────────────────────────────────────────────────── */}
        {activeTab === "comments" && (
          <>
            <div className="px-3 py-2 shrink-0 flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-xl flex-1">
                <Search size={13} className="text-gray-400 shrink-0" />
                <input
                  value={searchComment}
                  onChange={(e) => setSearchComment(e.target.value)}
                  placeholder="Search comments..."
                  className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
                />
              </div>
              <button
                onClick={handleSyncComments}
                disabled={syncingComments}
                className="flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg hover:bg-gray-100 transition"
                style={{ color: FB_BLUE }}
              >
                <RefreshCw size={11} className={syncingComments ? "animate-spin" : ""} /> Sync
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingComments ? (
                <div className="flex items-center justify-center py-10 text-gray-400">
                  <RefreshCw size={16} className="animate-spin mr-2" /> Loading...
                </div>
              ) : filteredComments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400 px-4 text-center">
                  <MessageCircle size={36} className="text-gray-300 mb-2" />
                  <p className="text-sm font-medium">No comments yet</p>
                  <p className="text-xs mt-1">Click Sync to pull comments from your recent posts</p>
                </div>
              ) : (
                filteredComments.map((comment) => (
                  <div key={comment.commentId} className="px-4 py-3 border-b border-gray-50 hover:bg-gray-50">
                    <div className="flex items-start gap-2 mb-1">
                      <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: FB_BLUE }}>
                        {(comment.senderName?.[0] || "?").toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-800">{comment.senderName}</p>
                          <span className="text-xs text-gray-400 shrink-0 ml-2">{fmtTime(comment.fbTimestamp)}</span>
                        </div>
                        <p className="text-sm text-gray-700 mt-0.5">{comment.text}</p>
                        {comment.postMessage || comment.postMediaUrl ? (
                          <div className="flex items-center gap-2 mt-1 p-1.5 rounded-lg bg-gray-50 border border-gray-100">
                            {comment.postMediaUrl && (
                              <img src={comment.postMediaUrl} alt="" className="w-8 h-8 object-cover rounded-md" />
                            )}
                            <p className="text-xs text-gray-400 truncate flex-1">
                              On: {comment.postMessage ? comment.postMessage.substring(0, 50) + (comment.postMessage.length > 50 ? "..." : "") : "Photo Post"}
                            </p>
                          </div>
                        ) : null}
                        {comment.isHidden && <span className="text-xs text-amber-600 mt-1 block">Hidden</span>}
                        {comment.replied && <p className="text-xs text-green-600 mt-1">✓ Replied: {comment.replyText}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-9 mt-1">
                      <button
                        onClick={() => { setReplyingTo(comment.commentId); setReplyText(""); }}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-100 transition"
                      >
                        <Reply size={11} /> Reply
                      </button>
                      <button
                        onClick={() => handleHide(comment.commentId, comment.isHidden)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-amber-600 px-2 py-1 rounded-lg hover:bg-amber-50 transition"
                      >
                        <EyeOff size={11} /> {comment.isHidden ? "Show" : "Hide"}
                      </button>
                      <button
                        onClick={() => handleDelete(comment.commentId)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 transition"
                      >
                        <Trash2 size={11} /> Delete
                      </button>
                    </div>
                    {replyingTo === comment.commentId && (
                      <div className="ml-9 mt-2 flex items-center gap-2">
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleReply(comment.commentId)}
                          placeholder="Write a reply..."
                          className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded-xl outline-none transition"
                          style={{ "--tw-ring-color": FB_BLUE }}
                          autoFocus
                        />
                        <button
                          onClick={() => handleReply(comment.commentId)}
                          className="p-1.5 rounded-full text-white"
                          style={{ background: FB_BLUE }}
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
          </>
        )}

        {/* ── LEADS TAB ──────────────────────────────────────────────────────── */}
        {activeTab === "leads" && (
          <>
            <div className="px-3 py-2 shrink-0">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-xl">
                <Search size={13} className="text-gray-400 shrink-0" />
                <input
                  value={searchLead}
                  onChange={(e) => { setSearchLead(e.target.value); loadLeads(e.target.value); }}
                  placeholder="Search leads..."
                  className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
                />
              </div>
            </div>
            <div className="px-4 py-2 shrink-0">
              <p className="text-xs text-gray-400">{leadTotal} lead{leadTotal !== 1 ? "s" : ""} from Facebook & Instagram Ads</p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingLeads ? (
                <div className="flex items-center justify-center py-10 text-gray-400">
                  <RefreshCw size={16} className="animate-spin mr-2" /> Loading...
                </div>
              ) : leads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400 px-4 text-center">
                  <Users size={36} className="text-gray-300 mb-2" />
                  <p className="text-sm font-medium">No leads yet</p>
                  <p className="text-xs mt-1">Leads from Facebook & Instagram Lead Ads appear here</p>
                </div>
              ) : (
                leads.map((lead) => (
                  <div
                    key={lead._id}
                    className="flex items-center justify-between px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/${slug}/leads/view/${lead._id}`)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                        style={{ background: lead.source?.includes("Instagram") ? "linear-gradient(135deg,#E1306C,#833AB4)" : FB_BLUE }}>
                        {(lead.leadName?.[0] || "?").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{lead.leadName}</p>
                        <p className="text-xs text-gray-500 truncate">{lead.phoneNumber || lead.email}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${lead.source?.includes("Instagram") ? "bg-pink-100 text-pink-600" : "bg-blue-100 text-blue-600"
                          }`}>
                          {lead.source}
                        </span>
                      </div>
                    </div>
                    <ExternalLink size={13} className="text-gray-400 shrink-0 ml-2" />
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* ── RIGHT PANEL — Messenger chat ────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-w-0 ${activeTab !== "messenger" ? "hidden md:flex" : (selectedConv ? "flex" : "hidden md:flex")}`}>
        {!selectedConv || activeTab !== "messenger" ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center bg-gray-50 px-4">
            <div className="w-24 h-24 rounded-full flex items-center justify-center mb-5" style={{ background: FB_LIGHT }}>
              <FBIcon size={48} color={FB_BLUE} />
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">Facebook Inbox</h3>
            <p className="text-gray-400 text-sm max-w-xs">
              {activeTab === "messenger"
                ? "Select a conversation to start chatting"
                : activeTab === "comments"
                  ? "Post comments are shown in the left panel"
                  : "Leads from your Facebook & Instagram ads are shown on the left"}
            </p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shrink-0">
              <button onClick={() => setSelectedConv(null)} className="md:hidden p-1.5 text-gray-400 hover:text-gray-600">
                <ArrowLeft size={20} />
              </button>
              <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-white text-sm font-bold"
                style={{ background: FB_BLUE }}>
                {selectedConv.senderProfilePic
                  ? <img src={selectedConv.senderProfilePic} className="w-9 h-9 rounded-full object-cover" alt="" />
                  : (selectedConv.senderName?.[0] || "?").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm truncate">{selectedConv.senderName || selectedConv.senderPsid}</p>
                <p className="text-xs text-gray-400">Facebook Messenger</p>
              </div>
              {selectedConv.leadId ? (
                <button
                  onClick={() => navigate(`/${slug}/leads/view/${selectedConv.leadId}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition shrink-0"
                  style={{ color: FB_BLUE, borderColor: "#BFDBFE" }}
                >
                  <ExternalLink size={12} /> View Lead
                </button>
              ) : (
                <button
                  onClick={() => toast.info("Lead creation from Messenger coming soon")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition shrink-0"
                  style={{ background: FB_BLUE }}
                >
                  <UserPlus size={12} /> Convert to Lead
                </button>
              )}
              <button onClick={() => openChat(selectedConv)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 shrink-0">
                <RefreshCw size={15} className={loadingMsgs ? "animate-spin" : ""} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1" style={{ background: "#F0F2F5" }}>
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <RefreshCw size={20} className="animate-spin mr-2" /> Loading...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm text-center">
                  <p>No messages yet.</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isOut = msg.direction === "outbound";
                  const showDate = idx === 0 ||
                    new Date(messages[idx - 1]?.fbTimestamp).toDateString() !== new Date(msg.fbTimestamp).toDateString();
                  return (
                    <div key={msg._id || idx}>
                      {showDate && (
                        <div className="flex justify-center my-3">
                          <span className="bg-white text-gray-400 text-xs px-3 py-0.5 rounded-full shadow-sm">
                            {new Date(msg.fbTimestamp).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
                          </span>
                        </div>
                      )}
                      <div className={`flex mb-1 ${isOut ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-xs md:max-w-sm lg:max-w-md px-3 py-2 rounded-2xl shadow-sm text-sm ${isOut ? "rounded-tr-sm text-white" : "rounded-tl-sm text-gray-800 bg-white"
                            }`}
                          style={isOut ? { background: FB_BLUE } : {}}
                        >
                          {msg.type === "image" && msg.mediaUrl && (
                            <img src={msg.mediaUrl} className="rounded-lg max-w-full mb-1" alt="" />
                          )}
                          {msg.body && <p>{msg.body}</p>}
                          <div className={`flex items-center justify-end gap-1 mt-0.5 ${isOut ? "text-blue-200" : "text-gray-400"}`}>
                            <span className="text-xs">{fmtMsgTime(msg.fbTimestamp)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Compose */}
            <div className="p-3 bg-white border-t border-gray-200 shrink-0">
              <div className="flex items-end gap-2">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 px-4 py-2.5 rounded-2xl border border-gray-200 text-sm text-gray-700 placeholder-gray-400 outline-none resize-none overflow-hidden"
                  style={{ maxHeight: 120, minHeight: 44 }}
                  onInput={(e) => {
                    e.target.style.height = "auto";
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sending}
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white transition disabled:opacity-40 shrink-0"
                  style={{ background: newMessage.trim() ? FB_BLUE : "#aaa" }}
                >
                  {sending ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1 ml-1">Enter to send · Shift+Enter for new line</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
