import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useSocket } from "../../context/SocketContext";
import { useTargetSocket } from "../../context/TargetSocketContext";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNotifications } from "../../context/NotificationContext";
import { isDateOverdue } from "../../utils/dateValidation";
import {
  Target, Users, Phone, TrendingUp, Calendar, CheckCircle,
  Trophy, ArrowRight, Award, Clock, ChevronDown,
  ChevronUp, Briefcase, Mail, Building2, Send, MessageSquare,
  Bell, AlertCircle, Check, XCircle, X, Trash2, Activity, List, LayoutGrid, DollarSign, Flag, Info, CheckCheck
} from "lucide-react";

import TargetPipelineView from "./TargetPipelineView";
import ReportCallModal from "./components/ReportCallModal";
import ReportMeetingModal from "./components/ReportMeetingModal";
import ViewReportsModal from "./components/ViewReportsModal";

const SI_URI = import.meta.env.VITE_SI_URI || "http://localhost:5000";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Animates from 0 up to the real value on every mount/update instead of
// snapping straight to it — a CSS transition only plays on a style change
// *after* the browser has painted the previous value, so a single rAF isn't
// reliable (it can still land in the same paint as the initial 0 render);
// nesting two rAFs guarantees a 0%-width frame is actually painted first,
// so the next style change to the real value is a genuine transition.
function ProgressBar({ value, color = "bg-[#008ecc]" }) {
  const target = Math.min(100, value);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    setWidth(0);
    let raf2;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setWidth(target));
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [target]);
  return (
    <div className="w-full bg-gray-100 rounded-full h-2.5">
      <div className={`h-2.5 rounded-full transition-all duration-700 ease-out ${color}`}
        style={{ width: `${width}%` }} />
    </div>
  );
}
function StatCard({ label, value, icon, color, bg }) {
  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <div className={`mb-1 ${color}`}>{icon}</div>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
function getProgressColor(pct) {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 50) return "bg-amber-400";
  return "bg-red-400";
}
function getTextColor(pct) {
  if (pct >= 80) return "text-emerald-600";
  if (pct >= 50) return "text-amber-600";
  return "text-red-500";
}
function fmt(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtTime(date) {
  if (!date) return "";
  return new Date(date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

const STAGE_COLOR = {
  Qualification: "bg-blue-100 text-blue-700 border-blue-200",
  "Proposal Sent-Negotiation": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Invoice Sent": "bg-orange-100 text-orange-700 border-orange-200",
  "Closed Won": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Closed Lost": "bg-red-100 text-red-600 border-red-200",
};

// Who converted/worked this deal, from the viewing sales person's own
// perspective — "You" when it was their own action, the admin's name when it
// wasn't. Converting and moving stages later are different actions and get
// distinct, specific wording. Rendered on its own line (never inline with the
// name) so a long name never squeezes the deal/lead name down to nothing.
function getAdminActionBadge(d) {
  if (d.convertedByName) {
    const text = d.salesPersonConverted ? "You converted lead to deal" : `Admin ${d.convertedByName} converted lead to deal`;
    return { text, title: text };
  }
  if (d.takenByAdminName) {
    return { text: `Admin ${d.takenByAdminName} took this deal`, title: `This deal has been worked on by Admin ${d.takenByAdminName}` };
  }
  return null;
}
const STAGE_DOT = {
  Qualification: "bg-blue-400",
  "Proposal Sent-Negotiation": "bg-yellow-400",
  "Invoice Sent": "bg-orange-400",
  "Closed Won": "bg-emerald-500",
  "Closed Lost": "bg-red-400",
};
const LEAD_STATUS_COLOR = {
  New: "bg-blue-100 text-blue-700",
  Contacted: "bg-cyan-100 text-cyan-700",
  Interested: "bg-yellow-100 text-yellow-700",
  Qualified: "bg-green-100 text-green-700",
  Converted: "bg-emerald-100 text-emerald-700",
  Cold: "bg-gray-100 text-gray-600",
  "Not Interested": "bg-red-100 text-red-600",
};

/* ── Notes Section ──────────────────── */
function NotesSection({ target, baseUrl, headers, onNoteAdded }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await axios.post(`${baseUrl}/targets/${target._id}/notes`, { text }, { headers });
      setText("");
      toast.success("Note sent to admin");
      onNoteAdded();
    } catch {
      toast.error("Failed to send note");
    } finally { setSending(false); }
  };

  return (
    <div className="mt-4 border-t border-gray-100 pt-4 space-y-3">
      <p className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
        <MessageSquare size={12} className="text-[#008ecc]" /> Notes to Admin
      </p>

      {/* Existing notes */}
      {target.notes?.length > 0 && (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {[...target.notes].reverse().map((n, i) => (
            <div key={i} className="bg-gray-50 border border-gray-100 rounded-xl p-2.5">
              <p className="text-xs text-gray-700 leading-relaxed">{n.text}</p>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <Clock size={8} /> {fmt(n.addedAt)} {fmtTime(n.addedAt)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Add note */}
      <div className="flex gap-2">
        <textarea
          rows={2}
          placeholder="Type a note — e.g. why progress is delayed, blockers, updates..."
          value={text}
          onChange={e => setText(e.target.value)}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-[#008ecc]/30 focus:border-[#008ecc] placeholder:text-gray-300"
        />
        <button onClick={send} disabled={sending || !text.trim()}
          className="px-3 py-2 bg-[#008ecc] text-white rounded-xl hover:bg-[#0077aa] disabled:opacity-50 flex items-center gap-1 text-xs font-semibold shrink-0">
          <Send size={12} /> {sending ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}

/* ── Report Checkbox — self-contained per lead/deal ─────────────────────── */
function ReportBox({ targetId, itemType, itemId, itemName, itemDetails = {}, baseUrl, headers, isReported = false }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [localReported, setLocalReported] = useState(false);

  const send = async () => {
    if (!note.trim()) return;
    setSending(true);
    try {
      await axios.post(`${baseUrl}/targets/${targetId}/reason-note`,
        {
          itemType, itemId, itemName, note,
          companyName: itemDetails.companyName || "",
          phoneNumber: itemDetails.phoneNumber || "",
          email: itemDetails.email || "",
          value: itemDetails.value || "",
          currency: itemDetails.currency || "",
          stageOrStatus: itemDetails.statusLabel || "",
        }, { headers });
      toast.success("Issue reported to admin");
      setOpen(false);
      setNote("");
      setLocalReported(true); // immediately show reported badge — no refresh needed
    } catch {
      toast.error("Failed to report issue");
    } finally {
      setSending(false);
    }
  };

  // Already reported — show disabled badge (either from server data or just submitted)
  if (isReported || localReported) {
    return (
      <div className="mt-2 flex items-center gap-2 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="w-4 h-4 rounded border-2 border-amber-400 bg-amber-400 flex items-center justify-center shrink-0">
          <Check size={10} className="text-white" strokeWidth={3} />
        </div>
        <span className="text-xs text-amber-700 font-semibold">Reported — Pending admin review</span>
      </div>
    );
  }

  return (
    <div className="mt-2" onClick={e => e.stopPropagation()}>
      {/* Checkbox toggle */}
      <label className="inline-flex items-center gap-1.5 cursor-pointer select-none group">
        <div
          role="checkbox"
          aria-checked={open}
          tabIndex={0}
          onClick={() => setOpen(v => !v)}
          onKeyDown={e => e.key === " " && setOpen(v => !v)}
          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0 ${open ? "bg-rose-500 border-rose-500" : "border-gray-400 bg-white group-hover:border-rose-400"}`}>
          {open && <Check size={10} className="text-white" strokeWidth={3} />}
        </div>
        <span onClick={() => setOpen(v => !v)}
          className={`text-xs font-semibold transition-colors cursor-pointer ${open ? "text-rose-600" : "text-gray-400 group-hover:text-rose-500"}`}>
          Report Issue
        </span>
      </label>

      {/* Expanded details + note form */}
      {open && (
        <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 overflow-hidden">
          {/* Details summary */}
          <div className="px-3 py-2.5 bg-rose-100 border-b border-rose-200">
            <p className="text-xs font-bold text-rose-700 uppercase tracking-wide mb-2 flex items-center gap-1">
              {itemType === "deal" ? <Briefcase size={9} /> : <Users size={9} />}
              {itemType === "deal" ? "Deal" : "Lead"} Details
            </p>
            <p className="text-xs font-bold text-gray-800 mb-1">{itemName}</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              {itemDetails.companyName && (
                <span className="text-xs text-gray-600 flex items-center gap-0.5"><Building2 size={8} />{itemDetails.companyName}</span>
              )}
              {itemDetails.value && (
                <span className="text-xs font-bold text-gray-700">{itemDetails.currency || ""} {itemDetails.value}</span>
              )}
              {itemDetails.phoneNumber && (
                <span className="text-xs text-gray-600 flex items-center gap-0.5"><Phone size={8} />{itemDetails.phoneNumber}</span>
              )}
              {itemDetails.email && (
                <span className="text-xs text-gray-500 flex items-center gap-0.5 truncate col-span-2"><Mail size={8} />{itemDetails.email}</span>
              )}
            </div>
            {itemDetails.statusLabel && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${itemDetails.statusColor || "bg-gray-100 text-gray-600"}`}>
                  {itemDetails.statusLabel}
                </span>
                {itemDetails.dateNote && <span className="text-xs text-gray-400">{itemDetails.dateNote}</span>}
              </div>
            )}
          </div>

          {/* Note textarea */}
          <div className="px-3 py-2.5 space-y-2">
            <p className="text-xs font-semibold text-rose-700">
              Describe why this {itemType === "deal" ? "deal" : "lead"} is delayed or stuck — admin will review and may reassign.
            </p>
            <textarea
              rows={3}
              autoFocus
              placeholder={itemType === "deal"
                ? "e.g. Deal stuck at negotiation, client not responding for 2 weeks..."
                : "e.g. Lead not responding, seems uninterested, needs reassignment..."}
              className="w-full border border-rose-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none bg-white"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setOpen(false); setNote(""); }}
                className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={send} disabled={!note.trim() || sending}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-rose-500 text-white rounded-lg disabled:opacity-50 hover:bg-rose-600 transition-colors">
                <Send size={10} /> {sending ? "Sending…" : "Send to Admin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── My Target Card ─────────────────────── */
function MyTargetCard({ target: t, baseUrl, headers, onRefresh, hasUnread, autoExpand, tasks, onOpenReport, onViewReports }) {
  const [expanded, setExpanded] = useState(false);
  // Each item's expand/collapse is fully independent — a Set of open keys,
  // not a single shared value, so opening one item never affects any other.
  const [expandedItems, setExpandedItems] = useState(() => new Set());
  const toggleExpand = (key) => setExpandedItems(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });
  const cardRef = useRef(null);

  // Sales can remove their own already-completed cards (Closed Won/Lost, Converted leads)
  const handleRemoveCompleted = async (e, type, itemId, itemName) => {
    e.stopPropagation();
    if (!window.confirm(`Remove "${itemName}" from this target? This only clears it from your target view.`)) return;
    try {
      await axios.post(`${baseUrl}/targets/${t._id}/unlink-item`, { type, itemId }, { headers });
      toast.success("Removed from target");
      onRefresh?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove");
    }
  };

  const { percentages = {}, actuals = {} } = t;

  useEffect(() => {
    if (autoExpand) {
      setExpanded(true);
      setTimeout(() => cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [autoExpand]);
  const overall = percentages.overall || 0;

  // linkedLeads: existing leads (not yet converted); convertedLeadDeals: deals created from converted linked leads.
  // Converted leads are excluded here since they already render as their
  // resulting deal via convertedLeadDeals — otherwise the same conversion
  // shows up twice.
  const linkedLeads = (t.linkedLeads || []).filter(Boolean).filter(l => l.status !== "Converted");
  const convertedLeadDeals = (t.convertedLeadDeals || []);
  const allLinkedLeadsCount = linkedLeads.length + convertedLeadDeals.length;
  const convertedLeadsCount = convertedLeadDeals.length;
  // Only count conversions the sales person actually did themselves for the
  // success badge — admin-driven conversions get their own "Converted by Admin" tag instead.
  const selfConvertedCount = convertedLeadDeals.filter(d => d.salesPersonConverted !== false).length;
  const linkedDeals = (t.linkedDeals || []).filter(Boolean);

  const activeTasks = (tasks || []).filter(task => task.status !== "Completed" && (task.assignedTo?._id || task.assignedTo) === (t.salesPerson?._id || t.salesPerson));

  // convertedLeadDeals always carries conversion attribution reliably (it's looked
  // up by leadId); borrow it here in case the same deal shows up in linkedDeals
  // via a path that didn't already have convertedByName/salesPersonConverted set.
  const convertedInfoById = new Map(convertedLeadDeals.map(cd => [String(cd._id), cd]));
  const withConversionInfo = (d) => {
    const match = convertedInfoById.get(String(d._id));
    if (!match) return d;
    return {
      ...d,
      convertedByName: d.convertedByName ?? match.convertedByName ?? null,
      salesPersonConverted: d.salesPersonConverted ?? match.salesPersonConverted ?? null,
    };
  };

  const wonDeals    = linkedDeals.filter(d => d.stage === "Closed Won").map(withConversionInfo);
  const liveDeals   = linkedDeals.filter(d => d.stage !== "Closed Won" && d.stage !== "Closed Lost").map(withConversionInfo);

  const metrics = [
    { label: "Leads to Deals Converted", target: percentages.effTargetLeads ?? t.targetLeads, actual: actuals.leadsConverted || 0, pct: percentages.leadsPercent || 0, icon: <Users size={13} className="text-blue-500" />, bg: "bg-blue-50", border: "border-blue-100", countOnly: false },
    { label: "Deal Closed", target: percentages.effTargetDeals ?? t.targetDeals, actual: actuals.dealsWon || 0, pct: percentages.dealsPercent || 0, icon: <DollarSign size={13} className="text-green-500" />, bg: "bg-green-50", border: "border-green-100", countOnly: false },
    { label: "Leads to Deal Closed", target: percentages.effTargetLeads ?? t.targetLeads, actual: actuals.leadDealWon || 0, pct: percentages.leadDealWonPercent || 0, icon: <TrendingUp size={13} className="text-purple-500" />, bg: "bg-purple-50", border: "border-purple-100", countOnly: false, specialZeroMessage: "No converted lead is moved to closed deal" },
    { label: "Deal Lost", target: null, actual: actuals.dealsLost || 0, pct: null, icon: <XCircle size={13} className="text-red-500" />, bg: "bg-red-50", border: "border-red-100", countOnly: true, badgeText: "deal lost", badgeClass: "text-red-600 bg-red-100" },
    { label: "Calls Made", type: "call", target: t.targetCalls, actual: actuals.calls || 0, pct: percentages.callsPercent || 0, icon: <Phone size={13} className="text-orange-500" />, bg: "bg-orange-50", border: "border-orange-100", countOnly: false },
    { label: "Meetings Done", type: "meeting", target: t.targetMeetings, actual: actuals.meetings || 0, pct: percentages.meetingsPercent || 0, icon: <Activity size={13} className="text-purple-500" />, bg: "bg-purple-50", border: "border-purple-100", countOnly: false },
  ];

  return (
    <div ref={cardRef} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className={`h-1.5 w-full ${getProgressColor(overall)}`} />

      <div className="p-5">
        {/* Header: Title */}
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-bold text-gray-800 text-lg truncate pr-2">
            {t.title || "Untitled Target"}
          </h3>
          <div className="flex items-center gap-1 text-[11px] text-gray-400 shrink-0">
            <Calendar size={10} /><span>{fmt(t.startDate)} — {fmt(t.endDate)}</span>
          </div>
        </div>

        {/* Period + dates */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-md font-medium border ${t.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : t.status === 'In Progress' ? 'bg-amber-50 text-amber-600 border-amber-200' : t.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>{t.status || "New"}</span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold capitalize ${t.period === "weekly" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
              {t.period}
            </span>
          </div>
        </div>

        {/* Admin description / note */}
        {t.description && (
          <div className="mx-4 mb-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 flex items-start gap-2">
            <MessageSquare size={12} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-0.5">Note from Admin</p>
              <p className="text-xs text-amber-800 font-medium leading-relaxed">{t.description}</p>
            </div>
          </div>
        )}

        {/* Overall hero */}
        <div className={`rounded-xl p-4 mb-4 ${overall >= 80 ? "bg-emerald-50 border border-emerald-100" : overall >= 50 ? "bg-amber-50 border border-amber-100" : "bg-red-50 border border-red-100"}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-700"><Trophy size={15} className={getTextColor(overall)} /> {overall >= 100 ? "Target Completed" : "Overall Progress"}</span>
            <span className={`text-2xl font-bold ${getTextColor(overall)}`}>{overall}%</span>
          </div>
          <ProgressBar value={overall} color={getProgressColor(overall)} />
          <p className="text-xs text-gray-400 mt-1.5">
            {overall >= 100 ? "🎉 Target achieved!" : overall >= 80 ? "Almost there — keep going!" : overall >= 50 ? "Good progress — stay focused!" : "Keep pushing — you can do it!"}
          </p>
        </div>

        {/* Metric mini-cards */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          {metrics.map((m) => (
            <div key={m.label} className={`rounded-xl border p-3 ${m.bg} ${m.border}`}>
              <div className="flex items-center gap-1.5 mb-1.5">{m.icon}<span className="text-xs font-medium text-gray-600">{m.label}</span></div>
              {m.countOnly ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold text-gray-800">{m.actual}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${m.badgeClass}`}>{m.badgeText}</span>
                </div>
              ) : (
                <>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-lg font-bold text-gray-800">{m.actual}</span>
                    <span className="text-xs text-gray-400">/ {m.target}</span>
                  </div>
                  {m.specialZeroMessage && m.actual === 0 ? (
                    <div className="mt-2 text-center text-xs font-semibold text-purple-600 bg-purple-100/50 py-1.5 rounded border border-purple-100">
                      {m.specialZeroMessage}
                    </div>
                  ) : (
                    <>
                      <ProgressBar value={m.pct} color={getProgressColor(m.pct)} />
                      <p className={`text-xs font-bold mt-1 ${getTextColor(m.pct)}`}>{m.pct}%</p>
                    </>
                  )}
                  {(m.type === "call" || m.type === "meeting") && m.target > 0 && (
                    m.actual >= m.target ? (
                      <div className="mt-2 text-center text-xs font-semibold text-emerald-600 bg-emerald-50 py-1.5 rounded border border-emerald-100">
                        Targeted {m.type}s are completed
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); onOpenReport(t._id, m.type); }}
                        className="mt-2 w-full text-xs font-bold py-1 border border-gray-200 rounded text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        + Add Report
                      </button>
                    )
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Won deals quick summary */}
        {wonDeals.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mb-3">
            <p className="text-xs font-bold text-emerald-700 mb-2 flex items-center gap-1"><Award size={12} /> {wonDeals.length} Deal{wonDeals.length > 1 ? "s" : ""} Won</p>
            <div className="space-y-1.5">
              {wonDeals.map((d) => {
                const daysTaken = d.wonAt && d.createdAt
                  ? Math.max(0, Math.round((new Date(d.wonAt) - new Date(d.createdAt)) / 86400000))
                  : undefined;
                return (
                  <div key={d._id} className="flex items-start gap-2">
                    <CheckCircle size={11} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{d.dealName || d.dealTitle}</p>
                      <div className="flex flex-wrap gap-2 mt-0.5">
                        {d.wonAt && <span className="text-xs text-gray-500 flex items-center gap-0.5"><Calendar size={8} />{fmt(d.wonAt)}</span>}
                        {daysTaken !== undefined && (
                          <span className="text-xs text-emerald-600 font-medium flex items-center gap-0.5">
                            <Clock size={8} />{daysTaken === 0 ? "Same day" : `${daysTaken}d to close`}
                          </span>
                        )}
                        {d.value && <span className="text-xs font-bold text-emerald-700">{d.currency} {d.value}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Notes badge */}
        {t.notes?.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
            <MessageSquare size={11} className="text-[#008ecc]" />
            <span>{t.notes.length} note{t.notes.length > 1 ? "s" : ""} sent to admin</span>
          </div>
        )}

        {/* Expand toggle */}
        <button onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center justify-center gap-1.5 text-sm font-bold text-gray-800 hover:text-[#008ecc] py-2 border-t border-gray-100 transition-colors relative">
          {expanded ? <><ChevronUp size={15} /> Hide Details</> : (
            <>
              <ChevronDown size={15} /> View Leads, Deals & Notes
              {hasUnread && !expanded && (
                <span className="ml-1.5 flex items-center gap-1 bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                  New
                </span>
              )}
            </>
          )}
        </button>

        {expanded && (
          <div className="mt-4 space-y-4">



            {/* ── Won Deals — accordion style ── */}
            {wonDeals.length > 0 && (
              <div>
                <p className="text-xs font-bold text-emerald-700 mb-2 flex items-center gap-1.5">
                  <Award size={13} className="text-emerald-500" /> Deal Closed ({wonDeals.length})
                </p>
                <div className={`space-y-2 ${wonDeals.length > 3 ? "max-h-80 overflow-y-auto pr-1" : ""}`}>
                  {wonDeals.map((d, i) => {
                    const createdDate   = d.createdAt   ? new Date(d.createdAt)   : null;
                    const convertedDate = d.convertedAt ? new Date(d.convertedAt) : createdDate;
                    const wonDate       = d.wonAt       ? new Date(d.wonAt)       : null;
                    const totalDays     = wonDate && createdDate ? Math.max(0, Math.round((wonDate - createdDate) / 86400000)) : null;
                    const stageHistory  = (d.stageHistory || []).sort((a, b) => new Date(a.movedAt) - new Date(b.movedAt));
                    const isOpen = expandedItems.has(`won-${i}`);
                    const adminBadge = getAdminActionBadge(d);
                    return (
                      <div key={d._id} className="bg-emerald-50 border border-emerald-200 rounded-2xl overflow-hidden">
                        {/* Accordion header — always visible */}
                        <div className="flex items-center gap-1 px-3 pt-3 pb-0">
                          <button type="button" onClick={() => toggleExpand(`won-${i}`)} className="flex-1 text-left pb-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs bg-emerald-200 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full shrink-0">#{i+1}</span>
                              <p className="text-sm font-bold text-gray-800 truncate flex-1">{d.dealName || d.dealTitle}</p>
                              <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                              {isOpen ? <ChevronUp size={13} className="text-emerald-600 shrink-0" /> : <ChevronDown size={13} className="text-gray-400 shrink-0" />}
                            </div>
                            {adminBadge && (
                              <span className="inline-block text-xs bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded-full border border-orange-200 mt-1" title={adminBadge.title}>
                                {adminBadge.text}
                              </span>
                            )}
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                              {d.companyName && <span className="text-xs text-gray-500 flex items-center gap-1"><Building2 size={8} />{d.companyName}</span>}
                              {d.value && <span className="text-xs font-bold text-emerald-700">{d.currency || "INR"} {d.value}</span>}
                              {totalDays !== null && <span className="text-xs text-emerald-600 flex items-center gap-0.5"><Clock size={8} />{totalDays === 0 ? "Same day" : `${totalDays}d to close`}</span>}
                            </div>
                          </button>
                          
                        </div>

                        {/* Accordion body */}
                        {isOpen && (
                          <div className="border-t border-emerald-100">
                            <div className="px-3 py-2 bg-white/70 flex flex-wrap gap-x-4 gap-y-1">
                              {d.phoneNumber && <span className="text-xs text-gray-600 flex items-center gap-1"><Phone size={9} className="text-emerald-400" />{d.phoneNumber}</span>}
                              {d.email && <span className="text-xs text-gray-600 flex items-center gap-1 truncate max-w-[180px]"><Mail size={9} className="text-emerald-400" />{d.email}</span>}
                              {wonDate && <span className="text-xs text-emerald-700 flex items-center gap-1 font-medium"><Calendar size={9} className="text-emerald-500" />Won: {fmt(wonDate)}</span>}
                            </div>

                            <div className="border-t border-emerald-100 px-3 py-2.5 bg-white/60 space-y-1.5">
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Stage Journey</p>
                              {createdDate && (
                                <div className="flex items-start gap-2">
                                  <div className="w-2 h-2 rounded-full bg-gray-400 mt-0.5 shrink-0" />
                                  <div>
                                    <span className="text-xs font-semibold text-gray-600">Lead Created</span>
                                    <p className="text-xs text-gray-700 font-semibold">{fmt(createdDate)} {fmtTime(createdDate)}</p>
                                  </div>
                                </div>
                              )}
                              {convertedDate && createdDate && Math.abs(convertedDate - createdDate) > 60000 && (
                                <div className="flex items-start gap-2 pl-1">
                                  <div className="flex flex-col items-center gap-0.5">
                                    <div className="w-px h-2 bg-gray-200" />
                                    <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                                  </div>
                                  <div>
                                    <span className="text-xs font-semibold text-indigo-700">Lead → Deal Converted</span>
                                    <span className="text-xs text-indigo-400 ml-1">(+{Math.max(0, Math.round((convertedDate - createdDate) / 86400000))}d)</span>
                                    <p className="text-xs text-gray-700 font-semibold">{fmt(convertedDate)} {fmtTime(convertedDate)}</p>
                                  </div>
                                </div>
                              )}
                              {createdDate && (
                                <div className="flex items-start gap-2 pl-1">
                                  <div className="flex flex-col items-center gap-0.5">
                                    <div className="w-px h-2 bg-gray-200" />
                                    <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                                  </div>
                                  <div>
                                    <span className="text-xs font-semibold text-gray-700">Qualification</span>
                                    <span className="text-xs text-gray-400 ml-1">(deal start)</span>
                                    <p className="text-xs text-gray-400">{fmt(convertedDate || createdDate)} {fmtTime(convertedDate || createdDate)}</p>
                                  </div>
                                </div>
                              )}
                              {stageHistory.map((h, hi) => {
                                const prev = hi === 0 ? createdDate : new Date(stageHistory[hi - 1].movedAt);
                                const diff = prev ? Math.max(0, Math.round((new Date(h.movedAt) - prev) / 86400000)) : null;
                                return (
                                  <div key={hi} className="flex items-start gap-2 pl-1">
                                    <div className="flex flex-col items-center gap-0.5">
                                      <div className="w-px h-2 bg-gray-200" />
                                      <div className={`w-2 h-2 rounded-full ${STAGE_DOT[h.stage] || "bg-gray-300"} shrink-0`} />
                                    </div>
                                    <div>
                                      <span className="text-xs font-semibold text-gray-700">{h.stage}</span>
                                      {diff !== null && <span className="text-xs text-gray-400 ml-1">({diff === 0 ? "same day" : `+${diff}d`})</span>}
                                      <p className="text-xs text-gray-700 font-semibold">{fmt(h.movedAt)} {fmtTime(h.movedAt)}</p>
                                    </div>
                                  </div>
                                );
                              })}
                              {/* Always show Closed Won as final step — stageHistory may not include it if recorded before fix */}
                              {wonDate && !stageHistory.some(h => h.stage === "Closed Won") && (
                                <div className="flex items-start gap-2 pl-1">
                                  <div className="flex flex-col items-center gap-0.5">
                                    <div className="w-px h-2 bg-gray-200" />
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                  </div>
                                  <div>
                                    <span className="text-xs font-semibold text-emerald-700">Closed Won</span>
                                    <p className="text-xs text-gray-700 font-semibold">{fmt(wonDate)} {fmtTime(wonDate)}</p>
                                  </div>
                                </div>
                              )}
                            </div>

                            {totalDays !== null && (
                              <div className="px-3 py-2 bg-emerald-100/70 flex items-center gap-1.5">
                                <Clock size={11} className="text-emerald-600 shrink-0" />
                                <p className="text-xs font-bold text-emerald-700">
                                  {totalDays === 0 ? "Closed same day" : `Total: ${totalDays} day${totalDays !== 1 ? "s" : ""} from deal creation to won`}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Lost deals — detailed accordion */}
            {(() => {
              const lostDeals = [...linkedDeals.filter(d => d.stage === "Closed Lost"), ...convertedLeadDeals.filter(d => d.stage === "Closed Lost")];
              return lostDeals.length > 0 ? (
                <div>
                  <p className="text-xs font-bold text-red-700 mb-2 flex items-center gap-1.5"><XCircle size={12} className="text-red-500" /> Deal Lost ({lostDeals.length})</p>
                  <div className="space-y-2">
                    {lostDeals.map((d, i) => {
                      const createdDate  = d.createdAt ? new Date(d.createdAt) : null;
                      const lostDate     = d.stageLostAt ? new Date(d.stageLostAt) : (d.updatedAt ? new Date(d.updatedAt) : null);
                      const totalDays    = lostDate && createdDate ? Math.max(0, Math.round((lostDate - createdDate) / 86400000)) : null;
                      const stageHistory = (d.stageHistory || []).sort((a, b) => new Date(a.movedAt) - new Date(b.movedAt));
                      const isOpen = expandedItems.has(`lost-${i}`);
                      const adminBadge = getAdminActionBadge(d);
                      return (
                        <div key={d._id} className="bg-red-50 border border-red-200 rounded-2xl overflow-hidden">
                          <div className="w-full px-3 pt-3 pb-2.5 flex items-start gap-1.5">
                            <button type="button" onClick={() => toggleExpand(`lost-${i}`)} className="flex-1 min-w-0 text-left">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs bg-red-200 text-red-800 font-bold px-1.5 py-0.5 rounded-full shrink-0">#{i+1}</span>
                                <p className="text-sm font-bold text-gray-800 truncate flex-1">{d.dealName || d.dealTitle}</p>
                                <XCircle size={13} className="text-red-500 shrink-0" />
                                {isOpen ? <ChevronUp size={13} className="text-red-600 shrink-0" /> : <ChevronDown size={13} className="text-gray-400 shrink-0" />}
                              </div>
                              {adminBadge && (
                                <span className="inline-block text-xs bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded-full border border-orange-200 mt-1 mr-1" title={adminBadge.title}>
                                  {adminBadge.text}
                                </span>
                              )}
                              {activeTasks.some(task => task.dealRefs?.some(ref => (ref._id || ref) === d._id) || (task.dealRef?._id || task.dealRef) === d._id) && (
                                <span className="inline-flex text-xs bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded-full border border-purple-200 mt-1 w-fit items-center gap-1"><Flag size={9}/>Linked to active Task</span>
                              )}
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                                {d.companyName && <span className="text-xs text-gray-500 flex items-center gap-1"><Building2 size={8} />{d.companyName}</span>}
                                {d.value && <span className="text-xs font-bold text-red-700">{d.currency || "INR"} {d.value}</span>}
                                {totalDays !== null && <span className="text-xs text-red-600 flex items-center gap-0.5"><Clock size={8} />{totalDays === 0 ? "Same day" : `${totalDays}d in pipeline`}</span>}
                                {d.lossReason && <span className="text-xs text-red-600 font-medium">Reason: {d.lossReason}</span>}
                              </div>
                            </button>

                          </div>
                          {isOpen && (
                            <div className="border-t border-red-100">
                              <div className="px-3 py-2 bg-white/70 flex flex-wrap gap-x-4 gap-y-1">
                                {d.phoneNumber && <span className="text-xs text-gray-500 flex items-center gap-1"><Phone size={9} className="text-red-400" />{d.phoneNumber}</span>}
                                {d.email && <span className="text-xs text-gray-500 flex items-center gap-1 truncate max-w-[180px]"><Mail size={9} className="text-red-400" />{d.email}</span>}
                              </div>
                              {(stageHistory.length > 0 || createdDate) && (
                                <div className="px-3 py-2.5 bg-white/60 space-y-1.5 border-t border-red-100">
                                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Stage Journey</p>
                                  {createdDate && (
                                    <div className="flex items-start gap-2">
                                      <div className={`w-2 h-2 rounded-full ${STAGE_DOT["Qualification"] || "bg-gray-300"} mt-0.5 shrink-0`} />
                                      <div>
                                        <span className="text-xs font-semibold text-gray-700">Qualification</span>
                                        <span className="text-xs text-gray-400 ml-1">(created)</span>
                                        <p className="text-xs text-gray-700 font-semibold">{fmt(createdDate)} {fmtTime(createdDate)}</p>
                                      </div>
                                    </div>
                                  )}
                                  {stageHistory.map((h, hi) => {
                                    const prev = hi === 0 ? createdDate : new Date(stageHistory[hi - 1].movedAt);
                                    const daysDiff = prev ? Math.max(0, Math.round((new Date(h.movedAt) - prev) / 86400000)) : null;
                                    return (
                                      <div key={hi} className="flex items-start gap-2 pl-1">
                                        <div className="flex flex-col items-center gap-0.5">
                                          <div className="w-px h-2 bg-gray-200" />
                                          <div className={`w-2 h-2 rounded-full ${STAGE_DOT[h.stage] || "bg-gray-300"} shrink-0`} />
                                        </div>
                                        <div>
                                          <span className="text-xs font-semibold text-gray-700">{h.stage}</span>
                                          {daysDiff !== null && <span className="text-xs text-gray-400 ml-1">({daysDiff === 0 ? "same day" : `+${daysDiff}d`})</span>}
                                          <p className="text-xs text-gray-700 font-semibold">{fmt(h.movedAt)} {fmtTime(h.movedAt)}</p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {totalDays !== null && (
                                <div className="px-3 py-2 bg-red-100/70 flex items-center gap-1.5">
                                  <Clock size={10} className="text-red-600 shrink-0" />
                                  <p className="text-xs font-bold text-red-700">
                                    {totalDays === 0 ? "Lost same day" : `Total: ${totalDays} day${totalDays !== 1 ? "s" : ""} in pipeline before lost`}
                                  </p>
                                </div>
                              )}
                              {d.lossNotes && (
                                <div className="px-3 py-2 bg-red-50/80 border-t border-red-100">
                                  <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-0.5">Loss Notes</p>
                                  <p className="text-xs text-gray-600">{d.lossNotes}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Live deals — accordion */}
            {liveDeals.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1"><Briefcase size={11} /> Active Deals ({liveDeals.length})</p>
                <div className={`space-y-2 ${liveDeals.length > 3 ? "max-h-80 overflow-y-auto pr-1" : ""}`}>
                  {liveDeals.map((d, i) => {
                    const stageHistory = (d.stageHistory || []).sort((a, b) => new Date(a.movedAt) - new Date(b.movedAt));
                    const daysInPipeline = d.createdAt ? Math.max(0, Math.round((Date.now() - new Date(d.createdAt)) / 86400000)) : null;
                    const isOpen = expandedItems.has(`active-${i}`);
                    const adminBadge = getAdminActionBadge(d);
                    return (
                      <div key={d._id} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                        <button type="button" onClick={() => toggleExpand(`active-${i}`)} className="w-full text-left p-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-gray-800 truncate flex-1">{d.dealName || d.dealTitle}</p>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${STAGE_COLOR[d.stage] || "bg-gray-100 text-gray-500"}`}>{d.stage}</span>
                              {isOpen ? <ChevronUp size={12} className="text-gray-500" /> : <ChevronDown size={12} className="text-gray-400" />}
                            </div>
                          </div>
                          {adminBadge && (
                            <span className="inline-block text-xs bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded border border-orange-200 w-fit" title={adminBadge.title}>{adminBadge.text}</span>
                          )}
                          {activeTasks.some(task => task.dealRefs?.some(ref => (ref._id || ref) === d._id) || (task.dealRef?._id || task.dealRef) === d._id) && (
                            <span className="inline-flex text-xs bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded border border-purple-200 w-fit items-center gap-1"><Flag size={9}/>Linked to active Task</span>
                          )}
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                            {d.companyName && <span className="text-xs text-gray-400 flex items-center gap-0.5"><Building2 size={8} />{d.companyName}</span>}
                            {d.value && <span className="text-xs font-bold text-gray-700">{d.currency} {d.value}</span>}
                          </div>
                        </button>
                        <div className="px-2.5 pb-2.5">
                          <ReportBox
                            targetId={t._id} itemType="deal" itemId={d._id} itemName={d.dealName || d.dealTitle}
                            itemDetails={{ companyName: d.companyName, value: d.value, currency: d.currency, phoneNumber: d.phoneNumber, email: d.email, statusLabel: d.stage, statusColor: STAGE_COLOR[d.stage], dateNote: d.createdAt ? `since ${fmt(d.createdAt)}` : null }}
                            baseUrl={baseUrl} headers={headers}
                            isReported={(t.reasonNotes || []).some(n => String(n.itemId) === String(d._id) && n.status === "pending")} />
                        </div>
                        {isOpen && (
                          <div className="px-2.5 pb-2.5 border-t border-gray-100 pt-2 space-y-1.5">
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                              {d.phoneNumber && <span className="text-xs text-gray-500 flex items-center gap-0.5"><Phone size={8} />{d.phoneNumber}</span>}
                              {d.email && <span className="text-xs text-gray-500 flex items-center gap-0.5 truncate max-w-[160px]"><Mail size={8} />{d.email}</span>}
                            </div>
                            {/* Stage history mini */}
                            {stageHistory.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-gray-50">
                                {stageHistory.map((h, hi) => (
                                  <span key={hi} className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${STAGE_COLOR[h.stage] || "bg-gray-50 text-gray-400 border-gray-100"}`}>
                                    {h.stage.split(" ")[0]} · {fmt(h.movedAt)}
                                  </span>
                                ))}
                              </div>
                            )}
                            {daysInPipeline !== null && (
                              <p className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock size={8} className="text-gray-300" />
                                {daysInPipeline === 0 ? "Created today" : `${daysInPipeline}d in pipeline`} · since {fmt(d.createdAt)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Linked Leads */}
            {(linkedLeads.length > 0 || convertedLeadsCount > 0) && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-bold text-gray-600 flex items-center gap-1"><Users size={11} /> Linked Leads ({allLinkedLeadsCount})</p>
                  {selfConvertedCount > 0 && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <CheckCircle size={8} /> {selfConvertedCount} Converted to Deal
                    </span>
                  )}
                </div>
                <div className={`space-y-2 ${allLinkedLeadsCount > 3 ? "max-h-80 overflow-y-auto pr-1" : ""}`}>
                  {/* Active (not yet converted) leads with status journey — accordion */}
                  {linkedLeads.map((l, i) => {
                    const history = (l.statusHistory || []).sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt));
                    const isOpen = expandedItems.has(`lead-${i}`);
                    return (
                      <div key={l._id} className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden">
                        <button type="button" onClick={() => toggleExpand(`lead-${i}`)} className="w-full text-left p-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-gray-800 truncate">{l.leadName}</p>
                              {l.companyName && <p className="text-xs text-gray-400 flex items-center gap-0.5 truncate"><Building2 size={8} />{l.companyName}</p>}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${LEAD_STATUS_COLOR[l.status] || "bg-gray-100 text-gray-500"}`}>{l.status}</span>
                              {isOpen ? <ChevronUp size={12} className="text-gray-500" /> : <ChevronDown size={12} className="text-gray-400" />}
                            </div>
                          </div>
                          {activeTasks.some(task => task.leadRefs?.some(ref => (ref._id || ref) === l._id) || (task.leadRef?._id || task.leadRef) === l._id) && (
                            <span className="inline-flex text-xs bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded border border-purple-200 w-fit items-center gap-1 mt-1.5"><Flag size={9}/>Linked to active Task</span>
                          )}
                        </button>
                        {l.status !== "Converted" && (
                          <div className="px-2.5 pb-2.5">
                            <ReportBox
                              targetId={t._id} itemType="lead" itemId={l._id} itemName={l.leadName}
                              itemDetails={{ companyName: l.companyName, phoneNumber: l.phoneNumber, email: l.email, statusLabel: l.status, statusColor: LEAD_STATUS_COLOR[l.status], dateNote: l.createdAt ? `since ${fmt(l.createdAt)}` : null }}
                              baseUrl={baseUrl} headers={headers}
                              isReported={(t.reasonNotes || []).some(n => String(n.itemId) === String(l._id) && n.status === "pending")} />
                          </div>
                        )}
                        {isOpen && (
                          <div className="px-2.5 pb-2.5 border-t border-gray-100 pt-2">
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                              {l.phoneNumber && <span className="text-xs text-gray-500 flex items-center gap-0.5"><Phone size={8} />{l.phoneNumber}</span>}
                              {l.email && <span className="text-xs text-gray-500 flex items-center gap-0.5 truncate max-w-[140px]"><Mail size={8} />{l.email}</span>}
                            </div>
                            {/* Status journey */}
                            {(history.length > 0 || l.createdAt) && (
                              <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Status Journey</p>
                                <div className="flex items-center gap-0.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                                  <span className="text-xs text-gray-600 font-medium ml-1">Cold</span>
                                  <span className="text-xs text-gray-700 font-semibold ml-1">{fmt(l.createdAt)}</span>
                                </div>
                                {history.map((h, hi) => (
                                  <div key={hi} className="flex items-center gap-0.5 pl-1">
                                    <div className="w-px h-2 bg-gray-200 mr-0.5" />
                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${LEAD_STATUS_COLOR[h.status] ? "bg-current" : "bg-gray-300"}`} style={{backgroundColor: h.status==="Hot"?"#ef4444":h.status==="Warm"?"#f97316":h.status==="Cold"?"#6b7280":h.status==="Junk"?"#a855f7":"#10b981"}} />
                                    <span className="text-xs text-gray-600 font-medium ml-1">{h.status}</span>
                                    <span className="text-xs text-gray-700 font-semibold ml-1">{fmt(h.changedAt)} {fmtTime(h.changedAt)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {/* Converted leads — shown as their deal — accordion */}
                  {convertedLeadDeals.map((d, i) => {
                    const history = (d.leadStatusHistory || []).sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt));
                    const isOpen = expandedItems.has(`convlead-${i}`);
                    return (
                      <div key={d._id} className="bg-emerald-50 border border-emerald-200 rounded-xl overflow-hidden">
                        <div className="flex items-start gap-1 px-2.5 pt-2.5 pb-1">
                          <button type="button" onClick={() => toggleExpand(`convlead-${i}`)} className="flex-1 min-w-0 text-left">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-semibold text-gray-800 truncate flex-1">{d.dealName}</p>
                              {!d.convertedByName && (
                                <span className="text-xs bg-emerald-200 text-emerald-800 font-bold px-1.5 py-0.5 rounded shrink-0">Converted → Deal</span>
                              )}
                              {isOpen ? <ChevronUp size={12} className="text-emerald-600 shrink-0" /> : <ChevronDown size={12} className="text-gray-400 shrink-0" />}
                            </div>
                            {d.convertedByName && (
                              <span className="inline-block text-xs bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded border border-orange-200 mt-1">
                                {d.salesPersonConverted ? `Converted Lead to Deal by ${d.convertedByName}` : `Converted Lead to Deal by Admin ${d.convertedByName}`}
                              </span>
                            )}
                            {d.value && <p className="text-xs text-emerald-700 font-bold mt-1">{d.currency} {d.value}</p>}
                          </button>
                        </div>
                        {/* Lead status journey before conversion */}
                        {isOpen && (
                        <div className="px-2.5 pb-2.5 border-t border-emerald-100 pt-2 space-y-1">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Lead Status Journey</p>
                          <div className="flex items-center gap-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                            <span className="text-xs text-gray-600 font-medium ml-1">Cold</span>
                            <span className="text-xs text-gray-700 font-semibold ml-1">{fmt(d.leadCreatedAt || d.createdAt)}</span>
                          </div>
                          {history.map((h, hi) => (
                            <div key={hi} className="flex items-center gap-0.5 pl-1">
                              <div className="w-px h-2 bg-gray-200 mr-0.5" />
                              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{backgroundColor: h.status==="Hot"?"#ef4444":h.status==="Warm"?"#f97316":h.status==="Cold"?"#6b7280":h.status==="Junk"?"#a855f7":"#10b981"}} />
                              <span className="text-xs text-gray-600 font-medium ml-1">{h.status}</span>
                              <span className="text-xs text-gray-700 font-semibold ml-1">{fmt(h.changedAt)} {fmtTime(h.changedAt)}</span>
                            </div>
                          ))}
                          <div className="flex items-center gap-0.5 pl-1 flex-wrap">
                            <div className="w-px h-2 bg-gray-200 mr-0.5" />
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span className="text-xs text-emerald-700 font-bold ml-1">Converted to Deal</span>
                            <span className="text-xs text-gray-700 font-semibold ml-1">{fmt(d.convertedAt || d.createdAt)} {fmtTime(d.convertedAt || d.createdAt)}</span>
                            {!d.salesPersonConverted && (
                              <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200 ml-1">
                                Taken by Admin{d.convertedByName ? ` ${d.convertedByName}` : ""}
                              </span>
                            )}
                          </div>
                          {/* Deal stage start */}
                          <div className="flex items-center gap-0.5 pl-1 mt-0.5">
                            <div className="w-px h-2 bg-gray-200 mr-0.5" />
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                            <span className="text-xs text-blue-700 font-semibold ml-1">Qualification (Deal Start)</span>
                            <span className="text-xs text-gray-700 font-semibold ml-1">{fmt(d.convertedAt || d.createdAt)} {fmtTime(d.convertedAt || d.createdAt)}</span>
                          </div>
                          {/* Subsequent deal stage moves — live tracking */}
                          {(d.stageHistory || []).sort((a,b) => new Date(a.movedAt)-new Date(b.movedAt)).map((h, hi) => (
                            <div key={hi} className="flex items-center gap-0.5 pl-1">
                              <div className="w-px h-2 bg-gray-200 mr-0.5" />
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                h.stage === "Closed Won" ? "bg-emerald-500"
                                : h.stage === "Closed Lost" ? "bg-red-400"
                                : h.stage === "Invoice Sent" ? "bg-orange-400"
                                : h.stage === "Proposal Sent-Negotiation" ? "bg-yellow-400"
                                : "bg-blue-400"
                              }`} />
                              <span className={`text-xs font-bold ml-1 ${
                                h.stage === "Closed Won" ? "text-emerald-700"
                                : h.stage === "Closed Lost" ? "text-red-600"
                                : "text-gray-800"
                              }`}>{h.stage}</span>
                              <span className="text-xs text-gray-700 font-semibold ml-1">{fmt(h.movedAt)} {fmtTime(h.movedAt)}</span>
                            </div>
                          ))}
                          {/* Fallback: show current stage when not already in stageHistory */}
                          {d.stage && d.stage !== "Qualification" && !(d.stageHistory || []).some(h => h.stage === d.stage) && (
                            <div className="flex items-center gap-0.5 pl-1">
                              <div className="w-px h-2 bg-gray-200 mr-0.5" />
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                d.stage === "Closed Won" ? "bg-emerald-500"
                                : d.stage === "Closed Lost" ? "bg-red-400"
                                : d.stage === "Invoice Sent" ? "bg-orange-400"
                                : d.stage === "Proposal Sent-Negotiation" ? "bg-yellow-400"
                                : "bg-blue-400"
                              }`} />
                              <span className={`text-xs font-bold ml-1 ${d.stage === "Closed Won" ? "text-emerald-700" : d.stage === "Closed Lost" ? "text-red-600" : "text-gray-800"}`}>{d.stage}</span>
                              {d.stage !== "Closed Won" && d.stage !== "Closed Lost" && <span className="text-xs text-orange-500 font-bold ml-0.5">● Live</span>}
                            </div>
                          )}
                        </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {linkedDeals.length === 0 && linkedLeads.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-3">No leads or deals linked to this target yet.</p>
            )}

            {/* Reported Calls */}
            {t.reportedCalls?.length > 0 && (
              <div className="border-t border-gray-100 pt-4 mt-2">
                <button 
                  onClick={() => onViewReports(t._id, "call")}
                  className="w-full flex items-center justify-between p-3 bg-orange-50 hover:bg-orange-100/70 border border-orange-100 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white rounded-lg shadow-sm">
                      <Phone size={14} className="text-orange-500" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-gray-800">Reported Calls</p>
                      <p className="text-xs text-gray-500 font-medium">{t.reportedCalls.length} call{t.reportedCalls.length !== 1 ? "s" : ""} logged</p>
                    </div>
                  </div>
                  <div className="text-xs font-bold text-orange-600 bg-white px-2.5 py-1 rounded-full shadow-sm">View History</div>
                </button>
              </div>
            )}

            {/* Reported Meetings */}
            {t.reportedMeetings?.length > 0 && (
              <div className="border-t border-gray-100 pt-4 mt-2">
                <button 
                  onClick={() => onViewReports(t._id, "meeting")}
                  className="w-full flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100/70 border border-purple-100 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white rounded-lg shadow-sm">
                      <Activity size={14} className="text-purple-500" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-gray-800">Reported Meetings</p>
                      <p className="text-xs text-gray-500 font-medium">{t.reportedMeetings.length} meeting{t.reportedMeetings.length !== 1 ? "s" : ""} logged</p>
                    </div>
                  </div>
                  <div className="text-xs font-bold text-purple-600 bg-white px-2.5 py-1 rounded-full shadow-sm">View History</div>
                </button>
              </div>
            )}

            {/* Notes section */}
            <NotesSection target={t} baseUrl={baseUrl} headers={headers} onNoteAdded={onRefresh} />
          </div>
        )}

        {t.createdBy && (
          <p className="text-xs text-gray-300 mt-3 text-right">Assigned by {t.createdBy.firstName} {t.createdBy.lastName && t.createdBy.lastName !== t.createdBy.firstName ? t.createdBy.lastName : ''}</p>
        )}
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────── */
export default function MyTargets() {
  const [targets, setTargets] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myDashStats, setMyDashStats] = useState(null);
  const [periodFilter, setPeriodFilter] = useState("all");
  const [myView, setMyView] = useState("targets"); // "targets" | "notifications"
  const [viewMode, setViewMode] = useState("card"); // "card" | "pipeline"
  const [reportModal, setReportModal] = useState({ open: false, type: null, targetId: null });
  const [viewReportsModal, setViewReportsModal] = useState({ open: false, type: null, targetId: null });
  const { notifications, setNotifications, fetchNotifications } = useNotifications();
  const location = useLocation();
  const expandTargetId = location.state?.expandTargetId || null;
  const socket = useSocket();
  const targetSocket = useTargetSocket();
  const [showWorkflowExplanation, setShowWorkflowExplanation] = useState(false);

  const [overdueReasonNote, setOverdueReasonNote] = useState("");
  const [submittingOverdueReason, setSubmittingOverdueReason] = useState(false);

  const token = localStorage.getItem("token");
  const tenantSlug = localStorage.getItem("tenantSlug");
  const baseUrl = `${SI_URI}/${tenantSlug}/api`;
  const headers = { Authorization: `Bearer ${token}` };

  const fetchTargets = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data }, dashStatsRes, tasksRes] = await Promise.all([
        axios.get(`${baseUrl}/targets/my`, { headers }),
        // "My Monthly Overview" header — self-scoped, so it always shows real
        // numbers even when you have zero active Targets.
        axios.get(`${baseUrl}/targets/my-dashboard-stats`, { headers }).catch((err) => {
          console.error("Failed to load my dashboard stats", err);
          return null;
        }),
        axios.get(`${baseUrl}/tasks`, { headers }),
      ]);
      setTargets(data);
      setTasks(tasksRes.data);
      if (dashStatsRes) setMyDashStats(dashStatsRes.data);
    } catch {
      toast.error("Failed to load targets");
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  // Live refresh when a deal stage changes or lead converts to deal (generic socket)
  useEffect(() => {
    if (!socket) return;
    const handler = () => fetchTargets();
    const newNotifHandler = () => { fetchNotifications(); setMyView("notifications"); };
    socket.on("deal_stage_updated", handler);
    socket.on("lead_converted", handler);
    socket.on("task_completed", handler);
    socket.on("new_notification", newNotifHandler);
    return () => {
      socket.off("deal_stage_updated", handler);
      socket.off("lead_converted", handler);
      socket.off("task_completed", handler);
      socket.off("new_notification", newNotifHandler);
    };
  }, [socket, fetchTargets, fetchNotifications]);

  // Target-management-specific real-time events (dedicated socket namespace)
  useEffect(() => {
    if (!targetSocket) return;
    const reminderHandler = (data) => {
      toast.warning(data?.message || "Target reminder from admin!", { autoClose: 6000 });
      fetchNotifications();
      setMyView("notifications");
      fetchTargets();
    };
    const expiredHandler = (data) => {
      toast.error(data?.message || "Your target has expired! Some items were removed.", { autoClose: 8000 });
      fetchNotifications();
      setMyView("notifications");
      fetchTargets();
    };
    const reassignHandler = (data) => {
      toast.info(`New item assigned to you: ${data?.itemName || ""} — ${data?.quote || ""}`, { autoClose: 8000 });
      fetchTargets();
    };
    const reactivateHandler = (data) => {
      toast.success(`"${data?.itemName || "Item"}" reactivated — admin kept it with you! ${data?.quote || ""}`, { autoClose: 6000 });
      fetchTargets();
    };
    const removedHandler = (data) => {
      toast.warning(`"${data?.itemName || "Item"}" has been reassigned to another team member.`, { autoClose: 6000 });
      // Instantly strip the item from local state (optimistic — works even before API responds)
      setTargets(prev => prev.map(t => {
        if (data?.targetId && String(t._id) !== String(data.targetId)) return t;
        return {
          ...t,
          // Remove direct linked lead or deal by itemId
          linkedLeads: (t.linkedLeads || []).filter(l =>
            String(l._id) !== String(data.itemId) && String(l._id) !== String(data.sourceLeadId)
          ),
          linkedDeals: (t.linkedDeals || []).filter(d => String(d._id) !== String(data.itemId)),
          // Remove converted-lead-deal by deal ID or source lead ID
          convertedLeadDeals: (t.convertedLeadDeals || []).filter(d =>
            String(d._id) !== String(data.itemId) && String(d.leadId) !== String(data.sourceLeadId)
          ),
        };
      }));
      fetchTargets(); // follow-up full refresh for accurate progress %
    };
    // Admin deleted this target — instantly remove it from the list
    const targetDeletedHandler = (data) => {
      if (data?.targetId) {
        setTargets(prev => prev.filter(t => String(t._id) !== String(data.targetId)));
      }
      // No fetchTargets() needed — the card is already gone
    };
    const targetsRefreshHandler = () => fetchTargets();
    targetSocket.on("target_reminder", reminderHandler);
    targetSocket.on("target_due_today", reminderHandler);
    targetSocket.on("target_expired", expiredHandler);
    targetSocket.on("item_reassigned", reassignHandler);
    targetSocket.on("item_reactivated", reactivateHandler);
    targetSocket.on("item_removed", removedHandler);
    targetSocket.on("target_deleted", targetDeletedHandler);
    targetSocket.on("targets_refresh", targetsRefreshHandler);
    return () => {
      targetSocket.off("target_reminder", reminderHandler);
      targetSocket.off("target_due_today", reminderHandler);
      targetSocket.off("item_reactivated", reactivateHandler);
      targetSocket.off("item_removed", removedHandler);
      targetSocket.off("target_expired", expiredHandler);
      targetSocket.off("item_reassigned", reassignHandler);
      targetSocket.off("target_deleted", targetDeletedHandler);
      targetSocket.off("targets_refresh", targetsRefreshHandler);
    };
  }, [targetSocket, fetchTargets, fetchNotifications]);

  useEffect(() => {
    fetchTargets();
  }, []);

  // Strict separation from Task Management: only genuine "target"-family
  // notifications show here — never "task"-typed ones (lead converted, deal
  // stage/status changed, deal closed Won, etc.), even though those are also
  // deal/lead related. Those belong exclusively in Task Management's/Assigned
  // Tasks's own Notifications & Reminders tab — see utils/taskNotifications.
  // "reason_note" notifications are admin-only (sent to admins when a sales
  // person reports an issue) and belong exclusively in admin's Reason Notes
  // tab — never in a sales person's own Notifications & Reminders feed.
  const TARGET_NOTIF_TYPES = ["target","target_reminder","target_due_today","target_expired","target_reassign"];
  const isTargetTabNotif = (n) => TARGET_NOTIF_TYPES.includes(n.type);

  const switchToNotifications = () => {
    setMyView(v => (v === "notifications" ? "targets" : "notifications"));
  };

  const handleMarkNotifRead = (n) => {
    if (n.read || n.isRead || !n._id || String(n._id).includes("-")) return;
    setNotifications((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true, isRead: true } : x)));
    axios.patch(`${baseUrl}/notifications/read/${n._id}`, {}, { headers }).catch(() => {});
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => {
      const unread = prev.filter(n => isTargetTabNotif(n) && !n.read && !n.isRead && n._id && !String(n._id).includes("-"));
      if (unread.length > 0) {
        unread.forEach(n => axios.patch(`${baseUrl}/notifications/read/${n._id}`, {}, { headers }).catch(() => {}));
      }
      return prev.map(n => isTargetTabNotif(n) ? { ...n, read: true, isRead: true } : n);
    });
  };

  const handleDeleteNotification = async (notifId) => {
    try {
      await axios.delete(`${baseUrl}/notifications/${notifId}`, { headers });
      setNotifications(prev => prev.filter(n => String(n._id) !== String(notifId)));
    } catch {
      toast.error("Failed to delete notification");
    }
  };

  const filtered = periodFilter === "all" ? targets : targets.filter(t => t.period === periodFilter);
  const avgProgress = targets.length > 0
    ? Math.round(targets.reduce((s, t) => s + (t.percentages?.overall || 0), 0) / targets.length)
    : 0;

  const activeTasks = tasks.filter(t => t.status !== "Completed" && t.status !== "Archived");

  const overdueBlockingTarget = targets.find((t) => {
    if (t.status === "Completed" || t.status === "Rejected") return false;
    const isOverdue = isDateOverdue(t.endDate);
    if (!isOverdue) return false;
    
    const lastNote = t.reasonNotes && t.reasonNotes.length > 0 ? t.reasonNotes[t.reasonNotes.length - 1] : null;
    if (!lastNote) return true; // Needs reason
    if (lastNote.status !== "pending") return true; // Needs NEW reason if rejected, resolved, or reactivated
    return false;
  });

  const handleOverdueSubmit = async () => {
    if (!overdueReasonNote.trim()) return;
    setSubmittingOverdueReason(true);
    try {
      await axios.post(`${baseUrl}/targets/${overdueBlockingTarget._id}/reason-note`, { 
        note: overdueReasonNote,
        itemType: "target",
        itemId: overdueBlockingTarget._id,
        itemName: overdueBlockingTarget.title || "Overall Target"
      }, { headers });
      toast.success("Reason submitted to admin for review");
      fetchTargets();
      setOverdueReasonNote("");
    } catch (e) {
      toast.error("Failed to submit reason");
    } finally {
      setSubmittingOverdueReason(false);
    }
  };

  return (
    <div className="p-6 min-h-screen bg-gray-50 relative">
      <ToastContainer position="top-right" autoClose={3000} />

      {overdueBlockingTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-[90%] max-w-md">
            <div className="flex items-center gap-3 mb-4 text-red-600">
              <AlertCircle size={28} />
              <h2 className="text-xl font-bold">Overdue Target Block</h2>
            </div>
            <p className="text-gray-700 mb-2">
              Your target from <strong>{fmt(overdueBlockingTarget.startDate)} to {fmt(overdueBlockingTarget.endDate)}</strong> is overdue.
            </p>
            {overdueBlockingTarget.reasonNotes?.length > 0 && overdueBlockingTarget.reasonNotes[overdueBlockingTarget.reasonNotes.length - 1].status === "rejected" && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4 border border-red-200">
                <strong>Reason Rejected:</strong> {overdueBlockingTarget.reasonNotes[overdueBlockingTarget.reasonNotes.length - 1].rejectReason || "Your previous reason was rejected by the admin. Please submit a valid reason."}
              </div>
            )}
            <p className="text-sm text-gray-500 mb-4">
              You must submit a reason for the delay to continue using your Targets.
            </p>
            <textarea
              className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={4}
              placeholder="Explain why this target is delayed..."
              value={overdueReasonNote}
              onChange={(e) => setOverdueReasonNote(e.target.value)}
            />
            <button
              onClick={handleOverdueSubmit}
              disabled={submittingOverdueReason || !overdueReasonNote.trim()}
              className="mt-4 w-full bg-blue-600 text-white rounded-lg py-2.5 font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submittingOverdueReason ? "Submitting..." : "Submit Reason for Approval"}
            </button>
          </div>
        </div>
      )}

      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 flex items-center gap-2">
            <Target size={20} className="text-[#008ecc]" /> My Targets
            <button 
              onClick={() => setShowWorkflowExplanation(true)}
              className="ml-1 p-1 rounded-full text-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors bg-white border border-gray-200"
              title="How Targets Work"
            >
              <Info size={16} />
            </button>
          </h1>
          <p className="text-base text-slate-600 mt-1">Targets assigned to you by your admin</p>
        </div>
      </div>

      {myDashStats && (
        <div className="mb-6">
          <h2 className="text-slate-900 mb-3">My Monthly Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Leads" value={myDashStats.monthly.totalLeads} icon={<Users size={16} />}     color="text-blue-600"   bg="bg-blue-50 border border-blue-100" />
            <StatCard label="Total Deals" value={myDashStats.monthly.totalDeals} icon={<Briefcase size={16} />} color="text-sky-600"    bg="bg-sky-50 border border-sky-100" />
            <StatCard label="Deal Closed"   value={myDashStats.monthly.wonDeals}   icon={<Award size={16} />}     color="text-indigo-600" bg="bg-indigo-50 border border-indigo-100" />
            <StatCard label="Deal Lost"  value={myDashStats.monthly.lostDeals}  icon={<XCircle size={16} />}   color="text-red-600"    bg="bg-red-50 border border-red-100" />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5 mb-5 text-xs text-blue-700">
        <span className="font-semibold">Flow:</span>
        <span>Admin sets target</span>
        <ArrowRight size={11} className="text-blue-400" />
        <span>You work towards it</span>
        <ArrowRight size={11} className="text-blue-400" />
        <span>Progress tracked automatically</span>
        <ArrowRight size={11} className="text-blue-400" />
        <span>Add notes if delayed</span>
      </div>

      {targets.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <p className="text-xs text-gray-400">Total Targets</p>
            <p className="text-xl font-bold text-gray-700">{targets.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <p className="text-xs text-gray-400">Avg Progress</p>
            <p className={`text-xl font-bold ${getTextColor(avgProgress)}`}>{avgProgress}%</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <p className="text-xs text-gray-400">Achieved</p>
            <p className="text-xl font-bold text-emerald-600">{targets.filter(t => (t.percentages?.overall || 0) >= 100).length}</p>
          </div>
        </div>
      )}

      {/* Tab bar — always visible */}
      {(() => {
        const targetNotifs = notifications.filter(isTargetTabNotif);
        const unreadCount = targetNotifs.filter(n => !n.read && !n.isRead).length;
        return (
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            {[{ key: "all", label: "All" }, { key: "weekly", label: "Weekly" }, { key: "monthly", label: "Monthly" }].map((f) => (
              <button key={f.key} onClick={() => { setPeriodFilter(f.key); setMyView("targets"); }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${periodFilter === f.key && myView === "targets" ? "bg-[#008ecc] text-white shadow-sm" : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"}`}>
                {f.label}
              </button>
            ))}
            <button onClick={switchToNotifications}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${myView === "notifications" ? "bg-amber-500 text-white border-amber-500 shadow-sm" : "bg-white text-amber-600 border-amber-300 hover:bg-amber-50"}`}>
              <Bell size={13} /> Notifications & Reminders
              {unreadCount > 0 && (
                <span className="ml-0.5 bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[16px] text-center leading-none">{unreadCount}</span>
              )}
            </button>

            <div className="ml-auto flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
              <button onClick={() => { setViewMode("card"); setMyView("targets"); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-all ${viewMode === "card" && myView === "targets" ? "bg-[#008ecc] text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                <LayoutGrid size={14} /> Card
              </button>
              <button onClick={() => { setViewMode("pipeline"); setMyView("targets"); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-all ${viewMode === "pipeline" && myView === "targets" ? "bg-[#008ecc] text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                <Activity size={14} /> Pipeline
              </button>
            </div>
          </div>
        );
      })()}

      {/* Notifications view */}
      {myView === "notifications" && (() => {
        const targetNotifs = notifications.filter(isTargetTabNotif);
        const unreadCount = targetNotifs.filter(n => !n.read && !n.isRead).length;
        return (
          <div className="space-y-2 mb-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Bell size={14} className="text-amber-500" /> Notifications & Reminders
                {unreadCount > 0 && <span className="bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[16px] text-center leading-none">{unreadCount} new</span>}
              </p>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-xs text-[#008ecc] hover:underline font-medium">Mark all as read</button>
                )}
                <span className="text-xs text-gray-400">{targetNotifs.length} notification{targetNotifs.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
            {targetNotifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Bell size={36} className="mb-3 opacity-20" />
                <p className="text-sm font-medium">No notifications yet</p>
                <p className="text-xs mt-1">Reminders and updates from admin will appear here</p>
              </div>
            ) : targetNotifs.map((n, i) => {
              const isUnread = !n.read && !n.isRead;
              const isExpired = n.type === "target_expired";
              const isDue = n.type === "target_due_today";
              const isReassign = n.type === "target_reassign";
              return (
                <div key={n._id || i} onClick={() => handleMarkNotifRead(n)} className={`relative flex items-start gap-2.5 rounded-xl px-4 py-3 border cursor-pointer transition-all ${isUnread ? "ring-1 ring-amber-300" : ""} ${isExpired ? "bg-red-50 border-red-200" : isDue ? "bg-orange-50 border-orange-200" : isReassign ? "bg-blue-50 border-blue-200" : "bg-amber-50 border-amber-200"}`}>
                  {isExpired ? <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" /> : isDue ? <Clock size={15} className="text-orange-500 shrink-0 mt-0.5" /> : isReassign ? <Bell size={15} className="text-blue-500 shrink-0 mt-0.5" /> : <Bell size={15} className="text-amber-500 shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold ${isUnread ? "text-gray-900" : "text-gray-700"}`}>{n.title}</p>
                    <p className="text-xs text-gray-700 font-medium leading-relaxed mt-0.5">{n.message || n.text}</p>
                    <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1"><Clock size={8} />{fmt(n.createdAt)}</p>
                  </div>
                  {/* Actions */}
                  <div className="flex flex-col gap-1 ml-2 shrink-0 items-end">
                    {isUnread && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkNotifRead(n);
                        }}
                        className="px-2 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold flex items-center gap-1 transition-colors border border-blue-200 shadow-sm"
                        title="Mark as read"
                      >
                        <CheckCheck size={11} /> Mark as read
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteNotification(n._id); }}
                      className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                      title="Delete notification"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {myView === "targets" && (loading ? (
        <div className="flex justify-center items-center h-40 text-gray-400 text-sm">Loading your targets...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-52 text-gray-400">
          <Target size={40} className="mb-3 opacity-20" />
          <p className="text-sm font-medium">No targets assigned yet</p>
          <p className="text-xs mt-1">Your admin will set targets for you here</p>
        </div>
      ) : viewMode === "pipeline" ? (
        <TargetPipelineView
          targets={filtered}
          baseUrl={baseUrl}
          headers={headers}
          onRefresh={fetchTargets}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-start">
          {filtered.map((t) => {
            const hasUnread = notifications.some(n =>
              n.type === "target" && !n.read && !n.isRead &&
              (n.meta?.targetUpdated || n.meta?.targetAssigned) &&
              (!n.meta?.targetId || String(n.meta?.targetId) === String(t._id))
            );
            return (
              <MyTargetCard key={t._id} target={t} baseUrl={baseUrl} headers={headers} onRefresh={fetchTargets} hasUnread={hasUnread} autoExpand={expandTargetId && String(t._id) === String(expandTargetId)} tasks={tasks} onOpenReport={(id, type) => setReportModal({ open: true, type, targetId: id })} onViewReports={(id, type) => setViewReportsModal({ open: true, type, targetId: id })} />
            );
          })}
        </div>
      ))}

      {reportModal.open && reportModal.type === "call" && (
        <ReportCallModal
          isOpen={true}
          onClose={() => setReportModal({ open: false, type: null, targetId: null })}
          targetId={reportModal.targetId}
          baseUrl={baseUrl}
          headers={headers}
          onSuccess={fetchTargets}
        />
      )}
      {reportModal.open && reportModal.type === "meeting" && (
        <ReportMeetingModal
          isOpen={true}
          onClose={() => setReportModal({ open: false, type: null, targetId: null })}
          targetId={reportModal.targetId}
          baseUrl={baseUrl}
          headers={headers}
          onSuccess={fetchTargets}
        />
      )}
      
      {viewReportsModal.open && (
        <ViewReportsModal
          isOpen={true}
          onClose={() => setViewReportsModal({ open: false, type: null, targetId: null })}
          type={viewReportsModal.type}
          reports={viewReportsModal.type === "call" 
            ? targets.find(t => t._id === viewReportsModal.targetId)?.reportedCalls 
            : targets.find(t => t._id === viewReportsModal.targetId)?.reportedMeetings}
          isAdmin={false}
        />
      )}
      
      <WorkflowExplanationModal open={showWorkflowExplanation} onClose={() => setShowWorkflowExplanation(false)} />
    </div>
  );
}

function WorkflowExplanationModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
          <X size={20} />
        </button>
        <h3 className="text-slate-700 mb-4 flex items-center gap-2">
          <Info className="text-indigo-500" />
          How Tasks & Targets Work
        </h3>
        
        <div className="space-y-6 text-sm text-gray-700">
          <section>
            <h3 className="text-slate-700 mb-2 border-b pb-1">🏢 Company Viewpoint</h3>
            <p className="mb-2">
              Our workflow is fully automated to ensure complete transparency between what the <strong>Admin assigns</strong> and what the <strong>Salesperson achieves</strong>. The system automatically tracks real progress, eliminating manual status updates.
            </p>
          </section>

          <section>
            <h3 className="text-slate-700 mb-2">👤 Salesperson Workflow</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Auto-Progress:</strong> You cannot manually change a status to "In Progress" or "Completed". As soon as you convert a linked Lead, win a Deal, or log a Call/Meeting, the system automatically moves your task/target to <strong>In Progress</strong>.</li>
              <li><strong>Hold Requests:</strong> If you are blocked, you can request a "Hold". If the Admin approves, the task pauses. As soon as you make further progress, it automatically resumes to <strong>In Progress</strong>.</li>
              <li><strong>Auto-Completion:</strong> Once you complete 100% of the assigned linked items (e.g., all linked leads converted), the system automatically marks it <strong>Completed</strong> and notifies the Admin.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-slate-700 mb-2">👑 Admin Workflow</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Verification:</strong> When a salesperson achieves their goal, it moves to the Admin's feed. The Admin verifies the actual Deals/Leads.</li>
              <li><strong>Admin Completed:</strong> Once the Admin is satisfied, they click <strong>"Admin Completed"</strong>. This finalizes the item and moves it to the permanent <em>Admin Completed</em> list.</li>
              <li><strong>Hold/Reject Approvals:</strong> Admins review requests from salespeople to put tasks on Hold (optionally extending the due date) or Rejecting them entirely if they are invalid.</li>
            </ul>
          </section>
          
          <div className="bg-indigo-50 p-4 rounded-lg mt-4 border border-indigo-100">
            <p className="font-semibold text-indigo-800 mb-1">Key Takeaway:</p>
            <p className="text-indigo-700">
              The entire pipeline is driven by <strong>actual sales actions</strong> (converting leads, winning deals) rather than manual status dropdowns. This guarantees accurate reporting for the company.
            </p>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
