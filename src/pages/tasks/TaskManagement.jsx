import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNotifications } from "../../context/NotificationContext";
import { useSocket } from "../../context/SocketContext";
import { useTargetSocket } from "../../context/TargetSocketContext";
import { todayISO, validateTaskDueDate, isDateOverdue } from "../../utils/dateValidation";
import { isTaskTabNotif, getNotificationAccentClass } from "../../utils/taskNotifications";
import {
  Plus, Trash2, CheckCircle, Clock, User,
  Calendar, X, Edit2, StickyNote,
  FileText, Briefcase, Bell, ArrowRightLeft, Check, ChevronDown, ChevronUp, History,
  Users, Building2, Phone, Mail, LayoutGrid, List, Trophy, Award, XCircle, 
  TrendingUp, Flag, Activity, Target, AlertCircle, Info, CheckCheck, Search,
  ClipboardList
} from "lucide-react";

import TaskPipelineView from "./TaskPipelineView";

function fmt(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtTime(date) {
  if (!date) return "";
  return new Date(date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

// Which admin actually touched this task's linked lead/deal — shown so the
// admin always sees who converted the lead or moved the deal's stage,
// whether it was Admin (themselves) or the assigned sales person.
// badge.isSelf means "the task's own assignee did it themselves" (not the
// current viewer) — this page is Admin-only, so isSelf renders the sales
// person's name, never "You".
function getLinkedItemBadgeText(badge) {
  if (!badge) return null;
  const who = badge.isAdmin ? `Admin ${badge.name || "—"}` : (badge.name || "Someone");
  if (badge.kind === "lead") return `${who} converted the lead to deal`;
  if (badge.kind === "deal_stage") return `${who} took this deal — moved it to the next stage`;
  if (badge.kind === "deal_converted") return `${who} converted this deal from a lead`;
  if (badge.kind === "deal_won") return `${who} closed this deal won`;
  return null;
}

// Only Admin or the task's own assignee can ever change a task's status
// (enforced server-side), so if the latest status change wasn't made by the
// assignee, it must have been Admin working the task directly themselves.
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
// definition of "which notifications belong in this tab" (also used by
// Assigned Tasks and, for the deal/lead-lifecycle subset, My Targets).
const TASK_NOTIF_TYPES_FILTER = isTaskTabNotif;

const SI_URI = import.meta.env.VITE_SI_URI || "http://localhost:5000";
const API_URL = import.meta.env.VITE_API_URL;

const PRIORITY_COLORS = {
  Low:    "bg-blue-100 text-blue-700 border-blue-200",
  Medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  High:   "bg-orange-100 text-orange-700 border-orange-200",
  Urgent: "bg-red-100 text-red-700 border-red-200",
};

const PRIORITY_BORDER = {
  Low:    "border-l-blue-400",
  Medium: "border-l-yellow-400",
  High:   "border-l-orange-400",
  Urgent: "border-l-red-500",
};

const STATUS_STYLES = {
  New:           "bg-blue-50 text-blue-600 border-blue-200",
  Pending:       "bg-blue-50 text-blue-600 border-blue-200",
  "In Progress": "bg-amber-50 text-amber-600 border-amber-200",
  Completed:     "bg-emerald-50 text-emerald-600 border-emerald-200",
  Rejected:      "bg-rose-50 text-rose-600 border-rose-200"
};

// Task cards use the exact same "hero progress" concept as Target Management
// cards — a task's status maps onto a 0/50/100% progress value so the same
// ProgressBar + color thresholds can drive the hero box and top strip.
const STATUS_PROGRESS = { Pending: 0, "In Progress": 50, Completed: 100 };

// Same icon-on-top stat-card concept as Target Management's Monthly Overview.
function StatCard({ label, value, icon, color, bg }) {
  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <div className={`mb-1 ${color}`}>{icon}</div>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

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

// A task's Progress card must only ever show a Target's numbers when that
// Target actually links THIS task's own lead/deal — never "whichever of the
// assignee's Targets happens to be active today," which used to make every
// unrelated task display the same one active Target's numbers (real
// cross-bleed: a task tied to a 100%-Admin-worked lead would show a
// completely different, self-worked Target's progress just because it
// overlapped in dates). If nothing actually links this task's item, return
// null so the caller falls through to that task's own per-task fallback
// snapshot instead.
function resolveCurrentTarget(targets, userId, task) {
  if (!userId) return null;
  const mine = targets.filter((t) => String(t.salesPerson?._id || t.salesPerson) === String(userId));
  if (mine.length === 0) return null;

  const leadId = task?.leadRef?._id || task?.leadRef;
  const dealId = task?.dealRef?._id || task?.dealRef;
  if (!leadId && !dealId) return null;

  return mine.find((t) =>
    (leadId && (t.linkedLeads || []).some((l) => String(l._id || l) === String(leadId))) ||
    (dealId && (
      (t.linkedDeals || []).some((d) => String(d._id || d) === String(dealId)) ||
      (t.convertedLeadDeals || []).some((d) => String(d._id || d) === String(dealId))
    ))
  ) || null;
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



// Same lead-status / deal-stage color maps as Target Management, so the
// sales-person preview panel in the task modal looks and reads identically.
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

// Who actually converted/worked this deal — same attribution wording as
// Target Management's sales-person preview panel.
function getAdminActionBadge(d) {
  if (d.convertedByName) {
    const text = d.salesPersonConverted
      ? `${d.convertedByName} converted lead to deal`
      : `Admin ${d.convertedByName} converted lead to deal`;
    return { text, title: text };
  }
  if (d.takenByAdminName) {
    return { text: `Admin ${d.takenByAdminName} took this deal`, title: `This deal has been worked on by Admin ${d.takenByAdminName}` };
  }
  return null;
}

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
// assigned sales person has a target set.
// One linked deal's card — used both for a directly-linked deal and for a
// converted-lead's resulting deal (resolvedFromLead). unlinkField/unlinkValue
// tell handleUnlink which of removeLeadRef/removeDealRef to send.
function DealLinkCard({ deal, resolvedFromLead, linkedBadgeText, isActiveTargetLink, canUnlink, baseUrl, headers, taskId, unlinkField, unlinkValue, onUnlinked, dueDate, taskStatus }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

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

  const handleUnlink = async () => {
    setUnlinking(true);
    try {
      await axios.put(`${baseUrl}/tasks/${taskId}`, { [unlinkField]: unlinkValue }, { headers });
      toast.success(`${unlinkField === "removeLeadRef" ? "Lead" : "Deal"} unlinked from task`);
      setConfirmOpen(false);
      onUnlinked?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to unlink");
    } finally {
      setUnlinking(false);
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
              {dueDate && (
                <span className="text-xs px-2 py-0.5 rounded-full border border-[#008ecc] bg-white text-[#008ecc] font-semibold shrink-0 flex items-center gap-1" title="Due date for this deal">
                  <Calendar size={9} />Due {fmt(dueDate)}
                </span>
              )}
              <span className={`text-xs px-1.5 py-0.5 rounded border font-medium shrink-0 ${STAGE_COLOR[stage] || "bg-gray-100 text-gray-500 border-gray-200"}`}>{stage}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setExpanded((v) => !v)} className="p-1 rounded-md hover:bg-black/5 text-gray-400 hover:text-gray-600" title={expanded ? "Collapse" : "Expand"}>
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            {canUnlink && (
              <button onClick={() => setConfirmOpen(true)} className="p-1 rounded-md hover:bg-red-100 text-gray-400 hover:text-red-500" title="Unlink">
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>
        {linkedBadgeText && (
          <span className="inline-block text-xs bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded-full border border-orange-200 mt-1 mr-1">{linkedBadgeText}</span>
        )}
        {isActiveTargetLink && (
          <span className="inline-block text-xs bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded-full border border-purple-200 mt-1 flex items-center gap-1 w-fit"><Flag size={9}/>Linked to active Target</span>
        )}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
          {deal.companyName && <span className="text-xs text-gray-500 flex items-center gap-1"><Building2 size={8} />{deal.companyName}</span>}
          {deal.value && <span className={`text-xs font-bold ${isWon ? "text-emerald-700" : "text-gray-700"}`}>{deal.currency || "INR"} {deal.value}</span>}
          {deal.phoneNumber && <span className="text-xs text-gray-500 flex items-center gap-1"><Phone size={8} />{deal.phoneNumber}</span>}
          {deal.email && <span className="text-xs text-gray-500 flex items-center gap-1 truncate max-w-[160px]"><Mail size={8} />{deal.email}</span>}
          {totalDays !== null && <span className="text-xs text-emerald-600 flex items-center gap-0.5"><Clock size={8} />{totalDays === 0 ? "Same day" : `${totalDays}d to close`}</span>}
        </div>
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
      {confirmOpen && (
        <ConfirmModal
          open={confirmOpen}
          title="Unlink Deal"
          message="Remove this deal from the task? It won't be deleted — just unlinked from this task."
          onConfirm={handleUnlink}
          onClose={() => !unlinking && setConfirmOpen(false)}
        />
      )}
    </div>
  );
}

// One linked lead's card.
function LeadLinkCard({ lead, linkedBadgeText, isActiveTargetLink, canUnlink, baseUrl, headers, taskId, onUnlinked, dueDate, taskStatus }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const isTaskCompleted = taskStatus === "Completed";
  const bgClass = isTaskCompleted ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-200";

  const handleUnlink = async () => {
    setUnlinking(true);
    try {
      await axios.put(`${baseUrl}/tasks/${taskId}`, { removeLeadRef: lead._id }, { headers });
      toast.success("Lead unlinked from task");
      setConfirmOpen(false);
      onUnlinked?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to unlink");
    } finally {
      setUnlinking(false);
    }
  };

  return (
    <div className={`border rounded-xl overflow-hidden ${bgClass}`}>
      <div className="p-3">
        <div className="flex items-start justify-between gap-1.5 mb-1">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1"><FileText size={11} /> Linked Lead</p>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold text-gray-800 truncate flex-1">{lead.leadName}</p>
              {dueDate && (
                <span className="text-xs px-2 py-0.5 rounded-full border border-[#008ecc] bg-white text-[#008ecc] font-semibold shrink-0 flex items-center gap-1" title="Due date for this lead">
                  <Calendar size={9} />Due {fmt(dueDate)}
                </span>
              )}
              <span className={`text-xs px-1.5 py-0.5 rounded border font-medium shrink-0 ${LEAD_STATUS_COLOR[lead.status] || "bg-gray-100 text-gray-500 border-gray-200"}`}>{lead.status}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setExpanded((v) => !v)} className="p-1 rounded-md hover:bg-black/5 text-gray-400 hover:text-gray-600" title={expanded ? "Collapse" : "Expand"}>
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            {canUnlink && (
              <button onClick={() => setConfirmOpen(true)} className="p-1 rounded-md hover:bg-red-100 text-gray-400 hover:text-red-500" title="Unlink">
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>
        {linkedBadgeText && (
          <span className="inline-block text-xs bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded-full border border-orange-200 mt-1 mr-1">{linkedBadgeText}</span>
        )}
        {isActiveTargetLink && (
          <span className="inline-block text-xs bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded-full border border-purple-200 mt-1 flex items-center gap-1 w-fit"><Flag size={9}/>Linked to active Target</span>
        )}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
          {lead.companyName && <span className="text-xs text-gray-500 flex items-center gap-1"><Building2 size={8} />{lead.companyName}</span>}
          {lead.phoneNumber && <span className="text-xs text-gray-500 flex items-center gap-1"><Phone size={8} />{lead.phoneNumber}</span>}
          {lead.email && <span className="text-xs text-gray-500 flex items-center gap-1 truncate max-w-[160px]"><Mail size={8} />{lead.email}</span>}
          {lead.createdAt && <span className="text-xs text-gray-300 flex items-center gap-1"><Calendar size={8} />Added {fmt(lead.createdAt)}</span>}
        </div>
      </div>
      {expanded && <LeadStatusJourney lead={lead} />}
      {confirmOpen && (
        <ConfirmModal
          open={confirmOpen}
          title="Unlink Lead"
          message="Remove this lead from the task? It won't be deleted — just unlinked from this task."
          onConfirm={handleUnlink}
          onClose={() => !unlinking && setConfirmOpen(false)}
        />
      )}
    </div>
  );
}

// Renders every linked lead/deal on this task as its own card (not just the
// most-recently-linked "primary" one) — backward-compat-derived from
// leadRefs/dealRefs, falling back to the singular leadRef/dealRef for tasks
// created before this multi-link feature. The deal-stage/lead-status
// "journey" timeline is only shown on the current primary item; other linked
// items render as plain cards.
function LinkedItemDetail({ task, linkedBadgeText, canUnlink, baseUrl, headers, onUnlinked, targets }) {
  const dealItems = task.dealRefs?.length ? task.dealRefs : (task.dealRef ? [task.dealRef] : []);
  const leadItems = task.leadRefs?.length ? task.leadRefs : (task.leadRef ? [task.leadRef] : []);
  const primaryDealId = task.dealRef?._id || task.dealRef || null;
  const primaryLeadId = task.leadRef?._id || task.leadRef || null;

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
              isActiveTargetLink={targets?.some(t => t.salesPerson?._id === task.assignedTo?._id && new Date(t.startDate) <= new Date() && new Date(t.endDate) >= new Date() && (t.linkedDeals || []).some(id => String(id) === String(deal._id)))}
              canUnlink={canUnlink}
              baseUrl={baseUrl}
              headers={headers}
              taskId={task._id}
              unlinkField="removeDealRef"
              unlinkValue={deal._id}
              onUnlinked={onUnlinked}
              dueDate={task.dealDueDates?.[String(deal._id)]}
              taskStatus={task.status}
            />
          ))}
        </div>
      )}
      {leadItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 border-b border-gray-100 pb-1"><FileText size={11}/> Linked Leads</p>
          {leadItems.map((lead) => {
            // A converted lead has no pipeline of its own — the real stage
            // journey now lives on the deal it became. task.convertedDealRefsByLeadId
            // is attached server-side (attachConvertedDealJourney) and covers
            // EVERY converted lead on this task, not just the current primary one
            // — otherwise adding another lead/deal during an edit (which re-points
            // task.leadRef to the newest addition) demoted an already-won lead to
            // non-primary and silently dropped its Won/Stage journey.
            const isPrimary = String(lead._id) === String(primaryLeadId);
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
                  isActiveTargetLink={targets?.some(t => t.salesPerson?._id === task.assignedTo?._id && new Date(t.startDate) <= new Date() && new Date(t.endDate) >= new Date() && (t.linkedDeals || []).some(id => String(id) === String(resolvedFromLead._id)))}
                  canUnlink={canUnlink}
                  baseUrl={baseUrl}
                  headers={headers}
                  taskId={task._id}
                  unlinkField="removeLeadRef"
                  unlinkValue={lead._id}
                  onUnlinked={onUnlinked}
                  dueDate={task.leadDueDates?.[String(lead._id)]}
                  taskStatus={task.status}
                />
              );
            }
            return (
              <LeadLinkCard
                key={lead._id}
                lead={lead}
                linkedBadgeText={isPrimary ? linkedBadgeText : null}
                isActiveTargetLink={targets?.some(t => t.salesPerson?._id === task.assignedTo?._id && new Date(t.startDate) <= new Date() && new Date(t.endDate) >= new Date() && (t.linkedLeads || []).some(id => String(id) === String(lead._id)))}
                canUnlink={canUnlink}
                baseUrl={baseUrl}
                headers={headers}
                taskId={task._id}
                onUnlinked={onUnlinked}
                dueDate={task.leadDueDates?.[String(lead._id)]}
                taskStatus={task.status}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Sales Person Preview Panel (inside Task modal) — single-select: click a
   lead/deal to link it as this task's leadRef/dealRef. Reuses the same
   sales-summary endpoint Target Management uses. ─────────────────────── */
function TaskSalesPersonPreview({ userId, baseUrl, headers, selectedLeadIds, selectedDealIds, onToggleLead, onToggleDeal, newLeadIds = [], newDealIds = [], leadDueDates = {}, dealDueDates = {}, onLeadDueDateChange, onDealDueDateChange, inUseLeadIds = [], inUseDealIds = [] }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("leads");
  const [searchQuery, setSearchQuery] = useState("");
  const [leadStatusFilter, setLeadStatusFilter] = useState("");
  const [dealStageFilter, setDealStageFilter] = useState("");

  useEffect(() => {
    if (!userId) { setData(null); return; }
    setLoading(true);
    axios.get(`${baseUrl}/targets/sales-summary/${userId}`, { headers })
      .then((r) => setData(r.data))
      .catch(() => toast.error("Failed to load sales person's leads/deals"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (!userId) return (
    <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-3 py-12">
      <Users size={40} />
      <p className="text-xs text-center text-gray-400 leading-relaxed">
        Select a sales person to preview<br />their leads & deals
      </p>
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Loading...</div>
  );

  if (!data) return null;

  let leadsList = (data.leads.list || []).filter((l) => !["Converted", "Rejected"].includes(l.status) || selectedLeadIds.includes(l._id));
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    leadsList = leadsList.filter((l) => l.leadName?.toLowerCase().includes(q) || l.companyName?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q));
  }
  if (leadStatusFilter) {
    leadsList = leadsList.filter((l) => l.status === leadStatusFilter);
  }
  const leads = { ...data.leads, list: leadsList, total: leadsList.length };
  
  let dealsList = (data.deals.list || []).filter((d) => !["Closed Won", "Closed Lost"].includes(d.stage) || selectedDealIds.includes(d._id));
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    dealsList = dealsList.filter((d) => d.dealName?.toLowerCase().includes(q) || d.companyName?.toLowerCase().includes(q));
  }
  if (dealStageFilter) {
    dealsList = dealsList.filter((d) => d.stage === dealStageFilter);
  }
  const deals = { ...data.deals, list: dealsList, total: dealsList.length };

  return (
    <div className="space-y-3 h-full flex flex-col">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-blue-600">{leads.total}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Leads</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-indigo-600">{deals.total}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Deals</p>
        </div>
      </div>

      {/* Selection summary */}
      {(selectedLeadIds.length > 0 || selectedDealIds.length > 0) && (
        <div className="bg-[#008ecc]/10 border border-[#008ecc]/20 rounded-xl px-3 py-2 flex items-center gap-2">
          <Check size={13} className="text-[#008ecc]" />
          <p className="text-xs text-[#008ecc] font-semibold">
            {selectedLeadIds.length > 0 ? `${selectedLeadIds.length} lead${selectedLeadIds.length > 1 ? "s" : ""}` : ""}{selectedLeadIds.length > 0 && selectedDealIds.length > 0 ? " + " : ""}{selectedDealIds.length > 0 ? `${selectedDealIds.length} deal${selectedDealIds.length > 1 ? "s" : ""}` : ""} linked to this task
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 shrink-0">
        <button type="button" onClick={() => setTab("leads")}
          className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all ${tab === "leads" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"}`}>
          Leads ({leads.total})
        </button>
        <button type="button" onClick={() => setTab("deals")}
          className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all ${tab === "deals" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500"}`}>
          Deals ({deals.total})
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2 shrink-0">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder={tab === "leads" ? "Search leads..." : "Search deals..."} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-[#008ecc] focus:ring-1 focus:ring-[#008ecc]/30"
          />
        </div>
        {tab === "leads" && (
          <select 
            value={leadStatusFilter} 
            onChange={(e) => setLeadStatusFilter(e.target.value)}
            className="w-24 text-xs border border-gray-200 rounded-md px-2 focus:outline-none focus:border-[#008ecc] focus:ring-1 focus:ring-[#008ecc]/30 text-gray-600"
          >
            <option value="">All Status</option>
            <option value="Hot">Hot</option>
            <option value="Warm">Warm</option>
            <option value="Cold">Cold</option>
            <option value="Junk">Junk</option>
          </select>
        )}
        {tab === "deals" && (
          <select 
            value={dealStageFilter} 
            onChange={(e) => setDealStageFilter(e.target.value)}
            className="w-28 text-xs border border-gray-200 rounded-md px-2 focus:outline-none focus:border-[#008ecc] focus:ring-1 focus:ring-[#008ecc]/30 text-gray-600"
          >
            <option value="">All Stages</option>
            <option value="Qualification">Qualification</option>
            <option value="Proposal Sent-Negotiation">Proposal Sent-Negotiation</option>
            <option value="Invoice Sent">Invoice Sent</option>
            <option value="Closed Won">Deal Closed</option>
            <option value="Closed Lost">Deal Lost</option>
          </select>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {tab === "leads" && leads.list.length > 0 && (
          <div className="flex items-center justify-between px-1 py-1 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-500">Tick leads to link with this task</span>
            {selectedLeadIds.length > 0 && (
              <button type="button" onClick={() => selectedLeadIds.forEach((id) => onToggleLead(id))} className="text-xs font-bold text-[#008ecc] hover:underline">
                Clear all
              </button>
            )}
          </div>
        )}
        {tab === "deals" && deals.list.length > 0 && (
          <div className="flex items-center justify-between px-1 py-1 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-500">Tick deals to link with this task</span>
            {selectedDealIds.length > 0 && (
              <button type="button" onClick={() => selectedDealIds.forEach((id) => onToggleDeal(id))} className="text-xs font-bold text-[#008ecc] hover:underline">
                Clear all
              </button>
            )}
          </div>
        )}

        {tab === "leads" && (
          leads.list.length === 0
            ? <p className="text-xs text-gray-400 text-center py-6">No leads assigned</p>
            : leads.list.map((l) => {
              const isNewLead = selectedLeadIds.includes(l._id) && newLeadIds.includes(l._id);
              const inUse = inUseLeadIds.includes(l._id);
              const isLocked = l.status === "Converted";
              return (
              <div key={l._id}
                onClick={() => {
                  if (isLocked) {
                    toast.info("Already this lead is converted");
                    return;
                  }
                  if (!inUse) onToggleLead(l._id);
                }}
                className={`flex items-start gap-2.5 border rounded-xl p-2.5 transition-all ${(inUse || isLocked) ? "opacity-50 cursor-not-allowed bg-gray-50 border-gray-100" : selectedLeadIds.includes(l._id) ? "border-[#008ecc] bg-blue-50/30 shadow-sm cursor-pointer" : "bg-white border-gray-100 hover:border-gray-200 cursor-pointer"}`}>
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${selectedLeadIds.includes(l._id) ? "bg-[#008ecc] border-[#008ecc]" : "border-gray-300 bg-white"}`}>
                  {selectedLeadIds.includes(l._id) && <Check size={10} className="text-white" strokeWidth={3} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <p className="text-xs font-semibold text-gray-800 truncate">{l.leadName}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      {(inUse || l.inActiveTask) && <span className="text-xs px-1.5 py-0.5 rounded border border-red-200 bg-red-50 text-red-600 font-bold shrink-0">Already in task</span>}
                      {l.inActiveTarget && <span className="text-xs px-1.5 py-0.5 rounded border border-purple-200 bg-purple-50 text-purple-600 font-bold shrink-0">Already in target</span>}
                      {isNewLead && (
                        <div
                          className="flex items-center gap-1.5 rounded-full border border-[#008ecc] bg-white shadow-sm pl-2.5 pr-2 py-1"
                          onClick={(e) => e.stopPropagation()}
                          title="Due date for this lead (required)"
                        >
                          <Calendar size={10} className="text-[#008ecc] shrink-0" />
                          <input
                            required
                            type="date"
                            min={todayISO()}
                            value={leadDueDates[l._id] || ""}
                            onChange={(e) => onLeadDueDateChange(l._id, e.target.value)}
                            className="text-[10.5px] leading-none bg-transparent border-0 p-0 w-[98px] text-[#008ecc] font-semibold focus:outline-none cursor-pointer"
                          />
                        </div>
                      )}
                      <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium shrink-0 ${LEAD_STATUS_COLOR[l.status] || "bg-gray-100 text-gray-500 border-gray-200"}`}>{l.status}</span>
                    </div>
                  </div>
                  {l.companyName && <p className="text-xs text-gray-400 flex items-center gap-1 truncate mb-0.5"><Building2 size={9} />{l.companyName}</p>}
                  {l.phoneNumber && <p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={9} className="text-gray-400" />{l.phoneNumber}</p>}
                  {l.email && <p className="text-xs text-gray-500 flex items-center gap-1 truncate"><Mail size={9} className="text-gray-400" />{l.email}</p>}
                  <p className="text-xs text-gray-300 mt-1 flex items-center gap-1"><Calendar size={9} />Added {fmt(l.createdAt)}</p>
                </div>
              </div>
              );
            })
        )}

        {tab === "deals" && (
          deals.list.length === 0
            ? <p className="text-xs text-gray-400 text-center py-6">No deals assigned</p>
            : deals.list.map((d) => {
              const adminBadge = getAdminActionBadge(d);
              const isNewDeal = selectedDealIds.includes(d._id) && newDealIds.includes(d._id);
              const inUse = inUseDealIds.includes(d._id);
              const isLocked = d.stage === "Closed Won";
              return (
                <div key={d._id}
                  onClick={() => {
                    if (isLocked) {
                      toast.info("Already this deal is won");
                      return;
                    }
                    if (!inUse) onToggleDeal(d._id);
                  }}
                  className={`flex items-start gap-2.5 border rounded-xl p-2.5 transition-all ${(inUse || isLocked) ? "opacity-50 cursor-not-allowed bg-gray-50 border-gray-100" : selectedDealIds.includes(d._id) ? "border-[#008ecc] bg-blue-50/30 shadow-sm cursor-pointer" : "bg-white border-gray-100 hover:border-gray-200 cursor-pointer"}`}>
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${selectedDealIds.includes(d._id) ? "bg-[#008ecc] border-[#008ecc]" : "border-gray-300 bg-white"}`}>
                    {selectedDealIds.includes(d._id) && <Check size={10} className="text-white" strokeWidth={3} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <p className="text-xs font-semibold text-gray-800 truncate">{d.dealName}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        {(inUse || d.inActiveTask) && <span className="text-xs px-1.5 py-0.5 rounded border border-red-200 bg-red-50 text-red-600 font-bold shrink-0">Already in task</span>}
                        {d.inActiveTarget && <span className="text-xs px-1.5 py-0.5 rounded border border-purple-200 bg-purple-50 text-purple-600 font-bold shrink-0">Already in target</span>}
                        {isNewDeal && (
                          <div
                            className="flex items-center gap-1.5 rounded-full border border-[#008ecc] bg-white shadow-sm pl-2.5 pr-2 py-1"
                            onClick={(e) => e.stopPropagation()}
                            title="Due date for this deal (required)"
                          >
                            <Calendar size={10} className="text-[#008ecc] shrink-0" />
                            <input
                              required
                              type="date"
                              min={todayISO()}
                              value={dealDueDates[d._id] || ""}
                              onChange={(e) => onDealDueDateChange(d._id, e.target.value)}
                              className="text-[10.5px] leading-none bg-transparent border-0 p-0 w-[98px] text-[#008ecc] font-semibold focus:outline-none cursor-pointer"
                            />
                          </div>
                        )}
                        <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium shrink-0 ${STAGE_COLOR[d.stage] || "bg-gray-100 text-gray-500 border-gray-200"}`}>{d.stage}</span>
                      </div>
                    </div>
                    {adminBadge && (
                      <span className="inline-block text-xs bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded border border-orange-200 mb-1" title={adminBadge.title}>{adminBadge.text}</span>
                    )}
                    {d.companyName && <p className="text-xs text-gray-400 flex items-center gap-1 truncate mb-0.5"><Building2 size={9} />{d.companyName}</p>}
                    <div className="flex flex-wrap gap-2 mb-0.5">
                      {d.value && <p className="text-xs font-bold text-gray-700">{d.currency} {d.value}</p>}
                      {d.phoneNumber && <p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={9} className="text-gray-400" />{d.phoneNumber}</p>}
                    </div>
                    {d.email && <p className="text-xs text-gray-500 flex items-center gap-1 truncate"><Mail size={9} className="text-gray-400" />{d.email}</p>}
                    <p className="text-xs text-gray-300 mt-1 flex items-center gap-1"><Calendar size={9} />Created {fmt(d.createdAt)}</p>
                  </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}

/* ── Confirm Delete Modal ─────────────────────── */
function ConfirmModal({ open, title, message, confirmLabel = "Delete", onConfirm, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h3 className="text-slate-700 mb-2">{title}</h3>
        <p className="text-base text-slate-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium">
            Cancel
          </button>
          <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onConfirm(); }} className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 text-sm font-medium">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Task Create/Edit Modal ─────────────────────── */
function TaskModal({ open, onClose, onSaved, salesUsers, editTask, baseUrl, headers, inUseLeadIds = [], inUseDealIds = [] }) {
  const [form, setForm] = useState({
    title: "", description: "", priority: "Medium",
    dueDate: "", assignedTo: "", leadRefs: [], dealRefs: [],
    leadDueDates: {}, dealDueDates: {},
    callsMade: 0, meetingsDone: 0,
  });
  const [saving, setSaving] = useState(false);
  const [dateError, setDateError] = useState(null);
  // Snapshot of the leads/deals already linked when this edit session opened —
  // only leads/deals added AFTER that (not these) require their own due date.
  const [initialRefs, setInitialRefs] = useState({ leadRefs: [], dealRefs: [] });
  // Per-assignee tick cache for THIS modal session — switching "Assign To"
  // away and back (without closing the modal) restores whatever was ticked
  // for that person instead of losing it. Keyed by assignedTo user id.
  const assigneeCacheRef = useRef({});

  useEffect(() => {
    if (open) {
      assigneeCacheRef.current = {};
      if (editTask) {
        // Backward-compat: older tasks only ever had the singular leadRef/dealRef.
        const editLeadRefs = editTask.leadRefs?.length
          ? editTask.leadRefs.map((l) => String(l._id || l))
          : (editTask.leadRef ? [String(editTask.leadRef._id || editTask.leadRef)] : []);
        const editDealRefs = editTask.dealRefs?.length
          ? editTask.dealRefs.map((d) => String(d._id || d))
          : (editTask.dealRef ? [String(editTask.dealRef._id || editTask.dealRef)] : []);
        setForm({
          title: editTask.title || "",
          description: editTask.description || "",
          priority: editTask.priority || "Medium",
          dueDate: editTask.dueDate ? (() => {
            const d = new Date(editTask.dueDate);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          })() : "",
          assignedTo: editTask.assignedTo?._id || "",
          leadRefs: editLeadRefs,
          dealRefs: editDealRefs,
          leadDueDates: {},
          dealDueDates: {},
          callsMade: editTask.callsMade || 0,
          meetingsDone: editTask.meetingsDone || 0,
        });
        setInitialRefs({ leadRefs: editLeadRefs, dealRefs: editDealRefs });
      } else {
        setForm({ title: "", description: "", priority: "Medium", dueDate: "", assignedTo: "", leadRefs: [], dealRefs: [], leadDueDates: {}, dealDueDates: {}, callsMade: 0, meetingsDone: 0 });
        setInitialRefs({ leadRefs: [], dealRefs: [] });
      }
      setDateError(null);
    }
  }, [editTask, open]);

  // Only meaningful during an edit — a brand-new task has nothing "existing"
  // to compare against, so nothing counts as newly added.
  const newLeadIds = editTask ? form.leadRefs.filter((id) => !initialRefs.leadRefs.includes(id)) : [];
  const newDealIds = editTask ? form.dealRefs.filter((id) => !initialRefs.dealRefs.includes(id)) : [];

  const toggleLead = (id) => setForm((f) => {
    const isSelected = f.leadRefs.includes(id);
    const leadRefs = isSelected ? f.leadRefs.filter((x) => x !== id) : [...f.leadRefs, id];
    const leadDueDates = { ...f.leadDueDates };
    if (isSelected) delete leadDueDates[id];
    else if (editTask && !initialRefs.leadRefs.includes(id) && !(id in leadDueDates)) leadDueDates[id] = "";
    return { ...f, leadRefs, leadDueDates };
  });
  const toggleDeal = (id) => setForm((f) => {
    const isSelected = f.dealRefs.includes(id);
    const dealRefs = isSelected ? f.dealRefs.filter((x) => x !== id) : [...f.dealRefs, id];
    const dealDueDates = { ...f.dealDueDates };
    if (isSelected) delete dealDueDates[id];
    else if (editTask && !initialRefs.dealRefs.includes(id) && !(id in dealDueDates)) dealDueDates[id] = "";
    return { ...f, dealRefs, dealDueDates };
  });

  const handleDueDateChange = (value) => {
    setForm((f) => ({ ...f, dueDate: value }));
    setDateError(validateTaskDueDate(value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.leadRefs.length === 0 && form.dealRefs.length === 0) {
      toast.error("Please select at least one Lead or Deal to link to this task.");
      return;
    }
    const err = validateTaskDueDate(form.dueDate);
    if (err) { setDateError(err); toast.error(err); return; }
    let errorMsg = null;
    for (const id of newLeadIds) {
      if (!form.leadDueDates[id]) { errorMsg = "Please set a due date for all newly linked leads."; break; }
      const err = validateTaskDueDate(form.leadDueDates[id]);
      if (err) { errorMsg = `Lead Due Date: ${err}`; break; }
    }
    if (!errorMsg) {
      for (const id of newDealIds) {
        if (!form.dealDueDates[id]) { errorMsg = "Please set a due date for all newly linked deals."; break; }
        const err = validateTaskDueDate(form.dealDueDates[id]);
        if (err) { errorMsg = `Deal Due Date: ${err}`; break; }
      }
    }
    if (errorMsg) {
      toast.error(errorMsg);
      return;
    }
    setSaving(true);
    try {
      if (editTask) {
        await axios.put(`${baseUrl}/tasks/${editTask._id}`, form, { headers });
        toast.success("Task updated");
      } else {
        await axios.post(`${baseUrl}/tasks`, form, { headers });
        toast.success("Task created and assigned");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save task");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      {/* Fixed height (not just max-height) — ticking a lead/deal mounts/unmounts
          the due-date pill and the linked-summary chip, which changed the box's
          content-driven height on every click and made the whole modal visibly
          resize/jump. A fixed height means only the inner scroll panes move. */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[88vh] max-h-[820px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="text-slate-900 flex items-center gap-2">
            {editTask ? <Edit2 size={18} className="text-[#008ecc]" /> : <Plus size={20} className="text-[#008ecc]" />}
            {editTask ? "Edit Task" : "Create & Assign Task"}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full"><X size={18} className="text-gray-500" /></button>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* LEFT — form */}
          <form onSubmit={handleSubmit} className="w-[460px] shrink-0 p-5 space-y-4 overflow-y-auto border-r border-gray-100">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]/30 focus:border-[#008ecc]"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="What needs to be done?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]/30 focus:border-[#008ecc] resize-none"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe the task in detail..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]/30 focus:border-[#008ecc]"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  {["Low", "Medium", "High", "Urgent"].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
                <input
                  required
                  type="date"
                  min={todayISO()}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]/30 focus:border-[#008ecc] ${dateError ? "border-red-300" : "border-gray-200"}`}
                  value={form.dueDate}
                  onChange={(e) => handleDueDateChange(e.target.value)}
                />
              </div>
            </div>
            {dateError && <p className="text-xs text-red-600 font-medium -mt-2">{dateError}</p>}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign To *</label>
              <select
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]/30 focus:border-[#008ecc]"
                value={form.assignedTo}
                onChange={(e) => {
                  const newAssignee = e.target.value;
                  setForm((f) => {
                    if (f.assignedTo) {
                      assigneeCacheRef.current[f.assignedTo] = {
                        leadRefs: f.leadRefs, dealRefs: f.dealRefs,
                        leadDueDates: f.leadDueDates, dealDueDates: f.dealDueDates,
                      };
                    }
                    const cached = assigneeCacheRef.current[newAssignee] || { leadRefs: [], dealRefs: [], leadDueDates: {}, dealDueDates: {} };
                    return { ...f, assignedTo: newAssignee, ...cached };
                  });
                }}
              >
                <option value="">— Select sales person —</option>
                {salesUsers.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.firstName} {u.lastName}
                  </option>
                ))}
              </select>
            </div>

            {/* Linked summary chip */}
            {(form.leadRefs.length > 0 || form.dealRefs.length > 0) && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-1">
                <p className="text-xs font-bold text-blue-700">Linked to this task:</p>
                {form.leadRefs.length > 0 && <p className="text-xs text-blue-600">✓ {form.leadRefs.length} lead{form.leadRefs.length > 1 ? "s" : ""} selected</p>}
                {form.dealRefs.length > 0 && <p className="text-xs text-blue-600">✓ {form.dealRefs.length} deal{form.dealRefs.length > 1 ? "s" : ""} selected</p>}
                {(newLeadIds.length > 0 || newDealIds.length > 0) && (
                  <p className="text-xs text-amber-600 font-semibold pt-1">Set a due date for each newly linked lead/deal on the right →</p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium">
                Cancel
              </button>
              <button type="submit" disabled={saving || !!dateError} className="px-5 py-2 rounded-lg bg-[#008ecc] text-white hover:bg-[#0077aa] text-sm font-semibold disabled:opacity-60">
                {saving ? "Saving..." : editTask ? "Update Task" : "Create & Assign"}
              </button>
            </div>
          </form>

          {/* RIGHT — sales person preview, click to link a lead/deal */}
          <div className="flex-1 min-w-0 p-5 bg-gray-50/50 flex flex-col overflow-hidden">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 shrink-0">
              {form.assignedTo ? "Sales Person Details — Click to link a lead/deal" : "Sales Person Details"}
            </p>
            <div className="flex-1 min-h-0 overflow-hidden">
              <TaskSalesPersonPreview
                userId={form.assignedTo}
                baseUrl={baseUrl}
                headers={headers}
                selectedLeadIds={form.leadRefs}
                selectedDealIds={form.dealRefs}
                onToggleLead={toggleLead}
                onToggleDeal={toggleDeal}
                newLeadIds={newLeadIds}
                newDealIds={newDealIds}
                leadDueDates={form.leadDueDates}
                dealDueDates={form.dealDueDates}
                onLeadDueDateChange={(id, value) => setForm((f) => ({ ...f, leadDueDates: { ...f.leadDueDates, [id]: value } }))}
                onDealDueDateChange={(id, value) => setForm((f) => ({ ...f, dealDueDates: { ...f.dealDueDates, [id]: value } }))}
                inUseLeadIds={inUseLeadIds}
                inUseDealIds={inUseDealIds}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Compact Task Card (Admin) ─────────────────────── */
function CompactTaskCard({ task, onClick }) {
  const isCompleted = task.status === "Completed";
  const isOverdue = task.dueDate && isDateOverdue(task.dueDate) && !isCompleted;
  const progressPct = STATUS_PROGRESS[task.status] ?? 0;
  
  return (
    <div 
      onClick={() => onClick(task)}
      className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md cursor-pointer transition-shadow p-4 relative overflow-hidden group flex flex-col justify-between h-full min-h-[140px]"
    >
      <div className={`absolute top-0 left-0 h-1 w-full ${progressPct === 100 ? "bg-emerald-500" : progressPct >= 50 ? "bg-amber-400" : "bg-blue-500"}`} />
      
      <div>
        <div className="flex justify-between items-start mb-2 mt-1 gap-2">
          <div className="min-w-0">
            <h4 className="font-semibold text-gray-800 text-sm truncate" title={task.title || "Untitled Task"}>
              {task.title || "Untitled Task"}
            </h4>
            <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1 truncate" title={task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : "Unassigned"}>
              <User size={11} className="shrink-0" />
              <span className="truncate">{task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : "Unassigned"}</span>
            </p>
          </div>
          <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded border font-semibold ${isCompleted ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : task.status === 'In Progress' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
            {task.status || "To Do"}
          </span>
        </div>
      </div>

      <div className="flex justify-between items-center text-[11px] text-gray-500 pt-3 border-t border-gray-50 mt-auto">
        <div className="flex items-center gap-1.5">
          <Calendar size={11} className={isOverdue ? "text-red-500" : "text-gray-400"} />
          <span className={isOverdue ? "text-red-500 font-medium" : ""}>
            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No Date"}
          </span>
        </div>
        <div className="text-[10px] font-bold text-[#008ecc] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          View Details <ArrowRightLeft size={9} />
        </div>
      </div>
    </div>
  );
}

/* ── Task Card ─────────────────────── */
function TaskCard({ task, onEdit, onDelete, targets, progressFallbacks, baseUrl, headers, onRefresh, onApproveRejection, onApproveHold }) {
  const [expanded, setExpanded] = useState(false);
  const isCompleted = task.status === "Completed";
  const isOverdue = task.dueDate && isDateOverdue(task.dueDate) && !isCompleted;

  const primaryLead = task.leadRefs?.length ? task.leadRefs[0] : task.leadRef;
  const primaryDeal = task.dealRefs?.length ? task.dealRefs[0] : task.dealRef;
  const leadName = primaryLead?.leadName
    ? `${primaryLead.leadName}${primaryLead.companyName ? ` — ${primaryLead.companyName}` : ""}`
    : null;
  const dealName = primaryDeal?.dealName || primaryDeal?.dealTitle || null;
  const linkedBadgeText = getLinkedItemBadgeText(task.linkedItemBadge);
  const progressPct = STATUS_PROGRESS[task.status] ?? 0;
  const hasLinkedItems = (task.leadRefs?.length > 0) || (task.dealRefs?.length > 0) || primaryLead || primaryDeal;
  const hasPendingIssue = (task.reasonNotes || []).some((n) => n.status === "pending");
  const adminTookTask = getAdminTookTaskBadge(task);
  // No Target covering this task yet? Fall back to the sales person's own
  // real (self-only) progress scoped to THIS task's own linked lead/deal,
  // instead of an all-zero card or another task's unrelated numbers.
  const currentTarget = resolveCurrentTarget(targets || [], task.assignedTo?._id, task) || progressFallbacks?.[task._id] || null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className={`h-1.5 w-full ${getProgressColor(progressPct)}`} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <div className="min-w-0 flex-1">
            <h3 className="text-slate-700 truncate">{task.title}</h3>
            <p className="text-base text-slate-600 flex items-center gap-1 mt-1">
              <User size={9} />{task.assignedTo?.firstName} {task.assignedTo?.lastName}
              {task.assignedTo?.email && <span className="truncate">· {task.assignedTo.email}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-md font-medium border ${STATUS_STYLES[task.status] || "bg-gray-100 text-gray-600 border-gray-200"}`}>{task.status || "New"}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(task); }} className="p-1 hover:bg-blue-50 rounded-full text-gray-400 hover:text-[#008ecc] transition-colors" title="Edit task"><Edit2 size={14} /></button>
            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(task); }} className="p-1 hover:bg-red-50 rounded-full text-gray-400 hover:text-red-500 transition-colors" title="Delete task"><Trash2 size={14} /></button>
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

        {task.rejectionRequested && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-2 mb-2">
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-red-700">Rejection Requested</p>
                <p className="text-xs text-red-600 mt-0.5 break-words">Reason: {task.rejectionReason}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onApproveRejection(task, "approve")} className="flex-1 py-1.5 bg-red-500 text-white text-xs font-semibold rounded hover:bg-red-600">Approve</button>
              <button onClick={() => onApproveRejection(task, "deny")} className="flex-1 py-1.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded hover:bg-gray-300">Deny</button>
            </div>
          </div>
        )}

        {task.holdRequested && (
          <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-xl">
            <div className="flex items-start gap-2 mb-2">
              <Info size={14} className="text-purple-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-purple-700">Hold Pending</p>
                <p className="text-xs text-purple-600 mt-0.5 break-words">Reason: {task.holdReason}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onApproveHold(task, "approve")} className="flex-1 py-1.5 bg-purple-500 text-white text-xs font-semibold rounded hover:bg-purple-600">Approve</button>
              <button onClick={() => onApproveHold(task, "deny")} className="flex-1 py-1.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded hover:bg-gray-300">Deny</button>
            </div>
          </div>
        )}

        <div className={`flex items-center gap-1.5 text-xs mb-2 mt-1 ${isOverdue ? "text-red-500 font-semibold" : "text-gray-400"}`}>
          <Calendar size={11} /><span>Created {fmt(task.createdAt)} — Due {fmt(task.dueDate)}{isOverdue ? " (Overdue)" : ""}</span>
        </div>

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

        {/* Sales notes */}
        {task.completionNotes && (
          <div className="mb-3 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 flex items-start gap-2">
            <StickyNote size={12} className="text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-0.5">Sales Notes</p>
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
            <LinkedItemDetail task={task} linkedBadgeText={linkedBadgeText} canUnlink baseUrl={baseUrl} headers={headers} onUnlinked={onRefresh} targets={targets} />
          </div>
        )}

        {task.createdBy && <p className="text-xs text-gray-300 mt-3">Created by {task.createdBy.firstName} {task.createdBy.lastName}</p>}
      </div>
    </div>
  );
}

/* ── Table View with expandable Tracking Journey rows ─────────────────────── */
function TaskTableView({ tasks, onEdit, onDelete, onApproveRejection, onApproveHold }) {
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-[2fr_1.3fr_1fr_1fr_1fr_1.4fr_1.2fr] bg-gray-50 border-b border-gray-200 px-4 py-3">
        {["Task", "Assigned To", "Priority", "Status", "Due Date", "Linked Lead/Deal", "Actions"].map((h, i) => (
          <div key={i} className={`text-xs font-bold text-gray-600 uppercase tracking-wide ${i >= 2 && i <= 4 ? "text-center" : i === 6 ? "text-center" : ""}`}>{h}</div>
        ))}
      </div>

      {tasks.map((task) => {
        const isCompleted = task.status === "Completed";
        const isOverdue = task.dueDate && isDateOverdue(task.dueDate) && !isCompleted;
        const primaryLead = task.leadRefs?.length ? task.leadRefs[0] : task.leadRef;
        const primaryDeal = task.dealRefs?.length ? task.dealRefs[0] : task.dealRef;
        const leadName = primaryLead?.leadName || null;
        const dealName = primaryDeal?.dealName || primaryDeal?.dealTitle || null;
        const linkedBadgeText = getLinkedItemBadgeText(task.linkedItemBadge);
        const history = [...(task.history || [])].sort((a, b) => new Date(a.at) - new Date(b.at));
        const isExpanded = expandedId === task._id;

        return (
          <div key={task._id} className="border-b border-gray-100 last:border-0">
            {/* Summary row */}
            <div
              className={`grid grid-cols-[2fr_1.3fr_1fr_1fr_1fr_1.4fr_1.2fr] px-4 py-3.5 cursor-pointer transition-colors ${isExpanded ? "bg-blue-50/50" : "hover:bg-gray-50/70"}`}
              onClick={() => setExpandedId(isExpanded ? null : task._id)}
            >
              {/* Task */}
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-1.5 h-8 rounded-full shrink-0 ${PRIORITY_BORDER[task.priority]?.replace("border-l-", "bg-") || "bg-gray-300"}`} />
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate">{task.title}</p>
                  {task.description && <p className="text-xs text-gray-400 truncate mt-0.5">{task.description}</p>}
                </div>
                <div className="ml-1 shrink-0">{isExpanded ? <ChevronUp size={14} className="text-[#008ecc]" /> : <ChevronDown size={14} className="text-gray-400" />}</div>
              </div>
              {/* Assigned To */}
              <div className="flex flex-col justify-center min-w-0">
                <p className="text-xs font-semibold text-gray-700 truncate">{task.assignedTo?.firstName} {task.assignedTo?.lastName}</p>
                {task.assignedTo?.email && <p className="text-xs text-gray-400 truncate">{task.assignedTo.email}</p>}
              </div>
              {/* Priority */}
              <div className="flex items-center justify-center">
                <span className={`text-xs px-2 py-0.5 rounded-md font-medium border ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
              </div>
              {/* Status — a deal-linked task shows the deal's own pipeline stage
                  (Qualification / Proposal Sent-Negotiation / ...) instead of the
                  generic task status, so admin sees where it actually stands;
                  "Completed" only once the deal is Closed Won (or, for tasks
                  with no linked deal, once the task itself is Completed). */}
              <div className="flex items-center justify-center">
                {task.dealRef?.stage ? (
                  <span className={`text-xs px-2 py-0.5 rounded-md font-medium border ${task.dealRef.stage === "Closed Won" ? STATUS_STYLES.Completed + " border-transparent" : STAGE_COLOR[task.dealRef.stage] || "bg-gray-100 text-gray-500 border-gray-200"}`}>
                    {task.dealRef.stage === "Closed Won" ? "Completed" : task.dealRef.stage === "Closed Lost" ? "Deal Lost" : task.dealRef.stage}
                  </span>
                ) : (
                  <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${STATUS_STYLES[task.status]}`}>
                    {task.status}
                  </span>
                )}
              </div>
              {/* Due Date */}
              <div className="flex items-center justify-center">
                <span className={`text-xs font-semibold flex items-center gap-1 ${isOverdue ? "text-red-500" : "text-gray-600"}`}>
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
              {/* Actions — just Edit/Delete; status is read-only, driven by the
                  task's own progress (or its linked deal's stage) above. */}
              <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(task); }} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600" title="Edit"><Edit2 size={13} /></button>
                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(task); }} className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500" title="Delete"><Trash2 size={13} /></button>
              </div>
            </div>

            {task.rejectionRequested && (
              <div className="px-4 py-2 bg-red-50 border-t border-red-100 flex items-center justify-between">
                <div className="flex items-start gap-2">
                  <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-red-700">Rejection Requested</p>
                    <p className="text-xs text-red-600 mt-0.5 break-words">Reason: {task.rejectionReason}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => onApproveRejection(task, "approve")} className="px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded hover:bg-red-600">Approve Rejection</button>
                  <button onClick={() => onApproveRejection(task, "deny")} className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded hover:bg-gray-300">Deny</button>
                </div>
              </div>
            )}

            {task.holdRequested && (
              <div className="px-4 py-2 bg-purple-50 border-t border-purple-100 flex items-center justify-between">
                <div className="flex items-start gap-2">
                  <Info size={14} className="text-purple-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-purple-700">Hold Pending</p>
                    <p className="text-xs text-purple-600 mt-0.5 break-words">Reason: {task.holdReason}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => onApproveHold(task, "approve")} className="px-3 py-1.5 bg-purple-500 text-white text-xs font-semibold rounded hover:bg-purple-600">Approve Hold</button>
                  <button onClick={() => onApproveHold(task, "deny")} className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded hover:bg-gray-300">Deny</button>
                </div>
              </div>
            )}

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
                {/* Full Lead → Deal Stage Journey — same timeline Card view already
                    shows via LinkedItemDetail, now also visible in Table view.
                    convertedDealRef covers a task still linked to the original
                    Lead after it's been converted to a Deal elsewhere — without
                    it, only the lead's own (now stale) status history would show. */}
                {(task.dealRef || task.convertedDealRef) && <div className="mt-3 -mx-4 bg-white"><DealStageJourney deal={task.dealRef || task.convertedDealRef} /></div>}
                {!task.dealRef && !task.convertedDealRef && task.leadRef && <div className="mt-3 -mx-4 bg-white"><LeadStatusJourney lead={task.leadRef} /></div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Main Component ─────────────────────── */
export default function TaskManagement() {
  const [tasks, setTasks] = useState([]);
  const [salesUsers, setSalesUsers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);

  const inUseLeadIds = useMemo(() => Array.from(new Set(
    tasks.filter(t => t.status !== "Completed" && !t.archived && (!editTask || t._id !== editTask._id))
         .flatMap(t => (t.leadRefs || []).map(r => String(r._id || r)))
  )), [tasks, editTask]);

  const inUseDealIds = useMemo(() => Array.from(new Set(
    tasks.filter(t => t.status !== "Completed" && !t.archived && (!editTask || t._id !== editTask._id))
         .flatMap(t => (t.dealRefs || []).map(r => String(r._id || r)))
  )), [tasks, editTask]);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const { notifications: allNotifications, setNotifications, fetchNotifications } = useNotifications();
  const socket = useSocket();
  const targetSocket = useTargetSocket();
  const [mainView, setMainView] = useState("tasks"); // "tasks" | "notifications"
  // Org-wide Monthly Overview stats — same endpoint Target Management uses
  // (GET /targets/dashboard-stats), so this widget always renders real
  // numbers straight from Leads/Deals/Calls/Meetings regardless of whether
  // any Target currently exists (a target-derived sum here would show
  // nothing at all the moment the tenant has zero active targets).
  const [orgDashStats, setOrgDashStats] = useState(null);
  const [dashFilter, setDashFilter] = useState("all");
  const [dashStartDate, setDashStartDate] = useState("");
  const [dashEndDate, setDashEndDate] = useState("");
  const [viewMode, setViewMode] = useState("card"); // "card" | "table"
  const [showWorkflowExplanation, setShowWorkflowExplanation] = useState(false);

  const [targets, setTargets] = useState([]);
  // Task's own Progress-card ratio snapshots (keyed by taskId), used whenever
  // the assignee has no real Target covering this task — see
  // GET /tasks/progress/all (services/taskProgressService.js on the backend,
  // deliberately independent of Target Management's own progress code).
  const [progressFallbacks, setProgressFallbacks] = useState({});
  const [reasonNotes, setReasonNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [adminActivity, setAdminActivity] = useState(null); // { leadsConvertedByAdmin, dealsWonByAdmin, counts }
  const [loadingAdminActivity, setLoadingAdminActivity] = useState(false);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState(null);
  const [selectedNotes, setSelectedNotes] = useState(new Set());
  const [noteDeleteConfirm, setNoteDeleteConfirm] = useState(null); // { taskId, noteIdx, isBulk, count }
  const [approveHoldTask, setApproveHoldTask] = useState(null);

  const [rejectNoteModal, setRejectNoteModal] = useState({ open: false, note: null });
  const [rejectNoteReason, setRejectNoteReason] = useState("");
  const [rejectingNote, setRejectingNote] = useState(false);

  const [reassignNoteModal, setReassignNoteModal] = useState({ open: false, note: null });
  const [reassigningNote, setReassigningNote] = useState(false);

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

  const handleApproveRejection = async (taskId, action) => {
    try {
      await axios.patch(`${baseUrl}/tasks/${taskId}/rejection`, { action }, { headers });
      toast.success(`Rejection ${action}d successfully`);
      fetchTasks(false);
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} rejection`);
    }
  };

  const handleApproveHoldAction = (task, action) => {
    if (action === "approve") {
      setApproveHoldTask(task);
    } else {
      submitApproveHold(task._id, action);
    }
  };

  const submitApproveHold = async (taskId, action, extendDueDate = null) => {
    try {
      const payload = { action };
      if (extendDueDate) payload.extendDueDate = extendDueDate;
      await axios.patch(`${baseUrl}/tasks/${taskId}/hold`, payload, { headers });
      toast.success(`Hold request ${action}d successfully`);
      fetchTasks(false);
      setApproveHoldTask(null);
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} hold request`);
    }
  };

  const fetchReferenceData = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_URL}/users`, { headers });
      const allUsers = data?.users || data || [];
      setSalesUsers(allUsers.filter((u) => u.role?.name !== "Admin"));
    } catch (err) {
      console.error("Failed to load sales users", err);
      toast.error("Failed to load sales users for the form");
    }
  }, []);

  // All targets (already enriched with actuals/percentages) — reused for the
  // per-task progress grid only. The Monthly Overview header is fetched
  // separately, straight from the org-wide /targets/dashboard-stats endpoint
  // (same one Target Management uses), so it always shows real numbers even
  // when zero sales people currently have a Target set.
  const fetchTargetData = useCallback(async () => {
    const reqId = ++targetsReqId.current;
    // These 3 endpoints are independent — fetching them in parallel instead
    // of one-after-another is what makes the Progress card populate right
    // away instead of visibly filling in over several seconds after the task
    // cards themselves have already appeared.
    const [targetsRes, fallbacksRes] = await Promise.allSettled([
      axios.get(`${baseUrl}/targets`, { headers }),
      axios.get(`${baseUrl}/tasks/progress/all`, { headers }),
    ]);

    if (reqId !== targetsReqId.current) return;
    if (targetsRes.status === "fulfilled") setTargets(targetsRes.value.data);
    else console.error("Failed to load target data", targetsRes.reason);
    if (fallbacksRes.status === "fulfilled") setProgressFallbacks(fallbacksRes.value.data);
    else console.error("Failed to load progress fallbacks", fallbacksRes.reason);
  }, [baseUrl]);

  const fetchDashStats = useCallback(async () => {
    try {
      const params = new URLSearchParams({ period: dashFilter });
      if (dashFilter === "custom") {
        if (dashStartDate) params.append("startDate", dashStartDate);
        if (dashEndDate) params.append("endDate", dashEndDate);
      }
      const statsRes = await axios.get(`${baseUrl}/targets/dashboard-stats?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      setOrgDashStats(statsRes.data);
    } catch (error) {
      console.error("Failed to fetch dash stats", error);
    }
  }, [baseUrl, dashFilter, dashStartDate, dashEndDate, token]);

  const fetchReasonNotes = useCallback(async () => {
    setLoadingNotes(true);
    try {
      const { data } = await axios.get(`${baseUrl}/tasks/reason-notes/all`, { headers });
      setReasonNotes(data);
    } catch {
      toast.error("Failed to load reason notes");
    } finally {
      setLoadingNotes(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    if (token) fetchDashStats();
  }, [fetchDashStats, token]);

  useEffect(() => {
    fetchTasks(true); // show loading spinner only on initial mount
    fetchReferenceData();
    fetchTargetData();
    // Mark task-completed/taskNoteAdded notifications as read when admin visits
    setNotifications((prev) => {
      const toMarkRead = prev
        .filter((n) => n.type === "task" && (n.meta?.taskCompleted || n.meta?.taskNoteAdded) && !n.read && !n.isRead && n._id && !String(n._id).includes("-"))
        .map((n) => n._id);
      if (toMarkRead.length > 0) {
        Promise.all(
          toMarkRead.map((id) =>
            axios.patch(`${API_URL}/notifications/read/${id}`, {}, { headers }).catch(() => {})
          )
        );
      }
      return prev.map((n) =>
        n.type === "task" && (n.meta?.taskCompleted || n.meta?.taskNoteAdded)
          ? { ...n, read: true, isRead: true }
          : n
      );
    });
  }, []);

  // Live refresh — a sales person creating/completing/reporting an issue on a
  // task reflects here instantly, no manual page refresh, no loading-spinner blink.
  useEffect(() => {
    if (!socket) return;
    const handler = () => { fetchTasks(false); fetchTargetData(); fetchReasonNotes(); };
    socket.on("tasks_refresh", handler);
    return () => socket.off("tasks_refresh", handler);
  }, [socket, fetchTasks, fetchTargetData, fetchReasonNotes]);

  // A Target created/updated/reassigned for a sales person (on the separate
  // target socket channel — see MyTargets.jsx for the same pattern) should
  // update this page's per-task "Target Progress" grid live too, instead of
  // it sitting on stale "No active target set" until a manual reload.
  useEffect(() => {
    if (!targetSocket) return;
    const handler = () => fetchTargetData();
    targetSocket.on("targets_refresh", handler);
    return () => targetSocket.off("targets_refresh", handler);
  }, [targetSocket, fetchTargetData]);

  const handleDelete = async () => {
    const taskId = deleteTarget._id;
    // Optimistic: remove task card immediately — no refetch, no blink
    setTasks((prev) => prev.filter((t) => t._id !== taskId));
    // Also remove related notifications from admin's own state immediately
    setNotifications((prev) =>
      prev.filter((n) => !(n.type === "task" && String(n.meta?.taskId) === String(taskId)))
    );
    setDeleteTarget(null);
    try {
      await axios.delete(`${baseUrl}/tasks/${taskId}`, { headers });
      // Backend also deletes DB notifications + notifies sales person via socket
      toast.success("Task deleted");
    } catch {
      toast.error("Failed to delete task");
      fetchTasks(); // restore on error
    }
  };

  // Reminder/due-today notifications for this task module (real-time, no refresh needed —
  // they land in the shared NotificationContext the instant the socket delivers them).
  const taskNotifications = allNotifications
    .filter(TASK_NOTIF_TYPES_FILTER)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const unreadTaskNotifCount = taskNotifications.filter((n) => !n.read && !n.isRead).length;

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

  useEffect(() => {
    if (mainView !== "notifications") return;
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainView]);

  const handleMarkAllRead = () => {
    setNotifications((prev) => {
      const unread = prev.filter((n) => TASK_NOTIF_TYPES_FILTER(n) && !n.read && !n.isRead && n._id && !String(n._id).includes("-"));
      if (unread.length > 0) {
        unread.forEach((n) => axios.patch(`${baseUrl}/notifications/read/${n._id}`, {}, { headers }).catch(() => {}));
      }
      return prev.map((n) => (TASK_NOTIF_TYPES_FILTER(n) ? { ...n, read: true, isRead: true } : n));
    });
  };



  const handleAcceptReasonNote = async (reassignToUserId, extendDueDate, adminNote) => {
    setReassigningNote(true);
    try {
      const note = reassignNoteModal.note;
      const { data } = await axios.post(`${baseUrl}/tasks/${note.taskId}/reason-notes/${note.noteIdx}/reassign`, {
        reassignToUserId,
        extendDueDate,
        adminNote
      }, { headers });
      
      toast.success(data.message);
      setReasonNotes((prev) => prev.filter(n => !(n.taskId === note.taskId && n.noteIdx === note.noteIdx)));
      setReassignNoteModal({ open: false, note: null });
      fetchTasks(); // Refresh tasks to show new dates/assignee
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to reassign task");
    } finally {
      setReassigningNote(false);
    }
  };

  const handleRejectReasonNote = async () => {
    if (!rejectNoteReason.trim()) return;
    setRejectingNote(true);
    try {
      const note = rejectNoteModal.note;
      await axios.post(`${baseUrl}/tasks/${note.taskId}/reason-notes/${note.noteIdx}/reject`, { rejectReason: rejectNoteReason }, { headers });
      toast.success("Reason rejected");
      setReasonNotes((prev) => prev.map((n) => (n.taskId === note.taskId && n.noteIdx === note.noteIdx ? { ...n, status: "rejected", rejectReason: rejectNoteReason } : n)));
      setRejectNoteModal({ open: false, note: null });
      setRejectNoteReason("");
    } catch {
      toast.error("Failed to reject reason");
    } finally {
      setRejectingNote(false);
    }
  };

  useEffect(() => {
    fetchReasonNotes(); // Always fetch on mount so the badge works on other tabs
  }, [fetchReasonNotes]);

  useEffect(() => {
    if (mainView !== "reasonNotes") return;
    fetchReasonNotes(); // Refresh when they open the tab just in case
    setSelectedNotes(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainView]);

  const fetchAdminActivity = useCallback(async () => {
    setLoadingAdminActivity(true);
    try {
      const { data } = await axios.get(`${baseUrl}/tasks/admin-activity`, { headers });
      setAdminActivity(data);
    } catch {
      toast.error("Failed to load admin activity");
    } finally {
      setLoadingAdminActivity(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    if (mainView !== "adminActivity") return;
    fetchAdminActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainView]);

  const [dismissConfirm, setDismissConfirm] = useState(null); // { itemType, itemId, itemName }
  const handleDismissAdminActivity = async () => {
    if (!dismissConfirm) return;
    const { itemType, itemId } = dismissConfirm;
    setDismissConfirm(null);
    setAdminActivity((prev) => prev && {
      ...prev,
      leadsConvertedByAdmin: itemType === "lead" ? prev.leadsConvertedByAdmin.filter((l) => l._id !== itemId) : prev.leadsConvertedByAdmin,
      dealsWonByAdmin: itemType === "deal" ? prev.dealsWonByAdmin.filter((d) => d._id !== itemId) : prev.dealsWonByAdmin,
    });
    try {
      await axios.post(`${baseUrl}/tasks/admin-activity/dismiss`, { itemType, itemId }, { headers });
      toast.success("Removed from Admin Completed");
    } catch {
      toast.error("Failed to remove");
      fetchAdminActivity();
    }
  };

  const toggleNoteSelect = (key) => {
    setSelectedNotes((prev) => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  const handleDeleteNote = async () => {
    if (!noteDeleteConfirm || noteDeleteConfirm.isBulk) return;
    const { taskId, noteIdx } = noteDeleteConfirm;
    setNoteDeleteConfirm(null);
    try {
      await axios.delete(`${baseUrl}/tasks/${taskId}/reason-notes/${noteIdx}`, { headers });
      toast.success("Note deleted");
      fetchReasonNotes();
      setSelectedNotes((prev) => { const n = new Set(prev); n.delete(`${taskId}__${noteIdx}`); return n; });
    } catch {
      toast.error("Failed to delete note");
    }
  };

  const handleBulkDeleteNotes = async () => {
    if (!noteDeleteConfirm?.isBulk) return;
    const items = [...selectedNotes].map((key) => {
      const [taskId, noteIdx] = key.split("__");
      return { taskId, noteIdx: parseInt(noteIdx, 10) };
    });
    setNoteDeleteConfirm(null);
    try {
      await axios.post(`${baseUrl}/tasks/reason-notes/bulk-delete`, { items }, { headers });
      toast.success(`${items.length} note(s) deleted`);
      setSelectedNotes(new Set());
      fetchReasonNotes();
    } catch {
      toast.error("Failed to bulk delete");
    }
  };

  const FILTERS = ["All"];
  const filtered = filter === "All" ? tasks : tasks.filter((t) => t.status === filter);

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-gray-900  flex items-center gap-3"><ClipboardList />Task Management</h1>
          <p className="text-base text-slate-600 mt-1">Assign and track tasks for your sales team</p>
        </div>
        <button
          onClick={() => { setEditTask(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#008ecc] text-white rounded-lg hover:bg-[#0077aa] text-sm font-semibold"
        >
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Stats row — same "Monthly Overview" block as Target Management, same
          org-wide /targets/dashboard-stats data source, so it renders real
          numbers immediately regardless of whether any Target exists yet. */}
      {mainView === "tasks" && orgDashStats && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-slate-900">Dashboard Overview</h2>
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
            <StatCard label="Total Leads" value={orgDashStats.monthly.totalLeads} icon={<Users size={16} />}     color="text-blue-600"   bg="bg-blue-50 border border-blue-100" />
            <StatCard label="Total Deals" value={orgDashStats.monthly.totalDeals} icon={<Briefcase size={16} />} color="text-sky-600"    bg="bg-sky-50 border border-sky-100" />
            <StatCard label="Deals Won"   value={orgDashStats.monthly.wonDeals}   icon={<Award size={16} />}     color="text-indigo-600" bg="bg-indigo-50 border border-indigo-100" />
            <StatCard label="Deals Lost"  value={orgDashStats.monthly.lostDeals}  icon={<XCircle size={16} />}   color="text-red-600"    bg="bg-red-50 border border-red-100" />
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setMainView("tasks"); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
              filter === f && mainView === "tasks"
                ? "bg-[#008ecc] text-white"
                : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"
            }`}
          >
            {f}
          </button>
        ))}

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
          {unreadTaskNotifCount > 0 && (
            <span className="ml-1 bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[16px] text-center leading-none">
              {unreadTaskNotifCount}
            </span>
          )}
        </button>

        {/* Reason Notes tab */}
        <button
          onClick={() => setMainView(mainView === "reasonNotes" ? "tasks" : "reasonNotes")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
            mainView === "reasonNotes"
              ? "bg-[#008ecc] text-white"
              : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"
          }`}
        >
          <Flag size={13} /> Reason Notes
          {reasonNotes.filter((n) => n.status === "pending").length > 0 && (
            <span className="ml-1 bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[16px] text-center leading-none">
              {reasonNotes.filter((n) => n.status === "pending").length}
            </span>
          )}
        </button>

        {/* Admin Completed tab and Info */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMainView(mainView === "adminActivity" ? "tasks" : "adminActivity")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              mainView === "adminActivity"
                ? "bg-[#008ecc] text-white"
                : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"
            }`}
          >
            <Trophy size={13} /> Admin Completed
          </button>
          <button 
            onClick={() => setShowWorkflowExplanation(true)}
            className="p-1.5 rounded-full text-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-colors bg-white border border-gray-200"
            title="How Tasks Work"
          >
            <Info size={16} />
          </button>
        </div>

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
              {taskNotifications.filter(n => !n.read && !n.isRead).length > 0 && (
                <button onClick={handleMarkAllRead} className="text-xs text-[#008ecc] hover:underline font-medium">Mark all as read</button>
              )}
              <button onClick={fetchNotifications} className="text-xs text-gray-500 hover:text-gray-800 font-medium">
                Refresh
              </button>
            </div>
          </div>
          {taskNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Bell size={36} className="mb-3 opacity-20" />
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="text-xs mt-1">Reminders appear here 1 day before & on the due date</p>
            </div>
          ) : (
            taskNotifications.map((n, i) => {
              const isDueToday = !!n.meta?.taskDueToday;
              const accent = getNotificationAccentClass(n);
              const typeStyle = accent || (isDueToday ? "border-orange-200 bg-orange-50" : "border-amber-200 bg-amber-50");
              const icon = isDueToday
                ? <Clock size={15} className="text-orange-500 shrink-0 mt-0.5" />
                : <Bell size={15} className="text-amber-500 shrink-0 mt-0.5" />;
              const isUnread = !n.read && !n.isRead;
              return (
                <div
                  key={n._id || i}
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

      {/* ── REASON NOTES VIEW ── */}
      {mainView === "reasonNotes" && (() => {
        const allKeys = new Set(reasonNotes.map((n) => `${n.taskId}__${n.noteIdx}`));
        const allSelected = allKeys.size > 0 && [...allKeys].every((k) => selectedNotes.has(k));
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-slate-900 flex items-center gap-2">
                <Flag size={16} className="text-rose-500" /> Reason Notes from Sales Team
                <span className="text-xs font-normal text-gray-400 ml-1">({reasonNotes.length} total)</span>
              </h2>
              <div className="flex items-center gap-2">
                {selectedNotes.size > 0 && (
                  <button onClick={() => setNoteDeleteConfirm({ isBulk: true, count: selectedNotes.size })}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600">
                    <Trash2 size={12} /> Delete Selected ({selectedNotes.size})
                  </button>
                )}
                <button onClick={fetchReasonNotes} className="text-xs text-[#008ecc] hover:underline font-medium">Refresh</button>
              </div>
            </div>

            {loadingNotes ? (
              <div className="text-center text-gray-400 py-10 text-sm">Loading...</div>
            ) : reasonNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Flag size={36} className="mb-3 opacity-20" />
                <p className="text-sm font-medium">No reason notes yet</p>
                <p className="text-xs mt-1">Sales persons can flag a stuck task with a note here</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-200">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input type="checkbox" checked={allSelected}
                      onChange={() => {
                        setSelectedNotes((prev) => {
                          const n = new Set(prev);
                          if (allSelected) allKeys.forEach((k) => n.delete(k));
                          else allKeys.forEach((k) => n.add(k));
                          return n;
                        });
                      }} className="w-3.5 h-3.5 accent-rose-500" />
                    <span className="text-xs text-gray-500 font-medium">Select all</span>
                  </label>
                </div>

                {reasonNotes.map((n, i) => {
                  const selKey = `${n.taskId}__${n.noteIdx}`;
                  const isPending = n.status === "pending";
                  const isReactivated = n.status === "reactivated";
                  const leadName = n.leadRef?.leadName || null;
                  const dealName = n.dealRef?.dealName || n.dealRef?.dealTitle || null;
                  return (
                    <div key={i} className={`border rounded-2xl overflow-hidden ${isPending ? "bg-rose-50 border-rose-200" : isReactivated ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"}`}>
                      <div className="flex items-start gap-3 px-4 pt-3 pb-2">
                        <input type="checkbox" checked={selectedNotes.has(selKey)} onChange={() => toggleNoteSelect(selKey)}
                          className="w-3.5 h-3.5 accent-rose-500 mt-1 shrink-0" />
                        <div className={`p-1.5 rounded-full shrink-0 ${isPending ? "bg-rose-100" : "bg-gray-100"}`}>
                          <Flag size={13} className={isPending ? "text-rose-500" : "text-gray-400"} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-gray-900">{n.taskTitle}</p>
                            {isPending && <span className="text-xs bg-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded-full">Pending Admin Review</span>}
                            {!isPending && !isReactivated && <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Check size={8} /> Resolved</span>}
                            {isReactivated && <span className="text-xs bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Check size={8} /> Kept with same person</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isPending && (
                            <>
                              <button onClick={() => setReassignNoteModal({ open: true, note: n })}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-semibold hover:bg-emerald-600">
                                <Check size={12} /> Accept
                              </button>
                              <button onClick={() => setRejectNoteModal({ open: true, note: n })}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600">
                                <X size={12} /> Reject
                              </button>
                            </>
                          )}
                          <button onClick={() => setNoteDeleteConfirm({ taskId: n.taskId, noteIdx: n.noteIdx, isBulk: false, count: 1 })}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete note">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div className="mx-4 mb-3 bg-white rounded-xl border border-gray-100 px-3 py-2.5 space-y-2">
                        <p className="text-xs text-gray-800 font-medium leading-relaxed border-l-2 border-rose-300 pl-2.5">"{n.note}"</p>

                        {(leadName || dealName) && (
                          <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 border-t border-gray-100">
                            <span className="text-xs font-bold text-blue-600 uppercase tracking-wide flex items-center gap-1">
                              {dealName ? <Briefcase size={10} /> : <FileText size={10} />}
                              {dealName ? "Deal" : "Lead"}: {leadName || dealName}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-3 flex-wrap pt-1 border-t border-gray-100">
                          <p className="text-xs text-gray-600 font-medium flex items-center gap-1">
                            <Users size={10} className="text-gray-400" />
                            {n.assignedTo?.firstName} {n.assignedTo?.lastName}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1"><Clock size={9} />{fmt(n.addedAt)} {fmtTime(n.addedAt)}</p>
                        </div>
                        {(n.status === "resolved" || isReactivated) && n.reassignedTo && (
                          <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                            <ArrowRightLeft size={10} />
                            {isReactivated ? "Kept with" : "Reassigned to"} {n.reassignedTo?.firstName} {n.reassignedTo?.lastName}
                            {n.reassignNote && <span className="text-gray-500 font-normal ml-1">· "{n.reassignNote}"</span>}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        );
      })()}

      {/* ── ADMIN COMPLETED (leads Admin converted, deals Admin closed Won) ── */}
      {mainView === "adminActivity" && (() => {
        const leads = adminActivity?.leadsConvertedByAdmin || [];
        const deals = adminActivity?.dealsWonByAdmin || [];
        const rows = [
          ...leads.map((l) => ({
            key: `lead-${l._id}`, itemType: "lead", itemId: l._id,
            typeLabel: "Lead → Deal Converted", typeClass: "bg-purple-100 text-purple-700 border-purple-200",
            name: l.leadName, company: l.companyName, salesperson: l.assignTo ? `${l.assignTo.firstName} ${l.assignTo.lastName}` : "—",
            date: l.updatedAt, value: null,
          })),
          ...deals.map((d) => ({
            key: `deal-${d._id}`, itemType: "deal", itemId: d._id,
            typeLabel: "Deal Closed", typeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
            name: d.dealName || d.dealTitle, company: d.companyName, salesperson: d.assignedTo ? `${d.assignedTo.firstName} ${d.assignedTo.lastName}` : "—",
            date: d.wonAt, value: d.value ? `${d.currency || "INR"} ${d.value}` : null,
          })),
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        return (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-slate-900 flex items-center gap-2">
                <Trophy size={16} className="text-indigo-500" /> Admin Completed Leads &amp; Deals
              </h2>
              <button onClick={fetchAdminActivity} className="text-xs text-[#008ecc] hover:underline font-medium">Refresh</button>
            </div>

            {/* Summary counts */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
                <p className="text-xs text-purple-600 font-semibold">Leads Converted by Admin</p>
                <p className="text-xl font-bold text-purple-700">{leads.length}</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                <p className="text-xs text-emerald-600 font-semibold">Deal Closed by Admin</p>
                <p className="text-xl font-bold text-emerald-700">{deals.length}</p>
              </div>
            </div>

            {loadingAdminActivity ? (
              <div className="text-center text-gray-400 py-10 text-sm">Loading...</div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Trophy size={36} className="mb-3 opacity-20" />
                <p className="text-sm font-medium">No admin-completed leads or deals yet</p>
                <p className="text-xs mt-1">When Admin personally converts a lead or closes a deal Won, it shows up here</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="grid grid-cols-[1.6fr_1.6fr_1.4fr_1.4fr_1.6fr_0.8fr] bg-gray-50 border-b border-gray-200 px-4 py-3">
                  {["Type", "Name", "Company", "Salesperson", "Date & Time", "Actions"].map((h, i) => (
                    <div key={i} className={`text-xs font-bold text-gray-600 uppercase tracking-wide ${i === 5 ? "text-right" : ""}`}>{h}</div>
                  ))}
                </div>
                {rows.map((r) => (
                  <div key={r.key} className="grid grid-cols-[1.6fr_1.6fr_1.4fr_1.4fr_1.6fr_0.8fr] px-4 py-3 border-b border-gray-100 last:border-0 items-center hover:bg-gray-50/70">
                    <div><span className={`text-xs px-2 py-0.5 rounded-md font-medium border ${r.typeClass}`}>{r.typeLabel}</span></div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{r.name}</p>
                      {r.value && <p className="text-xs font-bold text-emerald-600">{r.value}</p>}
                    </div>
                    <div className="text-xs text-gray-600 truncate">{r.company || "—"}</div>
                    <div className="text-xs text-gray-600 truncate">{r.salesperson}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={9} />{fmt(r.date)} {fmtTime(r.date)}</div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => setDismissConfirm({ itemType: r.itemType, itemId: r.itemId, itemName: r.name })}
                        className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500"
                        title="Remove from this list"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <ConfirmModal
              open={!!dismissConfirm}
              title="Remove from Admin Completed"
              message={`Remove "${dismissConfirm?.itemName}" from this list? It won't be deleted — just hidden from Admin Completed.`}
              onConfirm={handleDismissAdminActivity}
              onClose={() => setDismissConfirm(null)}
            />
          </div>
        );
      })()}

      {/* Cards / Table */}
      {mainView === "tasks" && (loading ? (
        <div className="flex justify-center items-center h-40 text-gray-400 text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-gray-400">
          <CheckCircle size={36} className="mb-2 opacity-20" />
          <p className="text-sm">No tasks in this category</p>
        </div>
      ) : viewMode === "card" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
          {filtered.map((task) => (
            <CompactTaskCard
              key={task._id}
              task={task}
              onClick={setSelectedTaskDetails}
            />
          ))}
        </div>
      ) : viewMode === "pipeline" ? (
        <TaskPipelineView
          tasks={filtered}
          baseUrl={baseUrl}
          headers={headers}
          onRefresh={() => { fetchTasks(false); fetchTargetData(); }}
          onEdit={(t) => { setEditTask(t); setModalOpen(true); }}
          onApproveRejection={(t, action) => handleApproveRejection(t._id, action)}
          onApproveHold={handleApproveHoldAction}
        />
      ) : (
        <TaskTableView
          tasks={filtered}
          onEdit={(t) => { setEditTask(t); setModalOpen(true); }}
          onDelete={(t) => setDeleteTarget(t)}
          onApproveRejection={(t, action) => handleApproveRejection(t._id, action)}
          onApproveHold={handleApproveHoldAction}
        />
      ))}


      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => fetchTasks(false)}
        salesUsers={salesUsers}
        editTask={editTask}
        baseUrl={baseUrl}
        headers={headers}
        inUseLeadIds={inUseLeadIds}
        inUseDealIds={inUseDealIds}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title="Remove Task"
        message={`Remove "${deleteTarget?.title}" from the list? It won't be permanently deleted — the record and its full history stay in the database, just hidden from view.`}
        confirmLabel="Remove"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />

      <ConfirmModal
        open={!!noteDeleteConfirm}
        title={noteDeleteConfirm?.isBulk ? "Delete Selected Notes" : "Delete Reason Note"}
        message={
          noteDeleteConfirm?.isBulk
            ? `Delete ${noteDeleteConfirm?.count} selected reason note(s)?`
            : "Delete this reason note?"
        }
        onConfirm={noteDeleteConfirm?.isBulk ? handleBulkDeleteNotes : handleDeleteNote}
        onClose={() => setNoteDeleteConfirm(null)}
      />

      <ApproveHoldModal
        open={!!approveHoldTask}
        task={approveHoldTask}
        onClose={() => setApproveHoldTask(null)}
        onConfirm={submitApproveHold}
      />
      <WorkflowExplanationModal open={showWorkflowExplanation} onClose={() => setShowWorkflowExplanation(false)} />

      {/* ── Reject Reason Note Modal ── */}
      {rejectNoteModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <XCircle size={20} className="text-red-500" />
              Reject Reason
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Provide a reason for rejecting this note. The sales person will be notified to submit a new reason.
            </p>
            <textarea
              autoFocus
              className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none mb-4"
              rows={4}
              placeholder="Why is this reason invalid?"
              value={rejectNoteReason}
              onChange={(e) => setRejectNoteReason(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setRejectNoteModal({ open: false, note: null }); setRejectNoteReason(""); }}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectReasonNote}
                disabled={rejectingNote || !rejectNoteReason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {rejectingNote ? "Rejecting..." : "Reject Reason"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reassign Reason Note Modal ── */}
      <ReassignReasonNoteModal
        open={reassignNoteModal.open}
        note={reassignNoteModal.note}
        salesUsers={salesUsers}
        loading={reassigningNote}
        onClose={() => setReassignNoteModal({ open: false, note: null })}
        onConfirm={handleAcceptReasonNote}
      />

      {/* Full Task Details Modal */}
      {selectedTaskDetails && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 sm:p-6" onClick={() => setSelectedTaskDetails(null)}>
          <div className="bg-transparent w-full max-w-4xl max-h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white rounded-t-xl px-4 py-3 border-b flex justify-between items-center sticky top-0 z-10">
              <h3 className="font-bold text-gray-800">Task Details</h3>
              <button onClick={() => setSelectedTaskDetails(null)} className="text-gray-500 hover:text-gray-800 bg-gray-100 p-1.5 rounded-full">
                <X size={16} />
              </button>
            </div>
            <div className="bg-gray-50 p-4 sm:p-6 rounded-b-xl border border-t-0 border-gray-100 shadow-xl">
              <TaskCard
                task={selectedTaskDetails}
                targets={targets}
                progressFallbacks={progressFallbacks}
                onEdit={(t) => { setEditTask(t); setModalOpen(true); setSelectedTaskDetails(null); }}
                onDelete={(t) => { setDeleteTarget(t); setSelectedTaskDetails(null); }}
                onApproveRejection={(t, action) => { handleApproveRejection(t._id, action); setSelectedTaskDetails(null); }}
                onApproveHold={(t, action) => { handleApproveHoldAction(t, action); setSelectedTaskDetails(null); }}
                baseUrl={baseUrl}
                headers={headers}
                onRefresh={() => { fetchTasks(false); fetchTargetData(); setSelectedTaskDetails(null); }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ApproveHoldModal({ open, task, onClose, onConfirm }) {
  const [newDueDate, setNewDueDate] = useState("");

  useEffect(() => {
    if (open && task) {
      setNewDueDate(task.dueDate ? (() => { const d = new Date(task.dueDate); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })() : "");
    }
  }, [open, task]);

  if (!open || !task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-slate-700 mb-4">Approve Hold Request</h3>
        <p className="text-base text-slate-600 mb-4">
          Are you sure you want to approve the hold request for "{task.title}"?
          Please provide a new due date to extend the task timeline.
        </p>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-1">New Due Date <span className="text-red-500">*</span></label>
          <input
            type="date"
            className="w-full border border-gray-300 rounded p-2"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded">Cancel</button>
          <button onClick={() => {
            if (!newDueDate) {
              toast.error("Please provide a new due date");
              return;
            }
            onConfirm(task._id, "approve", newDueDate);
          }} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">Approve Hold</button>
        </div>
      </div>
    </div>
  );
}

function ReassignReasonNoteModal({ open, note, salesUsers, onClose, onConfirm, loading }) {
  const [reassignTo, setReassignTo] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (open && note) {
      setReassignTo(note.assignedTo?._id || "");
      setNewDueDate("");
      setAdminNote("");
      setShowConfirm(false);
    }
  }, [open, note]);

  if (!open || !note) return null;

  if (showConfirm) {
    const leadsCount = note.remainingLeadsCount !== undefined ? note.remainingLeadsCount : (note.leadRefs?.length || (note.leadRef ? 1 : 0));
    const dealsCount = note.remainingDealsCount !== undefined ? note.remainingDealsCount : (note.dealRefs?.length || (note.dealRef ? 1 : 0));

    let msgParts = [];
    if (leadsCount > 0) msgParts.push(`${leadsCount} lead(s)`);
    if (dealsCount > 0) msgParts.push(`${dealsCount} deal(s)`);
    
    // Calculate overlaps for UI
    const overlapLeads = note.overlappingTargetLeads || [];
    const overlapDeals = note.overlappingTargetDeals || [];
    const hasAnyOverlap = overlapLeads.length > 0 || overlapDeals.length > 0;

    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] flex flex-col">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Reassignment</h3>
          <p className="text-sm text-gray-600 mb-4 shrink-0">
            Are you sure you want to reassign this task? The underlying {msgParts.join(" and ")} will also be completely reassigned to the new salesperson.
          </p>

          {(note.remainingLeads?.length > 0 || note.remainingDeals?.length > 0) && (
            <div className="mb-4 overflow-y-auto flex-1 min-h-0 border border-gray-100 rounded-lg bg-gray-50/50 p-2 space-y-1.5">
              {note.remainingLeads?.map(l => {
                const overlap = overlapLeads.find(ol => String(ol._id) === String(l._id));
                return (
                  <div key={l._id} className={`p-2 rounded-md border text-sm flex flex-col gap-1 ${overlap ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200"}`}>
                    <div className="flex items-center gap-2 font-medium text-gray-800">
                      <span className="text-xs uppercase tracking-wider text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded">Lead</span>
                      {l.leadName}
                    </div>
                    {overlap && (
                      <div className="text-xs text-amber-700 flex items-center gap-1 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        Also linked to Target: "{overlap.targetName}" ({l.leadName} will also be reassigned)
                      </div>
                    )}
                  </div>
                );
              })}
              {note.remainingDeals?.map(d => {
                const overlap = overlapDeals.find(od => String(od._id) === String(d._id));
                return (
                  <div key={d._id} className={`p-2 rounded-md border text-sm flex flex-col gap-1 ${overlap ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200"}`}>
                    <div className="flex items-center gap-2 font-medium text-gray-800">
                      <span className="text-xs uppercase tracking-wider text-purple-600 font-bold bg-purple-50 px-1.5 py-0.5 rounded">Deal</span>
                      {d.dealName || d.dealTitle}
                    </div>
                    {overlap && (
                      <div className="text-xs text-amber-700 flex items-center gap-1 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        Also linked to Target: "{overlap.targetName}" ({d.dealName || d.dealTitle} will also be reassigned)
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {hasAnyOverlap && (
            <div className="mb-4 text-xs text-amber-700 bg-amber-50 p-2.5 rounded border border-amber-200 font-medium">
              Items highlighted in yellow are shared with active Targets. Proceeding will automatically split those Targets to reassign the shared items to the new salesperson.
            </div>
          )}

          <div className="flex justify-end gap-3 shrink-0 pt-2">
            <button onClick={() => setShowConfirm(false)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg">Cancel</button>
            <button onClick={() => {
              setShowConfirm(false);
              onConfirm(reassignTo, newDueDate, adminNote);
            }} disabled={loading} className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50">
              {loading ? "Confirming..." : "Yes, Reassign"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Accept Reason & Reassign Task</h3>
        <p className="text-sm text-gray-600 mb-4">
          You are accepting the reason note. Please select the assignee (you can keep the same person) and assign a new due date for this task.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Assign To <span className="text-red-500">*</span></label>
            <select
              value={reassignTo}
              onChange={(e) => setReassignTo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Select Sales Person</option>
              {salesUsers.map((u) => (
                <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">New Due Date <span className="text-red-500">*</span></label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Admin Note (Optional)</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              rows={2}
              placeholder="Add a note to the assignee..."
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg">Cancel</button>
          <button onClick={() => {
            if (!reassignTo) return toast.error("Please select a sales person");
            if (!newDueDate) return toast.error("Please select a new due date");

            const isSamePerson = note.assignedTo?._id === reassignTo;
            const leadsCount = note.remainingLeadsCount !== undefined ? note.remainingLeadsCount : (note.leadRefs?.length || (note.leadRef ? 1 : 0));
            const dealsCount = note.remainingDealsCount !== undefined ? note.remainingDealsCount : (note.dealRefs?.length || (note.dealRef ? 1 : 0));

            if (!isSamePerson && (leadsCount > 0 || dealsCount > 0)) {
              setShowConfirm(true);
              return;
            }

            onConfirm(reassignTo, newDueDate, adminNote);
          }} disabled={loading} className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50">
            {loading ? "Reassigning..." : "Accept & Reassign"}
          </button>
        </div>
      </div>
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

