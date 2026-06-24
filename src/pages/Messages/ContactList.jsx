import React, { useState } from "react";
import { Search } from "lucide-react";
import { useChat } from "../../context/ChatContext";

const API_BASE = import.meta.env.VITE_SI_URI || "";

const formatTime = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
};

const Avatar = ({ name, image, size = 10 }) => {
  const initials = (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const colors   = ["bg-blue-500", "bg-purple-500", "bg-green-500", "bg-orange-500", "bg-pink-500"];
  const color    = colors[(name?.charCodeAt(0) || 0) % colors.length];

  if (image) {
    return (
      <img
        src={`${API_BASE}/${image}`}
        alt={name}
        className={`w-${size} h-${size} rounded-full object-cover`}
        onError={(e) => { e.target.style.display = "none"; }}
      />
    );
  }
  return (
    <div className={`w-${size} h-${size} rounded-full ${color} flex items-center justify-center text-white font-semibold text-sm`}>
      {initials}
    </div>
  );
};

const ContactList = () => {
  const { contacts, activeContact, onlineUsers, selectContact } = useChat();
  const [search, setSearch] = useState("");

  const filtered = contacts.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-100">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Messages</h2>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-[#008ecc]"
          />
        </div>
      </div>

      {/* Contact items */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-gray-400">
            No contacts found
          </div>
        ) : (
          filtered.map((contact) => {
            const isOnline = onlineUsers.includes(String(contact._id));
            const isActive = activeContact?._id === contact._id;

            return (
              <button
                key={contact._id}
                onClick={() => selectContact(contact)}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-all
                  ${isActive ? "bg-[#f0faff] border-r-2 border-[#008ecc]" : "hover:bg-gray-50"}`}
              >
                {/* Avatar + online dot */}
                <div className="relative flex-shrink-0">
                  <Avatar name={contact.name} image={contact.profileImage} size={10} />
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white
                    ${isOnline ? "bg-green-500" : "bg-gray-300"}`}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium truncate ${isActive ? "text-[#008ecc]" : "text-gray-800"}`}>
                      {contact.name}
                    </span>
                    <span className="text-[10px] text-gray-400 flex-shrink-0 ml-1">
                      {contact.lastMessage ? formatTime(contact.lastMessage.createdAt) : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-xs text-gray-400 truncate">
                      {contact.lastMessage
                        ? contact.lastMessage.fileType
                          ? `📎 ${contact.lastMessage.fileType === "image" ? "Image" : "File"}`
                          : contact.lastMessage.message
                        : contact.email}
                    </span>
                    {contact.unreadCount > 0 && (
                      <span className="ml-1 flex-shrink-0 bg-[#008ecc] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {contact.unreadCount > 9 ? "9+" : contact.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ContactList;
