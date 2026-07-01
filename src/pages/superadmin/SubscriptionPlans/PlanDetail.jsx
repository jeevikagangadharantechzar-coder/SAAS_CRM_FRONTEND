import React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  Building,
  Users,
  Calendar,
  Layers,
  HelpCircle,
  Eye,
  CheckCircle,
  XCircle,
  DollarSign,
  Briefcase,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { useGetPlanById, useGetTenantSubscriptions } from "../../../hooks/useSubscriptionPlans";
import PlanBadge from "../../../components/superadmin/plans/PlanBadge";
import { format } from "date-fns";

const getCurrencySymbol = (currency) => {
  switch (currency) {
    case "INR":
      return "₹";
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    case "USD":
    default:
      return "$";
  }
};

const PlanDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Fetch plan details
  const {
    data: planData,
    isLoading: isPlanLoading,
    isError: isPlanError,
    error: planError,
  } = useGetPlanById(id);

  // Fetch tenant list on this plan
  const {
    data: tenantData,
    isLoading: isTenantsLoading,
    isError: isTenantsError,
  } = useGetTenantSubscriptions({
    plan_id: id,
    limit: 50, // Fetch up to 50 tenants for details list
  });

  const plan = planData?.data;
  const tenantsList = tenantData?.data || [];
  const totalTenantsCount = tenantData?.pagination?.total || 0;

  const isLoading = isPlanLoading || isTenantsLoading;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-6 bg-slate-200 rounded w-1/4 animate-pulse" />
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
            <div className="h-24 bg-slate-100 rounded" />
            <div className="h-24 bg-slate-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (isPlanError || !plan) {
    return (
      <div className="max-w-4xl mx-auto mt-12">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-3">
          <AlertCircle className="text-red-500" size={40} />
          <div>
            <h3 className="font-bold text-red-800">Failed to load plan details</h3>
            <p className="text-red-600 text-sm mt-1">
              {planError?.response?.data?.error || planError.message || "Plan not found."}
            </p>
          </div>
          <button
            onClick={() => navigate("/superadmin/subscription-plans")}
            className="px-4 py-2 bg-[#008ecc] text-white rounded-xl text-xs font-semibold hover:bg-[#007bb0] transition-colors shadow"
          >
            Back to Plans
          </button>
        </div>
      </div>
    );
  }

  const {
    plan_name,
    plan_code,
    plan_type,
    status,
    description,
    price_monthly,
    price_yearly,
    currency,
    billing_cycle,
    trial_days,
    max_users_per_tenant,
    is_visible,
    is_recommended,
    sort_order,
  } = plan;

  const symbol = getCurrencySymbol(currency);
  const formattedMonthly = parseFloat(price_monthly || 0).toFixed(2);
  const formattedYearly = parseFloat(price_yearly || 0).toFixed(2);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-xs font-semibold text-slate-400">
        <span
          className="hover:text-slate-700 transition-colors cursor-pointer"
          onClick={() => navigate("/superadmin/dashboard")}
        >
          Superadmin
        </span>
        <span>&gt;</span>
        <span
          className="hover:text-slate-700 transition-colors cursor-pointer"
          onClick={() => navigate("/superadmin/subscription-plans")}
        >
          Subscription plans
        </span>
        <span>&gt;</span>
        <span className="text-slate-600">Plan details</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate("/superadmin/subscription-plans")}
            className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-600 transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{plan_name}</h2>
              {is_recommended && (
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200 uppercase tracking-wider">
                  Recommended
                </span>
              )}
            </div>
            <p className="text-slate-400 font-mono text-xs mt-0.5">{plan_code}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to={`/superadmin/subscription-plans/${id}/edit`}
            className="flex items-center space-x-2 px-4 py-2.5 bg-[#008ecc] text-white rounded-xl font-semibold hover:bg-[#007bb0] transition-all shadow-md text-sm"
          >
            <Edit size={16} />
            <span>Edit plan</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Details Panel */}
        <div className="md:col-span-2 space-y-6">
          {/* Identity & Description */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
              <Layers size={16} className="text-slate-500" />
              <span>Identity & Description</span>
            </h3>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400 text-xs block font-semibold uppercase tracking-wider">Plan Name</span>
                <span className="font-bold text-slate-800">{plan_name}</span>
              </div>
              <div>
                <span className="text-slate-400 text-xs block font-semibold uppercase tracking-wider">Plan Code</span>
                <span className="font-mono text-xs font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 inline-block">
                  {plan_code}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-xs block font-semibold uppercase tracking-wider">Plan Type</span>
                <div className="mt-1">
                  <PlanBadge type="plan_type" value={plan_type} />
                </div>
              </div>
              <div>
                <span className="text-slate-400 text-xs block font-semibold uppercase tracking-wider">Status</span>
                <div className="mt-1">
                  <PlanBadge type="status" value={status} />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <span className="text-slate-400 text-xs block font-semibold uppercase tracking-wider">Description</span>
              <p className="text-slate-600 text-sm mt-1 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                {description || "No description provided."}
              </p>
            </div>
          </div>

          {/* Pricing & Billing */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
              <DollarSign size={16} className="text-slate-500" />
              <span>Pricing & Billing</span>
            </h3>

            {plan_type.toLowerCase() === "free" ? (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 font-bold text-sm">
                This is a Free pricing tier. Tenants can subscribe without billing charges.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div>
                  <span className="text-slate-400 text-xs block font-semibold uppercase tracking-wider">Monthly Price</span>
                  <span className="text-xl font-black text-slate-800">
                    {symbol}
                    {formattedMonthly}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block font-semibold uppercase tracking-wider">Yearly Price</span>
                  <span className="text-xl font-black text-slate-800">
                    {symbol}
                    {formattedYearly}
                  </span>
                  {price_monthly > 0 && price_yearly > 0 && (
                    <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold ml-2">
                      Save {Math.round((1 - price_yearly / (price_monthly * 12)) * 100)}%
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 text-xs block font-semibold uppercase tracking-wider">Currency</span>
                  <span className="font-bold text-slate-800">{currency}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block font-semibold uppercase tracking-wider">Billing Cycle</span>
                  <span className="font-bold text-slate-800">{billing_cycle}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6 pt-2 text-sm border-t border-slate-100">
              <div>
                <span className="text-slate-400 text-xs block font-semibold uppercase tracking-wider">Trial Days</span>
                <span className="font-bold text-slate-800">
                  {trial_days === 0 ? "No trial" : `${trial_days} days`}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-xs block font-semibold uppercase tracking-wider">Sort Order</span>
                <span className="font-bold text-slate-800">{sort_order}</span>
              </div>
            </div>
          </div>

          {/* Usage Stats - Tenants list */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase size={16} className="text-slate-500" />
                <span>Tenant Subscribers</span>
              </div>
              <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full border border-slate-200">
                {totalTenantsCount} active
              </span>
            </h3>

            {tenantsList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-100">
                      <th className="px-4 py-2">Organization</th>
                      <th className="px-4 py-2">Administrator</th>
                      <th className="px-4 py-2">Subscription End</th>
                      <th className="px-4 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-700">
                    {tenantsList.map((tenant) => (
                      <tr key={tenant._id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2">
                          <div className="font-bold text-slate-900">{tenant.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{tenant.slug}</div>
                        </td>
                        <td className="px-4 py-2">
                          <div>{tenant.adminName}</div>
                          <div className="text-[10px] text-slate-400">{tenant.adminEmail}</div>
                        </td>
                        <td className="px-4 py-2 text-slate-500">
                          {tenant.plan_end_date
                            ? format(new Date(tenant.plan_end_date), "MMM dd, yyyy")
                            : "Unlimited"}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              tenant.plan_status === "active"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            }`}
                          >
                            {tenant.plan_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-400 text-xs italic py-2">
                No tenants are currently subscribed to this pricing tier.
              </p>
            )}
          </div>
        </div>

        {/* Sidebar limits summary panel */}
        <div className="space-y-6">
          <div className="bg-[#008ecc] text-white rounded-2xl shadow-sm border border-[#008ecc]/20 p-6 space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-100 border-b border-[#008ecc]/30 pb-3 flex items-center gap-2">
              <Users size={16} className="text-amber-300" />
              <span>Provision Limits</span>
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users size={16} className="text-blue-100" />
                  <span className="text-xs font-medium text-blue-50">Users/Tenant</span>
                </div>
                <span className="text-sm font-bold text-white">
                  {max_users_per_tenant === 0 ? "Unlimited" : max_users_per_tenant}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4 text-xs text-slate-600">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Calendar size={16} className="text-slate-500" />
              <span>Visibility Settings</span>
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span>Pricing Page Visibility</span>
                <span className="font-semibold flex items-center space-x-1">
                  {is_visible ? (
                    <span className="text-green-600 flex items-center">
                      <CheckCircle size={14} className="mr-1" /> Yes
                    </span>
                  ) : (
                    <span className="text-slate-400 flex items-center">
                      <XCircle size={14} className="mr-1" /> Hidden
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span>Marked Recommended</span>
                <span className="font-semibold">
                  {is_recommended ? (
                    <span className="text-amber-600 flex items-center">
                      <CheckCircle size={14} className="mr-1" /> Yes
                    </span>
                  ) : (
                    <span className="text-slate-400">No</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanDetail;
