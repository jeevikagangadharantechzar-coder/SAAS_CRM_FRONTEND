import React from "react";

const FilterToolbar = ({ 
  dateMode, setDateMode, 
  singleDate, setSingleDate, 
  startDate, setStartDate, 
  endDate, setEndDate 
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
        {/* Date Mode Select */}
        <select 
          value={dateMode} 
          onChange={(e) => setDateMode(e.target.value)}
          className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#008ecc]/50 cursor-pointer"
        >
          <option value="all_time">All Time</option>
          <option value="single_day">Single Day</option>
          <option value="date_range">Date Range</option>
        </select>

        {/* Dynamic Date Inputs */}
        {dateMode === "single_day" && (
          <input 
            type="date" 
            value={singleDate} 
            onChange={(e) => setSingleDate(e.target.value)}
            className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#008ecc]/50"
          />
        )}
        {dateMode === "date_range" && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#008ecc]/50"
            />
            <span className="text-slate-400 font-bold hidden sm:inline">to</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#008ecc]/50"
            />
          </div>
        )}
    </div>
  );
};

export default FilterToolbar;
