import React, { useEffect, useState } from "react";
import {
  LifeBuoy,
  Search,
  Paperclip,
  X,
  Send,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "react-toastify";
import axios from "axios";
import { store } from "../../store/store";
import { initSuperAdminSocket } from "../../utils/superAdminSocket";
import Timeline from "../support/Timeline";

const SI_URI = import.meta.env.VITE_SI_URI || "http://localhost:5000";
const BASE = "/api/superadmin/support-tickets";

const supportTicketApi = axios.create({ baseURL: SI_URI });
supportTicketApi.interceptors.request.use((config) => {
  const { superAdminToken } = store.getState().auth;
  if (superAdminToken) {
    config.headers.Authorization = `Bearer ${superAdminToken}`;
  }
  return config;
});

const STATUS_OPTIONS = ["All", "Pending", "In Progress", "Closed"];
const PRIORITY_OPTIONS = ["All", "Low", "Medium", "High", "Urgent"];
const STATUS_STYLES = {
  Pending: "bg-amber-50 text-amber-700 border-amber-100",
  "In Progress": "bg-blue-50 text-blue-700 border-blue-100",
  Closed: "bg-green-50 text-green-700 border-green-200",
};
const PRIORITY_STYLES = {
  Low: "bg-slate-50 text-slate-600 border-slate-200",
  Medium: "bg-blue-50 text-blue-700 border-blue-100",
  High: "bg-amber-50 text-amber-700 border-amber-100",
  Urgent: "bg-red-50 text-red-700 border-red-200",
};
const PAGE_SIZE = 6;

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });

const StatusPill = ({ status }) => (
  <span
    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase ${
      STATUS_STYLES[status] || STATUS_STYLES.Pending
    }`}
  >
    {status}
  </span>
);

const PriorityPill = ({ priority }) => (
  <span
    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase ${
      PRIORITY_STYLES[priority] || PRIORITY_STYLES.Medium
    }`}
  >
    {priority}
  </span>
);

const SupportTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [activeTicket, setActiveTicket] = useState(null);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const { data } = await supportTicketApi.get(BASE, {
        params: { search, status: statusFilter, priority: priorityFilter, dateFrom, dateTo, page, limit: PAGE_SIZE },
      });
      setTickets(data.data || []);
      setTotal(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to load support tickets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, priorityFilter, dateFrom, dateTo, page]);

  const hasFilters = search || statusFilter !== "All" || priorityFilter !== "All" || dateFrom || dateTo;

  // New tickets / tenant follow-up messages push here live, so an already-open
  // queue or modal updates without the platform owner needing to refresh.
  useEffect(() => {
    // initSuperAdminSocket() (not getSuperAdminSocket()) — on a hard refresh of
    // this exact route, this component's mount effect can run before
    // SuperAdminLayout's, so getSuperAdminSocket() would still see null and
    // silently skip attaching the listener forever. initSuperAdminSocket() is
    // idempotent (returns the existing socket if the layout already made one),
    // so it's safe regardless of mount order.
    const socket = initSuperAdminSocket();

    const handleUpdate = (updated) => {
      setTickets((prev) => {
        const exists = prev.some((t) => t._id === updated._id);
        if (exists) return prev.map((t) => (t._id === updated._id ? updated : t));
        if (page === 1 && !hasFilters) {
          setTotal((t) => t + 1);
          return [updated, ...prev].slice(0, PAGE_SIZE);
        }
        return prev;
      });
      setActiveTicket((prev) => (prev && prev._id === updated._id ? updated : prev));
    };

    socket.on("support_ticket_updated", handleUpdate);
    return () => socket.off("support_ticket_updated", handleUpdate);
  }, [page, hasFilters]);
  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setPriorityFilter("All");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const updateTicketInList = (ticket) => {
    setTickets((prev) => prev.map((t) => (t._id === ticket._id ? ticket : t)));
    setActiveTicket((prev) => (prev && prev._id === ticket._id ? ticket : prev));
  };

  const updateStatus = async (id, status) => {
    try {
      const { data } = await supportTicketApi.patch(`${BASE}/${id}/status`, { status });
      updateTicketInList(data.data);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update status.");
    }
  };

  const updatePriority = async (id, priority) => {
    try {
      const { data } = await supportTicketApi.patch(`${BASE}/${id}/priority`, { priority });
      updateTicketInList(data.data);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update priority.");
    }
  };

  const sendMessage = async (id, text) => {
    try {
      const { data } = await supportTicketApi.post(`${BASE}/${id}/messages`, { text });
      updateTicketInList(data.data);
      return true;
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to send reply.");
      return false;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Support Tickets</h2>
          <p className="text-slate-500 text-sm">
            Tickets raised by tenant admins across all workspaces. {total} found.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by tenant admin, email or subject"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#008ecc] focus:bg-white transition-colors"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600 focus:outline-none focus:border-[#008ecc] cursor-pointer"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === "All" ? "All statuses" : s}
            </option>
          ))}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600 focus:outline-none focus:border-[#008ecc] cursor-pointer"
        >
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p === "All" ? "All priorities" : p}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
          <Calendar size={14} className="text-slate-400" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="text-sm text-slate-600 bg-transparent focus:outline-none cursor-pointer"
          />
          <span className="text-slate-300">–</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="text-sm text-slate-600 bg-transparent focus:outline-none cursor-pointer"
          />
        </div>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-slate-400 hover:text-red-500 flex items-center gap-1 cursor-pointer"
          >
            <X size={14} />
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center space-x-2">
          <LifeBuoy className="text-[#008ecc]" size={20} />
          <h3 className="text-base font-bold text-slate-800">Ticket Queue</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 uppercase text-xs font-bold border-b border-slate-200">
                <th className="px-6 py-4">Ticket</th>
                <th className="px-6 py-4">Tenant Admin</th>
                <th className="px-6 py-4">Subject</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-[#008ecc] border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : tickets.length > 0 ? (
                tickets.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-400 whitespace-nowrap">
                      {t._id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{t.submittedByName}</span>
                        <span className="text-xs text-slate-500">{t.submittedByEmail}</span>
                        {t.tenant_id?.name && (
                          <span className="text-xs text-slate-400">Workspace: {t.tenant_id.name}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <p className="truncate">{t.subject}</p>
                      {t.attachmentName && (
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                          <Paperclip size={11} />
                          {t.attachmentName}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{formatDate(t.createdAt)}</td>
                    <td className="px-6 py-4">
                      <PriorityPill priority={t.priority} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusPill status={t.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setActiveTicket(t)}
                        className="px-3 py-1.5 bg-[#008ecc] text-white rounded-lg font-bold text-xs hover:bg-[#007bb0] transition cursor-pointer shadow-sm whitespace-nowrap"
                      >
                        View / Reply
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-semibold">
                    No tickets match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 disabled:opacity-40 hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs text-slate-500 px-2">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 disabled:opacity-40 hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {activeTicket && (
        <TicketModal
          ticket={activeTicket}
          onClose={() => setActiveTicket(null)}
          onStatusChange={updateStatus}
          onPriorityChange={updatePriority}
          onSendMessage={sendMessage}
        />
      )}
    </div>
  );
};

const TicketModal = ({ ticket, onClose, onStatusChange, onPriorityChange, onSendMessage }) => {
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!reply.trim()) return;
    setSending(true);
    const ok = await onSendMessage(ticket._id, reply.trim());
    setSending(false);
    if (ok) setReply("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-800">{ticket.subject}</h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{ticket._id.slice(-6).toUpperCase()}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-900">{ticket.submittedByName}</p>
              <p className="text-xs text-slate-500">{ticket.submittedByEmail}</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={ticket.priority}
                onChange={(e) => onPriorityChange(ticket._id, e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 focus:outline-none focus:border-[#008ecc] cursor-pointer"
              >
                {PRIORITY_OPTIONS.filter((p) => p !== "All").map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <select
                value={ticket.status}
                onChange={(e) => onStatusChange(ticket._id, e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 focus:outline-none focus:border-[#008ecc] cursor-pointer"
              >
                {STATUS_OPTIONS.filter((s) => s !== "All").map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <Timeline entries={ticket.timeline} viewerSender="platform" />
          </div>
        </div>

        <div className="flex items-end gap-2 px-6 py-4 border-t border-slate-100 shrink-0">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={1}
            placeholder="Type a response for the tenant admin..."
            className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#008ecc] focus:bg-white transition-colors resize-none text-slate-800"
          />
          <button
            onClick={handleSend}
            disabled={!reply.trim() || sending}
            className="flex items-center gap-2 px-4 py-2 bg-[#008ecc] hover:bg-[#007bb0] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg transition cursor-pointer flex-shrink-0"
          >
            <Send size={13} />
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupportTickets;
