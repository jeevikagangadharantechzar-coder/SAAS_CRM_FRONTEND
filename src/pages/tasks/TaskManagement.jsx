import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useNotifications } from "../../context/NotificationContext";
import {
  Plus, Trash2, CheckCircle, Clock, AlertCircle, User,
  Calendar, Flag, X, Edit2, ThumbsUp, StickyNote,
  FileText, Briefcase,
} from "lucide-react";

const SI_URI = import.meta.env.VITE_SI_URI || "http://localhost:5000";
const API_URL = import.meta.env.VITE_API_URL;

const PRIORITY_COLORS = {
  Low:    "bg-blue-100 text-blue-700 border-blue-200",
  Medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  High:   "bg-orange-100 text-orange-700 border-orange-200",
  Urgent: "bg-red-100 text-red-700 border-red-200",
};

const PRIORITY_BORDER = {
  Low:    "border-l-blue-400",
  Medium: "border-l-yellow-400",
  High:   "border-l-orange-400",
  Urgent: "border-l-red-500",
};

const STATUS_STYLES = {
  Pending:       "bg-gray-100 text-gray-700",
  "In Progress": "bg-blue-100 text-blue-700",
  Completed:     "bg-green-100 text-green-700",
};

/* ── Confirm Delete Modal ─────────────────────── */
function ConfirmModal({ open, title, message, onConfirm, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h3 className="text-base font-bold text-gray-800 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 text-sm font-medium">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Task Create/Edit Modal ─────────────────────── */
function TaskModal({ open, onClose, onSaved, salesUsers, leads, deals, editTask, baseUrl, headers }) {
  const [form, setForm] = useState({
    title: "", description: "", priority: "Medium",
    dueDate: "", assignedTo: "", leadRef: "", dealRef: "",
  });
  const [saving, setSaving] = useState(false);
  const [dueDateObj, setDueDateObj] = useState(null);
  const [dueDateError, setDueDateError] = useState("");
  const dueDateRef = useRef(null);

  const validateDueDate = (value) => {
    if (!value) return "Due date is required";
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      return "Enter date in mm/dd/yyyy format (e.g., 07/01/2026)";
    }
    const [mm, dd, yyyy] = value.split("/").map(Number);
    if (mm < 1 || mm > 12) return "Invalid month. Must be between 01 and 12";
    const dateObj = new Date(yyyy, mm - 1, dd);
    if (
      dateObj.getFullYear() !== yyyy ||
      dateObj.getMonth() !== mm - 1 ||
      dateObj.getDate() !== dd
    ) {
      return "Invalid date. Please enter a real date in mm/dd/yyyy format";
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dateObj < today) return "Due date must be today or a future date";
    return null;
  };

  const handleDueDateChange = (date) => {
    setDueDateObj(date);
    if (date) {
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      const formatted = `${mm}/${dd}/${date.getFullYear()}`;
      setForm((f) => ({ ...f, dueDate: formatted }));
      if (dueDateError) {
        setDueDateError(validateDueDate(formatted) || "");
      }
    } else {
      setForm((f) => ({ ...f, dueDate: "" }));
      if (dueDateError) setDueDateError("Due date is required");
    }
  };

  useEffect(() => {
    if (open) {
      if (editTask) {
        let dueDateFormatted = "";
        let dueDateParsed = null;
        if (editTask.dueDate) {
          const d = new Date(editTask.dueDate);
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          dueDateFormatted = `${mm}/${dd}/${d.getFullYear()}`;
          dueDateParsed = d;
        }
        setForm({
          title: editTask.title || "",
          description: editTask.description || "",
          priority: editTask.priority || "Medium",
          dueDate: dueDateFormatted,
          assignedTo: editTask.assignedTo?._id || "",
          leadRef: editTask.leadRef?._id || editTask.leadRef || "",
          dealRef: editTask.dealRef?._id || editTask.dealRef || "",
        });
        setDueDateObj(dueDateParsed);
      } else {
        setForm({ title: "", description: "", priority: "Medium", dueDate: "", assignedTo: "", leadRef: "", dealRef: "" });
        setDueDateObj(null);
      }
      setDueDateError("");
    }
  }, [editTask, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const dateErr = validateDueDate(form.dueDate);
    if (dateErr) {
      setDueDateError(dateErr);
      setTimeout(() => dueDateRef.current?.setFocus(), 50);
      return;
    }
    setSaving(true);
    try {
      const [mm, dd, yyyy] = form.dueDate.split("/");
      const payload = { ...form, dueDate: `${yyyy}-${mm}-${dd}` };
      if (editTask) {
        await axios.put(`${baseUrl}/tasks/${editTask._id}`, payload, { headers });
        toast.success("Task updated");
      } else {
        await axios.post(`${baseUrl}/tasks`, payload, { headers });
        toast.success("Task created and assigned");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save task");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-white rounded-t-2xl shrink-0">
          <h2 className="text-lg font-bold text-gray-800">
            {editTask ? "Edit Task" : "Create & Assign Task"}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]/30 focus:border-[#008ecc]"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="What needs to be done?"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]/30 focus:border-[#008ecc] resize-none"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the task in detail..."
            />
          </div>

          {/* Priority + Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]/30 focus:border-[#008ecc]"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                {["Low", "Medium", "High", "Urgent"].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
              <DatePicker
                ref={dueDateRef}
                selected={dueDateObj}
                onChange={handleDueDateChange}
                minDate={new Date()}
                dateFormat="MM/dd/yyyy"
                placeholderText="mm/dd/yyyy"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                isClearable
                wrapperClassName="w-full"
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]/30 focus:border-[#008ecc] ${
                  dueDateError ? "border-red-500" : "border-gray-200"
                }`}
              />
              {dueDateError && (
                <p className="text-xs text-red-500 mt-1">{dueDateError}</p>
              )}
            </div>
          </div>

          {/* Assign To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assign To *</label>
            <select
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]/30 focus:border-[#008ecc]"
              value={form.assignedTo}
              onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
            >
              <option value="">— Select sales person —</option>
              {salesUsers.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.firstName} {u.lastName}
                </option>
              ))}
            </select>
          </div>

          {/* Lead Reference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FileText size={13} className="inline mr-1 text-gray-400" />
              Link a Lead <span className="text-gray-400 font-normal text-xs">(optional)</span>
            </label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]/30 focus:border-[#008ecc]"
              value={form.leadRef}
              onChange={(e) => setForm({ ...form, leadRef: e.target.value })}
            >
              <option value="">No lead linked</option>
              {leads.map((l) => (
                <option key={l._id} value={l._id}>
                  {l.leadName} — {l.companyName} [{l.status}]
                </option>
              ))}
            </select>
          </div>

          {/* Deal Reference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Briefcase size={13} className="inline mr-1 text-gray-400" />
              Link a Deal <span className="text-gray-400 font-normal text-xs">(optional)</span>
            </label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]/30 focus:border-[#008ecc]"
              value={form.dealRef}
              onChange={(e) => setForm({ ...form, dealRef: e.target.value })}
            >
              <option value="">No deal linked</option>
              {deals.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.dealName || d.dealTitle} [{d.stage}]
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t mt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2 rounded-lg bg-[#008ecc] text-white hover:bg-[#0077aa] text-sm font-semibold disabled:opacity-60">
              {saving ? "Saving..." : editTask ? "Update Task" : "Create & Assign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Task Card ─────────────────────── */
function TaskCard({ task, onEdit, onDelete, onStatusChange, onApprove }) {
  const isCompleted = task.status === "Completed";
  const isApproved = task.approvedByAdmin;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isCompleted;

  const leadName = task.leadRef?.leadName
    ? `${task.leadRef.leadName}${task.leadRef.companyName ? ` — ${task.leadRef.companyName}` : ""}`
    : null;
  const dealName = task.dealRef?.dealName || task.dealRef?.dealTitle || null;

  return (
    <div className={`bg-white rounded-xl border-l-4 border border-gray-200 p-5 hover:shadow-md transition-all ${
      PRIORITY_BORDER[task.priority] || "border-l-gray-300"
    } ${isCompleted && !isApproved ? "opacity-90" : ""}`}>
      {/* Status strip */}
      {isCompleted && !isApproved && (
        <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 mb-3 w-fit">
          <Clock size={11} /> Awaiting Approval
        </div>
      )}
      {isApproved && (
        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-lg px-2.5 py-1 mb-3 w-fit">
          <CheckCircle size={11} /> Approved
        </div>
      )}

      {/* Title row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-gray-800 text-sm leading-snug flex-1">{task.title}</h3>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => onEdit(task)} className="p-1 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-600 transition-colors">
            <Edit2 size={13} />
          </button>
          <button onClick={() => onDelete(task)} className="p-1 hover:bg-red-50 rounded-md text-gray-400 hover:text-red-500 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {task.description && (
        <p className="text-xs text-gray-400 mb-3 break-words">{task.description}</p>
      )}

      {/* Linked Lead / Deal */}
      {(leadName || dealName) && (
        <div className="flex flex-col gap-1.5 mb-3">
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

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-medium border ${PRIORITY_COLORS[task.priority]}`}>
          <Flag size={10} />{task.priority}
        </span>
        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-medium ${STATUS_STYLES[task.status]}`}>
          {task.status === "Completed" ? <CheckCircle size={10} /> : task.status === "In Progress" ? <AlertCircle size={10} /> : <Clock size={10} />}
          {task.status}
        </span>
        {isOverdue && (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-medium bg-red-50 text-red-500">
            Overdue
          </span>
        )}
      </div>

      {/* Completion / delay notes */}
      {task.completionNotes && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3 overflow-hidden">
          <StickyNote size={13} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-amber-600 mb-0.5">Sales Notes</p>
            <p className="text-xs text-gray-600 break-words">{task.completionNotes}</p>
          </div>
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
        <User size={10} /><span>{task.assignedTo?.firstName} {task.assignedTo?.lastName}</span>
      </div>
      <div className={`flex items-center gap-1.5 text-xs mb-4 ${isOverdue ? "text-red-400 font-medium" : "text-gray-400"}`}>
        <Calendar size={10} />
        <span>Due {task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"}</span>
      </div>

      {/* Actions */}
      {isCompleted && !isApproved ? (
        <button
          onClick={() => onApprove(task)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 text-sm font-semibold transition-colors"
        >
          <ThumbsUp size={14} /> Approve Task
        </button>
      ) : !isCompleted ? (
        <select
          value={task.status}
          onChange={(e) => onStatusChange(task, e.target.value)}
          className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#008ecc]/30 bg-gray-50 text-gray-600"
        >
          <option>Pending</option>
          <option>In Progress</option>
          <option>Completed</option>
        </select>
      ) : (
        <div className="flex items-center justify-center gap-1 text-xs text-emerald-600 font-medium py-1.5 bg-emerald-50 rounded-lg">
          <CheckCircle size={13} /> Approved & Done
        </div>
      )}
    </div>
  );
}

/* ── Main Component ─────────────────────── */
export default function TaskManagement() {
  const [tasks, setTasks] = useState([]);
  const [salesUsers, setSalesUsers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [deals, setDeals] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [filterInitialized, setFilterInitialized] = useState(false);
  const { setNotifications } = useNotifications();

  const token = localStorage.getItem("token");
  const tenantSlug = localStorage.getItem("tenantSlug");
  const baseUrl = `${SI_URI}/${tenantSlug}/api`;
  const headers = { Authorization: `Bearer ${token}` };

  const fetchTasks = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const { data } = await axios.get(`${baseUrl}/tasks`, { headers });
      setTasks(data);
      // On initial load, auto-select "Awaiting Approval" if any tasks need approval
      if (!filterInitialized) {
        const hasAwaiting = data.some((t) => t.status === "Completed" && !t.approvedByAdmin);
        if (hasAwaiting) setFilter("Awaiting Approval");
        setFilterInitialized(true);
      }
    } catch {
      toast.error("Failed to load tasks");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [baseUrl, filterInitialized]);

  const fetchReferenceData = useCallback(async () => {
    try {
      const [usersRes, leadsRes, dealsRes] = await Promise.all([
        axios.get(`${API_URL}/users`, { headers }),
        axios.get(`${API_URL}/leads/getAllLead?limit=1000`, { headers }),
        axios.get(`${API_URL}/deals/getAll`, { headers }),
      ]);
      const allUsers = usersRes.data?.users || usersRes.data || [];
      setSalesUsers(allUsers.filter((u) => u.role?.name !== "Admin"));
      setLeads(leadsRes.data?.leads || []);
      setDeals(Array.isArray(dealsRes.data) ? dealsRes.data : []);
    } catch (err) {
      console.error("Failed to load reference data", err);
      toast.error("Failed to load users/leads/deals for the form");
    }
  }, []);

  useEffect(() => {
    fetchTasks(true); // show loading spinner only on initial mount
    fetchReferenceData();
    // Mark task-completed/taskNoteAdded notifications as read when admin visits
    setNotifications((prev) => {
      const toMarkRead = prev
        .filter((n) => n.type === "task" && (n.meta?.taskCompleted || n.meta?.taskNoteAdded) && !n.read && !n.isRead && n._id && !String(n._id).includes("-"))
        .map((n) => n._id);
      if (toMarkRead.length > 0) {
        Promise.all(
          toMarkRead.map((id) =>
            axios.patch(`${API_URL}/notifications/read/${id}`, {}, { headers }).catch(() => {})
          )
        );
      }
      return prev.map((n) =>
        n.type === "task" && (n.meta?.taskCompleted || n.meta?.taskNoteAdded)
          ? { ...n, read: true, isRead: true }
          : n
      );
    });
  }, []);

  const handleDelete = async () => {
    const taskId = deleteTarget._id;
    // Optimistic: remove task card immediately — no refetch, no blink
    setTasks((prev) => prev.filter((t) => t._id !== taskId));
    // Also remove related notifications from admin's own state immediately
    setNotifications((prev) =>
      prev.filter((n) => !(n.type === "task" && String(n.meta?.taskId) === String(taskId)))
    );
    setDeleteTarget(null);
    try {
      await axios.delete(`${baseUrl}/tasks/${taskId}`, { headers });
      // Backend also deletes DB notifications + notifies sales person via socket
      toast.success("Task deleted");
    } catch {
      toast.error("Failed to delete task");
      fetchTasks(); // restore on error
    }
  };

  const handleStatusChange = async (task, status) => {
    // Optimistic update — patch the card in place, no refetch
    setTasks((prev) =>
      prev.map((t) => t._id === task._id ? { ...t, status } : t)
    );
    try {
      await axios.put(`${baseUrl}/tasks/${task._id}`, { status }, { headers });
    } catch {
      toast.error("Failed to update status");
      fetchTasks(); // restore on error
    }
  };

  const handleApprove = async (task) => {
    // Optimistic update — mark approved instantly, move to All tab
    setTasks((prev) =>
      prev.map((t) => t._id === task._id ? { ...t, approvedByAdmin: true } : t)
    );
    setFilter("All");
    try {
      await axios.patch(`${baseUrl}/tasks/${task._id}/approve`, {}, { headers });
      toast.success("Task approved!");
      setNotifications((prev) =>
        prev.map((n) =>
          n.type === "task" && String(n.meta?.taskId) === String(task._id)
            ? { ...n, read: true, isRead: true }
            : n
        )
      );
    } catch {
      toast.error("Failed to approve task");
      fetchTasks();
    }
  };

  const FILTERS = ["All", "Pending", "In Progress", "Completed", "Awaiting Approval"];
  const filtered = tasks.filter((t) => {
    if (filter === "All") return true;
    if (filter === "Awaiting Approval") return t.status === "Completed" && !t.approvedByAdmin;
    return t.status === filter;
  });

  const awaiting = tasks.filter((t) => t.status === "Completed" && !t.approvedByAdmin).length;

  const stats = [
    { label: "Total Tasks", value: tasks.length, color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-100", border: "border-l-indigo-500" },
    { label: "Pending", value: tasks.filter((t) => t.status === "Pending").length, color: "text-gray-700", bg: "bg-gray-50 border-gray-200", border: "border-l-gray-400" },
    { label: "In Progress", value: tasks.filter((t) => t.status === "In Progress").length, color: "text-blue-700", bg: "bg-blue-50 border-blue-100", border: "border-l-blue-500" },
    { label: "Completed", value: tasks.filter((t) => t.status === "Completed").length, color: "text-green-700", bg: "bg-green-50 border-green-100", border: "border-l-green-500" },
    { label: "Awaiting Approval", value: awaiting, color: "text-amber-700", bg: "bg-amber-50 border-amber-100", border: "border-l-amber-500" },
  ];

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Task Management</h1>
          <p className="text-gray-400 text-sm mt-0.5">Assign and track tasks for your sales team</p>
        </div>
        <button
          onClick={() => { setEditTask(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#008ecc] text-white rounded-lg hover:bg-[#0077aa] text-sm font-semibold"
        >
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-xl border border-l-4 px-4 py-4 ${s.bg} ${s.border}`}>
            <p className="text-xs font-medium text-gray-500 mb-2">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
              filter === f
                ? "bg-[#008ecc] text-white"
                : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"
            }`}
          >
            {f}
            {f === "Awaiting Approval" && awaiting > 0 && (
              <span className="bg-amber-500 text-white text-[10px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                {awaiting}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex justify-center items-center h-40 text-gray-400 text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-gray-400">
          <CheckCircle size={36} className="mb-2 opacity-20" />
          <p className="text-sm">No tasks in this category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              onEdit={(t) => { setEditTask(t); setModalOpen(true); }}
              onDelete={(t) => setDeleteTarget(t)}
              onStatusChange={handleStatusChange}
              onApprove={handleApprove}
            />
          ))}
        </div>
      )}

      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => fetchTasks(false)}
        salesUsers={salesUsers}
        leads={leads}
        deals={deals}
        editTask={editTask}
        baseUrl={baseUrl}
        headers={headers}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Task"
        message={`Are you sure you want to delete "${deleteTarget?.title}"?`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
