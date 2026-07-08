import React from "react";
import { ChatProvider, useChat } from "../../context/ChatContext";
import ContactList from "./ContactList";
import ChatWindow from "./ChatWindow";

// Mobile shows either the contact list or the open chat, never both at once —
// desktop (md+) keeps the classic two-pane layout.
const MessagesLayout = () => {
  const { activeContact, activeGroup } = useChat();
  const hasActiveChat = !!activeContact || !!activeGroup;

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden rounded-xl shadow-sm border border-gray-100">
      {/* Left — Contact list */}
      <div className={`w-full md:w-80 flex-shrink-0 ${hasActiveChat ? "hidden md:block" : "block"}`}>
        <ContactList />
      </div>

      {/* Right — Chat window */}
      <div className={`flex-1 flex-col overflow-hidden ${hasActiveChat ? "flex" : "hidden md:flex"}`}>
        <ChatWindow />
      </div>
    </div>
  );
};

const MessagesPage = () => (
  <ChatProvider>
    <MessagesLayout />
  </ChatProvider>
);

export default MessagesPage;
