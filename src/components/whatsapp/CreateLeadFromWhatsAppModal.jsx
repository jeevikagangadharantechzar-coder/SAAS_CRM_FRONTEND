import { useState } from "react";
import { toast } from "react-toastify";
import { X, RefreshCw, UserPlus, Phone, FileText, Globe } from "lucide-react";
import { api } from "../../services/api";

const SOURCES = [
  "WhatsApp", "Facebook", "Instagram", "LinkedIn",
  "Website", "Referral", "Cold Call", "Other",
];

const STATUSES = ["Hot", "Warm", "Cold", "Junk"];

export default function CreateLeadFromWhatsAppModal({ isOpen, onClose, contact, onLeadCreated }) {
  const [form, setForm] = useState({
    leadName:    contact?.contactName && !isPhoneOnly(contact.contactName) ? contact.contactName : "",
    phoneNumber: contact?.contactWaId ? `+${contact.contactWaId}` : "",
    email:       "",
    companyName: "",
    requirement: "",
    source:      "WhatsApp",
    status:      "Cold",
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  function isPhoneOnly(name) {
    return /^\+?\d[\d\s\-().]+$/.test(name?.trim());
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.leadName.trim()) e.leadName = "Name is required";
    if (!form.phoneNumber.trim()) e.phoneNumber = "Phone number is required";
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    try {
      setSaving(true);
      const { data } = await api.post("/leads/create", {
        leadName:    form.leadName.trim(),
        phoneNumber: form.phoneNumber.trim(),
        email:       form.email.trim() || undefined,
        companyName: form.companyName.trim() || undefined,
        requirement: form.requirement.trim() || undefined,
        source:      form.source,
        status:      "Cold",
      });

      const lead = data.lead || data;
      toast.success(`Lead "${form.leadName}" created successfully!`);
      onLeadCreated?.(lead);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to create lead";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                 style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}>
              <UserPlus size={17} className="text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">Convert to Lead</h2>
              <p className="text-xs text-gray-400">Create a CRM lead from this WhatsApp contact</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 transition">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* WhatsApp contact info pill */}
          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-xl border border-green-100">
            <svg viewBox="0 0 24 24" fill="#25D366" width="16" height="16">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span className="text-xs text-green-700 font-medium">
              From WhatsApp · +{contact?.contactWaId}
            </span>
          </div>

          {/* Lead Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="leadName"
              value={form.leadName}
              onChange={handleChange}
              placeholder="Contact's full name"
              className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition ${
                errors.leadName ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-green-400"
              }`}
            />
            {errors.leadName && <p className="text-xs text-red-500 mt-1">{errors.leadName}</p>}
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                name="phoneNumber"
                value={form.phoneNumber}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-400 transition bg-gray-50"
              />
            </div>
            {errors.phoneNumber && <p className="text-xs text-red-500 mt-1">{errors.phoneNumber}</p>}
          </div>

          {/* Email + Company — side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="email@example.com"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-400 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <input
                type="text"
                name="companyName"
                value={form.companyName}
                onChange={handleChange}
                placeholder="Company name"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-400 transition"
              />
            </div>
          </div>

          {/* Source + Status — side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <select
                name="source"
                value={form.source}
                onChange={handleChange}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-400 transition bg-white"
              >
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-400 transition bg-white"
              >
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Requirement / Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Requirement / Notes
            </label>
            <textarea
              name="requirement"
              value={form.requirement}
              onChange={handleChange}
              rows={3}
              placeholder="What is the lead interested in? Any notes from the WhatsApp conversation..."
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-400 transition resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium transition disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}
            >
              {saving ? (
                <><RefreshCw size={15} className="animate-spin" /> Creating...</>
              ) : (
                <><UserPlus size={15} /> Create Lead</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
