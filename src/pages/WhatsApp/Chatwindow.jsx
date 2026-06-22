import { useEffect, useRef, useState } from "react";
import { useWhatsapp } from "../../context/WhatsappContext.jsx";
import {
  Send,
  Paperclip,
  MoreVertical,
  Phone,
  Check,
  CheckCheck,
  Image as ImageIcon,
  FileText,
  X,
  ChevronDown,
} from "lucide-react";

const formatMsgTime = (dateStr) =>
  new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const StatusIcon = ({ status }) => {
  if (status === "delivered" || status === "read")
    return <CheckCheck className={`w-3.5 h-3.5 ${status === "read" ? "text-blue-400" : "text-gray-400"}`} />;
  if (status === "sent") return <Check className="w-3.5 h-3.5 text-gray-400" />;
  if (status === "failed") return <X className="w-3.5 h-3.5 text-red-400" />;
  return <Check className="w-3.5 h-3.5 text-gray-300" />;
};

export default function ChatWindow() {
  const {
    activeConversation,
    messages,
    loadingMessages,
    sendingMessage,
    sendText,
    sendMedia,
  } = useWhatsapp();

  const [text, setText] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [mediaCaption, setMediaCaption] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (activeConversation) {
      setText("");
      inputRef.current?.focus();
    }
  }, [activeConversation]);

/* ── Handle Send Message Function ─────────────────────── */
  const handleSend = async () => {
    if (!text.trim() || !activeConversation) return;
    const msg = text.trim();
    setText("");
    await sendText(activeConversation.contactNumber, msg);
  };

/* ── Handle Send Media Function ─────────────────────── */
  const handleSendMedia = async () => {
    if (!mediaUrl.trim() || !activeConversation) return;
    await sendMedia(activeConversation.contactNumber, mediaCaption, mediaUrl.trim());
    setMediaUrl("");
    setMediaCaption("");
    setShowMediaInput(false);
  };

/* ── Handle Key Down Function ─────────────────────── */
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

