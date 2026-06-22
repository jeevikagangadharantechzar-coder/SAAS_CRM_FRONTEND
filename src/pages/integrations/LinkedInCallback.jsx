import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { CheckCircle, AlertCircle, RefreshCw, Layers } from "react-feather";
import { api } from "../../services/api";

export default function LinkedInCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const handleBackToIntegrations = () => {
    const slug = localStorage.getItem("tenantSlug") || "";
    navigate(slug ? `/${slug}/integrations` : "/");
  };
  const [status, setStatus] = useState("processing"); // processing | select-org | select-ad | select-form | success | error
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);

  // Data loaded from LinkedIn
  const [memberId, setMemberId] = useState("");
  const [accessTokenEncrypted, setAccessTokenEncrypted] = useState("");
  const [refreshTokenEncrypted, setRefreshTokenEncrypted] = useState("");
  const [expiresIn, setExpiresIn] = useState(null);

  const [organizations, setOrganizations] = useState([]);
  const [adAccounts, setAdAccounts] = useState([]);
  const [leadForms, setLeadForms] = useState([]);

  // Selections
  const [selectedOrg, setSelectedOrg] = useState(null); // { urn, name }
  const [selectedAd, setSelectedAd] = useState(null);   // { urn, name }
  const [selectedForm, setSelectedForm] = useState(null); // { urn, name }

  // Manual Input form states
  const [manualOrgName, setManualOrgName] = useState("LinkedIn Organization");
  const [manualOrgUrn, setManualOrgUrn] = useState("");
  const [manualAdName, setManualAdName] = useState("LinkedIn Ad Account");
  const [manualAdUrn, setManualAdUrn] = useState("");
  const [manualFormName, setManualFormName] = useState("LinkedIn Lead Form");
  const [manualFormUrn, setManualFormUrn] = useState("");

  const hasCalled = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error") || params.get("error_description");

    console.log("LinkedIn OAuth Callback query params:", {
      code,
      state,
      error,
      fullSearch: window.location.search,
      fullHref: window.location.href
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error);
      return;
    }

    if (!code || !state) {
      setStatus("error");
      setErrorMsg("Missing authorization code or state. Please try again.");
      return;
    }

    // Use sessionStorage to prevent double call on unmount/remount (React StrictMode)
    const sessionKey = `linkedin_exchanged_${code}`;
    if (sessionStorage.getItem(sessionKey)) {
      console.log("LinkedIn code already exchanged or in progress, skipping duplicate call.");
      return;
    }
    sessionStorage.setItem(sessionKey, "true");

    exchangeCode(code, state);
  }, []);

  const exchangeCode = async (authCode, stateStr) => {
    try {
      setStatus("processing");
      const { data } = await api.get(`/linkedin/callback`, {
        params: { code: authCode, state: stateStr },
      });

      if (data.success) {
        setMemberId(data.memberId);
        setAccessTokenEncrypted(data.accessTokenEncrypted);
        setRefreshTokenEncrypted(data.refreshTokenEncrypted);
        setExpiresIn(data.expiresIn);
        setOrganizations(data.organizations || []);
        setAdAccounts(data.adAccounts || []);

        if ((data.organizations || []).length > 0) {
          setStatus("select-org");
        } else if ((data.adAccounts || []).length > 0) {
          setStatus("select-ad");
        } else {
          // Redirect to manual setup directly if no access permissions
          setStatus("manual-setup");
        }
      }
    } catch (err) {
      console.error("LinkedIn OAuth Exchange error:", err);
      setErrorMsg(err.response?.data?.message || "Failed to exchange LinkedIn authorization code");
      setStatus("error");
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualFormUrn) {
      toast.error("Lead Form URN is required");
      return;
    }
    try {
      setSaving(true);
      const { data } = await api.post(`/linkedin/connect`, {
        memberId,
        organizationUrn: manualOrgUrn || "urn:li:organization:unknown",
        organizationName: manualOrgName || "LinkedIn Organization",
        adAccountUrn: manualAdUrn || "urn:li:sponsorAccount:unknown",
        adAccountName: manualAdName || "LinkedIn Ad Account",
        leadFormUrn: manualFormUrn,
        leadFormName: manualFormName || "LinkedIn Lead Form",
        accessTokenEncrypted,
        refreshTokenEncrypted,
        expiresIn,
      });

      if (data.success) {
        setStatus("success");
        toast.success(`LinkedIn Form "${manualFormName || "LinkedIn Lead Form"}" Connected!`);
        setTimeout(() => handleBackToIntegrations(), 2000);
      }
    } catch (err) {
      console.error("LinkedIn Connect manual error:", err);
      toast.error(err.response?.data?.message || "Failed to connect LinkedIn integration");
    } finally {
      setSaving(false);
    }
  };

  const handleSelectOrg = (org) => {
    setSelectedOrg(org);
    if (adAccounts.length > 0) {
      setStatus("select-ad");
    } else {
      // Redirect to manual setup directly if no ad accounts found
      setStatus("manual-setup");
    }
  };

  const handleSelectAd = async (ad) => {
    setSelectedAd(ad);
    try {
      setSaving(true);
      // Fetch lead forms for this Ad Account from backend
      const { data } = await api.get(`/linkedin/forms`, {
        params: { adAccountUrn: ad.urn, accessTokenEncrypted },
      });

      setLeadForms(data.forms || []);
      setStatus("select-form");
    } catch (err) {
      console.error("Fetch lead forms error:", err);
      toast.error("Could not fetch lead forms. Please input manually.");
      setLeadForms([]);
      setStatus("select-form");
    } finally {
      setSaving(false);
    }
  };

  const handleSelectForm = async (form) => {
    setSelectedForm(form);
    try {
      setSaving(true);
      const { data } = await api.post(`/linkedin/connect`, {
        memberId,
        organizationUrn: selectedOrg?.urn || "urn:li:organization:unknown",
        organizationName: selectedOrg?.name || "LinkedIn Organization",
        adAccountUrn: selectedAd?.urn || "urn:li:sponsorAccount:unknown",
        adAccountName: selectedAd?.name || "LinkedIn Ad Account",
        leadFormUrn: form.urn,
        leadFormName: form.name,
        accessTokenEncrypted,
        refreshTokenEncrypted,
        expiresIn,
      });

      if (data.success) {
        setStatus("success");
        toast.success(`LinkedIn Form "${form.name}" Connected!`);
        setTimeout(() => handleBackToIntegrations(), 2000);
      }
    } catch (err) {
      console.error("LinkedIn Connect error:", err);
      toast.error(err.response?.data?.message || "Failed to connect LinkedIn integration");
      setStatus("error");
    } finally {
      setSaving(false);
    }
  };

  // Render UI
  if (status === "processing") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RefreshCw size={40} className="animate-spin text-blue-700 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Processing LinkedIn authorization...</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
          <p className="text-gray-800 font-semibold text-lg">LinkedIn Connected!</p>
          <p className="text-gray-400 text-sm mt-1">Redirecting to integrations...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <p className="text-gray-800 font-semibold text-lg">Connection Failed</p>
          <p className="text-gray-500 text-sm mt-2 mb-5">{errorMsg}</p>
          <button
            onClick={handleBackToIntegrations}
            className="px-5 py-2 bg-blue-700 text-white rounded-xl text-sm font-medium hover:bg-blue-800 transition"
          >
            Back to Integrations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-6 border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <Layers size={18} className="text-blue-700" />
          </div>
          <h2 className="text-lg font-bold text-gray-800">LinkedIn Setup</h2>
        </div>

        {status === "select-org" && (
          <div>
            <p className="text-gray-600 text-sm mb-4">Select the Organization / Company Page:</p>
            <div className="space-y-2">
              {organizations.map((org) => (
                <button
                  key={org.urn}
                  onClick={() => handleSelectOrg(org)}
                  className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50/50 text-left transition"
                >
                  <span className="font-medium text-gray-800">{org.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {status === "select-ad" && (
          <div>
            <p className="text-gray-600 text-sm mb-4">Select the Ad Account:</p>
            <div className="space-y-2">
              {adAccounts.map((ad) => (
                <button
                  key={ad.urn}
                  onClick={() => handleSelectAd(ad)}
                  disabled={saving}
                  className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50/50 text-left transition disabled:opacity-50"
                >
                  <span className="font-medium text-gray-800">{ad.name}</span>
                  {saving && <RefreshCw size={16} className="animate-spin text-blue-700" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {status === "select-form" && (
          <div>
            <p className="text-gray-600 text-sm mb-4">Select the Lead Gen Form to monitor:</p>
            <div className="space-y-2">
              {leadForms.length === 0 ? (
                <div>
                  <p className="text-sm text-gray-500 mb-3">No Lead Forms found dynamically. Enter Form URN manually:</p>
                  <input
                    type="text"
                    placeholder="urn:li:adForm:12345"
                    className="w-full p-3 border border-gray-200 rounded-xl mb-3"
                    id="manual-form-urn"
                  />
                  <button
                    onClick={() => {
                      const val = document.getElementById("manual-form-urn")?.value;
                      if (val) handleSelectForm({ urn: val, name: "LinkedIn Custom Form" });
                    }}
                    className="w-full py-3 bg-blue-700 text-white rounded-xl font-medium text-sm hover:bg-blue-800 transition"
                  >
                    Submit Form URN
                  </button>
                </div>
              ) : (
                leadForms.map((form) => (
                  <button
                    key={form.urn}
                    onClick={() => handleSelectForm(form)}
                    disabled={saving}
                    className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50/50 text-left transition disabled:opacity-50"
                  >
                    <span className="font-medium text-gray-800">{form.name}</span>
                    {saving && <RefreshCw size={16} className="animate-spin text-blue-700" />}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {status === "manual-setup" && (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <p className="text-gray-600 text-sm">
              We couldn't load your pages automatically. Please enter your LinkedIn URNs manually to connect:
            </p>
            
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Organization Name</label>
              <input
                type="text"
                value={manualOrgName}
                onChange={(e) => setManualOrgName(e.target.value)}
                placeholder="My Business Page"
                className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Organization URN *</label>
              <input
                type="text"
                value={manualOrgUrn}
                onChange={(e) => setManualOrgUrn(e.target.value)}
                placeholder="urn:li:organization:12345"
                required
                className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Ad Account Name</label>
              <input
                type="text"
                value={manualAdName}
                onChange={(e) => setManualAdName(e.target.value)}
                placeholder="My Ad Account"
                className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Ad Account URN *</label>
              <input
                type="text"
                value={manualAdUrn}
                onChange={(e) => setManualAdUrn(e.target.value)}
                placeholder="urn:li:sponsorAccount:12345"
                required
                className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Lead Form Name</label>
              <input
                type="text"
                value={manualFormName}
                onChange={(e) => setManualFormName(e.target.value)}
                placeholder="Lead Generation Form"
                className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Lead Form URN *</label>
              <input
                type="text"
                value={manualFormUrn}
                onChange={(e) => setManualFormUrn(e.target.value)}
                placeholder="urn:li:adForm:12345"
                required
                className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full mt-2 py-3 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl font-medium text-sm transition flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Saving...
                </>
              ) : (
                "Save Connection"
              )}
            </button>
          </form>
        )}

        <button
          onClick={handleBackToIntegrations}
          className="mt-4 w-full py-2 text-gray-400 text-sm hover:text-gray-600 text-center block transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
