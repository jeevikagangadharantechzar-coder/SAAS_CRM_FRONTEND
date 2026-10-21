import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, X, Calendar, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { format } from "date-fns";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;
const SI_URI  = import.meta.env.VITE_SI_URI;

// Poll interval for re-checking missed follow-ups while the app stays open
const POLL_INTERVAL_MS = 5 * 60 * 1000;

// The popup shows once per day (24 hours) when user logs in
const SHOW_INTERVAL_MS = 24 * 60 * 60 * 1000;
const LAST_SHOWN_KEY = "missedFollowUpLastShownAt";

const ITEMS_PER_PAGE = 10;

const MissedFollowUpModal = () => {
  const navigate = useNavigate();
  const { tenantSlug } = useParams();
  const [missedList, setMissedList] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  let isAdmin = false;
  let userId = "";
  try {
    const storedUser = JSON.parse(localStorage.getItem("user") || "null");
    isAdmin = storedUser?.role?.name?.toLowerCase() === "admin";
    userId = storedUser?._id || "";
  } catch {}

  const storageKey = userId ? `${LAST_SHOWN_KEY}_${userId}` : LAST_SHOWN_KEY;

  const fetchMissed = useCallback(
    async (pageToFetch = 1, isInitial = false) => {
      if (isAdmin) return;

      const token = localStorage.getItem("token");
      const storedSlug = localStorage.getItem("tenantSlug");
      const baseUrl = storedSlug
        ? `${SI_URI}/${storedSlug}/api/leads/missed-followups`
        : `${API_URL}/leads/missed-followups`;

      const url = `${baseUrl}?page=${pageToFetch}&limit=${ITEMS_PER_PAGE}`;

      try {
        setLoading(true);
        const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
        const leads = res.data.leads || [];
        const total = typeof res.data.total === "number" ? res.data.total : leads.length;
        const pages = typeof res.data.totalPages === "number" ? res.data.totalPages : Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

        setMissedList(leads);
        setTotalCount(total);
        setTotalPages(pages);

        if (isInitial) {
          const lastShown = Number(localStorage.getItem(storageKey) || 0);
          const has24HoursPassed = Date.now() - lastShown >= SHOW_INTERVAL_MS;

          // Show once per day (every 24 hours) upon login when missed follow-ups exist
          if (total > 0 && has24HoursPassed) {
            setIsOpen(true);
          }
        }
      } catch {
        // silent fail to avoid interruption on network errors
      } finally {
        setLoading(false);
      }
    },
    [isAdmin, storageKey]
  );

  // Initial load on mount
  useEffect(() => {
    fetchMissed(1, true);

    const interval = setInterval(() => {
      fetchMissed(1, false);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchMissed]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage || loading) return;
    setCurrentPage(newPage);
    fetchMissed(newPage, false);
  };

  // Only render when open and there are missed follow-ups
  if (!isOpen || totalCount === 0) return null;

  // Only close when user explicitly clicks Dismiss or X; records the 24h cooldown timestamp
  const close = () => {
    setIsOpen(false);
    localStorage.setItem(storageKey, String(Date.now()));
  };

  const goToLead = () => {
    close();
    navigate(`/${tenantSlug}/leads?followUp=missed`, { state: { followUpFilter: "missed" } });
  };

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, totalCount);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-[#008ecc]/20 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        <div className="px-6 py-5 bg-[#008ecc] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <AlertTriangle size={22} />
            <h3 className="font-semibold text-base">
              Missed Follow-up{totalCount > 1 ? `s (${totalCount})` : ""}
            </h3>
          </div>
          <button onClick={close} className="text-white/80 hover:text-white transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-3 overflow-y-auto flex-1 min-h-[220px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
              <Loader2 className="animate-spin text-[#008ecc]" size={28} />
              <p className="text-xs font-medium">Loading page {currentPage}...</p>
            </div>
          ) : missedList.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              No missed follow-ups found for this page.
            </div>
          ) : (
            missedList.map((lead) => (
              <div
                key={lead._id}
                className="border border-gray-200 rounded-xl p-4 flex items-start justify-between gap-3 hover:border-blue-200 transition-colors"
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
                </div>
                <button
                  onClick={goToLead}
                  className="shrink-0 px-3 py-2 bg-[#008ecc] text-white rounded-lg font-semibold hover:bg-[#0077ad] cursor-pointer text-xs shadow-sm"
                >
                  View Lead
                </button>
              </div>
            ))
          )}
        </div>

        {/* Pagination & Footer Controls */}
        <div className="px-6 pb-6 pt-2 border-t border-slate-100 shrink-0 space-y-3">
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
              <span>
                Showing <span className="font-semibold text-slate-700">{startIndex}</span>–
                <span className="font-semibold text-slate-700">{endIndex}</span> of{" "}
                <span className="font-semibold text-slate-700">{totalCount}</span>
              </span>

              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  disabled={currentPage <= 1 || loading}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>

                <span className="px-2 font-medium text-slate-700">
                  {currentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  disabled={currentPage >= totalPages || loading}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          <button
            onClick={close}
            className="w-full py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer text-sm transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default MissedFollowUpModal;
