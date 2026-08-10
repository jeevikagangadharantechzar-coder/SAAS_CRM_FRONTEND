import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Filter, Download, ChevronDown, ChevronUp } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import LossAnalyticsFilters from "./LossAnalytics/LossAnalyticsFilters";
import DynamicChartBuilder from "./LossAnalytics/DynamicChartBuilder";
import LostLeadsTables from "./LossAnalytics/LostLeadsTables";
import AssigneeAnalyticsModal from "./LossAnalytics/AssigneeAnalyticsModal";
import StandardAnalytics from "./LossAnalytics/StandardAnalytics";
import KpiDetailsSection from "./LossAnalytics/KpiDetailsSection";

export default function LeadLossAnalytics() {
  const API_URL = import.meta.env.VITE_API_URL;
  const { tenantSlug } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [data, setData] = useState({
    kpis: {
      totalLost: 0,
      totalJunk: 0,
      lossRate: 0,
      highestReason: { reason: "N/A", count: 0 },
      highestLossStage: { stage: "N/A", count: 0 }
    },
    hotLeadsActionRequired: [],
    rawLeads: []
  });

  const [filterType, setFilterType] = useState("allTime");
  const [singleDate, setSingleDate] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
  const [modalAssignee, setModalAssignee] = useState(null);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [activeKpiCard, setActiveKpiCard] = useState(null);

  const clearFilters = () => {
    setFilterType("allTime");
    setSingleDate("");
    setDateRange({ start: "", end: "" });
    setYear("");
    setMonth("");
    setSelectedAssignee("");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Lead Loss Analytics Report", 14, 15);
    const tableData = data.rawLeads.map(l => [
      l.leadName,
      l.companyName || "-",
      l.lossStage || "Unknown",
      l.rejectionReason || l.junkReason || "Unknown",
      l.leadAgeAtLossDays || 0,
      l.followUpCountAtLoss || 0,
      l.assignTo ? `${l.assignTo.firstName} ${l.assignTo.lastName}` : "Unassigned"
    ]);
    autoTable(doc, {
      head: [["Lead Name", "Company", "Stage", "Reason", "Age (Days)", "Follow-ups", "Assignee"]],
      body: tableData,
      startY: 20,
    });
    doc.save("Loss_Analytics_Report.pdf");
    setIsFilterMenuOpen(false);
  };

  const exportToCSV = () => {
    const headers = ["Lead Name", "Company", "Loss Stage", "Reason", "Lead Age (Days)", "Follow-ups", "Assignee"];
    const rows = data.rawLeads.map(l => [
      `"${l.leadName}"`,
      `"${l.companyName || "-"}"`,
      `"${l.lossStage || "Unknown"}"`,
      `"${l.rejectionReason || l.junkReason || "Unknown"}"`,
      l.leadAgeAtLossDays || 0,
      l.followUpCountAtLoss || 0,
      `"${l.assignTo ? `${l.assignTo.firstName} ${l.assignTo.lastName}` : "Unassigned"}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Loss_Analytics_Report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsFilterMenuOpen(false);
  };

  useEffect(() => {
    fetchData();
  }, [filterType, singleDate, dateRange, year, month]);

  const fetchData = async () => {
    try {
      setIsFetching(true);
      const token = localStorage.getItem("token");
      let url = `${API_URL}/lead-loss/analytics?`;
      
      if (filterType === "singleDate" && singleDate) {
        url += `startDate=${singleDate}&endDate=${singleDate}&`;
      } else if (filterType === "dateRange") {
        if (dateRange.start) url += `startDate=${dateRange.start}&`;
        if (dateRange.end) url += `endDate=${dateRange.end}&`;
      }

      if (year) url += `year=${year}&`;
      if (month) url += `month=${month}&`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch lead loss analytics");
    } finally {
      setIsFetching(false);
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-indigo-50/30 min-h-screen font-sans text-slate-800">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Lead Loss Analytics
          </h1>
          <p className="text-slate-500 mt-1">Analyze lost opportunities and optimize your pipeline</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 relative z-40">
          <button 
            onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
            className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-medium hover:bg-slate-100 transition-colors focus:ring-2 focus:ring-indigo-300 outline-none"
          >
            <Filter size={16} className="text-slate-500" />
            Leads Filter
            {isFilterMenuOpen ? <ChevronUp size={16} className="ml-1 text-slate-400" /> : <ChevronDown size={16} className="ml-1 text-slate-400" />}
          </button>
          
          <button onClick={exportToPDF} className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-lg text-slate-600 font-medium hover:bg-slate-200 transition-colors border border-slate-200">
            <Download size={16} /> Export PDF
          </button>
          <button onClick={exportToCSV} className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-lg text-slate-600 font-medium hover:bg-slate-200 transition-colors border border-slate-200">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {isFilterMenuOpen && (
        <LossAnalyticsFilters 
          filterType={filterType} setFilterType={setFilterType}
          singleDate={singleDate} setSingleDate={setSingleDate}
          dateRange={dateRange} setDateRange={setDateRange}
          year={year} setYear={setYear}
          month={month} setMonth={setMonth}
          selectedAssignee={selectedAssignee} setSelectedAssignee={setSelectedAssignee}
          isAssigneeDropdownOpen={isAssigneeDropdownOpen} setIsAssigneeDropdownOpen={setIsAssigneeDropdownOpen}
          data={data} clearFilters={clearFilters}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className={`transition-opacity duration-300 ${isFetching ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div 
              onClick={() => setActiveKpiCard("lossRate")}
              className={`bg-white/70 backdrop-blur-md p-6 rounded-2xl shadow-xl shadow-indigo-100/50 border border-white/50 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 relative overflow-hidden group cursor-pointer ${activeKpiCard === "lossRate" ? "ring-2 ring-indigo-500 scale-[1.02]" : ""}`}
            >
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Lead Loss Rate</h3>
              <div className="flex items-end gap-2 mt-2">
                <p className="text-4xl font-black text-slate-800">{data.kpis.totalLost}</p>
                <p className="text-sm font-bold text-rose-600 mb-1">{data.kpis.lossRate}%</p>
              </div>
              <div className="mt-3 w-full bg-slate-200 rounded-full h-2.5">
                <div className="bg-rose-500 h-2.5 rounded-full" style={{ width: `${Math.min(data.kpis.lossRate || 0, 100)}%` }}></div>
              </div>
              <p className="text-xs text-slate-500 mt-2 font-medium flex justify-between">
                <span>{data.kpis.totalLost} Lost Leads</span>
                <span>{data.kpis.totalLeads || 0} Total Leads</span>
              </p>
            </div>

            <div 
              className="bg-white/70 backdrop-blur-md p-6 rounded-2xl shadow-xl shadow-indigo-100/50 border border-white/50 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 relative overflow-hidden group"
            >
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Junk Leads</h3>
              <div className="flex items-end gap-2 mt-2">
                <p className="text-4xl font-black text-slate-800">{data.kpis.totalJunk}</p>
              </div>
              <p className="text-sm text-slate-500 mt-2 font-medium">Disqualified before sales process</p>
            </div>

            <div 
              onClick={() => setActiveKpiCard("topReason")}
              className={`bg-white/70 backdrop-blur-md p-6 rounded-2xl shadow-xl shadow-indigo-100/50 border border-white/50 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 cursor-pointer ${activeKpiCard === "topReason" ? "ring-2 ring-indigo-500 scale-[1.02]" : ""}`}
            >
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Top Loss Reason</h3>
              <p className="text-2xl font-black text-blue-600 mt-2 line-clamp-1" title={data.kpis.highestReason?.reason}>
                {data.kpis.highestReason?.reason || "N/A"}
              </p>
              <p className="text-sm text-slate-600 mt-2 font-medium bg-blue-50 border border-blue-100 text-blue-700 px-3 py-1 rounded-md inline-block">
                {data.kpis.highestReason?.count || 0} leads
              </p>
            </div>

            <div 
              onClick={() => setActiveKpiCard("topStage")}
              className={`bg-white/70 backdrop-blur-md p-6 rounded-2xl shadow-xl shadow-indigo-100/50 border border-white/50 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 cursor-pointer ${activeKpiCard === "topStage" ? "ring-2 ring-indigo-500 scale-[1.02]" : ""}`}
            >
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Highest Loss Stage</h3>
              <div className="flex items-end gap-2 mt-2">
                <p className="text-2xl font-black text-violet-600 truncate">{data.kpis.highestLossStage?.stage || "N/A"}</p>
              </div>
              <p className="text-sm text-slate-600 mt-2 font-medium bg-violet-50 border border-violet-100 text-violet-700 px-3 py-1 rounded-md inline-block">
                {data.kpis.highestLossStage?.count || 0} leads lost at this stage
              </p>
            </div>
          </div>

          <KpiDetailsSection activeCard={activeKpiCard} data={data} onClose={() => setActiveKpiCard(null)} />

          <StandardAnalytics data={data} />
          <DynamicChartBuilder data={data} />
          
          <LostLeadsTables data={data} selectedAssignee={selectedAssignee} setModalAssignee={setModalAssignee} />
        </div>
      )}

      {modalAssignee && (
        <AssigneeAnalyticsModal 
          assignee={modalAssignee} 
          rawLeads={data.rawLeads} 
          onClose={() => setModalAssignee(null)} 
        />
      )}
    </div>
  );
}