/**
 * FacebookCallback.jsx
 * Meta redirects here after the user approves the OAuth dialog.
 * URL: /integrations/facebook/callback?code=...&state=tenantSlug
 *
 * Flow:
 *  1. Extract `code` from query params
 *  2. POST to backend /meta/callback with { code }
 *  3. If backend returns selectPage=true → show page picker
 *  4. User picks a page → POST again with { code, pageId }
 *  5. Redirect to /integrations on success
 */

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { CheckCircle, AlertCircle, RefreshCw } from "react-feather";
import { api } from "../../services/api";

export default function FacebookCallback() {
  const [searchParams]          = useSearchParams();
  const navigate                = useNavigate();
  const [status, setStatus]     = useState("processing"); // processing | select | success | error
  const [pages, setPages]       = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving]     = useState(false);
  const [userToken, setUserToken] = useState(null); // stored after first exchange so code isn't reused

  const code = searchParams.get("code");

  // ── On mount: exchange code with backend ──────────────────────────────────
  useEffect(() => {
    if (!code) {
      setStatus("error");
      setErrorMsg("No authorization code received from Facebook. Please try again.");
      return;
    }
    exchangeCode(code);
  }, []);

  const exchangeCode = async (authCode, pageId = null, token = null) => {
    try {
      setSaving(true);

      // Build payload — on page selection use stored userToken, never re-use the one-time code
      const payload = {};
      if (token)  payload.userToken = token;
      else        payload.code      = authCode;
      if (pageId) payload.pageId    = pageId;

      const { data } = await api.post("/meta/callback", payload);

      if (data.selectPage) {
        // Backend returned pages list + already-exchanged userToken
        setPages(data.pages || []);
        setUserToken(data.userToken);   // store so we don't re-use the one-time code
        setStatus("select");
      } else if (data.success) {
        setStatus("success");
        toast.success(`Facebook Page "${data.integration?.pageName}" connected!`);
        setTimeout(() => navigate("../integrations"), 2000);
      }
    } catch (err) {
      console.error("Facebook callback error:", err);
      const msg = err.response?.data?.message || "Failed to connect Facebook Page. Please try again.";
      setErrorMsg(msg);
      setStatus("error");
    } finally {
      setSaving(false);
    }
  };

  // On page selection: send stored userToken instead of the expired code
  const handleSelectPage = (pageId) => {
    exchangeCode(null, pageId, userToken);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (status === "processing") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RefreshCw size={40} className="animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Connecting your Facebook Page...</p>
          <p className="text-gray-400 text-sm mt-1">Please wait a moment</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
          <p className="text-gray-800 font-semibold text-lg">Facebook Page Connected!</p>
          <p className="text-gray-400 text-sm mt-1">Redirecting to Integrations...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <p className="text-gray-800 font-semibold text-lg">Connection Failed</p>
          <p className="text-gray-500 text-sm mt-2 mb-5">{errorMsg}</p>
          <button
            onClick={() => navigate("../integrations")}
            className="px-5 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition"
          >
            Back to Integrations
          </button>
        </div>
      </div>
    );
  }

  if (status === "select") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-1">Select a Facebook Page</h2>
          <p className="text-gray-500 text-sm mb-5">
            Choose which page you want to connect to this CRM
          </p>

          {pages.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <AlertCircle size={32} className="mx-auto mb-2" />
              <p className="text-sm">No Facebook Pages found on your account.</p>
              <p className="text-xs mt-1">Please create a Facebook Business Page first.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pages.map((page) => (
                <button
                  key={page.pageId}
                  onClick={() => handleSelectPage(page.pageId)}
                  disabled={saving}
                  className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition text-left disabled:opacity-50"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" fill="#1877F2" width="20" height="20">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{page.pageName}</p>
                    {page.hasInstagram && (
                      <p className="text-xs text-purple-500 mt-0.5">Instagram account linked</p>
                    )}
                  </div>
                  {saving && <RefreshCw size={16} className="animate-spin text-blue-400 ml-auto" />}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => navigate("../integrations")}
            className="mt-4 w-full py-2 text-gray-400 text-sm hover:text-gray-600 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return null;
}
