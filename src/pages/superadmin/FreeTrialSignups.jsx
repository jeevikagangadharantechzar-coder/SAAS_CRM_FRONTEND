import React, { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import {
  Rocket,
  Search,
  Trash2,
  AlertTriangle,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { superApi } from "../../services/api";

const PERIOD_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "weekly", label: "Last 7 Days" },
  { value: "monthly", label: "Last 30 Days" },
  { value: "custom", label: "Custom Range" },
];

const LIMIT = 10;

const TrialStatusBadge = ({ tenant }) => {
  if (!tenant) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border bg-gray-50 text-gray-500 border-gray-200">
        Unknown
      </span>
    );
  }

  const isExpired = tenant.plan_end_date && new Date(tenant.plan_end_date) < new Date();

  if (!tenant.isActive) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border bg-gray-50 text-gray-500 border-gray-200">
        Inactive
      </span>
    );
  }

  if (tenant.plan_status === "trial" && isExpired) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border bg-amber-50 text-amber-700 border-amber-200">
        Trial Expired
      </span>
    );
  }

  if (tenant.plan_status === "trial") {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border bg-blue-50 text-blue-700 border-blue-200">
        On Trial
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border bg-green-50 text-green-700 border-green-200">
      Converted
    </span>
  );
};

const FreeTrialSignups = () => {
  const [signups, setSignups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSignups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: LIMIT };
      if (search.trim()) params.search = search.trim();
      if (period === "weekly" || period === "monthly") params.period = period;
      if (period === "custom") {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }

      const res = await superApi.get("/free-trials", { params });
      setSignups(res.data?.data || []);
      setPagination(res.data?.pagination || { total: 0, totalPages: 1 });
    } catch (err) {
      console.error("Failed to fetch free trial signups:", err);
      setError("Failed to fetch free trial signups. Please check your connection and try again.");
      setSignups([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, period, startDate, endDate]);

  useEffect(() => {
    fetchSignups();
  }, [fetchSignups]);

  // Debounce search input
  useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 400);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const handlePeriodChange = (value) => {
    setPeriod(value);
    setPage(1);
    if (value !== "custom") {
      setStartDate("");
      setEndDate("");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteConfirmText.toLowerCase() !== "delete") {
      alert("Please type 'delete' to confirm.");
      return;
    }

    setIsDeleting(true);
    try {
      await superApi.delete(`/free-trials/${deleteTarget._id}`);
      setDeleteTarget(null);
      setDeleteConfirmText("");
      // If we deleted the last row on a page beyond page 1, step back a page
      if (signups.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        fetchSignups();
      }
    } catch (err) {
      console.error("Failed to delete free trial signup:", err);
      alert(err.response?.data?.error || "Failed to delete signup record.");
    } finally {
      setIsDeleting(false);
    }
  };

  const { total = 0, totalPages = 1 } = pagination;
  const rangeStart = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const rangeEnd = Math.min(page * LIMIT, total);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Rocket size={22} className="text-[#008ecc]" />
            Free Trial Signups
          </h2>
          <p className="text-slate-500 text-sm">All data submitted through the landing page free trial form.</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchSignups}
            className="p-2 border border-slate-200 rounded-xl bg-white hover:border-[#008ecc]/40 hover:text-[#008ecc] text-slate-600 transition-all cursor-pointer shadow-sm"
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-sm">
          <span>{error}</span>
        </div>
      )}

      {/* Control panel and Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Filters Toolbar */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by name, email, or business name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] focus:border-transparent bg-white shadow-inner"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handlePeriodChange(opt.value)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  period === opt.value
                    ? "bg-[#008ecc] text-white border-[#008ecc] shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-[#008ecc]/40 hover:text-[#008ecc]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {period === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] bg-white"
              />
              <span className="text-slate-400 text-sm">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] bg-white"
              />
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/50 text-slate-600 uppercase text-xs font-bold border-b border-slate-200">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Business Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Industry</th>
                <th className="px-6 py-4">Country</th>
                <th className="px-6 py-4">Package</th>
                <th className="px-6 py-4">Signup Date</th>
                <th className="px-6 py-4 text-center">Trial Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="animate-spin text-[#008ecc]" size={32} />
                      <span className="font-medium">Loading free trial signups...</span>
                    </div>
                  </td>
                </tr>
              ) : signups.length > 0 ? (
                signups.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">{s.name}</td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-[#008ecc] bg-[#f2fbff] rounded px-2.5 py-1 border border-blue-100 font-semibold">
                        {s.businessName}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{s.email}</td>
                    <td className="px-6 py-4 text-slate-600">{s.industry || "—"}</td>
                    <td className="px-6 py-4 text-slate-600">{s.country || "—"}</td>
                    <td className="px-6 py-4 text-slate-600">{s.subscriptionPackage || "—"}</td>
                    <td className="px-6 py-4 text-slate-500">
                      {s.createdAt ? format(new Date(s.createdAt), "MMM dd, yyyy") : "N/A"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <TrialStatusBadge tenant={s.tenant} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-3">
                        {s.tenant?.slug && (
                          <a
                            href={`/${s.tenant.slug}/login`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 border border-slate-200 rounded-lg hover:border-[#008ecc]/40 hover:text-[#008ecc] transition-all cursor-pointer flex items-center justify-center"
                            title="Open tenant login"
                          >
                            <ExternalLink size={15} />
                          </a>
                        )}
                        <button
                          onClick={() => setDeleteTarget(s)}
                          className="p-1.5 border border-red-100 rounded-lg hover:bg-red-50 text-red-500 transition-all cursor-pointer"
                          title="Delete Signup Record"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                    No free trial signups found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
            <span className="text-xs text-slate-500">
              Showing <strong>{rangeStart}</strong>–<strong>{rangeEnd}</strong> of <strong>{total}</strong> signups
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                className="p-2 border border-slate-200 rounded-lg bg-white hover:border-[#008ecc]/40 hover:text-[#008ecc] text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-semibold text-slate-600 px-2">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
                className="p-2 border border-slate-200 rounded-lg bg-white hover:border-[#008ecc]/40 hover:text-[#008ecc] text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-red-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 bg-red-600 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle size={22} />
                <h3 className="text-lg font-bold">Delete Signup Record</h3>
              </div>
              <button
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteConfirmText("");
                }}
                className="text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-red-800">
                <AlertTriangle size={24} className="flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">This only removes the signup log entry</h4>
                  <p className="text-xs mt-1 leading-relaxed">
                    This deletes the free trial signup record for <strong>{deleteTarget.businessName}</strong> ({deleteTarget.email}) from this list. It does <strong>not</strong> delete the tenant's workspace or database — manage that from the Tenants page.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Type <span className="font-bold text-red-600">"delete"</span> below to confirm:
                </label>
                <input
                  type="text"
                  placeholder="delete"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 font-mono text-center"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => {
                    setDeleteTarget(null);
                    setDeleteConfirmText("");
                  }}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteConfirmText.toLowerCase() !== "delete" || isDeleting}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 cursor-pointer text-sm shadow-md"
                >
                  {isDeleting ? "Deleting..." : "Delete Record"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FreeTrialSignups;
