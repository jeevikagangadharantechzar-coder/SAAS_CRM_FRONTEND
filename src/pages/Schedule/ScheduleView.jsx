import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { CalendarClock, StickyNote, X, Trash2 } from "lucide-react";

const localizer = momentLocalizer(moment);

// Same color language as the Deal Activity Log's ACTIVITY_TYPE_META
// (Pipeline_modal_view.jsx) — visual consistency across the app instead of
// the existing Activity Calendar's random color picker.
const TYPE_META = {
  task:     { label: "Tasks",           color: "#2563eb" }, // blue
  target:   { label: "Targets",         color: "#7c3aed" }, // purple
  lead_followup: { label: "Lead Follow-ups", color: "#ea580c" }, // orange
  followup: { label: "Deal Follow-ups", color: "#d97706" }, // amber
  invoice:  { label: "Invoices",        color: "#16a34a" }, // green
  proposal: { label: "Proposals",       color: "#0d9488" }, // teal
  meeting:  { label: "Meetings",        color: "#db2777" }, // pink
  email:    { label: "Emails",          color: "#0891b2" }, // cyan
  note:     { label: "My Notes",        color: "#ca8a04" }, // sticky-note yellow
};

const ScheduleView = () => {
  const API_URL = import.meta.env.VITE_API_URL;
  const { tenantSlug } = useParams();
  const navigate = useNavigate();

  const [view, setView] = useState("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTypes, setActiveTypes] = useState(() => new Set(Object.keys(TYPE_META)));

  // Sticky note add/edit modal — the one type of item actually created/
  // edited from this calendar (everything else is read-only, links out to
  // its own real page).
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteModalDate, setNoteModalDate] = useState(null);
  const [noteModalText, setNoteModalText] = useState("");
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [isSavingNote, setIsSavingNote] = useState(false);

  const authHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

  const fetchEvents = useCallback(async (anchorDate) => {
    try {
      setIsLoading(true);
      // A generous window around the visible month covers week/day views too
      // (both are subsets of this range) and the padding days month view
      // shows at the edges of the grid.
      const start = moment(anchorDate).startOf("month").subtract(7, "days").toISOString();
      const end = moment(anchorDate).endOf("month").add(7, "days").toISOString();
      const res = await axios.get(`${API_URL}/calendar`, { ...authHeader(), params: { start, end } });
      setEvents(res.data.events || []);
    } catch (err) {
      console.error("Failed to fetch calendar events:", err);
      toast.error("Failed to load schedule");
    } finally {
      setIsLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchEvents(currentDate);
  }, [fetchEvents]);

  const handleNavigate = (date) => {
    setCurrentDate(date);
    fetchEvents(date);
  };

  const openAddNote = (date) => {
    setNoteModalDate(date);
    setEditingNoteId(null);
    setNoteModalText("");
    setNoteModalOpen(true);
  };

  const openEditNote = (event) => {
    setNoteModalDate(event.date);
    setEditingNoteId(event.id.replace(/^note-/, ""));
    setNoteModalText(event.title);
    setNoteModalOpen(true);
  };

  const closeNoteModal = () => {
    setNoteModalOpen(false);
    setNoteModalDate(null);
    setEditingNoteId(null);
    setNoteModalText("");
  };

  const handleSaveNote = async () => {
    if (!noteModalText.trim()) return;
    try {
      setIsSavingNote(true);
      if (editingNoteId) {
        await axios.put(`${API_URL}/calendar/notes/${editingNoteId}`, { text: noteModalText.trim() }, authHeader());
        toast.success("Note updated");
      } else {
        await axios.post(`${API_URL}/calendar/notes`, { date: noteModalDate, text: noteModalText.trim() }, authHeader());
        toast.success("Note added");
      }
      closeNoteModal();
      fetchEvents(currentDate);
    } catch (err) {
      console.error("Failed to save note:", err);
      toast.error(err.response?.data?.message || "Failed to save note");
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!editingNoteId) return;
    if (!window.confirm("Delete this note?")) return;
    try {
      setIsSavingNote(true);
      await axios.delete(`${API_URL}/calendar/notes/${editingNoteId}`, authHeader());
      toast.success("Note deleted");
      closeNoteModal();
      fetchEvents(currentDate);
    } catch (err) {
      console.error("Failed to delete note:", err);
      toast.error(err.response?.data?.message || "Failed to delete note");
    } finally {
      setIsSavingNote(false);
    }
  };

  const toggleType = (type) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const visibleEvents = events.filter((e) => activeTypes.has(e.type));

  const calendarEvents = visibleEvents.map((e) => ({
    ...e,
    title: e.title,
    start: new Date(e.date),
    end: e.endDate ? new Date(e.endDate) : new Date(e.date),
  }));

  const eventStyleGetter = (event) => {
    const meta = TYPE_META[event.type] || { color: "#64748b" };
    return {
      style: {
        backgroundColor: `${meta.color}1A`,
        color: meta.color,
        borderRadius: "6px",
        padding: "4px 6px",
        fontWeight: 500,
        fontSize: "12px",
        borderLeft: `4px solid ${event.pending ? "#dc2626" : meta.color}`,
      },
    };
  };

  // The calendar is a map/overview — clicking an event always navigates to
  // the real record's own page, EXCEPT sticky notes, which only exist here
  // and so open the edit modal instead.
  const handleSelectEvent = (event) => {
    const link = event.link || {};
    if (link.page === "note") {
      openEditNote(event);
      return;
    }
    switch (link.page) {
      case "deal":
        navigate(`/${tenantSlug}/Pipelineview/${link.dealId}`);
        break;
      case "lead":
        navigate(`/${tenantSlug}/leads/view/${link.leadId}`);
        break;
      case "task-management":
        navigate(`/${tenantSlug}/task-management`);
        break;
      case "target-management":
        navigate(`/${tenantSlug}/target-management`);
        break;
      case "invoice":
        navigate(link.invoiceId ? `/${tenantSlug}/invoices/${link.invoiceId}` : `/${tenantSlug}/invoices`);
        break;
      case "proposal":
        navigate(link.proposalId ? `/${tenantSlug}/proposal/view/${link.proposalId}` : `/${tenantSlug}/proposal`);
        break;
      case "meetings":
        navigate(`/${tenantSlug}/meetings`);
        break;
      case "email":
        navigate(link.emailId ? `/${tenantSlug}/create-email/${link.emailId}` : `/${tenantSlug}/scheduled-emails`);
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <CalendarClock size={28} className="text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
            <p className="text-sm text-slate-600 mt-0.5">
              Everything with a date, in one place — click any item to open its real page
            </p>
          </div>
        </div>

        {/* Type filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(TYPE_META).map(([type, meta]) => {
            const active = activeTypes.has(type);
            return (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                style={{
                  backgroundColor: active ? `${meta.color}1A` : "#f8fafc",
                  color: active ? meta.color : "#94a3b8",
                  borderColor: active ? meta.color : "#e2e8f0",
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: active ? meta.color : "#cbd5e1" }} />
                {meta.label}
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          {isLoading && <p className="text-sm text-slate-500 mb-2">Loading…</p>}
          <p className="text-xs text-slate-400 mb-3 flex items-center gap-1.5">
            <StickyNote size={13} /> Click any empty day to pin a note there
          </p>
          <Calendar
            selectable
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 700 }}
            view={view}
            date={currentDate}
            views={["month", "week", "day"]}
            onView={(v) => setView(v)}
            onNavigate={handleNavigate}
            eventPropGetter={eventStyleGetter}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={(slotInfo) => openAddNote(slotInfo.start)}
          />
        </div>
      </div>

      {/* Add/Edit sticky note modal */}
      {noteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeNoteModal}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <StickyNote size={18} className="text-amber-600" />
                {editingNoteId ? "Edit Note" : "Add Note"}
              </h3>
              <button onClick={closeNoteModal} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              {noteModalDate && new Date(noteModalDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
            <textarea
              value={noteModalText}
              onChange={(e) => setNoteModalText(e.target.value)}
              placeholder="Write yourself a reminder…"
              rows={4}
              autoFocus
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <div className="flex items-center justify-between mt-4">
              {editingNoteId ? (
                <button
                  onClick={handleDeleteNote}
                  disabled={isSavingNote}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 size={15} /> Delete
                </button>
              ) : <span />}
              <button
                onClick={handleSaveNote}
                disabled={isSavingNote || !noteModalText.trim()}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                {isSavingNote ? "Saving…" : editingNoteId ? "Update Note" : "Add Note"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleView;
