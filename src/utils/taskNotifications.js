// Single source of truth for Task Management's own notifications — which
// notification.meta flags belong to this family, and how each one should
// look (badge text + card accent color). Every place that renders/filters
// these (Task Management, Assigned Tasks, the header bell dropdown, and the
// full Notifications page) imports from here instead of keeping its own
// hand-copied list — that drift (one file's list missing a flag another file
// has) is what caused notifications to mismatch between files.
//
// Strict boundary: Task Management notifications (type "task") and Target
// Management notifications (type "target"/"target_reminder"/etc., handled by
// services/targetNotificationService.js on the backend and MyTargets.jsx's
// own TARGET_NOTIF_TYPES on the frontend) are two completely separate,
// non-overlapping families — a notification never shows in both places.

// Every meta flag a "task"-typed notification created by the backend
// (services/taskNotificationService.js) can carry.
//
// "leadAssigned"/"dealAssigned" are deliberately NOT included — those fire
// from leads.controller.js/deals.controller.js the moment Admin creates and
// assigns a brand-new lead/deal, before any Task exists at all, so they
// don't belong in the Task tab (they still show in the general Notifications
// page/bell dropdown, which isn't filtered by this list).
const TASK_META_FLAGS = [
  "taskReminder", "taskDueToday", "taskApproved", "taskAssigned", "taskCompleted",
  "taskCompletedBySelf", "taskUpdated", "taskNoteAdded", "taskDealStageUpdated",
  "leadStatusChanged", "dealClosedWon", "leadConverted", "leadOrDealEdited",
  // Reassignment outcomes for the task itself (reassignTask / reassignReasonNote
  // in task.controller.js) — kept-with-same-person and taken-away-from-you.
  // Previously these notifications carried no recognized flag at all (or a
  // bare "removed" flag that wasn't in this list), so isTaskManagementNotif
  // silently dropped them — the task got reassigned but the notification
  // never appeared in Notifications & Reminders. That's the "sometimes shows,
  // sometimes doesn't" flakiness for task reassignment.
  "taskReactivated", "taskRemoved",
];

// True for any notification that belongs in Task Management / Assigned
// Tasks's own "Notifications & Reminders" tab.
export function isTaskManagementNotif(n) {
  return n.type === "task" && TASK_META_FLAGS.some((flag) => n.meta?.[flag]);
}

// Everything a task-related notifications tab should show — just Task
// Management's own flags. "target_reassign" is Target Management's own
// reassignment notification type (emitted exclusively by target.controller.js)
// and must never surface here — that was a real cross-bleed bug, not an
// intentional share. Task's own reassignment outcomes (taskReactivated/
// taskRemoved) are already typed "task" and already covered by
// isTaskManagementNotif via TASK_META_FLAGS above.
// "reason_note" is deliberately excluded here: that type already has its own
// dedicated "Reason Notes" tab (fed straight from reasonNotes, not this
// notifications feed), so admitting it here would just show the same report
// twice — once as a plain unactionable notification card, once as the real
// actionable row with the Reassign button. Restricted to Reason Notes only.
export function isTaskTabNotif(n) {
  return isTaskManagementNotif(n);
}

// Badge chip shown at the top of a notification card/row — emoji + label +
// Tailwind classes. Returns null when no badge applies (plain notification).
export function getNotificationBadge(n) {
  if (n.meta?.dealCompletedBySelf || n.meta?.taskCompletedBySelf) {
    return { emoji: "✅", label: n.meta?.dealCompletedBySelf ? "Deal Completed" : "Task Completed", className: "bg-emerald-100 text-emerald-700 border-emerald-200" };
  }
  if (n.meta?.dealCompletedByAdmin) {
    return { emoji: "🤝", label: "Admin Completed This Deal", className: "bg-blue-100 text-blue-700 border-blue-200" };
  }
  if (n.meta?.taskApproved) return { emoji: "✓", label: "Task Approved", className: "bg-emerald-100 text-emerald-700 border-emerald-200" };
  if (n.meta?.taskAssigned || n.meta?.dealAssigned || n.meta?.leadAssigned) return { emoji: "📋", label: "New Assignment", className: "bg-blue-100 text-blue-700 border-blue-200" };
  if (n.meta?.taskCompleted) return { emoji: "✔", label: "Task Completed", className: "bg-amber-100 text-amber-700 border-amber-200" };
  if (n.meta?.leadConverted) return { emoji: "🔄", label: "Lead Converted", className: "bg-purple-100 text-purple-700 border-purple-200" };
  if (n.meta?.leadOrDealEdited) return { emoji: "✏️", label: "Updated by Admin", className: "bg-gray-100 text-gray-600 border-gray-200" };
  return null;
}

// Card/row accent — a left border + tinted background for the two
// "celebration" notification types (green for the sales person completing it
// themselves, blue for Admin completing it on their behalf). Empty string
// falls back to the caller's own read/unread styling.
export function getNotificationAccentClass(n) {
  if (n.meta?.dealCompletedBySelf || n.meta?.taskCompletedBySelf) return "border-l-emerald-400 bg-emerald-50/60";
  if (n.meta?.dealCompletedByAdmin) return "border-l-blue-400 bg-blue-50/50";
  return "";
}
