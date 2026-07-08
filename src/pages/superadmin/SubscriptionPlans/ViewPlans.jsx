import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Check,
  X,
  ShieldCheck,
  ArrowLeft,
  AlertTriangle,
  Clock,
  Users,
  Calendar,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import { toast } from "react-toastify";

// ─── Constants ─────────────────────────────────────────────────────────────

const TIER_LABELS = { monthly: "Monthly", half_yearly: "Half Year", yearly: "Yearly" };
const CYCLE_LABELS = { monthly: "Monthly", half_yearly: "Half Year", yearly: "Yearly", one_time: "One-time" };

const FEATURE_LABELS = {
  dashboard:           "Dashboard",
  leads:               "Leads",
  create_lead:         "Create Lead",
  deals_all:           "All Deals",
  create_deal:         "Create Deal",
  deals_pipeline:      "Pipeline",
  invoices:            "Invoices",
  proposal:            "Proposal",
  activities:          "Activities",
  activities_calendar: "Calendar",
  activities_list:     "Activity List",
  users_roles:         "User Roles",
  admin_access:        "Admin Access",
  email_chat:          "Email Chat",
  email_campaigns:     "Email Campaigns",
  whatsapp_chat:       "WhatsApp Chat",
  reports:             "Reports",
  analytics:           "Analytics",
  settings:            "Settings",
  streak_leaderboard:  "Leaderboard",
  assigned_tasks:      "Assigned Tasks",
  task_management:     "Task Management",
  target_management:   "Target Management",
  meetings:            "Meetings",
  google_meet_sync:    "Google Meet",
  zoom_meetings:       "Zoom Meetings",
  messages:            "Messages",
  chatbot:             "Chatbot",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - now) / 86_400_000);
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
}

function getPlanPrice(plan, cycle) {
  if (plan?.tiers?.length && cycle) {
    const tier = plan.tiers.find((t) => t.billing_cycle === cycle);
    if (tier) return { price: tier.price, currency: plan.currency || "USD" };
  }
  const price =
    cycle === "yearly" ? plan?.price_yearly : plan?.price_monthly;
  return { price: price ?? 0, currency: plan?.currency || "USD" };
}

function getEnabledFeatures(features) {
  if (!features) return [];
  return Object.entries(features)
    .filter(([, v]) => v === true)
    .map(([k]) => k);
}

// ─── Feature Grid ────────────────────────────────────────────────────────────

