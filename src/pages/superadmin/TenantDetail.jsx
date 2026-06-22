import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, User, Mail, Calendar, Key, ShieldCheck, UserCheck, CreditCard } from "lucide-react";
import { superApi } from "../../services/api";
import { format } from "date-fns";
import { toast } from "react-toastify";

const TenantDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTenantDetails = async () => {
      try {
        const res = await superApi.get(`/tenants/${id}`);
        if (res.data?.success) {
          setTenant(res.data.tenant);
          setHistory(res.data.history || []);
        } else {
          toast.error("Failed to load details");
        }
      } catch (err) {
        console.error("Fetch tenant details failed:", err);
        toast.error("Database connection issue. Unable to fetch tenant detail.");
      } finally {
        setLoading(false);
      }
    };

    fetchTenantDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-[#008ecc] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 font-semibold">Tenant details not found.</p>
      </div>
    );
  }

  // Derive previous plan: first request is current plan, second request is previous plan
  const previousPlan = history.length > 1 ? history[1]?.plan_id : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate("/superadmin/tenants")}
          className="p-2 border border-slate-200 rounded-xl bg-white hover:border-[#008ecc]/45 hover:text-[#008ecc] text-slate-600 transition-all cursor-pointer shadow-sm animate-in fade-in"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{tenant.name} Details</h2>
          <p className="text-slate-500 text-sm">Review full parameters and subscription metrics for this CRM workspace.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core parameters */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex items-center space-x-2 text-slate-800">
              <Building2 className="text-[#008ecc]" size={20} />
              <h3 className="text-lg font-bold">Workspace Configuration</h3>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-1">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Organization Name</span>
                <span className="text-slate-800 font-bold text-base">{tenant.name}</span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Database Identifier</span>
                <span className="font-mono text-[#008ecc] font-bold bg-[#f2fbff] border border-blue-100 rounded px-2.5 py-0.5 inline-block">{tenant.dbName}</span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Tenant Slug</span>
                <span className="font-mono text-slate-700 bg-slate-50 border border-slate-250 rounded px-2 py-0.5 inline-block">{tenant.slug}</span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Administrator Name</span>
                <span className="text-slate-800 font-semibold">{tenant.adminName}</span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Administrator Email</span>
                <span className="text-slate-800 font-semibold">{tenant.adminEmail}</span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Active Status</span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                  tenant.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"
                }`}>
                  {tenant.isActive ? "Live" : "Inactive"}
                </span>
              </div>
            </div>
          </div>

          {/* Database active statistics */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex items-center space-x-2 text-slate-800">
              <UserCheck className="text-[#008ecc]" size={20} />
              <h3 className="text-lg font-bold">Active Statistics</h3>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-1">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Current Seats Used</span>
                <span className="text-2xl font-bold text-slate-800">{tenant.activeUsersCount} Users</span>
              </div>
              
              <div className="space-y-1">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Seat Limits</span>
                <span className="text-2xl font-bold text-slate-800">
                  {tenant.plan_id?.max_users_per_tenant === 0 ? "Unlimited Seats" : `${tenant.plan_id?.max_users_per_tenant || 5} Users`}
                </span>
              </div>
            </div>
          </div>

          {/* Plan History Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex items-center space-x-2 text-slate-800">
              <CreditCard className="text-[#008ecc]" size={20} />
              <h3 className="text-lg font-bold">Plans History Log</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-600">
                <thead className="bg-slate-50/70 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Approval Date</th>
                    <th className="px-6 py-4">Plan Name</th>
                    <th className="px-6 py-4">Seats Allocated</th>
                    <th className="px-6 py-4">Price Paid</th>
                    <th className="px-6 py-4">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.length > 0 ? (
                    history.map((h) => (
                      <tr key={h._id} className="hover:bg-slate-50/50 transition">
                        <td className="px-6 py-4 font-medium whitespace-nowrap">
                          {format(new Date(h.updatedAt), "MMM dd, yyyy HH:mm")}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900 uppercase">
                          {h.plan_id?.plan_name || "Unknown Tier"}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-700">
                          {h.wanted_users} Seats
                        </td>
                        <td className="px-6 py-4 font-extrabold text-[#008ecc]">
                          {h.final_price === 0 ? "Free / Custom" : `$${h.final_price.toFixed(2)}`}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                            h.type === "mid_cycle" ? "bg-cyan-50 text-cyan-700 border-cyan-200" : "bg-purple-50 text-purple-700 border-purple-200"
                          }`}>
                            {h.type === "mid_cycle" ? "Mid-Cycle" : "Expired / Limit"}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-slate-400 font-medium">
                        No previous plan activations found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Subscription Plan details */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
              <CreditCard className="text-[#008ecc]" size={20} />
              <h3 className="text-sm font-bold text-slate-850 uppercase tracking-wider">Plan Boundaries</h3>
            </div>

            <div className="space-y-4 text-xs font-medium">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-400">Current Plan</span>
                <span className="font-bold text-[#008ecc] uppercase">{tenant.plan_id?.plan_name || "Trial / Free"}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-400">Previous Plan</span>
                <span className="font-bold text-slate-700 uppercase">{previousPlan?.plan_name || "None (First Plan)"}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-400">Plan Type</span>
                <span className="font-bold text-slate-800 uppercase">{tenant.plan_id?.plan_type || "free"}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-400">Billing Cycle</span>
                <span className="font-bold text-slate-800 uppercase">{tenant.plan_id?.billing_cycle || "monthly"}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-400">Plan Start Date</span>
                <span className="font-bold text-slate-800">
                  {tenant.plan_start_date ? format(new Date(tenant.plan_start_date), "MMM dd, yyyy") : "N/A"}
                </span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-400">Plan Expiry Date</span>
                <span className="font-bold text-slate-800">
                  {tenant.plan_end_date ? format(new Date(tenant.plan_end_date), "MMM dd, yyyy") : "Lifetime"}
                </span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-400">Status</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                  tenant.plan_status === "active" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                }`}>
                  {tenant.plan_status}
                </span>
              </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default TenantDetail;
