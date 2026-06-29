import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, RefreshCw, AlertCircle, CreditCard } from "lucide-react";
import { useGetAllPlans, useDeletePlan } from "../../../hooks/useSubscriptionPlans";
import PlanCard from "../../../components/superadmin/plans/PlanCard";
import PlanSkeleton from "../../../components/superadmin/plans/PlanSkeleton";
import PlanDeleteModal from "../../../components/superadmin/plans/PlanDeleteModal";

const SubscriptionPlans = () => {
  const navigate = useNavigate();

  // Filters State
  const [status, setStatus] = useState("");
  const [planType, setPlanType] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Fetch plans using custom query hook
  // We use limit 100 for superadmin dashboard to display all plans
  const {
    data: plansData,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetAllPlans({
    status: status || undefined,
    plan_type: planType || undefined,
    limit: 100,
  });

  // Deletion mutation
  const { mutate: deletePlan, isPending: isDeleting } = useDeletePlan();

  // Client side search by plan name
  const filteredPlans = useMemo(() => {
    const plansList = plansData?.data || [];
    if (!searchQuery.trim()) return plansList;

    const query = searchQuery.toLowerCase();
    return plansList.filter((plan) =>
      plan.plan_name?.toLowerCase().includes(query)
    );
  }, [plansData, searchQuery]);

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deletePlan(deleteTarget._id, {
      onSuccess: () => {
        setDeleteTarget(null);
      },
    });
  };

  const handleCreateRedirect = () => {
    navigate("/superadmin/subscription-plans/create");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center space-x-2">
            <CreditCard className="text-[#008ecc]" size={24} />
            <span>Subscription plans</span>
          </h2>
          <p className="text-slate-500 text-sm">Manage SaaS pricing tiers</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => refetch()}
            className="p-2.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-600 transition-all cursor-pointer shadow-sm"
            title="Refresh plans list"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={handleCreateRedirect}
            className="flex items-center space-x-2 px-4 py-2.5 bg-[#008ecc] text-white rounded-xl font-semibold hover:bg-[#007bb0] transition-all shadow-md cursor-pointer text-sm"
          >
            <Plus size={18} />
            <span>Create plan</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row items-center gap-4">
        {/* Search Input */}
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by plan name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] focus:border-transparent bg-white shadow-inner"
          />
        </div>

        {/* Status Dropdown */}
        <div className="w-full md:w-48">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] bg-white"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Plan Type Dropdown */}
        <div className="w-full md:w-48">
          <select
            value={planType}
            onChange={(e) => setPlanType(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] bg-white"
          >
            <option value="">All Plan Types</option>
            <option value="free">Free</option>
            <option value="paid">Paid</option>
            <option value="trial">Trial</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
          <AlertCircle className="text-red-500" size={40} />
          <div>
            <h3 className="font-bold text-red-800">Failed to load subscription plans</h3>
            <p className="text-red-600 text-sm mt-1">{error?.response?.data?.error || error.message || "An unexpected error occurred."}</p>
          </div>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition-colors shadow"
          >
            Retry Fetching
          </button>
        </div>
      )}

      {/* Main Card Grid */}
      {!isError && (
        <>
          {isLoading ? (
            <PlanSkeleton count={3} />
          ) : filteredPlans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPlans.map((plan) => (
                <PlanCard
                  key={plan._id}
                  plan={plan}
                  onView={(id) => navigate(`/superadmin/subscription-plans/${id}`)}
                  onEdit={(id) => navigate(`/superadmin/subscription-plans/${id}/edit`)}
                  onDelete={(p) => setDeleteTarget(p)}
                />
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 py-16 px-6 flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-5">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner">
                <CreditCard className="text-slate-400" size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-800 text-lg">No subscription plans found</h3>
                <p className="text-slate-500 text-sm">
                  Create your first plan to start provisioning SaaS tiers for your tenants.
                </p>
              </div>
              <button
                onClick={handleCreateRedirect}
                className="px-5 py-2.5 bg-[#008ecc] hover:bg-[#007bb0] text-white font-semibold rounded-xl text-sm transition-all shadow-md"
              >
                Create First Plan
              </button>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      <PlanDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        planName={deleteTarget?.plan_name || ""}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default SubscriptionPlans;
