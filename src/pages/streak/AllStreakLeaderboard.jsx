import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Trophy, RefreshCw, ChevronLeft, ChevronRight,
  Calendar, Activity, Search, ChevronDown, ChevronUp,
  Users, Target, TrendingUp, Eye, EyeOff,
} from "lucide-react";
import axios from "axios";
import { FiCalendar, FiRefreshCw } from "react-icons/fi";

/* ─── Date helpers ───────────────────────────────────────────────────── */
const getTodayDate = () => new Date().toISOString().split("T")[0];

const formatDateDisplay = (ds) =>
  ds ? new Date(ds).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  }) : "-";

/* ─── Month helpers (NEW) ────────────────────────────────────────────── */
const getMonthOptions = (count = 36) => {
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

const monthToDateRange = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  const start  = new Date(y, m - 1, 1);
  const end    = new Date(y, m, 0);
  return {
    sd: start.toISOString().split("T")[0],
    ed: end.toISOString().split("T")[0],
  };
};

/* ═══════════════════════════════════════════════════════════════════════ */
const AllStreakLeaderboard = () => {

  const [performers,         setPerformers]         = useState([]);
  const [filteredPerformers, setFilteredPerformers] = useState([]);
  const [loading,            setLoading]            = useState(true);
  const [error,              setError]              = useState(null);
  const [searchTerm,         setSearchTerm]         = useState("");
  const [sortBy,             setSortBy]             = useState("convertedLeads");
  const [sortOrder,          setSortOrder]          = useState("desc");
  const [currentPage,        setCurrentPage]        = useState(1);
  const [itemsPerPage,       setItemsPerPage]       = useState(10);
  const [currentUser,        setCurrentUser]        = useState(null);
  const [userRole,           setUserRole]           = useState(null);
  const [isAdmin,            setIsAdmin]            = useState(false);
  const [dateRange,          setDateRange]          = useState("");
  const [stats,              setStats]              = useState({
    totalSalespeople: 0, activeSalespeople: 0,
    avgConversionRate: 0, totalLeads: 0,
    totalConvertedLeads: 0, cumulativeTotalLeads: 0,
  });

  const [filterMode,   setFilterMode]   = useState("single");
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [rangeStart,   setRangeStart]   = useState("");
  const [rangeEnd,     setRangeEnd]     = useState("");
  const [refreshing,   setRefreshing]   = useState(false);

  /* ── NEW: All Time month picker state ───────────────────────────────── */
  const [selectedMonth, setSelectedMonth] = useState("");
  const [dropdownOpen,  setDropdownOpen]  = useState(false);
  const dropdownRef                        = useRef(null);
  const monthOptions                       = getMonthOptions(36);

  const [startDate] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1).toISOString().split("T")[0];
  });
  const [endDate] = useState(getTodayDate);

  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];
  const selectedMonthIdx = new Date().getMonth();
  const selectedYear     = new Date().getFullYear();

  const API_URL = import.meta.env.VITE_API_URL;
  const token   = localStorage.getItem("token");

  /* ── Close dropdown on outside click (NEW) ──────────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Reset selectedMonth when leaving alltime mode (NEW) ────────────── */
  useEffect(() => {
    if (filterMode !== "alltime") setSelectedMonth("");
  }, [filterMode]);

  /* ── UPDATED: getEffectiveDates handles selectedMonth ───────────────── */
  const getEffectiveDates = useCallback(() => {
    if (filterMode === "single" && selectedDate)
      return { sd: selectedDate, ed: selectedDate };
    if (filterMode === "range")
      return { sd: rangeStart || undefined, ed: rangeEnd || undefined };
    if (filterMode === "alltime" && selectedMonth) {
      const { sd, ed } = monthToDateRange(selectedMonth);
      return { sd, ed };
    }
    if (filterMode === "alltime")
      return { sd: undefined, ed: undefined };
    return { sd: startDate, ed: endDate };
  }, [filterMode, selectedDate, rangeStart, rangeEnd, selectedMonth, startDate, endDate]);

  /* ── UPDATED: activeBadge shows month name when selected ────────────── */
  const activeBadge = (() => {
    if (filterMode === "single" && selectedDate)
      return formatDateDisplay(selectedDate);
    if (filterMode === "range" && (rangeStart || rangeEnd))
      return `${rangeStart || "start"} → ${rangeEnd || "end"}`;
    if (filterMode === "alltime" && selectedMonth)
      return monthOptions.find(o => o.value === selectedMonth)?.label || "All Time";
    if (filterMode === "alltime")
      return "All Time";
    return null;
  })();

  /* ── UPDATED: clearFilter resets month too ──────────────────────────── */
  const clearFilter = () => {
    if (filterMode === "single")  setSelectedDate(getTodayDate());
    if (filterMode === "range")   { setRangeStart(""); setRangeEnd(""); }
    if (filterMode === "alltime") setSelectedMonth("");
  };

  const formatDateRange = () => {
    if (!startDate || !endDate) return "";
    const s = new Date(startDate);
    const e = new Date(endDate);
    return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} - ${e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  };

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      setCurrentUser(userData);
      const role = userData?.role?.name || userData?.role || "User";
      setUserRole(role);
      setIsAdmin(role === "Admin");
    } catch (e) {
      console.error("Error reading user:", e);
    }
  }, []);

  const fetchStreakData = useCallback(async (isRefresh = false) => {
    if (!token) return;
    try {
      if (isRefresh) setRefreshing(true);
      else           setLoading(true);
      setError(null);

      const { sd, ed } = getEffectiveDates();

      const { data } = await axios.get(`${API_URL}/streak/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` },
        params:  { startDate: sd, endDate: ed },
      });

      const rows = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
      setPerformers(rows);
      setFilteredPerformers(rows);
      setStats(data.stats || {});
      setDateRange(data.dateRange?.formatted || formatDateRange());
    } catch (err) {
      console.error("fetchStreakData error:", err);
      setError(err.response?.data?.error || err.message || "Failed to load leaderboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [API_URL, token, getEffectiveDates]);

  /* ── UPDATED: selectedMonth added to dependency array ───────────────── */
  useEffect(() => {
    if (currentUser) fetchStreakData();
  }, [filterMode, selectedDate, rangeStart, rangeEnd, selectedMonth, currentUser]);

  useEffect(() => {
    let result = [...performers];

    if (isAdmin && searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p =>
        p.name?.toLowerCase().includes(term)  ||
        p.email?.toLowerCase().includes(term) ||
        p.role?.toLowerCase().includes(term)
      );
    }

    const fieldMap = {
      convertedLeads: "convertedLeads",
      conversionRate: "conversionRate",
      "Total Leads":  "totalLeads",
      "Active Days":  "productiveDays",
      Streak:         "streak",
    };

    result.sort((a, b) => {
      const key  = fieldMap[sortBy] || sortBy;
      const aVal = a[key] ?? 0;
      const bVal = b[key] ?? 0;
      if (typeof aVal === "string")
        return sortOrder === "desc" ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
      return sortOrder === "desc" ? bVal - aVal : aVal - bVal;
    });

    setFilteredPerformers(result);
    setCurrentPage(1);
  }, [searchTerm, sortBy, sortOrder, performers, isAdmin]);

  const totalCount   = filteredPerformers.length;
  const indexOfFirst = (currentPage - 1) * itemsPerPage;
  const indexOfLast  = indexOfFirst + itemsPerPage;
  const currentUsers = filteredPerformers.slice(indexOfFirst, indexOfLast);
  const totalPages   = Math.ceil(totalCount / itemsPerPage);

  const handleSort = (field) => {
    if (sortBy === field) setSortOrder(o => o === "desc" ? "asc" : "desc");
    else { setSortBy(field); setSortOrder("desc"); }
  };

  const SortIcon = ({ field }) =>
    sortBy === field
      ? (sortOrder === "desc" ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />)
      : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="animate-pulse space-y-6">
              <div className="h-10 bg-gray-200 rounded-lg w-64" />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
              </div>
              <div className="h-14 bg-gray-200 rounded-lg w-full" />
              <div className="space-y-4">
                {[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-gray-100 rounded-lg" />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-12 text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Activity className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Failed to Load Data</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">{error}</p>
            <button
              onClick={() => fetchStreakData()}
              className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-medium hover:shadow-lg transition-shadow"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">

        {/* ── HEADER ───────────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 rounded-2xl shadow-lg shadow-orange-200">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                 Leaderboard
                </h1>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="px-4 py-1.5 bg-white rounded-full text-sm font-medium text-gray-700 shadow-sm border border-gray-200">
                    {months[selectedMonthIdx]} {selectedYear}
                  </span>
                  {isAdmin ? (
                    <span className="px-4 py-1.5 bg-purple-100 rounded-full text-sm font-medium text-purple-700 border border-purple-200 flex items-center gap-1.5">
                      <Eye className="w-4 h-4" /> Admin View – All Salespeople
                    </span>
                  ) : (
                    <span className="px-4 py-1.5 bg-blue-100 rounded-full text-sm font-medium text-blue-700 border border-blue-200 flex items-center gap-1.5">
                      <EyeOff className="w-4 h-4" /> My Performance Only
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold">
                  {currentUser?.firstName?.charAt(0) || "U"}
                </div>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{currentUser?.firstName} {currentUser?.lastName}</p>
                  <p className="text-xs text-gray-500">{userRole}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── STATS CARDS ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">
                {isAdmin ? "Active Salespeople" : "Your Status"}
              </span>
              <Users className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {isAdmin ? stats.activeSalespeople : (performers[0]?.status || "—")}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {isAdmin ? `Out of ${stats.totalSalespeople} total` : `${performers[0]?.performanceScore || 0}% conversion`}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">
                {isAdmin ? " Conversion Rate" : "Your Conversion Rate"}
              </span>
              <Target className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {isAdmin ? `${stats.avgConversionRate ?? 0}%` : `${performers[0]?.conversionRate ?? 0}%`}
            </div>
            <div className="text-xs text-gray-500 mt-1">{dateRange || formatDateRange()}</div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">
                {isAdmin ? "Total Leads" : "Your Leads"}
              </span>
              <Target className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {isAdmin ? stats.totalLeads?.toLocaleString() : performers[0]?.totalLeads?.toLocaleString() || "0"}
            </div>
            <div className="y
            -xs text-gray-500 mt-1">{dateRange || formatDateRange()}</div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">
                {isAdmin ? "Converted Leads" : "Your Conversions"}
              </span>
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {isAdmin ? stats.totalConvertedLeads?.toLocaleString() : performers[0]?.convertedLeads?.toLocaleString() || "0"}
            </div>
            <div className="text-xs text-gray-500 mt-1">Deals with Lead ID</div>
          </div>
        </div>

        {/* ── TABLE CARD ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">

          <div className="p-5 border-b border-gray-100">

            {/* Title row */}
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-base font-semibold text-gray-800">Performance Data</h2>
              {refreshing && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 border border-orange-200 rounded-full text-xs font-medium text-orange-600">
                  <FiRefreshCw className="w-3 h-3 animate-spin" />
                  Updating…
                </span>
              )}
            </div>

            {/* Controls row */}
            <div className="flex flex-wrap items-center gap-3">

              {/* Mode tabs */}
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1 shrink-0">
                {[
                  { id: "single",  label: "Single Day" },
                  { id: "range",   label: "Date Range" },
                  { id: "alltime", label: "All Time"   },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setFilterMode(id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      filterMode === id
                        ? "bg-white text-orange-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* ── Date input area ───────────────────────────────────── */}
              <div className="flex items-center gap-2" style={{ minWidth: 280 }}>

                {/* Single Day */}
{filterMode === "single" && (
  <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2 hover:border-orange-400 transition-colors w-full">
    <FiCalendar className="text-gray-400 w-4 h-4 shrink-0" />
    <input
      type="date"
      value={selectedDate}
      max={getTodayDate()}
      onChange={e => setSelectedDate(e.target.value)}
      onKeyDown={(e) => e.preventDefault()}   // 🚫 prevents typing
      className="bg-transparent border-none focus:outline-none text-gray-700 text-sm w-full cursor-pointer"
    />
  </div>
)}

                {/* UNCHANGED: Date Range */}
                {filterMode === "range" && (
                  <>
                    <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2 hover:border-orange-400 transition-colors flex-1">
                      <FiCalendar className="text-gray-400 w-4 h-4 shrink-0" />
                      <input
                        type="date"
                        value={rangeStart}
                        max={rangeEnd || getTodayDate()}
                        onChange={e => setRangeStart(e.target.value)}
                        className="bg-transparent border-none focus:outline-none text-gray-700 text-sm w-full"
                      />
                    </div>
                    <span className="text-gray-400 text-xs shrink-0">→</span>
                    <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2 hover:border-orange-400 transition-colors flex-1">
                      <FiCalendar className="text-gray-400 w-4 h-4 shrink-0" />
                      <input
                        type="date"
                        value={rangeEnd}
                        min={rangeStart}
                        max={getTodayDate()}
                        onChange={e => setRangeEnd(e.target.value)}
                        className="bg-transparent border-none focus:outline-none text-gray-700 text-sm w-full"
                      />
                    </div>
                  </>
                )}

                {/* NEW: All Time — scrollable month dropdown */}
                {filterMode === "alltime" && (
                  <div className="relative w-full" ref={dropdownRef}>
                    <button
                      onClick={() => setDropdownOpen(o => !o)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:border-orange-400 transition-colors"
                    >
                      <span className="flex items-center gap-2 text-gray-700">
                        <FiCalendar className="w-4 h-4 text-gray-400 shrink-0" />
                        {selectedMonth
                          ? monthOptions.find(o => o.value === selectedMonth)?.label
                          : "All Records"}
                      </span>
                      {dropdownOpen
                        ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                        : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                    </button>

                    {dropdownOpen && (
                      <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                        {/* All Records option */}
                        <div
                          onClick={() => { setSelectedMonth(""); setDropdownOpen(false); }}
                          className={`px-4 py-2.5 text-sm cursor-pointer flex items-center gap-2 border-b border-gray-100 ${
                            !selectedMonth
                              ? "bg-orange-50 text-orange-700 font-medium"
                              : "text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          <FiCalendar className="w-3.5 h-3.5" />
                          All Records
                        </div>

                        {/* Scrollable month list */}
                        <div className="overflow-y-auto max-h-56">
                          {monthOptions.map(opt => (
                            <div
                              key={opt.value}
                              onClick={() => { setSelectedMonth(opt.value); setDropdownOpen(false); }}
                              className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                                selectedMonth === opt.value
                                  ? "bg-orange-50 text-orange-700 font-medium"
                                  : "text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              {opt.label}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Search */}
              {isAdmin && (
                <div className="relative min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search members…"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg w-full focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm bg-white"
                  />
                </div>
              )}

              {/* Refresh */}
              <button
                onClick={() => fetchStreakData(true)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* Active filter pill */}
            {activeBadge && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-400">Filtered by:</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-orange-50 border border-orange-200 rounded-full text-xs font-medium text-orange-700">
                  <FiCalendar className="w-3 h-3" />
                  {activeBadge}
                  {/* Show × only when a specific month is chosen, not for bare "All Time" */}
                  {!(filterMode === "alltime" && !selectedMonth) && (
                    <button
                      onClick={clearFilter}
                      className="ml-0.5 text-orange-400 hover:text-orange-700 font-bold leading-none"
                    >×</button>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* ── Table ────────────────────────────────────────────────── */}
          <div className={`overflow-x-auto transition-opacity duration-200 ${refreshing ? "opacity-60" : "opacity-100"}`}>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-5 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rank</th>
                  <th className="py-5 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sales Person</th>
                  <th className="py-5 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th
                    onClick={() => handleSort("conversionRate")}
                    className="py-5 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-900"
                  >
                    <div className="flex items-center gap-1">Conversion % <SortIcon field="conversionRate" /></div>
                  </th>
                  <th
                    onClick={() => handleSort("Total Leads")}
                    className="py-5 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-900"
                  >
                    <div className="flex items-center gap-1">Total Leads <SortIcon field="Total Leads" /></div>
                  </th>
                  <th
                    onClick={() => handleSort("convertedLeads")}
                    className="py-5 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-900"
                  >
                    <div className="flex items-center gap-1">Converted <SortIcon field="convertedLeads" /></div>
                  </th>
                  <th className="py-5 px-7 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Work Hours</th>
                  <th
                    onClick={() => handleSort("Active Days")}
                    className="py-5 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-900"
                  >
                    <div className="flex items-center gap-1">Active Days <SortIcon field="Active Days" /></div>
                  </th>
                </tr>
              </thead>

              <tbody>
                {currentUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-gray-400 text-sm">
                      No data found for the selected period.
                    </td>
                  </tr>
                ) : currentUsers.map((performer, index) => {
                  const rank      = index + indexOfFirst + 1;
                  const rankClass =
                    rank === 1 ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-white" :
                    rank === 2 ? "bg-gradient-to-br from-gray-300 to-gray-400 text-white"    :
                    rank === 3 ? "bg-gradient-to-br from-amber-700 to-amber-800 text-white"  :
                                 "bg-gray-100 text-gray-700";
                  const isCurrentUser = performer.id === currentUser?._id?.toString();

                  return (
                    <tr
                      key={performer.id}
                      className={`border-b border-gray-50 transition-colors ${
                        isCurrentUser && !isAdmin
                          ? "bg-blue-50/50 hover:bg-blue-100/50"
                          : "hover:bg-orange-50/30"
                      }`}
                    >
                      <td className="py-5 px-6">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${rankClass}`}>
                          {rank}
                        </div>
                      </td>

                      <td className="py-5 px-6">
                        <div>
                          <div className="font-semibold text-gray-900">
                            {performer.name}
                            {isCurrentUser && (
                              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full ml-2">You</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">{performer.email}</div>
                          <div className="text-[10px] text-purple-500">
                            All time: {performer.cumulativeTotalLeads} leads · {performer.cumulativeDisplay}
                          </div>
                        </div>
                      </td>

                      <td className="py-5 px-6">
                        <div className={`px-3 py-1.5 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 ${performer.statusColor}`}>
                          <span>{performer.statusIcon}</span>
                          <span className="capitalize">{performer.status}</span>
                        </div>
                      </td>

                      <td className="py-5 px-6">
                        <div className="space-y-2">
                          <div className="text-2xl font-bold text-gray-900">{performer.conversionDisplay}</div>
                          <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
                              style={{ width: `${Math.min(performer.conversionRate, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-5 px-6">
                        <div className="text-lg font-bold text-gray-900">{performer.totalLeads}</div>
                      </td>

                      <td className="py-5 px-6">
                        <div className="text-lg font-bold text-green-600">{performer.convertedLeads}</div>
                      </td>

                      <td className="py-10 px-2">
                        <span className="text-sm font-medium text-gray-700">{performer.workHours}</span>
                      </td>

                      <td className="py-5 px-6">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{performer.productiveDays}</span>
                          <span className="text-xs text-gray-500">days</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ───────────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row justify-between items-center px-6 py-4 border-t border-gray-100 gap-4">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span>Show</span>
              <select
                value={itemsPerPage}
                onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="border border-gray-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-orange-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span>entries</span>
            </div>

            <div className="text-sm text-gray-500">
              Showing{" "}
              <span className="font-medium text-gray-900">{totalCount === 0 ? 0 : indexOfFirst + 1}</span>{" "}
              to{" "}
              <span className="font-medium text-gray-900">{Math.min(indexOfLast, totalCount)}</span>{" "}
              of{" "}
              <span className="font-medium text-gray-900">{totalCount}</span> entries
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => p - 1)}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg border ${currentPage === 1 ? "text-gray-300 border-gray-200 cursor-not-allowed" : "text-gray-600 border-gray-200 hover:bg-gray-100"}`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${currentPage === page ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage === totalPages || totalPages === 0}
                className={`p-2 rounded-lg border ${currentPage === totalPages || totalPages === 0 ? "text-gray-300 border-gray-200 cursor-not-allowed" : "text-gray-600 border-gray-200 hover:bg-gray-100"}`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AllStreakLeaderboard;