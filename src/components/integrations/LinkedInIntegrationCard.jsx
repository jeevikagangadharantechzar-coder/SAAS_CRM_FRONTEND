import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Link2, Trash2, RefreshCw, CheckCircle, AlertCircle } from "react-feather";
import { api } from "../../services/api";

export default function LinkedInIntegrationCard() {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(null); // stores active form URN during sync

  const fetchLinkedInIntegrations = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/linkedin/integrations");
      setIntegrations(data.data || []);
    } catch (err) {
      console.error("Fetch LinkedIn integrations error:", err);
      toast.error("Failed to load LinkedIn integrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinkedInIntegrations();
  }, []);

  const handleConnectLinkedIn = async () => {
    try {
      setConnecting(true);
      const { data } = await api.get("/linkedin/auth-url");
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (err) {
      console.error("Connect LinkedIn error:", err);
      toast.error(err.response?.data?.message || "Failed to start LinkedIn connection");
      setConnecting(false);
    }
  };

  const handleSync = async (leadFormUrn) => {
    try {
      setSyncing(leadFormUrn);
      const { data } = await api.post("/linkedin/sync-leads", { leadFormUrn });
      if (data.imported > 0) {
        toast.success(`✅ ${data.imported} new lead(s) synced from LinkedIn!`);
      } else {
        toast.info(`All leads already in CRM (${data.skippedDuplicates} skipped)`);
      }
    } catch (err) {
      console.error("LinkedIn sync error:", err);
      toast.error(err.response?.data?.message || "LinkedIn manual sync failed");
    } finally {
      setSyncing(null);
    }
  };

  const handleDisconnect = async (leadFormUrn, formName) => {
    if (!window.confirm(`Disconnect "${formName}"? Leads from this LinkedIn form will stop syncing.`)) return;
    try {
      await api.post(`/linkedin/disconnect`, { leadFormUrn });
      toast.success(`"${formName}" disconnected`);
      fetchLinkedInIntegrations();
    } catch (err) {
      console.error("LinkedIn disconnect error:", err);
      toast.error("Failed to disconnect LinkedIn form");
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
      {/* Card Header */}
      <div className="flex items-center gap-4 p-5 border-b border-gray-100">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #0077B5, #00A0DC)" }}
        >
          <svg viewBox="0 0 24 24" fill="white" width="26" height="26">
            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
          </svg>
        </div>
        <div>
          <h2 className="font-semibold text-gray-800 text-lg">LinkedIn Lead Gen Campaigns</h2>
          <p className="text-gray-500 text-sm">
            Automatically sync leads from LinkedIn Lead Gen Forms into your CRM
          </p>
        </div>
      </div>

      {/* Connected Mappings List */}
      <div className="p-5">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <RefreshCw size={20} className="animate-spin mr-2" />
            Loading LinkedIn integrations...
          </div>
        ) : integrations.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Link2 size={28} className="text-blue-500" />
            </div>
            <p className="text-gray-600 font-medium mb-1">No LinkedIn Forms connected</p>
            <p className="text-gray-400 text-sm mb-5">
              Connect your LinkedIn Ad account and forms to automatically sync leads
            </p>
            <button
              onClick={handleConnectLinkedIn}
              disabled={connecting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-medium text-sm transition disabled:opacity-60"
              style={{ background: "#0077B5" }}
            >
              {connecting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Connecting...
                </>
              ) : (
                <>
                  <Link2 size={16} /> Connect LinkedIn Account
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {integrations.map((integration) => (
              <div
                key={integration._id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" fill="#0077B5" width="20" height="20">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{integration.leadFormName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Account: {integration.adAccountName} | Org: {integration.organizationName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle size={11} /> Active
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSync(integration.leadFormUrn)}
                    disabled={syncing === integration.leadFormUrn}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 disabled:opacity-60 text-gray-700 text-xs font-semibold rounded-lg transition"
                    title="Manually pull missing leads from this form"
                  >
                    <RefreshCw size={13} className={syncing === integration.leadFormUrn ? "animate-spin" : ""} />
                    Sync
                  </button>
                  <button
                    onClick={() => handleDisconnect(integration.leadFormUrn, integration.leadFormName)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                    title="Disconnect form integration"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={handleConnectLinkedIn}
              disabled={connecting}
              className="w-full mt-2 py-2.5 border-2 border-dashed border-blue-200 rounded-xl text-blue-600 text-sm font-medium hover:border-blue-400 hover:bg-blue-50 transition disabled:opacity-60"
            >
              {connecting ? "Connecting..." : "+ Connect Another Form / Ad Account"}
            </button>
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="px-5 py-3 bg-amber-50 border-t border-amber-100 flex items-start gap-2">
        <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700">
          Leads captured from LinkedIn Lead Gen campaigns will automatically flow into the CRM. Use the **Sync** button for manual retrieval if needed.
        </p>
      </div>
    </div>
  );
}
