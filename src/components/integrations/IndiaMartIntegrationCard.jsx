import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Link2, Trash2, RefreshCw, CheckCircle, AlertCircle, Key, Home } from "react-feather";
import { api } from "../../services/api";

export default function IndiaMartIntegrationCard() {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(null); // stores active integration ID during sync
  const [showForm, setShowForm] = useState(false);
  
  // Form fields
  const [companyName, setCompanyName] = useState("");
  const [apiKey, setApiKey] = useState("");

  const fetchIndiaMartIntegrations = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/indiamart/integrations");
      setIntegrations(data.data || []);
    } catch (err) {
      console.error("Fetch IndiaMART integrations error:", err);
      toast.error("Failed to load IndiaMART integrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIndiaMartIntegrations();
  }, []);

  const handleConnect = async (e) => {
    e.preventDefault();
    if (!apiKey) {
      toast.error("API Key is required");
      return;
    }

    try {
      setConnecting(true);
      const { data } = await api.post("/indiamart/connect", {
        companyName: companyName.trim() || "IndiaMART Account",
        apiKey: apiKey.trim(),
      });
      toast.success(data.message || "IndiaMART account connected!");
      setCompanyName("");
      setApiKey("");
      setShowForm(false);
      fetchIndiaMartIntegrations();
    } catch (err) {
      console.error("Connect IndiaMART error:", err);
      toast.error(err.response?.data?.message || "Failed to connect IndiaMART account");
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async (id, companyName) => {
    try {
      setSyncing(id);
      const { data } = await api.post("/indiamart/sync", { id });
      if (data.imported > 0) {
        toast.success(`✅ ${data.imported} new lead(s) synced from ${companyName}!`);
      } else {
        toast.info(`All leads already in CRM (${data.skippedDuplicates} skipped)`);
      }
      fetchIndiaMartIntegrations();
    } catch (err) {
      console.error("IndiaMART sync error:", err);
      toast.error(err.response?.data?.message || "IndiaMART manual sync failed");
    } finally {
      setSyncing(null);
    }
  };

  const handleDisconnect = async (id, companyName) => {
    if (!window.confirm(`Disconnect "${companyName}"? Leads from this IndiaMART account will stop syncing.`)) return;
    try {
      await api.post(`/indiamart/disconnect`, { id });
      toast.success(`"${companyName}" disconnected`);
      fetchIndiaMartIntegrations();
    } catch (err) {
      console.error("IndiaMART disconnect error:", err);
      toast.error("Failed to disconnect IndiaMART account");
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
      {/* Card Header */}
      <div className="flex items-center gap-4 p-5 border-b border-gray-100">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
          style={{ background: "linear-gradient(135deg, #008080, #00A6A6)" }}
        >
          <svg viewBox="0 0 24 24" fill="white" width="26" height="26">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-gray-800 text-lg">IndiaMART Leads Integration</h2>
          <p className="text-gray-500 text-sm">
            Import inquiries and product leads dynamically from IndiaMART
          </p>
        </div>
        {!showForm && integrations.length > 0 && (
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-600 text-xs font-semibold rounded-lg transition"
          >
            + Connect Key
          </button>
        )}
      </div>

      {/* Connection Area */}
      <div className="p-5">
        {showForm ? (
          <form onSubmit={handleConnect} className="space-y-4 max-w-md bg-gray-50 p-4 rounded-xl border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Connect IndiaMART Account</h3>
            
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Company/Account Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <Home size={14} />
                </span>
                <input
                  type="text"
                  placeholder="e.g. My IndiaMART Store"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">IndiaMART CRM API Key *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <Key size={14} />
                </span>
                <input
                  type="password"
                  placeholder="Enter API Key (glusr_crm_key)"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={connecting}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition"
              >
                {connecting ? "Connecting..." : "Save Key"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setCompanyName("");
                  setApiKey("");
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : loading ? (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <RefreshCw size={20} className="animate-spin mr-2" />
            Loading IndiaMART integrations...
          </div>
        ) : integrations.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Link2 size={28} className="text-teal-600" />
            </div>
            <p className="text-gray-600 font-medium mb-1">No IndiaMART accounts connected</p>
            <p className="text-gray-400 text-sm mb-5">
              Provide your IndiaMART CRM API Key to sync buyer inquiries as CRM leads
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-medium text-sm transition"
              style={{ background: "#008080" }}
            >
              <Link2 size={16} /> Connect IndiaMART Key
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
                  <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" fill="#008080" width="20" height="20">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{integration.companyName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Last Sync: {integration.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleString() : "Never"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`flex items-center gap-1 text-xs font-medium ${integration.status === "active" ? "text-green-600" : "text-gray-500"}`}>
                        <CheckCircle size={11} /> {integration.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {integration.status === "active" && (
                    <button
                      onClick={() => handleSync(integration._id, integration.companyName)}
                      disabled={syncing === integration._id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 disabled:opacity-60 text-gray-700 text-xs font-semibold rounded-lg transition"
                      title="Manually pull leads from this account"
                    >
                      <RefreshCw size={13} className={syncing === integration._id ? "animate-spin" : ""} />
                      Sync Leads
                    </button>
                  )}
                  <button
                    onClick={() => handleDisconnect(integration._id, integration.companyName)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                    title="Disconnect account"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="px-5 py-3 bg-amber-50 border-t border-amber-100 flex items-start gap-2">
        <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700">
          IndiaMART Pull API key can be generated from your Seller Dashboard under <strong>Lead Manager &gt; Import/Export Leads</strong>. Note that IndiaMART API allows manual sync up to a 7-day range.
        </p>
      </div>
    </div>
  );
}
