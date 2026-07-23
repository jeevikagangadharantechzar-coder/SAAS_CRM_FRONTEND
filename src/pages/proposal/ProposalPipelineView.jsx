import React, { useState, useEffect } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { MoreVertical, Calendar, Trash2, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

const ItemTypes = {
  PROPOSAL: "PROPOSAL",
};

const STAGES = [
  {
    id: "draft",
    title: "Draft",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
  {
    id: "sent",
    title: "Sent",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  {
    id: "no reply",
    title: "No Reply",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    borderColor: "border-gray-200",
  },
  {
    id: "rejection",
    title: "Rejection",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  {
    id: "success",
    title: "Success",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  }
];

export default function ProposalPipelineView({
  proposals,
  handleStatusChange,
  handleDelete,
  openFollowUpDialog,
}) {
  const [columns, setColumns] = useState({});

  useEffect(() => {
    const grouped = {};
    STAGES.forEach((s) => (grouped[s.id] = []));
    
    // Group proposals by status, handling unknown statuses gracefully
    proposals.forEach((proposal) => {
      const status = STAGES.find((s) => s.id === proposal.status) ? proposal.status : "draft";
      if (!grouped[status]) grouped[status] = [];
      grouped[status].push(proposal);
    });
    setColumns(grouped);
  }, [proposals]);

  const moveProposal = async (proposalId, fromStage, toStage) => {
    if (fromStage === toStage) return;
    
    // Optimistic UI update
    setColumns((prev) => {
      let movedProposal;
      const next = { ...prev };
      next[fromStage] = prev[fromStage].filter((p) => {
        if (p._id === proposalId) {
          movedProposal = p;
          return false;
        }
        return true;
      });
      if (movedProposal) {
        next[toStage] = [...prev[toStage], { ...movedProposal, status: toStage }];
      }
      return next;
    });

    // Call API handler from parent
    handleStatusChange(proposalId, toStage);
  };

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
            proposals={columns[stage.id] || []}
            moveProposal={moveProposal}
            onDelete={handleDelete}
            onEditFollowUp={openFollowUpDialog}
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
  proposals,
  moveProposal,
  onDelete,
  onEditFollowUp,
}) {
  const [, dropRef] = useDrop({
    accept: ItemTypes.PROPOSAL,
    drop: (item) => {
      if (item.from !== id) {
        moveProposal(item.id, item.from, id);
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
            {proposals.length}
          </span>
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
        <div className="flex flex-col gap-3 pb-2">
          {proposals.map((proposal) => (
            <ProposalCard
              key={proposal._id}
              proposal={proposal}
              stageId={id}
              moveProposal={moveProposal}
              onDelete={onDelete}
              onEditFollowUp={onEditFollowUp}
            />
          ))}
          {proposals.length === 0 && (
            <div className="mt-4 border-2 border-dashed border-gray-200 p-6 text-center text-sm text-gray-500 rounded-xl">
              Drop proposals here
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProposalCard({ proposal, stageId, onDelete, onEditFollowUp }) {
  const [{ isDragging }, dragRef] = useDrag({
    type: ItemTypes.PROPOSAL,
    item: { id: proposal._id, from: stageId },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

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
      className="border border-gray-200 p-3 rounded-xl shadow-sm bg-white hover:shadow-md transition-shadow relative cursor-move"
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
            <Link
              to={`/proposal/view/${proposal._id}`}
              className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Eye className="w-4 h-4 mr-2" /> View Proposal
            </Link>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEditFollowUp(proposal); }}
              className="flex items-center w-full px-3 py-2 text-sm text-blue-600 hover:bg-gray-100"
            >
              <Calendar className="w-4 h-4 mr-2" /> Follow-up Date
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(proposal._id); }}
              className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-gray-100"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-between items-start mb-2 pr-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 line-clamp-1" title={proposal.title}>
            {proposal.title || "Untitled Proposal"}
          </h3>
          <p className="text-xs text-blue-600 mt-0.5 line-clamp-1 hover:underline cursor-pointer">
            <Link to={`/proposal/view/${proposal._id}`}>{proposal.dealTitle || "No Deal"}</Link>
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 mt-3 text-xs text-gray-600">
        <div className="flex justify-between items-center bg-gray-50 p-1.5 rounded">
          <span className="font-medium">Email:</span>
          <span className="truncate max-w-[120px]" title={proposal.email}>{proposal.email || "-"}</span>
        </div>
        <div className="flex justify-between items-center bg-gray-50 p-1.5 rounded">
          <span className="font-medium">Created Date:</span>
          <span>
            {proposal.createdDate || proposal.createdAt
              ? new Date(proposal.createdDate || proposal.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "-"}
          </span>
        </div>
        <div className="flex justify-between items-center bg-gray-50 p-1.5 rounded">
          <span className="font-medium">Follow-up:</span>
          <span>
            {proposal.followUpDate
              ? new Date(proposal.followUpDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "-"}
          </span>
        </div>
      </div>
    </div>
  );
}
