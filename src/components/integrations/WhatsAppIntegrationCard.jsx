import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  Trash2, RefreshCw, CheckCircle, AlertCircle,
  MessageSquare, Smartphone, X, ChevronDown, ChevronUp,
} from "lucide-react";
import { api } from "../../services/api";

const WA_SVG = (size = 26, color = "white") => (
  <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export default function WhatsAppIntegrationCard() {
  const navigate = useNavigate();
  const { slug } = useSelector((s) => s.auth);
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/whatsapp/integrations");
      setIntegrations(data.integrations || []);
    } catch {
      toast.error("Failed to load WhatsApp integrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIntegrations(); }, []);

  const handleDisconnect = async (id, phone) => {
    if (!window.confirm(`Disconnect ${phone}? You will stop receiving WhatsApp messages in the CRM.`)) return;
    try {
      await api.delete(`/whatsapp/integrations/${id}`);
      toast.success(`${phone} disconnected`);
      fetchIntegrations();
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  const isExpiringSoon = (expiresAt) => {
    if (!expiresAt) return false;
    const diff = new Date(expiresAt) - Date.now();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  };

  const handleRefreshToken = async (id) => {
    try {
      await api.post(`/whatsapp/integrations/${id}/refresh-token`);
      toast.success("Token refreshed successfully");
      fetchIntegrations();
    } catch {
      toast.error("Failed to refresh token");
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">

        {/* Card Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                 style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}>
              {WA_SVG()}
            </div>
            <div>
              <h2 className="text-slate-900">WhatsApp Cloud API</h2>
              <p className="text-base text-slate-600">Send & receive WhatsApp messages directly in the CRM</p>
            </div>
          </div>
          {integrations.length > 0 && (
            <button
              onClick={() => navigate(`/${slug}/whatsapp`)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium"
              style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}
            >
              <MessageSquare size={15} /> Open Chat
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <RefreshCw size={20} className="animate-spin mr-2" /> Loading...
            </div>
          ) : integrations.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#e7fbe9" }}>
                <Smartphone size={28} style={{ color: "#25D366" }} />
              </div>
              <p className="text-gray-600 font-medium mb-1">No WhatsApp number connected</p>
              <p className="text-gray-400 text-sm mb-5 max-w-sm mx-auto">
                Enter your Meta API credentials to connect your WhatsApp Business number
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-medium text-sm"
                style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}
              >
                {WA_SVG(16)} Connect WhatsApp Number
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {integrations.map((integration) => (
                <div key={integration._id}
                     className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#e7fbe9" }}>
                      <Smartphone size={18} style={{ color: "#25D366" }} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{integration.phoneNumber}</p>
                      {integration.displayName && (
                        <p className="text-xs text-gray-500">{integration.displayName}</p>
                      )}
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle size={11} /> Active
                        </span>
                        {isExpiringSoon(integration.tokenExpiresAt) && (
                          <span className="flex items-center gap-1 text-xs text-amber-600">
                            <AlertCircle size={11} /> Token expiring soon
                            <button onClick={() => handleRefreshToken(integration._id)} className="underline ml-1">Refresh</button>
                          </span>
                        )}
                        {integration.connectedBy?.name && (
                          <span className="text-xs text-gray-400">· Connected by {integration.connectedBy.name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigate(`/${slug}/whatsapp`)}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                      title="Open chat"
                    >
                      <MessageSquare size={16} />
                    </button>
                    <button
                      onClick={() => handleDisconnect(integration._id, integration.phoneNumber)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                      title="Disconnect"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setShowModal(true)}
                className="w-full mt-2 py-2.5 border-2 border-dashed border-green-200 rounded-xl text-sm font-medium hover:border-green-400 hover:bg-green-50 transition"
                style={{ color: "#25D366" }}
              >
                + Connect Another Number
              </button>
            </div>
          )}
        </div>

        {/* Info Footer */}
        <div className="px-5 py-3 bg-amber-50 border-t border-amber-100 flex items-start gap-2">
          <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">
            Requires a <strong>WhatsApp Business Account (WABA)</strong> in Meta Business Manager.
            Replies only allowed within <strong>24 hours</strong> of the customer's last message.
          </p>
        </div>

        {/* How it works */}
        <div className="px-5 py-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">How it works</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { step: "1", title: "Enter Credentials", desc: "Paste your Phone Number ID, WABA ID and Access Token from Meta Developer Portal" },
              { step: "2", title: "Receive Messages",  desc: "Inbound WhatsApp messages appear in the CRM chat inbox in real time" },
              { step: "3", title: "Reply & Track",     desc: "Reply from the CRM and see delivery & read receipts instantly" },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0"
                     style={{ background: "#25D366" }}>
                  {step}
                </div>
                <div>
                  <p className="font-medium text-gray-700 text-sm">{title}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Connect Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <WhatsAppConnectModal
            onClose={() => setShowModal(false)}
            onConnected={() => { setShowModal(false); fetchIntegrations(); }}
          />
        </div>
      )}
    </>
  );
}

// ── Shared Connect Modal ──────────────────────────────────────────────────────

export function WhatsAppConnectModal({ onClose, onConnected }) {
  const [mode, setMode]           = useState("meta"); // "meta" | "phone-picker" | "manual"
  const [connecting, setConnecting] = useState(false);
  const [phones, setPhones]       = useState([]);
  const [oauthToken, setOauthToken] = useState(null);
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [webhookInfo, setWebhookInfo] = useState(null);
  const [copied, setCopied]       = useState("");
  const [error, setError]         = useState("");
  // manual form
  const [form, setForm]           = useState({ phoneNumberId: "", wabaId: "", accessToken: "", displayName: "" });
  const [saving, setSaving]       = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const embeddedDataRef           = useRef(null);

  // Load FB SDK once
  useEffect(() => {
    const appId = import.meta.env.VITE_META_APP_ID;
    if (!appId) return;
    window.fbAsyncInit = function () {
      window.FB.init({ appId, autoLogAppEvents: true, xfbml: false, version: "v21.0" });
    };
    if (!document.getElementById("fb-sdk")) {
      const s = document.createElement("script");
      s.id = "fb-sdk";
      s.src = "https://connect.facebook.net/en_US/sdk.js";
      s.async = true;
      document.body.appendChild(s);
    } else if (window.FB) {
      window.FB.init({ appId: import.meta.env.VITE_META_APP_ID, autoLogAppEvents: true, xfbml: false, version: "v21.0" });
    }
  }, []);

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  };

  const launchMetaConnect = () => {
    if (!window.FB) {
      setError("Facebook SDK not loaded yet. Please wait a moment and try again.");
      return;
    }
    setConnecting(true);
    setError("");
    embeddedDataRef.current = null;

    const configId = import.meta.env.VITE_META_EMBEDDED_SIGNUP_CONFIG_ID;

    // Listen for Embedded Signup session data (fires before the popup closes)
    const handleMessage = (event) => {
      if (event.origin !== "https://www.facebook.com") return;
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "WA_EMBEDDED_SIGNUP" && msg.event === "FINISH") {
          embeddedDataRef.current = {
            phoneNumberId: msg.data.phone_number_id,
            wabaId:        msg.data.waba_id,
          };
        }
      } catch { /* ignore non-JSON messages */ }
    };
    window.addEventListener("message", handleMessage);

    const loginParams = configId
      ? { config_id: configId, response_type: "code", override_default_response_type: true,
          extras: { setup: {}, featurization: { registration_id: Date.now().toString() }, sessionInfoVersion: 2 } }
      : { scope: "whatsapp_business_messaging,whatsapp_business_management" };

    window.FB.login((response) => {
      window.removeEventListener("message", handleMessage);
      if (!response.authResponse) {
        setConnecting(false);
        return;
      }
      (async () => {
        try {
          const payload = { ...(embeddedDataRef.current || {}) };
          if (response.authResponse.code) {
            payload.code = response.authResponse.code;
          } else {
            payload.userToken = response.authResponse.accessToken;
          }
          const { data } = await api.post("/whatsapp/embedded-signup", payload);
          if (data.selectPhone) {
            setPhones(data.phones);
            setOauthToken({ token: data.userToken, expiresAt: data.tokenExpiresAt });
            setSelectedPhone(data.phones[0] || null);
            setMode("phone-picker");
          } else {
            setWebhookInfo({ webhookUrl: data.webhookUrl, verifyToken: data.verifyToken });
            onConnected();
          }
        } catch (err) {
          setError(err.response?.data?.message || "Connection failed. Please try again.");
        } finally {
          setConnecting(false);
        }
      })();
    }, loginParams);
  };

  const confirmPhone = async () => {
    if (!selectedPhone || !oauthToken) return;
    try {
      setConfirming(true);
      setError("");
      const { data } = await api.post("/whatsapp/confirm", {
        userToken:      oauthToken.token,
        tokenExpiresAt: oauthToken.expiresAt,
        wabaId:         selectedPhone.wabaId,
        phoneNumberId:  selectedPhone.phoneNumberId,
        phoneNumber:    selectedPhone.phoneNumber,
        displayName:    selectedPhone.displayName,
      });
      setWebhookInfo({ webhookUrl: data.webhookUrl, verifyToken: data.verifyToken });
      onConnected();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to connect. Please try again.");
    } finally {
      setConfirming(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!form.phoneNumberId.trim() || !form.wabaId.trim() || !form.accessToken.trim()) {
      setError("Phone Number ID, WABA ID, and Access Token are required.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      const { data } = await api.post("/whatsapp/connect", {
        phoneNumberId: form.phoneNumberId.trim(),
        wabaId:        form.wabaId.trim(),
        accessToken:   form.accessToken.trim(),
        displayName:   form.displayName.trim(),
      });
      setWebhookInfo({ webhookUrl: data.webhookUrl, verifyToken: data.verifyToken });
      onConnected();
    } catch (err) {
      setError(err.response?.data?.message || "Connection failed. Please check your credentials.");
    } finally {
      setSaving(false);
    }
  };

  // ── Webhook setup screen (shown after any successful connect) ─────────────
  if (webhookInfo) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}>
            {WA_SVG(18)}
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">✓ Connected!</p>
            <h2 className="text-slate-900">One more step to receive messages</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3 px-4 py-3 bg-green-50 border border-green-100 rounded-xl">
            <CheckCircle size={18} className="text-green-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800">WhatsApp number connected successfully!</p>
              <p className="text-xs text-green-600 mt-0.5">You can now send messages. To also <strong>receive</strong> messages, set up the webhook below.</p>
            </div>
          </div>
          <div className="text-sm text-gray-700">
            <p className="font-semibold mb-2">Configure webhook in your Meta App:</p>
            <ol className="list-decimal list-inside text-xs text-gray-500 space-y-1">
              <li>Go to <strong className="text-gray-700">developers.facebook.com</strong> → your Meta App</li>
              <li>Click <strong className="text-gray-700">WhatsApp → Configuration</strong></li>
              <li>Under <strong className="text-gray-700">Webhook</strong>, click <strong className="text-gray-700">Edit</strong></li>
              <li>Paste the Callback URL and Verify Token below → <strong className="text-gray-700">Verify and Save</strong></li>
              <li>Under Webhook fields, subscribe to <strong className="text-gray-700">messages</strong></li>
            </ol>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Callback URL</label>
            <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
              <code className="flex-1 text-xs text-gray-700 break-all">{webhookInfo.webhookUrl}</code>
              <button onClick={() => copyToClipboard(webhookInfo.webhookUrl, "url")}
                      className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition"
                      style={{ background: copied === "url" ? "#25D366" : "#f3f4f6", color: copied === "url" ? "white" : "#374151" }}>
                {copied === "url" ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Verify Token</label>
            <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
              <code className="flex-1 text-xs text-gray-700 break-all">{webhookInfo.verifyToken || "(check META_WEBHOOK_VERIFY_TOKEN in .env)"}</code>
              {webhookInfo.verifyToken && (
                <button onClick={() => copyToClipboard(webhookInfo.verifyToken, "token")}
                        className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition"
                        style={{ background: copied === "token" ? "#25D366" : "#f3f4f6", color: copied === "token" ? "white" : "#374151" }}>
                  {copied === "token" ? "Copied!" : "Copy"}
                </button>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-xl">
            <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">Without this webhook, you can send messages but <strong>won't receive</strong> customer messages in the CRM.</p>
          </div>
          <button onClick={onClose} className="w-full py-2.5 rounded-xl text-white text-sm font-medium"
                  style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}>
            Done — Go to WhatsApp Inbox
          </button>
        </div>
      </div>
    );
  }

  // ── Phone picker screen (regular OAuth — pick from list) ──────────────────
  if (mode === "phone-picker") {
    return (
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}>
            {WA_SVG(18)}
          </div>
          <div className="flex-1">
            <h2 className="text-slate-900">Select WhatsApp Number</h2>
            <p className="text-base text-slate-600">Choose the number to connect to this CRM</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          {phones.map((p) => (
            <button key={p.phoneNumberId} onClick={() => setSelectedPhone(p)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition ${
                      selectedPhone?.phoneNumberId === p.phoneNumberId
                        ? "border-green-400 bg-green-50"
                        : "border-gray-100 hover:border-green-200 bg-gray-50"
                    }`}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "#e7fbe9" }}>
                <Smartphone size={16} style={{ color: "#25D366" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 text-sm">{p.phoneNumber}</p>
                <p className="text-xs text-gray-500 truncate">{p.displayName} · {p.wabaName}</p>
              </div>
              {selectedPhone?.phoneNumberId === p.phoneNumberId && (
                <CheckCircle size={18} style={{ color: "#25D366" }} className="shrink-0" />
              )}
            </button>
          ))}
          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl">
              <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button onClick={() => setMode("meta")}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
              ← Back
            </button>
            <button onClick={confirmPhone} disabled={!selectedPhone || confirming}
                    className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium transition disabled:opacity-60 flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}>
              {confirming ? <><RefreshCw size={15} className="animate-spin" /> Connecting...</> : "Connect This Number"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Manual credentials form ───────────────────────────────────────────────
  if (mode === "manual") {
    return (
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}>
            {WA_SVG(18)}
          </div>
          <div className="flex-1">
            <h2 className="text-slate-900">Enter Credentials Manually</h2>
            <p className="text-base text-slate-600">Paste your Meta API credentials</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <button type="button" onClick={() => setShowGuide((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-green-50 border border-green-100 rounded-xl text-sm font-medium text-green-700 hover:bg-green-100 transition">
            <span>Where do I find these credentials?</span>
            {showGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showGuide && (
            <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-600 space-y-2">
              <ol className="list-decimal list-inside space-y-1.5">
                <li>Go to <strong>developers.facebook.com</strong> → your Meta App</li>
                <li>Click <strong>WhatsApp → API Setup</strong></li>
                <li>Copy <strong>Phone Number ID</strong> and <strong>WABA ID</strong></li>
                <li>For the token: <strong>Meta Business Manager → System Users</strong> → generate token</li>
              </ol>
              <p className="text-amber-600 font-medium">⚠ Use a System User token — it does not expire.</p>
            </div>
          )}
          <form onSubmit={handleManualSubmit} className="space-y-4">
            {[
              { name: "phoneNumberId", label: "Phone Number ID", placeholder: "e.g. 123456789012345", mono: true },
              { name: "wabaId",        label: "WhatsApp Business Account ID (WABA ID)", placeholder: "e.g. 987654321098765", mono: true },
            ].map(({ name, label, placeholder, mono }) => (
              <div key={name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label} <span className="text-red-500">*</span></label>
                <input type="text" name={name} value={form[name]}
                       onChange={(e) => { setForm((p) => ({ ...p, [e.target.name]: e.target.value })); setError(""); }}
                       placeholder={placeholder}
                       className={`w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-400 transition ${mono ? "font-mono" : ""}`} />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Access Token <span className="text-red-500">*</span></label>
              <textarea name="accessToken" value={form.accessToken} rows={3}
                        onChange={(e) => { setForm((p) => ({ ...p, accessToken: e.target.value })); setError(""); }}
                        placeholder="EAABx..."
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-400 transition font-mono resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name <span className="text-gray-400 font-normal">(optional)</span></label>
              <input type="text" name="displayName" value={form.displayName}
                     onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
                     placeholder="e.g. Techzarinfo Support"
                     className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-400 transition" />
            </div>
            {error && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl">
                <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => { setMode("meta"); setError(""); }}
                      className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                ← Back
              </button>
              <button type="submit" disabled={saving}
                      className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium transition disabled:opacity-60 flex items-center justify-center gap-2"
                      style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}>
                {saving ? <><RefreshCw size={15} className="animate-spin" /> Verifying...</> : "Connect Number"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── Default: Meta connect screen ──────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}>
          {WA_SVG(18)}
        </div>
        <div className="flex-1">
          <h2 className="text-slate-900">Connect WhatsApp Business</h2>
          <p className="text-base text-slate-600">Sign in with Meta to connect your number</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100"><X size={18} /></button>
      </div>

      <div className="p-6 space-y-5">
        {/* What the tenant needs */}
        <div className="space-y-2">
          {[
            "A Facebook Business account (free)",
            "A WhatsApp Business Account (WABA)",
            "A verified phone number in your WABA",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2.5 text-sm text-gray-600">
              <CheckCircle size={15} style={{ color: "#25D366" }} className="shrink-0" />
              {item}
            </div>
          ))}
        </div>

        {error && (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl">
            <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Primary: Connect with Meta */}
        <button onClick={launchMetaConnect} disabled={connecting}
                className="w-full py-3 rounded-xl text-white text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2.5"
                style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}>
          {connecting
            ? <><RefreshCw size={16} className="animate-spin" /> Opening Meta...</>
            : <>{WA_SVG(18)} Connect with Meta</>}
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400">or</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        {/* Secondary: manual */}
        <button onClick={() => { setMode("manual"); setError(""); }}
                className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition">
          Enter credentials manually
        </button>

        <p className="text-center text-xs text-gray-400">
          "Connect with Meta" opens a secure Meta popup — no password shared with us
        </p>
      </div>
    </div>
  );
}
