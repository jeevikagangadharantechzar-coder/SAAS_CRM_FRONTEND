import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, X, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;
const SI_URI  = import.meta.env.VITE_SI_URI;
const ADMIN_POPUP_SESSION_KEY = "missedFollowUpPopupShown";

// Sourced directly from the leads collection (same "missed" definition the
// Leads table uses: followUpDate passed, lead still open, no follow-up notes
// logged) rather than from the notification inbox — the inbox only holds a
// notification while it's unread and the cron only writes one once per day,
// so it silently under-reports leads that are still genuinely missed.
const MissedFollowUpModal = () => {
  const navigate = useNavigate();
  const { tenantSlug } = useParams();
  const [missedList, setMissedList] = useState([]);
  const [dismissed, setDismissed] = useState(false);
  const fetchedRef = useRef(false);

  let isAdmin = false;
  try {
    const storedUser = JSON.parse(localStorage.getItem("user") || "null");
    isAdmin = storedUser?.role?.name?.toLowerCase() === "admin";
  } catch {}

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    // Admins see the whole team's missed follow-ups, so there's almost always
    // something outstanding — without this, the popup would reopen on every
    // refresh. Gate it to once per browser session (cleared when the tab closes).
    if (isAdmin && sessionStorage.getItem(ADMIN_POPUP_SESSION_KEY)) return;

    const token = localStorage.getItem("token");
    const storedSlug = localStorage.getItem("tenantSlug");
    const url = storedSlug
      ? `${SI_URI}/${storedSlug}/api/leads/missed-followups`
      : `${API_URL}/leads/missed-followups`;

    axios
      .get(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        const leads = res.data.leads || [];
        if (isAdmin && leads.length > 0) sessionStorage.setItem(ADMIN_POPUP_SESSION_KEY, "1");
        setMissedList(leads);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (dismissed || missedList.length === 0) return null;

  const close = () => setDismissed(true);

  const goToLead = () => {
    setDismissed(true);
    navigate(`/${tenantSlug}/leads`, { state: { followUpFilter: "missed" } });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-[#008ecc]/20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 bg-[#008ecc] text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle size={22} />
            <h3 className="text-lg font-bold">
              Missed Follow-up{missedList.length > 1 ? `s (${missedList.length})` : ""}
            </h3>
          </div>
          <button onClick={close} className="text-white/80 hover:text-white transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {missedList.map((lead) => (
            <div
              key={lead._id}
              className="border border-gray-200 rounded-xl p-4 flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">
                  Lead follow-up due: {lead.leadName}
                  {lead.companyName ? ` (${lead.companyName})` : ""}
                </p>
                {lead.followUpDate && (
                  <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
                    <Calendar size={12} />
                    Follow-up date: {format(new Date(lead.followUpDate), "dd MMM yyyy")}
                  </p>
                )}
                {isAdmin && lead.assignTo && (
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                    <User size={12} />
                    Salesperson: {lead.assignTo.firstName} {lead.assignTo.lastName}
                  </p>
                )}
              </div>
              <button
                onClick={goToLead}
                className="shrink-0 px-3 py-2 bg-[#008ecc] text-white rounded-lg font-semibold hover:bg-[#0077ad] cursor-pointer text-xs shadow-sm"
              >
                View Lead
              </button>
            </div>
          ))}
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={close}
            className="w-full py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer text-sm"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default MissedFollowUpModal;
