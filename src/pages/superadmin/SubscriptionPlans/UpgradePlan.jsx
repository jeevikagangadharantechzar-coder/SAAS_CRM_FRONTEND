import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Send, AlertTriangle, ShieldCheck } from "lucide-react";
import { toast } from "react-toastify";

const UpgradePlan = () => {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [plans, setPlans] = useState([]);
  const [currentTenant, setCurrentTenant] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [wantedUsers, setWantedUsers] = useState(5);
  const [loginDays, setLoginDays] = useState(30);
  const [description, setDescription] = useState("");
  const [type, setType] = useState("mid_cycle"); // mid_cycle or limit_over
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Pricing calculations
  const [proratedDiscount, setProratedDiscount] = useState(0);
  const [finalPrice, setFinalPrice] = useState(0);

  const SI_URI = import.meta.env.VITE_SI_URI || "http://localhost:5000";

  // Read search query parameter
  const searchParams = new URLSearchParams(location.search);
  const queryPlanId = searchParams.get("planId");

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        // 1. Fetch public plans
        const plansRes = await axios.get(`${SI_URI}/api/superadmin/subscription-plans/public`);
        const fetchedPlans = plansRes.data?.data || [];
        setPlans(fetchedPlans);

        // 2. Fetch tenant current details
        const tenantRes = await axios.get(`${SI_URI}/superadmin/api/tenants/public/by-slug/${tenantSlug}`);
        const match = tenantRes.data?.tenant;
        if (match) {
          setCurrentTenant(match);
          
          // Pre-select plan from query parameter or default to tenant's current plan
          if (queryPlanId) {
            setSelectedPlanId(queryPlanId);
          } else if (match.plan_id) {
            setSelectedPlanId(match.plan_id._id || match.plan_id);
          }
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

  // Handle calculation and auto-setting days/users when plan or type changes
  useEffect(() => {
    if (!selectedPlanId || plans.length === 0) return;

    const selectedPlan = plans.find((p) => p._id === selectedPlanId);
    if (!selectedPlan) return;

    // Set wanted users and login days based on the selected plan specification
    const usersLimit = selectedPlan.max_users_per_tenant || 5;
    const durationDays = selectedPlan.trial_days || 30;

    setWantedUsers(usersLimit);
    setLoginDays(durationDays);

    const basePrice = selectedPlan.price_monthly || 0;

    if (type === "mid_cycle" && currentTenant && currentTenant.plan_end_date && currentTenant.plan_id) {
      // Find current plan details
      const activePlan = plans.find(p => p._id === (currentTenant.plan_id._id || currentTenant.plan_id));
      const activePrice = activePlan ? activePlan.price_monthly : 0;

      const remainingMs = new Date(currentTenant.plan_end_date) - new Date();
      const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
      const dailyRate = activePrice / 30;
      const discount = Number((dailyRate * remainingDays).toFixed(2));

      setProratedDiscount(discount);
      setFinalPrice(Math.max(0, Number((basePrice - discount).toFixed(2))));
    } else {
      setProratedDiscount(0);
      setFinalPrice(basePrice);
    }
  }, [selectedPlanId, type, currentTenant, plans]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPlanId) {
      toast.warn("Please select a target pricing plan.");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${SI_URI}/superadmin/api/tenants/upgrade-request`, {
        tenantSlug,
        planId: selectedPlanId,
        wantedUsers: Number(wantedUsers),
        loginDays: Number(loginDays),
        description,
        type,
      });

      toast.success("Upgrade request submitted successfully! Superadmin will notify you shortly.");
      setTimeout(() => {
        navigate(`/${tenantSlug}/dashboard`);
      }, 2000);
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
          <div className="w-10 h-10 border-4 border-[#008ecc] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 text-sm font-semibold">Retrieving workspace parameters...</p>
        </div>
      </div>
    );
  }

  const selectedPlan = plans.find((p) => p._id === selectedPlanId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-100/40 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation & Header */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-200">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(`/${tenantSlug}/plans`)}
              className="p-2.5 bg-white border border-slate-200 hover:border-slate-350 text-slate-700 rounded-full shadow-sm hover:shadow transition cursor-pointer flex items-center justify-center"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Plan Upgradation Form</h1>
              <p className="text-slate-500 text-xs mt-0.5 font-bold uppercase tracking-wider">Tenant Workspace: {tenantSlug}</p>
            </div>
          </div>
          <ShieldCheck size={36} className="text-[#008ecc]" />
        </div>

        {/* SECTION 1: Current Plan Details */}
        {currentTenant && (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-lg p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center space-x-2 bg-blue-50 border border-blue-100 rounded-full px-3 py-1 text-xs font-bold text-[#008ecc] uppercase tracking-wider">
                <span>Active Subscription</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900">
                Your Current Plan: <span className="text-[#008ecc] uppercase">{currentTenant.plan_id?.plan_name || "Trial / Free"}</span>
              </h2>
              <p className="text-slate-500 text-sm font-medium">
                Verify boundaries, pricing status, and upgrade to scale your seat limit and validity.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 bg-slate-50 border border-slate-200/60 rounded-2xl p-5 text-sm text-slate-700">
              <div className="space-y-1">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Seats Allowed</span>
                <span className="font-bold text-slate-800 text-base">
                  {currentTenant.plan_id?.max_users_per_tenant === 0 ? "Unlimited" : `${currentTenant.plan_id?.max_users_per_tenant || 5} Users`}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Status</span>
                <span className="font-bold text-emerald-600 uppercase text-base">{currentTenant.plan_status}</span>
              </div>
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Expiry Date</span>
                <span className="font-bold text-slate-800 text-base">
                  {currentTenant.plan_end_date ? new Date(currentTenant.plan_end_date).toLocaleDateString() : "Lifetime"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: Request Proposal Form */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-[#008ecc] text-white px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Request Proposal Details</h3>
              <p className="text-blue-100 text-xs font-semibold">
                Target Plan: {selectedPlan ? selectedPlan.plan_name : "-- Select Plan --"}
              </p>
            </div>
            <Send size={20} className="opacity-80" />
          </div>

          <form onSubmit={handleSubmit} className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-5 gap-8">
            
            {/* Form Options (3 columns) */}
            <div className="md:col-span-3 space-y-6">
              
              {/* Target Plan Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Target Pricing Plan</label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#008ecc] outline-none bg-white text-slate-800"
                >
                  <option value="">-- Choose Target Plan --</option>
                  {plans.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.plan_name} ({p.plan_type.toUpperCase()} - ${p.price_monthly}/mo)
                    </option>
                  ))}
                </select>
              </div>

              {/* Upgrade Type Variation */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Upgrade Condition</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setType("mid_cycle")}
                    className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      type === "mid_cycle"
                        ? "bg-white border-[#008ecc] text-[#008ecc] shadow-sm"
                        : "bg-slate-100/50 border-slate-250 text-slate-500 hover:bg-white"
                    }`}
                  >
                    Mid-Cycle Upgrade
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("limit_over")}
                    className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      type === "limit_over"
                        ? "bg-white border-[#008ecc] text-[#008ecc] shadow-sm"
                        : "bg-slate-100/50 border-slate-250 text-slate-500 hover:bg-white"
                    }`}
                  >
                    Expired / Limit Over
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-medium">
                  {type === "mid_cycle"
                    ? "✓ Remaining days value will be calculated and subtracted from the upgrade price."
                    : "✓ Direct plan upgrade without proration discount."}
                </p>
              </div>

              {/* Plan Specifications (Read-Only Preview) */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/60 text-slate-700">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Max User Seats</label>
                  <div className="text-lg font-extrabold text-slate-850">{wantedUsers} Users</div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Plan Validity</label>
                  <div className="text-lg font-extrabold text-slate-850">{loginDays} Days</div>
                </div>
              </div>

              {/* Description box */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Upgrade Rationale / Description</label>
                <textarea
                  rows="3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of your business needs..."
                  className="w-full border border-slate-350 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-[#008ecc] outline-none resize-none text-slate-800"
                  required
                ></textarea>
              </div>

              {/* Submit Action */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#008ecc] text-white py-3 rounded-xl font-bold hover:bg-[#007bb0] transition flex items-center justify-center space-x-2 cursor-pointer shadow-md"
              >
                <Send size={14} />
                <span>{submitting ? "Submitting Proposal..." : "Send Upgrade Proposal"}</span>
              </button>

            </div>

            {/* Pricing Preview Panel (2 columns) */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Upgrade Cost Preview</h4>
                
                <div className="space-y-3 text-xs text-slate-700">
                  <div className="flex justify-between py-2 border-b border-slate-200/60">
                    <span className="text-slate-500">Plan Base Rate</span>
                    <span className="font-semibold text-slate-800">${selectedPlan ? selectedPlan.price_monthly.toFixed(2) : "0.00"}</span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-slate-200/60 text-emerald-600">
                    <span>Prorated Credit</span>
                    <span>-${proratedDiscount.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between py-3 font-bold text-sm text-slate-900">
                    <span>Total Cost</span>
                    <span>{finalPrice === 0 ? "Free Upgrade" : `$${finalPrice.toFixed(2)}`}</span>
                  </div>
                </div>
              </div>

              {/* Warning block */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start space-x-3 text-amber-800 text-xs">
                <AlertTriangle className="flex-shrink-0 mt-0.5" size={16} />
                <div>
                  <p className="font-bold">Important Data Reset Warning</p>
                  <p className="mt-1 leading-relaxed">
                    Plan upgrades trigger a <strong>complete database refresh</strong>. All existing data will be preserved. An email with your fresh credentials will be sent.
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
