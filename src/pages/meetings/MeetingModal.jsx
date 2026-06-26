import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { X, Plus, Trash2 } from "lucide-react";
import { toast } from "react-toastify";

const EMPTY_FORM = {
  title: "",
  description: "",
  startDateTime: "",
  endDateTime: "",
  attendees: [],
  reminderMinutes: 10,
};

const toLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function MeetingModal({ isOpen, onClose, onSave, editMeeting }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [emailInput, setEmailInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editMeeting) {
      setForm({
        title: editMeeting.title || "",
        description: editMeeting.description || "",
        startDateTime: toLocalInput(editMeeting.startDateTime),
        endDateTime: toLocalInput(editMeeting.endDateTime),
        attendees: editMeeting.attendees || [],
        reminderMinutes: editMeeting.reminderMinutes ?? 10,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setEmailInput("");
  }, [isOpen, editMeeting]);

  if (!isOpen) return null;

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const addAttendee = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email");
      return;
    }
    if (form.attendees.includes(email)) {
      toast.error("Already added");
      return;
    }
    set("attendees", [...form.attendees, email]);
    setEmailInput("");
  };

  const removeAttendee = (email) =>
    set("attendees", form.attendees.filter((e) => e !== email));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Title is required");
    if (!form.startDateTime) return toast.error("Start time is required");
    if (!form.endDateTime) return toast.error("End time is required");
    if (new Date(form.startDateTime) >= new Date(form.endDateTime))
      return toast.error("End time must be after start time");

    setSaving(true);
    try {
      await onSave({
        ...form,
        startDateTime: new Date(form.startDateTime).toISOString(),
        endDateTime: new Date(form.endDateTime).toISOString(),
        reminderMinutes: Number(form.reminderMinutes),
      });
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save meeting");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            {editMeeting ? "Edit Meeting" : "New Meeting"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Weekly Sales Sync"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Optional agenda or notes..."
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Date/Time row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Start <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={form.startDateTime}
                onChange={(e) => set("startDateTime", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                End <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={form.endDateTime}
                onChange={(e) => set("endDateTime", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Reminder */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Remind me (minutes before)
            </label>
            <select
              value={form.reminderMinutes}
              onChange={(e) => set("reminderMinutes", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[5, 10, 15, 30, 60].map((m) => (
                <option key={m} value={m}>{m} minutes</option>
              ))}
            </select>
          </div>

          {/* Attendees */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Attendees (emails)
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAttendee())}
                placeholder="name@email.com"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addAttendee}
                className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {form.attendees.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form.attendees.map((email) => (
                  <span
                    key={email}
                    className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full"
                  >
                    {email}
                    <button type="button" onClick={() => removeAttendee(email)}>
                      <Trash2 className="w-3 h-3 hover:text-red-500" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors font-medium"
            >
              {saving ? "Saving..." : editMeeting ? "Save Changes" : "Create Meeting"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
