import React from "react";

export const PlanBadge = ({ type, value }) => {
  if (type === "plan_type") {
    const typeLower = (value || "").toLowerCase();
    let classes = "bg-slate-100 text-slate-700 border-slate-200";
    if (typeLower === "free") {
      classes = "bg-emerald-50 text-emerald-700 border-emerald-200";
    } else if (typeLower === "paid") {
      classes = "bg-blue-50 text-blue-700 border-blue-200";
    } else if (typeLower === "trial") {
      classes = "bg-amber-50 text-amber-700 border-amber-200";
    } else if (typeLower === "enterprise") {
      classes = "bg-purple-50 text-purple-700 border-purple-200";
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border uppercase tracking-wider ${classes}`}>
        {value || ""}
      </span>
    );
  }

  if (type === "status") {
    const statusLower = (value || "").toLowerCase();
    let dotClass = "bg-gray-400 animate-pulse";
    let textClass = "text-slate-600 bg-slate-50 border-slate-200";
    if (statusLower === "active") {
      dotClass = "bg-emerald-500 animate-pulse";
      textClass = "text-emerald-700 bg-emerald-50/50 border-emerald-200";
    } else if (statusLower === "inactive") {
      dotClass = "bg-slate-400";
      textClass = "text-slate-500 bg-slate-50 border-slate-200";
    } else if (statusLower === "archived") {
      dotClass = "bg-rose-500";
      textClass = "text-rose-700 bg-rose-50 border-rose-200";
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${textClass}`}>
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotClass}`} />
        {value ? value.charAt(0).toUpperCase() + value.slice(1) : ""}
      </span>
    );
  }

  return null;
};

export default PlanBadge;
