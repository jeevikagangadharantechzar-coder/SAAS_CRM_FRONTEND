import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import axios from "axios";
import { toast } from "react-toastify";
import { Loader2, MoreVertical, Edit, Calendar, Ban, Handshake, Flag, Target, MessageSquarePlus, Eye } from "lucide-react";

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
    id: "Rejected",
    title: "Rejected",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  {
    id: "Junk",
    title: "Junk",
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
  onLinkedWorkClick,
  userRole,
  userId,
  onAddNoteClick,
  onViewHistoryClick,
  onFollowUpClick,
  editingFollowUpId,
  setEditingFollowUpId,
  updateFollowUpDateInline,
  followUpSavingId,
  onLeadClick,
  pipelineTrigger,
}) {
  const API_URL = import.meta.env.VITE_API_URL;
  const [columns, setColumns] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [localLeads, setLocalLeads] = useState([]);
  const scrollRef = React.useRef(null);

  useEffect(() => {
    function handleDrag(e) {
      const container = scrollRef.current;
      if (!container) return;

      const { clientX, clientY } = e;
      const { left, right } = container.getBoundingClientRect();
      const scrollAmount = 20;

      // Horizontal autoscrolling
      if (clientX - left < 85 && clientX > 0) {
        container.scrollLeft -= scrollAmount;
      } else if (right - clientX < 85 && clientX < window.innerWidth) {
        container.scrollLeft += scrollAmount;
      }

      // Vertical autoscrolling for individual columns
      const cols = document.querySelectorAll(".column-body-scroll");
      cols.forEach((col) => {
        const rect = col.getBoundingClientRect();
        if (clientX >= rect.left && clientX <= rect.right) {
          if (clientY - rect.top < 85 && clientY > rect.top) {
            col.scrollTop -= scrollAmount;
          } else if (rect.bottom - clientY < 85 && clientY < rect.bottom) {
            col.scrollTop += scrollAmount;
          }
        }
      });
    }

    window.addEventListener("dragover", handleDrag);
    return () => window.removeEventListener("dragover", handleDrag);
  }, []);

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
      // console.error("Fetch pipeline leads error:", err);
      toast.error("Failed to load pipeline leads");
    } finally {
      setIsLoading(false);
    }
  }, [
    filters.search,
    filters.status,
    filters.source,
    filters.clientType,
    filters.assignee,
    filters.followUpStatus,
    filters.startDate,
    filters.endDate,
    API_URL,
  ]);

  useEffect(() => {
    fetchPipelineLeads();
  }, [fetchPipelineLeads, pipelineTrigger]);

  useEffect(() => {
    const grouped = {};
    STAGES.forEach((s) => (grouped[s.id] = []));
    localLeads.forEach((lead) => {
      let status = STAGES.find((s) => s.id === lead.status) ? lead.status : "Cold";
      if (lead.status === "Rejected") {
        status = "Rejected";
      } else if (lead.status === "Junk") {
        if (lead.rejectionReason) {
          status = "Rejected";
        } else {
          status = "Junk";
        }
      }
      if (!grouped[status]) grouped[status] = [];
      grouped[status].push(lead);
    });
    setColumns(grouped);
  }, [localLeads]);

  const moveLead = async (leadId, fromStage, toStage) => {
    if (fromStage === toStage) return;

    if (toStage === "Rejected") {
      if (userRole !== "Admin") {
        toast.error("Only Admins can reject leads.");
        fetchPipelineLeads();
        return;
      }
      const leadObj = localLeads.find(l => l._id === leadId);
      if (leadObj && onRejectClick) {
        onRejectClick(leadObj);
        return;
      }
    }

    if (toStage === "Converted") {
      const leadObj = localLeads.find(l => l._id === leadId);
      if (leadObj && onConvertClick) {
        onConvertClick(leadObj);
        return;
      }
    }

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
      <div ref={scrollRef} className="mx-auto flex gap-4 overflow-x-auto pb-4 pt-2">
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
            onLinkedWork={onLinkedWorkClick}
            onAddNote={onAddNoteClick}
            onViewHistory={onViewHistoryClick}
            onEditFollowUp={onFollowUpClick}
            editingFollowUpId={editingFollowUpId}
            setEditingFollowUpId={setEditingFollowUpId}
            updateFollowUpDateInline={updateFollowUpDateInline}
            followUpSavingId={followUpSavingId}
            onLeadClick={onLeadClick}
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
  onLinkedWork,
  onAddNote,
  onViewHistory,
  onEditFollowUp,
  editingFollowUpId,
  setEditingFollowUpId,
  updateFollowUpDateInline,
  followUpSavingId,
  onLeadClick,
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
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-1 column-body-scroll">
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
              onLinkedWork={onLinkedWork}
              onAddNote={onAddNote}
              onViewHistory={onViewHistory}
              onEditFollowUp={onEditFollowUp}
              editingFollowUpId={editingFollowUpId}
              setEditingFollowUpId={setEditingFollowUpId}
              updateFollowUpDateInline={updateFollowUpDateInline}
              followUpSavingId={followUpSavingId}
              onLeadClick={onLeadClick}
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

function LeadCard({
  lead,
  stageId,
  onReject,
  onConvert,
  onEdit,
  onLinkedWork,
  onAddNote,
  onViewHistory,
  onEditFollowUp,
  editingFollowUpId,
  setEditingFollowUpId,
  updateFollowUpDateInline,
  followUpSavingId,
  onLeadClick,
}) {
  const isTerminal = stageId === "Rejected";
  const [{ isDragging }, dragRef] = useDrag({
    type: ItemTypes.LEAD,
    item: { id: lead._id, from: stageId },
    canDrag: () => !isTerminal,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const assignedToName = lead.assignTo
    ? `${lead.assignTo.firstName || ""} ${lead.assignTo.lastName || ""}`.trim()
    : "Unassigned";

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = React.useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        (menuRef.current && menuRef.current.contains(event.target)) ||
        event.target.closest(".lead-card-dropdown")
      ) {
        return;
      }
      setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      ref={dragRef}
      className={`border border-gray-200 p-3 rounded-xl shadow-sm bg-white hover:shadow-md transition-shadow relative ${isTerminal ? "pointer-events-none select-none opacity-65" : "cursor-move"}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      {editingFollowUpId === lead._id && (
        <input
          ref={(el) => {
            if (el) {
              el.focus();
              el.click();
              if (typeof el.showPicker === "function") {
                el.showPicker();
              }
            }
          }}
          type="date"
          defaultValue={lead.followUpDate ? new Date(new Date(lead.followUpDate).getTime() - new Date(lead.followUpDate).getTimezoneOffset() * 60000).toISOString().split("T")[0] : ""}
          className="absolute left-0 top-0 w-0 h-0 opacity-0"
          onChange={(e) => updateFollowUpDateInline(lead._id, e.target.value)}
          onBlur={() => setEditingFollowUpId(null)}
        />
      )}

      <div className="absolute top-2 right-2 flex items-center" ref={menuRef}>
        {/* Linked Work Icons */}
        {((lead.activeTasks && lead.activeTasks.length > 0) || (lead.activeTargets && lead.activeTargets.length > 0)) && (
          <div
            className="flex items-center gap-1 mr-2 cursor-pointer bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200"
            onClick={(e) => {
              e.stopPropagation();
              onLinkedWork({
                activeTasks: lead.activeTasks || [],
                activeTargets: lead.activeTargets || [],
                itemName: lead.leadName || "Unnamed Lead"
              });
            }}
          >
            {(lead.activeTasks && lead.activeTasks.length > 0) && (
              <Flag size={12} className="text-blue-500 hover:text-blue-600 transition-colors" />
            )}
            {(lead.activeTargets && lead.activeTargets.length > 0) && (
              <Target size={12} className="text-purple-500 hover:text-purple-600 transition-colors" />
            )}
          </div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!menuOpen) {
              const rect = e.currentTarget.getBoundingClientRect();
              const menuHeight = 220; // Estimated max height of dropdown
              const viewportHeight = window.innerHeight;
              let top = rect.bottom + 4;
              let left = rect.right - 208; // Align right edge

              if (top + menuHeight > viewportHeight) {
                top = rect.top - menuHeight - 4;
              }
              if (left < 10) left = 10;

              setMenuPosition({ top, left });
            }
            setMenuOpen(!menuOpen);
          }}
          className="p-1 rounded hover:bg-gray-100 text-gray-500"
        >
          <MoreVertical size={16} />
        </button>
        {menuOpen && ReactDOM.createPortal(
          <div
            className="fixed z-[9999] w-52 bg-white rounded-lg shadow-xl border border-gray-200 py-1 lead-card-dropdown"
            style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(lead._id); }}
              className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Edit className="w-4 h-4 mr-2" /> Edit Lead
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onAddNote(lead); }}
              className="flex items-center w-full px-3 py-2 text-sm text-blue-600 hover:bg-gray-100"
            >
              <MessageSquarePlus className="w-4 h-4 mr-2" /> Add Follow-up Note
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onViewHistory(lead); }}
              className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Eye className="w-4 h-4 mr-2" /> View History
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
          </div>,
          document.body
        )}
      </div>

      <div className="flex justify-between items-start mb-2 pr-6">
        <div>
          <h3
            onClick={() => onLeadClick && onLeadClick(lead._id)}
            className="text-sm font-semibold text-blue-600 hover:underline cursor-pointer line-clamp-1"
            title={lead.leadName}
          >
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
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setEditingFollowUpId(lead._id); }}
            className="text-blue-600 hover:underline font-medium inline-flex items-center gap-1 focus:outline-none"
            title="Click to update follow-up date"
          >
            {lead.followUpDate
              ? new Date(lead.followUpDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "-"}
          </button>
        </div>
      </div>
    </div>
  );
}
