import React, { useState } from "react";
import { Eye, Edit, Trash2, Users, ChevronDown, ChevronUp, Check } from "lucide-react";

import PlanBadge from "./PlanBadge";

const getCurrencySymbol = (currency) => {
  switch (currency) {
    case "INR": return "₹";
    case "EUR": return "€";
    case "GBP": return "£";
    default:    return "$";
  }
};

const TIER_LABELS = {
  monthly:     "Monthly",
  half_yearly: "Half Year",
  yearly:      "Yearly",
};

const FEATURE_LABELS = {
  dashboard:          "Dashboard",
  leads:              "Leads",
  create_lead:        "Create Lead",
  deals_all:          "Deals",
  create_deal:        "Create Deal",
  deals_pipeline:     "Pipeline View",
  invoices:           "Invoices",
  proposal:           "Proposal",
  users_roles:        "Users & Roles",
  admin_access:       "Admin Access",
  email_chat:         "Email Chat",
  email_campaigns:    "Email Campaigns",
  whatsapp_chat:      "WhatsApp Chat",
  analytics:          "Analytics",
  settings:           "Settings",
  streak_leaderboard: "Streak Leaderboard",
  assigned_tasks:     "Assigned Tasks",
  task_management:    "Task Management",
  target_management:  "Target Management",
  meetings:           "Meetings",
  google_meet_sync:   "Google Meet",
  zoom_meetings:      "Zoom Meetings",
  messages:           "Messages",
  chatbot:            "AI Chatbot",
};

export const PlanCard = ({ plan, onView, onEdit, onDelete }) => {
  const [featuresOpen, setFeaturesOpen] = useState(false);

  const {
    plan_name,
    plan_code,
    plan_type,
    status,
    description,
    price_monthly,
    price_yearly,
    currency,
    trial_days,
    max_users_per_tenant,
    is_recommended,
    tiers = [],
    features = {},
  } = plan;

  const symbol = getCurrencySymbol(currency);
  const hasTiers = tiers.length > 0;

  const enabledFeatures = Object.entries(features)
    .filter(([, v]) => v === true)
    .map(([k]) => k);

  const PREVIEW_LIMIT = 6;

  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 flex flex-col justify-between hover:shadow-lg transition-all duration-200 relative group overflow-hidden">
      {/* Recommended Ribbon */}
      {is_recommended && (
        <div className="absolute top-0 right-0">
          <div className="bg-amber-500 text-white font-bold text-[9px] uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-sm border-l border-b border-amber-600/30">
            Recommended
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Header */}
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-bold text-slate-800 tracking-tight truncate max-w-[70%]">
              {plan_name}
            </h3>
          </div>
          <p className="text-slate-400 font-mono text-[10px] mt-0.5">{plan_code}</p>
        </div>

        {/* Badges */}
        <div className="flex items-center space-x-2">
          <PlanBadge type="plan_type" value={plan_type} />
          <PlanBadge type="status" value={status} />
        </div>

        {/* Description */}
        {description ? (
          <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed min-h-[32px]">
            {description}
          </p>
        ) : (
          <p className="text-slate-400 text-xs italic min-h-[32px]">No description provided.</p>
        )}

        {/* Pricing */}
        <div className="border-t border-slate-100 pt-4 pb-2">
          {plan_type.toLowerCase() === "free" ? (
            <div>
              <span className="text-2xl font-black text-slate-800">Free</span>
              <p className="text-slate-400 text-[11px] font-medium mt-1">No billing required</p>
            </div>
          ) : hasTiers ? (
            <div className="space-y-1.5">
              {tiers.map((tier) => (
                <div key={tier.billing_cycle} className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">
                    {TIER_LABELS[tier.billing_cycle] || tier.billing_cycle}
                  </span>
                  <span className="text-sm font-black text-slate-800">
                    {symbol}{parseFloat(tier.price || 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              <div>
                <span className="text-2xl font-black text-slate-800">
                  {symbol}{parseFloat(price_monthly || 0).toFixed(2)}
                </span>
                <span className="text-slate-400 text-xs font-semibold">/mo</span>
              </div>
              {price_yearly > 0 && (
                <div className="text-slate-500 text-xs font-medium">
                  {symbol}{parseFloat(price_yearly || 0).toFixed(2)}
                  <span className="text-slate-400 text-[10px]">/yr</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Limits */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2 text-xs text-slate-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-slate-500">
              <Users size={14} />
              <span>Max Users/Tenant</span>
            </div>
            <span className="font-semibold text-slate-800">
              {max_users_per_tenant === 0 ? "Unlimited" : max_users_per_tenant}
            </span>
          </div>
          {trial_days > 0 && (
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
              <span className="text-slate-500">Trial Period</span>
              <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 text-[10px]">
                {trial_days} days
              </span>
            </div>
          )}
        </div>

        {/* Features */}
        {enabledFeatures.length > 0 && (
          <div className="border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setFeaturesOpen((o) => !o)}
              className="flex items-center justify-between w-full text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 cursor-pointer hover:text-slate-600 transition-colors"
            >
              <span>Features ({enabledFeatures.length})</span>
              {featuresOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {!featuresOpen && (
              <div className="flex flex-wrap gap-1">
                {enabledFeatures.slice(0, PREVIEW_LIMIT).map((key) => (
                  <span
                    key={key}
                    className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full font-medium"
                  >
                    {FEATURE_LABELS[key] || key}
                  </span>
                ))}
                {enabledFeatures.length > PREVIEW_LIMIT && (
                  <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-full font-medium">
                    +{enabledFeatures.length - PREVIEW_LIMIT} more
                  </span>
                )}
              </div>
            )}

            {featuresOpen && (
              <div className="grid grid-cols-2 gap-1">
                {enabledFeatures.map((key) => (
                  <div key={key} className="flex items-center gap-1.5 text-[10px] text-slate-700">
                    <Check size={10} className="text-emerald-500 shrink-0" />
                    <span className="truncate">{FEATURE_LABELS[key] || key}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center gap-2 pt-5 border-t border-slate-100 mt-5">
        <button
          onClick={() => onView(plan._id)}
          className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
          title="View Details"
        >
          <Eye size={13} />
          <span>View</span>
        </button>

        <button
          onClick={() => onEdit(plan._id)}
          className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
          title="Edit Plan"
        >
          <Edit size={13} />
          <span>Edit</span>
        </button>

        <button
          onClick={() => onDelete(plan)}
          className="px-2.5 py-2 border border-rose-100 rounded-xl text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-all cursor-pointer flex items-center justify-center"
          title="Delete Plan"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
};

export default PlanCard;
