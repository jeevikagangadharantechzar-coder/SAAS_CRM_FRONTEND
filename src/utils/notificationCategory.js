// Mirrors backend/utils/notificationCategory.js — keeps category labels/order
// consistent with how the server groups notification `type` values.

export const CATEGORY_LABELS = {
  all: "All",
  unread: "Unread",
  task: "Tasks",
  target: "Targets",
  lead: "Leads",
  deal: "Deals",
  followup: "Follow-ups",
  scheduled_email: "Scheduled Emails",
  other: "Other",
};

const TYPE_TO_CATEGORY = {
  task: "task",

  target: "target",
  target_reminder: "target",
  target_due_today: "target",
  target_expired: "target",
  target_reassign: "target",
  reason_note: "target",

  lead: "lead",

  deal: "deal",
  proposal: "deal",

  followup: "followup",

  scheduled_email: "scheduled_email",
};

// Fallback only — the backend already attaches `category` to every notification
// it returns from GET /notifications. Used if a notification is missing it.
export const getNotificationCategory = (notif) =>
  notif?.category || TYPE_TO_CATEGORY[notif?.type] || "other";
