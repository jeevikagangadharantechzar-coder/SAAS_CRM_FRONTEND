import React from "react";
import { X } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { COLORS, STANDARD_REASONS } from "./constants";
import CustomReasonsTooltip from "./CustomReasonsTooltip";

const AssigneeAnalyticsModal = ({ assignee, rawLeads, onClose }) => {
  if (!assignee) return null;
  const assigneeLeads = rawLeads.filter(l => l.assignTo?._id === assignee._id);
  
  // calculate reasons
  const reasonAgg = {};
  let totalFollowUps = 0;
  let totalAge = 0;
  
  assigneeLeads.forEach(lead => {
    const rawReason = lead.rejectionReason || lead.junkReason || "Unspecified Reason";
    const reason = STANDARD_REASONS.includes(rawReason) ? rawReason : "Others";
    
    if (!reasonAgg[reason]) {
      reasonAgg[reason] = { count: 0, customReasonsList: [] };
    }
    
    reasonAgg[reason].count += 1;
    if (reason === "Others" && rawReason !== "Others") {
      reasonAgg[reason].customReasonsList.push(rawReason);
    }
    
    totalFollowUps += lead.followUpCountAtLoss || 0;
    totalAge += lead.leadAgeAtLossDays || 0;
  });

  const reasonChart = Object.keys(reasonAgg).map(key => ({ 
    name: key, 
    count: reasonAgg[key].count,
    customReasonsList: reasonAgg[key].customReasonsList
  })).sort((a, b) => b.count - a.count);
  
  // Stage breakdown
  const stageAgg = {};
  assigneeLeads.forEach(lead => {
    const stage = lead.lossStage || "Unknown";
    stageAgg[stage] = (stageAgg[stage] || 0) + 1;
  });
  
  const stageChart = Object.keys(stageAgg).map(key => ({ name: key, count: stageAgg[key] })).sort((a,b) => b.count - a.count);
  const highestStage = stageChart.length > 0 ? stageChart[0].name : "N/A";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-white/50">
        <div className="sticky top-0 bg-white/90 backdrop-blur-md p-6 border-b border-slate-100 flex justify-between items-center z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{assignee.firstName} {assignee.lastName} - Loss Analytics</h2>
            <p className="text-slate-500 text-sm mt-1">{assigneeLeads.length} leads lost</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-rose-100 hover:text-rose-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-violet-50/50 p-4 rounded-xl border border-violet-100">
               <p className="text-sm font-semibold text-slate-500 uppercase">Highest Loss Stage</p>
               <p className="text-3xl font-black text-violet-600">{highestStage}</p>
             </div>
             <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-100">
               <p className="text-sm font-semibold text-slate-500 uppercase">Avg Lead Age (Days)</p>
               <p className="text-3xl font-black text-sky-700">{assigneeLeads.length ? (totalAge / assigneeLeads.length).toFixed(1) : 0}</p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <h3 className="text-lg font-bold text-slate-700 mb-4">Loss Reasons</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reasonChart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{fontSize: 12}} />
                    <YAxis tick={{fontSize: 12}} />
                    <Tooltip cursor={{fill: '#f1f5f9'}} content={<CustomReasonsTooltip />} />
                    <Bar dataKey="count" fill="#818cf8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <h3 className="text-lg font-bold text-slate-700 mb-4">Loss Stages Breakdown</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stageChart} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {stageChart.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip cursor={{fill: '#f1f5f9'}} />
                    <Legend wrapperStyle={{ maxHeight: '100px', overflowY: 'auto' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssigneeAnalyticsModal;
