import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Loader2,
  AlertTriangle,
  HelpCircle,
  LayoutGrid,
  LayoutDashboard,
  Users,
  UserPlus,
  Briefcase,
  PlusCircle,
  GitBranch,
  FileText,
  Receipt,
  ClipboardEdit,
  MessageSquare,
  Mail,
  Send,
  MessageCircle,
  BarChart3,
  PieChart,
  Trophy,
  ListTodo,
  ClipboardList,
  Target,
  CheckSquare,
  ShieldCheck,
  Shield,
  Lock,
  Settings as SettingsIcon,
  Sparkles,
  Calendar,
  Video,
  Bot,
  Link2,
  Facebook,
  Linkedin,
  Webhook,
  Globe,
  ShieldAlert,
  MapPin,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const DEFAULT_FEATURES = {
  dashboard: true,
  leads: true,
  create_lead: true,
  deals_all: true,
  create_deal: true,
  deals_pipeline: true,
  invoices: true,
  proposal: true,
  documents: true,
  users_roles: true,
  admin_access: true,
  email_chat: true,
  email_campaigns: true,
  whatsapp_chat: true,
  analytics: true,
  settings: true,
  streak_leaderboard: true,
  assigned_tasks: true,
  task_management: true,
  target_management: true,
  meetings: true,
  google_meet_sync: true,
  zoom_meetings: true,
  schedule_view: true,
  messages: true,
  chatbot: true,
  integration_facebook: true,
  integration_linkedin: true,
  integration_justdial: true,
  integration_indiamart: true,
  integration_99acres: true,
  integration_sulekha: true,
  live_tracking: true,
  device_login_requests: true,
};

