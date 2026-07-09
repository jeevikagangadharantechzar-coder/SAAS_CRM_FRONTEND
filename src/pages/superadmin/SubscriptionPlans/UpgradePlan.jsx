import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Send, AlertTriangle, ShieldCheck } from "lucide-react";
import { toast } from "react-toastify";

const TIER_LABELS = { monthly: "Monthly", half_yearly: "Half Year", yearly: "Yearly" };

const UpgradePlan = () => {
  const { tenantSlug } = useParams();
  const navigate       = useNavigate();
  const location       = useLocation();

  const [plans, setPlans]                               = useState([]);
  const [currentTenant, setCurrentTenant]               = useState(null);
  const [selectedPlanId, setSelectedPlanId]             = useState("");
  const [selectedBillingCycle, setSelectedBillingCycle] = useState("");
  const [description, setDescription]                   = useState("");
  const [type, setType]                                 = useState("mid_cycle");
  const [loading, setLoading]                           = useState(true);
  const [submitting, setSubmitting]                     = useState(false);
  const [proratedDiscount, setProratedDiscount]         = useState(0);
  const [finalPrice, setFinalPrice]                     = useState(0);

  const SI_URI       = import.meta.env.VITE_SI_URI || "http://localhost:5000";
  const searchParams = new URLSearchParams(location.search);
  const queryPlanId  = searchParams.get("planId");

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [plansRes, tenantRes] = await Promise.all([
          axios.get(`${SI_URI}/api/superadmin/subscription-plans/public`),
          axios.get(`${SI_URI}/superadmin/api/tenants/public/by-slug/${tenantSlug}`),
        ]);

        const fetchedPlans = plansRes.data?.data || [];
        setPlans(fetchedPlans);

        const match = tenantRes.data?.tenant;
        if (match) {
          setCurrentTenant(match);
          const initPlanId = queryPlanId || match.plan_id?._id || match.plan_id || "";
          setSelectedPlanId(initPlanId);
          if (match.plan_billing_cycle) setSelectedBillingCycle(match.plan_billing_cycle);
        }
      } catch (err) {
        console.error("Failed to load upgrade options:", err);
        toast.error("Failed to retrieve current plan details.");
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [tenantSlug, queryPlanId]);

  const handlePlanChange = (planId) => {
    setSelectedPlanId(planId);
    const plan = plans.find((p) => p._id === planId);
    if (plan?.tiers?.length === 1) {
      setSelectedBillingCycle(plan.tiers[0].billing_cycle);
    } else {
      setSelectedBillingCycle("");
    }
  };

  const selectedPlan = plans.find((p) => p._id === selectedPlanId);
  const hasTiers     = selectedPlan?.tiers?.length > 0;
  const activeTier   = hasTiers
    ? selectedPlan.tiers.find((t) => t.billing_cycle === selectedBillingCycle)
    : null;

  const basePrice =
    activeTier?.price ??
    (selectedBillingCycle === "yearly"
      ? selectedPlan?.price_yearly
      : selectedPlan?.price_monthly) ??
    0;

  const wantedUsers = selectedPlan?.max_users_per_tenant ?? 0;

  const loginDays = activeTier
    ? activeTier.duration_months * 30
    : selectedPlan?.trial_days || 30;

  useEffect(() => {
    if (!selectedPlanId || plans.length === 0) return;

    if (type === "mid_cycle" && currentTenant?.plan_end_date && currentTenant?.plan_id) {
      const currentCycle = currentTenant.plan_billing_cycle || "monthly";
      const activePlan   = plans.find((p) => p._id === (currentTenant.plan_id._id || currentTenant.plan_id));
      const currentTier  = activePlan?.tiers?.find((t) => t.billing_cycle === currentCycle);
      const activePrice  = currentTier?.price ?? activePlan?.price_monthly ?? 0;

      const totalDays     = currentCycle === "yearly" ? 365 : currentCycle === "half_yearly" ? 180 : 30;
      const remainingMs   = new Date(currentTenant.plan_end_date) - new Date();
      const remainingDays = Math.max(0, Math.ceil(remainingMs / 86_400_000));
      const discount      = Number(((activePrice / totalDays) * remainingDays).toFixed(2));

      setProratedDiscount(discount);
      setFinalPrice(Math.max(0, Number((basePrice - discount).toFixed(2))));
    } else {
      setProratedDiscount(0);
      setFinalPrice(basePrice);
    }
  }, [selectedPlanId, selectedBillingCycle, type, currentTenant, plans, basePrice]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPlanId) { toast.warn("Please select a plan."); return; }
    if (hasTiers && !selectedBillingCycle) { toast.warn("Please select a billing period."); return; }

    setSubmitting(true);
    try {
      await axios.post(`${SI_URI}/superadmin/api/tenants/upgrade-request`, {
        tenantSlug,
        planId:        selectedPlanId,
        billing_cycle: selectedBillingCycle || selectedPlan?.billing_cycle || "monthly",
        wantedUsers:   Number(wantedUsers),
        loginDays:     Number(loginDays),
        description,
        type,
      });
      toast.success("Upgrade request submitted! Superadmin will review and notify you shortly.");
      setTimeout(() => navigate(`/${tenantSlug}/plans`), 2000);
    } catch (err) {
      console.error("Upgrade request error:", err);
      toast.error(err.response?.data?.error || "Failed to submit upgrade request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 border-4 border-[#008ecc] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm font-semibold">Retrieving workspace parameters...</p>
        </div>
      </div>
    );
  }

  const currentPlanId = currentTenant?.plan_id?._id || currentTenant?.plan_id;
  const currentCycle  = currentTenant?.plan_billing_cycle;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-100/40 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-200">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(`/${tenantSlug}/plans`)}
              className="p-2.5 bg-white border border-slate-200 hover:border-slate-350 text-slate-700 rounded-full shadow-sm hover:shadow transition cursor-pointer flex items-center justify-center"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Plan Upgrade / Renewal</h1>
              <p className="text-slate-500 text-xs mt-0.5 font-bold uppercase tracking-wider">Workspace: {tenantSlug}</p>
            </div>
          </div>
          <ShieldCheck size={36} className="text-[#008ecc]" />
        </div>

        {/* Current Plan Summary */}
        {currentTenant && (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-lg p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center bg-blue-50 border border-blue-100 rounded-full px-3 py-1 text-xs font-bold text-[#008ecc] uppercase tracking-wider">
                Current Subscription
              </div>
              <h2 className="text-2xl font-black text-slate-900">
                {currentTenant.plan_id?.plan_name || "Trial / Free"}
                {currentCycle && (
                  <span className="ml-2 text-sm font-medium text-slate-400">
                    ({TIER_LABELS[currentCycle] || currentCycle})
                  </span>
                )}
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-6 bg-slate-50 border border-slate-200/60 rounded-2xl p-5 text-sm">
              <div className="space-y-1">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Seats</span>
                <span className="font-bold text-slate-800 text-base">
                  {currentTenant.plan_id?.max_users_per_tenant === 0 ? "Unlimited" : `${currentTenant.plan_id?.max_users_per_tenant || 5}`}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Status</span>
                <span className="font-bold text-emerald-600 uppercase text-base">{currentTenant.plan_status}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Expires</span>
                <span className="font-bold text-slate-800 text-base">
                  {currentTenant.plan_end_date
                    ? new Date(currentTenant.plan_end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : "Lifetime"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Request Form */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-[#008ecc] text-white px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Request Proposal Details</h3>
              <p className="text-blue-100 text-xs font-semibold">
                {selectedPlan
                  ? `${selectedPlan.plan_name}${selectedBillingCycle ? ` — ${TIER_LABELS[selectedBillingCycle] || selectedBillingCycle}` : ""}`
                  : "Select a plan below"}
              </p>
            </div>
            <Send size={20} className="opacity-80" />
          </div>

          <form onSubmit={handleSubmit} className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-5 gap-8">

            <div className="md:col-span-3 space-y-6">

              {/* Plan Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Target Plan</label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => handlePlanChange(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#008ecc] outline-none bg-white text-slate-800"
                >
                  <option value="">-- Choose a Plan --</option>
                  {plans.map((p) => {
                    const isCurrent = p._id === currentPlanId;
                    return (
                      <option key={p._id} value={p._id}>
                        {p.plan_name} — {p.plan_type.toUpperCase()}{isCurrent ? " (Current)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Billing Cycle — only when plan has tiers */}
              {selectedPlan && hasTiers && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    Billing Period
                    {selectedPlanId === currentPlanId && (
                      <span className="ml-2 text-[#008ecc] normal-case font-medium">— you can switch periods</span>
                    )}
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {selectedPlan.tiers.map((tier) => {
                      const isCurrentCycle = selectedPlanId === currentPlanId && tier.billing_cycle === currentCycle;
                      return (
                        <button
                          key={tier.billing_cycle}
                          type="button"
                          onClick={() => setSelectedBillingCycle(tier.billing_cycle)}
                          className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer text-left ${
                            selectedBillingCycle === tier.billing_cycle
                              ? "bg-[#008ecc] border-[#008ecc] text-white shadow-sm"
                              : "bg-white border-slate-200 text-slate-600 hover:border-[#008ecc] hover:text-[#008ecc]"
                          }`}
                        >
                          {TIER_LABELS[tier.billing_cycle] || tier.billing_cycle}
                          <span className="block text-[10px] font-normal opacity-80 mt-0.5">
                            {selectedPlan.currency || "USD"} {tier.price.toLocaleString()}
                          </span>
                          {isCurrentCycle && (
                            <span className="block text-[9px] mt-0.5 opacity-70">current</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Upgrade Type */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Upgrade Condition</label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { value: "mid_cycle",   label: "Mid-Cycle Upgrade" },
                    { value: "limit_over",  label: "Expired / Limit Over" },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setType(value)}
                      className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        type === value
                          ? "bg-white border-[#008ecc] text-[#008ecc] shadow-sm"
                          : "bg-slate-100/50 border-slate-200 text-slate-500 hover:bg-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-medium">
                  {type === "mid_cycle"
                    ? "✓ Remaining value from current plan will be credited."
                    : "✓ Direct upgrade, no proration applied."}
                </p>
              </div>

              {/* Plan Specs */}
              {selectedPlan && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Max User Seats</label>
                  <div className="text-lg font-extrabold text-slate-900">
                    {wantedUsers === 0 ? "Unlimited" : `${wantedUsers} Users`}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Reason / Description</label>
                <textarea
                  rows="3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of your upgrade or renewal request..."
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-[#008ecc] outline-none resize-none text-slate-800"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting || (hasTiers && !selectedBillingCycle)}
                className="w-full bg-[#008ecc] text-white py-3 rounded-xl font-bold hover:bg-[#007bb0] transition flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={14} />
                <span>{submitting ? "Submitting..." : "Send Upgrade Proposal"}</span>
              </button>
            </div>

            {/* Pricing Preview */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Cost Preview</h4>
                <div className="space-y-3 text-xs text-slate-700">
                  <div className="flex justify-between py-2 border-b border-slate-200/60">
                    <span className="text-slate-500">Plan Base Rate</span>
                    <span className="font-semibold text-slate-800">
                      {selectedPlan?.currency || "USD"} {basePrice.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-200/60 text-emerald-600">
                    <span>Prorated Credit</span>
                    <span>− {selectedPlan?.currency || "USD"} {proratedDiscount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-3 font-bold text-sm text-slate-900">
                    <span>Total Cost</span>
                    <span>
                      {finalPrice === 0
                        ? "Free Upgrade"
                        : `${selectedPlan?.currency || "USD"} ${finalPrice.toLocaleString()}`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-800 text-xs">
                <AlertTriangle className="flex-shrink-0 mt-0.5" size={16} />
                <div>
                  <p className="font-bold">Important Data Reset Warning</p>
                  <p className="mt-1 leading-relaxed">
                    Plan changes trigger a <strong>complete database refresh</strong>. All existing data will be preserved. An email with your fresh credentials will be sent.
                  </p>
                </div>
              </div>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
};

export default UpgradePlan;
