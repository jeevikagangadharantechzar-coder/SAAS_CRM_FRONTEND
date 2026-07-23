import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { CalendarClock, StickyNote, X, Trash2, Layers } from "lucide-react";

const localizer = momentLocalizer(moment);

// More than this many same-type events landing at the exact same minute
// (e.g. a batch of leads all defaulting to the same follow-up time) get
// collapsed into one summary block instead of being squeezed into unreadable
// slivers by react-big-calendar's side-by-side time-grid layout.
const GROUP_THRESHOLD = 3;

// Same color language as the Deal Activity Log's ACTIVITY_TYPE_META
// (Pipeline_modal_view.jsx) — visual consistency across the app instead of
// the existing Activity Calendar's random color picker.
const TYPE_META = {
  task:     { label: "Tasks",           shortLabel: "Task",     color: "#2563eb" }, // blue
  target:   { label: "Targets",         shortLabel: "Target",   color: "#7c3aed" }, // purple
  lead_followup: { label: "Lead Follow-ups", shortLabel: "Lead", color: "#ea580c" }, // orange
  followup: { label: "Deal Follow-ups", shortLabel: "Deal",     color: "#d97706" }, // amber
  invoice:  { label: "Invoices",        shortLabel: "Invoice",  color: "#16a34a" }, // green
  proposal: { label: "Proposals",       shortLabel: "Proposal", color: "#0d9488" }, // teal
  meeting:  { label: "Meetings",        shortLabel: "Meeting",  color: "#db2777" }, // pink
  email:    { label: "Emails",          shortLabel: "Email",    color: "#0891b2" }, // cyan
  note:     { label: "My Notes",        shortLabel: "Note",     color: "#ca8a04" }, // sticky-note yellow
};

// Week/Day's time grid gives every event a narrow column, and react-big-
// calendar's default event content leads with the formatted time range —
// with little width left, that ate the whole box and left the actual title
// ("Prop…", "Follo…") unreadably truncated. This overrides just those two
// views' event content to lead with the short type label instead (the
// specific record name still shows on the second line). Month view keeps
// react-big-calendar's own default rendering untouched.
//
// react-big-calendar's own auto time labels (Week/Day's .rbc-event-label,
// hidden via CSS below, and Agenda's time column) always format
// event.start/end as a range — but only Meeting genuinely carries a same-day
// start/end time. Task/follow-up/invoice/proposal/email are a single point
// in time that only *looks* like a 30-min range here because it's padded
// for the time grid's own overlap/height math. Target is a whole date
// *period* (e.g. a full month) with no time-of-day at all — formatting its
// start/end as clock times produced a nonsensical "12:00 AM – 12:00 AM", the
// same class of bug as Lead follow-up's missing time, so both are all-day
// and simply skip the fake time text. event.date/event.endDate are the
// true, unpadded source values, so every custom time display below reads
// from those instead of the padded start/end.
const getEventTimeText = (event) => {
  if (event.allDay) return "All day";
  const isRange = Boolean(event.endDate);
  return isRange
    ? `${moment(event.date).format("h:mm A")} – ${moment(event.endDate).format("h:mm A")}`
    : moment(event.date).format("h:mm A");
};

const WeekDayEvent = ({ event }) => {
  const meta = TYPE_META[event.type] || {};
  const timeText = getEventTimeText(event);
  return (
    <div className="leading-tight overflow-hidden" title={`${event.title} (${timeText})`}>
      <div className="font-bold text-[11px] uppercase tracking-wide truncate">
        {event.isGroup ? event.title : `${meta.shortLabel || event.type} · ${timeText}`}
      </div>
      {!event.isGroup && <div className="text-[11px] truncate opacity-90">{event.title}</div>}
    </div>
  );
};

