import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { CalendarClock, StickyNote, X, Trash2, Layers, Users } from "lucide-react";

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
      <div className="font-bold text-xs uppercase tracking-wide truncate">
        {event.isGroup ? event.title : `${meta.shortLabel || event.type} · ${timeText}`}
      </div>
      {!event.isGroup && <div className="text-xs truncate opacity-90">{event.title}</div>}
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

  // Admin-only "view as user" filter — narrows the merged feed down to one
  // salesperson's follow-ups instead of everyone's at once. Sales users
  // only ever see their own data anyway (enforced server-side), so there's
  // nothing for them to filter.
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = currentUser.role?.name === "Admin";
  const [salesUsers, setSalesUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");

  // Sticky note add/edit modal — the one type of item actually created/
  // edited from this calendar (everything else is read-only, links out to
  // its own real page).
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteModalDate, setNoteModalDate] = useState(null);
  const [noteModalText, setNoteModalText] = useState("");
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [isSavingNote, setIsSavingNote] = useState(false);

  // "N Lead Follow-ups" style summary block, opened either for a time slot
  // with too many same-type events crammed together, or for react-big-
  // calendar's own "+N more" link (which we take over entirely — see
  // handleShowMore below — since its built-in popup has no way to stay
  // on-screen regardless of where on the page it's triggered from).
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupModalItems, setGroupModalItems] = useState([]);
  // null = centered (same-minute event group click). Set = anchored near
  // the "+N more" link that was clicked, flipping above/below depending on
  // which direction has room — see computeAnchorPosition.
  const [groupModalAnchor, setGroupModalAnchor] = useState(null);
  // Captured via onClickCapture on the calendar wrapper, since react-big-
  // calendar's onShowMore callback only hands us the events/date, not the
  // clicked link's position.
  const showMoreAnchorRef = useRef(null);

  const authHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

  const fetchEvents = useCallback(async (anchorDate, userId) => {
    try {
      setIsLoading(true);
      // A generous window around the visible month covers week/day views too
      // (both are subsets of this range) and the padding days month view
      // shows at the edges of the grid.
      const start = moment(anchorDate).startOf("month").subtract(7, "days").toISOString();
      const end = moment(anchorDate).endOf("month").add(7, "days").toISOString();
      const res = await axios.get(`${API_URL}/calendar`, {
        ...authHeader(),
        params: { start, end, ...(userId ? { userId } : {}) },
      });
      setEvents(res.data.events || []);
    } catch (err) {
      console.error("Failed to fetch calendar events:", err);
      toast.error("Failed to load schedule");
    } finally {
      setIsLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchEvents(currentDate, selectedUserId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchEvents, selectedUserId]);

  useEffect(() => {
    if (!isAdmin) return;
    axios.get(`${API_URL}/users/sales`, authHeader())
      .then((res) => {
        const data = res.data.salesUsers || res.data.users || res.data;
        setSalesUsers(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error("Failed to fetch sales users:", err));
  }, [isAdmin, API_URL]);

  const handleNavigate = (date) => {
    setCurrentDate(date);
    fetchEvents(date, selectedUserId);
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
      fetchEvents(currentDate, selectedUserId);
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
      fetchEvents(currentDate, selectedUserId);
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
        fontSize: "0.75rem",
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
      setGroupModalAnchor(null);
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

  // Captures the clicked "+N more" link's on-screen position, in the
  // capture phase so it runs before react-big-calendar's own click handling
  // (which is what triggers onShowMore below) — by the time onShowMore
  // fires, this ref already has the right rect.
  const handleCalendarClickCapture = (e) => {
    const target = e.target.closest?.(".rbc-show-more");
    if (target) showMoreAnchorRef.current = target.getBoundingClientRect();
  };

  const POPUP_WIDTH = 360;
  const POPUP_GAP = 8;
  // Prefers opening below the clicked link (reads naturally, closest to
  // where the click happened) but flips above whenever there isn't enough
  // room below — e.g. the calendar is scrolled down and the link sits near
  // the bottom of the viewport — so the list is never cut off either way.
  const computeAnchorPosition = (rect) => {
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;
    const spaceBelow = viewportH - rect.bottom;
    const spaceAbove = rect.top;
    const openAbove = spaceBelow < 280 && spaceAbove > spaceBelow;
    // Must match the rendered width (w-[min(360px,92vw)] below) — on a
    // narrow/mobile screen the popup is actually 92vw, not the full 360px,
    // so clamping against the fixed constant pushed it off the left edge.
    const popupWidth = Math.min(POPUP_WIDTH, viewportW * 0.92);
    const left = Math.min(Math.max(rect.left, POPUP_GAP), viewportW - popupWidth - POPUP_GAP);
    return openAbove
      ? { left, bottom: viewportH - rect.top + POPUP_GAP, openAbove: true }
      : { left, top: rect.bottom + POPUP_GAP, openAbove: false };
  };

  // Takes over react-big-calendar's "+N more" click entirely: popup={false}
  // below stops its own built-in overlay from ever mounting, and
  // doShowMoreDrillDown={false} stops its other default behavior for this
  // case (switching the whole calendar to Day view) — react-big-calendar
  // does one or the other unless both are turned off, so onShowMore alone
  // isn't enough. This lets the popup be positioned near the click with
  // viewport-aware flipping, reusing the same group-items modal used for
  // same-minute clusters.
  const handleShowMore = (events) => {
    const rect = showMoreAnchorRef.current;
    setGroupModalAnchor(rect ? computeAnchorPosition(rect) : null);
    setGroupModalItems(events);
    setGroupModalOpen(true);
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
      <style>{`
        .rbc-time-view .rbc-event-label { display: none; }
        /* Month grid needs real per-day width to stay readable — below that,
           columns collide and text overlaps. A horizontal scroll wrapper
           (below) lets narrow/mobile screens scroll sideways instead. */
        @media (max-width: 700px) {
          .rbc-calendar { min-width: 700px; }
        }
      `}</style>
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center gap-3 mb-6">
       
          <div>
            <h1 className="text-gray-900  flex items-center gap-3"> <CalendarClock />Calendar</h1>
            <p className="text-base text-slate-600 mt-1">
              Everything with a date, in one place — click any item to open its real page
            </p>
          </div>
        </div>

        {/* Admin-only: view one salesperson's follow-ups instead of everyone's */}
        {isAdmin && (
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-slate-400" />
            <label className="text-xs font-medium text-slate-500">Viewing:</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All users</option>
              {salesUsers.map((u) => (
                <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
              ))}
            </select>
          </div>
        )}

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
          {/* Below ~700px the 7-day grid has no room to stay readable — this
              scrolls the calendar itself horizontally instead of letting
              columns collide, while the page body stays put. */}
          {/* onClickCapture runs before react-big-calendar's own click
              handling, so by the time onShowMore fires below, the "+N more"
              link's position has already been captured. */}
          <div className="overflow-x-auto" onClickCapture={handleCalendarClickCapture}>
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
              popup={false}
              doShowMoreDrillDown={false}
              onShowMore={handleShowMore}
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
      </div>

      {/* Add/Edit sticky note modal */}
      {noteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={closeNoteModal}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-700 flex items-center gap-2">
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

      {/* Grouped events list — opened for react-big-calendar's "+N more"
          link (anchored near the click, flipping above/below to stay
          on-screen — see computeAnchorPosition) as well as same-minute
          event clusters (groupModalAnchor null, so this falls back to
          centered). */}
      {groupModalOpen && (
        <div
          className={`fixed inset-0 z-[60] bg-black/40 ${groupModalAnchor ? "" : "flex items-center justify-center p-4"}`}
          onClick={() => setGroupModalOpen(false)}
        >
          <div
            className={`bg-white rounded-xl shadow-xl max-h-[70vh] flex flex-col ${groupModalAnchor ? "fixed w-[min(360px,92vw)] p-4" : "w-full max-w-md p-6"}`}
            style={groupModalAnchor
              ? {
                  left: groupModalAnchor.left,
                  ...(groupModalAnchor.openAbove
                    ? { bottom: groupModalAnchor.bottom }
                    : { top: groupModalAnchor.top }),
                }
              : undefined}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-700 flex items-center gap-2">
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
