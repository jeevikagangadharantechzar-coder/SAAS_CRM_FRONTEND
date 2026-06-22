import { useState, useEffect } from "react";
import { useWhatsapp } from "../../context/WhatsappContext.jsx";
import { Search, MessageCircle, RefreshCw } from "lucide-react";

const formatTime = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { day: "2-digit", month: "short" });
};

const avatarColor = (name = "") => {
  const colors = [
    "bg-green-500", "bg-blue-500", "bg-purple-500",
    "bg-yellow-500", "bg-pink-500", "bg-indigo-500",
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx] || "bg-gray-500";
};

export default function Conversationlist() {
  const {
    conversations,
    loadingConversations,
    activeConversation,
    openConversation,
    loadConversations,
  } = useWhatsapp();

  const [search, setSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => loadConversations(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const displayName = (conv) =>
    conv.contactName ||
    conv.contactNumber?.replace("whatsapp:", "") ||
    "Unknown";

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 bg-[#075e54] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="text-white w-5 h-5" />
          <h2 className="text-white font-semibold text-base">WhatsApp</h2>
        </div>
        <button
          onClick={() => loadConversations(search)}
          className="text-white/80 hover:text-white transition"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loadingConversations ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search or start new chat"
            className="w-full pl-9 pr-3 py-2 rounded-full bg-white border border-gray-200 text-sm focus:outline-none focus:border-[#075e54] placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loadingConversations && conversations.length === 0 && (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#075e54]" />
          </div>
        )}

        {!loadingConversations && conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm gap-2">
            <MessageCircle className="w-10 h-10 opacity-30" />
            <p>No conversations yet</p>
          </div>
        )}

        {conversations.map((conv) => {
          const name = displayName(conv);
          const isActive = activeConversation?.contactNumber === conv.contactNumber;

          return (
            <div
              key={conv._id || conv.contactNumber}
              onClick={() => openConversation(conv)}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                isActive ? "bg-[#f0f2f5]" : ""
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-white font-semibold text-lg ${avatarColor(name)}`}
              >
                {name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 text-sm truncate">{name}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-1">
                    {formatTime(conv.lastMessageAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-gray-500 truncate max-w-[160px]">
                    {conv.lastMessageDirection === "outbound" && (
                      <span className="text-[#075e54] mr-1">You:</span>
                    )}
                    {conv.lastMessage || "No messages yet"}
                  </p>
                  {conv.unreadCount > 0 && (
                    <span className="ml-2 bg-[#25d366] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 font-semibold">
                      {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}//original