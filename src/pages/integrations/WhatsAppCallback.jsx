import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { CheckCircle, AlertCircle, RefreshCw, Smartphone } from "lucide-react";
import { api } from "../../services/api";

export default function WhatsAppCallback() {
  const [searchParams]            = useSearchParams();
  const navigate                  = useNavigate();
  const [status, setStatus]       = useState("processing");
  const [phones, setPhones]       = useState([]);
  const [errorMsg, setErrorMsg]   = useState("");
  const [saving, setSaving]       = useState(false);
  const [pendingToken, setPendingToken]         = useState(null);
  const [pendingExpiresAt, setPendingExpiresAt] = useState(null);
  const hasFetched                = useRef(false);

  const code = searchParams.get("code");

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
      const { data } = await api.post("/whatsapp/callback", { code: authCode });
      if (data.selectPhone) {
        setPhones(data.phones || []);
        setPendingToken(data.userToken);
        setPendingExpiresAt(data.tokenExpiresAt);
        setStatus("select");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to connect WhatsApp. Please try again.";
      setErrorMsg(msg);
      setStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const handleSelectPhone = async (phone) => {
    try {
      setSaving(true);
      const { data } = await api.post("/whatsapp/confirm", {
        userToken:     pendingToken,
        tokenExpiresAt: pendingExpiresAt,
        wabaId:        phone.wabaId,
        phoneNumberId: phone.phoneNumberId,
        phoneNumber:   phone.phoneNumber,
        displayName:   phone.displayName,
      });
      if (data.success) {
        setStatus("success");
        toast.success(`WhatsApp number ${phone.phoneNumber} connected!`);
        setTimeout(() => navigate(`${getSlugBase()}/integrations`), 2000);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to save WhatsApp number. Please try again.";
      setErrorMsg(msg);
      setStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const getSlugBase = () => {
    const slug = localStorage.getItem("tenantSlug");
    return slug ? `/${slug}` : "";
  };

  if (status === "processing") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RefreshCw size={40} className="animate-spin text-green-500 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Connecting your WhatsApp number...</p>
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
          <p className="text-gray-800 font-semibold text-lg">WhatsApp Connected!</p>
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
            onClick={() => navigate(`${getSlugBase()}/integrations`)}
            className="px-5 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition"
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
                 style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}>
              <svg viewBox="0 0 24 24" fill="white" width="22" height="22">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Select a WhatsApp Number</h2>
              <p className="text-gray-500 text-sm">Choose which number to connect to this CRM</p>
            </div>
          </div>

          {phones.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <AlertCircle size={32} className="mx-auto mb-2" />
              <p className="text-sm">No phone numbers found in your Business Account.</p>
              <p className="text-xs mt-1">Please add a number in Meta Business Manager first.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {phones.map((phone) => (
                <button
                  key={phone.phoneNumberId}
                  onClick={() => handleSelectPhone(phone)}
                  disabled={saving}
                  className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition text-left disabled:opacity-50"
                >
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                    <Smartphone size={18} className="text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800">{phone.phoneNumber}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {phone.displayName}
                      {phone.verified && (
                        <span className="ml-2 text-green-600">· Verified</span>
                      )}
                    </p>
                    {phone.wabaName && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">WABA: {phone.wabaName}</p>
                    )}
                  </div>
                  {saving && <RefreshCw size={16} className="animate-spin text-green-400 shrink-0" />}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => navigate(`${getSlugBase()}/integrations`)}
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
