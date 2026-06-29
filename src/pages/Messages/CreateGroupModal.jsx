import React, { useState } from "react";
import { X, Users, Check, Search, Shield, MessageSquareOff, ChevronRight } from "lucide-react";
import { useChat } from "../../context/ChatContext";

const API_BASE = import.meta.env.VITE_SI_URI || "";

const Avatar = ({ name, image, size = 8 }) => {
  const initials = (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const colors   = ["bg-blue-500", "bg-purple-500", "bg-green-500", "bg-orange-500", "bg-pink-500"];
  const color    = colors[(name?.charCodeAt(0) || 0) % colors.length];
  if (image)
    return <img src={`${API_BASE}/${image}`} alt={name} className={`w-${size} h-${size} rounded-full object-cover flex-shrink-0`} />;
  return (
    <div className={`w-${size} h-${size} rounded-full ${color} flex items-center justify-center text-white font-semibold text-xs flex-shrink-0`}>
      {initials}
    </div>
  );
};

const Toggle = ({ checked, onChange, label }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className="flex items-center justify-between w-full py-2"
  >
    <span className="text-sm text-gray-700">{label}</span>
    <div className={`relative w-10 h-5 rounded-full transition-colors ${checked ? "bg-[#008ecc]" : "bg-gray-200"}`}>
      <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </div>
  </button>
);

const CreateGroupModal = ({ onClose }) => {
  const { contacts, createGroup } = useChat();

  const [step,               setStep]               = useState(1); // 1=details, 2=members
  const [name,               setName]               = useState("");
  const [description,        setDescription]        = useState("");
  const [onlyAdminMsg,       setOnlyAdminMsg]       = useState(false);
  const [selected,           setSelected]           = useState([]); // [{ id, isAdmin }]
  const [search,             setSearch]             = useState("");
  const [loading,            setLoading]            = useState(false);
  const [error,              setError]              = useState("");

  const filtered = contacts.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getEntry   = (id) => selected.find((s) => s.id === id);
  const isSelected = (id) => !!getEntry(id);
  const isAdmin    = (id) => getEntry(id)?.isAdmin || false;

  const toggleMember = (id) => {
    setSelected((prev) =>
      prev.find((s) => s.id === id)
        ? prev.filter((s) => s.id !== id)
        : [...prev, { id, isAdmin: false }]
    );
  };

  const toggleAdmin = (id, e) => {
    e.stopPropagation();
    setSelected((prev) =>
      prev.map((s) => s.id === id ? { ...s, isAdmin: !s.isAdmin } : s)
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) { setError("Group name is required"); return; }
    if (selected.length === 0) { setError("Select at least one member"); return; }
    setLoading(true);
    setError("");
    try {
      await createGroup({
        name: name.trim(),
        description,
        memberIds:            selected.map((s) => s.id),
        adminIds:             selected.filter((s) => s.isAdmin).map((s) => s.id),
        onlyAdminsCanMessage: onlyAdminMsg,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#e8f7ff] rounded-xl flex items-center justify-center">
              <Users size={17} className="text-[#008ecc]" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800 text-sm">New Group</h2>
              <p className="text-[11px] text-gray-400">Step {step} of 2</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 transition">
            <X size={16} />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex gap-1.5 px-5 pt-3">
          {[1, 2].map((s) => (
            <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${step >= s ? "bg-[#008ecc]" : "bg-gray-100"}`} />
          ))}
        </div>

        {/* ── STEP 1: Group details ──────────────────────────────── */}
        {step === 1 && (
          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">Group Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(""); }}
                placeholder="Enter group name..."
                autoFocus
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#008ecc] transition"
                maxLength={60}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#008ecc] transition"
                maxLength={120}
              />
            </div>

            {/* Group settings */}
            <div className="border border-gray-100 rounded-xl p-3 space-y-1">
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Group Settings</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MessageSquareOff size={15} className="text-amber-500" />
                </div>
                <div className="flex-1">
                  <Toggle
                    checked={onlyAdminMsg}
                    onChange={setOnlyAdminMsg}
                    label="Only admins can send messages"
                  />
                  <p className="text-[11px] text-gray-400 -mt-1.5">Members can only read, not send</p>
                </div>
              </div>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        )}

        {/* ── STEP 2: Members + admin selection ─────────────────── */}
        {step === 2 && (
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Add Members
              </label>
              <span className="text-xs text-[#008ecc] font-medium">
                {selected.length} selected · {selected.filter((s) => s.isAdmin).length} admin{selected.filter((s) => s.isAdmin).length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search contacts..."
                className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#008ecc] transition"
              />
            </div>

            <div className="max-h-56 overflow-y-auto space-y-1">
              {filtered.map((c) => {
                const sel      = isSelected(c._id);
                const adminSet = isAdmin(c._id);
                return (
                  <div
                    key={c._id}
                    onClick={() => toggleMember(c._id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition
                      ${sel ? "bg-[#f0faff] border border-[#008ecc]/20" : "hover:bg-gray-50 border border-transparent"}`}
                  >
                    <Avatar name={c.name} image={c.profileImage} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                      <p className="text-xs text-gray-400 truncate">{c.role}</p>
                    </div>

                    {/* Admin toggle — only shown when member is selected */}
                    {sel && (
                      <button
                        onClick={(e) => toggleAdmin(c._id, e)}
                        title={adminSet ? "Remove admin" : "Make admin"}
                        className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border transition flex-shrink-0
                          ${adminSet
                            ? "bg-amber-50 border-amber-200 text-amber-600"
                            : "bg-gray-50 border-gray-200 text-gray-400 hover:border-amber-200 hover:text-amber-500"}`}
                      >
                        <Shield size={10} />
                        {adminSet ? "Admin" : "Member"}
                      </button>
                    )}

                    {/* Checkmark */}
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition
                      ${sel ? "bg-[#008ecc] border-[#008ecc]" : "border-gray-300"}`}
                    >
                      {sel && <Check size={10} className="text-white" />}
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-6">No contacts found</p>
              )}
            </div>

            {/* Selected summary chips */}
            {selected.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-1.5">
                {selected.map((s) => {
                  const contact = contacts.find((c) => c._id === s.id);
                  if (!contact) return null;
                  return (
                    <span key={s.id} className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border
                      ${s.isAdmin ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-[#f0faff] border-[#008ecc]/20 text-[#008ecc]"}`}
                    >
                      {s.isAdmin && <Shield size={9} />}
                      {contact.name.split(" ")[0]}
                    </span>
                  );
                })}
              </div>
            )}

            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100">
          <button
            onClick={() => step === 1 ? onClose() : setStep(1)}
            className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
          >
            {step === 1 ? "Cancel" : "← Back"}
          </button>

          {step === 1 ? (
            <button
              onClick={() => { if (!name.trim()) { setError("Group name is required"); return; } setError(""); setStep(2); }}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-[#008ecc] hover:bg-[#0078b0] rounded-xl transition flex items-center justify-center gap-2"
            >
              Next <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={loading}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-[#008ecc] hover:bg-[#0078b0] disabled:opacity-50 rounded-xl transition flex items-center justify-center gap-2"
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Users size={14} /> Create Group</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;
