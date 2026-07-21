import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { MODULE_CONFIG } from "./CustomListWidgetConfig";

const API_URL = import.meta.env.VITE_API_URL;

export const CustomListWidget = ({ config, dateRange }) => {
  const { tenantSlug: paramSlug } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { module, filter, fields, title } = config;
  const moduleConfig = MODULE_CONFIG[module];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const tenantSlug = localStorage.getItem("tenantSlug") || paramSlug;
        const token = localStorage.getItem("token");
        
        if (!token) {
          throw new Error("Authentication missing");
        }

        const headers = { Authorization: `Bearer ${token}` };
        
        const params = { limit: 100, page: 1 };
        if (dateRange && dateRange.start && dateRange.end) {
          params.start = dateRange.start;
          params.end = dateRange.end;
        }

        let endpointUrl = moduleConfig.endpoint;
        if (moduleConfig.useTenantBase) {
          const BASE = `${API_URL.replace("/api", "")}/${tenantSlug}/api`;
          endpointUrl = `${BASE}${moduleConfig.endpoint}`;
        } else {
          endpointUrl = `${API_URL}${moduleConfig.endpoint}`;
        }

        const response = await axios.get(endpointUrl, { headers, params });
        
        // Normalize data robustly
        let resData = [];
        const d = response.data;
        if (Array.isArray(d)) resData = d;
        else if (d?.data && Array.isArray(d.data)) resData = d.data;
        else if (d?.leads && Array.isArray(d.leads)) resData = d.leads;
        else if (d?.deals && Array.isArray(d.deals)) resData = d.deals;
        else if (d?.invoices && Array.isArray(d.invoices)) resData = d.invoices;
        else if (d?.tasks && Array.isArray(d.tasks)) resData = d.tasks;
        else if (d?.targets && Array.isArray(d.targets)) resData = d.targets;
        else if (d?.data?.leads && Array.isArray(d.data.leads)) resData = d.data.leads;
        else if (d?.data?.deals && Array.isArray(d.data.deals)) resData = d.data.deals;
        else if (d?.data?.invoices && Array.isArray(d.data.invoices)) resData = d.data.invoices;
        else if (d?.data?.tasks && Array.isArray(d.data.tasks)) resData = d.data.tasks;
        else if (d?.data?.targets && Array.isArray(d.data.targets)) resData = d.data.targets;
        
        // Apply filter logic
        let filteredData = resData;

        // Apply Date Range Filter on frontend
        if (dateRange && dateRange.start && dateRange.end) {
          const start = new Date(dateRange.start);
          start.setHours(0, 0, 0, 0);
          const end = new Date(dateRange.end);
          end.setHours(23, 59, 59, 999);
          
          filteredData = filteredData.filter(item => {
            const itemDateStr = item.createdAt || item.date || item.created_at || item.updatedAt;
            if (!itemDateStr) return true; 
            const itemDate = new Date(itemDateStr);
            return itemDate >= start && itemDate <= end;
          });
        }

        if (module === "deals") {
          if (filter === "open") filteredData = resData.filter(d => !["won", "lost"].includes(d.stage?.toLowerCase()));
          if (filter === "won") filteredData = resData.filter(d => d.stage?.toLowerCase() === "won");
          if (filter === "lost") filteredData = resData.filter(d => d.stage?.toLowerCase() === "lost");
        } else if (module === "invoices") {
          if (filter === "pending") filteredData = resData.filter(i => ["pending", "unpaid"].includes(i.status?.toLowerCase()));
          if (filter === "paid") filteredData = resData.filter(i => i.status?.toLowerCase() === "paid");
        } else if (module === "proposals") {
          if (filter === "sent") filteredData = resData.filter(p => p.status?.toLowerCase() === "sent");
          if (filter === "accepted") filteredData = resData.filter(p => p.status?.toLowerCase() === "accepted");
        } else if (module === "tasks") {
          if (filter === "pending") filteredData = resData.filter(t => t.status?.toLowerCase() !== "completed");
          if (filter === "completed") filteredData = resData.filter(t => t.status?.toLowerCase() === "completed");
        } else if (module === "targets") {
          if (filter === "active") filteredData = resData.filter(t => t.status?.toLowerCase() === "active");
          if (filter === "completed") filteredData = resData.filter(t => t.status?.toLowerCase() === "completed");
        }
        
        // Take top 5 for mini list
        setData(filteredData.slice(0, 5));
      } catch (err) {
        console.error(`Failed to fetch ${module}:`, err);
        setError(`Failed to load data for ${module}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [module, filter, moduleConfig, paramSlug, dateRange]);

  const renderCell = (item, field) => {
    let val = item[field];
    
    // Universal resilient field mapping for all CRM modules
    if (field === "amount_user") val = item.grandTotalUserCurrency || item.valueUserCurrency;
    else if (field === "amount" || field === "total" || field === "value") val = item.total || item.amount || item.grandTotal || item.value || item.totalAmount;
    else if (field === "dealTitle" || field === "dealName") val = item.dealName || item.dealTitle || item.deal?.dealName || item.deal?.dealTitle || item.title;
    else if (field === "contactNumber" || field === "phone") val = item.phoneNumber || item.phone || item.contactNumber || item.mobile;
    else if (field === "leadName" || field === "firstName" || field === "name" || field === "title") val = item.leadName || item.name || item.title || item.taskName || item.targetName || `${item.firstName || ""} ${item.lastName || ""}`.trim();
    else if (field === "company") val = item.company || item.companyName;
    else if (field === "country") val = item.country || item.address?.country || item.location?.country;
    else if (field === "source") val = item.source || item.leadSource;
    else if (field === "createdAt") val = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "-";
    else if (field === "dueDate" || field === "followUpDate" || field === "endDate" || field === "validUntil") {
        const d = item.dueDate || item.followUpDate || item.endDate || item.validUntil;
        val = d ? new Date(d).toLocaleDateString() : "-";
    }
    else if (field === "assignedTo" || field === "assignTo" || field === "salesPerson") {
      const assignee = item.assignedTo || item.assignTo || item.salesPerson || item.assignee;
      val = assignee?.name || assignee?.firstName || (typeof assignee === 'string' ? assignee : "-");
    }
    else if (field === "stage" || field === "status") val = item.stage || item.status;
    else if (field === "invoiceNumber") val = item.invoiceNumber || item.invoiceId || item.id || item._id;
    else if (field === "proposalNumber") val = item.proposalNumber || item.proposalId || item.id || item._id;
    else if (field === "paid" || field === "paidAmount") val = item.paid || item.paidAmount || item.amountPaid;
    else if (field === "balance" || field === "balanceDue") val = item.balance || item.balanceDue || item.dueAmount;
    else if (field === "priority") val = item.priority;
    else if (field === "targetType") val = item.targetType || item.type || item.period;
    else if (field === "goalValue") val = item.goalValue || item.targetLeads || item.targetDeals || item.targetCalls || item.targetMeetings || item.targetRevenue;
    else if (field === "achievedValue") val = item.achievedValue || item.achievedLeads || item.achievedDeals || item.achievedCalls || item.achievedMeetings || item.achievedRevenue;

    // Fallback if null, undefined, or empty string
    if (val === null || val === undefined || val === "") return "-";
    if (typeof val === "object") return JSON.stringify(val);
    
    return String(val);
  };

  if (!moduleConfig) return null;

  const displayFields = moduleConfig.fields.filter(f => fields.includes(f.value));

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm h-full flex flex-col">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-base font-semibold text-gray-800">
          {title || `Custom ${moduleConfig.label} List`}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-red-500 text-center">{error}</div>
        ) : data.length === 0 ? (
          <div className="p-8 text-sm text-gray-400 text-center">No data found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/50 text-gray-500 text-xs uppercase">
                <tr>
                  {displayFields.map((f) => (
                    <th key={f.value} className="px-4 py-3 font-medium whitespace-nowrap">
                      {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((item, idx) => (
                  <tr key={item._id || idx} className="hover:bg-gray-50/50 transition-colors">
                    {displayFields.map((f) => (
                      <td key={f.value} className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {renderCell(item, f.value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="p-3 border-t border-gray-100 bg-gray-50/30 flex justify-center mt-auto">
              <button
                onClick={() => {
                  const tenantSlug = localStorage.getItem("tenantSlug") || paramSlug;
                  let route = module;
                  if (module === "proposals") route = "proposal";
                  else if (module === "tasks") route = "task-management";
                  else if (module === "targets") route = "target-management";
                  
                  navigate(`/${tenantSlug}/${route}`);
                }}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 group"
              >
                View Full {moduleConfig.label} List
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
