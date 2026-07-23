import React, { useState, useEffect, useCallback } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import axios from "axios";
import { toast } from "react-toastify";
import { Loader2, MoreVertical, Edit, Calendar, Ban, Handshake } from "lucide-react";

const ItemTypes = {
  LEAD: "LEAD",
};

const STAGES = [
  {
    id: "Cold",
    title: "Cold",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  {
    id: "Warm",
    title: "Warm",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  {
    id: "Hot",
    title: "Hot",
    color: "text-rose-600",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
  },
  {
    id: "Converted",
    title: "Converted",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
  },
  {
    id: "Junk",
    title: "Junk / Rejected",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    borderColor: "border-gray-300",
  },
];

export default function LeadsPipelineView({
  filters,
  onRejectClick,
  onConvertClick,
  onEditClick,
  userRole,
  userId,
}) {
  const API_URL = import.meta.env.VITE_API_URL;
  const [columns, setColumns] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [localLeads, setLocalLeads] = useState([]);

  const fetchPipelineLeads = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");

      const params = new URLSearchParams({
        page: 1,
        limit: 100000,
      });

      if (filters.search && filters.search.trim()) params.append("search", filters.search.trim());
      if (filters.status) params.append("status", filters.status);
      if (filters.source) params.append("source", filters.source);
      if (filters.clientType) params.append("clientType", filters.clientType);
      if (filters.assignee) params.append("assignee", filters.assignee);
      if (filters.followUpStatus === "missed" || filters.followUpStatus === "completed") {
        params.append("followUpStatus", filters.followUpStatus);
      }
      // Date filter applied client-side below

      const { data } = await axios.get(`${API_URL}/leads/getAllLead?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const isNew = data && !Array.isArray(data) && Array.isArray(data.leads);
      let leadsArr = isNew ? data.leads : (Array.isArray(data) ? data : []);

      if (filters.followUpStatus === "today") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        leadsArr = leadsArr.filter((lead) => {
          if (!lead.followUpDate) return false;
          const followUpDay = new Date(lead.followUpDate);
          followUpDay.setHours(0, 0, 0, 0);
          return followUpDay.getTime() === today.getTime();
        });
      }

      if (filters.startDate || filters.endDate) {
        leadsArr = leadsArr.filter((lead) => {
          if (!lead.createdAt) return true;
          const createdTime = new Date(lead.createdAt).getTime();
          let fromTime = 0;
          let toTime = Infinity;
          if (filters.startDate) {
            const fromDate = new Date(filters.startDate);
            fromDate.setHours(0, 0, 0, 0);
            fromTime = fromDate.getTime();
          }
          if (filters.endDate) {
            const toDate = new Date(filters.endDate);
            toDate.setHours(23, 59, 59, 999);
            toTime = toDate.getTime();
          }
          return createdTime >= fromTime && createdTime <= toTime;
        });
      }

      setLocalLeads(leadsArr);
    } catch (err) {
      console.error("Fetch pipeline leads error:", err);
      toast.error("Failed to load pipeline leads");
    } finally {
      setIsLoading(false);
    }
  }, [filters, API_URL]);

  useEffect(() => {
    fetchPipelineLeads();
  }, [fetchPipelineLeads]);

  useEffect(() => {
    const grouped = {};
    STAGES.forEach((s) => (grouped[s.id] = []));
    localLeads.forEach((lead) => {
      // Sometimes rejected leads are marked as 'Rejected', map to 'Junk' visually
      let status = STAGES.find((s) => s.id === lead.status) ? lead.status : "Cold";
      if (lead.status === "Rejected") status = "Junk";
      if (!grouped[status]) grouped[status] = [];
      grouped[status].push(lead);
    });
    setColumns(grouped);
  }, [localLeads]);

  const moveLead = async (leadId, fromStage, toStage) => {
    if (fromStage === toStage) return;
    
    setColumns((prev) => {
      let movedLead;
      const next = { ...prev };
      next[fromStage] = prev[fromStage].filter((l) => {
        if (l._id === leadId) {
          movedLead = l;
          return false;
        }
        return true;
      });
      if (movedLead) {
        next[toStage] = [...prev[toStage], { ...movedLead, status: toStage }];
      }
      return next;
    });

    try {
      const token = localStorage.getItem("token");
      
      const formData = new FormData();
      formData.append("status", toStage);

      await axios.put(`${API_URL}/leads/updateLead/${leadId}`, formData, {
        headers: { 
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}` 
        },
      });

      fetchPipelineLeads();
    } catch (err) {
      console.error("Failed to update lead status:", err);
      toast.error("Failed to update lead status");
      fetchPipelineLeads();
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
        <p className="text-sm text-gray-500">Loading pipeline...</p>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="mx-auto flex gap-4 overflow-x-auto pb-4 pt-2">
        {STAGES.map((stage) => (
          <Column
            key={stage.id}
            id={stage.id}
            title={stage.title}
            titleColor={stage.color}
            bgColor={stage.bgColor}
            borderColor={stage.borderColor}
            leads={columns[stage.id] || []}
            moveLead={moveLead}
            onReject={onRejectClick}
            onConvert={onConvertClick}
            onEdit={onEditClick}
          />
        ))}
      </div>
    </DndProvider>
  );
}

