import React, { useState } from "react";
import Sidebar from "../navbar/sidebar";
import Navbar from "./header";
import { Outlet, NavLink } from "react-router-dom";
import { Home, Users, GitBranch, BarChart3, Trophy } from "lucide-react";
import ChatWidget from "../components/chatwidget";

const BottomNavItem = ({ to, icon, label }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center flex-1 py-1 transition-all duration-300 relative ${
          isActive ? "text-[#008ecc] font-bold" : "text-gray-500 hover:text-gray-800"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <div
            className={`p-1.5 rounded-xl transition-all duration-300 ${
              isActive ? "bg-[#f2fbff] scale-110" : "bg-transparent"
            }`}
          >
            {React.cloneElement(icon, {
              size: 20,
              color: isActive ? "#008ecc" : "#64748b",
            })}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">{label}</span>
          {isActive && (
            <span className="absolute bottom-0 w-5 h-0.5 bg-[#008ecc] rounded-full" />
          )}
        </>
      )}
    </NavLink>
  );
};

const Layout = ({ isModalOpen }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar toggleSidebar={toggleSidebar} />
          <div
            className={`flex-1 overflow-auto bg-gray-50 p-6 pb-24 lg:pb-6 transition-all duration-300 ${
              isModalOpen ? "backdrop-blur-md pointer-events-none" : ""
            }`}
          >
            {/* Routes inside Layout render here */}
            <Outlet />
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation (Visible on lg and smaller screens) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 flex justify-around items-center z-40 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <BottomNavItem to="/dashboard" icon={<Home />} label="Home" />
        <BottomNavItem to="/leads" icon={<Users />} label="Leads" />
        <BottomNavItem to="/Pipelineview" icon={<GitBranch />} label="Pipeline" />
        <BottomNavItem to="/DealAnalysis" icon={<BarChart3 />} label="Analysis" />
        <BottomNavItem to="/leaderboard" icon={<Trophy />} label="Streak" />
      </div>

      <ChatWidget />
    </>
  );
};

export default Layout;
