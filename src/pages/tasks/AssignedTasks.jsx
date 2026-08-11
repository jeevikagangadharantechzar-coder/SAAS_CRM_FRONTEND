import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNotifications } from "../../context/NotificationContext";
import { useSocket } from "../../context/SocketContext";
import { useTargetSocket } from "../../context/TargetSocketContext";
import { isTaskTabNotif, getNotificationAccentClass } from "../../utils/taskNotifications";
import { isDateOverdue } from "../../utils/dateValidation";
import {
  CheckCircle, Clock, AlertCircle, Calendar, Flag, User,
  ClipboardList, ArrowRight, StickyNote, X, FileText, Briefcase,
  MessageSquare, Bell, ChevronDown, ChevronUp, History, LayoutGrid, List, Trophy,
  Building2, Phone, Mail, Award, XCircle, Send, Check, Users, TrendingUp, Activity, Target, Trash2, Info, CheckCheck
} from "lucide-react";

import TaskPipelineView from "./TaskPipelineView";

const SI_URI  = import.meta.env.VITE_SI_URI  || "http://localhost:5000";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Who touched this task's linked lead/deal — badge.isSelf here means "the
// task's own assignee did it themselves", and on this page the viewer IS
// that assignee, so isSelf renders as "You".
function getLinkedItemBadgeText(badge) {
  if (!badge) return null;
  const who = badge.isSelf ? "You" : badge.isAdmin ? `Admin ${badge.name || "—"}` : (badge.name || "Someone");
  if (badge.kind === "lead") return `${who} converted the lead to deal`;
  if (badge.kind === "deal_stage") return `${who} took this deal — moved it to the next stage`;
  if (badge.kind === "deal_converted") return `${who} converted this deal from a lead`;
  if (badge.kind === "deal_won") return `${who} closed this deal won`;
  return null;
}

// Only Admin or the task's own assignee can ever change a task's status
// (enforced server-side), so if the latest status change wasn't made by the
// assignee (you), it must have been Admin working the task directly themselves.
function getAdminTookTaskBadge(task) {
  const statusChanges = (task.history || []).filter((h) => h.event === "StatusChanged" && h.by);
  if (!statusChanges.length) return null;
  const last = [...statusChanges].sort((a, b) => new Date(a.at) - new Date(b.at)).slice(-1)[0];
  const actorId = String(last.by?._id || last.by || "");
  const assigneeId = String(task.assignedTo?._id || task.assignedTo || "");
  if (!actorId || !assigneeId || actorId === assigneeId) return null;
  return `moved to "${task.status}"`;
}

// isTaskTabNotif — imported from utils/taskNotifications, the single shared
// definition of "which notifications belong in this tab" (also used by Task
// Management and, for the deal/lead-lifecycle subset, My Targets).
const TASK_NOTIF_TYPES_FILTER = isTaskTabNotif;

