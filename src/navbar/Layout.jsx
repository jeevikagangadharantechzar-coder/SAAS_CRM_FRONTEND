import React, { useState } from "react";
import Sidebar from "../navbar/sidebar";
import Navbar from "./header";
import { Outlet } from "react-router-dom";
import ChatWidget from "../components/chatwidget";
import MissedFollowUpModal from "../components/MissedFollowUpModal";

const Layout = ({ isModalOpen }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  const hasChatbot = (() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return user?.planFeatures?.chatbot !== false;
    } catch {
      return true;
    }
  })();

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar toggleSidebar={toggleSidebar} />
          <div
            className={`flex-1 overflow-auto bg-gray-50 p-4 md:p-6 pb-24 lg:pb-6 transition-all duration-300 ${
              isModalOpen ? "backdrop-blur-md pointer-events-none" : ""
            }`}
          >
            {/* Routes inside Layout render here */}
            <Outlet />
          </div>
        </div>
      </div>

      {hasChatbot && <ChatWidget />}
      <MissedFollowUpModal />
    </>
  );
};

export default Layout;
