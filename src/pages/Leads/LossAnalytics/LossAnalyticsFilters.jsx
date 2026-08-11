import React from "react";
import { ChevronDown } from "lucide-react";

const LossAnalyticsFilters = ({
  filterType, setFilterType,
  singleDate, setSingleDate,
  dateRange, setDateRange,
  year, setYear,
  month, setMonth,
  selectedAssignee, setSelectedAssignee,
  isAssigneeDropdownOpen, setIsAssigneeDropdownOpen,
  data, clearFilters
}) => {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Filter Analytics Data</h3>
        <button onClick={clearFilters} className="text-sm font-semibold text-rose-600 hover:text-rose-700 underline underline-offset-4 decoration-rose-200 hover:decoration-rose-500 transition-colors">
          Clear Filters
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Filter Type */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-500 uppercase">Date Range Type</label>
          <div className="relative">
            <select 
              value={filterType} 
              onChange={e => setFilterType(e.target.value)}
              className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded-lg text-slate-700 text-sm focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all cursor-pointer appearance-none"
            >
              <option value="allTime">All Time</option>
              <option value="singleDate">Single Date</option>
              <option value="dateRange">Date Range</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
              <ChevronDown size={14} />
            </div>
          </div>
        </div>

        {/* Date Inputs */}
        {filterType === "singleDate" && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-500 uppercase">Select Date</label>
            <input 
              type="date" 
              value={singleDate}
              onChange={e => setSingleDate(e.target.value)}
              className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded-lg text-slate-700 text-sm focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
            />
          </div>
        )}

        {filterType === "dateRange" && (
          <div className="flex flex-col gap-2 lg:col-span-2">
            <label className="text-xs font-semibold text-slate-500 uppercase">Select Range</label>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input 
                type="date" 
                value={dateRange.start}
                onChange={e => setDateRange(prev => ({...prev, start: e.target.value}))}
                className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded-lg text-slate-700 text-sm focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              />
              <span className="text-slate-400 font-medium">to</span>
              <input 
                type="date" 
                value={dateRange.end}
                onChange={e => setDateRange(prev => ({...prev, end: e.target.value}))}
                className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded-lg text-slate-700 text-sm focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              />
            </div>
          </div>
        )}

        {/* Year */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-500 uppercase">Year</label>
          <div className="relative">
            <select 
              value={year} 
              onChange={e => setYear(e.target.value)}
              className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded-lg text-slate-700 text-sm focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all cursor-pointer appearance-none"
            >
              <option value="">All Years</option>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
              <ChevronDown size={14} />
            </div>
          </div>
        </div>

        {/* Month */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-500 uppercase">Month</label>
          <div className="relative">
            <select 
              value={month} 
              onChange={e => setMonth(e.target.value)}
              className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded-lg text-slate-700 text-sm focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all cursor-pointer appearance-none"
            >
              <option value="">All Months</option>
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
              <ChevronDown size={14} />
            </div>
          </div>
        </div>

        {/* Assignee */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-500 uppercase">Salesperson</label>
          <div className="relative">
            <select
              value={selectedAssignee}
              onChange={e => setSelectedAssignee(e.target.value)}
              className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded-lg text-slate-700 text-sm focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all cursor-pointer appearance-none"
            >
              <option value="">All Salespersons</option>
              {Array.from(new Map(data.rawLeads.filter(l => l.assignTo).map(l => [l.assignTo._id, l.assignTo])).values()).map(assignee => (
                <option key={assignee._id} value={assignee._id}>
                  {assignee.firstName} {assignee.lastName}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
              <ChevronDown size={14} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LossAnalyticsFilters;
