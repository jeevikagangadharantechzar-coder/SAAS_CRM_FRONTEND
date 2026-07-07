import React, { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  LayoutDashboard,
  Building2,
  Settings,
  User,
  Power,
  Menu,
  X,
  ShieldAlert,
  CreditCard,
  Rocket,
} from "lucide-react";
import { clearSuperAdminCredentials } from "../../store/authSlice";

const IconCircle = ({ children, isActive }) => (
  <div className="w-10 h-10 flex items-center justify-center rounded-full shadow-sm bg-white border border-slate-100">
    {React.cloneElement(children, {
      color: isActive ? "#008ecc" : "#1f1f1f",
      size: 18,
    })}
  </div>
);

const SuperAdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(clearSuperAdminCredentials());
    window.location.href = "/";
  };

  const navItems = [
    { to: "/superadmin/dashboard", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
    { to: "/superadmin/tenants", icon: <Building2 size={20} />, label: "Tenants" },
    { to: "/superadmin/free-trials", icon: <Rocket size={20} />, label: "Free Trial Signups" },
    { to: "/superadmin/upgrade-requests", icon: <ShieldAlert size={20} />, label: "Upgrade Requests" },
    { to: "/superadmin/subscription-plans", icon: <CreditCard size={20} />, label: "Subscription plans" },
    { to: "/superadmin/settings", icon: <Settings size={20} />, label: "Settings" },
    { to: "/superadmin/profile", icon: <User size={20} />, label: "Profile" },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-white text-slate-800 border-r border-slate-200 transition-transform duration-300 transform lg:translate-x-0 lg:static lg:inset-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex flex-col items-center justify-center px-6 py-6 border-b border-slate-100 relative">
          <Link to="/superadmin/dashboard" className="cursor-pointer block text-center">
            <img
              src="/images/TZI_Logo-04_-_Copy-removebg-preview.png"
              alt="TZI Logo"
              className="h-16 w-auto object-contain mx-auto hover:opacity-80 transition-opacity"
              onError={(e) => {
                e.target.src = "https://tzi.zaarapp.com//storage/uploads/logo//logo-dark.png";
              }}
            />
            <span className="text-sm font-bold tracking-wider text-[#008ecc] mt-2 block">SuperAdmin Portal</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden absolute top-4 right-4 text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-2 rounded-full transition-all duration-200 ${
                  isActive
                    ? "bg-[#f2fbff] text-[#008ecc] font-semibold"
                    : "text-slate-600 hover:bg-[#f8f9fb] hover:text-slate-900"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <IconCircle isActive={isActive}>{item.icon}</IconCircle>
                  <span className="text-base font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-800 shadow-sm border border-slate-300">
                SA
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-800">Platform Owner</p>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">SuperAdmin</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-500 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
              title="Logout"
            >
              <Power size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm z-10">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-slate-100 lg:hidden text-slate-600 transition-colors"
            >
              <Menu size={22} />
            </button>
            <h1 className="text-xl font-bold text-slate-800">Management Console</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-[#008ecc] border border-blue-100">
              Live Server
            </span>
          </div>
        </header>

        {/* Dashboard Views Container */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
