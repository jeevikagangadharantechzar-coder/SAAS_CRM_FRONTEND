import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { api } from "../../services/api";

const IG_SVG = (
  <svg viewBox="0 0 24 24" fill="white" width="22" height="22">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

export default function InstagramCallback() {
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();
  const [status, setStatus]       = useState("processing");
  const [accounts, setAccounts]   = useState([]);
  const [errorMsg, setErrorMsg]   = useState("");
  const [saving, setSaving]       = useState(false);
  const [pendingToken, setPendingToken]         = useState(null);
  const [pendingExpiresAt, setPendingExpiresAt] = useState(null);
  const hasFetched = useRef(false);

  const code  = searchParams.get("code");
  const state = searchParams.get("state"); // contains tenantSlug

  const getBase = () => {
    const slug = state || localStorage.getItem("tenantSlug");
    return slug ? `/${slug}` : "";
  };

  useEffect(() => {
    if (!code) {
      setStatus("error");
      setErrorMsg("No authorization code received. Please try again.");
      return;
    }
    if (hasFetched.current) return;
    hasFetched.current = true;
    window.history.replaceState({}, "", window.location.pathname);
    exchangeCode(code);
  }, []);

  const exchangeCode = async (authCode) => {
    try {
      setSaving(true);
      const { data } = await api.post("/instagram/callback", { code: authCode });
      if (data.selectAccount) {
        setAccounts(data.accounts || []);
        setPendingToken(data.userToken);
        setPendingExpiresAt(data.tokenExpiresAt);
        setStatus("select");
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to connect Instagram. Please try again.");
      setStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const handleSelectAccount = async (account) => {
    try {
      setSaving(true);
      const { data } = await api.post("/instagram/confirm", {
        userToken:         pendingToken,
        tokenExpiresAt:    pendingExpiresAt,
        igAccountId:       account.igAccountId,
        pageId:            account.pageId,
        pageAccessToken:   account.pageAccessToken,
        username:          account.username,
        displayName:       account.displayName,
        profilePictureUrl: account.profilePictureUrl,
      });
      if (data.success) {
        setStatus("success");
        toast.success(`@${account.username} connected to Instagram!`);
        setTimeout(() => navigate(`${getBase()}/integrations`), 2000);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to save Instagram account. Please try again.");
      setStatus("error");
    } finally {
      setSaving(false);
    }
  };

  if (status === "processing") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RefreshCw size={40} className="animate-spin mx-auto mb-4" style={{ color: "#E1306C" }} />
          <p className="text-gray-600 font-medium">Connecting your Instagram account...</p>
          <p className="text-gray-400 text-sm mt-1">Please wait a moment</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <CheckCircle size={48} className="mx-auto mb-4" style={{ color: "#E1306C" }} />
          <p className="text-gray-800 font-semibold text-lg">Instagram Connected!</p>
          <p className="text-gray-400 text-sm mt-1">Redirecting to Integrations...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm px-4">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <p className="text-gray-800 font-semibold text-lg">Connection Failed</p>
          <p className="text-gray-500 text-sm mt-2 mb-5">{errorMsg}</p>
          <button
            onClick={() => navigate(`${getBase()}/integrations`)}
            className="px-5 py-2 text-white rounded-xl text-sm font-medium transition"
            style={{ background: "linear-gradient(135deg, #E1306C, #833AB4)" }}
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
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: "linear-gradient(135deg, #E1306C, #833AB4)" }}>
              {IG_SVG}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Select Instagram Account</h2>
              <p className="text-gray-500 text-sm">Choose which account to connect to this CRM</p>
            </div>
          </div>

          {accounts.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <AlertCircle size={32} className="mx-auto mb-2" />
              <p className="text-sm">No Instagram Business Accounts found.</p>
              <p className="text-xs mt-1">
                Make sure your Instagram account is a Business or Creator account and is linked to a Facebook Page.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {accounts.map((account) => (
                <button
                  key={account.igAccountId}
                  onClick={() => handleSelectAccount(account)}
                  disabled={saving}
                  className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-pink-400 hover:bg-pink-50 transition text-left disabled:opacity-50"
                >
                  {account.profilePictureUrl ? (
                    <img
                      src={account.profilePictureUrl}
                      alt={account.username}
                      className="w-11 h-11 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                         style={{ background: "linear-gradient(135deg, #E1306C, #833AB4)" }}>
                      <span className="text-white font-bold text-lg">
                        {(account.username?.[0] || "I").toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800">@{account.username}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{account.displayName}</p>
                    {account.pageName && (
                      <p className="text-xs text-gray-400 mt-0.5">Page: {account.pageName}</p>
                    )}
                  </div>
                  {saving && <RefreshCw size={16} className="animate-spin text-pink-400 shrink-0" />}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => navigate(`${getBase()}/integrations`)}
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
