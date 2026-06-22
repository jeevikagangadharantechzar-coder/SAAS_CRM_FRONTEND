import React, { useState } from "react";
import Sidebar from "../navbar/sidebar";
import Navbar from "./header";
import { Outlet } from "react-router-dom";
import ChatWidget from "../components/chatwidget";

const Layout = ({ isModalOpen }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  return (
    <>
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      {sidebarOpen && <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar toggleSidebar={toggleSidebar} />
        <div className={`flex-1 overflow-auto bg-gray-50 p-6 ${isModalOpen ? "backdrop-blur-md pointer-events-none" : ""}`}>
          {/* Routes inside Layout render here */}
          <Outlet />
        </div>
      </div>
    </div>
    <ChatWidget/>
    </>
  );
};

export default Layout;
