import React, { useState, useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { isDateOverdue } from "../utils/dateValidation";
import { CheckSquare, Target, Clock, ArrowRight, Activity, Calendar } from "lucide-react";
import moment from "moment";

export default function LinkedTasksTargetsTab({ itemType, itemId }) {
  const { token, slug } = useSelector((state) => state.auth);
  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const headers = { Authorization: `Bearer ${token}` };

  const [tasks, setTasks] = useState([]);
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!itemId) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [tasksRes, targetsRes] = await Promise.all([
          axios.get(`${baseUrl}/tasks/linked/${itemType}/${itemId}`, { headers }),
          axios.get(`${baseUrl}/targets/linked/${itemType}/${itemId}`, { headers })
        ]);
        const tasksData = tasksRes.data?.tasks || tasksRes.data || tasksRes || [];
        const targetsData = targetsRes.data?.targets || targetsRes.data || targetsRes || [];
        setTasks(Array.isArray(tasksData) ? tasksData : []);
        setTargets(Array.isArray(targetsData) ? targetsData : []);
      } catch (err) {
        console.error("Error fetching linked tasks/targets:", err);
        toast.error("Failed to load linked tasks & targets");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [itemId, itemType, baseUrl, token]); // Re-run if item changes

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-gray-50/50 rounded-xl border border-gray-100">
        <Activity className="w-5 h-5 text-gray-400 animate-spin mr-2" />
        <span className="text-sm font-medium text-gray-500">Loading linked items...</span>
      </div>
    );
  }

  const STAGE_COLOR = {
    "New": "bg-blue-50 text-blue-700 border-blue-200",
    "In Progress": "bg-amber-50 text-amber-700 border-amber-200",
    "Completed": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Rejected": "bg-rose-50 text-rose-700 border-rose-200",
    "In Review": "bg-purple-50 text-purple-700 border-purple-200"
  };

  const PRIORITY_COLOR = {
    "High": "bg-rose-100 text-rose-700",
    "Medium": "bg-amber-100 text-amber-700",
    "Low": "bg-blue-100 text-blue-700"
  };

  return (
    <div className="space-y-6">
      {/* Linked Tasks Section */}
      <div>
        <h3 className="text-slate-700 mb-3 flex items-center gap-2">
          <CheckSquare size={16} className="text-blue-500" />
          Linked Tasks ({tasks.length})
        </h3>
        {tasks.length === 0 ? (
          <div className="bg-gray-50/50 rounded-xl border border-dashed border-gray-200 p-6 text-center">
            <p className="text-sm text-gray-500">No tasks linked to this {itemType}.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tasks.map(t => {
              const isOverdue = t.dueDate && isDateOverdue(t.dueDate) && t.status !== "Completed";
              return (
                <div key={t._id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-slate-700 line-clamp-1">{t.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ml-2 shrink-0 ${PRIORITY_COLOR[t.priority] || "bg-gray-100 text-gray-600"}`}>
                      {t.priority}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{t.description}</p>
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${STAGE_COLOR[t.status] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                      {t.status}
                    </span>
                    {t.dueDate && (
                      <span className={`flex items-center gap-1 text-xs font-medium ${isOverdue ? "text-rose-600" : "text-gray-500"}`}>
                        <Calendar size={12} />
                        {moment(t.dueDate).format("MMM D, YYYY")}
                        {isOverdue && " (Overdue)"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Linked Targets Section */}
      <div>
        <h3 className="text-slate-700 mb-3 flex items-center gap-2 mt-8">
          <Target size={16} className="text-purple-500" />
          Linked Targets ({targets.length})
        </h3>
        {targets.length === 0 ? (
          <div className="bg-gray-50/50 rounded-xl border border-dashed border-gray-200 p-6 text-center">
            <p className="text-sm text-gray-500">No targets linked to this {itemType}.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {targets.map(t => {
              const isOverdue = isDateOverdue(t.endDate) && t.status !== "Completed";
              const overall = t.percentages?.overall || 0;
              return (
                <div key={t._id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h3 className="text-slate-700">Target period: {moment(t.startDate).format("MMM D")} - {moment(t.endDate).format("MMM D, YYYY")}</h3>
                      <p className="text-base text-slate-600 mt-1 capitalize">{t.period} Target</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded border font-medium ${STAGE_COLOR[t.status] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                        {t.status}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${PRIORITY_COLOR[t.priority] || "bg-gray-100 text-gray-600"}`}>
                        {t.priority || "Low"}
                      </span>
                    </div>
                  </div>
                  
                  {/* Mini Progress Bar */}
                  <div className="mb-2">
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-gray-600">Overall Progress</span>
                      <span className={overall >= 100 ? "text-emerald-600" : "text-blue-600"}>{overall}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div className={`h-full rounded-full ${overall >= 100 ? "bg-emerald-500" : "bg-blue-500"}`} style={{ width: `${Math.min(overall, 100)}%` }} />
                    </div>
                  </div>

                  {/* Sub-goals summary */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-gray-500 font-medium">
                    {t.targetLeads > 0 && <span>Leads: {t.actuals?.leadsConverted || 0}/{t.percentages?.effTargetLeads || t.targetLeads}</span>}
                    {t.targetDeals > 0 && <span>Deals: {t.actuals?.dealsWon || 0}/{t.percentages?.effTargetDeals || t.targetDeals}</span>}
                    {t.targetCalls > 0 && <span>Calls: {t.actuals?.calls || 0}/{t.targetCalls}</span>}
                    {t.targetMeetings > 0 && <span>Meetings: {t.actuals?.meetings || 0}/{t.targetMeetings}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
