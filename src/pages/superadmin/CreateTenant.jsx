import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, User, Mail, ShieldAlert, ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { superApi } from "../../services/api";
import { useGetAllPlans } from "../../hooks/useSubscriptionPlans";
import { format } from "date-fns";
import { assignPlanToTenant } from "../../api/services/subscriptionPlan.service";

const CreateTenant = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");

  const currencyOptions = [
    { code: "USD", symbol: "$", label: "🇺🇸 USD - US Dollar" },
    { code: "EUR", symbol: "€", label: "🇪🇺 EUR - Euro" },
    { code: "INR", symbol: "₹", label: "🇮🇳 INR - Indian Rupee" },
    { code: "GBP", symbol: "£", label: "🇬🇧 GBP - British Pound" },
    { code: "JPY", symbol: "¥", label: "🇯🇵 JPY - Japanese Yen" },
    { code: "AUD", symbol: "A$", label: "🇦🇺 AUD - Australian Dollar" },
    { code: "CAD", symbol: "C$", label: "🇨🇦 CAD - Canadian Dollar" },
    { code: "CHF", symbol: "CHF", label: "🇨🇭 CHF - Swiss Franc" },
    { code: "MYR", symbol: "RM", label: "🇲🇾 MYR - Malaysian Ringgit" },
    { code: "AED", symbol: "د.إ", label: "🇦🇪 AED - UAE Dirham" },
    { code: "SGD", symbol: "S$", label: "🇸🇬 SGD - Singapore Dollar" },
    { code: "ZAR", symbol: "R", label: "🇿🇦 ZAR - South African Rand" },
    { code: "SAR", symbol: "﷼", label: "🇸🇦 SAR - Saudi Riyal" },
  ];

  // Fetch active plans to display in the dropdown
  const { data: plansData, isLoading: loadingPlans } = useGetAllPlans({ status: "active" });
  const plans = plansData?.data || [];

  const handleNameChange = (val) => {
    setName(val);
  };

  const handleSlugChange = (val) => {
    const formatted = val
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");
    setSlug(formatted);
  };

  const handleCreateTenant = async (e) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim() || !adminName.trim() || !adminEmail.trim()) {
      setError("All fields are required.");
      return;
    }

    if (name.trim().length < 3) {
      setError("Organization Name must be at least 3 characters long.");
      return;
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      setError("Tenant Slug must only contain lowercase letters, numbers, and hyphens.");
      return;
    }

    if (adminName.trim().length < 2) {
      setError("Administrator Name must be at least 2 characters long.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      setError("Please enter a valid Administrator Email address.");
      return;
    }

    setError("");
    setEmailError("");
    setSubmitting(true);
    try {
      // 1. Provision new tenant organization
      const res = await superApi.post("/tenants/create", {
        name,
        slug,
        adminEmail,
        adminName,
        planId: selectedPlanId,
        currency,
      });

      const newTenant = res.data?.tenant || res.data?.data || res.data;

      // 2. If plan is selected, assign subscription plan to tenant
      if (newTenant && newTenant._id && selectedPlanId) {
        const selectedPlan = plans.find((p) => p._id === selectedPlanId);
        if (selectedPlan) {
          let cycle = "monthly";
          if (selectedPlan.billing_cycle) {
            cycle = selectedPlan.billing_cycle.toLowerCase().replace("-", "_");
          }

          await assignPlanToTenant({
            tenantId: newTenant._id,
            planId: selectedPlanId,
            billing_cycle: cycle,
          });
        }
      }

      // Clear fields & navigate
      setName("");
      setSlug("");
      setAdminName("");
      setAdminEmail("");
      setSelectedPlanId("");
      setCurrency("USD");
      navigate("/superadmin/tenants");
    } catch (err) {
      console.error("Failed to create tenant:", err);
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to provision database for new tenant.";

      if (/administrator email/i.test(message) || /adminEmail/i.test(message)) {
        setEmailError(message);
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate("/superadmin/tenants")}
          className="p-2 border border-slate-200 rounded-xl bg-white hover:border-[#008ecc]/45 hover:text-[#008ecc] text-slate-600 transition-all cursor-pointer shadow-sm"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Register New Tenant</h2>
          <p className="text-slate-500 text-sm">Provision a new isolated database and tenant organization.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm flex items-start space-x-2">
          <ShieldAlert className="flex-shrink-0 mt-0.5" size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid Form */}
      <form onSubmit={handleCreateTenant} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (2/3 width) - Info & Setup */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Organization setup card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex items-center space-x-2 text-slate-800">
              <Building2 className="text-[#008ecc]" size={22} />
              <h3 className="text-lg font-bold">Organization & Database Setup</h3>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Stark Industries"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Tenant Slug
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. stark-ind"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all font-mono text-xs shadow-inner bg-white text-slate-800 font-semibold"
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5 font-medium leading-relaxed">
                    Only lowercase letters, numbers, and hyphens are allowed. Spaces are automatically converted to hyphens.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Preferred Currency
                </label>
                <select
                  required
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all bg-white"
                >
                  {currencyOptions.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1.5 font-medium leading-relaxed">
                  This currency will be used as the default for all deals and leads under this tenant.
                </p>
              </div>
            </div>
          </div>

          {/* Admin user card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex items-center space-x-2 text-slate-800">
              <User className="text-[#008ecc]" size={20} />
              <h3 className="text-lg font-bold">Administrator Credentials</h3>
            </div>

            <div className="p-6 space-y-6">
              <div className="px-4 py-3 bg-[#f2fbff] border border-blue-100 rounded-xl flex items-start space-x-2 text-slate-600">
                <User className="flex-shrink-0 mt-0.5 text-[#008ecc]" size={16} />
                <span className="text-xs leading-relaxed">
                  This setup automatically spawns a dedicated database, registers Admin and Sales roles, and provisions the initial Administrator account below.
                </span>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Administrator Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Tony Stark"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Administrator Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="email"
                      required
                      placeholder="e.g. tony@stark.com"
                      value={adminEmail}
                      onChange={(e) => {
                        setAdminEmail(e.target.value);
                        if (emailError) setEmailError("");
                      }}
                      className={`w-full border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 transition-all shadow-inner ${
                        emailError
                          ? "border-red-300 focus:ring-red-400"
                          : "border-slate-300 focus:ring-[#008ecc]"
                      }`}
                    />
                  </div>
                  {emailError ? (
                    <p className="text-[11px] text-red-600 mt-1.5 font-semibold leading-relaxed">
                      {emailError}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1.5 font-medium leading-relaxed">
                      Must be a valid email address. The generated credentials and workspace login link will be dispatched here.
                    </p>
                  )}
                </div>

                {/* Auto-email notice */}
                <div className="flex items-start space-x-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <MailCheck className="flex-shrink-0 mt-0.5 text-emerald-600" size={16} />
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    A secure password will be <strong>auto-generated</strong> and emailed to the administrator along with their login credentials and a direct{" "}
                    <strong>Login to Dashboard</strong> link.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Form actions */}
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={() => navigate("/superadmin/tenants")}
              className="flex-1 py-3 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer text-sm bg-white shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all cursor-pointer text-sm shadow-md flex items-center justify-center space-x-2 animate-pulse-soft"
              style={{ backgroundColor: "#008ecc" }}
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Provisioning Database...</span>
                </>
              ) : (
                <span>Provision Organization</span>
              )}
            </button>
          </div>
        </div>

        {/* Right Column (1/3 width) - Subscription Selection & Preview */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-850 uppercase tracking-wider">Subscription Plan</h3>
              <p className="text-slate-400 text-xs mt-1">Assign a pricing plan to this tenant.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Select Pricing Tier
                </label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all bg-white"
                  disabled={loadingPlans}
                >
                  <option value="">No Plan (Default Trial)</option>
                  {plans.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.plan_name} ({p.plan_type.toUpperCase()} - {p.price_monthly > 0 ? `$${p.price_monthly.toFixed(2)}/mo` : "Free"})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Preview panel */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Subscription Preview</span>
              <span className="bg-[#f2fbff] text-[#008ecc] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-blue-100 uppercase tracking-wider">
                {selectedPlanId ? "Selected Plan" : "Default Trial"}
              </span>
            </div>

            <div className="p-6">
              {(() => {
                const selectedPlan = plans.find((p) => p._id === selectedPlanId);
                
                if (!selectedPlan) {
                  const start = new Date();
                  const end = new Date();
                  end.setDate(end.getDate() + 30);
                  return (
                    <div className="space-y-4 text-xs">
                      <div className="flex justify-between py-2.5 border-b border-slate-100">
                        <span className="text-slate-400">Plan Type</span>
                        <span className="font-bold text-slate-800 uppercase">Trial</span>
                      </div>
                      <div className="flex justify-between py-2.5 border-b border-slate-100">
                        <span className="text-slate-400">Pricing Cycle</span>
                        <span className="font-bold text-slate-800">Free Trial</span>
                      </div>
                      <div className="flex justify-between py-2.5 border-b border-slate-100">
                        <span className="text-slate-400">Seat Limits</span>
                        <span className="font-bold text-slate-800">5 Users</span>
                      </div>
                      <div className="py-2">
                        <span className="text-slate-400 block mb-1">Validity Period</span>
                        <span className="font-bold text-slate-800 block">
                          {format(start, "MMM dd, yyyy")}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">to {format(end, "MMM dd, yyyy")} (30 days)</span>
                      </div>
                    </div>
                  );
                }

                const symbol = selectedPlan.currency === "INR" ? "₹" : selectedPlan.currency === "EUR" ? "€" : selectedPlan.currency === "GBP" ? "£" : "$";
                const start = new Date();
                let endText = "Lifetime / Unlimited";
                
                if (selectedPlan.billing_cycle === "monthly") {
                  const end = new Date();
                  end.setMonth(end.getMonth() + 1);
                  endText = format(end, "MMM dd, yyyy");
                } else if (selectedPlan.billing_cycle === "yearly") {
                  const end = new Date();
                  end.setFullYear(end.getFullYear() + 1);
                  endText = format(end, "MMM dd, yyyy");
                } else if (selectedPlan.trial_days > 0) {
                  const end = new Date();
                  end.setDate(end.getDate() + selectedPlan.trial_days);
                  endText = format(end, "MMM dd, yyyy");
                }

                return (
                  <div className="space-y-4 text-xs">
                    <div className="flex justify-between py-2.5 border-b border-slate-100">
                      <span className="text-slate-400">Plan Type</span>
                      <span className="font-bold text-slate-800 uppercase">{selectedPlan.plan_type}</span>
                    </div>
                    <div className="flex justify-between py-2.5 border-b border-slate-100">
                      <span className="text-slate-400">Pricing Cycle</span>
                      <span className="font-bold text-slate-800">
                        {selectedPlan.plan_type === "free" ? "Free" : `${symbol}${selectedPlan.price_monthly.toFixed(2)} / ${selectedPlan.billing_cycle}`}
                      </span>
                    </div>
                    <div className="flex justify-between py-2.5 border-b border-slate-100">
                      <span className="text-slate-400">Seat Limits</span>
                      <span className="font-bold text-slate-800">
                        {selectedPlan.max_users_per_tenant === 0 ? "Unlimited Seats" : `${selectedPlan.max_users_per_tenant} Users`}
                      </span>
                    </div>
                    <div className="py-2">
                      <span className="text-slate-400 block mb-1">Validity Period</span>
                      <span className="font-bold text-slate-800 block">
                        {format(start, "MMM dd, yyyy")}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">to {endText}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

      </form>
    </div>
  );
};

export default CreateTenant;
