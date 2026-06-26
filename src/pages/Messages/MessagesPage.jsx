import React from "react";
import { ChatProvider } from "../../context/ChatContext";
import ContactList from "./ContactList";
import ChatWindow from "./ChatWindow";

const MessagesPage = () => {
  return (
    <ChatProvider>
      <div className="flex h-[calc(100vh-64px)] overflow-hidden rounded-xl shadow-sm border border-gray-100">
        {/* Left — Contact list */}
        <div className="w-80 flex-shrink-0">
          <ContactList />
        </div>

        {/* Right — Chat window */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ChatWindow />
        </div>
      </div>
    </ChatProvider>
  );
};

export default MessagesPage;
