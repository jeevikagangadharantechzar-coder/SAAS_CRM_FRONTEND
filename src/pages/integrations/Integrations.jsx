import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Link2, Trash2, RefreshCw, CheckCircle, AlertCircle } from "react-feather";
import { api } from "../../services/api";
import LinkedInIntegrationCard from "../../components/integrations/LinkedInIntegrationCard.jsx";
import JustdialIntegrationCard from "../../components/integrations/JustdialIntegrationCard.jsx";
import IndiaMartIntegrationCard from "../../components/integrations/IndiaMartIntegrationCard.jsx";
import NinetyNineAcresIntegrationCard from "../../components/integrations/NinetyNineAcresIntegrationCard.jsx";
import SulekhaIntegrationCard from "../../components/integrations/SulekhaIntegrationCard.jsx";

const usePlanFeature = (key) => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user?.planFeatures?.[key] !== false;
  } catch {
    return true;
  }
};

export default function Integrations() {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [connecting, setConnecting]     = useState(false);
  const [syncing, setSyncing]           = useState(false);

  const hasFacebook  = usePlanFeature("integration_facebook");
  const hasLinkedin  = usePlanFeature("integration_linkedin");
  const hasJustdial  = usePlanFeature("integration_justdial");
  const hasIndiamart = usePlanFeature("integration_indiamart");
  const has99acres   = usePlanFeature("integration_99acres");
  const hasSulekha   = usePlanFeature("integration_sulekha");

  // ── Fetch connected pages ─────────────────────────────────────────────────
  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/meta/integrations");
      setIntegrations(data.data || []);
    } catch (err) {
      console.error("Fetch integrations error:", err);
      toast.error("Failed to load integrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasFacebook) fetchIntegrations();
    else setLoading(false);
  }, [hasFacebook]);

  // ── Connect Facebook Page ─────────────────────────────────────────────────
  const handleConnectFacebook = async () => {
    try {
      setConnecting(true);
      const { data } = await api.get("/meta/auth-url");
      if (data.authUrl) {
        // Redirect to Facebook OAuth
        window.location.href = data.authUrl;
      }
    } catch (err) {
      console.error("Connect Facebook error:", err);
      toast.error("Failed to start Facebook connection");
      setConnecting(false);
    }
  };

  // ── Sync Leads from Facebook ──────────────────────────────────────────────
  const handleSync = async () => {
    try {
      setSyncing(true);
      const { data } = await api.post("/meta/sync");
      if (data.totalCreated > 0) {
        toast.success(`✅ ${data.totalCreated} new lead(s) synced from Facebook!`);
      } else {
        toast.info(`All leads already in CRM (${data.totalSkipped} skipped)`);
      }
      if (data.errors?.length) {
        toast.warn(`Some errors: ${data.errors[0]}`);
      }
    } catch (err) {
      console.error("Sync error:", err);
      toast.error(err.response?.data?.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  // ── Disconnect Page ───────────────────────────────────────────────────────
  const handleDisconnect = async (pageId, pageName) => {
    if (!window.confirm(`Disconnect "${pageName}"? Leads from this page will stop syncing.`)) return;
    try {
      await api.delete(`/meta/integrations/${pageId}`);
      toast.success(`"${pageName}" disconnected`);
      fetchIntegrations();
    } catch (err) {
      console.error("Disconnect error:", err);
      toast.error("Failed to disconnect page");
    }
  };

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Integrations</h1>
          <p className="text-gray-500 text-sm mt-1">
            Connect your Facebook Pages to automatically capture leads from Lead Ads
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Sync Now button — only shown when pages are connected */}
          {integrations.length > 0 && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition"
              title="Pull all existing leads from Facebook now"
            >
              <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing..." : "Sync Leads"}
            </button>
          )}
          <button
            onClick={fetchIntegrations}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Facebook / Instagram Card */}
      {hasFacebook && (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">

        {/* Card Header */}
        <div className="flex items-center gap-4 p-5 border-b border-gray-100">
          {/* Facebook Icon */}
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
               style={{ background: "linear-gradient(135deg, #1877F2, #42A5F5)" }}>
            <svg viewBox="0 0 24 24" fill="white" width="26" height="26">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-gray-800 text-lg">Facebook & Instagram Leads</h2>
            <p className="text-gray-500 text-sm">
              Automatically sync leads from Facebook Lead Ads into your CRM
            </p>
          </div>
        </div>

        {/* Connected Pages List */}
        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <RefreshCw size={20} className="animate-spin mr-2" />
              Loading integrations...
            </div>
          ) : integrations.length === 0 ? (
            /* Empty state */
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Link2 size={28} className="text-blue-400" />
              </div>
              <p className="text-gray-600 font-medium mb-1">No Facebook Pages connected</p>
              <p className="text-gray-400 text-sm mb-5">
                Connect a page to start capturing leads automatically
              </p>
              <button
                onClick={handleConnectFacebook}
                disabled={connecting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-medium text-sm transition disabled:opacity-60"
                style={{ background: "#1877F2" }}
              >
                {connecting ? (
                  <><RefreshCw size={16} className="animate-spin" /> Connecting...</>
                ) : (
                  <><Link2 size={16} /> Connect Facebook Page</>
                )}
              </button>
            </div>
          ) : (
            /* Pages list */
            <div className="space-y-3">
              {integrations.map((integration) => (
                <div key={integration._id}
                     className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="#1877F2" width="20" height="20">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{integration.pageName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle size={11} /> Active
                        </span>
                        {integration.instagramUsername && (
                          <span className="text-xs text-gray-400">
                            · @{integration.instagramUsername} on Instagram
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDisconnect(integration.facebookPageId, integration.pageName)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                    title="Disconnect"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              {/* Add another page button */}
              <button
                onClick={handleConnectFacebook}
                disabled={connecting}
                className="w-full mt-2 py-2.5 border-2 border-dashed border-blue-200 rounded-xl text-blue-500 text-sm font-medium hover:border-blue-400 hover:bg-blue-50 transition disabled:opacity-60"
              >
                {connecting ? "Connecting..." : "+ Connect Another Page"}
              </button>
            </div>
          )}
        </div>

        {/* Info Footer */}
        <div className="px-5 py-3 bg-amber-50 border-t border-amber-100 flex items-start gap-2">
          <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">
            Leads captured from Facebook Lead Ads will automatically appear in your{" "}
            <strong>Leads</strong> page with source marked as <strong>Facebook</strong> or{" "}
            <strong>Instagram</strong>.
          </p>
        </div>
      </div>
      )}

      {/* LinkedIn Campaigns Card */}
      {hasLinkedin && <LinkedInIntegrationCard />}

      {/* Justdial Webhook Card */}
      {hasJustdial && <JustdialIntegrationCard />}
      {/* IndiaMART Integration Card */}
      {hasIndiamart && <IndiaMartIntegrationCard />}

      {/* 99acres Webhook Card */}
      {has99acres && <NinetyNineAcresIntegrationCard />}

      {/* Sulekha Webhook Card */}
      {hasSulekha && <SulekhaIntegrationCard />}

      {/* How it works */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-700 mb-4">How it works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { step: "1", title: "Connect Page", desc: "Link your Facebook Business Page to this CRM" },
            { step: "2", title: "Run Lead Ads", desc: "Create Lead Ad campaigns on your Facebook Page" },
            { step: "3", title: "Leads Auto-Sync", desc: "Every form submission is instantly added as a CRM lead" },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm flex items-center justify-center shrink-0">
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
