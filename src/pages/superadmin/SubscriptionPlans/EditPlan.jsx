import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, AlertCircle, RefreshCw } from "lucide-react";
import {
  useGetPlanById,
  useUpdatePlan,
  useGetAllPlans,
  useGetTenantSubscriptions,
} from "../../../hooks/useSubscriptionPlans";
import PlanForm from "../../../components/superadmin/plans/PlanForm";
import PlanSkeleton from "../../../components/superadmin/plans/PlanSkeleton";

const EditPlan = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Fetch plan details by ID
  const {
    data: planData,
    isLoading: isPlanLoading,
    isError: isPlanError,
    error: planError,
    refetch: refetchPlan,
  } = useGetPlanById(id);

  // Fetch tenant subscriptions to check if any tenant is actively on this plan
  const { data: tenantData, isLoading: isTenantsLoading } = useGetTenantSubscriptions({
    plan_id: id,
    plan_status: "active",
  });

  // Fetch all plans to check if another plan is recommended (for recommendation warnings)
  const { data: plansData } = useGetAllPlans({ limit: 100 });

  // Update plan mutation
  const { mutate: updatePlan, isPending: submitting } = useUpdatePlan();

  const plan = planData?.data;
  const isCodeDisabled = (tenantData?.pagination?.total || 0) > 0;

  // Filter out the current plan being edited and check if another recommended plan exists
  const hasRecommendedPlan =
    plansData?.data?.some((p) => p.is_recommended && p._id !== id) || false;

  const handleSubmit = (formData) => {
    // Clean up price fields if Free plan
    const payload = { ...formData };
    if (payload.plan_type === "free") {
      payload.price_monthly = 0;
      payload.price_yearly = 0;
    }

    updatePlan(
      { id, data: payload },
      {
        onSuccess: () => {
          navigate("/superadmin/subscription-plans");
        },
      }
    );
  };

  const isLoading = isPlanLoading || isTenantsLoading;

  return (
    <div className="space-y-6">
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
        <span className="text-slate-600">Edit plan</span>
      </nav>

      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate("/superadmin/subscription-plans")}
          className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-600 transition-all cursor-pointer shadow-sm"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Edit Subscription Plan</h2>
          <p className="text-slate-500 text-sm">Update plan limits, status, pricing, and visibility.</p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="mt-6 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-pulse space-y-6">
            <div className="h-6 bg-slate-200 rounded w-1/4" />
            <div className="grid grid-cols-2 gap-6">
              <div className="h-10 bg-slate-100 rounded" />
              <div className="h-10 bg-slate-100 rounded" />
            </div>
            <div className="h-32 bg-slate-100 rounded" />
          </div>
        </div>
      )}

      {/* Error State */}
      {!isLoading && isPlanError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-3 mt-6">
          <AlertCircle className="text-red-500" size={40} />
          <div>
            <h3 className="font-bold text-red-800">Failed to load plan details</h3>
            <p className="text-red-600 text-sm mt-1">
              {planError?.response?.data?.error || planError.message || "Plan not found."}
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => navigate("/superadmin/subscription-plans")}
              className="px-4 py-2 border border-slate-300 text-slate-700 bg-white rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              Back to List
            </button>
            <button
              onClick={() => refetchPlan()}
              className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition-colors shadow"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Edit Form */}
      {!isLoading && !isPlanError && plan && (
        <div className="mt-6">
          <PlanForm
            initialData={plan}
            onSubmit={handleSubmit}
            submitting={submitting}
            isEditMode={true}
            isCodeDisabled={isCodeDisabled}
            hasRecommendedPlan={hasRecommendedPlan}
          />
        </div>
      )}
    </div>
  );
};

export default EditPlan;
