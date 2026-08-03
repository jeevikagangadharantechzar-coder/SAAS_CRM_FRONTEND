import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Link2, Trash2, RefreshCw, CheckCircle, AlertCircle, MessageSquare } from "lucide-react";
import { api } from "../../services/api";

const FB_BLUE = "#1877F2";

const FBIcon = ({ size = 22 }) => (
  <svg viewBox="0 0 24 24" fill="white" width={size} height={size}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

export default function FacebookIntegrationCard() {
  const navigate = useNavigate();
  const { slug } = useSelector((s) => s.auth);
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [connecting, setConnecting]     = useState(false);
  const [syncing, setSyncing]           = useState(false);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/meta/integrations");
      setIntegrations(data.data || []);
    } catch (err) {
      console.error("Facebook fetch integrations error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIntegrations(); }, []);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      const { data } = await api.get("/meta/auth-url");
      if (data.authUrl) window.location.href = data.authUrl;
    } catch (err) {
      toast.error("Failed to start Facebook connection");
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const { data } = await api.post("/meta/sync");
      if (data.totalCreated > 0) {
        toast.success(`${data.totalCreated} new lead(s) synced from Facebook!`);
      } else {
        toast.info(`All leads already in CRM (${data.totalSkipped} skipped)`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async (pageId, pageName) => {
    if (!window.confirm(`Disconnect "${pageName}"? Leads from this page will stop syncing.`)) return;
    try {
      await api.delete(`/meta/integrations/${pageId}`);
      toast.success(`"${pageName}" disconnected`);
      fetchIntegrations();
    } catch (err) {
      toast.error("Failed to disconnect page");
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">

      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: FB_BLUE }}>
            <FBIcon size={26} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-800 text-lg">Facebook</h2>
            <p className="text-gray-500 text-sm">Messenger inbox, post comments & lead ads — all in one place</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {integrations.length > 0 && (
            <>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition disabled:opacity-60"
              >
                <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
                {syncing ? "Syncing..." : "Sync Leads"}
              </button>
              <button
                onClick={() => navigate(`/${slug}/facebook`)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition"
                style={{ background: FB_BLUE }}
              >
                <MessageSquare size={15} /> Open Inbox
              </button>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <RefreshCw size={20} className="animate-spin mr-2" /> Loading...
          </div>
        ) : integrations.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#EBF3FF" }}>
              <FBIcon size={32} />
            </div>
            <p className="text-gray-600 font-medium mb-1">No Facebook Page connected</p>
            <p className="text-gray-400 text-sm mb-5 max-w-sm mx-auto">
              Connect your Facebook Business Page to receive Messenger DMs, manage post comments, and capture leads from Lead Ads
            </p>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-medium text-sm transition disabled:opacity-60"
              style={{ background: FB_BLUE }}
            >
              {connecting
                ? <><RefreshCw size={16} className="animate-spin" /> Connecting...</>
                : <><Link2 size={16} /> Connect Facebook Page</>}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {integrations.map((integration) => (
              <div key={integration._id}
                   className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "#EBF3FF" }}>
                    <svg viewBox="0 0 24 24" fill={FB_BLUE} width="20" height="20">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{integration.pageName}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle size={11} /> Active
                      </span>
                      {integration.instagramUsername && (
                        <span className="text-xs text-gray-400">· @{integration.instagramUsername} on Instagram</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => navigate(`/${slug}/facebook`)}
                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
                    title="Open inbox"
                  >
                    <MessageSquare size={16} />
                  </button>
                  <button
                    onClick={() => handleDisconnect(integration.facebookPageId, integration.pageName)}
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
              className="w-full mt-2 py-2.5 border-2 border-dashed rounded-xl text-sm font-medium hover:bg-blue-50 transition disabled:opacity-60"
              style={{ borderColor: FB_BLUE, color: FB_BLUE }}
            >
              {connecting ? "Connecting..." : "+ Connect Another Page"}
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-amber-50 border-t border-amber-100 flex items-start gap-2">
        <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700">
          Messenger replies require <strong>pages_messaging</strong> approval from Meta.
          Lead Ads auto-capture works as soon as you connect your page.
        </p>
      </div>

      {/* How it works */}
      <div className="px-5 py-4 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">How it works</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { step: "1", title: "Connect Page",     desc: "Link your Facebook Business Page via Meta OAuth" },
            { step: "2", title: "Receive Messages", desc: "Messenger DMs and post comments appear in the CRM inbox in real time" },
            { step: "3", title: "Capture Leads",    desc: "Lead Ad submissions are instantly added as CRM leads" },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0"
                   style={{ background: FB_BLUE }}>
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
