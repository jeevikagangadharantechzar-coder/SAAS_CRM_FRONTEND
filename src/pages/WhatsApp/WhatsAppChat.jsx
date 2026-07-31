import { useState, useEffect, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import {
  Search, Send, RefreshCw, ArrowLeft, AlertCircle,
  Paperclip, Image, FileText, Mic, X, ExternalLink,
  MessageSquare, Users, UserPlus,
} from "lucide-react";
import { api } from "../../services/api";
import CreateLeadFromWhatsAppModal from "../../components/whatsapp/CreateLeadFromWhatsAppModal";
import { WhatsAppConnectModal } from "../../components/integrations/WhatsAppIntegrationCard";

// ── helpers ───────────────────────────────────────────────────────────────────

const WA_SVG = (size = 18, color = "white") => (
  <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

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
  if (status === "read")      return <span className="text-blue-400 text-xs leading-none">✓✓</span>;
  if (status === "delivered") return <span className="text-gray-400 text-xs leading-none">✓✓</span>;
  if (status === "sent")      return <span className="text-gray-400 text-xs leading-none">✓</span>;
  if (status === "failed")    return <AlertCircle size={11} className="text-red-400" />;
  return <RefreshCw size={9} className="text-gray-300 animate-spin" />;
}

function Bubble({ msg }) {
  if (msg.mediaUrl) {
    if (msg.type === "image") return (
      <div>
        <img src={msg.mediaUrl} alt="" onClick={() => window.open(msg.mediaUrl, "_blank")}
             className="rounded-xl max-w-[240px] max-h-[240px] object-cover mb-1 cursor-pointer" />
        {msg.body && <p className="text-sm">{msg.body}</p>}
      </div>
    );
    if (msg.type === "video") return (
      <video controls src={msg.mediaUrl} className="rounded-xl max-w-[240px]" />
    );
    if (msg.type === "audio") return (
      <audio controls src={msg.mediaUrl} className="max-w-[200px]" />
    );
    if (msg.type === "document") return (
      <a href={msg.mediaUrl} target="_blank" rel="noreferrer"
         className="flex items-center gap-2 hover:opacity-80">
        <div className="p-2 bg-gray-200 rounded-lg"><FileText size={16} className="text-gray-600"/></div>
        <div>
          <p className="text-sm font-medium text-blue-600 underline">{msg.mediaFilename || "Document"}</p>
          <p className="text-xs text-gray-500">{msg.mediaMimeType}</p>
        </div>
      </a>
    );
  }
  switch (msg.type) {
    case "location":
      return (
        <div className="flex items-start gap-2">
          <span className="text-red-400 mt-0.5">📍</span>
          <div>
            <p className="text-sm font-medium">{msg.location?.name || "Location"}</p>
            {msg.location?.address && <p className="text-xs text-gray-500">{msg.location.address}</p>}
          </div>
        </div>
      );
    case "reaction": return <p className="text-2xl">{msg.reaction?.emoji || "❤️"}</p>;
    case "sticker":  return <p className="text-xs text-gray-500 italic">🎨 Sticker</p>;
    default:         return <p className="text-sm whitespace-pre-wrap break-words">{msg.body || `[${msg.type}]`}</p>;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function WhatsAppChat() {
  const { slug }  = useSelector((s) => s.auth);
  const navigate  = useNavigate();
  const user      = JSON.parse(localStorage.getItem("user") || "{}");

  // Integrations
  const [integrations, setIntegrations]         = useState([]);
  const [activeInt, setActiveInt]               = useState(null);
  const [loadingInts, setLoadingInts]           = useState(true);

  // Left panel tabs: "chats" | "leads"
  const [leftTab, setLeftTab]                   = useState("chats");
  const [searchQuery, setSearchQuery]           = useState("");

  // Conversations
  const [conversations, setConversations]       = useState([]);
  const [loadingConvs, setLoadingConvs]         = useState(false);

  // Leads list
  const [leads, setLeads]                       = useState([]);
  const [loadingLeads, setLoadingLeads]         = useState(false);

  // Selected contact & messages
  const [selectedContact, setSelectedContact]   = useState(null); // { contactWaId, contactName, leadId?, leadName? }
  const [messages, setMessages]                 = useState([]);
  const [loadingMsgs, setLoadingMsgs]           = useState(false);

  // Create lead modal
  const [showCreateLead, setShowCreateLead]     = useState(false);

  // Compose
  const [newMessage, setNewMessage]             = useState("");
  const [sending, setSending]                   = useState(false);
  const [selectedFile, setSelectedFile]         = useState(null);
  const [filePreview, setFilePreview]           = useState(null);
  const [showAttachMenu, setShowAttachMenu]     = useState(false);

  const messagesEndRef  = useRef(null);
  const fileInputRef    = useRef(null);
  const fileTypeRef     = useRef("document");
  const selectedRef     = useRef(null);
  const socketRef       = useRef(null);

  selectedRef.current = selectedContact;

  // ── Socket ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user?._id) return;
    const socket = io(import.meta.env.VITE_SI_URI || "http://localhost:5000", {
      auth: { userId: user._id },
      transports: ["websocket"],
    });
    socketRef.current = socket;
    socket.emit("user_connected", user._id);

    socket.on("whatsapp:status", ({ waMessageId, status }) => {
      setMessages((prev) =>
        prev.map((m) => m.waMessageId === waMessageId ? { ...m, status } : m)
      );
    });

    socket.on("whatsapp:message", ({ message, contactWaId, contactName }) => {
      setConversations((prev) => {
        const exists = prev.find((c) => c.contactWaId === contactWaId);
        const updated = {
          contactWaId,
          contactName: contactName || contactWaId,
          lastMessage:     message.body,
          lastMessageType: message.type,
          lastMessageTime: message.createdAt || new Date().toISOString(),
          lastDirection:   "inbound",
          unreadCount:     exists
            ? (selectedRef.current?.contactWaId === contactWaId ? 0 : (exists.unreadCount || 0) + 1)
            : 1,
        };
        return [updated, ...prev.filter((c) => c.contactWaId !== contactWaId)];
      });
      if (selectedRef.current?.contactWaId === contactWaId) {
        setMessages((prev) => prev.some((m) => m._id === message._id) ? prev : [...prev, message]);
      }
    });

    return () => socket.disconnect();
  }, [user?._id]);

  // ── Data loading ──────────────────────────────────────────────────────────

  useEffect(() => { loadIntegrations(); }, []);

  const loadIntegrations = async () => {
    try {
      setLoadingInts(true);
      const { data } = await api.get("/whatsapp/integrations");
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
      const { data } = await api.get("/whatsapp/conversations", { params: { integrationId: int._id } });
      setConversations(data.conversations || []);
    } catch (err) {
      toast.error("Failed to load conversations");
    } finally { setLoadingConvs(false); }
  }, []);

  const loadLeads = async () => {
    if (leads.length) return; // already loaded
    try {
      setLoadingLeads(true);
      const { data } = await api.get("/leads", { params: { limit: 200 } });
      const all = data.leads || data.data || [];
      // only leads with a phone number
      setLeads(all.filter((l) => l.phoneNumber));
    } catch (_) {}
    finally { setLoadingLeads(false); }
  };

  useEffect(() => { if (activeInt) loadConversations(activeInt); }, [activeInt, loadConversations]);
  useEffect(() => { if (leftTab === "leads") loadLeads(); }, [leftTab]);

  // ── Select contact ────────────────────────────────────────────────────────

  const openChat = async (contact) => {
    setSelectedContact(contact);
    setMessages([]);
    if (!activeInt) return;
    try {
      setLoadingMsgs(true);
      const { data } = await api.get(`/whatsapp/messages/${contact.contactWaId}`, {
        params: { integrationId: activeInt._id },
      });
      setMessages(data.messages || []);
    } catch (_) { toast.error("Failed to load messages"); }
    finally { setLoadingMsgs(false); }

    // Mark as read
    if (contact.unreadCount > 0) {
      try {
        await api.patch(`/whatsapp/messages/${contact.contactWaId}/read`, { integrationId: activeInt?._id });
        setConversations((prev) =>
          prev.map((c) => c.contactWaId === contact.contactWaId ? { ...c, unreadCount: 0 } : c)
        );
      } catch (_) {}
    }
  };

  const openLeadChat = (lead) => {
    const waId = lead.phoneNumber.replace(/\D/g, "");
    openChat({
      contactWaId:  waId,
      contactName:  lead.leadName,
      leadId:       lead._id,
      leadName:     lead.leadName,
      companyName:  lead.companyName,
    });
    setLeftTab("chats");
  };

  // ── Auto scroll ───────────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── File handling ─────────────────────────────────────────────────────────

  const openFilePicker = (type) => {
    fileTypeRef.current = type;
    setShowAttachMenu(false);
    fileInputRef.current.accept =
      type === "image"    ? "image/*" :
      type === "video"    ? "video/mp4,video/3gpp" :
      type === "audio"    ? "audio/*" :
      ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv";
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) { toast.error("Max file size is 16 MB"); return; }
    setSelectedFile(file);
    setFilePreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
    e.target.value = "";
  };

  const clearFile = () => {
    if (filePreview) URL.revokeObjectURL(filePreview);
    setSelectedFile(null);
    setFilePreview(null);
  };

  // ── Send ──────────────────────────────────────────────────────────────────

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
        fd.append("file", selectedFile);
        fd.append("integrationId", activeInt._id);
        fd.append("to", selectedContact.contactWaId);
        fd.append("caption", text);
        const { data } = await api.post("/whatsapp/send-media", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        savedMsg = data.message;
        clearFile();
      } else {
        const { data } = await api.post("/whatsapp/send", {
          integrationId: activeInt._id,
          to:            selectedContact.contactWaId,
          message:       text,
        });
        savedMsg = data.message;
      }

      setMessages((prev) =>
        prev.map((m) => m._id === optimistic._id ? { ...optimistic, ...savedMsg, status: "sent" } : m)
      );
      // Bump conversation to top
      setConversations((prev) => {
        const updated = {
          ...selectedContact,
          lastMessage:     text || `[${fileTypeRef.current}]`,
          lastMessageType: selectedFile ? fileTypeRef.current : "text",
          lastMessageTime: new Date().toISOString(),
          lastDirection:   "outbound",
          unreadCount:     0,
        };
        return [updated, ...prev.filter((c) => c.contactWaId !== selectedContact.contactWaId)];
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

  // ── Filtered lists ────────────────────────────────────────────────────────

  const filteredConvs = searchQuery
    ? conversations.filter((c) =>
        c.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.contactWaId?.includes(searchQuery))
    : conversations;

  const filteredLeads = searchQuery
    ? leads.filter((l) =>
        l.leadName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.phoneNumber?.includes(searchQuery) ||
        l.companyName?.toLowerCase().includes(searchQuery.toLowerCase()))
    : leads;

  // ── No integration guard ──────────────────────────────────────────────────

  if (loadingInts) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen text-gray-400">
        <RefreshCw size={22} className="animate-spin mr-2" /> Loading...
      </div>
    );
  }

  if (!integrations.length) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <WhatsAppConnectModal onClose={() => {}} onConnected={loadIntegrations} />
      </div>
    );
  }

  const lastInbound = [...messages].reverse().find((m) => m.direction === "inbound");

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex overflow-hidden bg-gray-100" style={{ height: "calc(100vh - 60px)" }}>

      {/* ══ LEFT PANEL ════════════════════════════════════════════════════════ */}
      <div className={`w-full md:w-80 lg:w-96 flex flex-col bg-white border-r border-gray-200 shrink-0 ${selectedContact ? "hidden md:flex" : "flex"}`}>

        {/* Header */}
        <div className="px-4 pt-4 pb-2 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                 style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}>
              {WA_SVG(16)}
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
                  <option key={i._id} value={i._id}>
                    {i.displayName ? `${i.displayName} (${i.phoneNumber})` : i.phoneNumber}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">{activeInt?.displayName || "WhatsApp"}</p>
                <p className="text-xs text-gray-400">{activeInt?.phoneNumber}</p>
              </div>
            )}
            <button onClick={() => loadConversations(activeInt)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <RefreshCw size={15} className={loadingConvs ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl bg-gray-100 p-1">
            <button
              onClick={() => { setLeftTab("chats"); setSearchQuery(""); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition ${leftTab === "chats" ? "bg-white shadow-sm text-gray-800" : "text-gray-500"}`}
            >
              <MessageSquare size={13} /> Chats
              {conversations.reduce((s, c) => s + (c.unreadCount || 0), 0) > 0 && (
                <span className="w-4 h-4 rounded-full text-white text-[10px] flex items-center justify-center font-bold"
                      style={{ background: "#25D366" }}>
                  {conversations.reduce((s, c) => s + (c.unreadCount || 0), 0)}
                </span>
              )}
            </button>
            <button
              onClick={() => { setLeftTab("leads"); setSearchQuery(""); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition ${leftTab === "leads" ? "bg-white shadow-sm text-gray-800" : "text-gray-500"}`}
            >
              <Users size={13} /> Leads & Deals
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-1.5">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder={leftTab === "chats" ? "Search chats..." : "Search leads..."}
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
          {/* ── Chats tab ── */}
          {leftTab === "chats" && (
            loadingConvs ? (
              <div className="flex items-center justify-center py-10 text-gray-400">
                <RefreshCw size={16} className="animate-spin mr-2" /> Loading...
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 px-4 text-center">
                {WA_SVG(36, "#d1d5db")}
                <p className="text-sm font-medium mt-2">
                  {searchQuery ? "No chats found" : "No conversations yet"}
                </p>
                {!searchQuery && (
                  <p className="text-xs mt-1">Switch to the Leads tab to start a new chat</p>
                )}
              </div>
            ) : (
              filteredConvs.map((conv) => {
                const active = selectedContact?.contactWaId === conv.contactWaId;
                return (
                  <button
                    key={conv.contactWaId}
                    onClick={() => openChat(conv)}
                    className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition text-left ${active ? "bg-green-50" : ""}`}
                  >
                    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-white font-semibold text-lg"
                         style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}>
                      {(conv.contactName?.[0] || "?").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-800 text-sm truncate">{conv.contactName || `+${conv.contactWaId}`}</p>
                        <span className="text-xs text-gray-400 shrink-0 ml-2">{fmtTime(conv.lastMessageTime)}</span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-gray-500 truncate max-w-[170px]">
                          {conv.lastMessageType !== "text" ? `[${conv.lastMessageType}]` : conv.lastMessage}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="ml-2 shrink-0 min-w-[18px] h-[18px] rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1"
                                style={{ background: "#25D366" }}>
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

          {/* ── Leads tab ── */}
          {leftTab === "leads" && (
            loadingLeads ? (
              <div className="flex items-center justify-center py-10 text-gray-400">
                <RefreshCw size={16} className="animate-spin mr-2" /> Loading leads...
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 px-4 text-center">
                <Users size={36} className="text-gray-300 mb-2" />
                <p className="text-sm font-medium">
                  {searchQuery ? "No leads match your search" : "No leads with phone numbers"}
                </p>
              </div>
            ) : (
              filteredLeads.map((lead) => (
                <button
                  key={lead._id}
                  onClick={() => openLeadChat(lead)}
                  className="w-full flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-blue-600 font-semibold">
                    {(lead.leadName?.[0] || "?").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">{lead.leadName}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {lead.phoneNumber}
                      {lead.companyName && ` · ${lead.companyName}`}
                    </p>
                  </div>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                       style={{ background: "#e7fbe9" }}>
                    {WA_SVG(14, "#25D366")}
                  </div>
                </button>
              ))
            )
          )}
        </div>
      </div>

      {/* ══ RIGHT PANEL ═══════════════════════════════════════════════════════ */}
      <div className={`flex-1 flex flex-col min-w-0 ${selectedContact ? "flex" : "hidden md:flex"}`}>

        {/* No contact selected */}
        {!selectedContact ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center bg-gray-50 px-4">
            <div className="w-24 h-24 rounded-full flex items-center justify-center mb-5" style={{ background: "#e7fbe9" }}>
              {WA_SVG(48, "#25D366")}
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">WhatsApp Messages</h3>
            <p className="text-gray-400 text-sm max-w-xs">
              Select a conversation from the Chats tab or pick a lead from the Leads tab
            </p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shrink-0">
              <button onClick={() => setSelectedContact(null)} className="md:hidden p-1.5 text-gray-400 hover:text-gray-600">
                <ArrowLeft size={20} />
              </button>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shrink-0"
                   style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}>
                {(selectedContact.contactName?.[0] || "?").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm">
                  {selectedContact.contactName || `+${selectedContact.contactWaId}`}
                </p>
                <p className="text-xs text-gray-400">
                  +{selectedContact.contactWaId}
                  {selectedContact.companyName && ` · ${selectedContact.companyName}`}
                </p>
              </div>
              {selectedContact.leadId ? (
                /* Already a lead — show View Lead */
                <button
                  onClick={() => navigate(`/${slug}/leads/view/${selectedContact.leadId}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition shrink-0"
                >
                  <ExternalLink size={12} /> View Lead
                </button>
              ) : (
                /* Not yet a lead — let agent convert */
                <button
                  onClick={() => setShowCreateLead(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition shrink-0"
                  style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}
                >
                  <UserPlus size={12} /> Convert to Lead
                </button>
              )}
              <button onClick={() => openChat(selectedContact)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 shrink-0">
                <RefreshCw size={15} className={loadingMsgs ? "animate-spin" : ""} />
              </button>
            </div>

            {/* 24-hour warning */}
            {messages.length > 0 && isOver24h(lastInbound?.createdAt) && (
              <div className="mx-4 mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-start gap-2 shrink-0">
                <AlertCircle size={12} className="shrink-0 mt-0.5" />
                <span>24-hour window closed. Only <strong>approved templates</strong> can re-open the conversation.</span>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1" style={{ background: "#ECE5DD" }}>
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <RefreshCw size={20} className="animate-spin mr-2" /> Loading...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm text-center">
                  <p>No messages yet.</p>
                  <p className="text-xs mt-1">Send a message to start the conversation.</p>
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
                          className={`max-w-xs md:max-w-sm lg:max-w-md xl:max-w-lg px-3 py-2 rounded-2xl shadow-sm ${isOut ? "rounded-tr-sm" : "rounded-tl-sm"}`}
                          style={{ background: isOut ? "#DCF8C6" : "#FFFFFF", minWidth: 80 }}
                        >
                          <Bubble msg={msg} />
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

            {/* File preview strip */}
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

                {/* Attach button */}
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
                        { label: "Image / GIF",  type: "image",    icon: <Image size={15} className="text-green-500" /> },
                        { label: "Video",         type: "video",    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg> },
                        { label: "Audio",         type: "audio",    icon: <Mic size={15} className="text-blue-500" /> },
                        { label: "Document",      type: "document", icon: <FileText size={15} className="text-orange-500" /> },
                      ].map(({ label, type, icon }) => (
                        <button key={type} onClick={() => openFilePicker(type)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
                          {icon} {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Text input */}
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={selectedFile ? "Add a caption..." : "Type a message..."}
                  rows={1}
                  className="flex-1 px-4 py-2.5 rounded-2xl border border-gray-200 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-green-400 resize-none overflow-hidden"
                  style={{ maxHeight: 120, minHeight: 44 }}
                  onInput={(e) => {
                    e.target.style.height = "auto";
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                  }}
                />

                {/* Send */}
                <button
                  onClick={handleSend}
                  disabled={(!newMessage.trim() && !selectedFile) || sending}
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white transition disabled:opacity-40 shrink-0"
                  style={{ background: (newMessage.trim() || selectedFile) ? "#25D366" : "#aaa" }}
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
        <CreateLeadFromWhatsAppModal
          isOpen={showCreateLead}
          onClose={() => setShowCreateLead(false)}
          contact={selectedContact}
          onLeadCreated={(lead) => {
            // Link the conversation to the newly created lead
            setSelectedContact((prev) => ({
              ...prev,
              leadId:      lead._id,
              leadName:    lead.leadName,
              contactName: lead.leadName,
            }));
            // Update conversation list name too
            setConversations((prev) =>
              prev.map((c) =>
                c.contactWaId === selectedContact?.contactWaId
                  ? { ...c, contactName: lead.leadName, leadId: lead._id }
                  : c
              )
            );
          }}
        />
      )}
    </div>
  );
}

// WhatsAppConnectForm removed — WhatsAppConnectModal from integrations card is used instead
