import React, { useState } from "react";
import { COLORS } from "./constants";

const CustomFunnel = ({ data }) => {
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, name: '', count: 0, customList: null });
  const total = data.reduce((sum, item) => sum + item.count, 0);
  let currentY = 0;

  return (
    <div className="w-full h-full flex flex-col md:flex-row items-center justify-center p-4 relative">
      <svg viewBox="0 0 100 100" className="w-full h-full max-w-[350px] max-h-[350px] drop-shadow-lg overflow-visible" preserveAspectRatio="xMidYMid meet" onMouseLeave={() => setTooltip(prev => ({ ...prev, show: false }))}>
        <defs>
          <clipPath id="funnelClip">
            <path d="M 5 5 L 95 5 L 60 65 L 60 95 L 40 95 L 40 65 Z" />
          </clipPath>
        </defs>
        <g clipPath="url(#funnelClip)">
          {data.map((entry, index) => {
            const height = total > 0 ? (entry.count / total) * 100 : 0;
            const y = currentY;
            currentY += height;
            return (
              <rect
                key={entry.name}
                x="0"
                y={y}
                width="100"
                height={height}
                fill={COLORS[index % COLORS.length]}
                className="hover:opacity-80 transition-opacity cursor-pointer"
                onMouseEnter={(e) => {
                  const rect = e.target.closest('div.relative').getBoundingClientRect();
                  setTooltip({ show: true, x: e.clientX - rect.left, y: e.clientY - rect.top, name: entry.name, count: entry.count, customList: entry.customReasonsList });
                }}
                onMouseMove={(e) => {
                  const rect = e.target.closest('div.relative').getBoundingClientRect();
                  setTooltip(prev => ({ ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top }));
                }}
              />
            );
          })}
        </g>
      </svg>
      
      <div className="mt-4 md:mt-0 md:ml-8 flex flex-col gap-3">
        {data.map((entry, index) => (
          <div key={entry.name} className="flex items-center gap-3 text-sm font-medium text-slate-700 bg-white/50 px-3 py-1.5 rounded-lg border border-slate-100">
            <div className="w-4 h-4 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
            <span className="truncate max-w-[150px]">{entry.name}</span>
            <span className="ml-auto font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600">{entry.count}</span>
          </div>
        ))}
      </div>

      {tooltip.show && (
        <div 
          className="absolute bg-slate-800 text-white p-3 rounded-lg shadow-xl text-sm z-50 pointer-events-none min-w-[200px]"
          style={{ top: tooltip.y - 50, left: tooltip.x + 15 }}
        >
          <div className="font-bold text-slate-100">{tooltip.name}</div>
          <div className="text-slate-300">Count: {tooltip.count}</div>
          
          {tooltip.name === "Others" && tooltip.customList && (
            <div className="mt-2 pt-2 border-t border-slate-700">
              <div className="text-xs font-semibold text-slate-400 mb-1">Specific Reasons:</div>
              <ul className="space-y-1">
                {Array.isArray(tooltip.customList) 
                  ? [...new Set(tooltip.customList)].map((reason, idx) => (
                      <li key={idx} className="flex justify-between gap-4 text-xs">
                        <span>• {reason}</span>
                        <span className="text-slate-400">{tooltip.customList.filter(r => r === reason).length}</span>
                      </li>
                    ))
                  : Object.entries(tooltip.customList).map(([r, c], i) => (
                      <li key={i} className="flex justify-between gap-4 text-xs">
                        <span>• {r}</span>
                        <span className="text-slate-400">{c}</span>
                      </li>
                    ))
                }
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomFunnel;
