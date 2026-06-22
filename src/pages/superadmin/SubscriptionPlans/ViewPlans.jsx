import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Check, ShieldCheck, ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";

const ViewPlans = () => {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [currentTenant, setCurrentTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  const SI_URI = import.meta.env.VITE_SI_URI || "http://localhost:5000";

  useEffect(() => {
    const fetchPlans = async () => {
      setLoading(true);
      try {
        // 1. Fetch plans
        const plansRes = await axios.get(`${SI_URI}/api/superadmin/subscription-plans/public`);
        setPlans(plansRes.data?.data || []);

        // 2. Fetch tenant current details
        const tenantRes = await axios.get(`${SI_URI}/superadmin/api/tenants/public/by-slug/${tenantSlug}`);
        const match = tenantRes.data?.tenant;
        if (match) {
          setCurrentTenant(match);
        }
      } catch (err) {
        console.error("Failed to fetch pricing plans info:", err);
        toast.error("Unable to load subscription plans.");
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, [tenantSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 border-4 border-[#008ecc] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 text-sm font-semibold">Loading plans data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-100/40 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Navigation Bar */}
        <div className="flex items-center space-x-4 mb-2">
          <button
            onClick={() => navigate(`/${tenantSlug}/dashboard`)}
            className="p-2.5 bg-white border border-slate-200 hover:border-slate-350 text-slate-700 rounded-full transition shadow-sm hover:shadow cursor-pointer flex items-center justify-center"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Back to Dashboard</span>
        </div>

        {/* SECTION 1: Current Plan Details Card */}
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

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 bg-slate-50 border border-slate-200/60 rounded-2xl p-5 text-sm">
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

        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4 pt-4">
          <div className="inline-flex items-center space-x-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 text-xs font-bold text-[#008ecc] uppercase tracking-wider">
            <ShieldCheck size={14} />
            <span>Enterprise Subscriptions</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-none">
            Choose the Perfect Plan for <span className="text-[#008ecc]">Your Team</span>
          </h1>
          <p className="text-base text-slate-500 font-medium leading-relaxed">
            Upgrade your seats, unlock extended validity, and scale your sales pipeline with premium business tiers.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
          {plans.map((p) => {
            const isRec = p.is_recommended;
            return (
              <div
                key={p._id}
                className={`relative flex flex-col justify-between bg-white rounded-3xl border transition-all duration-300 hover:-translate-y-2 p-8 ${
                  isRec
                    ? "border-[#008ecc] ring-2 ring-[#008ecc]/10 shadow-2xl scale-105 z-10"
                    : "border-slate-200 shadow-lg hover:shadow-xl"
                }`}
              >
                {isRec && (
                  <span className="absolute top-0 right-12 transform -translate-y-1/2 bg-[#008ecc] text-white px-4 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest shadow-md">
                    Recommended
                  </span>
                )}

                <div className="space-y-6">
                  {/* Plan Identifier */}
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">{p.plan_name}</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase mt-1 tracking-wider">{p.plan_type} Tier</p>
                  </div>

                  {/* Pricing Rate */}
                  <div className="border-b border-slate-100 pb-6">
                    <span className="text-5xl font-black text-slate-900 tracking-tight">
                      ${p.price_monthly}
                    </span>
                    <span className="text-slate-400 text-sm font-semibold ml-1">
                      / {p.billing_cycle === "yearly" ? "yr" : "mo"}
                    </span>
                  </div>

                  {/* Feature Checklist */}
                  <ul className="space-y-4 text-slate-600 text-sm font-medium">
                    <li className="flex items-center space-x-3 text-slate-900 font-bold">
                      <div className="p-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-full">
                        <Check size={14} />
                      </div>
                      <span>{p.max_users_per_tenant === 0 ? "Unlimited" : p.max_users_per_tenant} Active User Seats</span>
                    </li>
                    <li className="flex items-center space-x-3">
                      <div className="p-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-full">
                        <Check size={14} />
                      </div>
                      <span>{p.trial_days || 30} Days validity period</span>
                    </li>
                    {p.description && (
                      <li className="flex items-start space-x-3 pt-2 text-slate-400 text-xs font-normal border-t border-slate-50">
                        <span>{p.description}</span>
                      </li>
                    )}
                  </ul>
                </div>

                {/* Purchase Button */}
                <div className="mt-8 pt-6 border-t border-slate-50">
                  <button
                    onClick={() => navigate(`/${tenantSlug}/upgrade?planId=${p._id}`)}
                    className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md text-center block ${
                      isRec
                        ? "bg-[#008ecc] text-white hover:bg-[#007bb0]"
                        : "bg-slate-50 border border-slate-200 hover:border-slate-350 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Select Plan & Upgrade
                  </button>
                </div>

              </div>
            );
          })}
        </div>

        {/* Reset Warning */}
        <div className="max-w-xl mx-auto bg-amber-50/60 border border-amber-200 rounded-2xl p-4 mt-16 text-center text-amber-800 text-xs leading-relaxed font-semibold">
          Note: Subscription upgrades involve a complete database refresh. Please backup any offline data. All existing data will be preserved.
        </div>

      </div>
    </div>
  );
};

export default ViewPlans;
