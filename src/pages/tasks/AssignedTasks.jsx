import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNotifications } from "../../context/NotificationContext";
import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle, Clock, AlertCircle, Calendar, Flag, User,
  ClipboardList, ArrowRight, StickyNote, X, FileText, Briefcase,
  MessageSquare,
} from "lucide-react";

const SI_URI  = import.meta.env.VITE_SI_URI  || "http://localhost:5000";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const PRIORITY_COLORS = {
  Low:    "bg-sky-50 text-sky-600 border-sky-200",
  Medium: "bg-amber-50 text-amber-600 border-amber-200",
  High:   "bg-orange-50 text-orange-600 border-orange-200",
  Urgent: "bg-red-50 text-red-600 border-red-200",
};

/* ── Notes Modal (add/edit delay notes) ─────────────────────── */
function NotesModal({ open, task, onClose, onSave }) {
  const [notes, setNotes] = useState("");
  useEffect(() => { if (open) setNotes(task?.completionNotes || ""); }, [open, task]);

  if (!open || !task) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <StickyNote size={16} className="text-amber-500" /> Add Note
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X size={16} className="text-gray-400" />
          </button>
        </div>
        <div className="p-5">
          <p className="text-xs text-gray-400 mb-3">
            Explain any delays or updates for: <span className="font-semibold text-gray-600">{task.title}</span>
          </p>
          <textarea
            rows={4}
            autoFocus
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-400 resize-none"
            placeholder="e.g. Lead took extra time due to 3 follow-up calls..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1.5">This note will be visible to admin.</p>
          <div className="flex gap-2 mt-4">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={() => onSave(notes)}
              className="flex-1 py-2 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600"
            >
              Save Note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Complete Task Modal ─────────────────────── */
function CompleteModal({ open, task, onClose, onConfirm }) {
  const [notes, setNotes] = useState("");
  useEffect(() => { if (open) setNotes(task?.completionNotes || ""); }, [open, task]);

  if (!open || !task) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-500" /> Mark as Done
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X size={16} className="text-gray-400" />
          </button>
        </div>
        <div className="p-5">
          <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-200">
            <p className="text-sm font-semibold text-gray-700">{task.title}</p>
            {task.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{task.description}</p>}
          </div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Completion notes <span className="text-gray-400 font-normal text-xs">(optional)</span>
          </label>
          <textarea
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/50 focus:border-emerald-400 resize-none"
            placeholder="Any final notes for admin..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex gap-2 mt-4">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={() => onConfirm(notes)}
              className="flex-1 py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 flex items-center justify-center gap-1.5"
            >
              <CheckCircle size={15} /> Submit as Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Task Card ─────────────────────── */
function AssignedTaskCard({ task, onStartTask, onCompleteTask, onAddNote }) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "Completed";
  const isCompleted = task.status === "Completed";
  const isPending = task.status === "Pending";
  const isInProgress = task.status === "In Progress";

  const leadName = task.leadRef?.leadName
    ? `${task.leadRef.leadName}${task.leadRef.companyName ? ` · ${task.leadRef.companyName}` : ""}`
    : null;
  const dealName = task.dealRef?.dealName || task.dealRef?.dealTitle || null;

  const statusBar = isCompleted ? "bg-emerald-400" : isInProgress ? "bg-blue-400" : isOverdue ? "bg-red-300" : "bg-gray-200";

  return (
    <div className={`bg-white rounded-xl border overflow-hidden hover:shadow-sm transition-shadow ${
      isOverdue && !isCompleted ? "border-red-200" : isCompleted ? "border-emerald-200" : "border-gray-200"
    }`}>
      {/* Top color strip */}
      <div className={`h-1 w-full ${statusBar}`} />

      <div className="p-4">
        {/* Status + overdue */}
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-md flex items-center gap-1 ${
            isCompleted ? "bg-emerald-50 text-emerald-600" :
            isInProgress ? "bg-blue-50 text-blue-600" :
            "bg-gray-100 text-gray-500"
          }`}>
            {isCompleted ? <CheckCircle size={10} /> : isInProgress ? <AlertCircle size={10} /> : <Clock size={10} />}
            {task.status}
          </span>
          {isOverdue && !isCompleted && (
            <span className="text-xs font-medium text-red-500 flex items-center gap-0.5">
              <AlertCircle size={10} /> Overdue
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-gray-800 text-sm mb-1 leading-snug">{task.title}</h3>
        {task.description && (
          <p className="text-xs text-gray-400 mb-2 break-words">{task.description}</p>
        )}

        {/* Lead / Deal tags */}
        {(leadName || dealName) && (
          <div className="flex flex-col gap-1 mb-3">
            {leadName && (
              <div className="flex items-center gap-1.5 px-1 py-0.5">
                <FileText size={11} className="text-blue-500 shrink-0" />
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wide shrink-0">Lead</span>
                <span className="text-xs text-gray-800 truncate font-medium">{leadName}</span>
              </div>
            )}
            {dealName && (
              <div className="flex items-center gap-1.5 px-1 py-0.5">
                <Briefcase size={11} className="text-blue-500 shrink-0" />
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wide shrink-0">Deal</span>
                <span className="text-xs text-gray-800 truncate font-medium">{dealName}</span>
              </div>
            )}
          </div>
        )}

        {/* Priority badge */}
        <div className="mb-3">
          <span className={`text-xs px-2 py-0.5 rounded-md font-medium border ${PRIORITY_COLORS[task.priority]} flex items-center gap-1 w-fit`}>
            <Flag size={10} />{task.priority}
          </span>
        </div>

        {/* Notes (if any) */}
        {task.completionNotes && (
          <div className="flex items-start gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2 mb-3 overflow-hidden">
            <StickyNote size={12} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-gray-600 break-words min-w-0 w-full">{task.completionNotes}</p>
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
          <User size={10} />
          <span>From: {task.createdBy?.firstName} {task.createdBy?.lastName}</span>
        </div>
        <div className={`flex items-center gap-1.5 text-xs mb-4 ${isOverdue && !isCompleted ? "text-red-400 font-medium" : "text-gray-400"}`}>
          <Calendar size={10} />
          <span>Due {task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</span>
        </div>

        {/* Actions */}
        {isPending && (
          <div className="flex gap-2">
            <button
              onClick={() => onAddNote(task)}
              className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50 text-xs font-medium transition-colors"
              title="Add a note"
            >
              <MessageSquare size={13} /> Note
            </button>
            <button
              onClick={() => onStartTask(task)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#008ecc] text-white hover:bg-[#0077aa] text-xs font-semibold transition-colors"
            >
              <ArrowRight size={13} /> Start Task
            </button>
          </div>
        )}

        {isInProgress && (
          <div className="flex gap-2">
            <button
              onClick={() => onAddNote(task)}
              className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50 text-xs font-medium transition-colors"
              title="Add a note"
            >
              <MessageSquare size={13} /> Note
            </button>
            <button
              onClick={() => onCompleteTask(task)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-bold transition-colors"
            >
              <CheckCircle size={13} /> Mark as Done
            </button>
          </div>
        )}

        {isCompleted && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-600 font-medium py-2 bg-emerald-50 rounded-lg">
            <CheckCircle size={13} /> Done — Awaiting Admin Approval
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────── */
export default function AssignedTasks() {
  const location = useLocation();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(location.state?.filter || "All");
  const [filterInitialized, setFilterInitialized] = useState(!!location.state?.filter);
  const [completeModal, setCompleteModal] = useState({ open: false, task: null });
  const [notesModal, setNotesModal] = useState({ open: false, task: null });
  const { notifications, setNotifications } = useNotifications();

  // All "Task Approved" notifications from context — shown inside the Task Approved tab
  const approvedNotifications = notifications.filter(
    (n) => n.type === "task" && n.meta?.taskApproved
  );

  const token = localStorage.getItem("token");
  const tenantSlug = localStorage.getItem("tenantSlug");
  const baseUrl = `${SI_URI}/${tenantSlug}/api`;
  const headers = { Authorization: `Bearer ${token}` };

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${baseUrl}/tasks`, { headers });
      setTasks(data);
    } catch {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  // Sync filter tab when navigating here from a notification click
  useEffect(() => {
    if (location.state?.filter) {
      setFilter(location.state.filter);
      setFilterInitialized(true);
    }
  }, [location.state?.filter]);

  // Auto-select the most relevant tab on first visit (no explicit navigation state)
  useEffect(() => {
    if (filterInitialized) return;
    const approvedUnread = notifications.filter((n) => n.type === "task" && n.meta?.taskApproved && !n.read && !n.isRead).length;
    const assignedUnread = notifications.filter((n) => n.type === "task" && n.meta?.taskAssigned && !n.read && !n.isRead).length;
    if (approvedUnread > 0) {
      setFilter("Task Approved");
    } else if (assignedUnread > 0) {
      setFilter("New Task");
    }
    setFilterInitialized(true);
  }, [notifications, filterInitialized]);

  useEffect(() => {
    fetchTasks();
  }, []);

  // Badge counts (computed here so useEffect below can reference them)
  const newTaskCount  = notifications.filter((n) => n.type === "task" && n.meta?.taskAssigned && !n.read && !n.isRead).length;
  const approvedCount = approvedNotifications.filter((n) => !n.read && !n.isRead).length;

  // Mark task-assigned notifications as read when "New Task" tab is clicked
  // Also persist to DB so they don't re-appear as unread on next login
  useEffect(() => {
    if (filter === "New Task") {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      setNotifications((prev) => {
        const unread = prev.filter((n) => n.type === "task" && n.meta?.taskAssigned && !n.read && !n.isRead && n._id && !String(n._id).includes("-"));
        // Persist each to DB
        unread.forEach((n) => {
          axios.patch(`${API_URL}/notifications/read/${n._id}`, {}, { headers }).catch(() => {});
        });
        return prev.map((n) =>
          n.type === "task" && n.meta?.taskAssigned ? { ...n, read: true, isRead: true } : n
        );
      });
    }
    if (filter === "Task Approved") {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      setNotifications((prev) => {
        const unread = prev.filter((n) => n.type === "task" && n.meta?.taskApproved && !n.read && !n.isRead && n._id && !String(n._id).includes("-"));
        unread.forEach((n) => {
          axios.patch(`${API_URL}/notifications/read/${n._id}`, {}, { headers }).catch(() => {});
        });
        return prev.map((n) =>
          n.type === "task" && n.meta?.taskApproved ? { ...n, read: true, isRead: true } : n
        );
      });
    }
  }, [filter]);

  const handleStartTask = async (task) => {
    // Optimistic update — move task to In Progress instantly, then switch tab
    setTasks((prev) => prev.map((t) => t._id === task._id ? { ...t, status: "In Progress" } : t));
    setFilter("In Progress");
    try {
      await axios.put(`${baseUrl}/tasks/${task._id}`, { status: "In Progress" }, { headers });
    } catch {
      toast.error("Failed to start task");
      fetchTasks(); // restore on error
    }
  };

  const handleSaveNote = async (notes) => {
    const { task } = notesModal;
    try {
      await axios.put(`${baseUrl}/tasks/${task._id}`, { completionNotes: notes }, { headers });
      toast.success("Note saved and admin notified");
      setNotesModal({ open: false, task: null });
      fetchTasks();
    } catch {
      toast.error("Failed to save note");
    }
  };

  const handleCompleteConfirm = async (notes) => {
    const { task } = completeModal;
    // Optimistic update — move to Completed instantly and switch tab
    setTasks((prev) => prev.map((t) => t._id === task._id ? { ...t, status: "Completed", completionNotes: notes, approvedByAdmin: false } : t));
    setCompleteModal({ open: false, task: null });
    setFilter("Completed");
    try {
      await axios.put(`${baseUrl}/tasks/${task._id}`, { status: "Completed", completionNotes: notes }, { headers });
      toast.success("Task marked as done! Admin notified.");
    } catch {
      toast.error("Failed to complete task");
      fetchTasks(); // restore on error
    }
  };

  const FILTERS = ["All", "New Task", "In Progress", "Completed", "Task Approved"];
  const filtered =
    filter === "All"          ? tasks
    : filter === "New Task"   ? tasks.filter((t) => t.status === "Pending")
    : filter === "Task Approved" ? tasks.filter((t) => t.status === "Completed" && !t.approvedByAdmin)
    : tasks.filter((t) => t.status === filter);


  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "Pending").length,
    inProgress: tasks.filter((t) => t.status === "In Progress").length,
    completed: tasks.filter((t) => t.status === "Completed").length,
  };

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <ClipboardList size={20} className="text-[#008ecc]" />
          My Tasks
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Tasks assigned to you by your admin</p>
      </div>

      {/* How it works — compact */}
      <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5 mb-5 text-xs text-blue-700">
        <span className="font-semibold">Flow:</span>
        <span>Start Task</span>
        <ArrowRight size={12} className="text-blue-400" />
        <span>Mark as Done</span>
        <ArrowRight size={12} className="text-blue-400" />
        <span>Admin Approves → Complete task Automatically Removed</span>
        <span className="ml-auto text-blue-400 font-medium">Use <MessageSquare size={11} className="inline" /> to add notes anytime</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total", value: stats.total, color: "text-gray-700" },
          { label: "Pending", value: stats.pending, color: "text-gray-500" },
          { label: "In Progress", value: stats.inProgress, color: "text-blue-600" },
          { label: "Completed", value: stats.completed, color: "text-emerald-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-3 py-3 text-center">
            <p className="text-[11px] text-gray-400">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {FILTERS.map((f) => {
          const badge = f === "New Task" ? newTaskCount : f === "Task Approved" ? approvedCount : 0;
          const isActive = filter === f;
          const isApproved = f === "Task Approved";
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                isActive
                  ? "bg-[#008ecc] text-white shadow-sm"
                  : isApproved
                  ? "bg-white text-emerald-600 border border-emerald-300 hover:border-emerald-400"
                  : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"
              }`}
            >
              {isApproved ? "✓ Task Approved" : f}
              {badge > 0 && (
                <span className={`min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold px-1 ${
                  isActive ? "bg-white/30 text-white" : "bg-[#008ecc] text-white"
                }`}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex justify-center items-center h-40 text-gray-400 text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        filter === "Task Approved" ? (
          <div className="px-1">
            {approvedNotifications.length > 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {approvedNotifications.map((n, idx) => (
                  <div
                    key={n._id}
                    className={`flex items-start gap-4 px-5 py-4 ${
                      !n.read && !n.isRead ? "bg-blue-50/40" : "bg-white"
                    } ${idx !== approvedNotifications.length - 1 ? "border-b border-gray-100" : ""}`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center border border-emerald-200">
                        <CheckCircle size={20} className="text-emerald-500" />
                      </div>
                      {!n.read && !n.isRead && (
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white" />
                      )}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="mb-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                          ✓ Task Approved
                        </span>
                      </div>
                      <p className="text-sm font-bold text-gray-800 mb-0.5">{n.title || "Task Approved"}</p>
                      <p className="text-sm text-gray-500 leading-relaxed">{n.text || n.message}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock size={11} className="text-gray-400" />
                        <span className="text-xs text-gray-400">
                          {n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : ""}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-100">
                          Tasks
                        </span>
                        {!n.read && !n.isRead && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-600 border border-blue-200">
                            Unread
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <CheckCircle size={40} className="mb-2 opacity-20" />
                <p className="text-sm font-medium">No approval notifications yet</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <CheckCircle size={40} className="mb-2 opacity-20" />
            <p className="text-sm font-medium">No tasks here</p>
            <p className="text-xs text-center mt-1">Completed tasks disappear after admin approval</p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((task) => (
            <AssignedTaskCard
              key={task._id}
              task={task}
              onStartTask={handleStartTask}
              onCompleteTask={(t) => setCompleteModal({ open: true, task: t })}
              onAddNote={(t) => setNotesModal({ open: true, task: t })}
            />
          ))}
        </div>
      )}

      <NotesModal
        open={notesModal.open}
        task={notesModal.task}
        onClose={() => setNotesModal({ open: false, task: null })}
        onSave={handleSaveNote}
      />

      <CompleteModal
        open={completeModal.open}
        task={completeModal.task}
        onClose={() => setCompleteModal({ open: false, task: null })}
        onConfirm={handleCompleteConfirm}
      />
    </div>
  );
}
