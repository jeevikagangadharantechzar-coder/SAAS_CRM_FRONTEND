import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  Link2, Trash2, RefreshCw, CheckCircle, AlertCircle, MessageSquare,
} from "lucide-react";
import { api } from "../../services/api";

const IG_SVG = (size = 22) => (
  <svg viewBox="0 0 24 24" fill="white" width={size} height={size}>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const IG_GRADIENT = "linear-gradient(135deg, #E1306C, #833AB4, #F77737)";

export default function InstagramIntegrationCard() {
  const navigate = useNavigate();
  const { slug } = useSelector((s) => s.auth);
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading]    = useState(true);
  const [connecting, setConnecting] = useState(false);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/instagram/integrations");
      setIntegrations(data.integrations || []);
    } catch (err) {
      console.error("Instagram fetch integrations error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIntegrations(); }, []);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      const { data } = await api.get("/instagram/auth-url");
      if (data.url) window.location.href = data.url;
    } catch (err) {
      toast.error("Failed to start Instagram connection");
      setConnecting(false);
    }
  };

  const handleDisconnect = async (id, username) => {
    if (!window.confirm(`Disconnect @${username}? You will stop receiving Instagram messages in the CRM.`)) return;
    try {
      await api.delete(`/instagram/integrations/${id}`);
      toast.success(`@${username} disconnected`);
      fetchIntegrations();
    } catch (err) {
      toast.error("Failed to disconnect");
    }
  };

  const handleRefreshToken = async (id) => {
    try {
      await api.post(`/instagram/integrations/${id}/refresh-token`);
      toast.success("Token refreshed successfully");
      fetchIntegrations();
    } catch (err) {
      toast.error("Failed to refresh token");
    }
  };

  const isExpiringSoon = (expiresAt) => {
    if (!expiresAt) return false;
    const diff = new Date(expiresAt) - Date.now();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">

      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
               style={{ background: IG_GRADIENT }}>
            {IG_SVG(26)}
          </div>
          <div>
            <h2 className="font-semibold text-gray-800 text-lg">Instagram</h2>
            <p className="text-gray-500 text-sm">DMs, post comments & story mentions — all in one inbox</p>
          </div>
        </div>
        {integrations.length > 0 && (
          <button
            onClick={() => navigate(`/${slug}/instagram`)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition"
            style={{ background: IG_GRADIENT }}
          >
            <MessageSquare size={15} /> Open Inbox
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
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                 style={{ background: "linear-gradient(135deg, rgba(225,48,108,.1), rgba(131,58,180,.1))" }}>
              {IG_SVG(32)}
            </div>
            <p className="text-gray-600 font-medium mb-1">No Instagram account connected</p>
            <p className="text-gray-400 text-sm mb-5 max-w-sm mx-auto">
              Connect your Instagram Business account to receive DMs, manage comments, and convert followers into leads
            </p>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-medium text-sm transition disabled:opacity-60"
              style={{ background: IG_GRADIENT }}
            >
              {connecting ? (
                <><RefreshCw size={16} className="animate-spin" /> Connecting...</>
              ) : (
                <><Link2 size={16} /> Connect Instagram Account</>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {integrations.map((integration) => (
              <div key={integration._id}
                   className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  {integration.profilePictureUrl ? (
                    <img
                      src={integration.profilePictureUrl}
                      alt={integration.username}
                      className="w-10 h-10 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                         style={{ background: IG_GRADIENT }}>
                      <span className="text-white font-bold">
                        {(integration.username?.[0] || "I").toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-800">@{integration.username}</p>
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
                          <button
                            onClick={() => handleRefreshToken(integration._id)}
                            className="underline ml-1 hover:no-underline"
                          >
                            Refresh
                          </button>
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
                    onClick={() => navigate(`/${slug}/instagram`)}
                    className="p-2 text-gray-400 hover:text-pink-500 hover:bg-pink-50 rounded-lg transition"
                    title="Open inbox"
                  >
                    <MessageSquare size={16} />
                  </button>
                  <button
                    onClick={() => handleDisconnect(integration._id, integration.username)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                    title="Disconnect"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full mt-2 py-2.5 border-2 border-dashed rounded-xl text-sm font-medium hover:bg-pink-50 transition disabled:opacity-60"
              style={{ borderColor: "#E1306C", color: "#E1306C" }}
            >
              {connecting ? "Connecting..." : "+ Connect Another Account"}
            </button>
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="px-5 py-3 bg-amber-50 border-t border-amber-100 flex items-start gap-2">
        <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700">
          Requires an <strong>Instagram Business or Creator account</strong> linked to a Facebook Page.
          DM replies are only possible within <strong>24 hours</strong> of the customer's last message.
        </p>
      </div>

      {/* How it works */}
      <div className="px-5 py-4 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">How it works</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { step: "1", title: "Connect Account",   desc: "Link your Instagram Business account via Meta OAuth" },
            { step: "2", title: "Receive Messages",  desc: "DMs, comments, and story mentions appear in the CRM inbox in real time" },
            { step: "3", title: "Convert to Leads",  desc: "Reply directly from the CRM and convert followers into CRM leads with one click" },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0"
                   style={{ background: IG_GRADIENT }}>
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
  );
}
