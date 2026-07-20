import React, { useEffect, useState } from "react";
import { LifeBuoy, Paperclip, Send, X, ChevronDown } from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../services/api";
import { useSocket } from "../../context/SocketContext";
import StatusBadge, { PriorityBadge } from "./statusBadge";
import Timeline from "./Timeline";

const SI_URI = import.meta.env.VITE_SI_URI || "http://localhost:5000";
const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Urgent"];

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });

const TicketCard = ({ ticket, onSendMessage }) => {
  const [expanded, setExpanded] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!reply.trim()) return;
    setSending(true);
    const ok = await onSendMessage(ticket._id, reply.trim());
    setSending(false);
    if (ok) setReply("");
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start justify-between gap-3 text-left cursor-pointer"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-gray-400">{ticket._id.slice(-6).toUpperCase()}</span>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
          <h3 className="text-sm font-semibold text-gray-800 mt-1.5">{ticket.subject}</h3>
          {ticket.attachmentName && (
            <a
              href={`${SI_URI}/${ticket.attachmentPath}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 mt-1 text-xs text-[#008ecc] hover:underline w-fit"
            >
              <Paperclip size={12} />
              {ticket.attachmentName}
            </a>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(ticket.createdAt)}</span>
          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {expanded && (
        <>
          <div className="mt-4 border-t border-gray-100 pt-4 max-h-72 overflow-y-auto pr-1 sidebar-scroll">
            <Timeline entries={ticket.timeline} viewerSender="tenant" />
          </div>

          {ticket.status !== "Closed" && (
            <div className="mt-3 flex items-end gap-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={1}
                placeholder="Add a message..."
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#008ecc]/30 focus:border-[#008ecc]"
              />
              <button
                onClick={handleSend}
                disabled={!reply.trim() || sending}
                className="w-9 h-9 flex items-center justify-center bg-[#008ecc] hover:bg-[#0077ad] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full shadow-sm transition-colors cursor-pointer flex-shrink-0"
              >
                <Send size={15} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const UserSupportView = () => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [attachment, setAttachment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const socket = useSocket();

  const fetchTickets = async () => {
    try {
      const { data } = await api.get("/support");
      setTickets(data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to load your tickets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // Platform owner's replies/status/priority changes push here live, so an
  // already-open tab updates without the tenant Admin needing to refresh.
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (updated) => {
      setTickets((prev) => {
        const exists = prev.some((t) => t._id === updated._id);
        return exists ? prev.map((t) => (t._id === updated._id ? updated : t)) : prev;
      });
    };

    socket.on("support_ticket_updated", handleUpdate);
    return () => socket.off("support_ticket_updated", handleUpdate);
  }, [socket]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("message", message);
      formData.append("priority", priority);
      if (attachment) formData.append("attachment", attachment);

      const { data } = await api.post("/support", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setTickets((prev) => [data.data, ...prev]);
      setSubject("");
      setMessage("");
      setPriority("Medium");
      setAttachment(null);
      toast.success("Ticket submitted successfully.");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to submit ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendMessage = async (ticketId, text) => {
    try {
      const { data } = await api.post(`/support/${ticketId}/messages`, { text });
      setTickets((prev) => prev.map((t) => (t._id === ticketId ? data.data : t)));
      return true;
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to send message.");
      return false;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-[#f2fbff] flex items-center justify-center">
          <LifeBuoy className="text-[#008ecc]" size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Support</h1>
          <p className="text-sm text-gray-500">Raise a ticket and our team will get back to you</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Ticket Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5"
        >
          <h2 className="text-sm font-semibold text-gray-800">Raise a New Ticket</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Briefly describe the issue"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]/30 focus:border-[#008ecc]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]/30 focus:border-[#008ecc] cursor-pointer"
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Details</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="Share as much detail as possible so we can help faster"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#008ecc]/30 focus:border-[#008ecc]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Attachment <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            {attachment ? (
              <div className="flex items-center justify-between gap-2 bg-[#f2fbff] border border-blue-100 rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Paperclip size={16} className="text-[#008ecc] flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate">{attachment.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachment(null)}
                  className="text-gray-400 hover:text-red-500 flex-shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label
                htmlFor="support-attachment"
                className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[#008ecc] hover:bg-[#f2fbff] transition py-5"
              >
                <input
                  id="support-attachment"
                  type="file"
                  className="hidden"
                  onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                />
                <Paperclip size={16} className="text-gray-400" />
                <span className="text-sm text-gray-500">Click to attach a file (max 20MB)</span>
              </label>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 bg-[#008ecc] hover:bg-[#0077ad] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-sm transition-colors cursor-pointer"
            >
              <Send size={15} />
              {submitting ? "Submitting..." : "Submit Ticket"}
            </button>
          </div>
        </form>

        {/* Ticket History */}
        <div className="lg:col-span-3 space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            My Tickets ({tickets.length})
          </h2>

          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <div className="w-6 h-6 border-2 border-[#008ecc] border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : tickets.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-sm text-gray-400">
              You haven't raised any tickets yet.
            </div>
          ) : (
            <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1 sidebar-scroll">
              {tickets.map((ticket) => (
                <TicketCard key={ticket._id} ticket={ticket} onSendMessage={handleSendMessage} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSupportView;