const FEATURE_GROUPS = [
  {
    title: "Core Modules",
    icon: LayoutGrid,
    features: [
      { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { key: "leads", label: "Leads", icon: Users },
      { key: "create_lead", label: "Create Lead", icon: UserPlus },
      { key: "deals_all", label: "Deals", icon: Briefcase },
      { key: "create_deal", label: "Create Deal", icon: PlusCircle },
      { key: "deals_pipeline", label: "Pipeline View", icon: GitBranch },
    ],
  },
  {
    title: "Documents",
    icon: FileText,
    features: [
      { key: "invoices", label: "Invoices", icon: Receipt },
      { key: "proposal", label: "Proposal", icon: ClipboardEdit },
      { key: "documents", label: "Document Center", icon: FileText },
    ],
  },
  {
    title: "Communication",
    icon: MessageSquare,
    features: [
      { key: "email_chat", label: "Email Chat", icon: Mail },
      { key: "email_campaigns", label: "Email Campaigns", icon: Send },
      { key: "whatsapp_chat", label: "WhatsApp Chat", icon: MessageCircle },
      { key: "messages", label: "Internal Messages", icon: MessageSquare },
      { key: "chatbot", label: "AI Chatbot Assistant", icon: Bot },
    ],
  },
  {
    title: "Reports & Engagement",
    icon: BarChart3,
    features: [
      { key: "analytics", label: "Analytics", icon: PieChart },
      { key: "streak_leaderboard", label: "Streak Leaderboard", icon: Trophy },
    ],
  },
  {
    title: "Tasks & Targets",
    icon: ListTodo,
    features: [
      { key: "task_management", label: "Task Management", icon: ClipboardList },
      { key: "target_management", label: "Target Management", icon: Target },
      { key: "assigned_tasks", label: "Assigned Tasks", icon: CheckSquare },
    ],
  },
  {
    title: "Meetings",
    icon: Calendar,
    features: [
      { key: "meetings", label: "Meetings Scheduler", icon: Calendar },
      { key: "google_meet_sync", label: "Google Meet Sync", icon: Video },
      { key: "zoom_meetings", label: "Zoom Meetings", icon: Video },
      { key: "schedule_view", label: "Calendar", icon: Calendar },
    ],
  },
  {
    title: "Lead Source Integrations",
    icon: Link2,
    features: [
      { key: "integration_facebook", label: "Facebook & Instagram", icon: Facebook },
      { key: "integration_linkedin", label: "LinkedIn", icon: Linkedin },
      { key: "integration_justdial", label: "Justdial", icon: Webhook },
      { key: "integration_indiamart", label: "IndiaMART", icon: Globe },
      { key: "integration_99acres", label: "99acres", icon: Webhook },
      { key: "integration_sulekha", label: "Sulekha", icon: Webhook },
    ],
  },
  {
    title: "Administration",
    icon: ShieldCheck,
    features: [
      { key: "users_roles", label: "Users & Roles", icon: Shield },
      { key: "admin_access", label: "Admin Access", icon: Lock },
      { key: "settings", label: "Settings", icon: SettingsIcon },
    ],
  },
  {
    title: "Security & Tracking",
    icon: ShieldAlert,
    features: [
      { key: "device_login_requests", label: "Device Login Requests", icon: ShieldAlert },
      { key: "live_tracking", label: "Live Location Tracking", icon: MapPin },
    ],
  },
];

const TOTAL_FEATURE_COUNT = Object.keys(DEFAULT_FEATURES).length;

const DEFAULT_TIERS = [
  { billing_cycle: "monthly",     label: "Monthly",   price: "", grace_days: "", duration_months: 1,  enabled: false },
  { billing_cycle: "half_yearly", label: "Half Year", price: "", grace_days: "", duration_months: 6,  enabled: false },
  { billing_cycle: "yearly",      label: "Yearly",    price: "", grace_days: "", duration_months: 12, enabled: false },
];

function buildInitialTiers(savedTiers) {
  if (!savedTiers || savedTiers.length === 0) return DEFAULT_TIERS;
  const map = {};
  savedTiers.forEach((t) => { map[t.billing_cycle] = t; });
  return DEFAULT_TIERS.map((d) =>
    map[d.billing_cycle]
      ? {
          ...d,
          price:          String(map[d.billing_cycle].price ?? ""),
          grace_days:     String(map[d.billing_cycle].grace_days ?? ""),
          duration_months: map[d.billing_cycle].duration_months ?? d.duration_months,
          enabled: true,
        }
      : d
  );
}

export const PlanForm = ({
  initialData,
  onSubmit,
  submitting,
  isEditMode = false,
  isCodeDisabled = false,
  hasRecommendedPlan = false,
}) => {
  const navigate = useNavigate();

  const [tiers, setTiers] = React.useState(() => buildInitialTiers(initialData?.tiers));

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, dirtyFields },
  } = useForm({
    defaultValues: {
      plan_name: "",
      plan_code: "",
      plan_type: "paid",
      status: "active",
      description: "",
      price_monthly: 0,
      price_yearly: 0,
      currency: "USD",
      billing_cycle: "monthly",
      trial_days: 0,
      max_users_per_tenant: 0,
      is_visible: true,
      is_recommended: false,
      sort_order: 1,
      features: DEFAULT_FEATURES,
      ...initialData,
    },
  });

  const updateTier = (billing_cycle, field, value) => {
    setTiers((prev) =>
      prev.map((t) => (t.billing_cycle === billing_cycle ? { ...t, [field]: value } : t))
    );
  };

  const planName = watch("plan_name");
  const planFeatures = watch("features") || {};
  const allFeaturesSelected = Object.keys(DEFAULT_FEATURES).every((key) => planFeatures[key]);
  const selectedFeatureCount = Object.keys(DEFAULT_FEATURES).filter((key) => planFeatures[key]).length;

  const handleSelectAllFeatures = () => {
    const nextValue = !allFeaturesSelected;
    Object.keys(DEFAULT_FEATURES).forEach((key) => {
      setValue(`features.${key}`, nextValue, { shouldValidate: true, shouldDirty: true });
    });
  };
  const planType = watch("plan_type");
  const isRecommended = watch("is_recommended");
  const planCode = watch("plan_code");

  // Auto-generate plan code from plan name if not manual and not edit mode
  useEffect(() => {
    if (planName && !dirtyFields.plan_code && !isEditMode) {
      const generated = planName
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");
      setValue("plan_code", generated, { shouldValidate: true });
    }
  }, [planName, dirtyFields.plan_code, setValue, isEditMode]);

  // Lock Max Users to Unlimited (0) for Enterprise plan
  useEffect(() => {
    if (planType === "enterprise") {
      setValue("max_users_per_tenant", 0, { shouldValidate: true });
    }
  }, [planType, setValue]);

  const handleFormSubmit = (data) => {
    const enabledTiers = tiers
      .filter((t) => t.enabled)
      .map(({ enabled, label, price, grace_days, ...rest }) => ({
        ...rest,
        price:      Math.max(0, parseFloat(price)  || 0),
        grace_days: Math.max(0, parseInt(grace_days) || 0),
      }));

    const monthlyTier = enabledTiers.find((t) => t.billing_cycle === "monthly");
    const yearlyTier  = enabledTiers.find((t) => t.billing_cycle === "yearly");

    onSubmit({
      ...data,
      tiers: enabledTiers,
      price_monthly: monthlyTier?.price ?? data.price_monthly ?? 0,
      price_yearly:  yearlyTier?.price  ?? data.price_yearly  ?? 0,
      billing_cycle: enabledTiers[0]?.billing_cycle ?? data.billing_cycle ?? "monthly",
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Left Column (2/3 width) - Identity and Pricing */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* SECTION 1 — Plan Identity */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 bg-[#008ecc] text-white flex items-center space-x-2">
            <h3 className="text-md font-bold tracking-tight">SECTION 1 — Plan Identity</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Plan Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pro"
                  {...register("plan_name", {
                    required: "Plan name is required",
                    minLength: { value: 2, message: "Plan name must be at least 2 characters" },
                    maxLength: { value: 100, message: "Plan name cannot exceed 100 characters" },
                  })}
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all shadow-inner ${
                    errors.plan_name ? "border-red-300 focus:ring-red-500" : "border-slate-300"
                  }`}
                />
                {errors.plan_name && (
                  <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.plan_name.message}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Plan Code *
                  </label>
                  {isCodeDisabled && (
                    <span
                      className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center space-x-1 cursor-help"
                      title="Cannot change code while tenants are on this plan"
                    >
                      <HelpCircle size={12} />
                      <span>Locked</span>
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="e.g. plan_pro"
                  disabled={isCodeDisabled}
                  {...register("plan_code", {
                    required: "Plan code is required",
                    pattern: {
                      value: /^[a-z0-9_]+$/,
                      message: "Only lowercase letters, numbers and underscores allowed",
                    },
                  })}
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all font-mono shadow-inner ${
                    isCodeDisabled ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed" : ""
                  } ${errors.plan_code ? "border-red-300 focus:ring-red-500" : "border-slate-300"}`}
                />
                {planCode && !isCodeDisabled && (
                  <p className="text-slate-400 text-[11px] mt-1 font-mono">Live Preview: {planCode}</p>
                )}
                {errors.plan_code && (
                  <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.plan_code.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Plan Type *
                </label>
                <select
                  {...register("plan_type", { required: "Plan type is required" })}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all bg-white"
                >
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
                  <option value="enterprise">Enterprise</option>
                </select>
                {errors.plan_type && (
                  <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.plan_type.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Status
                </label>
                <select
                  {...register("status")}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all bg-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Description
              </label>
              <textarea
                placeholder="Short description for tenants..."
                rows={3}
                {...register("description")}
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all shadow-inner"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2 — Pricing Tiers */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 bg-[#008ecc] text-white flex items-center space-x-2">
            <h3 className="text-md font-bold tracking-tight">SECTION 2 — Pricing Tiers</h3>
          </div>
          <div className="p-6 space-y-4">
            {planType === "free" ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs font-medium">
                Pricing is disabled for Free plans.
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Enable the billing periods this plan supports. Each enabled tier will be available when assigning the plan to a tenant.
                </p>
                <div className="space-y-3">
                  {tiers.map((tier) => {
                    const currSym = watch("currency") === "INR" ? "₹" : watch("currency") === "EUR" ? "€" : watch("currency") === "GBP" ? "£" : "$";
                    return (
                      <div
                        key={tier.billing_cycle}
                        className={`rounded-xl border transition-all ${
                          tier.enabled
                            ? "border-[#008ecc]/30 bg-blue-50/40 ring-1 ring-[#008ecc]/10"
                            : "border-slate-200 bg-slate-50/60"
                        }`}
                      >
                        {/* Row 1: toggle + label + price */}
                        <div className="flex items-center gap-4 px-4 py-3">
                          {/* Enable toggle */}
                          <label className="relative inline-flex items-center shrink-0 cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={tier.enabled}
                              onChange={(e) => updateTier(tier.billing_cycle, "enabled", e.target.checked)}
                            />
                            <span className={`block w-9 h-5 rounded-full transition-colors duration-200 ${tier.enabled ? "bg-[#008ecc]" : "bg-slate-300"}`}>
                              <span className={`block w-4 h-4 mt-0.5 ml-0.5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${tier.enabled ? "translate-x-4" : "translate-x-0"}`} />
                            </span>
                          </label>

                          {/* Label + duration */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold ${tier.enabled ? "text-slate-800" : "text-slate-400"}`}>
                              {tier.label}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {tier.duration_months} {tier.duration_months === 1 ? "month" : "months"} validity
                            </p>
                          </div>

                          {/* Price input */}
                          <div className="flex items-center gap-1.5">
                            <span className={`text-sm font-semibold shrink-0 ${tier.enabled ? "text-slate-500" : "text-slate-300"}`}>
                              {currSym}
                            </span>
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="0"
                              disabled={!tier.enabled}
                              value={tier.price}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (/^\d*\.?\d*$/.test(val)) {
                                  updateTier(tier.billing_cycle, "price", val);
                                }
                              }}
                              onBlur={(e) => {
                                if (e.target.value === "") updateTier(tier.billing_cycle, "price", "0");
                              }}
                              className={`w-28 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all text-right font-mono ${
                                tier.enabled
                                  ? "border-slate-300 bg-white"
                                  : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                              }`}
                            />
                          </div>
                        </div>

                        {/* Row 2: grace days (visible when enabled) */}
                        {tier.enabled && (
                          <div className="flex items-center justify-between px-4 pb-3 pt-0 gap-4">
                            <div className="flex-1">
                              <p className="text-[11px] text-slate-500 font-semibold">Grace Days</p>
                              <p className="text-[10px] text-slate-400">Extra days after plan expires before access is cut off</p>
                            </div>
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder="0"
                              value={tier.grace_days}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (/^\d*$/.test(val)) {
                                  updateTier(tier.billing_cycle, "grace_days", val);
                                }
                              }}
                              onBlur={(e) => {
                                if (e.target.value === "") updateTier(tier.billing_cycle, "grace_days", "0");
                              }}
                              className="w-20 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all text-right font-mono bg-white"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Currency */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Currency
              </label>
              <select
                {...register("currency")}
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all bg-white"
              >
                <option value="USD">USD ($)</option>
                <option value="INR">INR (₹)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4 pt-4">
          <button
            type="button"
            onClick={() => navigate("/superadmin/subscription-plans")}
            className="flex-1 py-3.5 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer text-sm shadow-sm bg-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-3.5 bg-[#008ecc] text-white rounded-xl font-semibold hover:bg-[#007bb0] disabled:opacity-50 transition-all cursor-pointer text-sm shadow-md flex items-center justify-center space-x-2"
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                <span>Saving Plan Details...</span>
              </>
            ) : (
              <span>Save Subscription Plan</span>
            )}
          </button>
        </div>

      </div>

      {/* Right Column (1/3 width) - Limits & Visibility */}
      <div className="space-y-6">
        
        {/* SECTION 3 — Tenant User Limits */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 bg-[#008ecc] text-white flex items-center space-x-2">
            <h3 className="text-md font-bold tracking-tight">SECTION 3 — Limits</h3>
          </div>
          <div className="p-6 space-y-6">
            {planType === "enterprise" ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-650 text-xs font-medium">
                Enterprise plans include unlimited users per tenant, so this field isn't applicable.
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Max Users Per Tenant
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0 = unlimited"
                  {...register("max_users_per_tenant", {
                    min: { value: 0, message: "Value must be 0 or greater" },
                    setValueAs: (v) => Math.max(0, parseInt(v) || 0),
                  })}
                  onKeyDown={(e) => {
                    if (e.key === "-" || e.key === "e" || e.key === ".") e.preventDefault();
                  }}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    setValue("max_users_per_tenant", parseInt(val) || 0, { shouldValidate: true });
                    e.target.value = val;
                  }}
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all shadow-inner ${
                    errors.max_users_per_tenant ? "border-red-300 focus:ring-red-500" : "border-slate-300"
                  }`}
                />
                <p className="text-slate-400 text-[10px] mt-1.5">Enter 0 for unlimited users per tenant database.</p>
                {errors.max_users_per_tenant && (
                  <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.max_users_per_tenant.message}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SECTION 4 — Visibility & Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 bg-[#008ecc] text-white flex items-center space-x-2">
            <h3 className="text-md font-bold tracking-tight">SECTION 4 — Settings</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-4 border-b border-slate-100 pb-4">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="is_visible"
                  {...register("is_visible")}
                  className="w-4 h-4 text-[#008ecc] border-slate-300 rounded focus:ring-[#008ecc] mt-1 cursor-pointer"
                />
                <div>
                  <label htmlFor="is_visible" className="text-xs font-bold text-slate-800 block cursor-pointer uppercase tracking-wider">
                    Visible on pricing page
                  </label>
                  <p className="text-[10px] text-slate-400 mt-0.5">Show this plan on public landing pages.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 pt-2">
                <input
                  type="checkbox"
                  id="is_recommended"
                  {...register("is_recommended")}
                  className="w-4 h-4 text-[#008ecc] border-slate-300 rounded focus:ring-[#008ecc] mt-1 cursor-pointer"
                />
                <div>
                  <label htmlFor="is_recommended" className="text-xs font-bold text-slate-800 block cursor-pointer uppercase tracking-wider">
                    Mark Recommended
                  </label>
                  <p className="text-[10px] text-slate-400 mt-0.5">Highlights this plan with a ribbon badge.</p>
                  {isRecommended && hasRecommendedPlan && (
                    <div className="mt-2 text-amber-600 text-[10px] font-semibold flex items-start space-x-1 bg-amber-50 p-2 rounded border border-amber-100">
                      <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                      <span>Note: Another plan is recommended. Saving will override.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Sort Order
              </label>
              <input
                type="number"
                placeholder="e.g. 1"
                {...register("sort_order", {
                  required: "Sort order is required",
                  min: { value: 1, message: "Sort order must be >= 1" },
                  valueAsNumber: true,
                })}
                className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all shadow-inner ${
                  errors.sort_order ? "border-red-300 focus:ring-red-500" : "border-slate-300"
                }`}
              />
              {errors.sort_order && (
                <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.sort_order.message}</p>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* SECTION 5 — Feature Access */}
      <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-[#008ecc] to-[#0aa3e8] text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/15">
              <Sparkles size={17} />
            </div>
            <div>
              <h3 className="text-md font-bold tracking-tight leading-tight">Feature Access</h3>
              <p className="text-[11px] text-white/75 font-medium">
                {selectedFeatureCount} of {TOTAL_FEATURE_COUNT} features enabled
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer select-none bg-white/10 hover:bg-white/15 transition-colors px-3 py-1.5 rounded-full border border-white/20">
            <span>Select All</span>
            <span className="relative inline-flex items-center">
              <input
                type="checkbox"
                checked={allFeaturesSelected}
                onChange={handleSelectAllFeatures}
                className="sr-only"
              />
              <span
                className={`block w-9 h-5 rounded-full transition-colors duration-200 ${
                  allFeaturesSelected ? "bg-white" : "bg-white/30"
                }`}
              >
                <span
                  className={`block w-4 h-4 mt-0.5 ml-0.5 rounded-full shadow-md transform transition-transform duration-200 ${
                    allFeaturesSelected ? "translate-x-4 bg-[#008ecc]" : "translate-x-0 bg-white"
                  }`}
                />
              </span>
            </span>
          </label>
        </div>

        <div className="p-4 sm:p-6">
          <div className="flex items-start gap-2.5 mb-6 text-slate-500 text-xs bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
            <Sparkles size={14} className="text-[#008ecc] shrink-0 mt-0.5" />
            <p>
              Choose which modules are available to tenants subscribed to this plan. Unchecked
              features will be hidden for those tenants.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {FEATURE_GROUPS.map((group) => {
              const GroupIcon = group.icon;
              const groupSelectedCount = group.features.filter((f) => planFeatures[f.key]).length;

              return (
                <div
                  key={group.title}
                  className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5"
                >
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white shadow-sm border border-slate-200">
                        <GroupIcon size={14} className="text-[#008ecc]" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        {group.title}
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200 shrink-0">
                      {groupSelectedCount}/{group.features.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {group.features.map((feature) => {
                      const FeatureIcon = feature.icon;
                      const checked = !!planFeatures[feature.key];
                      return (
                        <label
                          key={feature.key}
                          className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-all duration-150 ${
                            checked
                              ? "bg-white border-[#008ecc]/25 shadow-sm ring-1 ring-[#008ecc]/10"
                              : "bg-white/60 border-slate-200 hover:bg-white hover:border-slate-300"
                          }`}
                        >
                          <span className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-colors ${
                                checked ? "bg-[#008ecc] text-white" : "bg-slate-100 text-slate-400"
                              }`}
                            >
                              <FeatureIcon size={15} />
                            </span>
                            <span
                              className={`text-[13px] font-medium truncate ${
                                checked ? "text-slate-800" : "text-slate-500"
                              }`}
                            >
                              {feature.label}
                            </span>
                          </span>

                          <span className="relative inline-flex items-center shrink-0">
                            <input
                              type="checkbox"
                              {...register(`features.${feature.key}`)}
                              className="sr-only"
                            />
                            <span
                              className={`block w-9 h-5 rounded-full transition-colors duration-200 ${
                                checked ? "bg-[#008ecc]" : "bg-slate-300"
                              }`}
                            >
                              <span
                                className={`block w-4 h-4 mt-0.5 ml-0.5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                                  checked ? "translate-x-4" : "translate-x-0"
                                }`}
                              />
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </form>
  );
};

export default PlanForm;
