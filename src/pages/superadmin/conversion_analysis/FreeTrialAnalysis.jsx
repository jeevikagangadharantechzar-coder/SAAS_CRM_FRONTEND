import React, { useEffect, useState, useMemo } from "react";
import { format, isSameDay, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { Users, CheckCircle2, XCircle, Clock, Search, ExternalLink, BarChart3, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { superApi } from "../../../services/api";

import MetricCard from "./MetricCard";
import AnalysisCharts from "./AnalysisCharts";
import FilterToolbar from "./FilterToolbar";

const LoadingSkeleton = () => (
  <div className="space-y-8 animate-pulse">
    <div className="flex flex-col md:flex-row gap-6">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-40 bg-slate-200/50 rounded-3xl flex-1"></div>
      ))}
    </div>
    <div className="h-[400px] bg-slate-200/50 rounded-3xl"></div>
  </div>
);

const FreeTrialAnalysis = () => {
  const [data, setData] = useState({
    summary: { total: 0, converted: 0, rejected: 0, pending: 0 },
    details: { converted: [], rejected: [], pending: [] },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter States
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [dateMode, setDateMode] = useState("all_time");
  const [singleDate, setSingleDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await superApi.get("/free-trials/analysis");
      if (res.data?.success) {
        setData(res.data.data);
      } else {
        setData(res.data || { summary: {}, details: {} });
      }
    } catch (err) {
      console.error("Failed to fetch analysis data:", err);
      setError("Failed to fetch conversion analysis data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const allRecords = useMemo(() => {
    const converted = (data.details?.converted || []).map(item => ({ ...item, _status: 'converted' }));
    const rejected = (data.details?.rejected || []).map(item => ({ ...item, _status: 'rejected' }));
    const pending = (data.details?.pending || []).map(item => ({ ...item, _status: 'pending' }));
    return [...converted, ...rejected, ...pending].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [data.details]);

  const baseRecords = useMemo(() => {
    let records = allRecords;

    if (search.trim()) {
      const lowerSearch = search.toLowerCase();
      records = records.filter(r => 
        (r.name && r.name.toLowerCase().includes(lowerSearch)) ||
        (r.email && r.email.toLowerCase().includes(lowerSearch)) ||
        (r.businessName && r.businessName.toLowerCase().includes(lowerSearch))
      );
    }

    if (dateMode === "single_day" && singleDate) {
      const targetDate = new Date(singleDate);
      records = records.filter(r => r.createdAt && isSameDay(new Date(r.createdAt), targetDate));
    } else if (dateMode === "date_range" && startDate && endDate) {
      const start = startOfDay(new Date(startDate));
      const end = endOfDay(new Date(endDate));
      records = records.filter(r => {
        if (!r.createdAt) return false;
        const d = new Date(r.createdAt);
        return isWithinInterval(d, { start, end });
      });
    }

    return records;
  }, [allRecords, search, dateMode, singleDate, startDate, endDate]);

  const filteredRecords = useMemo(() => {
    if (activeTab === "all") return baseRecords;
    return baseRecords.filter(r => r._status === activeTab);
  }, [baseRecords, activeTab]);

  useEffect(() => { 
    setPage(1); 
  }, [activeTab, search, dateMode, singleDate, startDate, endDate]);

  const dynamicSummary = useMemo(() => {
    const summary = { total: baseRecords.length, converted: 0, pending: 0, rejected: 0 };
    baseRecords.forEach(r => {
      if (r._status === "converted") summary.converted++;
      else if (r._status === "pending") summary.pending++;
      else if (r._status === "rejected") summary.rejected++;
    });
    return summary;
  }, [baseRecords]);

  const pieData = useMemo(() => {
    return [
      { name: "Converted", value: dynamicSummary.converted, color: "#10b981" },
      { name: "Ongoing", value: dynamicSummary.pending, color: "#f59e0b" },
      { name: "Rejected", value: dynamicSummary.rejected, color: "#ef4444" },
    ].filter(d => d.value > 0);
  }, [dynamicSummary]);

  const trendData = useMemo(() => {
    if (!baseRecords.length) return [];
    
    const grouped = {};
    const sortedAsc = [...baseRecords].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    
    sortedAsc.forEach(record => {
      if (!record.createdAt) return;
      const dateStr = format(new Date(record.createdAt), "MMM dd");
      if (!grouped[dateStr]) {
        grouped[dateStr] = { date: dateStr, signups: 0, converted: 0 };
      }
      grouped[dateStr].signups += 1;
      if (record._status === "converted") {
        grouped[dateStr].converted += 1;
      }
    });

    return Object.values(grouped);
  }, [baseRecords]);

  const totalPages = Math.ceil(filteredRecords.length / limit) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredRecords.slice(start, start + limit);
  }, [filteredRecords, page, limit]);

  const tabs = [
    { id: "all", label: "All Signups" },
    { id: "converted", label: "Converted" },
    { id: "pending", label: "Ongoing" },
    { id: "rejected", label: "Rejected" },
  ];

  const getStatusBadge = (status) => {
    switch(status) {
      case 'converted':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200"><CheckCircle2 size={12} className="mr-1.5" strokeWidth={3} /> Converted</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200"><XCircle size={12} className="mr-1.5" strokeWidth={3} /> Rejected</span>;
      case 'pending':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200"><Clock size={12} className="mr-1.5" strokeWidth={3} /> Ongoing</span>;
      default:
        return null;
    }
  };

  const calcPercentage = (part, total) => {
    if (!total) return 0;
    return Math.round((part / total) * 100);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-slate-900 text-2xl font-bold flex items-center gap-2">
            <BarChart3 size={24} className="text-[#008ecc]" />
            Conversion Analysis
          </h2>
          <p className="text-slate-500 mt-2 font-medium">Track and analyze free trial performance and conversion metrics.</p>
        </div>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
          <XCircle size={20} className="text-rose-500" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <div className="space-y-8 animate-in fade-in duration-500">
          <FilterToolbar 
            dateMode={dateMode} setDateMode={setDateMode}
            singleDate={singleDate} setSingleDate={setSingleDate}
            startDate={startDate} setStartDate={setStartDate}
            endDate={endDate} setEndDate={setEndDate}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard 
              title="Total Signups" 
              value={dynamicSummary.total} 
              icon={Users} 
              colorClass="text-indigo-600"
              bgGradient="bg-gradient-to-br from-indigo-50 to-blue-50/50"
              isActive={activeTab === "all"}
              onClick={() => setActiveTab("all")}
            />
            <MetricCard 
              title="Converted" 
              value={dynamicSummary.converted} 
              percentage={calcPercentage(dynamicSummary.converted, dynamicSummary.total)}
              icon={CheckCircle2} 
              colorClass="text-emerald-600"
              bgGradient="bg-gradient-to-br from-emerald-50 to-green-50/50"
              isActive={activeTab === "converted"}
              onClick={() => setActiveTab("converted")}
            />
            <MetricCard 
              title="Ongoing Trials" 
              value={dynamicSummary.pending} 
              percentage={calcPercentage(dynamicSummary.pending, dynamicSummary.total)}
              icon={Clock} 
              colorClass="text-amber-500"
              bgGradient="bg-gradient-to-br from-amber-50 to-orange-50/50"
              isActive={activeTab === "pending"}
              onClick={() => setActiveTab("pending")}
            />
            <MetricCard 
              title="Rejected / Expired" 
              value={dynamicSummary.rejected} 
              percentage={calcPercentage(dynamicSummary.rejected, dynamicSummary.total)}
              icon={XCircle} 
              colorClass="text-rose-500"
              bgGradient="bg-gradient-to-br from-rose-50 to-red-50/50"
              isActive={activeTab === "rejected"}
              onClick={() => setActiveTab("rejected")}
            />
          </div>

          <AnalysisCharts trendData={trendData} pieData={pieData} />

          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-slate-50/30">
              <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full lg:w-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 lg:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                      activeTab === tab.id
                        ? "bg-white text-[#008ecc] shadow-sm"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full lg:w-80 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#008ecc] transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Search table records..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]/50 focus:border-[#008ecc]/30 shadow-sm font-medium text-slate-700 placeholder-slate-400 transition-all"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="px-8 py-5">User Details</th>
                    <th className="px-8 py-5">Business</th>
                    <th className="px-8 py-5">Signup Date</th>
                    <th className="px-8 py-5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRecords.length > 0 ? (
                    paginatedRecords.map((r, idx) => (
                      <tr key={r._id || idx} className="hover:bg-[#008ecc]/5 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 text-sm group-hover:text-[#008ecc] transition-colors">{r.name || 'Unknown'}</span>
                            <span className="text-slate-500 text-xs mt-0.5">{r.email}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-col items-start gap-1">
                            <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-100/80 text-slate-700 text-xs font-bold border border-slate-200/60">
                              {r.businessName || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-slate-600 text-sm font-semibold">
                          {r.createdAt ? format(new Date(r.createdAt), "MMM dd, yyyy") : "—"}
                        </td>
                        <td className="px-8 py-5 text-center">
                          {getStatusBadge(r._status)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-8 py-24 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <div className="p-4 bg-slate-50 rounded-full mb-4">
                            <Filter size={32} className="text-slate-300" />
                          </div>
                          <p className="text-lg font-bold text-slate-600">No records found</p>
                          <p className="text-sm mt-1 font-medium">Try adjusting your filters or search term.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {filteredRecords.length > 0 && (
              <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-b-3xl">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <span className="text-xs text-slate-500 font-bold">
                    Showing <span className="text-slate-700">{(page - 1) * limit + 1}</span>–<span className="text-slate-700">{Math.min(page * limit, filteredRecords.length)}</span> of <span className="text-slate-700">{filteredRecords.length}</span> records
                  </span>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <span>Rows per page:</span>
                    <select 
                      value={limit}
                      onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#008ecc]/50 cursor-pointer"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-2 border border-slate-200 rounded-xl bg-white hover:border-[#008ecc]/40 hover:text-[#008ecc] text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-sm"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-bold text-slate-600 px-3 bg-white border border-slate-200 py-1.5 rounded-xl shadow-sm">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-2 border border-slate-200 rounded-xl bg-white hover:border-[#008ecc]/40 hover:text-[#008ecc] text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-sm"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FreeTrialAnalysis;
