import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNotifications } from "../../context/NotificationContext";
import { useSocket } from "../../context/SocketContext";
import { useTargetSocket } from "../../context/TargetSocketContext";
import { todayISO, validateTaskDueDate } from "../../utils/dateValidation";
import { isTaskTabNotif, getNotificationAccentClass } from "../../utils/taskNotifications";
import {
  Plus, Trash2, CheckCircle, Clock, User,
  Calendar, X, Edit2, StickyNote,
  FileText, Briefcase, Bell, ArrowRightLeft, Check, ChevronDown, ChevronUp, History,
  Users, Building2, Phone, Mail, LayoutGrid, List, Trophy, Award, XCircle, Activity,
  TrendingUp, Flag,
} from "lucide-react";

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
  Pending:       "bg-gray-100 text-gray-700",
  "In Progress": "bg-blue-100 text-blue-700",
  Completed:     "bg-green-100 text-green-700",
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
function TargetSnapshotGrid({ target: t }) {
  const percentages = t?.percentages || {};
  const actuals = t?.actuals || {};
  const overall = percentages.overall || 0;

  const metrics = [
    { label: "Leads to Deals Converted", target: t?.targetLeads ?? 0, actual: actuals.leadsConverted || 0, pct: percentages.leadsPercent || 0, icon: <Users size={13} className="text-blue-500" />, bg: "bg-blue-50", border: "border-blue-100", countOnly: false },
    { label: "Deals Won", target: t?.targetDeals ?? 0, actual: actuals.dealsWon || 0, pct: percentages.dealsPercent || 0, icon: <TrendingUp size={13} className="text-green-500" />, bg: "bg-green-50", border: "border-green-100", countOnly: false },
    { label: "Leads to Deals Won", actual: actuals.leadDealWon || 0, icon: <Trophy size={13} className="text-amber-500" />, bg: "bg-amber-50", border: "border-amber-100", countOnly: true, badgeText: "leads closed", badgeClass: "text-amber-600 bg-amber-100" },
    { label: "Deals Lost", actual: actuals.dealsLost || 0, icon: <XCircle size={13} className="text-red-500" />, bg: "bg-red-50", border: "border-red-100", countOnly: true, badgeText: "closed lost", badgeClass: "text-red-600 bg-red-100" },
    { label: "Calls Made", target: t?.targetCalls ?? 0, actual: actuals.calls || 0, pct: percentages.callsPercent || 0, icon: <Phone size={13} className="text-orange-500" />, bg: "bg-orange-50", border: "border-orange-100", countOnly: false },
    { label: "Meetings Done", target: t?.targetMeetings ?? 0, actual: actuals.meetings || 0, pct: percentages.meetingsPercent || 0, icon: <Activity size={13} className="text-purple-500" />, bg: "bg-purple-50", border: "border-purple-100", countOnly: false },
  ];

  return (
    <div className="mb-4">
      <div className={`rounded-xl p-4 mb-3 ${overall >= 80 ? "bg-emerald-50 border border-emerald-100" : overall >= 50 ? "bg-amber-50 border border-amber-100" : "bg-red-50 border border-red-100"}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-700"><Trophy size={15} className={getTextColor(overall)} /> Overall Progress</span>
          <span className={`text-2xl font-bold ${getTextColor(overall)}`}>{overall}%</span>
        </div>
        <ProgressBar value={overall} color={getProgressColor(overall)} />
        <p className="text-xs text-gray-400 mt-1.5">
          {overall >= 100 ? "🎉 Target achieved!" : overall >= 80 ? "Almost there — keep going!" : overall >= 50 ? "Good progress — stay focused!" : "Keep pushing — you can do it!"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
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
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Stage Journey</p>

      {hasLeadOrigin ? (
        <>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] font-semibold text-gray-600">Cold</span>
              <p className="text-[10px] text-gray-700 font-semibold">{fmt(leadCreatedDate)} {fmtTime(leadCreatedDate)}</p>
            </div>
          </div>
          {leadHistory.map((h, hi) => (
            <div key={`lead-${hi}`} className="flex items-start gap-2 pl-1">
              <div className="flex flex-col items-center gap-0.5"><div className="w-px h-2 bg-gray-200" /><div className="w-2 h-2 rounded-full bg-blue-300 shrink-0" /></div>
              <div>
                <span className="text-[11px] font-semibold text-gray-700">{h.status}</span>
                <p className="text-[10px] text-gray-700 font-semibold">{fmt(h.changedAt)} {fmtTime(h.changedAt)}</p>
              </div>
            </div>
          ))}
          <div className="flex items-start gap-2 pl-1">
            <div className="flex flex-col items-center gap-0.5"><div className="w-px h-2 bg-gray-200" /><div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" /></div>
            <div>
              <span className="text-[11px] font-semibold text-gray-700">Converted to Deal</span>
              <p className="text-[10px] text-gray-700 font-semibold">{fmt(convertedDate)} {fmtTime(convertedDate)}</p>
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-start gap-2">
          <div className="w-2 h-2 rounded-full bg-gray-400 mt-0.5 shrink-0" />
          <div>
            <span className="text-[11px] font-semibold text-gray-600">Lead Created</span>
            <p className="text-[10px] text-gray-700 font-semibold">{fmt(createdDate)} {fmtTime(createdDate)}</p>
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 pl-1">
        <div className="flex flex-col items-center gap-0.5"><div className="w-px h-2 bg-gray-200" /><div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" /></div>
        <div>
          <span className="text-[11px] font-semibold text-gray-700">Qualification</span>
          <span className="text-[10px] text-gray-400 ml-1">(deal start)</span>
          <p className="text-[10px] text-gray-400">{fmt(convertedDate || createdDate)} {fmtTime(convertedDate || createdDate)}</p>
        </div>
      </div>
      {stageHistory.map((h, hi) => {
        const prev = hi === 0 ? (convertedDate || createdDate) : new Date(stageHistory[hi - 1].movedAt);
        const diff = prev ? Math.max(0, Math.round((new Date(h.movedAt) - prev) / 86400000)) : null;
        return (
          <div key={hi} className="flex items-start gap-2 pl-1">
            <div className="flex flex-col items-center gap-0.5"><div className="w-px h-2 bg-gray-200" /><div className={`w-2 h-2 rounded-full ${STAGE_DOT[h.stage] || "bg-gray-300"} shrink-0`} /></div>
            <div>
              <span className="text-[11px] font-semibold text-gray-700">{h.stage}</span>
              {diff !== null && <span className="text-[10px] text-gray-400 ml-1">({diff === 0 ? "same day" : `+${diff}d`})</span>}
              <p className="text-[10px] text-gray-700 font-semibold">{fmt(h.movedAt)} {fmtTime(h.movedAt)}</p>
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
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Status Journey</p>
      <div className="flex items-center gap-0.5">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
        <span className="text-[10px] text-gray-600 font-medium ml-1">Cold</span>
        <span className="text-[10px] text-gray-700 font-semibold ml-1">{fmt(lead.createdAt)}</span>
      </div>
      {history.map((h, hi) => (
        <div key={hi} className="flex items-center gap-0.5 pl-1">
          <div className="w-px h-2 bg-gray-200 mr-0.5" />
          <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-gray-400" />
          <span className="text-[10px] text-gray-600 font-medium ml-1">{h.status}</span>
          <span className="text-[10px] text-gray-700 font-semibold ml-1">{fmt(h.changedAt)} {fmtTime(h.changedAt)}</span>
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
function LinkedItemDetail({ task, linkedBadgeText, canUnlink, baseUrl, headers, onUnlinked }) {
  const [expanded, setExpanded] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const deal = task.dealRef;
  const lead = task.leadRef;
  // A converted lead has no pipeline of its own — the real stage journey now
  // lives on the deal it became. task.convertedDealRef is attached
  // server-side by attachConvertedDealJourney on every task fetch (see
  // taskNotificationService.js), independent of any target.
  const resolvedFromLead = !deal && lead?.status === "Converted" ? task.convertedDealRef : null;
  const effectiveDeal = deal || resolvedFromLead;

  const handleUnlink = async () => {
    setUnlinking(true);
    try {
      const field = deal ? "dealRef" : "leadRef";
      await axios.put(`${baseUrl}/tasks/${task._id}`, { [field]: "" }, { headers });
      toast.success(`${deal ? "Deal" : "Lead"} unlinked from task`);
      setConfirmOpen(false);
      onUnlinked?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to unlink");
    } finally {
      setUnlinking(false);
    }
  };

  const confirmModal = confirmOpen && (
    <ConfirmModal
      open={confirmOpen}
      title={`Unlink ${deal ? "Deal" : "Lead"}`}
      message={`Remove this ${deal ? "deal" : "lead"} from the task? It won't be deleted — just unlinked from this task.`}
      onConfirm={handleUnlink}
      onClose={() => !unlinking && setConfirmOpen(false)}
    />
  );

  // Icons live inside the card's own header row (top-right), not as a
  // separate label bar floating above it.
  const CardIcons = () => (
    <div className="flex items-center gap-1 shrink-0">
      <button onClick={() => setExpanded((v) => !v)} className="p-1 rounded-md hover:bg-black/5 text-gray-400 hover:text-gray-600" title={expanded ? "Collapse" : "Expand"}>
        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {canUnlink && (
        <button onClick={() => setConfirmOpen(true)} className="p-1 rounded-md hover:bg-red-100 text-gray-400 hover:text-red-500" title={`Unlink ${deal ? "deal" : "lead"}`}>
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );

  if (effectiveDeal) {
    const deal = effectiveDeal;
    const stage = deal.stage;
    const isWon = stage === "Closed Won";
    const isLost = stage === "Closed Lost";
    const dealName = deal.dealName || deal.dealTitle;
    const bucketBg = isWon ? "bg-emerald-50 border-emerald-200" : isLost ? "bg-red-50 border-red-200" : "bg-white border-gray-200";
    const icon = isWon ? <Award size={11} className="text-emerald-500" /> : isLost ? <XCircle size={11} className="text-red-500" /> : <Briefcase size={11} />;
    const wonDate = deal.wonAt ? new Date(deal.wonAt) : null;
    const createdDate = deal.createdAt ? new Date(deal.createdAt) : null;
    const totalDays = wonDate && createdDate ? Math.max(0, Math.round((wonDate - createdDate) / 86400000)) : null;

    return (
      <div className={`rounded-2xl overflow-hidden border ${bucketBg}`}>
        <div className="px-3 pt-3 pb-2.5">
          <div className="flex items-start justify-between gap-1.5 mb-1">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">{icon} {resolvedFromLead ? "Linked Lead → Deal" : "Linked Deal"}</p>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-gray-800 truncate flex-1">{dealName}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0 ${STAGE_COLOR[stage] || "bg-gray-100 text-gray-500 border-gray-200"}`}>{stage}</span>
              </div>
            </div>
            <CardIcons />
          </div>
          {linkedBadgeText && (
            <span className="inline-block text-[10px] bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded-full border border-orange-200 mt-1">{linkedBadgeText}</span>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
            {deal.companyName && <span className="text-[10px] text-gray-500 flex items-center gap-1"><Building2 size={8} />{deal.companyName}</span>}
            {deal.value && <span className={`text-[10px] font-bold ${isWon ? "text-emerald-700" : "text-gray-700"}`}>{deal.currency || "INR"} {deal.value}</span>}
            {deal.phoneNumber && <span className="text-[10px] text-gray-500 flex items-center gap-1"><Phone size={8} />{deal.phoneNumber}</span>}
            {deal.email && <span className="text-[10px] text-gray-500 flex items-center gap-1 truncate max-w-[160px]"><Mail size={8} />{deal.email}</span>}
            {totalDays !== null && <span className="text-[10px] text-emerald-600 flex items-center gap-0.5"><Clock size={8} />{totalDays === 0 ? "Same day" : `${totalDays}d to close`}</span>}
          </div>
        </div>

        {expanded && <DealStageJourney deal={deal} />}

        {expanded && totalDays !== null && (
          <div className="px-3 py-2 bg-emerald-100/70 flex items-center gap-1.5">
            <Clock size={11} className="text-emerald-600 shrink-0" />
            <p className="text-[11px] font-bold text-emerald-700">
              {totalDays === 0 ? "Closed same day" : `Total: ${totalDays} day${totalDays !== 1 ? "s" : ""} from deal creation to won`}
            </p>
          </div>
        )}
        {confirmModal}
      </div>
    );
  }

  if (lead) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-3">
          <div className="flex items-start justify-between gap-1.5 mb-1">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1"><FileText size={11} /> Linked Lead</p>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-gray-800 truncate flex-1">{lead.leadName}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0 ${LEAD_STATUS_COLOR[lead.status] || "bg-gray-100 text-gray-500 border-gray-200"}`}>{lead.status}</span>
              </div>
            </div>
            <CardIcons />
          </div>
          {linkedBadgeText && (
            <span className="inline-block text-[10px] bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded-full border border-orange-200 mt-1">{linkedBadgeText}</span>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
            {lead.companyName && <span className="text-[10px] text-gray-500 flex items-center gap-1"><Building2 size={8} />{lead.companyName}</span>}
            {lead.phoneNumber && <span className="text-[10px] text-gray-500 flex items-center gap-1"><Phone size={8} />{lead.phoneNumber}</span>}
            {lead.email && <span className="text-[10px] text-gray-500 flex items-center gap-1 truncate max-w-[160px]"><Mail size={8} />{lead.email}</span>}
            {lead.createdAt && <span className="text-[10px] text-gray-300 flex items-center gap-1"><Calendar size={8} />Added {fmt(lead.createdAt)}</span>}
          </div>
        </div>
        {expanded && <LeadStatusJourney lead={lead} />}
        {confirmModal}
      </div>
    );
  }

  return null;
}

/* ── Sales Person Preview Panel (inside Task modal) — single-select: click a
   lead/deal to link it as this task's leadRef/dealRef. Reuses the same
   sales-summary endpoint Target Management uses. ─────────────────────── */
function TaskSalesPersonPreview({ userId, baseUrl, headers, selectedLeadId, selectedDealId, onSelectLead, onSelectDeal }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("leads");

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

  const { leads } = data;
  // A deal that's already Closed Won/Lost is done — linking a task to it just
  // recreates the "stale, already-resolved" card the fix above works around.
  // The currently-selected deal stays visible even if closed, so an existing
  // link doesn't silently disappear from view.
  const dealsList = (data.deals.list || []).filter((d) => !["Closed Won", "Closed Lost"].includes(d.stage) || d._id === selectedDealId);
  const deals = { ...data.deals, list: dealsList, total: dealsList.length };

  return (
    <div className="space-y-3 h-full flex flex-col">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-blue-600">{leads.total}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Total Leads</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-indigo-600">{deals.total}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Total Deals</p>
        </div>
      </div>

      {/* Selection summary */}
      {(selectedLeadId || selectedDealId) && (
        <div className="bg-[#008ecc]/10 border border-[#008ecc]/20 rounded-xl px-3 py-2 flex items-center gap-2">
          <Check size={13} className="text-[#008ecc]" />
          <p className="text-xs text-[#008ecc] font-semibold">
            {selectedLeadId ? "1 lead" : ""}{selectedLeadId && selectedDealId ? " + " : ""}{selectedDealId ? "1 deal" : ""} linked to this task
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

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {tab === "leads" && leads.list.length > 0 && (
          <div className="flex items-center justify-between px-1 py-1 border-b border-gray-100">
            <span className="text-[11px] font-semibold text-gray-500">Click a lead to link it with this task</span>
            {selectedLeadId && (
              <button type="button" onClick={() => onSelectLead("")} className="text-[11px] font-bold text-[#008ecc] hover:underline">
                Clear
              </button>
            )}
          </div>
        )}
        {tab === "deals" && deals.list.length > 0 && (
          <div className="flex items-center justify-between px-1 py-1 border-b border-gray-100">
            <span className="text-[11px] font-semibold text-gray-500">Click a deal to link it with this task</span>
            {selectedDealId && (
              <button type="button" onClick={() => onSelectDeal("")} className="text-[11px] font-bold text-[#008ecc] hover:underline">
                Clear
              </button>
            )}
          </div>
        )}

        {tab === "leads" && (
          leads.list.length === 0
            ? <p className="text-xs text-gray-400 text-center py-6">No leads assigned</p>
            : leads.list.map((l) => (
              <div key={l._id}
                onClick={() => onSelectLead(selectedLeadId === l._id ? "" : l._id)}
                className={`flex items-start gap-2.5 bg-white border rounded-xl p-2.5 cursor-pointer transition-all ${selectedLeadId === l._id ? "border-[#008ecc] bg-blue-50/30 shadow-sm" : "border-gray-100 hover:border-gray-200"}`}>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${selectedLeadId === l._id ? "bg-[#008ecc] border-[#008ecc]" : "border-gray-300 bg-white"}`}>
                  {selectedLeadId === l._id && <Check size={10} className="text-white" strokeWidth={3} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <p className="text-xs font-semibold text-gray-800 truncate">{l.leadName}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0 ${LEAD_STATUS_COLOR[l.status] || "bg-gray-100 text-gray-500 border-gray-200"}`}>{l.status}</span>
                  </div>
                  {l.companyName && <p className="text-[11px] text-gray-400 flex items-center gap-1 truncate mb-0.5"><Building2 size={9} />{l.companyName}</p>}
                  {l.phoneNumber && <p className="text-[11px] text-gray-500 flex items-center gap-1"><Phone size={9} className="text-gray-400" />{l.phoneNumber}</p>}
                  {l.email && <p className="text-[11px] text-gray-500 flex items-center gap-1 truncate"><Mail size={9} className="text-gray-400" />{l.email}</p>}
                  <p className="text-[10px] text-gray-300 mt-1 flex items-center gap-1"><Calendar size={9} />Added {fmt(l.createdAt)}</p>
                </div>
              </div>
            ))
        )}

        {tab === "deals" && (
          deals.list.length === 0
            ? <p className="text-xs text-gray-400 text-center py-6">No deals assigned</p>
            : deals.list.map((d) => {
              const adminBadge = getAdminActionBadge(d);
              return (
                <div key={d._id}
                  onClick={() => onSelectDeal(selectedDealId === d._id ? "" : d._id)}
                  className={`flex items-start gap-2.5 bg-white border rounded-xl p-2.5 cursor-pointer transition-all ${selectedDealId === d._id ? "border-[#008ecc] bg-blue-50/30 shadow-sm" : "border-gray-100 hover:border-gray-200"}`}>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${selectedDealId === d._id ? "bg-[#008ecc] border-[#008ecc]" : "border-gray-300 bg-white"}`}>
                    {selectedDealId === d._id && <Check size={10} className="text-white" strokeWidth={3} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <p className="text-xs font-semibold text-gray-800 truncate">{d.dealName}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0 ${STAGE_COLOR[d.stage] || "bg-gray-100 text-gray-500 border-gray-200"}`}>{d.stage}</span>
                    </div>
                    {adminBadge && (
                      <span className="inline-block text-[10px] bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded border border-orange-200 mb-1" title={adminBadge.title}>{adminBadge.text}</span>
                    )}
                    {d.companyName && <p className="text-[11px] text-gray-400 flex items-center gap-1 truncate mb-0.5"><Building2 size={9} />{d.companyName}</p>}
                    <div className="flex flex-wrap gap-2 mb-0.5">
                      {d.value && <p className="text-[11px] font-bold text-gray-700">{d.currency} {d.value}</p>}
                      {d.phoneNumber && <p className="text-[11px] text-gray-500 flex items-center gap-1"><Phone size={9} className="text-gray-400" />{d.phoneNumber}</p>}
                    </div>
                    {d.email && <p className="text-[11px] text-gray-500 flex items-center gap-1 truncate"><Mail size={9} className="text-gray-400" />{d.email}</p>}
                    <p className="text-[10px] text-gray-300 mt-1 flex items-center gap-1"><Calendar size={9} />Created {fmt(d.createdAt)}</p>
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
        <h3 className="text-base font-bold text-gray-800 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 text-sm font-medium">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Task Create/Edit Modal ─────────────────────── */
function TaskModal({ open, onClose, onSaved, salesUsers, editTask, baseUrl, headers }) {
  const [form, setForm] = useState({
    title: "", description: "", priority: "Medium",
    dueDate: "", assignedTo: "", leadRef: "", dealRef: "",
    callsMade: 0, meetingsDone: 0,
  });
  const [saving, setSaving] = useState(false);
  const [dateError, setDateError] = useState(null);

  useEffect(() => {
    if (open) {
      if (editTask) {
        setForm({
          title: editTask.title || "",
          description: editTask.description || "",
          priority: editTask.priority || "Medium",
          dueDate: editTask.dueDate ? editTask.dueDate.split("T")[0] : "",
          assignedTo: editTask.assignedTo?._id || "",
          leadRef: editTask.leadRef?._id || editTask.leadRef || "",
          dealRef: editTask.dealRef?._id || editTask.dealRef || "",
          callsMade: editTask.callsMade || 0,
          meetingsDone: editTask.meetingsDone || 0,
        });
      } else {
        setForm({ title: "", description: "", priority: "Medium", dueDate: "", assignedTo: "", leadRef: "", dealRef: "", callsMade: 0, meetingsDone: 0 });
      }
      setDateError(null);
    }
  }, [editTask, open]);

  const handleDueDateChange = (value) => {
    setForm((f) => ({ ...f, dueDate: value }));
    setDateError(validateTaskDueDate(value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateTaskDueDate(form.dueDate);
    if (err) { setDateError(err); toast.error(err); return; }
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Phone size={12} className="text-orange-500" /> Calls Made</label>
                <input
                  type="number"
                  min={0}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]/30 focus:border-[#008ecc]"
                  value={form.callsMade}
                  onChange={(e) => setForm({ ...form, callsMade: Math.max(0, Number(e.target.value)) })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Activity size={12} className="text-teal-500" /> Meetings Done</label>
                <input
                  type="number"
                  min={0}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]/30 focus:border-[#008ecc]"
                  value={form.meetingsDone}
                  onChange={(e) => setForm({ ...form, meetingsDone: Math.max(0, Number(e.target.value)) })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign To *</label>
              <select
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]/30 focus:border-[#008ecc]"
                value={form.assignedTo}
                onChange={(e) => setForm({ ...form, assignedTo: e.target.value, leadRef: "", dealRef: "" })}
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
            {(form.leadRef || form.dealRef) && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-1">
                <p className="text-[11px] font-bold text-blue-700">Linked to this task:</p>
                {form.leadRef && <p className="text-[11px] text-blue-600">✓ 1 lead selected</p>}
                {form.dealRef && <p className="text-[11px] text-blue-600">✓ 1 deal selected</p>}
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
                selectedLeadId={form.leadRef}
                selectedDealId={form.dealRef}
                onSelectLead={(id) => setForm((f) => ({ ...f, leadRef: id }))}
                onSelectDeal={(id) => setForm((f) => ({ ...f, dealRef: id }))}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Task Card ─────────────────────── */
function TaskCard({ task, onEdit, onDelete, targets, progressFallbacks, baseUrl, headers, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const isCompleted = task.status === "Completed";
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isCompleted;

  const leadName = task.leadRef?.leadName
    ? `${task.leadRef.leadName}${task.leadRef.companyName ? ` — ${task.leadRef.companyName}` : ""}`
    : null;
  const dealName = task.dealRef?.dealName || task.dealRef?.dealTitle || null;
  const linkedBadgeText = getLinkedItemBadgeText(task.linkedItemBadge);
  const progressPct = STATUS_PROGRESS[task.status] ?? 0;
  const linkedItemName = leadName || dealName;
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
            <h3 className="font-bold text-gray-800 text-sm truncate">{task.title}</h3>
            <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
              <User size={9} />{task.assignedTo?.firstName} {task.assignedTo?.lastName}
              {task.assignedTo?.email && <span className="truncate">· {task.assignedTo.email}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
            <button onClick={() => onEdit(task)} className="p-1 hover:bg-blue-50 rounded-full text-gray-400 hover:text-[#008ecc] transition-colors" title="Edit task"><Edit2 size={14} /></button>
            <button onClick={() => onDelete(task)} className="p-1 hover:bg-red-50 rounded-full text-gray-400 hover:text-red-500 transition-colors" title="Delete task"><Trash2 size={14} /></button>
          </div>
        </div>

        {adminTookTask && (
          <span className="inline-block w-fit text-[10px] bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded-full border border-orange-200 mb-2">
            Admin took this task — {adminTookTask}
          </span>
        )}

        {hasPendingIssue && (
          <div className="flex items-center gap-1.5 mb-2 px-2.5 py-1.5 bg-rose-50 border border-rose-200 rounded-lg w-fit">
            <Flag size={11} className="text-rose-500 shrink-0" />
            <span className="text-[11px] font-bold text-rose-700">Pending Admin Review</span>
          </div>
        )}

        <div className={`flex items-center gap-1.5 text-[11px] mb-2 mt-1 ${isOverdue ? "text-red-500 font-semibold" : "text-gray-400"}`}>
          <Calendar size={11} /><span>Created {fmt(task.createdAt)} — Due {fmt(task.dueDate)}{isOverdue ? " (Overdue)" : ""}</span>
        </div>

        <TargetSnapshotGrid target={currentTarget} />

        {/* Description */}
        {task.description && (
          <div className="mb-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 flex items-start gap-2">
            <StickyNote size={12} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[9px] font-bold text-amber-600 uppercase tracking-wide mb-0.5">Task Description</p>
              <p className="text-[11px] text-amber-800 font-medium leading-relaxed">{task.description}</p>
            </div>
          </div>
        )}

        {/* Sales notes */}
        {task.completionNotes && (
          <div className="mb-3 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 flex items-start gap-2">
            <StickyNote size={12} className="text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wide mb-0.5">Sales Notes</p>
              <p className="text-[11px] text-blue-800 font-medium leading-relaxed break-words">{task.completionNotes}</p>
            </div>
          </div>
        )}

        {/* Toggle */}
        {linkedItemName && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-center gap-1.5 text-sm font-bold text-gray-700 hover:text-[#008ecc] py-2 border-t border-gray-100 transition-colors"
          >
            {expanded ? <><ChevronUp size={15} /> Hide Details</> : <><ChevronDown size={15} /> Show Details</>}
          </button>
        )}

        {expanded && linkedItemName && (
          <div className="mt-4 space-y-4">
            <LinkedItemDetail task={task} linkedBadgeText={linkedBadgeText} canUnlink baseUrl={baseUrl} headers={headers} onUnlinked={onRefresh} />
          </div>
        )}

        {task.createdBy && <p className="text-[10px] text-gray-300 mt-3">Created by {task.createdBy.firstName} {task.createdBy.lastName}</p>}
      </div>
    </div>
  );
}

/* ── Table View with expandable Tracking Journey rows ─────────────────────── */
function TaskTableView({ tasks, onEdit, onDelete }) {
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-[2fr_1.3fr_1fr_1fr_1fr_1.4fr_1.2fr] bg-gray-50 border-b border-gray-200 px-4 py-3">
        {["Task", "Assigned To", "Priority", "Status", "Due Date", "Linked Lead/Deal", "Actions"].map((h, i) => (
          <div key={i} className={`text-[11px] font-bold text-gray-600 uppercase tracking-wide ${i >= 2 && i <= 4 ? "text-center" : i === 6 ? "text-center" : ""}`}>{h}</div>
        ))}
      </div>

      {tasks.map((task) => {
        const isCompleted = task.status === "Completed";
        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isCompleted;
        const leadName = task.leadRef?.leadName || null;
        const dealName = task.dealRef?.dealName || task.dealRef?.dealTitle || null;
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
                  {task.description && <p className="text-[11px] text-gray-400 truncate mt-0.5">{task.description}</p>}
                </div>
                <div className="ml-1 shrink-0">{isExpanded ? <ChevronUp size={14} className="text-[#008ecc]" /> : <ChevronDown size={14} className="text-gray-400" />}</div>
              </div>
              {/* Assigned To */}
              <div className="flex flex-col justify-center min-w-0">
                <p className="text-xs font-semibold text-gray-700 truncate">{task.assignedTo?.firstName} {task.assignedTo?.lastName}</p>
                {task.assignedTo?.email && <p className="text-[10px] text-gray-400 truncate">{task.assignedTo.email}</p>}
              </div>
              {/* Priority */}
              <div className="flex items-center justify-center">
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium border ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
              </div>
              {/* Status — a deal-linked task shows the deal's own pipeline stage
                  (Qualification / Proposal Sent-Negotiation / ...) instead of the
                  generic task status, so admin sees where it actually stands;
                  "Completed" only once the deal is Closed Won (or, for tasks
                  with no linked deal, once the task itself is Completed). */}
              <div className="flex items-center justify-center">
                {task.dealRef?.stage ? (
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium border ${task.dealRef.stage === "Closed Won" ? STATUS_STYLES.Completed + " border-transparent" : STAGE_COLOR[task.dealRef.stage] || "bg-gray-100 text-gray-500 border-gray-200"}`}>
                    {task.dealRef.stage === "Closed Won" ? "Completed" : task.dealRef.stage}
                  </span>
                ) : (
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${STATUS_STYLES[task.status]}`}>
                    {task.status}
                  </span>
                )}
              </div>
              {/* Due Date */}
              <div className="flex items-center justify-center">
                <span className={`text-[11px] font-semibold flex items-center gap-1 ${isOverdue ? "text-red-500" : "text-gray-600"}`}>
                  <Calendar size={9} />{fmt(task.dueDate)}
                </span>
              </div>
              {/* Linked Lead/Deal */}
              <div className="flex flex-col justify-center gap-0.5 min-w-0">
                {leadName && <span className="text-[11px] text-gray-700 truncate flex items-center gap-1"><FileText size={9} className="text-blue-500 shrink-0" />{leadName}</span>}
                {dealName && <span className="text-[11px] text-gray-700 truncate flex items-center gap-1"><Briefcase size={9} className="text-blue-500 shrink-0" />{dealName}</span>}
                {linkedBadgeText && <span className="text-[10px] bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded-full border border-orange-200 w-fit truncate max-w-full">{linkedBadgeText}</span>}
                {!leadName && !dealName && <span className="text-[11px] text-gray-300">—</span>}
              </div>
              {/* Actions — just Edit/Delete; status is read-only, driven by the
                  task's own progress (or its linked deal's stage) above. */}
              <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => onEdit(task)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600" title="Edit"><Edit2 size={13} /></button>
                <button onClick={() => onDelete(task)} className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500" title="Delete"><Trash2 size={13} /></button>
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
                          <p className="text-[11px] font-semibold text-gray-700">{h.event}</p>
                          {h.detail && <p className="text-[10px] text-gray-500 break-words">{h.detail}</p>}
                          <p className="text-[10px] text-gray-400">{fmt(h.at)} {fmtTime(h.at)}</p>
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
  const [viewMode, setViewMode] = useState("card"); // "card" | "table"
  const [reassignModal, setReassignModal] = useState(null); // { notifId, taskId, itemName }
  const [reassignUserId, setReassignUserId] = useState("");
  const [reassignNote, setReassignNote] = useState("");
  const [reassignExtendDate, setReassignExtendDate] = useState("");
  const [reassigning, setReassigning] = useState(false);
  const [targets, setTargets] = useState([]);
  // Fallback Progress-card snapshots (keyed by taskId) for tasks whose
  // assignee has no Target covering them yet — see GET /targets/progress-fallback-all.
  const [progressFallbacks, setProgressFallbacks] = useState({});
  const [reasonNotes, setReasonNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [adminActivity, setAdminActivity] = useState(null); // { leadsConvertedByAdmin, dealsWonByAdmin, counts }
  const [loadingAdminActivity, setLoadingAdminActivity] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState(new Set());
  const [noteDeleteConfirm, setNoteDeleteConfirm] = useState(null); // { taskId, noteIdx, isBulk, count }

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
    const [targetsRes, dashStatsRes, fallbacksRes] = await Promise.allSettled([
      axios.get(`${baseUrl}/targets`, { headers }),
      axios.get(`${baseUrl}/targets/dashboard-stats`, { headers }),
      axios.get(`${baseUrl}/targets/progress-fallback-all`, { headers }),
    ]);

    if (reqId !== targetsReqId.current) return;
    if (targetsRes.status === "fulfilled") setTargets(targetsRes.value.data);
    else console.error("Failed to load target data", targetsRes.reason);
    if (dashStatsRes.status === "fulfilled") setOrgDashStats(dashStatsRes.value.data);
    else console.error("Failed to load dashboard stats", dashStatsRes.reason);
    if (fallbacksRes.status === "fulfilled") setProgressFallbacks(fallbacksRes.value.data);
    else console.error("Failed to load progress fallbacks", fallbacksRes.reason);
  }, [baseUrl]);

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
    const handler = () => { fetchTasks(false); fetchTargetData(); };
    socket.on("tasks_refresh", handler);
    return () => socket.off("tasks_refresh", handler);
  }, [socket, fetchTasks, fetchTargetData]);

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
    // Mark all task reminder/due-today notifications as read when the tab opens
    setNotifications((prev) => {
      const unread = prev.filter((n) => TASK_NOTIF_TYPES_FILTER(n) && !n.read && !n.isRead && n._id && !String(n._id).includes("-"));
      unread.forEach((n) => axios.patch(`${baseUrl}/notifications/read/${n._id}`, {}, { headers }).catch(() => {}));
      return prev.map((n) => (TASK_NOTIF_TYPES_FILTER(n) ? { ...n, read: true, isRead: true } : n));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainView]);

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
    if (mainView !== "reasonNotes") return;
    fetchReasonNotes();
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

  const handleReassign = async () => {
    if (!reassignUserId) return toast.error("Select a sales person");
    setReassigning(true);

    // Reassigning from a reason note — resolves that specific note
    if (reassignModal.noteIdx !== undefined) {
      try {
        await axios.post(
          `${baseUrl}/tasks/${reassignModal.taskId}/reason-notes/${reassignModal.noteIdx}/reassign`,
          { reassignToUserId: reassignUserId, adminNote: reassignNote, extendDueDate: reassignExtendDate || undefined },
          { headers }
        );
        toast.success("Sales person notified");
        setReassignModal(null);
        setReassignUserId("");
        setReassignNote("");
        setReassignExtendDate("");
        fetchReasonNotes();
        fetchTasks(false);
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to reassign");
      } finally {
        setReassigning(false);
      }
      return;
    }

    try {
      const { data } = await axios.patch(
        `${baseUrl}/tasks/${reassignModal.taskId}/reassign`,
        { newAssigneeId: reassignUserId, note: reassignNote, extendDueDate: reassignExtendDate || undefined },
        { headers }
      );
      toast.success("Task reassigned — sales person notified");
      setTasks((prev) => prev.map((t) => (t._id === data?.data?._id ? data.data : t)));
      // Optimistically flip the Reassign button on this task's notifications
      const newOwner = salesUsers.find((u) => u._id === reassignUserId);
      setNotifications((prev) =>
        prev.map((x) =>
          x.type === "task" && String(x.meta?.taskId) === String(reassignModal.taskId)
            ? { ...x, meta: { ...x.meta, resolved: true, resolvedToName: `${newOwner?.firstName || ""} ${newOwner?.lastName || ""}`.trim() } }
            : x
        )
      );
      setReassignModal(null);
      setReassignUserId("");
      setReassignNote("");
      setReassignExtendDate("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reassign");
    } finally {
      setReassigning(false);
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
          <h1 className="text-xl font-bold text-gray-800">Task Management</h1>
          <p className="text-gray-400 text-sm mt-0.5">Assign and track tasks for your sales team</p>
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
          <h2 className="text-sm font-semibold text-gray-600 mb-3">Monthly Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
            <StatCard label="Assigned Leads"   value={orgDashStats.monthly.totalLeads}       icon={<Users size={16} />}       color="text-blue-600"   bg="bg-blue-50 border border-blue-100" />
            <StatCard label="Assigned Deals"   value={orgDashStats.monthly.totalDeals}       icon={<Briefcase size={16} />}   color="text-sky-600"    bg="bg-sky-50 border border-sky-100" />
            <StatCard label="Leads Converted"  value={orgDashStats.monthly.convertedLeads}   icon={<CheckCircle size={16} />} color="text-green-600"  bg="bg-green-50 border border-green-100" />
            <StatCard label="Lead → Deal Rate" value={`${orgDashStats.monthly.leadToDealRate}%`} icon={<TrendingUp size={16} />}  color="text-purple-600" bg="bg-purple-50 border border-purple-100" />
            <StatCard label="Won Deals"        value={orgDashStats.monthly.wonDeals}         icon={<Award size={16} />}       color="text-indigo-600" bg="bg-indigo-50 border border-indigo-100" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Monthly Calls"    value={orgDashStats.monthly.calls}    icon={<Phone size={16} />}    color="text-orange-600" bg="bg-orange-50 border border-orange-100" />
            <StatCard label="Monthly Meetings" value={orgDashStats.monthly.meetings} icon={<Activity size={16} />} color="text-teal-600"   bg="bg-teal-50 border border-teal-100" />
            <StatCard label="Weekly Calls"     value={orgDashStats.weekly.calls}     icon={<Phone size={16} />}    color="text-cyan-600"   bg="bg-cyan-50 border border-cyan-100" />
            <StatCard label="Weekly Meetings"  value={orgDashStats.weekly.meetings}  icon={<Calendar size={16} />} color="text-pink-600"   bg="bg-pink-50 border border-pink-100" />
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
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
            mainView === "notifications"
              ? "bg-amber-500 text-white border-amber-500 shadow-sm"
              : "bg-white text-amber-600 border-amber-300 hover:bg-amber-50"
          }`}
        >
          <Bell size={13} /> Notifications & Reminders
          {unreadTaskNotifCount > 0 && (
            <span className="ml-1 bg-red-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 min-w-[16px] text-center leading-none">
              {unreadTaskNotifCount}
            </span>
          )}
        </button>

        {/* Reason Notes tab */}
        <button
          onClick={() => setMainView(mainView === "reasonNotes" ? "tasks" : "reasonNotes")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
            mainView === "reasonNotes"
              ? "bg-rose-500 text-white border-rose-500 shadow-sm"
              : "bg-white text-rose-600 border-rose-300 hover:bg-rose-50"
          }`}
        >
          <Flag size={13} /> Reason Notes
          {reasonNotes.filter((n) => n.status === "pending").length > 0 && (
            <span className="ml-1 bg-red-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 min-w-[16px] text-center leading-none">
              {reasonNotes.filter((n) => n.status === "pending").length}
            </span>
          )}
        </button>

        {/* Admin Completed tab */}
        <button
          onClick={() => setMainView(mainView === "adminActivity" ? "tasks" : "adminActivity")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
            mainView === "adminActivity"
              ? "bg-indigo-500 text-white border-indigo-500 shadow-sm"
              : "bg-white text-indigo-600 border-indigo-300 hover:bg-indigo-50"
          }`}
        >
          <Trophy size={13} /> Admin Completed
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
        </div>
      </div>

      {/* ── NOTIFICATIONS & REMINDERS VIEW ── */}
      {mainView === "notifications" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <Bell size={16} className="text-amber-500" /> Notifications & Reminders
            </h2>
            <button onClick={fetchNotifications} className="text-xs text-[#008ecc] hover:underline font-medium">
              Refresh
            </button>
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
                  onClick={() => handleMarkNotifRead(n)}
                  className={`border ${accent ? "border-l-4" : ""} rounded-2xl px-4 py-3.5 flex items-start gap-3 cursor-pointer ${typeStyle} ${isUnread ? "shadow-sm" : "opacity-80"}`}
                >
                  {icon}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800">{n.title}</p>
                    <p className="text-[12px] text-gray-700 font-medium mt-0.5 leading-relaxed whitespace-pre-line">{n.message}</p>
                    {n.meta?.linkedName && (
                      <div className="mt-2 bg-white/70 border border-gray-100 rounded-lg px-2.5 py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide flex items-center gap-1">
                          {n.meta.linkedType === "deal" ? <Briefcase size={10} /> : <FileText size={10} />}
                          {n.meta.linkedType === "deal" ? "Deal" : "Lead"}: {n.meta.linkedName}
                        </span>
                        {n.meta.linkedCompany && <span className="text-[11px] text-gray-500 flex items-center gap-1"><Building2 size={9} />{n.meta.linkedCompany}</span>}
                        {n.meta.linkedPhone && <span className="text-[11px] text-gray-500 flex items-center gap-1"><Phone size={9} />{n.meta.linkedPhone}</span>}
                        {n.meta.linkedEmail && <span className="text-[11px] text-gray-500 flex items-center gap-1 truncate"><Mail size={9} />{n.meta.linkedEmail}</span>}
                      </div>
                    )}
                    <p className="text-[10px] text-gray-500 mt-1.5 flex items-center gap-1"><Clock size={9} />{fmt(n.createdAt)} {fmtTime(n.createdAt)}</p>
                    {n.meta?.taskId && n.meta?.needsReassign && (
                      n.meta?.resolved ? (
                        <div className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold w-fit">
                          <Check size={12} /> Reassigned to {n.meta.resolvedToName || "sales person"}
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkNotifRead(n);
                            setReassignModal({ taskId: n.meta.taskId, itemName: n.meta.salesName || "this task" });
                            setReassignUserId(""); setReassignNote(""); setReassignExtendDate("");
                          }}
                          className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-[#008ecc] text-white rounded-lg text-xs font-semibold hover:bg-[#0077aa]"
                        >
                          <ArrowRightLeft size={12} /> Reassign
                        </button>
                      )
                    )}
                  </div>
                  {isUnread && <span className="w-2 h-2 rounded-full bg-[#008ecc] shrink-0 mt-1.5" />}
                  <button
                    onClick={(e) => handleDismissNotif(e, n)}
                    className="p-1 rounded hover:bg-black/5 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                    title="Remove notification"
                  >
                    <X size={14} />
                  </button>
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
              <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
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
                            {isPending && <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded-full">Pending Admin Review</span>}
                            {!isPending && !isReactivated && <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Check size={8} /> Resolved</span>}
                            {isReactivated && <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Check size={8} /> Kept with same person</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isPending && (
                            <button onClick={() => {
                              setReassignModal({ taskId: n.taskId, noteIdx: n.noteIdx, itemName: n.taskTitle });
                              setReassignUserId(""); setReassignNote(""); setReassignExtendDate("");
                            }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#008ecc] text-white rounded-lg text-xs font-semibold hover:bg-[#0077aa]">
                              <ArrowRightLeft size={12} /> Reassign
                            </button>
                          )}
                          <button onClick={() => setNoteDeleteConfirm({ taskId: n.taskId, noteIdx: n.noteIdx, isBulk: false, count: 1 })}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete note">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div className="mx-4 mb-3 bg-white rounded-xl border border-gray-100 px-3 py-2.5 space-y-2">
                        <p className="text-[12px] text-gray-800 font-medium leading-relaxed border-l-2 border-rose-300 pl-2.5">"{n.note}"</p>

                        {(leadName || dealName) && (
                          <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 border-t border-gray-100">
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide flex items-center gap-1">
                              {dealName ? <Briefcase size={10} /> : <FileText size={10} />}
                              {dealName ? "Deal" : "Lead"}: {leadName || dealName}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-3 flex-wrap pt-1 border-t border-gray-100">
                          <p className="text-[11px] text-gray-600 font-medium flex items-center gap-1">
                            <Users size={10} className="text-gray-400" />
                            {n.assignedTo?.firstName} {n.assignedTo?.lastName}
                          </p>
                          <p className="text-[11px] text-gray-500 flex items-center gap-1"><Clock size={9} />{fmt(n.addedAt)} {fmtTime(n.addedAt)}</p>
                        </div>
                        {(n.status === "resolved" || isReactivated) && n.reassignedTo && (
                          <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
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
            typeLabel: "Deal Closed Won", typeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
            name: d.dealName || d.dealTitle, company: d.companyName, salesperson: d.assignedTo ? `${d.assignedTo.firstName} ${d.assignedTo.lastName}` : "—",
            date: d.wonAt, value: d.value ? `${d.currency || "INR"} ${d.value}` : null,
          })),
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        return (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Trophy size={16} className="text-indigo-500" /> Admin Completed Leads &amp; Deals
              </h2>
              <button onClick={fetchAdminActivity} className="text-xs text-[#008ecc] hover:underline font-medium">Refresh</button>
            </div>

            {/* Summary counts */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
                <p className="text-[11px] text-purple-600 font-semibold">Leads Converted by Admin</p>
                <p className="text-xl font-bold text-purple-700">{leads.length}</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                <p className="text-[11px] text-emerald-600 font-semibold">Deals Won by Admin</p>
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
                    <div key={i} className={`text-[11px] font-bold text-gray-600 uppercase tracking-wide ${i === 5 ? "text-right" : ""}`}>{h}</div>
                  ))}
                </div>
                {rows.map((r) => (
                  <div key={r.key} className="grid grid-cols-[1.6fr_1.6fr_1.4fr_1.4fr_1.6fr_0.8fr] px-4 py-3 border-b border-gray-100 last:border-0 items-center hover:bg-gray-50/70">
                    <div><span className={`text-[10px] px-2 py-0.5 rounded-md font-medium border ${r.typeClass}`}>{r.typeLabel}</span></div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{r.name}</p>
                      {r.value && <p className="text-[11px] font-bold text-emerald-600">{r.value}</p>}
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              targets={targets}
              progressFallbacks={progressFallbacks}
              onEdit={(t) => { setEditTask(t); setModalOpen(true); }}
              onDelete={(t) => setDeleteTarget(t)}
              baseUrl={baseUrl}
              headers={headers}
              onRefresh={() => { fetchTasks(false); fetchTargetData(); }}
            />
          ))}
        </div>
      ) : (
        <TaskTableView
          tasks={filtered}
          onEdit={(t) => { setEditTask(t); setModalOpen(true); }}
          onDelete={(t) => setDeleteTarget(t)}
        />
      ))}

      {/* ── REASSIGN MODAL ── */}
      {reassignModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <ArrowRightLeft size={16} className="text-[#008ecc]" /> Reassign Task
              </h3>
              <button onClick={() => { setReassignModal(null); setReassignExtendDate(""); }} className="p-1 hover:bg-gray-100 rounded-full">
                <X size={16} />
              </button>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5">
              <p className="text-xs text-gray-600 font-medium">
                Reassigning <span className="font-bold text-gray-900">{reassignModal.itemName}</span>'s task.
                {" "}You can assign it to the same person (extends the due date) or to some other sales person (transfers it to them).
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Same Person or Some Other Sales Person *</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]/30 focus:border-[#008ecc]"
                value={reassignUserId}
                onChange={(e) => setReassignUserId(e.target.value)}
              >
                <option value="">Select sales person</option>
                {salesUsers.map((u) => <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Extend Due Date <span className="text-gray-400 font-normal text-xs">(optional — gives new person more time)</span>
              </label>
              <input
                type="date"
                min={todayISO()}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]/30 focus:border-[#008ecc]"
                value={reassignExtendDate}
                onChange={(e) => setReassignExtendDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason / Note to Sales Person <span className="text-gray-400 font-normal text-xs">(optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="e.g. This task needs immediate attention..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]/30 focus:border-[#008ecc] resize-none"
                value={reassignNote}
                onChange={(e) => setReassignNote(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => { setReassignModal(null); setReassignExtendDate(""); }} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleReassign}
                disabled={reassigning || !reassignUserId}
                className="px-5 py-2 bg-[#008ecc] text-white rounded-lg text-sm font-semibold hover:bg-[#0077aa] disabled:opacity-60"
              >
                {reassigning ? "Reassigning..." : "Reassign & Notify"}
              </button>
            </div>
          </div>
        </div>
      )}

      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => fetchTasks(false)}
        salesUsers={salesUsers}
        editTask={editTask}
        baseUrl={baseUrl}
        headers={headers}
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
    </div>
  );
}
