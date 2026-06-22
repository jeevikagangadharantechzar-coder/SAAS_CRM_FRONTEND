import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  FaUserAlt, FaDownload, FaChartLine, FaUsers, FaCheckCircle,
} from "react-icons/fa";
import {
  FiChevronDown, FiChevronUp, FiSearch, FiTrendingUp, FiTrendingDown,
  FiCalendar, FiRefreshCw,
} from "react-icons/fi";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";

/* ─── helpers ──────────────────────────────────────────────────────── */

const formatDuration = (seconds) => {
  if (!seconds || seconds <= 0) return "0 sec";
  const hrs  = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const parts = [];
  if (hrs  > 0) parts.push(`${hrs} hr`);
  if (mins > 0) parts.push(`${mins} min`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs} sec`);
  return parts.join(" ");
};

/* ── Calculate Productivity Score Function ─────────────────────── */
const calcProductivityScore = (
  totalSeconds, completedActivities, totalActivities, totalFollowUps, totalLeads
) => {
  const activityScore =
    totalActivities > 0 ? (completedActivities / totalActivities) * 40 : 0;
  const timeScore = Math.min((totalSeconds / 3600 / 8) * 30, 30);
  const followUpScore =
    totalLeads > 0 ? Math.min((totalFollowUps / totalLeads) * 30, 30) : 0;
  return Math.min(activityScore + timeScore + followUpScore, 100);
};

/* ── Format Time Function ─────────────────────── */
const formatTime = (ds) =>
  ds ? new Date(ds).toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
  }) : "-";

/* ── Format Date Function ─────────────────────── */
const formatDate = (ds) =>
  ds ? new Date(ds).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  }) : "-";

/* ── Format Session Duration Function ─────────────────────── */
const formatSessionDuration = (login, logout) => {
  if (!login || !logout) return "-";
  return formatDuration((new Date(logout) - new Date(login)) / 1000);
};

/* ── Get Today's Date Function ─────────────────────── */
const getTodayDate = () => new Date().toISOString().split("T")[0];


/* ── Get Month Options Function ─────────────────────── */
const getMonthOptions = (count = 13) => {
  const opts = [];
  const now  = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    opts.push({ value, label });
  }
  return opts;
};

/* ── Convert Month to Date Range Function ─────────────────────── */
const monthToDateRange = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  const start  = new Date(y, m - 1, 1);
  const end    = new Date(y, m, 0);
  return {
    startDate: start.toISOString().split("T")[0],
    endDate:   end.toISOString().split("T")[0],
  };
};

/* ── Filter Login History Function ─────────────────────── */
const filterLoginHistory = (loginHistory, startDate, endDate) => {
  if (!startDate && !endDate) return loginHistory;
  return loginHistory.filter((log) => {
    if (!log.login) return false;
    const d = new Date(log.login);
    if (startDate) {
      const s = new Date(startDate); s.setHours(0, 0, 0, 0);
      if (d < s) return false;
    }
    if (endDate) {
      const e = new Date(endDate); e.setHours(23, 59, 59, 999);
      if (d > e) return false;
    }
    return true;
  });
};

/* ─── Component ─────────────────────────────────────────────────────── */

const ReportsPage = () => {
  const [reports,       setReports]       = useState([]);
  // initialLoad = true only until the very first successful fetch
  const [initialLoad,   setInitialLoad]   = useState(true);
  // refreshing = lightweight re-fetch indicator (no full-page spinner)
  const [refreshing,    setRefreshing]    = useState(false);
  const [error,         setError]         = useState(null);
  const [expandedUsers, setExpandedUsers] = useState(new Set());
  const [searchTerm,    setSearchTerm]    = useState("");

  const [filterMode,    setFilterMode]    = useState("single");
  const [selectedDate,  setSelectedDate]  = useState("");
  const [startDate,     setStartDate]     = useState("");
  const [endDate,       setEndDate]       = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");

  const navigate    = useNavigate();
  const API_URL     = import.meta.env.VITE_API_URL;
  const token       = localStorage.getItem("token");
  const hasFetched  = useRef(false); // tracks whether first load is done

  const getEffectiveDates = () => {
    if (filterMode === "single" && selectedDate)
      return { startDate: selectedDate, endDate: selectedDate };
    if (filterMode === "range" && (startDate || endDate))
      return { startDate: startDate || undefined, endDate: endDate || undefined };
    if (filterMode === "month" && selectedMonth)
      return monthToDateRange(selectedMonth);
    return { startDate: undefined, endDate: undefined };
  };

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMode, selectedDate, startDate, endDate, selectedMonth]);

  const fetchReports = async () => {
    try {
      // First ever load → show full-page spinner
      // Subsequent filter changes → show only the tiny top-bar indicator
      if (!hasFetched.current) {
        setInitialLoad(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      const { data: salesData } = await axios.get(`${API_URL}/users/sales`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const users = salesData.salesUsers || salesData.users || salesData || [];
      if (!Array.isArray(users) || users.length === 0) {
        setReports([]);
        return;
      }

      const { startDate: sd, endDate: ed } = getEffectiveDates();

      const results = await Promise.allSettled(
        users.map(async (user) => {
          const { data } = await axios.get(`${API_URL}/sales/performance`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { userId: user._id, startDate: sd, endDate: ed },
          });

          const rawLogin     = Array.isArray(data.loginHistory) ? data.loginHistory : [];
          const loginHistory = filterLoginHistory(rawLogin, sd, ed);

          let totalSeconds = 0;
          loginHistory.forEach((log) => {
            if (log.login && log.logout) {
              const diff = (new Date(log.logout) - new Date(log.login)) / 1000;
              if (diff > 0) totalSeconds += diff;
            }
          });

          const activities          = Array.isArray(data.activities) ? data.activities : [];
          const totalActivities     = activities.length;
          const completedActivities = activities.filter(
            (a) => String(a.status).toLowerCase() === "completed"
          ).length;
          const activityCompletionRate =
            totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0;

          const leads      = Array.isArray(data.leads) ? data.leads : [];
          const totalLeads = data.metrics?.totalLeadsAssigned ?? leads.length ?? 0;

          const now            = new Date();
          const totalFollowUps = leads.filter(
            (l) => l.followUpDate && new Date(l.followUpDate) >= now
          ).length;

          const productivityScore = calcProductivityScore(
            totalSeconds, completedActivities, totalActivities, totalFollowUps, totalLeads
          );

          return {
            userId: user._id,
            name:   `${user.firstName} ${user.lastName}`,
            email:  user.email,
            totalLogins: loginHistory.length,
            totalLeads,
            totalActivities,
            completedActivities,
            totalFollowUps,
            totalSeconds,
            totalDuration: formatDuration(totalSeconds),
            loginHistory,
            activityCompletionRate,
            productivityScore,
          };
        })
      );

      const successful = [], failed = [];
      results.forEach((r) =>
        r.status === "fulfilled" ? successful.push(r.value) : failed.push(r.reason)
      );
      setReports(successful);
      if (failed.length) setError(`Could not load data for ${failed.length} team member(s).`);
    } catch (err) {
      console.error("fetchReports error:", err);
      setError("Failed to load team data. Please try again.");
    } finally {
      hasFetched.current = true;
      setInitialLoad(false);
      setRefreshing(false);
    }
  };

  const getPerformanceLabel = (s) =>
    s >= 80 ? "Excellent" : s >= 60 ? "Good" : s >= 40 ? "Average" : "Needs Improvement";

  const getSessionsForView = (loginHistory) => {
    if (filterMode === "single" && !selectedDate) {
      const today = getTodayDate();
      return loginHistory.filter(
        (l) => l.login && new Date(l.login).toISOString().split("T")[0] === today
      );
    }
    return loginHistory;
  };

  const getSessionLabel = () => {
    if (filterMode === "month" && selectedMonth) {
      const opt = getMonthOptions().find((o) => o.value === selectedMonth);
      return opt ? `Sessions — ${opt.label}` : "Sessions";
    }
    if (filterMode === "range" && (startDate || endDate))
      return `Sessions (${startDate || "..."} → ${endDate || "..."})`;
    if (filterMode === "single" && selectedDate)
      return `Sessions — ${formatDate(selectedDate)}`;
    return "Today's Login Sessions";
  };

  const toggleUserExpansion = (userId) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  const buildExportRows = (rep) => {
    const sessions = rep.loginHistory;
    let periodLabel = "all";
    const { startDate: sd, endDate: ed } = getEffectiveDates();
    if (filterMode === "month" && selectedMonth) periodLabel = selectedMonth.replace("-", "");
    else if (filterMode === "range" && (sd || ed)) periodLabel = `${sd || "start"}_to_${ed || "end"}`;
    else if (filterMode === "single" && sd) periodLabel = sd.replace(/-/g, "");

    if (sessions.length === 0) {
      return [{
        "Salesman Name": rep.name, "Email": rep.email,
        "Login Date": "No Data", "Login Time": "No Data",
        "Logout Date": "No Data", "Logout Time": "No Data",
        "Session Duration": "No Data",
        "Total Leads Assigned": rep.totalLeads,
        "Total Activities": rep.totalActivities,
        "Completed Activities": rep.completedActivities,
        "Activity Completion %": `${rep.activityCompletionRate.toFixed(1)}%`,
        "Pending Follow-ups": rep.totalFollowUps,
        "Total Time Logged": rep.totalDuration,
        "Productivity Score": `${rep.productivityScore.toFixed(0)}%`,
        "Performance Level": getPerformanceLabel(rep.productivityScore),
        "Period": periodLabel,
      }];
    }

    return sessions.map((log) => {
      const login  = log.login  ? new Date(log.login)  : null;
      const logout = log.logout ? new Date(log.logout) : null;
      return {
        "Salesman Name": rep.name, "Email": rep.email,
        "Login Date":  login  ? login.toLocaleDateString()  : "N/A",
        "Login Time":  login  ? login.toLocaleTimeString()  : "N/A",
        "Logout Date": logout ? logout.toLocaleDateString() : "N/A",
        "Logout Time": logout ? logout.toLocaleTimeString() : "N/A",
        "Session Duration": login && logout ? formatSessionDuration(log.login, log.logout) : "Active",
        "Total Leads Assigned": rep.totalLeads,
        "Total Activities": rep.totalActivities,
        "Completed Activities": rep.completedActivities,
        "Activity Completion %": `${rep.activityCompletionRate.toFixed(1)}%`,
        "Pending Follow-ups": rep.totalFollowUps,
        "Total Time Logged": rep.totalDuration,
        "Productivity Score": `${rep.productivityScore.toFixed(0)}%`,
        "Performance Level": getPerformanceLabel(rep.productivityScore),
        "Period": periodLabel,
      };
    });
  };

  const getFileSuffix = () => {
    if (filterMode === "month" && selectedMonth) return selectedMonth.replace("-", "");
    const { startDate: sd, endDate: ed } = getEffectiveDates();
    if (sd && ed && sd === ed) return sd.replace(/-/g, "");
    if (sd || ed) return `${(sd || "start").replace(/-/g, "")}_${(ed || "end").replace(/-/g, "")}`;
    return "all";
  };

  const downloadAllReports = () => {
    const rows = reports.flatMap(buildExportRows);
    const wb   = XLSX.utils.book_new();
    const ws   = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = Array(16).fill({ wch: 22 });
    XLSX.utils.book_append_sheet(wb, ws, "Team Performance");
    XLSX.writeFile(wb, `team_performance_${getFileSuffix()}.xlsx`);
  };

  const downloadSalesmanReport = (rep) => {
    const rows = buildExportRows(rep);
    const wb   = XLSX.utils.book_new();
    const ws   = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = Array(16).fill({ wch: 22 });
    XLSX.utils.book_append_sheet(wb, ws, rep.name.slice(0, 31));
    XLSX.writeFile(wb, `${rep.name.replace(/\s+/g, "_")}_${getFileSuffix()}.xlsx`);
  };

  const avgProductivity =
    reports.length > 0
      ? reports.reduce((a, r) => a + r.productivityScore, 0) / reports.length : 0;
  const avgCompletion =
    reports.length > 0
      ? reports.reduce((a, r) => a + r.activityCompletionRate, 0) / reports.length : 0;

  const filteredReports = reports.filter((r) =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const monthOptions = getMonthOptions();

  /* Active filter badge */
  const activeBadge = (() => {
    if (filterMode === "month" && selectedMonth) {
      const opt = monthOptions.find((o) => o.value === selectedMonth);
      return opt ? opt.label : null;
    }
    if (filterMode === "range" && (startDate || endDate))
      return `${startDate || "start"} → ${endDate || "end"}`;
    if (filterMode === "single" && selectedDate)
      return formatDate(selectedDate);
    return null;
  })();

  const clearFilter = () => {
    if (filterMode === "month")  setSelectedMonth("");
    if (filterMode === "single") setSelectedDate("");
    if (filterMode === "range")  { setStartDate(""); setEndDate(""); }
  };

  /* ── First-load full-page spinner (only once ever) ── */
  if (initialLoad) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading performance data…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Team Analytics</h1>
            {/* Subtle refresh indicator — replaces full-page spinner for filter changes */}
            {refreshing && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs font-medium text-blue-600">
                <FiRefreshCw className="w-3 h-3 animate-spin" />
                Updating…
              </span>
            )}
          </div>

          {/* Controls card */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <div className="flex flex-wrap items-center gap-3">

              {/* Filter mode tabs */}
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1 shrink-0">
                {[
                  { id: "single", label: "Single Day" },
                  { id: "range",  label: "Date Range" },
                  { id: "month",  label: "Monthly"    },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setFilterMode(id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      filterMode === id
                        ? "bg-white text-blue-700 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Fixed-width filter input area */}
              <div className="flex items-center gap-2" style={{ width: "340px" }}>
                {filterMode === "single" && (
                  <input
                    type="date"
                    value={selectedDate}
                    max={getTodayDate()}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                )}
                {filterMode === "range" && (
                  <>
                    <input
                      type="date"
                      value={startDate}
                      max={endDate || getTodayDate()}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="text-gray-400 text-xs shrink-0">→</span>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate}
                      max={getTodayDate()}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </>
                )}
                {filterMode === "month" && (
                  <div className="relative w-full">
                    <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                    >
                      <option value="">All Time</option>
                      {monthOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="hidden sm:block h-8 w-px bg-gray-200 shrink-0" />

              {/* Search */}
              <div className="relative flex-1 min-w-[160px]">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search members…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Export all */}
              <button
                onClick={downloadAllReports}
                disabled={reports.length === 0}
                className="shrink-0 flex items-center gap-2 bg-blue-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap"
              >
                <FaDownload className="w-3.5 h-3.5" />
                Export All
              </button>
            </div>

            {/* Active filter pill */}
            {activeBadge && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                <span className="text-xs text-gray-400">Filtered by:</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-50 border border-blue-200 rounded-full text-xs font-medium text-blue-700">
                  <FiCalendar className="w-3 h-3" />
                  {activeBadge}
                  <button
                    onClick={clearFilter}
                    className="ml-0.5 text-blue-400 hover:text-blue-700 font-bold leading-none"
                  >×</button>
                </span>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
               {error}
            </div>
          )}
        </div>

        

        {/* Main Table — stays visible and stable during refreshes */}
        <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-opacity duration-200 ${refreshing ? "opacity-60" : "opacity-100"}`}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {["Team Member","Leads","Time Logged","Actions"].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReports.map((rep) => (
                  <React.Fragment key={rep.userId}>

                    <tr className="hover:bg-gray-50 transition-colors">

                      {/* Team Member */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                            {rep.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{rep.name}</div>
                            <div className="text-xs text-gray-500">{rep.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Leads */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{rep.totalLeads}</div>
                        <div className="text-xs text-gray-500">Assigned</div>
                      </td>

                      

                      {/* Time Logged */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{rep.totalDuration}</div>
                        <div className="text-xs text-gray-500">
                          {rep.totalLogins} session{rep.totalLogins !== 1 ? "s" : ""}
                        </div>
                      </td>

                      

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => downloadSalesmanReport(rep)}
                            className="text-gray-600 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Export Report"
                          >
                            <FaDownload className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleUserExpansion(rep.userId)}
                            className="text-gray-600 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View Sessions"
                          >
                            {expandedUsers.has(rep.userId)
                              ? <FiChevronUp className="w-4 h-4" />
                              : <FiChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded sessions */}
                    {expandedUsers.has(rep.userId) && (() => {
                      const sessions = getSessionsForView(rep.loginHistory);
                      const totalSecs = sessions.reduce((acc, log) => {
                        if (log.login && log.logout) {
                          const d = (new Date(log.logout) - new Date(log.login)) / 1000;
                          return acc + (d > 0 ? d : 0);
                        }
                        return acc;
                      }, 0);

                      return (
                        <tr className="bg-gray-50">
                          <td colSpan="6" className="px-6 py-6">
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">

                              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center flex-wrap gap-2">
                                <h4 className="text-sm font-semibold text-gray-900">
                                  {getSessionLabel()} — {rep.name}
                                </h4>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  <span>{sessions.length} session(s)</span>
                                  <span className="font-medium text-gray-700">
                                    Total time: {formatDuration(totalSecs)}
                                  </span>
                                </div>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      {["#","Date","Login Time","Logout Time","Duration","Status"].map((h) => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                          {h}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {sessions.length > 0 ? (
                                      sessions.map((log, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                          <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                                          <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDate(log.login)}</td>
                                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatTime(log.login)}</td>
                                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatTime(log.logout)}</td>
                                          <td className="px-4 py-3 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                              {formatSessionDuration(log.login, log.logout)}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                              log.logout ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                                            }`}>
                                              {log.logout ? "Completed" : "Active"}
                                            </span>
                                          </td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr>
                                        <td colSpan="6" className="px-4 py-10 text-center">
                                          <FaUserAlt className="mx-auto w-8 h-8 mb-2 text-gray-300" />
                                          <p className="text-sm text-gray-500">No login sessions found for this period</p>
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>

                              <div className="px-6 py-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
  <MiniStat label="Total Leads"  value={rep.totalLeads} />
  <MiniStat label="Follow-ups"   value={rep.totalFollowUps} />
  <MiniStat label="Total Logged" value={rep.totalDuration} />
</div>
                            </div>
                          </td>
                        </tr>
                      );
                    })()}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {filteredReports.length === 0 && !refreshing && (
            <div className="text-center py-16">
              <FaUsers className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No team members found</h3>
              <p className="text-gray-500 text-sm max-w-md mx-auto">
                {searchTerm
                  ? "No members match your search. Try a different name."
                  : error || "No performance data available for the selected period."}
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

/* ─── Sub-components ─────────────────────────────────────────────────── */

const SummaryCard = ({ title, value, icon, color, subtitle }) => {
  const colors = {
    blue:   "bg-blue-50 text-blue-700",
    green:  "bg-green-50 text-green-700",
    purple: "bg-purple-50 text-purple-700",
    orange: "bg-orange-50 text-orange-700",
  };
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${colors[color]}`}>{icon}</div>
      </div>
    </div>
  );
};

const MiniStat = ({ label, value }) => (
  <div className="text-center">
    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
    <p className="text-sm font-semibold text-gray-900">{value}</p>
  </div>
);

export default ReportsPage;  