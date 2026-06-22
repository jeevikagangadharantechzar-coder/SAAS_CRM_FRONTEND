import { useState } from "react";
import { WhatsappProvider } from "../../context/WhatsappContext";
import Conversationlist from "./Conversationlist";
import ChatWindow from "./Chatwindow";
import NewChatModal from "./Newchatmodal";
import { MessageCirclePlus } from "lucide-react";
//
// Get env vars
const SOCKET_URI = import.meta.env.VITE_SI_URI || "http://localhost:5000";

// Get userId from localStorage (adapt to your auth setup)
const getUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user._id || user.id || "anonymous";
  } catch {
    return "anonymous";
  }
};

export default function WhatsAppPage() {
  const [showNewChat, setShowNewChat] = useState(false);
  const userId = getUserId();

  return (
    <WhatsappProvider userId={userId} socketUri={SOCKET_URI}>
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 flex-shrink-0 flex flex-col h-full relative">
          <Conversationlist />

          {/* New Chat FAB */}
          <button
            onClick={() => setShowNewChat(true)}
            className="absolute bottom-5 right-5 w-12 h-12 bg-[#25d366] hover:bg-[#1da854] text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105"
            title="Start new chat"
          >
            <MessageCirclePlus className="w-6 h-6" />
          </button>
        </div>

        {/* Chat window */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <ChatWindow />
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}
    </WhatsappProvider>
  );
}