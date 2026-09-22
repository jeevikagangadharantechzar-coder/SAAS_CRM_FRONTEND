import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, RefreshCw, AlertCircle, CreditCard, Filter, ChevronDown, SlidersHorizontal, Check } from "lucide-react";
import { useGetAllPlans, useDeletePlan } from "../../../hooks/useSubscriptionPlans";
import PlanCard from "../../../components/superadmin/plans/PlanCard";
import PlanSkeleton from "../../../components/superadmin/plans/PlanSkeleton";
import PlanDeleteModal from "../../../components/superadmin/plans/PlanDeleteModal";

const FILTER_FIELDS = [
  { key: "search", label: "Search" },
  { key: "status", label: "Status" },
  { key: "planType", label: "Plan Type" },
  { key: "billingCycle", label: "Billing Cycle" },
  { key: "currency", label: "Currency" },
  { key: "recommended", label: "Recommended" },
];

const FILTER_FIELDS_STORAGE_KEY = "superadmin_subscriptionplans_filter_fields";

const SubscriptionPlans = () => {
  const navigate = useNavigate();

  // Filters State
  const [status, setStatus] = useState("");
  const [planType, setPlanType] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [billingCycleFilter, setBillingCycleFilter] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("");
  const [recommendedFilter, setRecommendedFilter] = useState("");

  const [showFilters, setShowFilters] = useState(false);
  const [activeFilterFields, setActiveFilterFields] = useState(() => {
    try {
      const saved = localStorage.getItem(FILTER_FIELDS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore malformed/inaccessible localStorage, fall back to default
    }
    return FILTER_FIELDS.map((f) => f.key);
  });
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const fieldPickerRef = useRef(null);

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

  const currencyOptions = useMemo(() => {
    const plansList = plansData?.data || [];
    return Array.from(new Set(plansList.map((p) => p.currency).filter(Boolean))).sort();
  }, [plansData]);

  // Client side search + billing cycle/currency/recommended filters (status
  // and plan_type are already applied server-side via useGetAllPlans above)
  const filteredPlans = useMemo(() => {
    const plansList = plansData?.data || [];
    const query = searchQuery.trim().toLowerCase();

    return plansList.filter((plan) => {
      const matchesQuery = !query || plan.plan_name?.toLowerCase().includes(query);
      const matchesBillingCycle = !billingCycleFilter || plan.billing_cycle === billingCycleFilter;
      const matchesCurrency = !currencyFilter || plan.currency === currencyFilter;
      const matchesRecommended =
        !recommendedFilter ||
        (recommendedFilter === "yes" ? !!plan.is_recommended : !plan.is_recommended);

      return matchesQuery && matchesBillingCycle && matchesCurrency && matchesRecommended;
    });
  }, [plansData, searchQuery, billingCycleFilter, currencyFilter, recommendedFilter]);

  useEffect(() => {
    try {
      localStorage.setItem(FILTER_FIELDS_STORAGE_KEY, JSON.stringify(activeFilterFields));
    } catch {
      // ignore write failures (private browsing, storage disabled, etc.)
    }
  }, [activeFilterFields]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (fieldPickerRef.current && !fieldPickerRef.current.contains(e.target)) {
        setShowFieldPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const resetFieldValue = (key) => {
    if (key === "search") setSearchQuery("");
    if (key === "status") setStatus("");
    if (key === "planType") setPlanType("");
    if (key === "billingCycle") setBillingCycleFilter("");
    if (key === "currency") setCurrencyFilter("");
    if (key === "recommended") setRecommendedFilter("");
  };

  const toggleFilterField = (key) => {
    setActiveFilterFields((prev) => {
      if (prev.includes(key)) {
        resetFieldValue(key);
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
  };

  const areAllFieldsSelected = FILTER_FIELDS.every((field) => activeFilterFields.includes(field.key));

  const handleSelectAllFields = () => {
    if (areAllFieldsSelected) {
      FILTER_FIELDS.forEach((field) => resetFieldValue(field.key));
      setActiveFilterFields([]);
    } else {
      setActiveFilterFields(FILTER_FIELDS.map((f) => f.key));
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatus("");
    setPlanType("");
    setBillingCycleFilter("");
    setCurrencyFilter("");
    setRecommendedFilter("");
  };

  const hasActiveFilters =
    searchQuery !== "" ||
    status !== "" ||
    planType !== "" ||
    billingCycleFilter !== "" ||
    currencyFilter !== "" ||
    recommendedFilter !== "";

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
          <h2 className="text-slate-900 dark:text-white flex items-center space-x-2">
            <CreditCard className="text-[#008ecc] dark:text-[#33b8ff]" size={24} />
            <span>Subscription plans</span>
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-400">Manage SaaS pricing tiers</p>
        </div>

        <div className="flex items-center space-x-3">
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md font-medium text-sm transition-colors border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer"
            >
              <Filter className="w-4 h-4" />
              <span>Plan Filter</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </button>

            <div className="relative" ref={fieldPickerRef}>
              <button
                onClick={() => setShowFieldPicker((v) => !v)}
                title="Choose which filters to show"
                className="flex items-center gap-2 px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md font-medium text-sm transition-colors border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Customize</span>
              </button>

              {showFieldPicker && (
                <div className="absolute left-0 z-20 mt-1 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                    Filters to show
                  </div>
                  <button
                    onClick={handleSelectAllFields}
                    className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold text-[#008ecc] hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-100 dark:border-slate-700"
                  >
                    <span>{areAllFieldsSelected ? "Deselect All" : "Select All"}</span>
                    <span
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        areAllFieldsSelected
                          ? "bg-[#008ecc] border-[#008ecc] text-white"
                          : "border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      {areAllFieldsSelected && <Check className="w-3 h-3" />}
                    </span>
                  </button>
                  {FILTER_FIELDS.map((field) => {
                    const isActive = activeFilterFields.includes(field.key);
                    return (
                      <button
                        key={field.key}
                        onClick={() => toggleFilterField(field.key)}
                        className="flex items-center justify-between w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                      >
                        <span>{field.label}</span>
                        <span
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isActive
                              ? "bg-[#008ecc] border-[#008ecc] text-white"
                              : "border-slate-300 dark:border-slate-600"
                          }`}
                        >
                          {isActive && <Check className="w-3 h-3" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-[#008ecc] hover:underline cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>

        {showFilters && (
          <div className="p-5 pt-0 animate-in fade-in slide-in-from-top-2 duration-200">
            {activeFilterFields.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No filters selected. Click <strong>Customize</strong> to add filters.
              </p>
            ) : (
              <div className="flex flex-col md:flex-row md:flex-wrap items-stretch md:items-center gap-4">
                {activeFilterFields.includes("search") && (
                  <div className="relative w-full md:flex-1 md:min-w-[220px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                    <input
                      type="text"
                      placeholder="Search by plan name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] focus:border-transparent bg-white dark:bg-slate-900 shadow-inner"
                    />
                  </div>
                )}

                {activeFilterFields.includes("status") && (
                  <div className="w-full md:w-48">
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] bg-white dark:bg-slate-900 cursor-pointer"
                    >
                      <option value="">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                )}

                {activeFilterFields.includes("planType") && (
                  <div className="w-full md:w-48">
                    <select
                      value={planType}
                      onChange={(e) => setPlanType(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] bg-white dark:bg-slate-900 cursor-pointer"
                    >
                      <option value="">All Plan Types</option>
                      <option value="free">Free</option>
                      <option value="paid">Paid</option>
                      <option value="trial">Trial</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                )}

                {activeFilterFields.includes("billingCycle") && (
                  <div className="w-full md:w-48">
                    <select
                      value={billingCycleFilter}
                      onChange={(e) => setBillingCycleFilter(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] bg-white dark:bg-slate-900 cursor-pointer"
                    >
                      <option value="">All Billing Cycles</option>
                      <option value="monthly">Monthly</option>
                      <option value="half_yearly">Half Year</option>
                      <option value="yearly">Yearly</option>
                      <option value="one_time">One-time</option>
                    </select>
                  </div>
                )}

                {activeFilterFields.includes("currency") && (
                  <div className="w-full md:w-40">
                    <select
                      value={currencyFilter}
                      onChange={(e) => setCurrencyFilter(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] bg-white dark:bg-slate-900 cursor-pointer"
                    >
                      <option value="">All Currencies</option>
                      {currencyOptions.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {activeFilterFields.includes("recommended") && (
                  <div className="w-full md:w-48">
                    <select
                      value={recommendedFilter}
                      onChange={(e) => setRecommendedFilter(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] bg-white dark:bg-slate-900 cursor-pointer"
                    >
                      <option value="">All Plans</option>
                      <option value="yes">Recommended Only</option>
                      <option value="no">Not Recommended</option>
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error State */}
      {isError && (
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
          <AlertCircle className="text-red-500" size={40} />
          <div>
            <h3 className="text-red-800">Failed to load subscription plans</h3>
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
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 py-16 px-6 flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-5">
              <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800/80 flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-inner">
                <CreditCard className="text-slate-400 dark:text-slate-500" size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="text-slate-700 dark:text-slate-300">No subscription plans found</h3>
                <p className="text-base text-slate-600 dark:text-slate-400">
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
