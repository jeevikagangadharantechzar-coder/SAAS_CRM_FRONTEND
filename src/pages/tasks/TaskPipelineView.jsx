import React, { useMemo, useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { toast } from "react-toastify";
import { Clock, Briefcase, FileText, CheckCircle, Trash2, Edit2, Info } from "lucide-react";
import axios from "axios";

// Statuses matching backend enum
const STAGES = [
  { id: "New", title: "New", color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
  { id: "In Progress", title: "In Progress", color: "text-amber-600", bgColor: "bg-amber-50", borderColor: "border-amber-200" },
  { id: "In Hold", title: "In Hold", color: "text-purple-600", bgColor: "bg-purple-50", borderColor: "border-purple-200" },
  { id: "Completed", title: "Completed", color: "text-emerald-600", bgColor: "bg-emerald-50", borderColor: "border-emerald-200" },
  { id: "Rejected", title: "Rejected", color: "text-rose-600", bgColor: "bg-rose-50", borderColor: "border-rose-200" },
];

const ItemTypes = {
  TASK: "TASK",
};

export default function TaskPipelineView({ tasks, baseUrl, headers, onRefresh, onEdit, onApproveRejection, onApproveHold }) {
  const [inProcessModal, setInProcessModal] = useState(null); // kept for legacy / safe removal
  const [rejectModal, setRejectModal] = useState(null);
  const [inHoldModal, setInHoldModal] = useState(null);
  const [note, setNote] = useState("");

  const columns = useMemo(() => {
    const cols = { "New": [], "In Progress": [], "In Hold": [], "Completed": [], "Rejected": [] };
    tasks.forEach(t => {
      if (cols[t.status]) cols[t.status].push(t);
      else cols["New"].push(t); // fallback
    });
    return cols;
  }, [tasks]);

  const updateTaskStatus = async (taskId, newStatus, extraData = {}) => {
    try {
      await axios.put(`${baseUrl}/tasks/${taskId}`, { status: newStatus, ...extraData }, { headers });
      toast.success("Task updated");
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update task");
    }
  };

  const moveTask = (taskId, fromStatus, toStatus) => {
    if (fromStatus === toStatus) return;

    if (fromStatus === "Completed") {
      toast.error("You cannot move a task out of Completed.");
      return;
    }

    if (toStatus === "Completed") {
      toast.error("The system is automated, you cannot drop here.");
      return;
    }

    // Check if task is overdue when moving to In Progress
    const task = tasks.find(t => t._id === taskId);

    if (toStatus === "In Progress") {
      toast.error("Tasks automatically move to 'In Progress' when you start working on linked items.");
      return;
    } else if (toStatus === "In Hold") {
      setInHoldModal({ taskId });
    } else if (toStatus === "Rejected") {
      setRejectModal({ taskId });
    } else {
      updateTaskStatus(taskId, toStatus);
    }
  };

  const submitInProcess = () => {
    if (!note.trim()) return toast.error("Please provide a note on what you will work on.");
    updateTaskStatus(inProcessModal.taskId, "In Progress", { inProcessNote: note });
    setInProcessModal(null);
    setNote("");
  };

  const submitReject = () => {
    if (!note.trim()) return toast.error("Please provide a rejection reason.");
    updateTaskStatus(rejectModal.taskId, "Rejected", { rejectionReason: note });
    setRejectModal(null);
    setNote("");
  };

  const submitInHold = () => {
    if (!note.trim()) return toast.error("Please provide a reason for hold (e.g., Medical leave).");
    updateTaskStatus(inHoldModal.taskId, "In Hold", { holdReason: note });
    setInHoldModal(null);
    setNote("");
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-250px)]">
        {STAGES.map(stage => (
          <Column 
            key={stage.id} 
            stage={stage} 
            tasks={columns[stage.id]} 
            moveTask={moveTask} 
            onEdit={onEdit} 
            onApproveRejection={onApproveRejection}
            onApproveHold={onApproveHold}
          />
        ))}
      </div>

      {inProcessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="mb-4">Start Task</h3>
            <p className="text-base text-slate-600 mb-2">What work are you going to do?</p>
            <textarea
              className="w-full border border-gray-300 rounded p-2 mb-4"
              rows={3}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. I will call the client to discuss the proposal..."
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setInProcessModal(null); setNote(""); }} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded">Cancel</button>
              <button onClick={submitInProcess} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Start</button>
            </div>
          </div>
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-red-600 mb-4">Reject Task</h3>
            <p className="text-base text-slate-600 mb-2">Reason for rejection (Requires Admin Approval)</p>
            <textarea
              className="w-full border border-gray-300 rounded p-2 mb-4"
              rows={3}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Client not reachable, overdue..."
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setRejectModal(null); setNote(""); }} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded">Cancel</button>
              <button onClick={submitReject} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Request Rejection</button>
            </div>
          </div>
        </div>
      )}

      {inHoldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-purple-600 mb-4">Put Task In Hold</h3>
            <p className="text-base text-slate-600 mb-2">Reason for hold (e.g., Medical Leave)</p>
            <textarea
              className="w-full border border-gray-300 rounded p-2 mb-4"
              rows={3}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. I am on a 1 week medical leave..."
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setInHoldModal(null); setNote(""); }} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded">Cancel</button>
              <button onClick={submitInHold} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">Request Hold</button>
            </div>
          </div>
        </div>
      )}
    </DndProvider>
  );
}