function Column({
  id,
  title,
  titleColor,
  bgColor,
  borderColor,
  leads,
  moveLead,
  onReject,
  onConvert,
  onEdit,
}) {
  const [, dropRef] = useDrop({
    accept: ItemTypes.LEAD,
    drop: (item) => {
      if (item.from !== id) {
        moveLead(item.id, item.from, id);
      }
    },
  });

  return (
    <div
      ref={dropRef}
      className={`min-w-[320px] w-[320px] flex flex-col border-2 ${borderColor} rounded-xl bg-white p-3 shadow-sm`}
    >
      <div className="mb-3">
        <h2 className={`text-sm font-bold flex items-center justify-between ${titleColor} ${bgColor} p-3 rounded-lg`}>
          <span>{title}</span>
          <span className="inline-flex items-center justify-center border px-2 py-0.5 text-xs text-gray-600 bg-white rounded-full min-w-[24px]">
            {leads.length}
          </span>
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
        <div className="flex flex-col gap-3 pb-2">
          {leads.map((lead) => (
            <LeadCard
              key={lead._id}
              lead={lead}
              stageId={id}
              moveLead={moveLead}
              onReject={onReject}
              onConvert={onConvert}
              onEdit={onEdit}
            />
          ))}
          {leads.length === 0 && (
            <div className="mt-4 border-2 border-dashed border-gray-200 p-6 text-center text-sm text-gray-500 rounded-xl">
              Drop leads here
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LeadCard({ lead, stageId, onReject, onConvert, onEdit }) {
  const [{ isDragging }, dragRef] = useDrag({
    type: ItemTypes.LEAD,
    item: { id: lead._id, from: stageId },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const assignedToName = lead.assignTo
    ? `${lead.assignTo.firstName || ""} ${lead.assignTo.lastName || ""}`.trim()
    : "Unassigned";

  const isTerminal = stageId === "Junk";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = React.useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      ref={dragRef}
      className={`border border-gray-200 p-3 rounded-xl shadow-sm bg-white hover:shadow-md transition-shadow relative ${isTerminal ? "" : "cursor-move"}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div className="absolute top-2 right-2" ref={menuRef}>
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
          className="p-1 rounded hover:bg-gray-100 text-gray-500"
        >
          <MoreVertical size={16} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-[9999]">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(lead._id); }}
              className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Edit className="w-4 h-4 mr-2" /> Edit Lead
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(lead._id); }}
              className="flex items-center w-full px-3 py-2 text-sm text-blue-600 hover:bg-gray-100"
            >
              <Calendar className="w-4 h-4 mr-2" /> Edit Follow-up
            </button>
            {stageId !== "Converted" && (
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onConvert(lead); }}
                className="flex items-center w-full px-3 py-2 text-sm text-green-600 hover:bg-gray-100"
              >
                <Handshake className="w-4 h-4 mr-2" /> Convert
              </button>
            )}
            {!isTerminal && (
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onReject(lead); }}
                className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-gray-100"
              >
                <Ban className="w-4 h-4 mr-2" /> Reject
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between items-start mb-2 pr-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 line-clamp-1" title={lead.leadName}>
            {lead.leadName || "Unnamed Lead"}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{lead.companyName || "No Company"}</p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 mt-3 text-xs text-gray-600">
        <div className="flex justify-between items-center bg-gray-50 p-1.5 rounded">
          <span className="font-medium">Assignee:</span>
          <span className="truncate max-w-[120px]" title={assignedToName}>{assignedToName}</span>
        </div>
        <div className="flex justify-between items-center bg-gray-50 p-1.5 rounded">
          <span className="font-medium">Follow-up:</span>
          <span>
            {lead.followUpDate
              ? new Date(lead.followUpDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "-"}
          </span>
        </div>
      </div>
    </div>
  );
}
