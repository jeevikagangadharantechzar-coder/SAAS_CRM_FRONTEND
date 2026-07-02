import React, { useEffect, useState } from "react";
import { ArrowUpCircle, History, Clock, CheckCircle2, XCircle } from "lucide-react";
import { superApi } from "../../services/api";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { getSuperAdminSocket } from "../../utils/superAdminSocket";

const UpgradeRequests = () => {
  const [activeTab, setActiveTab] = useState("pending");
  const [upgradeRequests, setUpgradeRequests] = useState([]);
  const [historyRequests, setHistoryRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  // Rejection states
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingRequestData, setRejectingRequestData] = useState(null);

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

  const fetchUpgradeHistory = async () => {
    setHistoryLoading(true);
    try {
      const historyRes = await superApi.get("/tenants/upgrade-history");
      if (historyRes.data?.success) {
        setHistoryRequests(historyRes.data.history || []);
      } else {
        setHistoryRequests([]);
      }
    } catch (err) {
      console.error("Failed to load upgrade history:", err);
      toast.error("Unable to load upgrade history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "pending") {
      fetchUpgradeRequests();
    } else {
      fetchUpgradeHistory();
    }
  }, [activeTab]);

  // Socket — real-time list updates
  useEffect(() => {
    const socket = getSuperAdminSocket();
    if (!socket) return;

    const onNewRequest = (newReq) => {
      setUpgradeRequests((prev) => [newReq, ...prev]);
    };

    const onResolved = ({ id }) => {
      setUpgradeRequests((prev) => prev.filter((r) => r._id !== id));
    };

    socket.on("new_upgrade_request", onNewRequest);
    socket.on("upgrade_request_resolved", onResolved);

    return () => {
      socket.off("new_upgrade_request", onNewRequest);
      socket.off("upgrade_request_resolved", onResolved);
    };
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

  const handleRejectClick = (req) => {
    setRejectingId(req._id);
    setRejectingRequestData(req);
    setRejectReason("");
    setIsRejectModalOpen(true);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection.");
      return;
    }

    setProcessingId(rejectingId);
    try {
      const res = await superApi.post(`/tenants/upgrade-reject/${rejectingId}`, {
        reason: rejectReason,
      });
      if (res.data?.success) {
        toast.success("Upgrade request rejected and email notification sent to tenant.");
        setIsRejectModalOpen(false);
        setRejectingId(null);
        setRejectingRequestData(null);
        setRejectReason("");
      } else {
        toast.error(res.data?.error || "Error rejecting upgrade request.");
      }
    } catch (err) {
      console.error("Failed to reject upgrade request:", err);
      toast.error(err.response?.data?.error || "Error rejecting upgrade request.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Upgrade Requests</h2>
          <p className="text-slate-500 text-sm">Review, verify pricing, and manage plan upgrade requests submitted by tenant admins.</p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-150 p-1 rounded-xl border border-slate-200 self-start md:self-auto" style={{ backgroundColor: "#f1f5f9" }}>
          <button
            onClick={() => setActiveTab("pending")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "pending"
                ? "bg-white text-slate-800 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Clock size={16} />
            <span>Pending Requests</span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "history"
                ? "bg-white text-slate-800 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <History size={16} />
            <span>Upgrade History</span>
          </button>
        </div>
      </div>

      {activeTab === "pending" ? (
        /* Upgrade Requests Table */
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
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleApproveUpgrade(req._id)}
                              disabled={processingId !== null}
                              className="px-3 py-1.5 bg-[#008ecc] text-white rounded-lg font-bold text-xs hover:bg-[#007bb0] disabled:opacity-50 transition cursor-pointer shadow-sm whitespace-nowrap"
                            >
                              {processingId === req._id ? "Approving..." : "Approve"}
                            </button>
                            <button
                              onClick={() => handleRejectClick(req)}
                              disabled={processingId !== null}
                              className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg font-bold text-xs hover:bg-red-100 hover:text-red-700 disabled:opacity-50 transition cursor-pointer shadow-sm whitespace-nowrap"
                            >
                              Reject
                            </button>
                          </div>
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
      ) : (
        /* Upgrade History Table */
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center space-x-2">
            <History className="text-[#008ecc]" size={20} />
            <h3 className="text-base font-bold text-slate-800">Processed Upgrade History</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 text-slate-500 uppercase text-xs font-bold border-b border-slate-200">
                  <th className="px-6 py-4">Tenant Info</th>
                  <th className="px-6 py-4">Upgraded Plan</th>
                  <th className="px-6 py-4">Seats</th>
                  <th className="px-6 py-4">Validity</th>
                  <th className="px-6 py-4">Requested On</th>
                  <th className="px-6 py-4">Processed On</th>
                  <th className="px-6 py-4">Final Price</th>
                  <th className="px-6 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                {historyLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                      <div className="w-6 h-6 border-2 border-[#008ecc] border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </td>
                  </tr>
                ) : historyRequests.length > 0 ? (
                  historyRequests.map((req) => {
                    const requestedDate = new Date(req.createdAt);
                    const processedDate = new Date(req.updatedAt);

                    return (
                      <tr key={req._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{req.tenant_id?.name || "N/A"}</span>
                            <span className="text-xs text-slate-500 font-mono">Slug: {req.tenant_id?.slug}</span>
                            {req.status === "rejected" && req.rejection_reason && (
                              <span className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-2 py-0.5 mt-1.5 w-fit font-semibold max-w-xs break-words">
                                Reason: {req.rejection_reason}
                              </span>
                            )}
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
                          {format(requestedDate, "MMM dd, yyyy")}
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {format(processedDate, "MMM dd, yyyy")}
                        </td>
                        <td className="px-6 py-4 font-extrabold text-[#008ecc] text-base">
                          {req.final_price === 0 ? "Free / Custom" : `$${req.final_price.toFixed(2)}`}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border gap-1 uppercase ${
                            req.status === "approved"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }`}>
                            {req.status === "approved" ? (
                              <CheckCircle2 size={12} className="text-green-500" />
                            ) : (
                              <XCircle size={12} className="text-red-500" />
                            )}
                            {req.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-semibold">
                      No upgrade request history available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Upgrade Request Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-250">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-red-600">
                <XCircle size={20} />
                <h3 className="text-base font-bold text-slate-800">Reject Upgrade Request</h3>
              </div>
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <XCircle size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleRejectSubmit} className="p-6 space-y-4">
              {rejectingRequestData && (
                <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 border border-slate-100 space-y-1">
                  <div>
                    <strong>Tenant:</strong> {rejectingRequestData.tenant_id?.name} ({rejectingRequestData.tenant_id?.slug})
                  </div>
                  <div>
                    <strong>Requested Plan:</strong> {rejectingRequestData.plan_id?.plan_name}
                  </div>
                  <div>
                    <strong>Requested Seats & Days:</strong> {rejectingRequestData.wanted_users} Seats / {rejectingRequestData.login_days} Days
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter the reason why this plan upgrade is being rejected. This note will be emailed directly to the tenant administrator..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-red-400 focus:bg-white transition-colors resize-none text-slate-800"
                ></textarea>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingId !== null}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition cursor-pointer disabled:opacity-50"
                >
                  {processingId ? "Rejecting..." : "Reject Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpgradeRequests;
