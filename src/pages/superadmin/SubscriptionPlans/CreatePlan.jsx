import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useCreatePlan, useGetAllPlans } from "../../../hooks/useSubscriptionPlans";
import PlanForm from "../../../components/superadmin/plans/PlanForm";

const CreatePlan = () => {
  const navigate = useNavigate();
  const { mutate: createPlan, isPending: submitting } = useCreatePlan();

  // Fetch all plans to check if any plan is already marked as recommended
  const { data: plansData } = useGetAllPlans({ limit: 100 });
  const hasRecommendedPlan = plansData?.data?.some((plan) => plan.is_recommended) || false;

  const handleSubmit = (formData) => {
    // Clean up empty strings or nulls for prices when plan_type is free
    const payload = { ...formData };
    if (payload.plan_type === "free") {
      payload.price_monthly = 0;
      payload.price_yearly = 0;
    }

    createPlan(payload, {
      onSuccess: () => {
        navigate("/superadmin/subscription-plans");
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
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
        <span className="text-slate-600">Create plan</span>
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
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Create Subscription Plan</h2>
          <p className="text-slate-500 text-sm">Add a new SaaS pricing tier and access limits.</p>
        </div>
      </div>

      {/* Plan Form Container */}
      <div className="mt-6">
        <PlanForm
          onSubmit={handleSubmit}
          submitting={submitting}
          hasRecommendedPlan={hasRecommendedPlan}
        />
      </div>
    </div>
  );
};

export default CreatePlan;