// Agenda's own time column has the same "always a range" bug — this fully
// replaces react-big-calendar's built-in label there (no CSS-hide needed
// since components.agenda.time takes over the cell outright).
const AgendaTime = ({ event }) => <span>{getEventTimeText(event)}</span>;

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

  // "N Lead Follow-ups" style summary block, opened when a time slot has too
  // many same-type events crammed together to render individually.
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupModalItems, setGroupModalItems] = useState([]);

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

  // Bucket by type + exact minute — a handful of unrelated items sharing a
  // timestamp is normal, but a pile of them (e.g. many leads defaulting to
  // the same follow-up time) is exactly what was crushing the day view. A
  // wider calendar container plus react-big-calendar's own no-overlap
  // layout lets 2-3 concurrent events sit side by side just fine, same as
  // month view already handles small crowds on its own — only a genuinely
  // large pile still needs the "N items" summary block.
  const groupedSourceEvents = (() => {
    const buckets = new Map();
    visibleEvents.forEach((e) => {
      const key = `${e.type}|${new Date(e.date).getTime()}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(e);
    });

    const result = [];
    buckets.forEach((items) => {
      if (items.length > GROUP_THRESHOLD) {
        const first = items[0];
        const meta = TYPE_META[first.type];
        result.push({
          id: `group-${first.type}-${new Date(first.date).getTime()}`,
          type: first.type,
          title: `${items.length} ${meta?.label || first.type}`,
          date: first.date,
          endDate: first.endDate,
          pending: items.some((i) => i.pending),
          isGroup: true,
          items,
        });
      } else {
        result.push(...items);
      }
    });
    return result;
  })();

  // Point-in-time items (task due date, follow-up, proposal reminder, etc.)
  // have no natural end — without a minimum span they render as a zero-width
  // sliver on the day/week time grid, which is what let a same-time event
  // visually sit on top of one right next to it. Giving them a nominal
  // 30-minute block lets react-big-calendar's own overlap math treat every
  // event the same way.
  const MIN_EVENT_MINUTES = 30;

  // Lead follow-ups never carry a real time (that date picker has no time
  // select at all), and Target is a whole date period rather than a single
  // moment — both were implying a precision on the Day/Week time grid that
  // isn't real. Deal follow-ups DO have a genuine time-of-day (their picker
  // includes a time select), so they stay positioned normally on the grid.
  const ALL_DAY_TYPES = new Set(["lead_followup", "target"]);

  const calendarEvents = groupedSourceEvents.map((e) => {
    const allDay = ALL_DAY_TYPES.has(e.type);
    const start = new Date(e.date);
    let end = e.endDate ? new Date(e.endDate) : new Date(e.date);
    if (!allDay && end.getTime() - start.getTime() < MIN_EVENT_MINUTES * 60 * 1000) {
      end = new Date(start.getTime() + MIN_EVENT_MINUTES * 60 * 1000);
    }
    return { ...e, title: e.title, start, end, allDay };
  });

  const eventStyleGetter = (event) => {
    const meta = TYPE_META[event.type] || { color: "#64748b" };
    return {
      style: {
        backgroundColor: event.isGroup ? meta.color : `${meta.color}1A`,
        color: event.isGroup ? "#ffffff" : meta.color,
        borderRadius: "6px",
        padding: "4px 6px",
        fontWeight: event.isGroup ? 700 : 500,
        fontSize: "12px",
        borderLeft: `4px solid ${event.pending ? "#dc2626" : meta.color}`,
      },
    };
  };

  // The calendar is a map/overview — clicking an event always navigates to
  // the real record's own page, EXCEPT sticky notes, which only exist here
  // and so open the edit modal instead. Factored out so the grouped-events
  // list modal can reuse the exact same logic per item.
  const navigateToEvent = (event) => {
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

  const handleSelectEvent = (event) => {
    if (event.isGroup) {
      setGroupModalItems(event.items);
      setGroupModalOpen(true);
      return;
    }
    navigateToEvent(event);
  };

  const handleGroupItemClick = (item) => {
    setGroupModalOpen(false);
    navigateToEvent(item);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <ToastContainer position="top-right" autoClose={3000} />
      {/* react-big-calendar's own time-grid label always renders event.start
          -event.end as a range, but only Meeting/Target genuinely have an
          end time — everything else is a single point padded only for
          layout math. WeekDayEvent renders the correct time itself, so the
          built-in label (redundant and, for point events, misleading) is
          hidden here rather than in month view, which doesn't use it. */}
      <style>{`.rbc-time-view .rbc-event-label { display: none; }`}</style>
      <div className="max-w-[1600px] mx-auto">
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
            views={["month", "week", "day", "agenda"]}
            popup
            dayLayoutAlgorithm="no-overlap"
            components={{ week: { event: WeekDayEvent }, day: { event: WeekDayEvent }, agenda: { time: AgendaTime } }}
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

      {/* Grouped events list — opened instead of squeezing many same-time,
          same-type events into unreadable slivers on the day/week grid. */}
      {groupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setGroupModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Layers size={18} className="text-slate-500" />
                {groupModalItems.length} items
              </h3>
              <button onClick={() => setGroupModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2 overflow-y-auto">
              {groupModalItems.map((item) => {
                const meta = TYPE_META[item.type] || { color: "#64748b" };
                return (
                  <button
                    key={item.id}
                    onClick={() => handleGroupItemClick(item)}
                    style={{ borderLeft: `4px solid ${meta.color}` }}
                    className="w-full text-left p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
                  >
                    <span className="text-sm text-slate-800 truncate">{item.title}</span>
                    {item.pending && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600 flex-shrink-0">overdue</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleView;
