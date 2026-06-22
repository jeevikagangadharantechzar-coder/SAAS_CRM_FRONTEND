import { useState } from "react";
import { useWhatsapp } from "../../context/WhatsappContext.jsx";
import { X, MessageCirclePlus, Send, AlertCircle } from "lucide-react";

// Auto-format phone: "9361444764" → "+919361444764"
const formatPhone = (raw = "") => {
  let num = raw.trim().replace(/[\s\-().]/g, "");
  if (num.startsWith("whatsapp:")) num = num.slice("whatsapp:".length);
  if (!num.startsWith("+")) {
    // 10-digit Indian mobile
    if (/^[6-9]\d{9}$/.test(num)) return "+91" + num;
    return "+" + num;
  }
  return num;
};

export default function NewChatModal({ onClose }) {
  const { sendText, sendTemplate, loadConversations } = useWhatsapp();
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [useTemplate, setUseTemplate] = useState(false);
  const [templateVars, setTemplateVars] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tip, setTip] = useState("");
  const [success, setSuccess] = useState("");

  const contentSid = import.meta.env.VITE_TWILIO_CONTENT_SID || "";

  const handleSend = async () => {
    setError("");
    setTip("");
    if (!phone.trim()) return setError("Phone number is required");
    if (!useTemplate && !message.trim()) return setError("Message is required");

    const formattedPhone = formatPhone(phone);

    setLoading(true);
    try {
      if (useTemplate) {
        let vars = {};
        try {
          vars = templateVars ? JSON.parse(templateVars) : {};
        } catch {
          setLoading(false);
          return setError('Template variables must be valid JSON. e.g: {"1":"John"}');
        }
        await sendTemplate(formattedPhone, contentSid, vars);
      } else {
        await sendText(formattedPhone, message.trim());
      }
      setSuccess(" Message sent successfully!");
      await loadConversations();
      setTimeout(onClose, 1200);
    } catch (err) {
      // err may contain .tip and .twilioCode from backend
      const errText = err.message || "Failed to send message";
      setError(errText);
      if (err.tip) setTip(err.tip);
      if (err.twilioCode) {
        console.error(`Twilio error code: ${err.twilioCode}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-[#075e54] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCirclePlus className="text-white w-5 h-5" />
            <h3 className="text-white font-semibold">New WhatsApp Chat</h3>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-700 text-sm font-medium">{error}</p>
                  {tip && (
                    <p className="text-red-600 text-xs mt-1 whitespace-pre-line bg-red-100/50 p-2 rounded">
                      💡 {tip}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-600 text-sm px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          {/* Phone input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+919876543210"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#075e54] focus:ring-1 focus:ring-[#075e54]"
            />
            {phone && (
              <p className="text-xs text-[#075e54] mt-1">
                Will be sent to: <strong>{formatPhone(phone)}</strong>
              </p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">
              Include country code e.g. +91 for India, or just enter 10-digit Indian number
            </p>
          </div>

          {/* Toggle template / text */}
          <div className="flex gap-3">
            <button
              onClick={() => setUseTemplate(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition border ${
                !useTemplate
                  ? "bg-[#075e54] text-white border-[#075e54]"
                  : "bg-white text-gray-600 border-gray-200 hover:border-[#075e54]"
              }`}
            >
              Text Message
            </button>
            <button
              onClick={() => setUseTemplate(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition border ${
                useTemplate
                  ? "bg-[#075e54] text-white border-[#075e54]"
                  : "bg-white text-gray-600 border-gray-200 hover:border-[#075e54]"
              }`}
            >
              Template
            </button>
          </div>

          {!useTemplate ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                rows={4}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#075e54] focus:ring-1 focus:ring-[#075e54] resize-none"
              />
              <p className="text-xs text-amber-600 mt-1">
                 Free-form texts only work within 24hrs of customer's last message. Use Template for first contact.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-700">
                <strong>Content SID:</strong>{" "}
                {contentSid || (
                  <span className="text-red-500">
                    Set VITE_TWILIO_CONTENT_SID in .env
                  </span>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Variables (JSON)
                </label>
                <textarea
                  value={templateVars}
                  onChange={(e) => setTemplateVars(e.target.value)}
                  placeholder={'{"1": "John", "2": "Tour Package"}'}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-[#075e54] focus:ring-1 focus:ring-[#075e54] resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-[#075e54] text-white text-sm font-medium hover:bg-[#064e45] transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}//original