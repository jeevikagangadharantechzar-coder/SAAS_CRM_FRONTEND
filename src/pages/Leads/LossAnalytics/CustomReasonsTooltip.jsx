import React from "react";

const CustomReasonsTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isOthers = data.name === "Others";
    const customList = data.customReasonsList;

    return (
      <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-xl z-50">
        <p className="font-bold text-slate-800 mb-1">{data.name}</p>
        <p className="text-slate-600 mb-2">Total Count: <span className="font-bold">{data.count}</span></p>
        
        {isOthers && customList && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Specific Reasons:</p>
            <ul className="text-sm text-slate-700 space-y-1">
              {Array.isArray(customList) 
                ? [...new Set(customList)].map((reason, idx) => (
                    <li key={idx} className="flex justify-between gap-4">
                      <span>• {reason}</span>
                      <span className="font-medium text-slate-500">{customList.filter(r => r === reason).length}</span>
                    </li>
                  ))
                : Object.entries(customList).map(([reason, count], idx) => (
                    <li key={idx} className="flex justify-between gap-4">
                      <span>• {reason}</span>
                      <span className="font-medium text-slate-500">{count}</span>
                    </li>
                  ))
              }
            </ul>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default CustomReasonsTooltip;
