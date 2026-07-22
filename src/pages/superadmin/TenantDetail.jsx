import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Building2, User, Mail, Calendar, Key, ShieldCheck, UserCheck, CreditCard,
  ScrollText, Search, RefreshCw, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, Download,
} from "lucide-react";
import { superApi } from "../../services/api";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { exportRowsToExcel } from "../../utils/excelImportExport";

const LOG_PAGE_SIZE = 25;

const LOG_EXPORT_COLUMNS = [
  { key: "timestamp", label: "Timestamp", type: "date" },
  { key: "method", label: "Method" },
  { key: "endpoint", label: "Endpoint", wrap: true },
  { key: "userName", label: "User" },
  { key: "userRole", label: "Role" },
  { key: "module", label: "Module" },
  { key: "action", label: "Action" },
  { key: "status", label: "Status" },
  { key: "statusCode", label: "Status Code", type: "number" },
  { key: "responseTimeMs", label: "Response Time (ms)", type: "number" },
  { key: "requestPayload", label: "Request Payload", wrap: true },
  { key: "errorMessage", label: "Error", wrap: true },
  { key: "ip", label: "IP Address" },
  { key: "userAgent", label: "Browser / Device", wrap: true },
];

const TenantDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Activity logs (stored in the tenant's own database)
  const [logs, setLogs] = useState([]);
  const [logModules, setLogModules] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState(null);
  const [logPage, setLogPage] = useState(1);
  const [logPages, setLogPages] = useState(1);
  const [logTotal, setLogTotal] = useState(0);
  const [logSearch, setLogSearch] = useState("");
  const [logModule, setLogModule] = useState("");
  const [logMethod, setLogMethod] = useState("");
  const [logStatus, setLogStatus] = useState("");
  const [logStartDate, setLogStartDate] = useState("");
  const [logEndDate, setLogEndDate] = useState("");
  const [exporting, setExporting] = useState(false);

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

  const fetchActivityLogs = useCallback(async () => {
    setLogsLoading(true);
    setLogsError(null);
    try {
      const res = await superApi.get(`/tenants/${id}/activity-logs`, {
        params: {
          page: logPage,
          limit: LOG_PAGE_SIZE,
          search: logSearch || undefined,
          module: logModule || undefined,
          method: logMethod || undefined,
          status: logStatus || undefined,
          startDate: logStartDate || undefined,
          endDate: logEndDate || undefined,
        },
      });
      setLogs(res.data?.logs || []);
      setLogPages(res.data?.pages || 1);
      setLogTotal(res.data?.total || 0);
      setLogModules(res.data?.modules || []);
    } catch (err) {
      console.error("Failed to fetch tenant activity logs:", err);
      setLogsError("Failed to fetch activity logs for this tenant.");
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, [id, logPage, logSearch, logModule, logMethod, logStatus, logStartDate, logEndDate]);

  useEffect(() => {
    fetchActivityLogs();
  }, [fetchActivityLogs]);

  const updateLogFilter = (setter) => (e) => {
    setter(e.target.value);
    setLogPage(1);
  };

  // Exports all logs matching the currently applied filters (not just the
  // current page) using the app's existing Excel export utility.
  const handleExportLogs = async () => {
    setExporting(true);
    try {
      const res = await superApi.get(`/tenants/${id}/activity-logs`, {
        params: {
          export: true,
          search: logSearch || undefined,
          module: logModule || undefined,
          method: logMethod || undefined,
          status: logStatus || undefined,
          startDate: logStartDate || undefined,
          endDate: logEndDate || undefined,
        },
      });
      const rows = (res.data?.logs || []).map((log) => ({
        timestamp: log.createdAt,
        method: log.method || "",
        endpoint: log.endpoint || "",
        userName: log.userName || "",
        userRole: log.userRole || "",
        module: log.module || "",
        action: log.action || "",
        status: log.status || "",
        statusCode: log.statusCode ?? "",
        responseTimeMs: log.responseTimeMs ?? "",
        requestPayload: log.requestPayload ? JSON.stringify(log.requestPayload) : "",
        errorMessage: log.errorMessage || "",
        ip: log.ip || "",
        userAgent: log.userAgent || "",
      }));

      if (!rows.length) {
        toast.info("No activity logs to export for the current filters.");
        return;
      }

      await exportRowsToExcel(
        rows,
        LOG_EXPORT_COLUMNS,
        `${tenant?.slug || "tenant"}_activity_logs_${new Date().toISOString().slice(0, 10)}.xlsx`,
        "Activity Logs"
      );
      toast.success(`Exported ${rows.length} log entr${rows.length === 1 ? "y" : "ies"}`);
    } catch (err) {
      console.error("Failed to export activity logs:", err);
      toast.error("Failed to export activity logs.");
    } finally {
      setExporting(false);
    }
  };

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

      {/* Tenant Activity Logs — stored in this tenant's own database */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-2 text-slate-800">
            <ScrollText className="text-[#008ecc]" size={20} />
            <div>
              <h3 className="text-lg font-bold">Tenant Activity Logs</h3>
              <p className="text-slate-500 text-xs">{logTotal.toLocaleString()} entries for this tenant</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleExportLogs}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-md cursor-pointer text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#008ecc" }}
              title="Download the currently filtered logs as an Excel file"
            >
              <Download size={16} />
              {exporting ? "Exporting..." : "Activity Download"}
            </button>
            <button
              onClick={fetchActivityLogs}
              className="p-2 border border-slate-200 rounded-xl bg-white hover:border-[#008ecc]/40 hover:text-[#008ecc] text-slate-600 transition-all cursor-pointer shadow-sm"
              title="Refresh"
            >
              <RefreshCw size={16} className={logsLoading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {logsError && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-sm">
            {logsError}
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search user, action, endpoint..."
              value={logSearch}
              onChange={updateLogFilter(setLogSearch)}
              className="w-full border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] focus:border-transparent bg-white shadow-inner"
            />
          </div>

          <select
            value={logModule}
            onChange={updateLogFilter(setLogModule)}
            className="border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#008ecc]"
          >
            <option value="">All Modules</option>
            {logModules.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <select
            value={logMethod}
            onChange={updateLogFilter(setLogMethod)}
            className="border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#008ecc]"
          >
            <option value="">All Methods</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>

          <select
            value={logStatus}
            onChange={updateLogFilter(setLogStatus)}
            className="border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#008ecc]"
          >
            <option value="">All Statuses</option>
            <option value="Success">Success</option>
            <option value="Failed">Failed</option>
          </select>

          <input
            type="date"
            value={logStartDate}
            onChange={updateLogFilter(setLogStartDate)}
            className="border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#008ecc]"
          />
          <span className="text-slate-400 text-sm">to</span>
          <input
            type="date"
            value={logEndDate}
            onChange={updateLogFilter(setLogEndDate)}
            className="border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#008ecc]"
          />
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/50 text-slate-600 uppercase text-xs font-bold border-b border-slate-200">
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Method</th>
                <th className="px-6 py-4">Endpoint</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Module</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Time</th>
                <th className="px-6 py-4">Error</th>
                <th className="px-6 py-4">IP / Device</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
              {logsLoading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="animate-spin text-[#008ecc]" size={28} />
                      <span className="font-medium">Loading activity logs...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/50 transition-colors align-top">
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                      {log.createdAt ? format(new Date(log.createdAt), "MMM dd, yyyy HH:mm:ss") : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.method ? (
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {log.method}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-6 py-4 max-w-[220px] truncate font-mono text-xs text-slate-500" title={log.endpoint}>
                      {log.endpoint || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{log.userName || "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{log.userRole || "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-[#f2fbff] text-[#008ecc] border border-blue-100">
                        {log.module}
                      </span>
                    </td>
                    <td className="px-6 py-4">{log.action}</td>
                    <td className="px-6 py-4 text-center">
                      {log.status === "Success" ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border bg-green-50 text-green-700 border-green-200">
                          <CheckCircle2 size={12} /> Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border bg-red-50 text-red-700 border-red-200">
                          <AlertCircle size={12} /> Failed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500 whitespace-nowrap">
                      {log.responseTimeMs != null ? `${log.responseTimeMs} ms` : "—"}
                    </td>
                    <td className="px-6 py-4 max-w-[200px] truncate text-red-600" title={log.errorMessage}>
                      {log.errorMessage || "—"}
                    </td>
                    <td className="px-6 py-4 max-w-[200px]">
                      <div className="text-xs text-slate-500 font-mono">{log.ip || "—"}</div>
                      <div className="text-xs text-slate-400 truncate" title={log.userAgent}>{log.userAgent || ""}</div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-400 font-medium">
                    No activity logs found for this tenant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!logsLoading && logs.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/50">
            <span className="text-xs text-slate-500">
              Page {logPage} of {logPages} &middot; {logTotal.toLocaleString()} total entries
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                disabled={logPage <= 1}
                className="p-2 border border-slate-200 rounded-lg bg-white hover:border-[#008ecc]/40 hover:text-[#008ecc] text-slate-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setLogPage((p) => Math.min(logPages, p + 1))}
                disabled={logPage >= logPages}
                className="p-2 border border-slate-200 rounded-lg bg-white hover:border-[#008ecc]/40 hover:text-[#008ecc] text-slate-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TenantDetail;
