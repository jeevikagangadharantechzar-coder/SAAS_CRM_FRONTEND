import React, { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  Loader2,
  ShieldAlert,
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
  Activity,
  CalendarDays,
  ListChecks,
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
  activities: true,
  activities_calendar: true,
  activities_list: true,
  users_roles: true,
  admin_access: true,
  email_chat: true,
  email_campaigns: true,
  whatsapp_chat: true,
  reports: true,
  analytics: true,
  settings: true,
  streak_leaderboard: true,
  assigned_tasks: true,
  task_management: true,
  target_management: true,
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
    ],
  },
  {
    title: "Activities",
    icon: Activity,
    features: [
      { key: "activities", label: "Activities", icon: Activity },
      { key: "activities_calendar", label: "Activities Calendar", icon: CalendarDays },
      { key: "activities_list", label: "Activities List", icon: ListChecks },
    ],
  },
  {
    title: "Communication",
    icon: MessageSquare,
    features: [
      { key: "email_chat", label: "Email Chat", icon: Mail },
      { key: "email_campaigns", label: "Email Campaigns", icon: Send },
      { key: "whatsapp_chat", label: "WhatsApp Chat", icon: MessageCircle },
    ],
  },
  {
    title: "Reports & Engagement",
    icon: BarChart3,
    features: [
      { key: "reports", label: "Reports", icon: BarChart3 },
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
    title: "Administration",
    icon: ShieldCheck,
    features: [
      { key: "users_roles", label: "Users & Roles", icon: Shield },
      { key: "admin_access", label: "Admin Access", icon: Lock },
      { key: "settings", label: "Settings", icon: SettingsIcon },
    ],
  },
];

const TOTAL_FEATURE_COUNT = Object.keys(DEFAULT_FEATURES).length;

export const PlanForm = ({
  initialData,
  onSubmit,
  submitting,
  isEditMode = false,
  isCodeDisabled = false,
  hasRecommendedPlan = false,
}) => {
  const navigate = useNavigate();
  const isFirstRender = useRef(true);

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
  const priceMonthly = watch("price_monthly");
  const priceYearly = watch("price_yearly");
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

  // Auto-calculate yearly price (Monthly * 12) for Paid plan.
  // Skip the initial render so a saved yearly price is never overwritten on load.
  // shouldDirty: false keeps price_yearly clean so the sync runs on every subsequent
  // monthly change, until the user manually edits the yearly field.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (planType === "paid" && priceMonthly !== undefined && priceMonthly !== "") {
      const pm = parseFloat(priceMonthly);
      if (!isNaN(pm) && !dirtyFields.price_yearly) {
        setValue("price_yearly", pm * 12, { shouldValidate: true, shouldDirty: false });
      }
    }
  }, [priceMonthly, planType, setValue, dirtyFields.price_yearly]);

  // Lock Max Users to Unlimited (0) for Enterprise plan
  useEffect(() => {
    if (planType === "enterprise") {
      setValue("max_users_per_tenant", 0, { shouldValidate: true });
    }
  }, [planType, setValue]);

  // Calculate yearly savings percentage
  const calculateSavings = () => {
    const pm = parseFloat(priceMonthly);
    const py = parseFloat(priceYearly);
    if (pm > 0 && py > 0) {
      const savings = Math.round((1 - py / (pm * 12)) * 100);
      return savings > 0 ? savings : null;
    }
    return null;
  };

  const savings = calculateSavings();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
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

        {/* SECTION 2 — Pricing & Billing */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 bg-[#008ecc] text-white flex items-center space-x-2">
            <h3 className="text-md font-bold tracking-tight">SECTION 2 — Pricing & Billing</h3>
          </div>
          <div className="p-6 space-y-6">
            {planType !== "free" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Price (Monthly) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    {...register("price_monthly", {
                      required: { value: planType !== "free", message: "Monthly price is required" },
                      min: { value: 0, message: "Price must be greater than or equal to 0" },
                      valueAsNumber: true,
                    })}
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all shadow-inner ${
                      errors.price_monthly ? "border-red-300 focus:ring-red-500" : "border-slate-300"
                    }`}
                  />
                  {errors.price_monthly && (
                    <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.price_monthly.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Price (Yearly)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    {...register("price_yearly", {
                      min: { value: 0, message: "Price must be greater than or equal to 0" },
                      valueAsNumber: true,
                    })}
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all shadow-inner ${
                      errors.price_yearly ? "border-red-300 focus:ring-red-500" : "border-slate-300"
                    }`}
                  />
                  {savings !== null && (
                    <p className="text-emerald-600 text-xs mt-1.5 font-semibold">
                      🔥 Save {savings}% vs monthly billing
                    </p>
                  )}
                  {errors.price_yearly && (
                    <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.price_yearly.message}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-650 text-xs font-medium">
                Pricing is disabled for Free plans. Monthly and yearly price values default to 0.00.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
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

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Billing Cycle *
                </label>
                <select
                  {...register("billing_cycle", { required: "Billing cycle is required" })}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all bg-white"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="one_time">One-time</option>
                </select>
                {errors.billing_cycle && (
                  <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.billing_cycle.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Validity Period (Days)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 30"
                  {...register("trial_days", {
                    min: { value: 0, message: "Validity period must be >= 0" },
                    valueAsNumber: true,
                  })}
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all shadow-inner ${
                    errors.trial_days ? "border-red-300 focus:ring-red-500" : "border-slate-300"
                  }`}
                />
                <p className="text-slate-400 text-[10px] mt-1.5 leading-relaxed">Active duration in days before plan expires.</p>
                {errors.trial_days && (
                  <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.trial_days.message}</p>
                )}
              </div>
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
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Max Users Per Tenant
              </label>
              <input
                type="number"
                placeholder="0 = unlimited"
                disabled={planType === "enterprise"}
                {...register("max_users_per_tenant", {
                  min: { value: 0, message: "Value must be greater than or equal to 0" },
                  valueAsNumber: true,
                })}
                className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all shadow-inner ${
                  planType === "enterprise" ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed" : ""
                } ${errors.max_users_per_tenant ? "border-red-300 focus:ring-red-500" : "border-slate-300"}`}
              />
              {planType === "enterprise" ? (
                <p className="text-amber-600 text-[10px] mt-1.5 font-semibold">Locked to Unlimited for Enterprise tier.</p>
              ) : (
                <p className="text-slate-400 text-[10px] mt-1.5">Enter 0 for unlimited users per tenant database.</p>
              )}
              {errors.max_users_per_tenant && (
                <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.max_users_per_tenant.message}</p>
              )}
            </div>
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
