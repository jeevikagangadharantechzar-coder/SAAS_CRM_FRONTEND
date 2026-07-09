import React, { useState } from "react";
import { X, UserPlus, Check, Search } from "lucide-react";
import { useChat } from "../../context/ChatContext";

const API_BASE = import.meta.env.VITE_SI_URI || "";

const buildImgUrl = (img) => {
  if (!img) return null;
  if (img.startsWith("http://") || img.startsWith("https://")) return img;
  const base = API_BASE.replace(/\/+$/, "");
  const n = img.replace(/^\/+/, "").replace(/^uploads\/users\//, "").replace(/^uploads\//, "");
  return `${base}/uploads/users/${n}`;
};

const Avatar = ({ name, image }) => {
  const [imgFailed, setImgFailed] = React.useState(false);
  const initials = (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const colors   = ["bg-blue-500", "bg-purple-500", "bg-green-500", "bg-orange-500", "bg-pink-500"];
  const color    = colors[(name?.charCodeAt(0) || 0) % colors.length];
  const url      = buildImgUrl(image);
  if (url && !imgFailed)
    return <img src={url} alt={name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" onError={() => setImgFailed(true)} />;
  return (
    <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center text-white font-semibold text-xs flex-shrink-0`}>
      {initials}
    </div>
  );
};

const AddMemberModal = ({ group, onClose }) => {
  const { contacts, addMembers } = useChat();

  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  // Contacts NOT already in the group
  const existingIds = (group.members || []).map((m) => String(m._id || m));
  const available   = contacts.filter((c) =>
    !existingIds.includes(String(c._id)) &&
    (c.name?.toLowerCase().includes(search.toLowerCase()) ||
     c.email?.toLowerCase().includes(search.toLowerCase()))
  );

  const toggle = (id) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleAdd = async () => {
    if (selected.length === 0) { setError("Select at least one person"); return; }
    setLoading(true);
    setError("");
    try {
      await addMembers(group._id, selected);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to add members");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#e8f7ff] rounded-xl flex items-center justify-center">
              <UserPlus size={16} className="text-[#008ecc]" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800 text-sm">Add Members</h2>
              <p className="text-[11px] text-gray-400">{group.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 transition">
            <X size={16} />
          </button>
        </div>

        <div className="p-4">
          {/* Search */}
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts..."
              autoFocus
              className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#008ecc] transition"
            />
          </div>

          {/* List */}
          <div className="max-h-60 overflow-y-auto space-y-1">
            {available.length === 0 ? (
              <div className="text-center text-sm text-gray-400 py-8">
                {contacts.length === existingIds.length ? "All contacts are already in this group" : "No contacts found"}
              </div>
            ) : (
              available.map((c) => {
                const isSel = selected.includes(c._id);
                return (
                  <button
                    key={c._id}
                    onClick={() => toggle(c._id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition
                      ${isSel ? "bg-[#f0faff] border border-[#008ecc]/20" : "hover:bg-gray-50 border border-transparent"}`}
                  >
                    <Avatar name={c.name} image={c.profileImage} />
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.role}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition
                      ${isSel ? "bg-[#008ecc] border-[#008ecc]" : "border-gray-300"}`}
                    >
                      {isSel && <Check size={10} className="text-white" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-4 pb-4">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={loading || selected.length === 0}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-[#008ecc] hover:bg-[#0078b0] disabled:opacity-50 rounded-xl transition flex items-center justify-center gap-2"
          >
            {loading
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><UserPlus size={14} /> Add {selected.length > 0 ? `(${selected.length})` : ""}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMemberModal;
