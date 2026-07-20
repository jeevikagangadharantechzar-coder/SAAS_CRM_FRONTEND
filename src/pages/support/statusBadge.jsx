import React from "react";

export const STATUS_STYLES = {
  Pending: "bg-gray-100 text-gray-700",
  "In Progress": "bg-blue-100 text-blue-700",
  Closed: "bg-green-100 text-green-700",
};

export const PRIORITY_STYLES = {
  Low: "bg-slate-100 text-slate-600",
  Medium: "bg-blue-100 text-blue-700",
  High: "bg-amber-100 text-amber-700",
  Urgent: "bg-red-100 text-red-700",
};

const StatusBadge = ({ status }) => (
  <span
    className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${
      STATUS_STYLES[status] || STATUS_STYLES.Pending
    }`}
  >
    {status}
  </span>
);

export const PriorityBadge = ({ priority }) => (
  <span
    className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${
      PRIORITY_STYLES[priority] || PRIORITY_STYLES.Medium
    }`}
  >
    {priority}
  </span>
);

export default StatusBadge;