function FeatureGrid({ features, showAll }) {
  const rows = showAll
    ? Object.keys(FEATURE_LABELS)
    : Object.keys(FEATURE_LABELS).slice(0, 14);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {rows.map((key) => {
        const on = features?.[key] ?? false;
        return (
          <div
            key={key}
            className={`flex items-center gap-2 text-xs font-medium px-2 py-1.5 rounded-lg ${
              on
                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                : "bg-slate-50 text-slate-400 border border-slate-100"
            }`}
          >
            {on ? (
              <Check size={11} className="text-emerald-500 flex-shrink-0" />
            ) : (
              <X size={11} className="text-slate-300 flex-shrink-0" />
            )}
            <span>{FEATURE_LABELS[key]}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Plan Card (for available plans section) ──────────────────────────────

function AvailablePlanCard({ plan, currentPlanId, tenantSlug, navigate }) {
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const isCurrent = plan._id === (currentPlanId?._id || currentPlanId);
  const hasTiers  = plan.tiers?.length > 0;
  const enabledFeatures = getEnabledFeatures(plan.features);

  return (
    <div
      className={`relative flex flex-col bg-white rounded-3xl border transition-all duration-300 p-6 ${
        plan.is_recommended
          ? "border-[#008ecc] ring-2 ring-[#008ecc]/10 shadow-2xl"
          : isCurrent
          ? "border-emerald-400 ring-2 ring-emerald-100 shadow-lg"
          : "border-slate-200 shadow-lg hover:shadow-xl hover:-translate-y-1"
      }`}
    >
      {plan.is_recommended && (
        <span className="absolute -top-3 right-8 bg-[#008ecc] text-white px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest shadow">
          Recommended
        </span>
      )}
      {isCurrent && (
        <span className="absolute -top-3 left-8 bg-emerald-500 text-white px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest shadow">
          Your Plan
        </span>
      )}

      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xl font-bold text-slate-900">{plan.plan_name}</h3>
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
            plan.plan_type === "free"
              ? "bg-slate-100 text-slate-500"
              : plan.plan_type === "enterprise"
              ? "bg-purple-100 text-purple-700"
              : "bg-blue-100 text-blue-700"
          }`}>
            {plan.plan_type}
          </span>
        </div>
        {plan.description && (
          <p className="text-xs text-slate-400 mt-1">{plan.description}</p>
        )}
      </div>

      {/* Pricing */}
      <div className="mb-4 border-b border-slate-100 pb-4">
        {hasTiers ? (
          <div className="space-y-1.5">
            {plan.tiers.map((tier) => (
              <div key={tier.billing_cycle} className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-medium">{TIER_LABELS[tier.billing_cycle] || tier.billing_cycle}</span>
                <span className="font-bold text-slate-900">
                  {plan.currency || "USD"} {tier.price.toLocaleString()}
                  <span className="text-slate-400 font-normal text-xs ml-1">/ {tier.duration_months}mo</span>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <span className="text-4xl font-black text-slate-900">{plan.currency || "USD"} {plan.price_monthly}</span>
            <span className="text-slate-400 text-sm ml-1">/ mo</span>
          </div>
        )}
      </div>

      {/* User Limit */}
      <div className="flex items-center gap-2 mb-4 text-sm text-slate-700">
        <Users size={14} className="text-[#008ecc]" />
        <span className="font-semibold">
          {plan.max_users_per_tenant === 0 ? "Unlimited" : plan.max_users_per_tenant} User Seats
        </span>
      </div>

      {/* Features */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setFeaturesOpen((o) => !o)}
          className="flex items-center gap-1.5 text-xs font-bold text-[#008ecc] hover:underline cursor-pointer mb-2"
        >
          <span>{featuresOpen ? "Hide Features" : `View ${enabledFeatures.length} Features`}</span>
        </button>
        {featuresOpen && <FeatureGrid features={plan.features} showAll={true} />}
        {!featuresOpen && (
          <div className="flex flex-wrap gap-1.5">
            {enabledFeatures.slice(0, 6).map((k) => (
              <span key={k} className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-medium">
                {FEATURE_LABELS[k] || k}
              </span>
            ))}
            {enabledFeatures.length > 6 && (
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
                +{enabledFeatures.length - 6} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="mt-auto pt-4 border-t border-slate-100">
        <button
          onClick={() => navigate(`/${tenantSlug}/upgrade?planId=${plan._id}`)}
          className={`w-full py-2.5 rounded-2xl font-bold text-sm transition-all cursor-pointer shadow-sm hover:shadow-md ${
            isCurrent
              ? "bg-emerald-50 border border-emerald-300 text-emerald-700 hover:bg-emerald-100"
              : plan.is_recommended
              ? "bg-[#008ecc] text-white hover:bg-[#007bb0]"
              : "bg-slate-50 border border-slate-200 hover:border-slate-350 text-slate-700 hover:bg-slate-100"
          }`}
        >
          {isCurrent ? "Renew / Change Period" : "Select & Upgrade"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────

const ViewPlans = () => {
  const { tenantSlug } = useParams();
  const navigate       = useNavigate();
  const [plans, setPlans]             = useState([]);
  const [currentTenant, setCurrentTenant] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  const SI_URI = import.meta.env.VITE_SI_URI || "http://localhost:5000";

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [plansRes, tenantRes] = await Promise.all([
          axios.get(`${SI_URI}/api/superadmin/subscription-plans/public`),
          axios.get(`${SI_URI}/superadmin/api/tenants/public/by-slug/${tenantSlug}`),
        ]);
        setPlans(plansRes.data?.data || []);
        if (tenantRes.data?.tenant) setCurrentTenant(tenantRes.data.tenant);
      } catch (err) {
        console.error("Failed to fetch plan data:", err);
        toast.error("Unable to load subscription plans.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [tenantSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 border-4 border-[#008ecc] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm font-semibold">Loading plan details...</p>
        </div>
      </div>
    );
  }

  // ── Derived values ───────────────────────────────────────────────────────
  const currentPlan  = currentTenant?.plan_id;
  const currentCycle = currentTenant?.plan_billing_cycle;
  const currentTier  = currentPlan?.tiers?.find((t) => t.billing_cycle === currentCycle);
  const graceDays    = currentTier?.grace_days ?? 0;

  const endDate       = currentTenant?.plan_end_date;
  const daysLeft      = daysUntil(endDate);
  const isGrace       = currentTenant?.plan_status === "grace";

  const graceEndDate = endDate && graceDays > 0
    ? new Date(new Date(endDate).getTime() + graceDays * 86_400_000)
    : null;
  const graceDaysLeft = graceEndDate ? Math.max(0, daysUntil(graceEndDate)) : 0;

  const { price: currentPrice, currency: currentCurrency } = currentPlan
    ? getPlanPrice(currentPlan, currentCycle)
    : { price: 0, currency: "USD" };

  const enabledFeatures = getEnabledFeatures(currentPlan?.features);

  // ── Expiry banner config ─────────────────────────────────────────────────
  let expiryBanner = null;
  if (isGrace) {
    expiryBanner = {
      bg:   "bg-orange-50 border-orange-300",
      icon: <AlertCircle size={18} className="text-orange-600 flex-shrink-0" />,
      text: `You are in your grace period. Service ends in ${graceDaysLeft} day${graceDaysLeft !== 1 ? "s" : ""} — please renew to avoid interruption.`,
      color: "text-orange-800",
    };
  } else if (daysLeft === 1) {
    expiryBanner = {
      bg:   "bg-red-50 border-red-300",
      icon: <AlertTriangle size={18} className="text-red-600 flex-shrink-0" />,
      text: "Your plan expires TOMORROW! Renew immediately to avoid service interruption.",
      color: "text-red-800",
    };
  } else if (daysLeft !== null && daysLeft <= 7 && daysLeft > 1) {
    expiryBanner = {
      bg:   "bg-amber-50 border-amber-300",
      icon: <Clock size={18} className="text-amber-600 flex-shrink-0" />,
      text: `Your plan expires in ${daysLeft} days (${formatDate(endDate)}). Consider renewing soon.`,
      color: "text-amber-800",
    };
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-100/40 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-10">

        {/* Back nav */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(`/${tenantSlug}/dashboard`)}
            className="p-2.5 bg-white border border-slate-200 hover:border-slate-350 text-slate-700 rounded-full shadow-sm hover:shadow transition cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Back to Dashboard</span>
        </div>

        {/* Expiry warning banner */}
        {expiryBanner && (
          <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl border ${expiryBanner.bg} ${expiryBanner.color} text-sm font-semibold`}>
            {expiryBanner.icon}
            <span>{expiryBanner.text}</span>
          </div>
        )}

        {/* ── SECTION 1: Current Plan ─────────────────────────────────────────── */}
        {currentTenant && (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-lg overflow-hidden">
            {/* Header bar */}
            <div className="bg-gradient-to-r from-[#008ecc] to-[#0068a0] px-6 py-5 flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-1">Your Current Plan</p>
                <h2 className="text-2xl font-black text-white">
                  {currentPlan?.plan_name || "Trial / Free"}
                </h2>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${
                  currentTenant.plan_status === "active"  ? "bg-emerald-400 text-white" :
                  currentTenant.plan_status === "grace"   ? "bg-orange-400 text-white" :
                  currentTenant.plan_status === "trial"   ? "bg-blue-200 text-blue-900" :
                  currentTenant.plan_status === "expired" ? "bg-red-400 text-white" :
                  "bg-slate-200 text-slate-700"
                }`}>
                  {currentTenant.plan_status}
                </span>
                {currentCycle && (
                  <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">
                    {CYCLE_LABELS[currentCycle] || currentCycle}
                  </span>
                )}
              </div>
            </div>

            <div className="p-6 md:p-8 space-y-8">
              {/* Key metrics row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    <CreditCard size={11} /> Price
                  </div>
                  <div className="text-lg font-black text-slate-900">
                    {currentCurrency} {currentPrice.toLocaleString()}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    <Users size={11} /> User Seats
                  </div>
                  <div className="text-lg font-black text-slate-900">
                    {currentPlan?.max_users_per_tenant === 0 ? "Unlimited" : `${currentPlan?.max_users_per_tenant ?? "—"}`}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    <Calendar size={11} /> Start Date
                  </div>
                  <div className="text-sm font-bold text-slate-800">
                    {formatDate(currentTenant.plan_start_date)}
                  </div>
                </div>

                <div className={`border rounded-2xl p-4 space-y-1 ${
                  daysLeft === 1  ? "bg-red-50 border-red-200" :
                  daysLeft !== null && daysLeft <= 7 ? "bg-amber-50 border-amber-200" :
                  isGrace ? "bg-orange-50 border-orange-200" :
                  "bg-slate-50 border-slate-100"
                }`}>
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    <Calendar size={11} /> End Date
                  </div>
                  <div className={`text-sm font-bold ${
                    daysLeft === 1  ? "text-red-700" :
                    daysLeft !== null && daysLeft <= 7 ? "text-amber-700" :
                    isGrace ? "text-orange-700" :
                    "text-slate-800"
                  }`}>
                    {formatDate(endDate)}
                    {daysLeft !== null && !isGrace && daysLeft >= 0 && (
                      <span className="block text-[10px] font-semibold mt-0.5 opacity-70">
                        {daysLeft === 0 ? "Expires today" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Grace period info */}
              {isGrace && graceDays > 0 && (
                <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-2xl px-5 py-4 text-orange-800">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm">You are in the grace period</p>
                    <p className="text-xs mt-0.5">
                      Your plan expired on {formatDate(endDate)}. You have{" "}
                      <strong>{graceDaysLeft} day{graceDaysLeft !== 1 ? "s" : ""}</strong> remaining before access is revoked.
                      {graceEndDate && ` Access ends on ${formatDate(graceEndDate)}.`}
                    </p>
                  </div>
                </div>
              )}

              {/* Plan type badge */}
              {currentPlan && (
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${
                    currentPlan.plan_type === "free"       ? "bg-slate-100 text-slate-600" :
                    currentPlan.plan_type === "enterprise" ? "bg-purple-100 text-purple-700" :
                    "bg-blue-100 text-blue-700"
                  }`}>
                    {currentPlan.plan_type} plan
                  </span>
                  {graceDays > 0 && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-medium">
                      {graceDays}-day grace period
                    </span>
                  )}
                </div>
              )}

              {/* Features */}
              {currentPlan?.features && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                      Features ({enabledFeatures.length} enabled)
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAllFeatures((s) => !s)}
                      className="text-xs font-bold text-[#008ecc] hover:underline cursor-pointer"
                    >
                      {showAllFeatures ? "Show Less" : `Show All ${Object.keys(FEATURE_LABELS).length}`}
                    </button>
                  </div>
                  <FeatureGrid features={currentPlan.features} showAll={showAllFeatures} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SECTION 2: Available Plans ─────────────────────────────────────── */}
        <div className="space-y-6">
          <div className="text-center space-y-3 pt-2">
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 text-xs font-bold text-[#008ecc] uppercase tracking-wider">
              <ShieldCheck size={14} />
              <span>All Available Plans</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Upgrade or Switch Your Plan
            </h2>
            <p className="text-sm text-slate-500 font-medium max-w-xl mx-auto">
              Choose from our available subscription tiers to unlock more features and user seats.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <AvailablePlanCard
                key={plan._id}
                plan={plan}
                currentPlanId={currentTenant?.plan_id}
                tenantSlug={tenantSlug}
                navigate={navigate}
              />
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="max-w-xl mx-auto bg-amber-50/60 border border-amber-200 rounded-2xl p-4 text-center text-amber-800 text-xs leading-relaxed font-semibold">
          Note: Plan upgrades involve a complete database refresh. All existing data will be preserved. An email with your credentials will be sent.
        </div>

      </div>
    </div>
  );
};

export default ViewPlans;
