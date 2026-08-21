import React from "react";
import { TrendingUp } from "lucide-react";

const MetricCard = ({ title, value, icon: Icon, colorClass, bgGradient, percentage, onClick, isActive }) => (
  <div 
    onClick={onClick}
    className={`relative overflow-hidden rounded-3xl p-6 shadow-sm transition-all duration-300 transform hover:-translate-y-1 ${bgGradient} border group cursor-pointer ${isActive ? 'ring-4 ring-[#008ecc]/30 border-[#008ecc]/50 scale-[1.02]' : 'border-white/60 hover:shadow-xl'}`}
  >
    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity duration-300 transform group-hover:scale-110">
      <Icon size={100} className={colorClass} />
    </div>
    <div className="relative z-10 flex flex-col h-full justify-between">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-slate-600 font-bold tracking-wide text-xs uppercase">{title}</h3>
        <div className={`p-2.5 rounded-2xl bg-white/80 shadow-sm ${colorClass}`}>
          <Icon size={20} strokeWidth={2.5} />
        </div>
      </div>
      <div>
        <div className="flex items-end gap-3">
          <span className="text-4xl font-black text-slate-800 tracking-tight">{value}</span>
          {percentage !== undefined && (
             <span className={`text-sm font-bold mb-1.5 ${colorClass} flex items-center bg-white/60 px-2 py-0.5 rounded-full`}>
                <TrendingUp size={12} className="mr-1" strokeWidth={3} />
                {percentage}%
             </span>
          )}
        </div>
      </div>
    </div>
  </div>
);

export default MetricCard;
