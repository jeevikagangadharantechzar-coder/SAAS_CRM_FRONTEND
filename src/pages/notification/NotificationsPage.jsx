import React, { useState, useEffect, useMemo, useCallback } from "react";
import { formatDistanceToNow, format, isToday, isThisWeek, isThisMonth, parseISO, startOfDay, endOfDay } from "date-fns";
import {
  Bell, Trash2, Clock, CheckCircle, ArrowLeft, RefreshCw,
  Search, ChevronLeft, ChevronRight, Filter, CheckCheck, X,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { getNotificationBadge, getNotificationAccentClass } from "../../utils/taskNotifications";
import { CATEGORY_LABELS, getNotificationCategory } from "../../utils/notificationCategory";

const API_URL = import.meta.env.VITE_API_URL;
const API_SI  = import.meta.env.VITE_SI_URI;

const DEFAULT_AVATAR =
  "https://static.vecteezy.com/system/resources/previews/020/429/953/non_2x/admin-icon-vector.jpg";

const PAGE_SIZE = 10;

const buildProfileImageUrl = (profileImage) => {
  if (!profileImage) return null;
  if (profileImage.startsWith("http://") || profileImage.startsWith("https://")) return profileImage;
  const base = (API_SI || "").replace(/\/+$/, "");
  const name = profileImage.replace(/^\/+/, "").replace(/^uploads\/users\//, "").replace(/^uploads\//, "");
  return `${base}/uploads/users/${name}`;
};

// This page shows the centralized, category-organized notification feed —
// Admins get every notification in the tenant, Sales see only their own
// (enforced server-side by GET /notifications). Deliberately independent of
// NotificationContext (the bell dropdown / per-page badges), which stay
// scoped to "my own notifications" everywhere else in the app.
const TYPE_LABELS = CATEGORY_LABELS;

const DATE_FILTERS = [
  { key: "all", label: "All Time" },
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "custom", label: "Custom" },
];

const matchesDate = (notif, dateFilter, customFrom, customTo) => {
  const d = new Date(notif.createdAt);
  if (isNaN(d)) return false;
  switch (dateFilter) {
    case "today":   return isToday(d);
    case "week":    return isThisWeek(d, { weekStartsOn: 1 });
    case "month":   return isThisMonth(d);
    case "custom":
      if (!customFrom && !customTo) return true;
      if (customFrom && d < startOfDay(new Date(customFrom))) return false;
      if (customTo   && d > endOfDay(new Date(customTo)))   return false;
      return true;
    default: return true;
  }
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { tenantSlug } = useParams();

  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,       setSearch]       = useState("");
  const [typeFilter,   setTypeFilter]   = useState("all");
  const [dateFilter,   setDateFilter]   = useState("all");
  const [customFrom,   setCustomFrom]   = useState("");
  const [customTo,     setCustomTo]     = useState("");
  const [page,         setPage]         = useState(1);
  const [selectedIds,  setSelectedIds]  = useState([]);
  const [deletingId,   setDeletingId]   = useState(null);
  const [refreshing,   setRefreshing]   = useState(false);
  const token = localStorage.getItem("token");
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const baseUrl = (tenantSlug || localStorage.getItem("tenantSlug"))
    ? `${API_SI}/${tenantSlug || localStorage.getItem("tenantSlug")}/api/notifications`
    : `${API_URL}/notifications`;

  // Centralized fetch: GET /notifications (no :userId) — server derives identity
  // from the JWT and returns the tenant-wide feed for Admins, own-only for Sales.
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await axios.get(baseUrl, authHeaders);
      setNotifications(res.data || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Failed to load notifications");
    }
  }, [baseUrl, token]);

  // Reset page on filter change
  useEffect(() => { setPage(1); setSelectedIds([]); }, [search, typeFilter, dateFilter, customFrom, customTo]);

  // Fetch on mount
  useEffect(() => {
    setLoading(true);
    fetchNotifications().finally(() => setLoading(false));
  }, [fetchNotifications]);

  // ── Filtered + sorted list ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...notifications];

    // Type filter
    if (typeFilter === "unread") {
      list = list.filter((n) => !n.read && !n.isRead);
    } else if (typeFilter !== "all") {
      list = list.filter((n) => getNotificationCategory(n) === typeFilter);
    }

    // Date filter
    list = list.filter((n) => matchesDate(n, dateFilter, customFrom, customTo));

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (n) =>
          (n.title || "").toLowerCase().includes(q) ||
          (n.text  || "").toLowerCase().includes(q) ||
          (n.message || "").toLowerCase().includes(q)
      );
    }

    // Sort: unread first, then newest
    list.sort((a, b) => {
      const aRead = a.read || a.isRead;
      const bRead = b.read || b.isRead;
      if (aRead !== bRead) return aRead ? 1 : -1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return list;
  }, [notifications, typeFilter, dateFilter, customFrom, customTo, search]);

  // ── Pagination ─────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const unreadCount = notifications.filter((n) => !n.read && !n.isRead).length;

  // ── Selection helpers ──────────────────────────────────────────────────
  const pageIds    = paginated.map((n) => n._id);
  const allOnPage  = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

  const toggleOne = (id) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const togglePage = () =>
    setSelectedIds((prev) =>
      allOnPage ? prev.filter((id) => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])]
    );

  // ── Actions ────────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchNotifications();
      setSelectedIds([]);
      toast.success("Refreshed");
    } catch {
      toast.error("Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await axios.delete(`${API_URL}/notifications/${id}`, authHeaders);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      toast.success("Notification deleted");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) { toast.info("Select notifications to delete"); return; }
    try {
      await axios.delete(`${API_URL}/notifications/bulk`, { ...authHeaders, data: { ids: selectedIds } });
      setNotifications((prev) => prev.filter((n) => !selectedIds.includes(n._id)));
      setSelectedIds([]);
      toast.success(`Deleted ${selectedIds.length} notification(s)`);
    } catch {
      toast.error("Bulk delete failed");
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications
      .filter((n) => !n.read && !n.isRead && n._id && !String(n._id).includes("-"))
      .map((n) => n._id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true, isRead: true })));
    await Promise.all(
      unreadIds.map((id) => axios.patch(`${API_URL}/notifications/read/${id}`, {}, authHeaders).catch(() => {}))
    );
    toast.success("All marked as read");
  };

  const handleMarkRead = async (id) => {
    setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, read: true, isRead: true } : n));
    axios.patch(`${API_URL}/notifications/read/${id}`, {}, authHeaders).catch(() => {});
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-500 hover:text-gray-800 text-sm mb-4 transition-colors"
        >
          <ArrowLeft size={16} className="mr-1" /> Back
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#008ecc] rounded-xl">
              <Bell className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">All Notifications</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                <Trash2 size={14} /> Delete {selectedIds.length} selected
              </button>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={16} className={`${refreshing ? "animate-spin" : ""} text-gray-500`} />
            </button>
          </div>
        </div>
      </div>

      {/* Search + Date Filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search notifications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008ecc]/30 focus:border-[#008ecc]"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Date filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter size={14} className="text-gray-400 shrink-0" />
          {DATE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setDateFilter(f.key)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                dateFilter === f.key
                  ? "bg-[#008ecc] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom date range */}
      {dateFilter === "custom" && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-col sm:flex-row gap-3 items-center">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>From</span>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]/30"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>To</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]/30"
            />
          </div>
          {(customFrom || customTo) && (
            <button onClick={() => { setCustomFrom(""); setCustomTo(""); }} className="text-xs text-red-500 hover:text-red-700">
              Clear dates
            </button>
          )}
        </div>
      )}

      {/* Type tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {Object.entries(TYPE_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTypeFilter(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              typeFilter === key
                ? "bg-[#008ecc] text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
            }`}
          >
            {label}
            {key === "unread" && unreadCount > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-[10px] rounded-full px-1 py-0.5">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List header */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Select all row */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={allOnPage}
              onChange={togglePage}
              className="h-4 w-4 rounded border-gray-300 text-[#008ecc] focus:ring-[#008ecc]"
            />
            <span className="text-xs text-gray-500 font-medium">
              {allOnPage ? "Deselect page" : "Select page"}
              {selectedIds.length > 0 && ` (${selectedIds.length} selected)`}
            </span>
          </div>
          <span className="text-xs text-gray-400">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Notifications */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <RefreshCw size={28} className="mb-3 animate-spin opacity-40" />
            <p className="text-sm font-medium">Loading notifications…</p>
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Bell size={40} className="mb-3 opacity-20" />
            <p className="text-sm font-medium">No notifications found</p>
            {(search || typeFilter !== "all" || dateFilter !== "all") && (
              <button
                onClick={() => { setSearch(""); setTypeFilter("all"); setDateFilter("all"); }}
                className="mt-2 text-xs text-[#008ecc] hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {paginated.map((n) => {
              const isUnread = !n.read && !n.isRead;
              const avatar   = n.profileImage ? buildProfileImageUrl(n.profileImage) : DEFAULT_AVATAR;
              const time     = n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : "";
              const dateStr  = n.createdAt ? format(new Date(n.createdAt), "dd MMM yyyy, hh:mm a") : "";
              const accent = getNotificationAccentClass(n);
              const badge = getNotificationBadge(n);

              return (
                <div
                  key={n._id}
                  onClick={() => {
                    if (n.type === "contact_form") {
                      handleMarkRead(n._id);
                      const path = tenantSlug ? `/${tenantSlug}/createleads` : "/createleads";
                      navigate(path, { state: { contactFormData: n.meta } });
                    }
                  }}
                  className={`flex items-start gap-3 px-4 py-4 group transition-colors border-l-4 ${
                    accent || (isUnread ? "border-l-transparent bg-blue-50/40" : "border-l-transparent bg-white hover:bg-gray-50")
                  }`}
                  // className={`flex items-start gap-3 px-4 py-4 group transition-colors cursor-pointer ${
                  //   isUnread ? "bg-blue-50/40" : "bg-white hover:bg-gray-50"
                  // }`}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(n._id)}
                    onChange={() => toggleOne(n._id)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-[#008ecc] focus:ring-[#008ecc] shrink-0"
                  />

                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <img
                      src={avatar}
                      alt="avatar"
                      className="w-10 h-10 rounded-full object-cover border border-gray-200"
                      onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_AVATAR; }}
                    />
                    {isUnread && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          {badge && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.className}`}>
                              {badge.emoji} {badge.label}
                            </span>
                          )}
                        </div>
                        <p className={`text-sm font-semibold truncate ${isUnread ? "text-gray-900" : "text-gray-700"}`}>
                          {n.title || "Notification"}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
                          {n.text || n.message}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {isUnread && (
                          <button
                            onClick={() => handleMarkRead(n._id)}
                            title="Mark as read"
                            className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <CheckCircle size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(n._id)}
                          disabled={deletingId === n._id}
                          title="Delete"
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          {deletingId === n._id ? (
                            <div className="w-3.5 h-3.5 border border-t-transparent border-red-400 rounded-full animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={11} />
                        <span title={dateStr}>{time}</span>
                      </div>
                      {n.type && (() => {
                        const cat = getNotificationCategory(n);
                        const catClass = {
                          task: "bg-indigo-100 text-indigo-700",
                          target: "bg-sky-100 text-sky-700",
                          lead: "bg-teal-100 text-teal-700",
                          deal: "bg-orange-100 text-orange-700",
                          followup: "bg-amber-100 text-amber-700",
                          scheduled_email: "bg-purple-100 text-purple-700",
                        }[cat] || "bg-gray-100 text-gray-600";
                        return (
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${catClass}`}>
                            {CATEGORY_LABELS[cat] || n.type}
                          </span>
                        );
                      })()}
                      {isUnread && (
                        <span className="text-[10px] font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                          Unread
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination footer */}
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <span className="text-xs text-gray-500">
              Page {safePage} of {totalPages} &nbsp;·&nbsp; {filtered.length} total
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={15} />
              </button>

              {/* Page number pills */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && arr[idx - 1] !== p - 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, i) =>
                  item === "..." ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-gray-400 text-xs">…</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setPage(item)}
                      className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition-all ${
                        safePage === item
                          ? "bg-[#008ecc] text-white"
                          : "border border-gray-200 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
