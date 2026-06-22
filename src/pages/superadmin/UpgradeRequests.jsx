import React, { useEffect, useState } from "react";
import { ArrowUpCircle, ShieldCheck } from "lucide-react";
import { superApi } from "../../services/api";
import { format } from "date-fns";
import { toast } from "react-toastify";

const UpgradeRequests = () => {
  const [upgradeRequests, setUpgradeRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const fetchUpgradeRequests = async () => {
    setLoading(true);
    try {
      const upgradesRes = await superApi.get("/tenants/upgrade-requests");
      if (upgradesRes.data?.success) {
        setUpgradeRequests(upgradesRes.data.requests || []);
      } else {
        setUpgradeRequests([]);
      }
    } catch (err) {
      console.error("Failed to load upgrade requests:", err);
      toast.error("Unable to load upgrade requests list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpgradeRequests();
  }, []);

  const handleApproveUpgrade = async (id) => {
    if (!window.confirm("Are you sure you want to approve this upgrade request? The tenant's plan will be upgraded and new credentials will be sent via email.")) {
      return;
    }
    setProcessingId(id);
    try {
      const res = await superApi.post(`/tenants/upgrade-approve/${id}`);
      if (res.data?.success) {
        toast.success("Upgrade approved successfully! New credentials sent via email.");
        // Refresh list
        await fetchUpgradeRequests();
      } else {
        toast.error(res.data?.error || "Error approving upgrade request.");
      }
    } catch (err) {
      console.error("Failed to approve upgrade request:", err);
      toast.error(err.response?.data?.error || "Error approving upgrade request.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Pending Upgrade Requests</h2>
        <p className="text-slate-500 text-sm">Review, verify pricing, and approve plan upgradations submitted by tenant admins.</p>
      </div>

      {/* Upgrade Requests Table */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center space-x-2">
          <ArrowUpCircle className="text-[#008ecc]" size={20} />
          <h3 className="text-base font-bold text-slate-800">Pending Upgrade Requests</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 uppercase text-xs font-bold border-b border-slate-200">
                <th className="px-6 py-4">Tenant Info</th>
                <th className="px-6 py-4">Requested Plan</th>
                <th className="px-6 py-4">Seats</th>
                <th className="px-6 py-4">Validity</th>
                <th className="px-6 py-4">Start Date</th>
                <th className="px-6 py-4">End Date</th>
                <th className="px-6 py-4">Upgrade Type</th>
                <th className="px-6 py-4">Final Price</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-[#008ecc] border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : upgradeRequests.length > 0 ? (
                upgradeRequests.map((req) => {
                  const startDate = new Date(req.createdAt);
                  const endDate = new Date(startDate.getTime() + req.login_days * 24 * 60 * 60 * 1000);

                  return (
                    <tr key={req._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{req.tenant_id?.name || "N/A"}</span>
                          <span className="text-xs text-slate-500 font-mono">Slug: {req.tenant_id?.slug}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 uppercase">
                        {req.plan_id?.plan_name || "N/A"}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        {req.wanted_users} Seats
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        {req.login_days} Days
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {format(startDate, "MMM dd, yyyy")}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-semibold">
                        {format(endDate, "MMM dd, yyyy")}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold border uppercase ${
                          req.type === "mid_cycle"
                            ? "bg-blue-50 text-blue-700 border-blue-100"
                            : "bg-amber-50 text-amber-700 border-amber-100"
                        }`}>
                          {req.type === "mid_cycle" ? "Mid-Cycle" : "Expired"}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-extrabold text-[#008ecc] text-base">
                        {req.final_price === 0 ? "Free / Custom" : `$${req.final_price.toFixed(2)}`}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleApproveUpgrade(req._id)}
                          disabled={processingId === req._id}
                          className="px-4 py-1.5 bg-[#008ecc] text-white rounded-lg font-bold text-xs hover:bg-[#007bb0] disabled:opacity-50 transition cursor-pointer shadow-sm"
                        >
                          {processingId === req._id ? "Approving..." : "Approve Upgrade"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400 font-semibold">
                    No pending plan upgrade requests at present.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UpgradeRequests;
