import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import CustomReasonsTooltip from "./CustomReasonsTooltip";
import { COLORS, STANDARD_REASONS } from "./constants";

const StandardAnalytics = ({ data }) => {
  const generateStandardCharts = () => {
    const reasonAgg = {};
    const monthlyAgg = {};

    data.rawLeads.forEach(lead => {
      // Reason breakdown
      let reason = lead.rejectionReason || lead.junkReason || "Unspecified Reason";
      let actualReason = null;
      if (reason !== "Unspecified Reason" && !STANDARD_REASONS.includes(reason)) {
        actualReason = reason;
        reason = "Others";
      }

      if (!reasonAgg[reason]) {
        reasonAgg[reason] = { count: 0, customReasonsList: {} };
      }
      reasonAgg[reason].count += 1;
      if (actualReason) {
        reasonAgg[reason].customReasonsList[actualReason] = (reasonAgg[reason].customReasonsList[actualReason] || 0) + 1;
      }

      // Monthly breakdown
      const date = new Date(lead.rejectedAt || lead.updatedAt);
      const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      monthlyAgg[monthYear] = (monthlyAgg[monthYear] || 0) + 1;
    });

    return {
      reasonChart: Object.entries(reasonAgg).map(([name, obj]) => ({ 
        name, 
        count: obj.count, 
        customReasonsList: obj.customReasonsList 
      })).sort((a,b) => b.count - a.count).slice(0, 7),
      monthlyChart: Object.entries(monthlyAgg).map(([name, count]) => ({ name, count }))
    };
  };

  const stdCharts = generateStandardCharts();

  return (
    <div className="bg-white/60 backdrop-blur-lg p-8 rounded-3xl shadow-2xl shadow-slate-200/50 border border-white mb-8">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Standard Analytics</h2>
      <div className="flex flex-col lg:flex-row gap-6 h-auto">
        <div className="flex-1 min-h-[450px] bg-gradient-to-br from-white to-indigo-50/50 border border-indigo-100/50 rounded-2xl p-6 flex flex-col shadow-lg shadow-indigo-100/30 hover:-translate-y-1 transition-all duration-300">
          <h3 className="text-lg font-bold text-slate-700 mb-4 text-center tracking-tight">Loss Reason Breakdown</h3>
          <div className="flex-1 h-[350px] overflow-x-auto w-full pb-4">
            <div className="h-[350px] min-w-[500px]">
              {stdCharts.reasonChart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stdCharts.reasonChart} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
                      {stdCharts.reasonChart.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomReasonsTooltip />} />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ maxHeight: '100px', overflowY: 'auto', paddingTop: "20px", display: "flex", flexWrap: "wrap", justifyContent: "center" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="h-full flex items-center justify-center text-gray-400">No data</div>}
            </div>
          </div>
        </div>
        <div className="flex-1 min-h-[450px] bg-gradient-to-br from-white to-sky-50/50 border border-sky-100/50 rounded-2xl p-6 flex flex-col shadow-lg shadow-sky-100/30 hover:-translate-y-1 transition-all duration-300">
          <h3 className="text-lg font-bold text-slate-700 mb-4 text-center tracking-tight">Lost Leads Trend (Monthly)</h3>
          <div className="flex-1 h-[350px] overflow-x-auto w-full pb-4">
            <div className="h-[350px] min-w-[500px]">
              {stdCharts.monthlyChart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stdCharts.monthlyChart} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip content={<CustomReasonsTooltip />} />
                    <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-full flex items-center justify-center text-gray-400">No data</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StandardAnalytics;
