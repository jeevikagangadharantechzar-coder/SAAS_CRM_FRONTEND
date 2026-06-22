import React from "react";

export const PlanSkeleton = ({ count = 3 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 space-y-6 animate-pulse">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="space-y-2 flex-1">
              <div className="h-6 bg-slate-200 rounded w-3/4" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
            </div>
            <div className="h-6 bg-slate-200 rounded-full w-16" />
          </div>

          {/* Pricing */}
          <div className="space-y-2 border-y border-slate-100 py-4">
            <div className="h-8 bg-slate-200 rounded w-1/3" />
            <div className="h-4 bg-slate-100 rounded w-1/4" />
          </div>

          {/* Limits */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <div className="h-4 bg-slate-100 rounded w-1/3" />
              <div className="h-4 bg-slate-200 rounded w-1/4" />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <div className="h-9 bg-slate-200 rounded-xl flex-1" />
            <div className="h-9 bg-slate-200 rounded-xl flex-1" />
            <div className="h-9 bg-slate-200 rounded-xl w-9" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default PlanSkeleton;
