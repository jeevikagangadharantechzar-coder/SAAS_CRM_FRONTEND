import React from "react";

const FilterToolbar = ({ 
  dateMode, setDateMode, 
  singleDate, setSingleDate, 
  startDate, setStartDate, 
  endDate, setEndDate 
}) => {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Date Mode Select */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Time Period</label>
          <select 
            value={dateMode} 
            onChange={(e) => setDateMode(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#008ecc]/50 cursor-pointer"
          >
            <option value="all_time">All Time</option>
            <option value="single_day">Single Day</option>
            <option value="date_range">Date Range</option>
          </select>
        </div>

        {/* Dynamic Date Inputs */}
        {dateMode === "single_day" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Date</label>
            <input 
              type="date" 
              value={singleDate} 
              onChange={(e) => setSingleDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#008ecc]/50"
            />
          </div>
        )}
        {dateMode === "date_range" && (
          <div className="flex flex-col gap-1.5 lg:col-span-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date Range</label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#008ecc]/50"
              />
              <span className="text-slate-400 font-bold">to</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#008ecc]/50"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterToolbar;