function Column({ stage, tasks, moveTask, onEdit, onApproveRejection, onApproveHold }) {
  const [, drop] = useDrop({
    accept: ItemTypes.TASK,
    drop: (item) => moveTask(item.id, item.status, stage.id),
  });

  return (
    <div ref={drop} className={`flex-shrink-0 w-80 rounded-xl border ${stage.bgColor} ${stage.borderColor} flex flex-col`}>
      <div className={`px-4 py-3 border-b ${stage.borderColor} flex justify-between items-center bg-white/50 rounded-t-xl`}>
        <h3 className={`${stage.color}`}>{stage.title}</h3>
        <span className="bg-white px-2 py-0.5 rounded text-sm font-medium shadow-sm">{tasks.length}</span>
      </div>
      <div className="p-3 flex-1 overflow-y-auto space-y-3">
        {tasks.map(task => (
          <TaskCard key={task._id} task={task} onEdit={onEdit} onApproveRejection={onApproveRejection} onApproveHold={onApproveHold} />
        ))}
      </div>
    </div>
  );
}

function TaskCard({ task, onEdit, onApproveRejection, onApproveHold }) {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.TASK,
    item: { id: task._id, status: task.status },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const isOverdue = new Date(task.dueDate) < new Date(new Date().setHours(0,0,0,0)) && task.status !== "Completed";

  return (
    <div ref={drag} className={`bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-grab ${isDragging ? "opacity-50" : "opacity-100"} hover:shadow-md transition-shadow`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-slate-700 line-clamp-2">{task.title}</h3>
        <button onClick={() => onEdit(task)} className="text-gray-400 hover:text-blue-600 ml-2"><Edit2 size={14}/></button>
      </div>
      
      {task.rejectionRequested && (
        <div className="bg-rose-50 text-rose-700 text-xs px-2 py-2 rounded border border-rose-200 mb-2 font-medium">
          <div className="flex items-center gap-1 mb-1">
            <Info size={12}/> Rejection Pending
          </div>
          {onApproveRejection && (
            <div className="flex gap-2 mt-2">
              <button onClick={() => onApproveRejection(task, "approve")} className="flex-1 bg-red-600 text-white text-xs py-1 rounded">Approve</button>
              <button onClick={() => onApproveRejection(task, "deny")} className="flex-1 bg-gray-300 text-gray-800 text-xs py-1 rounded">Deny</button>
            </div>
          )}
        </div>
      )}

      {task.holdRequested && (
        <div className="bg-purple-50 text-purple-700 text-xs px-2 py-2 rounded border border-purple-200 mb-2 font-medium">
          <div className="flex items-center gap-1 mb-1">
            <Info size={12}/> Hold Pending: {task.holdReason}
          </div>
          {onApproveHold && (
            <div className="flex gap-2 mt-2">
              <button onClick={() => onApproveHold(task, "approve")} className="flex-1 bg-purple-600 text-white text-xs py-1 rounded">Approve</button>
              <button onClick={() => onApproveHold(task, "deny")} className="flex-1 bg-gray-300 text-gray-800 text-xs py-1 rounded">Deny</button>
            </div>
          )}
        </div>
      )}

      {isOverdue && !task.rejectionRequested && task.status !== "Rejected" && (
         <div className="bg-red-50 text-red-600 text-xs px-2 py-1 rounded border border-red-200 mb-2 flex items-center gap-1 font-medium">
          <Clock size={12}/> Overdue
        </div>
      )}

      <div className="text-xs text-gray-500 mb-2 line-clamp-2">
        {task.description || "No description"}
      </div>

      <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1">
          <Clock size={12} className={isOverdue ? "text-red-500" : ""} />
          <span className={isOverdue ? "text-red-500 font-medium" : ""}>
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`px-2 py-0.5 rounded-full ${task.priority === 'Urgent' ? 'bg-red-100 text-red-700' : task.priority === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
            {task.priority}
          </span>
        </div>
      </div>
    </div>
  );
}
