import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useSocket } from "../../context/SocketContext";
import { useTargetSocket } from "../../context/TargetSocketContext";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNotifications } from "../../context/NotificationContext";
import {
  Target, Users, Phone, TrendingUp, Calendar, CheckCircle,
  Activity, Trophy, ArrowRight, Award, Clock, ChevronDown,
  ChevronUp, Briefcase, Mail, Building2, Send, MessageSquare,
  Bell, AlertCircle, Check, XCircle, X, Trash2,
} from "lucide-react";

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
      <p className="text-[11px] font-bold text-gray-600 flex items-center gap-1.5">
        <MessageSquare size={12} className="text-[#008ecc]" /> Notes to Admin
      </p>

      {/* Existing notes */}
      {target.notes?.length > 0 && (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {[...target.notes].reverse().map((n, i) => (
            <div key={i} className="bg-gray-50 border border-gray-100 rounded-xl p-2.5">
              <p className="text-[11px] text-gray-700 leading-relaxed">{n.text}</p>
              <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
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
        <span className="text-[11px] text-amber-700 font-semibold">Reported — Pending admin review</span>
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
          className={`text-[11px] font-semibold transition-colors cursor-pointer ${open ? "text-rose-600" : "text-gray-400 group-hover:text-rose-500"}`}>
          Report Issue
        </span>
      </label>

      {/* Expanded details + note form */}
      {open && (
        <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 overflow-hidden">
          {/* Details summary */}
          <div className="px-3 py-2.5 bg-rose-100 border-b border-rose-200">
            <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wide mb-2 flex items-center gap-1">
              {itemType === "deal" ? <Briefcase size={9} /> : <Users size={9} />}
              {itemType === "deal" ? "Deal" : "Lead"} Details
            </p>
            <p className="text-[12px] font-bold text-gray-800 mb-1">{itemName}</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              {itemDetails.companyName && (
                <span className="text-[10px] text-gray-600 flex items-center gap-0.5"><Building2 size={8} />{itemDetails.companyName}</span>
              )}
              {itemDetails.value && (
                <span className="text-[10px] font-bold text-gray-700">{itemDetails.currency || ""} {itemDetails.value}</span>
              )}
              {itemDetails.phoneNumber && (
                <span className="text-[10px] text-gray-600 flex items-center gap-0.5"><Phone size={8} />{itemDetails.phoneNumber}</span>
              )}
              {itemDetails.email && (
                <span className="text-[10px] text-gray-500 flex items-center gap-0.5 truncate col-span-2"><Mail size={8} />{itemDetails.email}</span>
              )}
            </div>
            {itemDetails.statusLabel && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${itemDetails.statusColor || "bg-gray-100 text-gray-600"}`}>
                  {itemDetails.statusLabel}
                </span>
                {itemDetails.dateNote && <span className="text-[10px] text-gray-400">{itemDetails.dateNote}</span>}
              </div>
            )}
          </div>

          {/* Note textarea */}
          <div className="px-3 py-2.5 space-y-2">
            <p className="text-[10px] font-semibold text-rose-700">
              Describe why this {itemType === "deal" ? "deal" : "lead"} is delayed or stuck — admin will review and may reassign.
            </p>
            <textarea
              rows={3}
              autoFocus
              placeholder={itemType === "deal"
                ? "e.g. Deal stuck at negotiation, client not responding for 2 weeks..."
                : "e.g. Lead not responding, seems uninterested, needs reassignment..."}
              className="w-full border border-rose-200 rounded-lg px-2.5 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none bg-white"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setOpen(false); setNote(""); }}
                className="text-[10px] text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={send} disabled={!note.trim() || sending}
                className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 bg-rose-500 text-white rounded-lg disabled:opacity-50 hover:bg-rose-600 transition-colors">
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
function MyTargetCard({ target: t, baseUrl, headers, onRefresh, hasUnread, autoExpand }) {
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
    { label: "Leads to Deals Converted", target: t.targetLeads,    actual: actuals.leadsConverted || 0, pct: percentages.leadsPercent || 0,    icon: <Users size={13} className="text-blue-500" />,      bg: "bg-blue-50",   border: "border-blue-100",  countOnly: false },
    { label: "Deals Won",                target: t.targetDeals,    actual: actuals.dealsWon || 0,        pct: percentages.dealsPercent || 0,    icon: <TrendingUp size={13} className="text-green-500" />, bg: "bg-green-50",  border: "border-green-100", countOnly: false },
    { label: "Leads to Deals Won",       target: null,              actual: actuals.leadDealWon || 0,     pct: null, icon: <Trophy size={13} className="text-amber-500" />,  bg: "bg-amber-50",  border: "border-amber-100",  countOnly: true, badgeText: "leads closed", badgeClass: "text-amber-600 bg-amber-100" },
    { label: "Deals Lost",      target: null,              actual: actuals.dealsLost || 0,       pct: null, icon: <XCircle size={13} className="text-red-500" />,   bg: "bg-red-50",    border: "border-red-100",    countOnly: true, badgeText: "closed lost",  badgeClass: "text-red-600 bg-red-100"   },
    { label: "Calls Made",      target: t.targetCalls,    actual: actuals.calls || 0,           pct: percentages.callsPercent || 0,    icon: <Phone size={13} className="text-orange-500" />,     bg: "bg-orange-50", border: "border-orange-100", countOnly: false },
    { label: "Meetings Done",   target: t.targetMeetings, actual: actuals.meetings || 0,        pct: percentages.meetingsPercent || 0, icon: <Activity size={13} className="text-purple-500" />,  bg: "bg-purple-50", border: "border-purple-100", countOnly: false },
  ];

  return (
    <div ref={cardRef} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className={`h-1.5 w-full ${getProgressColor(overall)}`} />

      <div className="p-5">
        {/* Period + dates */}
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold capitalize ${t.period === "weekly" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
            {t.period}
          </span>
          <div className="flex items-center gap-1 text-[11px] text-gray-400">
            <Calendar size={10} /><span>{fmt(t.startDate)} — {fmt(t.endDate)}</span>
          </div>
        </div>

        {/* Admin description / note */}
        {t.description && (
          <div className="mx-4 mb-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 flex items-start gap-2">
            <MessageSquare size={12} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[9px] font-bold text-amber-600 uppercase tracking-wide mb-0.5">Note from Admin</p>
              <p className="text-[11px] text-amber-800 font-medium leading-relaxed">{t.description}</p>
            </div>
          </div>
        )}

        {/* Overall hero */}
        <div className={`rounded-xl p-4 mb-4 ${overall >= 80 ? "bg-emerald-50 border border-emerald-100" : overall >= 50 ? "bg-amber-50 border border-amber-100" : "bg-red-50 border border-red-100"}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-700"><Trophy size={15} className={getTextColor(overall)} /> Overall Progress</span>
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
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${m.badgeClass}`}>{m.badgeText}</span>
                </div>
              ) : (
                <>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-lg font-bold text-gray-800">{m.actual}</span>
                    <span className="text-xs text-gray-400">/ {m.target}</span>
                  </div>
                  <ProgressBar value={m.pct} color={getProgressColor(m.pct)} />
                  <p className={`text-[11px] font-bold mt-1 ${getTextColor(m.pct)}`}>{m.pct}%</p>
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
                      <p className="text-[11px] font-semibold text-gray-800 truncate">{d.dealName || d.dealTitle}</p>
                      <div className="flex flex-wrap gap-2 mt-0.5">
                        {d.wonAt && <span className="text-[10px] text-gray-500 flex items-center gap-0.5"><Calendar size={8} />{fmt(d.wonAt)}</span>}
                        {daysTaken !== undefined && (
                          <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5">
                            <Clock size={8} />{daysTaken === 0 ? "Same day" : `${daysTaken}d to close`}
                          </span>
                        )}
                        {d.value && <span className="text-[10px] font-bold text-emerald-700">{d.currency} {d.value}</span>}
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
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mb-2">
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
                <span className="ml-1.5 flex items-center gap-1 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                  New
                </span>
              )}
            </>
          )}
        </button>

        {expanded && (
          <div className="mt-4 space-y-4">

            {/* Won deals — detailed accordion */}
            {wonDeals.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-emerald-700 mb-2 flex items-center gap-1.5"><Award size={12} className="text-emerald-500" /> Won Deals — Full Details</p>
                <div className="space-y-2">
                  {wonDeals.map((d, i) => {
                    const createdDate  = d.createdAt ? new Date(d.createdAt) : null;
                    const wonDate      = d.wonAt ? new Date(d.wonAt) : null;
                    const totalDays    = wonDate && createdDate ? Math.max(0, Math.round((wonDate - createdDate) / 86400000)) : null;
                    const stageHistory = (d.stageHistory || []).sort((a, b) => new Date(a.movedAt) - new Date(b.movedAt));
                    const isOpen = expandedItems.has(`won-${i}`);
                    const adminBadge = getAdminActionBadge(d);
                    return (
                      <div key={d._id} className="bg-emerald-50 border border-emerald-200 rounded-2xl overflow-hidden">
                        {/* Accordion header — always visible */}
                        <div className="w-full px-3 pt-3 pb-2.5 flex items-start gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleExpand(`won-${i}`)}
                            className="flex-1 min-w-0 text-left"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] bg-emerald-200 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full shrink-0">#{i+1}</span>
                              <p className="text-sm font-bold text-gray-800 truncate flex-1">{d.dealName || d.dealTitle}</p>
                              <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                              {isOpen ? <ChevronUp size={13} className="text-emerald-600 shrink-0" /> : <ChevronDown size={13} className="text-gray-400 shrink-0" />}
                            </div>
                            {adminBadge && (
                              <span className="inline-block text-[9px] bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded-full border border-orange-200 mt-1" title={adminBadge.title}>
                                {adminBadge.text}
                              </span>
                            )}
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                              {d.companyName && <span className="text-[10px] text-gray-500 flex items-center gap-1"><Building2 size={8} />{d.companyName}</span>}
                              {d.value && <span className="text-[10px] font-bold text-emerald-700">{d.currency || "INR"} {d.value}</span>}
                              {totalDays !== null && (
                                <span className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                                  <Clock size={8} />{totalDays === 0 ? "Same day" : `${totalDays}d to close`}
                                </span>
                              )}
                            </div>
                          </button>
                          <button onClick={(e) => handleRemoveCompleted(e, "deal", d._id, d.dealName || d.dealTitle)}
                            className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors shrink-0" title="Remove from target">
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Accordion body — expanded details */}
                        {isOpen && (
                          <div className="border-t border-emerald-100">
                            {/* Contact info */}
                            <div className="px-3 py-2 bg-white/70 flex flex-wrap gap-x-4 gap-y-1">
                              {d.phoneNumber && <span className="text-[11px] text-gray-500 flex items-center gap-1"><Phone size={9} className="text-emerald-400" />{d.phoneNumber}</span>}
                              {d.email && <span className="text-[11px] text-gray-500 flex items-center gap-1 truncate max-w-[180px]"><Mail size={9} className="text-emerald-400" />{d.email}</span>}
                              {wonDate && <span className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium"><Calendar size={9} className="text-emerald-500" />Won: {fmt(wonDate)}</span>}
                            </div>

                            {/* Stage journey */}
                            {(stageHistory.length > 0 || createdDate) && (
                              <div className="px-3 py-2.5 bg-white/60 space-y-1.5 border-t border-emerald-100">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Stage Journey</p>
                                {createdDate && (
                                  <div className="flex items-start gap-2">
                                    <div className={`w-2 h-2 rounded-full ${STAGE_DOT["Qualification"] || "bg-gray-300"} mt-0.5 shrink-0`} />
                                    <div>
                                      <span className="text-[11px] font-semibold text-gray-700">Qualification</span>
                                      <span className="text-[10px] text-gray-400 ml-1">(created)</span>
                                      <p className="text-[10px] text-gray-700 font-semibold">{fmt(createdDate)} {fmtTime(createdDate)}</p>
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
                                        <span className="text-[11px] font-semibold text-gray-700">{h.stage}</span>
                                        {daysDiff !== null && <span className="text-[10px] text-gray-400 ml-1">({daysDiff === 0 ? "same day" : `+${daysDiff}d`})</span>}
                                        <p className="text-[10px] text-gray-700 font-semibold">{fmt(h.movedAt)} {fmtTime(h.movedAt)}</p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {totalDays !== null && (
                              <div className="px-3 py-2 bg-emerald-100/70 flex items-center gap-1.5">
                                <Clock size={10} className="text-emerald-600 shrink-0" />
                                <p className="text-[11px] font-bold text-emerald-700">
                                  {totalDays === 0 ? "Closed same day" : `Total: ${totalDays} day${totalDays !== 1 ? "s" : ""} from creation to won`}
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
                  <p className="text-[11px] font-bold text-red-700 mb-2 flex items-center gap-1.5"><XCircle size={12} className="text-red-500" /> Lost Deals ({lostDeals.length})</p>
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
                                <span className="text-[10px] bg-red-200 text-red-800 font-bold px-1.5 py-0.5 rounded-full shrink-0">#{i+1}</span>
                                <p className="text-sm font-bold text-gray-800 truncate flex-1">{d.dealName || d.dealTitle}</p>
                                <XCircle size={13} className="text-red-500 shrink-0" />
                                {isOpen ? <ChevronUp size={13} className="text-red-600 shrink-0" /> : <ChevronDown size={13} className="text-gray-400 shrink-0" />}
                              </div>
                              {adminBadge && (
                                <span className="inline-block text-[9px] bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded-full border border-orange-200 mt-1" title={adminBadge.title}>
                                  {adminBadge.text}
                                </span>
                              )}
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                                {d.companyName && <span className="text-[10px] text-gray-500 flex items-center gap-1"><Building2 size={8} />{d.companyName}</span>}
                                {d.value && <span className="text-[10px] font-bold text-red-700">{d.currency || "INR"} {d.value}</span>}
                                {totalDays !== null && <span className="text-[10px] text-red-600 flex items-center gap-0.5"><Clock size={8} />{totalDays === 0 ? "Same day" : `${totalDays}d in pipeline`}</span>}
                                {d.lossReason && <span className="text-[10px] text-red-600 font-medium">Reason: {d.lossReason}</span>}
                              </div>
                            </button>
                            <button onClick={(e) => handleRemoveCompleted(e, "deal", d._id, d.dealName || d.dealTitle)}
                              className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors shrink-0" title="Remove from target">
                              <Trash2 size={13} />
                            </button>
                          </div>
                          {isOpen && (
                            <div className="border-t border-red-100">
                              <div className="px-3 py-2 bg-white/70 flex flex-wrap gap-x-4 gap-y-1">
                                {d.phoneNumber && <span className="text-[11px] text-gray-500 flex items-center gap-1"><Phone size={9} className="text-red-400" />{d.phoneNumber}</span>}
                                {d.email && <span className="text-[11px] text-gray-500 flex items-center gap-1 truncate max-w-[180px]"><Mail size={9} className="text-red-400" />{d.email}</span>}
                              </div>
                              {(stageHistory.length > 0 || createdDate) && (
                                <div className="px-3 py-2.5 bg-white/60 space-y-1.5 border-t border-red-100">
                                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Stage Journey</p>
                                  {createdDate && (
                                    <div className="flex items-start gap-2">
                                      <div className={`w-2 h-2 rounded-full ${STAGE_DOT["Qualification"] || "bg-gray-300"} mt-0.5 shrink-0`} />
                                      <div>
                                        <span className="text-[11px] font-semibold text-gray-700">Qualification</span>
                                        <span className="text-[10px] text-gray-400 ml-1">(created)</span>
                                        <p className="text-[10px] text-gray-700 font-semibold">{fmt(createdDate)} {fmtTime(createdDate)}</p>
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
                                          <span className="text-[11px] font-semibold text-gray-700">{h.stage}</span>
                                          {daysDiff !== null && <span className="text-[10px] text-gray-400 ml-1">({daysDiff === 0 ? "same day" : `+${daysDiff}d`})</span>}
                                          <p className="text-[10px] text-gray-700 font-semibold">{fmt(h.movedAt)} {fmtTime(h.movedAt)}</p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {totalDays !== null && (
                                <div className="px-3 py-2 bg-red-100/70 flex items-center gap-1.5">
                                  <Clock size={10} className="text-red-600 shrink-0" />
                                  <p className="text-[11px] font-bold text-red-700">
                                    {totalDays === 0 ? "Lost same day" : `Total: ${totalDays} day${totalDays !== 1 ? "s" : ""} in pipeline before lost`}
                                  </p>
                                </div>
                              )}
                              {d.lossNotes && (
                                <div className="px-3 py-2 bg-red-50/80 border-t border-red-100">
                                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide mb-0.5">Loss Notes</p>
                                  <p className="text-[11px] text-gray-600">{d.lossNotes}</p>
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
                <p className="text-[11px] font-bold text-gray-600 mb-2 flex items-center gap-1"><Briefcase size={11} /> Active Deals ({liveDeals.length})</p>
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
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${STAGE_COLOR[d.stage] || "bg-gray-100 text-gray-500 border-gray-200"}`}>{d.stage}</span>
                              {isOpen ? <ChevronUp size={12} className="text-gray-500" /> : <ChevronDown size={12} className="text-gray-400" />}
                            </div>
                          </div>
                          {adminBadge && (
                            <span className="inline-block text-[10px] bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded border border-orange-200 mt-1" title={adminBadge.title}>{adminBadge.text}</span>
                          )}
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                            {d.companyName && <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><Building2 size={8} />{d.companyName}</span>}
                            {d.value && <span className="text-[10px] font-bold text-gray-700">{d.currency} {d.value}</span>}
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
                              {d.phoneNumber && <span className="text-[10px] text-gray-500 flex items-center gap-0.5"><Phone size={8} />{d.phoneNumber}</span>}
                              {d.email && <span className="text-[10px] text-gray-500 flex items-center gap-0.5 truncate max-w-[160px]"><Mail size={8} />{d.email}</span>}
                            </div>
                            {/* Stage history mini */}
                            {stageHistory.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-gray-50">
                                {stageHistory.map((h, hi) => (
                                  <span key={hi} className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${STAGE_COLOR[h.stage] || "bg-gray-50 text-gray-400 border-gray-100"}`}>
                                    {h.stage.split(" ")[0]} · {fmt(h.movedAt)}
                                  </span>
                                ))}
                              </div>
                            )}
                            {daysInPipeline !== null && (
                              <p className="text-[10px] text-gray-400 flex items-center gap-1">
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
                  <p className="text-[11px] font-bold text-gray-600 flex items-center gap-1"><Users size={11} /> Linked Leads ({allLinkedLeadsCount})</p>
                  {selfConvertedCount > 0 && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
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
                              {l.companyName && <p className="text-[10px] text-gray-400 flex items-center gap-0.5 truncate"><Building2 size={8} />{l.companyName}</p>}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${LEAD_STATUS_COLOR[l.status] || "bg-gray-100 text-gray-500"}`}>{l.status}</span>
                              {isOpen ? <ChevronUp size={12} className="text-gray-500" /> : <ChevronDown size={12} className="text-gray-400" />}
                            </div>
                          </div>
                        </button>
                        <div className="px-2.5 pb-2.5">
                          <ReportBox
                            targetId={t._id} itemType="lead" itemId={l._id} itemName={l.leadName}
                            itemDetails={{ companyName: l.companyName, phoneNumber: l.phoneNumber, email: l.email, statusLabel: l.status, statusColor: LEAD_STATUS_COLOR[l.status], dateNote: l.createdAt ? `since ${fmt(l.createdAt)}` : null }}
                            baseUrl={baseUrl} headers={headers}
                            isReported={(t.reasonNotes || []).some(n => String(n.itemId) === String(l._id) && n.status === "pending")} />
                        </div>
                        {isOpen && (
                          <div className="px-2.5 pb-2.5 border-t border-gray-100 pt-2">
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                              {l.phoneNumber && <span className="text-[10px] text-gray-500 flex items-center gap-0.5"><Phone size={8} />{l.phoneNumber}</span>}
                              {l.email && <span className="text-[10px] text-gray-500 flex items-center gap-0.5 truncate max-w-[140px]"><Mail size={8} />{l.email}</span>}
                            </div>
                            {/* Status journey */}
                            {(history.length > 0 || l.createdAt) && (
                              <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Status Journey</p>
                                <div className="flex items-center gap-0.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                                  <span className="text-[10px] text-gray-600 font-medium ml-1">Cold</span>
                                  <span className="text-[10px] text-gray-700 font-semibold ml-1">{fmt(l.createdAt)}</span>
                                </div>
                                {history.map((h, hi) => (
                                  <div key={hi} className="flex items-center gap-0.5 pl-1">
                                    <div className="w-px h-2 bg-gray-200 mr-0.5" />
                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${LEAD_STATUS_COLOR[h.status] ? "bg-current" : "bg-gray-300"}`} style={{backgroundColor: h.status==="Hot"?"#ef4444":h.status==="Warm"?"#f97316":h.status==="Cold"?"#6b7280":h.status==="Junk"?"#a855f7":"#10b981"}} />
                                    <span className="text-[10px] text-gray-600 font-medium ml-1">{h.status}</span>
                                    <span className="text-[10px] text-gray-700 font-semibold ml-1">{fmt(h.changedAt)} {fmtTime(h.changedAt)}</span>
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
                        <button type="button" onClick={() => toggleExpand(`convlead-${i}`)} className="w-full text-left p-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-gray-800 truncate">{d.dealName}</p>
                              <p className="text-[10px] text-gray-400">{d.currency} {d.value}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {!d.convertedByName && (
                                <span className="text-[10px] bg-emerald-200 text-emerald-800 font-bold px-1.5 py-0.5 rounded">Converted → Deal</span>
                              )}
                              {isOpen ? <ChevronUp size={12} className="text-emerald-600" /> : <ChevronDown size={12} className="text-gray-400" />}
                            </div>
                          </div>
                          {d.convertedByName && (
                            <span className="inline-block text-[10px] bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded border border-orange-200 mt-1">
                              {d.salesPersonConverted ? `Converted Lead to Deal by ${d.convertedByName}` : `Converted Lead to Deal by Admin ${d.convertedByName}`}
                            </span>
                          )}
                        </button>
                        <div className="px-2.5 pb-2.5">
                          <ReportBox
                            targetId={t._id} itemType="deal" itemId={d._id} itemName={d.dealName}
                            itemDetails={{ companyName: d.companyName, value: d.value, currency: d.currency, phoneNumber: d.phoneNumber, email: d.email, statusLabel: d.stage || "Qualification", statusColor: "bg-emerald-100 text-emerald-700", dateNote: d.convertedAt ? `converted ${fmt(d.convertedAt)}` : null }}
                            baseUrl={baseUrl} headers={headers}
                            isReported={(t.reasonNotes || []).some(n => String(n.itemId) === String(d._id) && n.status === "pending")} />
                        </div>
                        {/* Lead status journey before conversion */}
                        {isOpen && (
                        <div className="px-2.5 pb-2.5 border-t border-emerald-100 pt-2 space-y-1">
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Lead Status Journey</p>
                          <div className="flex items-center gap-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                            <span className="text-[10px] text-gray-600 font-medium ml-1">Cold</span>
                            <span className="text-[10px] text-gray-700 font-semibold ml-1">{fmt(d.leadCreatedAt || d.createdAt)}</span>
                          </div>
                          {history.map((h, hi) => (
                            <div key={hi} className="flex items-center gap-0.5 pl-1">
                              <div className="w-px h-2 bg-gray-200 mr-0.5" />
                              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{backgroundColor: h.status==="Hot"?"#ef4444":h.status==="Warm"?"#f97316":h.status==="Cold"?"#6b7280":h.status==="Junk"?"#a855f7":"#10b981"}} />
                              <span className="text-[10px] text-gray-600 font-medium ml-1">{h.status}</span>
                              <span className="text-[10px] text-gray-700 font-semibold ml-1">{fmt(h.changedAt)} {fmtTime(h.changedAt)}</span>
                            </div>
                          ))}
                          <div className="flex items-center gap-0.5 pl-1 flex-wrap">
                            <div className="w-px h-2 bg-gray-200 mr-0.5" />
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span className="text-[10px] text-emerald-700 font-bold ml-1">Converted to Deal</span>
                            <span className="text-[10px] text-gray-700 font-semibold ml-1">{fmt(d.convertedAt || d.createdAt)} {fmtTime(d.convertedAt || d.createdAt)}</span>
                            {!d.salesPersonConverted && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200 ml-1">
                                Taken by Admin{d.convertedByName ? ` ${d.convertedByName}` : ""}
                              </span>
                            )}
                          </div>
                          {/* Deal stage start */}
                          <div className="flex items-center gap-0.5 pl-1 mt-0.5">
                            <div className="w-px h-2 bg-gray-200 mr-0.5" />
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                            <span className="text-[10px] text-blue-700 font-semibold ml-1">Qualification (Deal Start)</span>
                            <span className="text-[10px] text-gray-700 font-semibold ml-1">{fmt(d.convertedAt || d.createdAt)} {fmtTime(d.convertedAt || d.createdAt)}</span>
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
                              <span className={`text-[10px] font-bold ml-1 ${
                                h.stage === "Closed Won" ? "text-emerald-700"
                                : h.stage === "Closed Lost" ? "text-red-600"
                                : "text-gray-800"
                              }`}>{h.stage}</span>
                              <span className="text-[10px] text-gray-700 font-semibold ml-1">{fmt(h.movedAt)} {fmtTime(h.movedAt)}</span>
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
                              <span className={`text-[10px] font-bold ml-1 ${d.stage === "Closed Won" ? "text-emerald-700" : d.stage === "Closed Lost" ? "text-red-600" : "text-gray-800"}`}>{d.stage}</span>
                              {d.stage !== "Closed Won" && d.stage !== "Closed Lost" && <span className="text-[10px] text-orange-500 font-bold ml-0.5">● Live</span>}
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

            {/* Notes section */}
            <NotesSection target={t} baseUrl={baseUrl} headers={headers} onNoteAdded={onRefresh} />
          </div>
        )}

        {t.createdBy && (
          <p className="text-[10px] text-gray-300 mt-3 text-right">Assigned by {t.createdBy.firstName} {t.createdBy.lastName}</p>
        )}
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────── */
export default function MyTargets() {
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState("all");
  const [myView, setMyView] = useState("targets"); // "targets" | "notifications"
  const { notifications, setNotifications, fetchNotifications } = useNotifications();
  const location = useLocation();
  const expandTargetId = location.state?.expandTargetId || null;
  const socket = useSocket();
  const targetSocket = useTargetSocket();

  const token = localStorage.getItem("token");
  const tenantSlug = localStorage.getItem("tenantSlug");
  const baseUrl = `${SI_URI}/${tenantSlug}/api`;
  const headers = { Authorization: `Bearer ${token}` };

  const fetchTargets = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${baseUrl}/targets/my`, { headers });
      setTargets(data);
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
    socket.on("new_notification", newNotifHandler);
    return () => {
      socket.off("deal_stage_updated", handler);
      socket.off("lead_converted", handler);
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
    setMyView(v => {
      if (v === "notifications") return "targets";
      // Mark all target notifications as read when opening the tab
      setNotifications(prev => {
        const unread = prev.filter(n => isTargetTabNotif(n) && !n.read && !n.isRead && n._id && !String(n._id).includes("-"));
        unread.forEach(n => axios.patch(`${baseUrl}/notifications/read/${n._id}`, {}, { headers }).catch(() => {}));
        return prev.map(n => isTargetTabNotif(n) ? { ...n, read: true, isRead: true } : n);
      });
      return "notifications";
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

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Target size={20} className="text-[#008ecc]" /> My Targets
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Targets assigned to you by your admin</p>
      </div>

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
            <p className="text-[11px] text-gray-400">Total Targets</p>
            <p className="text-xl font-bold text-gray-700">{targets.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <p className="text-[11px] text-gray-400">Avg Progress</p>
            <p className={`text-xl font-bold ${getTextColor(avgProgress)}`}>{avgProgress}%</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <p className="text-[11px] text-gray-400">Achieved</p>
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
                <span className="ml-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 min-w-[16px] text-center leading-none">{unreadCount}</span>
              )}
            </button>
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
                {unreadCount > 0 && <span className="bg-red-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 min-w-[16px] text-center leading-none">{unreadCount} new</span>}
              </p>
              <span className="text-xs text-gray-400">{targetNotifs.length} notification{targetNotifs.length !== 1 ? "s" : ""}</span>
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
                <div key={n._id || i} className={`relative flex items-start gap-2.5 rounded-xl px-4 py-3 border transition-all ${isUnread ? "ring-1 ring-amber-300" : ""} ${isExpired ? "bg-red-50 border-red-200" : isDue ? "bg-orange-50 border-orange-200" : isReassign ? "bg-blue-50 border-blue-200" : "bg-amber-50 border-amber-200"}`}>
                  {/* Unread dot */}
                  {isUnread && <span className="absolute top-2 right-8 w-2 h-2 rounded-full bg-red-500" />}
                  {isExpired ? <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" /> : isDue ? <Clock size={15} className="text-orange-500 shrink-0 mt-0.5" /> : isReassign ? <Bell size={15} className="text-blue-500 shrink-0 mt-0.5" /> : <Bell size={15} className="text-amber-500 shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold ${isUnread ? "text-gray-900" : "text-gray-700"}`}>{n.title}</p>
                    <p className="text-[12px] text-gray-700 font-medium leading-relaxed mt-0.5">{n.message || n.text}</p>
                    <p className="text-[10px] text-gray-500 mt-1.5 flex items-center gap-1"><Clock size={8} />{fmt(n.createdAt)}</p>
                  </div>
                  {/* Delete button */}
                  <button
                    onClick={() => handleDeleteNotification(n._id)}
                    className="shrink-0 p-1 rounded-full hover:bg-red-100 text-gray-300 hover:text-red-500 transition-colors mt-0.5"
                    title="Delete notification"
                  >
                    <X size={13} />
                  </button>
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-start">
          {filtered.map((t) => {
            const hasUnread = notifications.some(n =>
              n.type === "target" && !n.read && !n.isRead &&
              (n.meta?.targetUpdated || n.meta?.targetAssigned) &&
              (!n.meta?.targetId || String(n.meta?.targetId) === String(t._id))
            );
            return (
              <MyTargetCard key={t._id} target={t} baseUrl={baseUrl} headers={headers} onRefresh={fetchTargets} hasUnread={hasUnread} autoExpand={expandTargetId && String(t._id) === String(expandTargetId)} />
            );
          })}
        </div>
      ))}
    </div>
  );
}