function fmt(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtTime(date) {
  if (!date) return "";
  return new Date(date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

const PRIORITY_COLORS = {
  Low:    "bg-sky-50 text-sky-600 border-sky-200",
  Medium: "bg-amber-50 text-amber-600 border-amber-200",
  High:   "bg-orange-50 text-orange-600 border-orange-200",
  Urgent: "bg-red-50 text-red-600 border-red-200",
};

// Same "hero progress" concept as Target Management / the admin Task
// Management card — a task's status maps onto a 0/50/100% progress value.
const STATUS_PROGRESS = { Pending: 0, "In Progress": 50, Completed: 100 };

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
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div className={`h-2 rounded-full transition-all duration-500 ease-out ${color}`} style={{ width: `${width}%` }} />
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

// The assigned sales person's current Target snapshot, shown for context
// inside a task card — same "Overall Progress" hero + 6-metric grid as
// Target Management/My Targets. Tolerant of `target` being null/undefined
// (no active target yet) — every field defaults to 0 so all 6 cells still
// render in full instead of a half-empty placeholder.

function TaskProgressWidget({ task }) {
  const dealItems = task.dealRefs?.length ? task.dealRefs : (task.dealRef ? [task.dealRef] : []);
  const leadItems = task.leadRefs?.length ? task.leadRefs : (task.leadRef ? [task.leadRef] : []);
  const totalItems = dealItems.length + leadItems.length;

  let overall = 0;
  let text = "";

  if (task.status === "Completed") {
    overall = 100;
    text = "🎉 Task officially completed!";
  } else if (totalItems > 0) {
    let completedItems = 0;

    dealItems.forEach(d => {
      if (d.stage === "Closed Won") { completedItems++; }
    });
    leadItems.forEach(l => {
      if (l.status === "Converted") { completedItems++; }
    });
    overall = Math.round((completedItems / totalItems) * 100);
    
    if (overall === 100) {
      text = "🎉 All linked items achieved! (Mark task as Completed when ready)";
    } else if (overall > 0) {
      text = `${completedItems} of ${totalItems} linked items achieved.`;
    } else {
      text = task.status === "In Progress" ? "Task is in progress." : "Task is pending. Work on the linked items!";
    }
  } else {
    overall = STATUS_PROGRESS[task.status] || 0;
    text = overall === 100 ? "🎉 Task completed!" : overall >= 50 ? "Task is currently in progress." : "Task is pending.";
  }

  // Build the 6-grid metrics based entirely on THIS task's linked items (acting as its own mini-target)
  const leadsTarget = leadItems.length;
  const dealsTarget = dealItems.length;
  
  let dealsWonCount = 0;
  let dealsLostCount = 0;
  let leadsConvertedCount = 0;
  dealItems.forEach(d => {
    if (d.stage === "Closed Won") dealsWonCount++;
    if (d.stage === "Closed Lost") dealsLostCount++;
  });
  leadItems.forEach(l => {
    if (l.status === "Converted") leadsConvertedCount++;
  });

  const leadsPct = leadsTarget > 0 ? Math.round((leadsConvertedCount / leadsTarget) * 100) : 0;
  const dealsPct = dealsTarget > 0 ? Math.round((dealsWonCount / dealsTarget) * 100) : 0;

  const metrics = [
    { label: "Leads to Deals Converted", target: leadsTarget, actual: leadsConvertedCount, pct: leadsPct, icon: <Users size={13} className="text-blue-500" />, bg: "bg-blue-50", border: "border-blue-100", countOnly: false },
    { label: "Deal Closed", target: dealsTarget, actual: dealsWonCount, pct: dealsPct, icon: <TrendingUp size={13} className="text-green-500" />, bg: "bg-green-50", border: "border-green-100", countOnly: false },
  ];

  return (
    <div className="mb-4">
      <div className={`rounded-xl p-4 ${overall >= 100 ? "bg-emerald-50 border border-emerald-100" : overall >= 50 ? "bg-blue-50 border border-blue-100" : "bg-gray-50 border border-gray-100"}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
            <Trophy size={15} className={getTextColor(overall)} /> {overall >= 100 ? "Task Completed" : "Task Progress"}
          </span>
          <span className={`text-2xl font-bold ${getTextColor(overall)}`}>{overall}%</span>
        </div>
        <ProgressBar value={overall} color={getProgressColor(overall)} />
        <p className="text-xs text-gray-400 mt-1.5 mb-3">{text}</p>
        
        <div className="grid grid-cols-2 gap-2">
          {metrics.map((m, i) => (
            <div key={i} className={`p-2.5 rounded-xl border ${m.bg} ${m.border} flex flex-col justify-between min-h-[82px]`}>
              <div className="flex items-start justify-between gap-1 mb-1.5">
                <span className="text-xs font-bold text-gray-600 leading-tight">{m.label}</span>
                <span className="shrink-0 mt-0.5">{m.icon}</span>
              </div>
              <div>
                {m.countOnly ? (
                  <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold ${m.badgeClass}`}>
                    {m.actual} {m.badgeText}
                  </span>
                ) : (
                  <div className="flex items-end gap-1.5">
                    <span className="text-sm font-black text-gray-800">{m.actual}</span>
                    <span className="text-xs text-gray-400 font-bold mb-0.5">/ {m.target}</span>
                    <span className="text-xs font-bold ml-auto" style={{ color: m.pct >= 100 ? '#10b981' : m.pct >= 50 ? '#f59e0b' : '#ef4444' }}>
                      {m.pct}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// Same icon-on-top stat-card concept as Target Management / admin Task
// Management's "Monthly Overview" — still used for this page's own
// "My Monthly Overview" widget, which is a page-level aggregate and stays
// independent of any individual task card.
function StatCard({ label, value, icon, color, bg }) {
  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <div className={`mb-1 ${color}`}>{icon}</div>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

// A task's Progress card must only ever show a Target's numbers when that
// Target actually links THIS task's own lead/deal — never "whichever Target
// happens to be active today," which used to make every unrelated task
// display the same one active Target's numbers (real cross-bleed: a task
// tied to a 100%-Admin-worked lead would show a completely different,
// self-worked Target's progress just because it overlapped in dates). If
// nothing actually links this task's item, return null so the caller falls
// through to that task's own per-task fallback snapshot instead.
function resolveCurrentTarget(targets, period, task) {
  if (!targets.length) return null;

  const leadId = task?.leadRef?._id || task?.leadRef;
  const dealId = task?.dealRef?._id || task?.dealRef;
  if (!leadId && !dealId) return null;

  return targets.find((t) =>
    (leadId && (t.linkedLeads || []).some((l) => String(l._id || l) === String(leadId))) ||
    (dealId && (
      (t.linkedDeals || []).some((d) => String(d._id || d) === String(dealId)) ||
      (t.convertedLeadDeals || []).some((d) => String(d._id || d) === String(dealId))
    ))
  ) || null;
}

// Same lead-status / deal-stage color maps as Target Management, so a
// linked lead/deal reads identically here.
const LEAD_STATUS_COLOR = {
  New: "bg-blue-100 text-blue-700 border-blue-200",
  Contacted: "bg-cyan-100 text-cyan-700 border-cyan-200",
  Interested: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Qualified: "bg-green-100 text-green-700 border-green-200",
  Converted: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Cold: "bg-gray-100 text-gray-600 border-gray-200",
  "Not Interested": "bg-red-100 text-red-600 border-red-200",
  Lost: "bg-gray-100 text-gray-500 border-gray-200",
};
const STAGE_COLOR = {
  Qualification: "bg-blue-100 text-blue-700 border-blue-200",
  "Proposal Sent-Negotiation": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Invoice Sent": "bg-orange-100 text-orange-700 border-orange-200",
  "Closed Won": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Closed Lost": "bg-red-100 text-red-600 border-red-200",
};
const STAGE_DOT = {
  Qualification: "bg-blue-400",
  "Proposal Sent-Negotiation": "bg-yellow-400",
  "Invoice Sent": "bg-orange-400",
  "Closed Won": "bg-emerald-500",
  "Closed Lost": "bg-red-400",
};

// Report an issue on a specific lead/deal (not the task) — same component,
// same endpoint (POST /targets/:targetId/reason-note), same visual design as
// MyTargets.jsx's ReportBox, so this reads identically wherever it appears.
function ConfirmModal({ open, title, message, onConfirm, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h3 className="text-slate-700 mb-2">{title}</h3>
        <p className="text-base text-slate-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 text-sm font-medium">
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// mode="task" reports the issue against the task itself (POST
// /tasks/:taskId/reason-note) — fully independent of any Target, so it's
// always available regardless of whether the sales person has a target set.
// mode="target" (default) is the original per-item report against a Target's
// reason-note list, still used by MyTargets.jsx.
function ReportBox({ mode = "target", taskId, targetId, itemType, itemId, itemName, itemDetails = {}, baseUrl, headers, isReported = false }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [localReported, setLocalReported] = useState(false);

  const send = async () => {
    if (!note.trim()) return;
    setSending(true);
    try {
      if (mode === "task") {
        await axios.post(`${baseUrl}/tasks/${taskId}/reason-note`, { note }, { headers });
      } else {
        await axios.post(`${baseUrl}/targets/${targetId}/reason-note`, {
          itemType, itemId, itemName, note,
          companyName: itemDetails.companyName || "",
          phoneNumber: itemDetails.phoneNumber || "",
          email: itemDetails.email || "",
          value: itemDetails.value || "",
          currency: itemDetails.currency || "",
          stageOrStatus: itemDetails.statusLabel || "",
        }, { headers });
      }
      toast.success("Issue reported to admin");
      setOpen(false);
      setNote("");
      setLocalReported(true);
    } catch {
      toast.error("Failed to report issue");
    } finally {
      setSending(false);
    }
  };

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
    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
      <label className="inline-flex items-center gap-1.5 cursor-pointer select-none group">
        <div
          role="checkbox"
          aria-checked={open}
          tabIndex={0}
          onClick={() => setOpen((v) => !v)}
          onKeyDown={(e) => e.key === " " && setOpen((v) => !v)}
          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0 ${open ? "bg-rose-500 border-rose-500" : "border-gray-400 bg-white group-hover:border-rose-400"}`}>
          {open && <Check size={10} className="text-white" strokeWidth={3} />}
        </div>
        <span onClick={() => setOpen((v) => !v)}
          className={`text-xs font-semibold transition-colors cursor-pointer ${open ? "text-rose-600" : "text-gray-400 group-hover:text-rose-500"}`}>
          Report Issue
        </span>
      </label>

      {open && (
        <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 overflow-hidden">
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
              </div>
            )}
          </div>

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
              onChange={(e) => setNote(e.target.value)}
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

// Full read-only breakdown of every lead/deal behind the Target Progress
// percentages — same underlying data as MyTargets.jsx (linkedLeads,
// linkedDeals, convertedLeadDeals), so "Show Details" surfaces the actual
// history, not just the summary chart.
// Same Stage Journey timeline used by LinkedItemDetail, factored out so every
// deal card (Won/Active/Lost) in Leads & Deals can show its own full history.
// For a deal converted from a lead, the backend copies the lead's own
// pre-conversion statusHistory onto the deal (leadStatusHistory/leadCreatedAt)
// — shown first here, so the timeline reads Cold → ... → Converted to Deal →
// Qualification → the deal's own stage moves, instead of starting mid-story.
function DealStageJourney({ deal }) {
  const leadCreatedDate = deal.leadCreatedAt ? new Date(deal.leadCreatedAt) : null;
  const leadHistory = [...(deal.leadStatusHistory || [])].sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt));
  const hasLeadOrigin = !!leadCreatedDate;
  const createdDate = deal.createdAt ? new Date(deal.createdAt) : null;
  const convertedDate = deal.convertedAt ? new Date(deal.convertedAt) : createdDate;
  const stageHistory = [...(deal.stageHistory || [])].sort((a, b) => new Date(a.movedAt) - new Date(b.movedAt));
  if (!createdDate && !leadCreatedDate) return null;
  return (
    <div className="border-t border-gray-100 px-3 py-2.5 bg-white/60 space-y-1.5">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Stage Journey</p>

      {hasLeadOrigin ? (
        <>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-xs font-semibold text-gray-600">Cold</span>
              <p className="text-xs text-gray-700 font-semibold">{fmt(leadCreatedDate)} {fmtTime(leadCreatedDate)}</p>
            </div>
          </div>
          {leadHistory.map((h, hi) => (
            <div key={`lead-${hi}`} className="flex items-start gap-2 pl-1">
              <div className="flex flex-col items-center gap-0.5"><div className="w-px h-2 bg-gray-200" /><div className="w-2 h-2 rounded-full bg-blue-300 shrink-0" /></div>
              <div>
                <span className="text-xs font-semibold text-gray-700">{h.status}</span>
                <p className="text-xs text-gray-700 font-semibold">{fmt(h.changedAt)} {fmtTime(h.changedAt)}</p>
              </div>
            </div>
          ))}
          <div className="flex items-start gap-2 pl-1">
            <div className="flex flex-col items-center gap-0.5"><div className="w-px h-2 bg-gray-200" /><div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" /></div>
            <div>
              <span className="text-xs font-semibold text-gray-700">Converted to Deal</span>
              <p className="text-xs text-gray-700 font-semibold">{fmt(convertedDate)} {fmtTime(convertedDate)}</p>
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-start gap-2">
          <div className="w-2 h-2 rounded-full bg-gray-400 mt-0.5 shrink-0" />
          <div>
            <span className="text-xs font-semibold text-gray-600">Lead Created</span>
            <p className="text-xs text-gray-700 font-semibold">{fmt(createdDate)} {fmtTime(createdDate)}</p>
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 pl-1">
        <div className="flex flex-col items-center gap-0.5"><div className="w-px h-2 bg-gray-200" /><div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" /></div>
        <div>
          <span className="text-xs font-semibold text-gray-700">Qualification</span>
          <span className="text-xs text-gray-400 ml-1">(deal start)</span>
          <p className="text-xs text-gray-400">{fmt(convertedDate || createdDate)} {fmtTime(convertedDate || createdDate)}</p>
        </div>
      </div>
      {stageHistory.map((h, hi) => {
        const prev = hi === 0 ? (convertedDate || createdDate) : new Date(stageHistory[hi - 1].movedAt);
        const diff = prev ? Math.max(0, Math.round((new Date(h.movedAt) - prev) / 86400000)) : null;
        return (
          <div key={hi} className="flex items-start gap-2 pl-1">
            <div className="flex flex-col items-center gap-0.5"><div className="w-px h-2 bg-gray-200" /><div className={`w-2 h-2 rounded-full ${STAGE_DOT[h.stage] || "bg-gray-300"} shrink-0`} /></div>
            <div>
              <span className="text-xs font-semibold text-gray-700">{h.stage}</span>
              {diff !== null && <span className="text-xs text-gray-400 ml-1">({diff === 0 ? "same day" : `+${diff}d`})</span>}
              <p className="text-xs text-gray-700 font-semibold">{fmt(h.movedAt)} {fmtTime(h.movedAt)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Same Status Journey timeline concept, for a still-open lead.
function LeadStatusJourney({ lead }) {
  const history = [...(lead.statusHistory || [])].sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt));
  if (!lead.createdAt) return null;
  return (
    <div className="border-t border-gray-100 px-3 py-2.5 bg-white/60 space-y-1">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Status Journey</p>
      <div className="flex items-center gap-0.5">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
        <span className="text-xs text-gray-600 font-medium ml-1">Cold</span>
        <span className="text-xs text-gray-700 font-semibold ml-1">{fmt(lead.createdAt)}</span>
      </div>
      {history.map((h, hi) => (
        <div key={hi} className="flex items-center gap-0.5 pl-1">
          <div className="w-px h-2 bg-gray-200 mr-0.5" />
          <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-gray-400" />
          <span className="text-xs text-gray-600 font-medium ml-1">{h.status}</span>
          <span className="text-xs text-gray-700 font-semibold ml-1">{fmt(h.changedAt)} {fmtTime(h.changedAt)}</span>
        </div>
      ))}
    </div>
  );
}

// The linked deal/lead breakdown shown inside a task card's Show Details —
// same accordion-card + Stage Journey timeline design as Target Management's
// Deals Won / Active Deals / Linked Leads sections, but entirely task-scoped
// (no Target lookup) so it always renders fully regardless of whether the
// sales person has a target set.
// One linked deal's card (read-only besides the "dismiss won" trash icon).
function DealLinkCard({ deal, resolvedFromLead, linkedBadgeText, hasPendingIssue, baseUrl, headers, taskId, onRefresh, taskStatus }) {
  const [expanded, setExpanded] = useState(false);
  const [dismissConfirm, setDismissConfirm] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  const stage = deal.stage;
  const isWon = stage === "Closed Won";
  const isLost = stage === "Closed Lost";
  const isLeadCompleted = !!resolvedFromLead;
  const isTaskCompleted = taskStatus === "Completed";
  const dealName = deal.dealName || deal.dealTitle;
  const bucketBg = (isWon || isLeadCompleted || isTaskCompleted) ? "bg-emerald-50 border-emerald-200" : isLost ? "bg-red-50 border-red-200" : "bg-white border-gray-200";
  const icon = (isWon || isLeadCompleted || isTaskCompleted) ? <Award size={11} className="text-emerald-500" /> : isLost ? <XCircle size={11} className="text-red-500" /> : <Briefcase size={11} />;
  const wonDate = deal.wonAt ? new Date(deal.wonAt) : null;
  const createdDate = deal.createdAt ? new Date(deal.createdAt) : null;
  const totalDays = wonDate && createdDate ? Math.max(0, Math.round((wonDate - createdDate) / 86400000)) : null;

  // A deal Admin (or anyone other than you) closed Won stays fully visible
  // here — only its Stage Journey timeline is hidden below, since that
  // history now lives in Admin's own Completed activity instead. A deal you
  // closed yourself is your own trophy to keep or dismiss whenever ready.
  const handleDismissWon = async () => {
    setDismissing(true);
    try {
      await axios.put(`${baseUrl}/tasks/${taskId}`, { dismissWonDeal: true, dealId: deal._id }, { headers });
      toast.success("Removed from this task");
      setDismissConfirm(false);
      onRefresh?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove");
    } finally {
      setDismissing(false);
    }
  };

  return (
    <div className={`rounded-2xl overflow-hidden border ${bucketBg}`}>
      <div className="px-3 pt-3 pb-2.5">
        <div className="flex items-start justify-between gap-1.5 mb-1">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">{icon} {resolvedFromLead ? "Linked Lead → Deal" : "Linked Deal"}</p>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold text-gray-800 truncate flex-1">{dealName}</p>
              <span className={`text-xs px-1.5 py-0.5 rounded border font-medium shrink-0 ${STAGE_COLOR[stage] || "bg-gray-100 text-gray-500 border-gray-200"}`}>{stage}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setExpanded((v) => !v)} className="p-1 rounded-md hover:bg-black/5 text-gray-400 hover:text-gray-600 shrink-0" title={expanded ? "Collapse" : "Expand"}>
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
        </div>
        {linkedBadgeText && (
          <span className="inline-block text-xs bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded-full border border-orange-200 mt-1">{linkedBadgeText}</span>
        )}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
          {deal.companyName && <span className="text-xs text-gray-500 flex items-center gap-1"><Building2 size={8} />{deal.companyName}</span>}
          {deal.value && <span className={`text-xs font-bold ${isWon ? "text-emerald-700" : "text-gray-700"}`}>{deal.currency || "INR"} {deal.value}</span>}
          {deal.phoneNumber && <span className="text-xs text-gray-500 flex items-center gap-1"><Phone size={8} />{deal.phoneNumber}</span>}
          {deal.email && <span className="text-xs text-gray-500 flex items-center gap-1 truncate max-w-[160px]"><Mail size={8} />{deal.email}</span>}
          {totalDays !== null && <span className="text-xs text-emerald-600 flex items-center gap-0.5"><Clock size={8} />{totalDays === 0 ? "Same day" : `${totalDays}d to close`}</span>}
        </div>
        {/* Report Issue only makes sense while the deal is still live —
            posts against the task itself (no Target dependency), so it's
            always available regardless of whether a target is set. */}
        {!isWon && !isLost && !isLeadCompleted && taskStatus !== "Completed" && (
          <ReportBox
            mode="task" taskId={taskId} itemType="deal" itemName={dealName}
            itemDetails={{ companyName: deal.companyName, value: deal.value, currency: deal.currency, phoneNumber: deal.phoneNumber, email: deal.email, statusLabel: stage, statusColor: STAGE_COLOR[stage] }}
            baseUrl={baseUrl} headers={headers}
            isReported={hasPendingIssue}
          />
        )}
      </div>

      {expanded && <DealStageJourney deal={deal} />}

      {expanded && totalDays !== null && (
        <div className="px-3 py-2 bg-emerald-100/70 flex items-center gap-1.5">
          <Clock size={11} className="text-emerald-600 shrink-0" />
          <p className="text-xs font-bold text-emerald-700">
            {totalDays === 0 ? "Closed same day" : `Total: ${totalDays} day${totalDays !== 1 ? "s" : ""} from deal creation to won`}
          </p>
        </div>
      )}
      <ConfirmModal
        open={dismissConfirm}
        title="Remove Won Deal Card"
        message={`Remove "${dealName}" from this task? It won't be deleted — your deal stays exactly as-is, this just clears it off this task.`}
        onConfirm={handleDismissWon}
        onClose={() => !dismissing && setDismissConfirm(false)}
      />
    </div>
  );
}

// One linked lead's card (read-only, sales can't unlink leads).
function LeadLinkCard({ lead, linkedBadgeText, hasPendingIssue, baseUrl, headers, taskId, taskStatus }) {
  const [expanded, setExpanded] = useState(false);
  const isTaskCompleted = taskStatus === "Completed";
  const bgClass = isTaskCompleted ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-200";

  return (
    <div className={`border rounded-xl overflow-hidden ${bgClass}`}>
      <div className="p-3">
        <div className="flex items-start justify-between gap-1.5 mb-1">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1"><FileText size={11} /> Linked Lead</p>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold text-gray-800 truncate flex-1">{lead.leadName}</p>
              <span className={`text-xs px-1.5 py-0.5 rounded border font-medium shrink-0 ${LEAD_STATUS_COLOR[lead.status] || "bg-gray-100 text-gray-500 border-gray-200"}`}>{lead.status}</span>
            </div>
          </div>
          <button onClick={() => setExpanded((v) => !v)} className="p-1 rounded-md hover:bg-black/5 text-gray-400 hover:text-gray-600 shrink-0" title={expanded ? "Collapse" : "Expand"}>
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
        {linkedBadgeText && (
          <span className="inline-block text-xs bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded-full border border-orange-200 mt-1">{linkedBadgeText}</span>
        )}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
          {lead.companyName && <span className="text-xs text-gray-500 flex items-center gap-1"><Building2 size={8} />{lead.companyName}</span>}
          {lead.phoneNumber && <span className="text-xs text-gray-500 flex items-center gap-1"><Phone size={8} />{lead.phoneNumber}</span>}
          {lead.email && <span className="text-xs text-gray-500 flex items-center gap-1 truncate max-w-[160px]"><Mail size={8} />{lead.email}</span>}
          {lead.createdAt && <span className="text-xs text-gray-300 flex items-center gap-1"><Calendar size={8} />Added {fmt(lead.createdAt)}</span>}
        </div>
        {taskStatus !== "Completed" && lead.status !== "Converted" && (
          <ReportBox
            mode="task" taskId={taskId} itemType="lead" itemName={lead.leadName}
            itemDetails={{ companyName: lead.companyName, phoneNumber: lead.phoneNumber, email: lead.email, statusLabel: lead.status, statusColor: LEAD_STATUS_COLOR[lead.status] }}
            baseUrl={baseUrl} headers={headers}
            isReported={hasPendingIssue}
          />
        )}
      </div>
      {expanded && <LeadStatusJourney lead={lead} />}
    </div>
  );
}

// Renders every linked lead/deal on this task (read-only besides dismissing a
// Closed-Won deal) — backward-compat-derived from leadRefs/dealRefs, falling
// back to the singular leadRef/dealRef for tasks created before this
// multi-link feature. The deal-stage/lead-status "journey" timeline is only
// shown on the current primary item.
function LinkedItemDetail({ task, linkedBadgeText, baseUrl, headers, onRefresh, targets }) {
  const dealItems = task.dealRefs?.length ? task.dealRefs : (task.dealRef ? [task.dealRef] : []);
  const leadItems = task.leadRefs?.length ? task.leadRefs : (task.leadRef ? [task.leadRef] : []);
  const primaryDealId = task.dealRef?._id || task.dealRef || null;
  const primaryLeadId = task.leadRef?._id || task.leadRef || null;
  const hasPendingIssue = (task.reasonNotes || []).some((n) => n.status === "pending");

  if (!dealItems.length && !leadItems.length) return null;

  return (
    <div className="space-y-4">
      {dealItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 border-b border-gray-100 pb-1"><Briefcase size={11}/> Linked Deals</p>
          {dealItems.map((deal) => (
            <DealLinkCard
              key={deal._id}
              deal={deal}
              linkedBadgeText={String(deal._id) === String(primaryDealId) ? linkedBadgeText : null}
              isActiveTargetLink={targets?.some(t => new Date(t.startDate) <= new Date() && new Date(t.endDate) >= new Date() && (t.linkedDeals || []).some(id => String(id) === String(deal._id)))}
              hasPendingIssue={hasPendingIssue}
              baseUrl={baseUrl}
              headers={headers}
              taskId={task._id}
              onRefresh={onRefresh}
              taskStatus={task.status}
            />
          ))}
        </div>
      )}
      {leadItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 border-b border-gray-100 pb-1"><FileText size={11}/> Linked Leads</p>
          {leadItems.map((lead) => {
            const isPrimary = String(lead._id) === String(primaryLeadId);
            // A converted lead has no pipeline of its own — the real stage
            // journey now lives on the deal it became. task.convertedDealRefsByLeadId
            // is attached server-side (attachConvertedDealJourney) and covers
            // EVERY converted lead on this task, not just the current primary one
            // — otherwise adding another lead/deal during an edit (which re-points
            // task.leadRef to the newest addition) demoted an already-won lead to
            // non-primary and silently dropped its Won/Stage journey.
            const resolvedFromLead = lead.status === "Converted"
              ? (task.convertedDealRefsByLeadId?.[String(lead._id)] || (isPrimary && !task.dealRef ? task.convertedDealRef : null))
              : null;
            if (resolvedFromLead) {
              return (
                <DealLinkCard
                  key={lead._id}
                  deal={resolvedFromLead}
                  resolvedFromLead
                  linkedBadgeText={linkedBadgeText}
                  isActiveTargetLink={targets?.some(t => new Date(t.startDate) <= new Date() && new Date(t.endDate) >= new Date() && (t.linkedDeals || []).some(id => String(id) === String(resolvedFromLead._id)))}
                  hasPendingIssue={hasPendingIssue}
                  baseUrl={baseUrl}
                  headers={headers}
                  taskId={task._id}
                  onRefresh={onRefresh}
                  taskStatus={task.status}
                />
              );
            }
            return (
              <LeadLinkCard
                key={lead._id}
                lead={lead}
                linkedBadgeText={isPrimary ? linkedBadgeText : null}
                isActiveTargetLink={targets?.some(t => new Date(t.startDate) <= new Date() && new Date(t.endDate) >= new Date() && (t.linkedLeads || []).some(id => String(id) === String(lead._id)))}
                hasPendingIssue={hasPendingIssue}
                baseUrl={baseUrl}
                headers={headers}
                taskId={task._id}
                taskStatus={task.status}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Notes Modal (add/edit delay notes) ─────────────────────── */
function NotesModal({ open, task, onClose, onSave }) {
  const [notes, setNotes] = useState("");
  useEffect(() => { if (open) setNotes(task?.completionNotes || ""); }, [open, task]);

  if (!open || !task) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-slate-700 flex items-center gap-2">
            <StickyNote size={16} className="text-amber-500" /> Add Note
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X size={16} className="text-gray-400" />
          </button>
        </div>
        <div className="p-5">
          <p className="text-xs text-gray-400 mb-3">
            Explain any delays or updates for: <span className="font-semibold text-gray-600">{task.title}</span>
          </p>
          <textarea
            rows={4}
            autoFocus
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-400 resize-none"
            placeholder="e.g. Lead took extra time due to 3 follow-up calls..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1.5">This note will be visible to admin.</p>
          <div className="flex gap-2 mt-4">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={() => onSave(notes)}
              className="flex-1 py-2 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600"
            >
              Save Note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Complete Task Modal ─────────────────────── */
function CompleteModal({ open, task, onClose, onConfirm }) {
  const [notes, setNotes] = useState("");
  useEffect(() => { if (open) setNotes(task?.completionNotes || ""); }, [open, task]);

  if (!open || !task) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-slate-700 flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-500" /> Mark as Done
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X size={16} className="text-gray-400" />
          </button>
        </div>
        <div className="p-5">
          <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-200">
            <p className="text-sm font-semibold text-gray-700">{task.title}</p>
            {task.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{task.description}</p>}
          </div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Completion notes <span className="text-gray-400 font-normal text-xs">(optional)</span>
          </label>
          <textarea
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/50 focus:border-emerald-400 resize-none"
            placeholder="Any final notes for admin..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex gap-2 mt-4">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={() => onConfirm(notes)}
              className="flex-1 py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 flex items-center justify-center gap-1.5"
            >
              <CheckCircle size={15} /> Submit as Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Task Card ─────────────────────── */
function AssignedTaskCard({ task, baseUrl, headers, onRefresh, targets, progressFallback }) {
  const [expanded, setExpanded] = useState(false);
  const isOverdue = task.dueDate && isDateOverdue(task.dueDate) && task.status !== "Completed";
  const hasPendingIssue = (task.reasonNotes || []).some((n) => n.status === "pending");
  const adminTookTask = getAdminTookTaskBadge(task);

  const primaryLead = task.leadRefs?.length ? task.leadRefs[0] : task.leadRef;
  const primaryDeal = task.dealRefs?.length ? task.dealRefs[0] : task.dealRef;
  const leadName = primaryLead?.leadName
    ? `${primaryLead.leadName}${primaryLead.companyName ? ` · ${primaryLead.companyName}` : ""}`
    : null;
  const dealName = primaryDeal?.dealName || primaryDeal?.dealTitle || null;
  const linkedBadgeText = getLinkedItemBadgeText(task.linkedItemBadge);
  const hasLinkedItems = (task.leadRefs?.length > 0) || (task.dealRefs?.length > 0) || primaryLead || primaryDeal;
  const progressPct = STATUS_PROGRESS[task.status] ?? 0;
  // No Target covering this task yet? Fall back to your own real (self-only)
  // progress scoped to THIS task's own linked lead/deal, instead of an
  // all-zero card or another task's unrelated numbers.
  const currentTarget = resolveCurrentTarget(targets || [], undefined, task) || progressFallback?.[task._id] || null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className={`h-1.5 w-full ${getProgressColor(progressPct)}`} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <div className="min-w-0 flex-1">
            <h3 className="text-slate-700 truncate">{task.title}</h3>
            <p className="text-base text-slate-600 flex items-center gap-1 mt-1">
              <User size={9} />From: {task.createdBy?.firstName} {task.createdBy?.lastName}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-md font-medium border ${task.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : task.status === 'In Progress' ? 'bg-amber-50 text-amber-600 border-amber-200' : task.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>{task.status || "New"}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
          </div>
        </div>

        {adminTookTask && (
          <span className="inline-block w-fit text-xs bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded-full border border-orange-200 mb-2">
            Admin took this task — {adminTookTask}
          </span>
        )}

        {hasPendingIssue && (
          <div className="flex items-center gap-1.5 mb-2 px-2.5 py-1.5 bg-rose-50 border border-rose-200 rounded-lg w-fit">
            <Flag size={11} className="text-rose-500 shrink-0" />
            <span className="text-xs font-bold text-rose-700">Pending Admin Review</span>
          </div>
        )}

        <p className="text-xs text-gray-400 mb-2 mt-1">Due {fmt(task.dueDate)}{isOverdue ? " (Overdue)" : ""}</p>

        <TaskProgressWidget task={task} />


        {/* Description */}
        {task.description && (
          <div className="mb-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 flex items-start gap-2">
            <StickyNote size={12} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-0.5">Task Description</p>
              <p className="text-xs text-amber-800 font-medium leading-relaxed">{task.description}</p>
            </div>
          </div>
        )}

        {/* Your notes */}
        {task.completionNotes && (
          <div className="mb-3 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 flex items-start gap-2">
            <StickyNote size={12} className="text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-0.5">Your Notes</p>
              <p className="text-xs text-blue-800 font-medium leading-relaxed break-words">{task.completionNotes}</p>
            </div>
          </div>
        )}

        {/* Toggle */}
        {hasLinkedItems && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-center gap-1.5 text-sm font-bold text-gray-700 hover:text-[#008ecc] py-2 border-t border-gray-100 transition-colors"
          >
            {expanded ? <><ChevronUp size={15} /> Hide Details</> : <><ChevronDown size={15} /> Show Details</>}
          </button>
        )}

        {expanded && hasLinkedItems && (
          <div className="mt-4 space-y-4">
            <LinkedItemDetail task={task} linkedBadgeText={linkedBadgeText} baseUrl={baseUrl} headers={headers} onRefresh={onRefresh} targets={targets} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Table View with expandable Tracking Journey rows ─────────────────────── */
function AssignedTaskTableView({ tasks, onStartTask, onCompleteTask, onAddNote, baseUrl, headers, onRefresh }) {
  const [expandedId, setExpandedId] = useState(null);
  const [dismissConfirm, setDismissConfirm] = useState(null); // task
  const [dismissing, setDismissing] = useState(false);

  // Same self-won-deal dismissal as the card view's "Remove this card" —
  // a deal Admin closed Won never reaches this row at all (filtered out
  // server-side), so this is always your own trophy to keep or clear.
  const handleDismissWon = async () => {
    if (!dismissConfirm) return;
    setDismissing(true);
    try {
      const dealId = dismissConfirm.dealRef?._id || dismissConfirm.dealRef;
      await axios.put(`${baseUrl}/tasks/${dismissConfirm._id}`, { dismissWonDeal: true, dealId }, { headers });
      toast.success("Removed from this task");
      setDismissConfirm(null);
      onRefresh?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove");
    } finally {
      setDismissing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1.4fr_1.3fr] bg-gray-50 border-b border-gray-200 px-4 py-3">
        {["Task", "Priority", "Status", "Due Date", "Linked Lead/Deal", "Actions"].map((h, i) => (
          <div key={i} className={`text-xs font-bold text-gray-600 uppercase tracking-wide ${i >= 1 && i <= 3 ? "text-center" : i === 5 ? "text-center" : ""}`}>{h}</div>
        ))}
      </div>

      {tasks.map((task) => {
        const isOverdue = task.dueDate && isDateOverdue(task.dueDate) && task.status !== "Completed";
        const isCompleted = task.status === "Completed";
        const isPending = task.status === "Pending";
        const isInProgress = task.status === "In Progress";
        const history = [...(task.history || [])].sort((a, b) => new Date(a.at) - new Date(b.at));
        const isExpanded = expandedId === task._id;
        // Stays visible here whether you or Admin closed it Won — the
        // dismiss button below just clears it off your own list once you've
        // seen it (backend allows the dismiss regardless of who won it).
        const dealForJourney = task.dealRef || task.convertedDealRef;
        const isWonDeal = dealForJourney?.stage === "Closed Won";
        const primaryLead = task.leadRefs?.length ? task.leadRefs[0] : task.leadRef;
        const primaryDeal = task.dealRefs?.length ? task.dealRefs[0] : task.dealRef;
        const leadName = primaryLead?.leadName || null;
        const dealName = primaryDeal?.dealName || primaryDeal?.dealTitle || null;
        const linkedBadgeText = getLinkedItemBadgeText(task.linkedItemBadge);

        return (
          <div key={task._id} className="border-b border-gray-100 last:border-0">
            {/* Summary row */}
            <div
              className={`grid grid-cols-[2fr_1fr_1fr_1fr_1.4fr_1.3fr] px-4 py-3.5 cursor-pointer transition-colors ${isExpanded ? "bg-blue-50/50" : "hover:bg-gray-50/70"}`}
              onClick={() => setExpandedId(isExpanded ? null : task._id)}
            >
              {/* Task */}
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-1.5 h-8 rounded-full shrink-0 ${isCompleted ? "bg-emerald-400" : isInProgress ? "bg-blue-400" : isOverdue ? "bg-red-300" : "bg-gray-200"}`} />
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate">{task.title}</p>
                  {task.description && <p className="text-xs text-gray-400 truncate mt-0.5">{task.description}</p>}
                </div>
                <div className="ml-1 shrink-0">{isExpanded ? <ChevronUp size={14} className="text-[#008ecc]" /> : <ChevronDown size={14} className="text-gray-400" />}</div>
              </div>
              {/* Priority */}
              <div className="flex items-center justify-center">
                <span className={`text-xs px-2 py-0.5 rounded-md font-medium border ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
              </div>
              {/* Status */}
              <div className="flex items-center justify-center">
                <span className={`text-xs px-2 py-0.5 rounded-md font-medium flex items-center gap-1 ${
                  isCompleted ? "bg-emerald-50 text-emerald-600" : isInProgress ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"
                }`}>
                  {isCompleted ? <CheckCircle size={9} /> : isInProgress ? <AlertCircle size={9} /> : <Clock size={9} />}
                  {task.status}
                </span>
              </div>
              {/* Due Date */}
              <div className="flex items-center justify-center">
                <span className={`text-xs font-semibold flex items-center gap-1 ${isOverdue && !isCompleted ? "text-red-500" : "text-gray-600"}`}>
                  <Calendar size={9} />{fmt(task.dueDate)}
                </span>
              </div>
              {/* Linked Lead/Deal */}
              <div className="flex flex-col justify-center gap-0.5 min-w-0">
                {leadName && <span className="text-xs text-gray-700 truncate flex items-center gap-1"><FileText size={9} className="text-blue-500 shrink-0" />{leadName}</span>}
                {dealName && <span className="text-xs text-gray-700 truncate flex items-center gap-1"><Briefcase size={9} className="text-blue-500 shrink-0" />{dealName}</span>}
                {linkedBadgeText && <span className="text-xs bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded-full border border-orange-200 w-fit truncate max-w-full">{linkedBadgeText}</span>}
                {!leadName && !dealName && <span className="text-xs text-gray-300">—</span>}
              </div>
              {/* Actions */}
              <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                {isPending && (
                  <>
                    <button onClick={() => onAddNote(task)} className="p-1.5 rounded-md border border-amber-200 text-amber-600 hover:bg-amber-50" title="Add a note"><MessageSquare size={12} /></button>
                    <button onClick={() => onStartTask(task)} className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-[#008ecc] text-white hover:bg-[#0077aa] text-xs font-semibold"><ArrowRight size={11} /> Start</button>
                  </>
                )}
                {isInProgress && (
                  <>
                    <button onClick={() => onAddNote(task)} className="p-1.5 rounded-md border border-amber-200 text-amber-600 hover:bg-amber-50" title="Add a note"><MessageSquare size={12} /></button>
                    <button onClick={() => onCompleteTask(task)} className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-bold"><CheckCircle size={11} /> Done</button>
                  </>
                )}
                {isCompleted && <span className="text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle size={12} /> Completed</span>}
              </div>
            </div>

            {/* Expanded — Tracking Journey */}
            {isExpanded && (
              <div className="px-4 pb-4 pt-1 bg-blue-50/30 border-t border-blue-100">
                {task.completionNotes && (
                  <div className="flex items-start gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2 mb-3 mt-2">
                    <StickyNote size={12} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-600 break-words">{task.completionNotes}</p>
                  </div>
                )}
                <p className="text-xs font-bold text-gray-600 flex items-center gap-1.5 mb-2 mt-2">
                  <History size={13} /> Tracking Journey ({history.length})
                </p>
                {history.length === 0 ? (
                  <p className="text-xs text-gray-400">No history recorded yet.</p>
                ) : (
                  <div className="space-y-1.5 bg-white border border-gray-100 rounded-xl p-3 max-w-2xl">
                    {history.map((h, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#008ecc] mt-1 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-700">{h.event}</p>
                          {h.detail && <p className="text-xs text-gray-500 break-words">{h.detail}</p>}
                          <p className="text-xs text-gray-400">{fmt(h.at)} {fmtTime(h.at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Full Lead → Deal Stage Journey — same timeline the Card view
                    shows via LinkedItemDetail, now also visible in Table view.
                    convertedDealRef covers a task still linked to the original
                    Lead after it's been converted to a Deal elsewhere. */}
                {dealForJourney && (
                  <div className="mt-3 -mx-4 bg-white">
                    <DealStageJourney deal={dealForJourney} />
                  </div>
                )}
                {!task.dealRef && !task.convertedDealRef && task.leadRef && <div className="mt-3 -mx-4 bg-white"><LeadStatusJourney lead={task.leadRef} /></div>}
              </div>
            )}
          </div>
        );
      })}

      <ConfirmModal
        open={!!dismissConfirm}
        title="Remove Won Deal Card"
        message={`Remove "${dismissConfirm?.dealRef?.dealName || dismissConfirm?.dealRef?.dealTitle || dismissConfirm?.convertedDealRef?.dealName || "this deal"}" from this task? It won't be deleted — your deal stays exactly as-is, this just clears it off this task.`}
        onConfirm={handleDismissWon}
        onClose={() => !dismissing && setDismissConfirm(null)}
      />
    </div>
  );
}

/* ── Main Component ─────────────────────── */
export default function AssignedTasks() {
  const location = useLocation();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(location.state?.filter || "All");
  const [filterInitialized, setFilterInitialized] = useState(!!location.state?.filter);
  const [completeModal, setCompleteModal] = useState({ open: false, task: null });
  const [notesModal, setNotesModal] = useState({ open: false, task: null });
  const { notifications, setNotifications, fetchNotifications } = useNotifications();
  const [mainView, setMainView] = useState("tasks"); // "tasks" | "notifications"
  const [viewMode, setViewMode] = useState("card"); // "card" | "table"
  const [targets, setTargets] = useState([]);
  // Task's own Progress-card ratio snapshots for tasks where you have no real
  // Target covering it yet — keyed by taskId, see GET /tasks/progress/mine
  // (services/taskProgressService.js, independent of Target Management).
  const [progressFallback, setProgressFallback] = useState({});
  const [myDashStats, setMyDashStats] = useState(null);
  const [dashFilter, setDashFilter] = useState("all");
  const [dashStartDate, setDashStartDate] = useState("");
  const [dashEndDate, setDashEndDate] = useState("");
  const socket = useSocket();
  const targetSocket = useTargetSocket();
  const [showWorkflowExplanation, setShowWorkflowExplanation] = useState(false);

  const [overdueReasonNote, setOverdueReasonNote] = useState("");
  const [submittingOverdueReason, setSubmittingOverdueReason] = useState(false);

  // Deadline reminder/due-today/approval notifications — real-time via the shared socket,
  // no page refresh needed.
  const taskReminderNotifications = notifications
    .filter(TASK_NOTIF_TYPES_FILTER)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const unreadReminderCount = taskReminderNotifications.filter((n) => !n.read && !n.isRead).length;

  const token = localStorage.getItem("token");
  const tenantSlug = localStorage.getItem("tenantSlug");
  const baseUrl = `${SI_URI}/${tenantSlug}/api`;
  const headers = { Authorization: `Bearer ${token}` };

  // Request-id guards — with real-time refreshes firing in bursts, an older
  // in-flight response could otherwise land after a newer one and overwrite
  // it with stale data (the "needs a manual refresh" symptom).
  const tasksReqId = useRef(0);
  const targetsReqId = useRef(0);

  const fetchTasks = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    const reqId = ++tasksReqId.current;
    try {
      const { data } = await axios.get(`${baseUrl}/tasks`, { headers });
      if (reqId === tasksReqId.current) setTasks(data);
    } catch {
      if (reqId === tasksReqId.current) toast.error("Failed to load tasks");
    } finally {
      if (showLoading && reqId === tasksReqId.current) setLoading(false);
    }
  }, [baseUrl]);

  // Own targets (weekly/monthly, already enriched with actuals/percentages)
  // — same data MyTargets.jsx uses, reused here for the per-task progress
  // grid and the personal "Monthly Overview" header.
  const fetchTargets = useCallback(async () => {
    const reqId = ++targetsReqId.current;
    // These 3 endpoints are independent — fetching them in parallel instead
    // of one-after-another is what makes the Progress card populate right
    // away instead of visibly filling in over several seconds after the task
    // cards themselves have already appeared.
    const [targetsRes, fallbackRes] = await Promise.allSettled([
      axios.get(`${baseUrl}/targets/my`, { headers }),
      axios.get(`${baseUrl}/tasks/progress/mine`, { headers }),
    ]);

    if (reqId !== targetsReqId.current) return;
    if (targetsRes.status === "fulfilled") setTargets(targetsRes.value.data);
    else console.error("Failed to load targets", targetsRes.reason);
    if (fallbackRes.status === "fulfilled") setProgressFallback(fallbackRes.value.data);
    else console.error("Failed to load progress fallback", fallbackRes.reason);
  }, [baseUrl]);

  const fetchDashStats = useCallback(async () => {
    try {
      const params = new URLSearchParams({ period: dashFilter });
      if (dashFilter === "custom") {
        if (dashStartDate) params.append("startDate", dashStartDate);
        if (dashEndDate) params.append("endDate", dashEndDate);
      }
      const statsRes = await axios.get(`${baseUrl}/targets/my-dashboard-stats?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      setMyDashStats(statsRes.data);
    } catch (error) {
      console.error("Failed to fetch dash stats", error);
    }
  }, [baseUrl, dashFilter, dashStartDate, dashEndDate, token]);

  useEffect(() => {
    if (token) fetchDashStats();
  }, [fetchDashStats, token]);

  const handleMarkNotifRead = (n) => {
    if (n.read || n.isRead || !n._id || String(n._id).includes("-")) return;
    setNotifications((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true, isRead: true } : x)));
    axios.patch(`${baseUrl}/notifications/read/${n._id}`, {}, { headers }).catch(() => {});
  };

  const handleDismissNotif = (e, n) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((x) => x._id !== n._id));
    if (n._id && !String(n._id).includes("-")) {
      axios.delete(`${baseUrl}/notifications/${n._id}`, { headers }).catch(() => {});
    }
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => {
      const unread = prev.filter((n) => TASK_NOTIF_TYPES_FILTER(n) && !n.read && !n.isRead && n._id && !String(n._id).includes("-"));
      if (unread.length > 0) {
        unread.forEach((n) => axios.patch(`${baseUrl}/notifications/read/${n._id}`, {}, { headers }).catch(() => {}));
      }
      return prev.map((n) => (TASK_NOTIF_TYPES_FILTER(n) ? { ...n, read: true, isRead: true } : n));
    });
  };

  useEffect(() => {
    if (mainView !== "notifications") return;
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainView]);

  // Sync filter tab when navigating here from a notification click
  useEffect(() => {
    if (location.state?.filter) {
      setFilter(location.state.filter);
      setFilterInitialized(true);
    }
  }, [location.state?.filter]);

  // Auto-select the most relevant view on first visit (no explicit navigation state)
  useEffect(() => {
    if (filterInitialized) return;
    const approvedUnread = notifications.filter((n) => n.type === "task" && n.meta?.taskApproved && !n.read && !n.isRead).length;
    const assignedUnread = notifications.filter((n) => n.type === "task" && n.meta?.taskAssigned && !n.read && !n.isRead).length;
    if (approvedUnread > 0) {
      setMainView("notifications");
    } else if (assignedUnread > 0) {
      setFilter("New Task");
    }
    setFilterInitialized(true);
  }, [notifications, filterInitialized]);

  useEffect(() => {
    fetchTasks(true); // show loading spinner only on initial mount
    fetchTargets();
  }, []);

  // Live refresh — admin creating/editing/reassigning a task reflects here
  // instantly, no manual page refresh, no loading-spinner blink.
  useEffect(() => {
    if (!socket) return;
    const handler = () => { fetchTasks(false); fetchTargets(); };
    socket.on("tasks_refresh", handler);
    return () => socket.off("tasks_refresh", handler);
  }, [socket, fetchTasks, fetchTargets]);

  // Safety net alongside the socket push above — a missed/late "tasks_refresh"
  // event (e.g. brief disconnect right when Admin creates the task) would
  // otherwise leave a newly-assigned task invisible here until a manual
  // reload. Silent background poll, no loading-spinner blink (showLoading=false).
  useEffect(() => {
    // 2min, not 20s — this only needs to catch a missed socket event, not
    // act as the primary refresh mechanism, so it doesn't need to be this
    // frequent and was doubling baseline request volume for every open tab.
    const interval = setInterval(() => fetchTasks(false), 120000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  // A Target created/updated/reassigned for you (separate target socket
  // channel — see MyTargets.jsx for the same pattern) should update this
  // page's "Target Progress" grid live too, instead of it sitting on stale
  // "No active target set" until a manual reload.
  useEffect(() => {
    if (!targetSocket) return;
    const handler = () => fetchTargets();
    targetSocket.on("targets_refresh", handler);
    return () => targetSocket.off("targets_refresh", handler);
  }, [targetSocket, fetchTargets]);

  // Badge count for the "New Task" tab
  const newTaskCount = notifications.filter((n) => n.type === "task" && n.meta?.taskAssigned && !n.read && !n.isRead).length;

  // Mark task-assigned notifications as read when "New Task" tab is clicked
  // Also persist to DB so they don't re-appear as unread on next login
  useEffect(() => {
    if (filter === "New Task") {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      setNotifications((prev) => {
        const unread = prev.filter((n) => n.type === "task" && n.meta?.taskAssigned && !n.read && !n.isRead && n._id && !String(n._id).includes("-"));
        // Persist each to DB
        unread.forEach((n) => {
          axios.patch(`${API_URL}/notifications/read/${n._id}`, {}, { headers }).catch(() => {});
        });
        return prev.map((n) =>
          n.type === "task" && n.meta?.taskAssigned ? { ...n, read: true, isRead: true } : n
        );
      });
    }
  }, [filter]);

  const handleStartTask = async (task) => {
    // Optimistic update — move task to In Progress instantly
    setTasks((prev) => prev.map((t) => t._id === task._id ? { ...t, status: "In Progress" } : t));
    setFilter("All");
    try {
      await axios.put(`${baseUrl}/tasks/${task._id}`, { status: "In Progress" }, { headers });
    } catch {
      toast.error("Failed to start task");
      fetchTasks(); // restore on error
    }
  };

  const handleSaveNote = async (notes) => {
    const { task } = notesModal;
    try {
      await axios.put(`${baseUrl}/tasks/${task._id}`, { completionNotes: notes }, { headers });
      toast.success("Note saved and admin notified");
      setNotesModal({ open: false, task: null });
      fetchTasks();
    } catch {
      toast.error("Failed to save note");
    }
  };

  const handleCompleteConfirm = async (notes) => {
    const { task } = completeModal;
    // Optimistic update — move to Completed instantly
    setTasks((prev) => prev.map((t) => t._id === task._id ? { ...t, status: "Completed", completionNotes: notes, approvedByAdmin: false } : t));
    setCompleteModal({ open: false, task: null });
    setFilter("All");
    try {
      await axios.put(`${baseUrl}/tasks/${task._id}`, { status: "Completed", completionNotes: notes }, { headers });
      toast.success("Task marked as done! Admin notified.");
    } catch {
      toast.error("Failed to complete task");
      fetchTasks(); // restore on error
    }
  };

  const FILTERS = ["All", "New Task"];
  const filtered = filter === "New Task" ? tasks.filter((t) => t.status === "Pending") : tasks;

  const overdueBlockingTask = tasks.find((t) => {
    if (t.status === "Completed" || t.status === "Rejected") return false;
    const isOverdue = isDateOverdue(t.dueDate);
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
      await axios.post(`${baseUrl}/tasks/${overdueBlockingTask._id}/reason-note`, { note: overdueReasonNote }, { headers });
      toast.success("Reason submitted to admin for review");
      fetchTasks();
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

      {overdueBlockingTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-[90%] max-w-md">
            <div className="flex items-center gap-3 mb-4 text-red-600">
              <AlertCircle size={28} />
              <h2 className="text-xl font-bold">Overdue Task Block</h2>
            </div>
            <p className="text-gray-700 mb-2">
              Your task <strong>"{overdueBlockingTask.title}"</strong> is overdue.
            </p>
            {overdueBlockingTask.reasonNotes?.length > 0 && overdueBlockingTask.reasonNotes[overdueBlockingTask.reasonNotes.length - 1].status === "rejected" && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4 border border-red-200">
                <strong>Reason Rejected:</strong> {overdueBlockingTask.reasonNotes[overdueBlockingTask.reasonNotes.length - 1].rejectReason || "Your previous reason was rejected by the admin. Please submit a valid reason."}
              </div>
            )}
            <p className="text-sm text-gray-500 mb-4">
              You must submit a reason for the delay to continue using your Tasks.
            </p>
            <textarea
              className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={4}
              placeholder="Explain why this task is delayed..."
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

      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 flex items-center gap-2">
            <ClipboardList size={20} className="text-[#008ecc]" />
            My Tasks
            <button 
              onClick={() => setShowWorkflowExplanation(true)}
              className="ml-1 p-1 rounded-full text-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-colors bg-white border border-gray-200"
              title="How Tasks Work"
            >
              <Info size={16} />
            </button>
          </h1>
          <p className="text-base text-slate-600 mt-1">Tasks assigned to you by your admin</p>
        </div>
      </div>

      {/* How it works — compact */}
      <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5 mb-5 text-xs text-blue-700">
        <span className="font-semibold">Flow:</span>
        <span>Start Task</span>
        <ArrowRight size={12} className="text-blue-400" />
        <span>Mark as Done</span>
        <ArrowRight size={12} className="text-blue-400" />
        <span>Admin Approves → Complete task Automatically Removed</span>
        <span className="ml-auto text-blue-400 font-medium">Use <MessageSquare size={11} className="inline" /> to add notes anytime</span>
      </div>

      {/* Stats — same "Monthly Overview" icon-card concept as admin Task
          Management, same self-scoped /targets/my-dashboard-stats data
          source, so it always shows real numbers even with zero active
          Targets. */}
      {mainView === "tasks" && myDashStats && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-slate-900">My Dashboard Overview</h2>
            <div className="flex items-center gap-2">
              <select 
                value={dashFilter}
                onChange={(e) => setDashFilter(e.target.value)}
                className="text-xs border-gray-300 rounded-md py-1 px-2 focus:ring-[#008ecc] focus:border-[#008ecc]"
              >
                <option value="all">All Time</option>
                <option value="this_month">This Month</option>
                <option value="custom">Custom Date</option>
              </select>
              {dashFilter === "custom" && (
                <div className="flex items-center gap-1">
                  <input 
                    type="date" 
                    value={dashStartDate}
                    onChange={(e) => setDashStartDate(e.target.value)}
                    className="text-xs border-gray-300 rounded-md py-1 px-2 focus:ring-[#008ecc] focus:border-[#008ecc]"
                  />
                  <span className="text-xs text-gray-500">to</span>
                  <input 
                    type="date" 
                    value={dashEndDate}
                    onChange={(e) => setDashEndDate(e.target.value)}
                    className="text-xs border-gray-300 rounded-md py-1 px-2 focus:ring-[#008ecc] focus:border-[#008ecc]"
                  />
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Leads" value={myDashStats.monthly.totalLeads} icon={<Users size={16} />}     color="text-blue-600"   bg="bg-blue-50 border border-blue-100" />
            <StatCard label="Total Deals" value={myDashStats.monthly.totalDeals} icon={<Briefcase size={16} />} color="text-sky-600"    bg="bg-sky-50 border border-sky-100" />
            <StatCard label="Deal Closed"   value={myDashStats.monthly.wonDeals}   icon={<Award size={16} />}     color="text-indigo-600" bg="bg-indigo-50 border border-indigo-100" />
            <StatCard label="Deal Lost"  value={myDashStats.monthly.lostDeals}  icon={<XCircle size={16} />}   color="text-red-600"    bg="bg-red-50 border border-red-100" />
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {FILTERS.map((f) => {
          const badge = f === "New Task" ? newTaskCount : 0;
          const isActive = filter === f && mainView === "tasks";
          return (
            <button
              key={f}
              onClick={() => { setFilter(f); setMainView("tasks"); }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                isActive
                  ? "bg-[#008ecc] text-white shadow-sm"
                  : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"
              }`}
            >
              {f}
              {badge > 0 && (
                <span className={`min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-xs font-bold px-1 ${
                  isActive ? "bg-white/30 text-white" : "bg-[#008ecc] text-white"
                }`}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Notifications & Reminders tab */}
        <button
          onClick={() => setMainView(mainView === "notifications" ? "tasks" : "notifications")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
            mainView === "notifications"
              ? "bg-[#008ecc] text-white"
              : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"
          }`}
        >
          <Bell size={13} /> Notifications & Reminders
          {unreadReminderCount > 0 && (
            <span className="ml-1 bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[16px] text-center leading-none">
              {unreadReminderCount}
            </span>
          )}
        </button>

        {/* Count + Card/Table toggle */}
        <span className="ml-auto text-xs text-gray-400 mr-2">{filtered.length} task{filtered.length !== 1 ? "s" : ""}</span>
        <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => { setViewMode("card"); setMainView("tasks"); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-all ${viewMode === "card" && mainView === "tasks" ? "bg-[#008ecc] text-white" : "text-gray-500 hover:bg-gray-50"}`}
          >
            <LayoutGrid size={14} /> Card
          </button>
          <button
            onClick={() => { setViewMode("table"); setMainView("tasks"); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-all ${viewMode === "table" && mainView === "tasks" ? "bg-[#008ecc] text-white" : "text-gray-500 hover:bg-gray-50"}`}
          >
            <List size={14} /> Table
          </button>
          <button
            onClick={() => { setViewMode("pipeline"); setMainView("tasks"); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-all ${viewMode === "pipeline" && mainView === "tasks" ? "bg-[#008ecc] text-white" : "text-gray-500 hover:bg-gray-50"}`}
          >
            <Activity size={14} /> Pipeline
          </button>
        </div>
      </div>

      {/* ── NOTIFICATIONS & REMINDERS VIEW ── */}
      {mainView === "notifications" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-slate-900 flex items-center gap-2">
              <Bell size={16} className="text-amber-500" /> Notifications & Reminders
            </h2>
            <div className="flex items-center gap-3">
              {unreadReminderCount > 0 && (
                <button onClick={handleMarkAllRead} className="text-xs text-[#008ecc] hover:underline font-medium">Mark all as read</button>
              )}
              <button onClick={fetchNotifications} className="text-xs text-gray-500 hover:text-gray-800 font-medium">
                Refresh
              </button>
            </div>
          </div>
          {taskReminderNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Bell size={36} className="mb-3 opacity-20" />
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="text-xs mt-1">Reminders appear here 1 day before & on the due date</p>
            </div>
          ) : (
            taskReminderNotifications.map((n, i) => {
              const isDueToday = !!n.meta?.taskDueToday;
              const isApproved = !!n.meta?.taskApproved;
              const accent = getNotificationAccentClass(n);
              const typeStyle = accent || (isApproved ? "border-emerald-200 bg-emerald-50" : isDueToday ? "border-orange-200 bg-orange-50" : "border-amber-200 bg-amber-50");
              const icon = isApproved
                ? <CheckCircle size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                : isDueToday
                ? <Clock size={15} className="text-orange-500 shrink-0 mt-0.5" />
                : <Bell size={15} className="text-amber-500 shrink-0 mt-0.5" />;
              const isUnread = !n.read && !n.isRead;
              return (
                <div
                  key={n._id || i}
                  onClick={() => handleMarkNotifRead(n)}
                  className={`border ${accent ? "border-l-4" : ""} rounded-2xl px-4 py-3.5 flex items-start gap-3 cursor-pointer ${typeStyle} ${isUnread ? "shadow-sm" : "opacity-80"}`}
                >
                  {icon}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800">{n.title}</p>
                    <p className="text-xs text-gray-700 font-medium mt-0.5 leading-relaxed whitespace-pre-line">{n.message}</p>
                    {n.meta?.linkedName && (
                      <div className="mt-2 bg-white/70 border border-gray-100 rounded-lg px-2.5 py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wide flex items-center gap-1">
                          {n.meta.linkedType === "deal" ? <Briefcase size={10} /> : <FileText size={10} />}
                          {n.meta.linkedType === "deal" ? "Deal" : "Lead"}: {n.meta.linkedName}
                        </span>
                        {n.meta.linkedCompany && <span className="text-xs text-gray-500 flex items-center gap-1"><Building2 size={9} />{n.meta.linkedCompany}</span>}
                        {n.meta.linkedPhone && <span className="text-xs text-gray-500 flex items-center gap-1"><Phone size={9} />{n.meta.linkedPhone}</span>}
                        {n.meta.linkedEmail && <span className="text-xs text-gray-500 flex items-center gap-1 truncate"><Mail size={9} />{n.meta.linkedEmail}</span>}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1"><Clock size={9} />{fmt(n.createdAt)} {fmtTime(n.createdAt)}</p>
                  </div>
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
                      onClick={(e) => handleDismissNotif(e, n)}
                      className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                      title="Remove notification"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Cards */}
      {mainView === "tasks" && (loading ? (
        <div className="flex justify-center items-center h-40 text-gray-400 text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <CheckCircle size={40} className="mb-2 opacity-20" />
          <p className="text-sm font-medium">No tasks here</p>
          <p className="text-xs text-center mt-1">Completed tasks disappear after admin approval — check Notifications & Reminders</p>
        </div>
      ) : viewMode === "card" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
          {filtered.map((task) => (
            <AssignedTaskCard key={task._id} task={task} baseUrl={baseUrl} headers={headers} onRefresh={() => { fetchTasks(false); fetchTargets(); }} targets={targets} progressFallback={progressFallback} />
          ))}
        </div>
      ) : viewMode === "pipeline" ? (
        <TaskPipelineView
          tasks={filtered}
          baseUrl={baseUrl}
          headers={headers}
          onRefresh={() => { fetchTasks(false); fetchTargets(); }}
          onEdit={(t) => {}} 
        />
      ) : (
        <AssignedTaskTableView
          tasks={filtered}
          onStartTask={handleStartTask}
          onCompleteTask={(t) => setCompleteModal({ open: true, task: t })}
          onAddNote={(t) => setNotesModal({ open: true, task: t })}
          baseUrl={baseUrl}
          headers={headers}
          onRefresh={() => { fetchTasks(false); fetchTargets(); }}
        />
      ))}

      <NotesModal
        open={notesModal.open}
        task={notesModal.task}
        onClose={() => setNotesModal({ open: false, task: null })}
        onSave={handleSaveNote}
      />

      <CompleteModal
        open={completeModal.open}
        task={completeModal.task}
        onClose={() => setCompleteModal({ open: false, task: null })}
        onConfirm={handleCompleteConfirm}
      />
      
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
          <Info className="text-blue-500" />
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
          
          <div className="bg-blue-50 p-4 rounded-lg mt-4 border border-blue-100">
            <p className="font-semibold text-blue-800 mb-1">Key Takeaway:</p>
            <p className="text-blue-700">
              The entire pipeline is driven by <strong>actual sales actions</strong> (converting leads, winning deals) rather than manual status dropdowns. This guarantees accurate reporting for the company.
            </p>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