/* ── Get Display Name Function ─────────────────────── */
  const displayName = () =>
    activeConversation?.contactName ||
    activeConversation?.contactNumber?.replace("whatsapp:", "") ||
    "Unknown";

  if (!activeConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] h-full">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow">
            <svg viewBox="0 0 24 24" className="w-12 h-12 text-[#075e54]" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l5.09-1.35C8.47 21.52 10.2 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.65 0-3.19-.44-4.53-1.2l-.32-.19-3.02.8.81-2.96-.21-.34A7.93 7.93 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8zm4.47-5.93c-.24-.12-1.43-.71-1.65-.79-.22-.08-.39-.12-.55.12-.16.24-.63.79-.77.95-.14.16-.29.18-.53.06-.24-.12-1.01-.37-1.92-1.19-.71-.63-1.19-1.41-1.33-1.65-.14-.24-.02-.37.1-.49.11-.11.24-.29.37-.43.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.33-.76-1.82-.2-.47-.4-.41-.55-.42h-.47c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2.01s.86 2.33.98 2.49c.12.16 1.69 2.58 4.09 3.62.57.25 1.02.4 1.37.51.57.18 1.09.16 1.5.1.46-.07 1.43-.59 1.63-1.15.2-.56.2-1.04.14-1.15-.06-.11-.22-.17-.46-.29z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-700">WhatsApp CRM</h3>
            <p className="text-gray-400 text-sm mt-1">
              Select a conversation from the left to start chatting
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#efeae2]">
      {/* Chat Header */}
      <div className="bg-[#075e54] px-4 py-3 flex items-center gap-3 shadow">
        <div className="w-10 h-10 rounded-full bg-green-400 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
          {displayName().charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <p className="text-white font-semibold text-sm">{displayName()}</p>
          <p className="text-white/70 text-xs">
            {activeConversation.contactNumber?.replace("whatsapp:", "")}
          </p>
        </div>
        <div className="flex gap-3 text-white/80">
          <button title="Call" className="hover:text-white transition">
            <Phone className="w-5 h-5" />
          </button>
          <button title="More" className="hover:text-white transition">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='400' height='400' fill='%23efeae2'/%3E%3C/svg%3E\")",
        }}
      >
        {loadingMessages && (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#075e54]" />
          </div>
        )}

        {!loadingMessages && messages.length === 0 && (
          <div className="flex justify-center py-10">
            <span className="bg-white/80 text-gray-500 text-xs px-4 py-2 rounded-full shadow-sm">
              No messages yet. Say hello! 👋
            </span>
          </div>
        )}

        {messages.map((msg, i) => {
          const isOut = msg.direction === "outbound";
          const showDate =
            i === 0 ||
            new Date(msg.createdAt).toDateString() !==
              new Date(messages[i - 1]?.createdAt).toDateString();

          return (
            <div key={msg._id || i}>
              {showDate && (
                <div className="flex justify-center my-3">
                  <span className="bg-white/80 text-gray-500 text-xs px-3 py-1 rounded-full shadow-sm">
                    {new Date(msg.createdAt).toLocaleDateString([], {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
              )}

              <div className={`flex ${isOut ? "justify-end" : "justify-start"} mb-1`}>
                <div
                  className={`max-w-[70%] rounded-lg px-3 py-2 shadow-sm relative ${
                    isOut
                      ? "bg-[#d9fdd3] rounded-br-none"
                      : "bg-white rounded-bl-none"
                  }`}
                >
                  {/* Media */}
                  {msg.mediaUrls?.map((url, idx) => (
                    <div key={idx} className="mb-2">
                      {url.match(/\.(jpg|jpeg|png|gif|webp)/i) ? (
                        <img
                          src={url}
                          alt="media"
                          className="rounded max-w-full max-h-48 object-cover"
                        />
                      ) : (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 text-blue-600 text-sm underline"
                        >
                          <FileText className="w-4 h-4" />
                          View Attachment
                        </a>
                      )}
                    </div>
                  ))}

                  {/* Text */}
                  {msg.body && (
                    <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                      {msg.body}
                    </p>
                  )}

                  {/* Time + Status */}
                  <div className={`flex items-center gap-1 mt-1 ${isOut ? "justify-end" : "justify-start"}`}>
                    <span className="text-[10px] text-gray-400">
                      {formatMsgTime(msg.createdAt)}
                    </span>
                    {isOut && <StatusIcon status={msg.status} />}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Media URL input panel */}
      {showMediaInput && (
        <div className="bg-white border-t border-gray-200 px-4 py-3 flex gap-2 items-center">
          <input
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="Paste media URL (image/document)"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#075e54]"
          />
          <input
            value={mediaCaption}
            onChange={(e) => setMediaCaption(e.target.value)}
            placeholder="Caption (optional)"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#075e54]"
          />
          <button
            onClick={handleSendMedia}
            disabled={!mediaUrl.trim()}
            className="bg-[#075e54] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 hover:bg-[#064e45] transition"
          >
            Send
          </button>
          <button
            onClick={() => setShowMediaInput(false)}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Input Bar */}
      <div className="bg-[#f0f2f5] px-4 py-3 flex items-end gap-3 border-t border-gray-200">
        <button
          onClick={() => setShowMediaInput((v) => !v)}
          className="text-gray-500 hover:text-[#075e54] transition flex-shrink-0 pb-2"
          title="Send media"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <div className="flex-1 bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message"
            rows={1}
            className="w-full px-4 py-3 text-sm focus:outline-none resize-none max-h-32 bg-transparent"
            style={{ lineHeight: "1.4" }}
          />
        </div>

        <button
          onClick={handleSend}
          disabled={!text.trim() || sendingMessage}
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition ${
            text.trim()
              ? "bg-[#075e54] text-white hover:bg-[#064e45]"
              : "bg-gray-300 text-gray-400"
          }`}
        >
          {sendingMessage ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}//original