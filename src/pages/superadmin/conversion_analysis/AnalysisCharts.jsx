import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { BarChart3 } from "lucide-react";

const AnalysisCharts = ({ trendData, pieData }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-800">Signup Trends</h3>
          <p className="text-sm text-slate-500">Based on your current filters.</p>
        </div>
        <div className="h-[300px] w-full overflow-x-auto overflow-y-hidden rounded-xl">
          {trendData.length > 0 ? (
            <div style={{ minWidth: trendData.length > 10 ? `${trendData.length * 60}px` : '100%', height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSignups" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#008ecc" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#008ecc" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorConverted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <RechartsTooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', padding: '12px 16px' }} />
                <Area type="monotone" dataKey="signups" name="Total Signups" stroke="#008ecc" strokeWidth={3} fillOpacity={1} fill="url(#colorSignups)" />
                <Area type="monotone" dataKey="converted" name="Converted" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorConverted)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
              <BarChart3 size={40} className="mb-2 opacity-50" />
              <p>No trend data available.</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col">
        <div className="mb-2">
          <h3 className="text-lg font-bold text-slate-800">Distribution</h3>
          <p className="text-sm text-slate-500">Breakdown by status.</p>
        </div>
        <div className="flex-1 min-h-[250px] w-full relative">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                  itemStyle={{ color: '#1e293b', fontWeight: 600 }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle"
                  formatter={(value) => <span className="text-slate-700 font-medium ml-1">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 absolute inset-0">
              <PieChart size={40} className="mb-2 opacity-50" />
              <p>No distribution data.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisCharts;
