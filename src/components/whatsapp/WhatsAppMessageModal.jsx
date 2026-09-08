import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import {
  X, Send, RefreshCw, AlertCircle, Paperclip,
  Image, FileText, Mic, BookOpen, ChevronLeft
} from "lucide-react";
import { api } from "../../services/api";

// ── helpers ──────────────────────────────────────────────────────────────────

function formatTime(date) {
  if (!date) return "";
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function isOver24h(date) {
  if (!date) return true;
  return Date.now() - new Date(date).getTime() > 24 * 60 * 60 * 1000;
}

function StatusDots({ status }) {
  if (status === "read")      return <span className="text-blue-400 text-xs">✓✓</span>;
  if (status === "delivered") return <span className="text-gray-400 text-xs">✓✓</span>;
  if (status === "sent")      return <span className="text-gray-400 text-xs">✓</span>;
  if (status === "failed")    return <AlertCircle size={11} className="text-red-400" />;
  return <RefreshCw size={10} className="text-gray-300" />;
}

function BubbleBody({ msg }) {
  if (msg.mediaUrl) {
    if (msg.type === "image") {
      return (
        <div>
          <img
            src={msg.mediaUrl}
            alt="Image"
            className="rounded-lg max-w-[220px] max-h-[220px] object-cover mb-1 cursor-pointer"
            onClick={() => window.open(msg.mediaUrl, "_blank")}
          />
          {msg.body && <p className="text-sm">{msg.body}</p>}
        </div>
      );
    }
    if (msg.type === "document") {
      return (
        <a href={msg.mediaUrl} target="_blank" rel="noreferrer"
           className="flex items-center gap-2 hover:opacity-80 transition">
          <div className="p-2 bg-gray-200 rounded-lg"><FileText size={16} className="text-gray-600" /></div>
          <div>
            <p className="text-sm font-medium text-blue-600 underline">{msg.mediaFilename || "Document"}</p>
            <p className="text-xs text-gray-500">{msg.mediaMimeType || "File"}</p>
          </div>
        </a>
      );
    }
    if (msg.type === "audio") {
      return (
        <audio controls className="max-w-[200px]" src={msg.mediaUrl} />
      );
    }
    if (msg.type === "video") {
      return (
        <video controls className="rounded-lg max-w-[220px]" src={msg.mediaUrl}>
          {msg.body && <p className="text-sm mt-1">{msg.body}</p>}
        </video>
      );
    }
  }
  return <p className="text-sm whitespace-pre-wrap break-words">{msg.body || `[${msg.type}]`}</p>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WhatsAppMessageModal({ isOpen, onClose, lead, integrationId }) {
  const [integration, setIntegration]       = useState(null);
  const [messages, setMessages]             = useState([]);
  const [loading, setLoading]               = useState(false);
  const [newMessage, setNewMessage]         = useState("");
  const [sending, setSending]               = useState(false);
  const [selectedFile, setSelectedFile]     = useState(null);
  const [filePreview, setFilePreview]       = useState(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  // Template state
  const [templates, setTemplates]                 = useState([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate]   = useState(null);
  const [templateVariables, setTemplateVariables] = useState({});
  const [fetchingTemplates, setFetchingTemplates] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef   = useRef(null);
  const fileTypeRef    = useRef("document");

  const phoneNumber = lead?.phoneNumber?.replace(/\D/g, "") || "";

  // ── Fetch integration + messages ────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen || !phoneNumber) return;
    fetchIntegrationAndMessages();
  }, [isOpen, phoneNumber]);

  const fetchIntegrationAndMessages = async () => {
    try {
      setLoading(true);
      // Get active integration
      const intRes = await api.get("/whatsapp/integrations");
      const ints   = intRes.data.integrations || [];
      const int    = integrationId ? ints.find((i) => i._id === integrationId) : ints[0];
      if (!int) {
        setIntegration(null);
        return;
      }
      setIntegration(int);

      // Get messages for this contact
      const msgRes = await api.get(`/whatsapp/messages/${phoneNumber}`, {
        params: { integrationId: int._id },
      });
      setMessages(msgRes.data.messages || []);
    } catch (err) {
      console.error("WhatsApp modal fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── File handling ───────────────────────────────────────────────────────────

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
    if (file.size > 16 * 1024 * 1024) {
      toast.error("File size must be under 16 MB (WhatsApp limit)");
      return;
    }
    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      setFilePreview(URL.createObjectURL(file));
    } else {
      setFilePreview(null);
    }
    e.target.value = "";
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (filePreview) URL.revokeObjectURL(filePreview);
  };

  // ── Templates ──────────────────────────────────────────────────────────────

  const openTemplateModal = () => {
    setShowTemplateModal(true);
    if (templates.length === 0) fetchTemplates();
  };

  const fetchTemplates = async () => {
    if (!integration) return;
    try {
      setFetchingTemplates(true);
      const res = await api.get("/whatsapp/templates", { params: { integrationId: integration._id } });
      const approved = (res.data.templates || []).filter(t => t.status === "APPROVED");
      setTemplates(approved);
    } catch (err) {
      console.error("Fetch templates error:", err);
      toast.error("Failed to fetch templates.");
    } finally {
      setFetchingTemplates(false);
    }
  };

  const handleSendTemplate = async () => {
    if (!selectedTemplate || sending) return;
    setSending(true);

    const bodyComponent = selectedTemplate.components?.find(c => c.type === "BODY");
    const numVars = bodyComponent?.text?.match(/\{\{\d+\}\}/g)?.length || 0;
    
    let components = [];
    if (numVars > 0) {
      const parameters = [];
      for (let i = 1; i <= numVars; i++) {
        parameters.push({
          type: "text",
          text: templateVariables[i] || ""
        });
      }
      components.push({
        type: "body",
        parameters
      });
    }

    try {
      const { data } = await api.post("/whatsapp/send-template", {
        integrationId: integration._id,
        to: phoneNumber,
        templateName: selectedTemplate.name,
        languageCode: selectedTemplate.language,
        components
      });
      
      setMessages((prev) => [...prev, data.message]);
      setShowTemplateModal(false);
      setSelectedTemplate(null);
      setTemplateVariables({});
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to send template";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  // ── Send ─────────────────────────────────────────────────────────────────────

  const handleSend = async (e) => {
    e?.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !integration || sending) return;

    setSending(true);
    const text = newMessage.trim();
    setNewMessage("");

    try {
      let savedMsg;

      if (selectedFile) {
        const formData = new FormData();
        formData.append("file",          selectedFile);
        formData.append("integrationId", integration._id);
        formData.append("to",            phoneNumber);
        formData.append("caption",       text);
        const { data } = await api.post("/whatsapp/send-media", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        savedMsg = data.message;
        clearFile();
      } else {
        const { data } = await api.post("/whatsapp/send", {
          integrationId: integration._id,
          to:            phoneNumber,
          message:       text,
        });
        savedMsg = data.message;
      }

      setMessages((prev) => [...prev, savedMsg]);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to send message";
      toast.error(msg);
      setNewMessage(text); // restore text on failure
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Guard: no phone number ───────────────────────────────────────────────────

  if (!isOpen) return null;

  const lastInbound = [...messages].reverse().find((m) => m.direction === "inbound");
  const over24h = lastInbound ? isOver24h(lastInbound.createdAt) : false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
           style={{ height: "85vh", maxHeight: 700 }}>

        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100 shrink-0"
             style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">
            {(lead?.leadName?.[0] || "?").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white">{lead?.leadName || "Contact"}</p>
            <p className="text-green-100 text-xs">+{phoneNumber || lead?.phoneNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/80 hover:bg-white/20 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* 24h warning */}
        {over24h && messages.length > 0 && (
          <div className="mx-3 mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-start gap-2 shrink-0">
            <AlertCircle size={12} className="shrink-0 mt-0.5" />
            <span>24-hour window closed. Only <strong>approved templates</strong> can be sent now.</span>
          </div>
        )}

        {/* No integration */}
        {!loading && !integration && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <AlertCircle size={36} className="text-amber-400 mb-3" />
            <p className="font-medium text-gray-700">No WhatsApp number connected</p>
            <p className="text-sm text-gray-400 mt-1">Go to Integrations to connect a WhatsApp Business number first.</p>
          </div>
        )}

        {/* No phone number */}
        {!loading && integration && !phoneNumber && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <AlertCircle size={36} className="text-amber-400 mb-3" />
            <p className="font-medium text-gray-700">No phone number on this lead</p>
            <p className="text-sm text-gray-400 mt-1">Add a phone number to this lead to send WhatsApp messages.</p>
          </div>
        )}

        {/* Messages */}
        {integration && phoneNumber && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ background: "#ECE5DD" }}>
              {loading ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <RefreshCw size={18} className="animate-spin mr-2" /> Loading...
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
                        <div className="flex justify-center my-2">
                          <span className="bg-white text-gray-400 text-xs px-3 py-0.5 rounded-full shadow-sm">
                            {new Date(msg.createdAt).toLocaleDateString([], {
                              weekday: "short", month: "short", day: "numeric",
                            })}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[80%] px-3 py-2 rounded-2xl shadow-sm ${isOut ? "rounded-tr-sm" : "rounded-tl-sm"}`}
                          style={{ background: isOut ? "#DCF8C6" : "#FFFFFF" }}
                        >
                          <BubbleBody msg={msg} />
                          <div className="flex items-center justify-end gap-1 mt-0.5">
                            <span className="text-xs" style={{ color: "#9aa3a3" }}>
                              {formatTime(msg.createdAt)}
                            </span>
                            {isOut && <StatusDots status={msg.status} />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Template Overlay */}
            {showTemplateModal && (
              <div className="absolute inset-0 bg-white z-20 flex flex-col mt-[73px]">
                <div className="p-3 border-b border-gray-100 flex items-center gap-3 bg-gray-50 shrink-0">
                  <button onClick={() => { setShowTemplateModal(false); setSelectedTemplate(null); }}
                          className="p-1.5 rounded-full hover:bg-gray-200 transition">
                    <ChevronLeft size={18} />
                  </button>
                  <h3 className="font-semibold text-gray-800">Message Templates</h3>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                  {fetchingTemplates ? (
                    <div className="flex justify-center py-8 text-gray-400">
                      <RefreshCw className="animate-spin" size={24} />
                    </div>
                  ) : !selectedTemplate ? (
                    <div className="space-y-3">
                      {templates.length === 0 ? (
                        <p className="text-center text-gray-500 text-sm mt-4">No approved templates found in Meta.</p>
                      ) : (
                        templates.map((tpl) => (
                          <div key={tpl.name}
                               onClick={() => { setSelectedTemplate(tpl); setTemplateVariables({}); }}
                               className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:border-green-400 transition group">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-bold text-gray-800 text-sm">{tpl.name}</span>
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded uppercase">{tpl.category}</span>
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-2">
                              {tpl.components?.find(c => c.type === "BODY")?.text || "Template"}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                      <h4 className="font-bold text-gray-800 text-sm mb-3">Preview & Send</h4>
                      <div className="p-3 bg-[#DCF8C6] rounded-xl mb-4 text-sm text-gray-800">
                        {(() => {
                          const text = selectedTemplate.components?.find(c => c.type === "BODY")?.text || "";
                          let previewText = text;
                          Object.keys(templateVariables).forEach(k => {
                            previewText = previewText.replace(`{{${k}}}`, templateVariables[k] || `{{${k}}}`);
                          });
                          return <span className="whitespace-pre-wrap">{previewText}</span>;
                        })()}
                      </div>

                      {/* Variables Form */}
                      {(() => {
                        const body = selectedTemplate.components?.find(c => c.type === "BODY")?.text || "";
                        const numVars = body.match(/\{\{\d+\}\}/g)?.length || 0;
                        if (numVars > 0) {
                          return (
                            <div className="space-y-3 mb-4">
                              <p className="text-xs font-semibold text-gray-500 uppercase">Variables</p>
                              {Array.from({ length: numVars }).map((_, i) => (
                                <div key={i}>
                                  <label className="text-xs text-gray-600 mb-1 block">Value for {"{{"}{i + 1}{"}}"}</label>
                                  <input
                                    type="text"
                                    className="w-full text-sm p-2 border border-gray-200 rounded-lg outline-none focus:border-green-400"
                                    placeholder="Enter value..."
                                    value={templateVariables[i + 1] || ""}
                                    onChange={(e) => setTemplateVariables(prev => ({ ...prev, [i + 1]: e.target.value }))}
                                  />
                                </div>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      })()}

                      <button onClick={handleSendTemplate} disabled={sending}
                              className="w-full py-2.5 bg-[#25D366] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-600 transition disabled:opacity-50">
                        {sending ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                        Send Template
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* File preview */}
            {selectedFile && (
              <div className="mx-3 mb-1 p-2 bg-gray-100 rounded-xl flex items-center gap-2 shrink-0">
                {filePreview ? (
                  <img src={filePreview} className="w-10 h-10 rounded-lg object-cover" alt="" />
                ) : (
                  <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                    <FileText size={18} className="text-gray-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{selectedFile.name}</p>
                  <p className="text-xs text-gray-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <button onClick={clearFile} className="p-1 rounded-full hover:bg-gray-200 transition">
                  <X size={14} className="text-gray-500" />
                </button>
              </div>
            )}

            {/* Compose */}
            <div className="p-3 bg-white border-t border-gray-100 shrink-0">
              <div className="flex items-end gap-2">
                {/* Attachment button */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowAttachMenu((v) => !v)}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition"
                  >
                    <Paperclip size={18} />
                  </button>
                  {showAttachMenu && (
                    <div className="absolute bottom-12 left-0 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[140px] z-10">
                      <button onClick={() => openFilePicker("image")}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
                        <Image size={15} className="text-green-500" /> Image / GIF
                      </button>
                      <button onClick={() => openFilePicker("video")}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                        Video
                      </button>
                      <button onClick={() => openFilePicker("audio")}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
                        <Mic size={15} className="text-blue-500" /> Audio
                      </button>
                      <button onClick={() => openFilePicker("document")}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
                        <FileText size={15} className="text-orange-500" /> Document
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative shrink-0 ml-1">
                  <button
                    type="button"
                    onClick={openTemplateModal}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition"
                    title="Send Template"
                  >
                    <BookOpen size={18} />
                  </button>
                </div>

                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={selectedFile ? "Add a caption (optional)..." : "Type a message..."}
                  rows={1}
                  className="flex-1 px-4 py-2.5 rounded-2xl border border-gray-200 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-green-400 resize-none overflow-hidden"
                  style={{ maxHeight: 100, minHeight: 40 }}
                  onInput={(e) => {
                    e.target.style.height = "auto";
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
                  }}
                />

                <button
                  onClick={handleSend}
                  disabled={(!newMessage.trim() && !selectedFile) || sending}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white transition disabled:opacity-40 shrink-0"
                  style={{ background: (newMessage.trim() || selectedFile) ? "#25D366" : "#aaa" }}
                >
                  {sending ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
