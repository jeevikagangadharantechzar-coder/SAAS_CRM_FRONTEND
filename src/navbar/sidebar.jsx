import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNotifications } from "../context/NotificationContext";
import {
  Home,
  ChevronRight,
  X,
  Shield,
  TrendingUp,
  FileText,
  ClipboardList,
  Users,
  GitBranch,
<<<<<<< HEAD
  BarChart3,
  Trophy,
  Mail,
  MessageCircle,
  CheckSquare,
  Target,
=======
  BarChart3, Trophy,
  Mail,
  MessageSquare
>>>>>>> 8e9d26f7782666b41d38d40c09c78e721872dfdc
} from "lucide-react";

import { NavLink, useLocation } from "react-router-dom";

const IconCircle = ({ children, isActive }) => (
  <div className="w-10 h-10 flex items-center justify-center rounded-full shadow-sm bg-white">
    {React.cloneElement(children, {
      color: isActive ? "#008ecc" : "#1f1f1f",
      size: 18,
    })}
  </div>
);

/* ── Sidebar Item ─────────────────────── */
const SidebarItem = ({ to, icon, label, exact = false, onClick, hasPermission = true }) => {
  if (!hasPermission) return null;

  return (
    <NavLink
      to={to}
      end={exact}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center justify-between w-full p-3 rounded-full transition-all duration-300
        ${isActive ? "bg-[#f2fbff]" : "hover:bg-[#f8f9fb]"}`
      }
    >
      {({ isActive }) => (
        <div className="flex items-center space-x-3">
          <IconCircle isActive={isActive}>{icon}</IconCircle>
          <span className={`text-base font-medium ${isActive ? "text-[#008ecc]" : "text-gray-700"}`}>
            {label}
          </span>
        </div>
      )}
    </NavLink>
  );
};

/* ── Collapsible Section ─────────────────────── */
const Collapsible = ({ label, icon, open, onToggle, children, hasPermission = true, activePaths = [] }) => {
  const location = useLocation();
  const isChildActive = activePaths.some((p) => location.pathname.includes(p));

  if (!hasPermission) return null;

  return (
    <div>
      <button
        onClick={onToggle}
        className={`flex items-center justify-between w-full p-3 rounded-full transition-all duration-300
          ${open || isChildActive ? "bg-[#f0fbff]" : "hover:bg-[#f8f9fb]"}`}
      >
        <div className="flex items-center space-x-3">
          <IconCircle isActive={open || isChildActive}>{icon}</IconCircle>
          <span className={`text-base font-medium ${isChildActive ? "text-[#008ecc]" : "text-gray-700"}`}>
            {label}
          </span>
        </div>
        <ChevronRight
          size={18}
          className={`ml-2 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        />
      </button>

      {open && <div className="pl-12 mt-2 flex flex-col gap-2">{children}</div>}
    </div>
  );
};

/* ── Small Link ─────────────────────── */
const SmallLink = ({ to, icon, label, hasPermission = true }) => {
  if (!hasPermission) return null;

  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `flex items-center gap-3 p-2 rounded-full transition-all duration-300
        ${isActive ? "bg-[#f2fbff]" : "hover:bg-[#f8f9fb]"}`
      }
    >
      {({ isActive }) => (
        <>
          <div className="w-7 h-7 flex items-center justify-center rounded-full shadow-sm bg-white">
            {React.cloneElement(icon, {
              color: isActive ? "#008ecc" : "#1f1f1f",
              size: 16,
            })}
          </div>
          <span className={`${isActive ? "text-[#008ecc]" : "text-gray-700"}`}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
};

/* ── Messages Sidebar Item with unread badge ─ */
const MessagesItem = ({ to }) => {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const API_URL    = import.meta.env.VITE_API_URL;
    const tenantSlug = localStorage.getItem("tenantSlug");
    const token      = localStorage.getItem("token");
    if (!tenantSlug || !token) return;

    const fetchUnread = async () => {
      try {
        const { data } = await axios.get(
          `${API_URL.replace("/api", "")}/${tenantSlug}/api/chat/unread-count`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setUnread(data.unreadCount || 0);
      } catch {}
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center justify-between w-full p-3 rounded-full transition-all duration-300
        ${isActive ? "bg-[#f2fbff]" : "hover:bg-[#f8f9fb]"}`
      }
    >
      {({ isActive }) => (
        <>
          <div className="flex items-center space-x-3">
            <IconCircle isActive={isActive}>
              <MessageSquare />
            </IconCircle>
            <span className={`text-base font-medium ${isActive ? "text-[#008ecc]" : "text-gray-700"}`}>
              Messages
            </span>
          </div>
          {unread > 0 && (
            <span className="bg-[#008ecc] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
};

/* ── Badge ─────────────────────── */
const Badge = ({ count }) => {
  if (!count) return null;
  return (
    <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5">
      {count > 99 ? "99+" : count}
    </span>
  );
};

/* ── Sidebar Component ─────────────────────── */
const Sidebar = ({ isOpen, toggleSidebar }) => {
  const API_URL = import.meta.env.VITE_API_URL;
  const [logo, setLogo] = useState(null);
<<<<<<< HEAD
  const [showActivities, setShowActivities] = useState(false);
  const { notifications } = useNotifications();

  //  Deals collapsible state
  const [showDeals, setShowDeals] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
=======
  const [showDeals, setShowDeals] = useState(false);
  const [userPermissions, setUserPermissions] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);
>>>>>>> 8e9d26f7782666b41d38d40c09c78e721872dfdc

  const location = useLocation();
  const tenantSlug = location.pathname.split("/")[1];

  // ── Compute role/permissions SYNCHRONOUSLY on every render ──────────────
  // This ensures badge counts are correct on the very first render (no delay)
  const _user = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; } })();
  const isAdmin = _user?.role?.name === "Admin";
  const userPermissions = isAdmin
    ? {
        dashboard: true, leads: true, deals_all: true, deals_pipeline: true,
        invoices: true, proposal: true, activities_calendar: true,
        activities_list: true, users_roles: true, email_chat: true,
        whatsapp_chat: true, reports: true, task_management: true,
        target_management: true, assigned_tasks: true,
      }
    : (_user?.role?.permissions || {});

  // Admin: completed tasks awaiting approval; Sales: newly assigned tasks + approvals + targets
  const adminTaskBadge = isAdmin
    ? notifications.filter((n) => n.type === "task" && (n.meta?.taskCompleted || n.meta?.taskNoteAdded) && !n.read && !n.isRead).length
    : 0;
  const salesTaskBadge = !isAdmin
    ? notifications.filter((n) => n.type === "task" && (n.meta?.taskAssigned || n.meta?.taskApproved) && !n.read && !n.isRead).length
    : 0;
  const salesTargetBadge = !isAdmin
    ? notifications.filter((n) => n.type === "target" && (n.meta?.targetAssigned || n.meta?.targetUpdated) && !n.read && !n.isRead).length
    : 0;

  // ── Active path helpers (reliable across tenant-slug routes) ────────────
  const p = location.pathname;
  const isTaskMgmtActive    = p.includes("/task-management");
  const isTargetMgmtActive  = p.includes("/target-management");
  const isAssignedActive    = p.includes("/assigned-tasks");
  const isMyTargetsActive   = p.includes("/my-targets");
  const isAnyTaskActive     = isTaskMgmtActive || isTargetMgmtActive || isAssignedActive || isMyTargetsActive;

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/settings`);
        if (data?.logo) {
          const cleanPath = data.logo.replace(/\\/g, "/");
          const fullUrl = `${API_URL.replace("/api", "")}/${cleanPath}`;
          setLogo(fullUrl);
        }
      } catch (err) {
        console.error("Failed to load company logo:", err);
      }
    };

    fetchLogo();
  }, []);

<<<<<<< HEAD
  // Auto-open menus based on active route
  useEffect(() => {
    if (p.includes("/deals") || p.includes("/Pipelineview")) setShowDeals(true);
  }, [p]);

  useEffect(() => {
    if (isAnyTaskActive) setShowTasks(true);
  }, [p]);
=======
  useEffect(() => {
    if (
      location.pathname.includes("/deals") ||
      location.pathname.includes("/Pipelineview")
    ) {
      setShowDeals(true);
    }
  }, [location.pathname]);
>>>>>>> 8e9d26f7782666b41d38d40c09c78e721872dfdc

  return (
    <aside
      className={`fixed lg:relative top-0 left-0 h-full bg-white p-4 w-64 transition-transform overflow-y-auto sidebar-scroll z-50
        ${isOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      id="main-sidebar"
    >
      {/* Header */}
      <div className="mb-8 flex flex-col items-center justify-center">
        <NavLink to="dashboard" className="cursor-pointer block">
          <img
            src={logo || "https://tzi.zaarapp.com//storage/uploads/logo//logo-dark.png"}
            alt="Company Logo"
            className="h-20 w-auto object-contain mx-auto hover:opacity-80 transition-opacity"
            onError={(e) => {
              e.target.src = "https://tzi.zaarapp.com//storage/uploads/logo//logo-dark.png";
            }}
          />
        </NavLink>

        <div className="relative group lg:hidden absolute top-4 right-4">
          <button onClick={toggleSidebar} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={22} className="text-gray-600" />
          </button>
          <div className="absolute top-full mt-2 right-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-3 py-1 rounded-md whitespace-nowrap pointer-events-none z-50">
            Close
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-3 px-2">
        {/* Dashboard */}
        <SidebarItem
          to="dashboard"
          icon={<Home />}
          label="Dashboard"
          hasPermission={isAdmin || userPermissions.dashboard}
        />

        {/* Leads */}
        <SidebarItem
          to="leads"
          icon={<Users />}
          label="Leads"
          hasPermission={isAdmin || userPermissions.leads}
        />

        {/* Deals (Collapsible) */}
        <Collapsible
          label="Deals"
          icon={<TrendingUp />}
          open={showDeals}
          onToggle={() => setShowDeals((s) => !s)}
          activePaths={["/deals", "/Pipelineview"]}
          hasPermission={
            isAdmin ||
            userPermissions.deals_all ||
            userPermissions.deals_pipeline
          }
        >
          <SmallLink
            to="Pipelineview"
            icon={<GitBranch />}
            label="Deal Stages PipelineView"
            hasPermission={isAdmin || userPermissions.deals_pipeline}
          />
          <SmallLink
            to="deals"
            icon={<TrendingUp />}
            label="All Deals"
            hasPermission={isAdmin || userPermissions.deals_all}
          />
        </Collapsible>

<<<<<<< HEAD

        {/* Tasks (Collapsible) */}
        {(isAdmin || userPermissions.task_management || userPermissions.target_management || userPermissions.assigned_tasks || (!isAdmin && userPermissions.my_targets !== false)) && (
          <div>
            <button
              onClick={() => setShowTasks((s) => !s)}
              className={`flex items-center justify-between w-full p-3 rounded-full transition-all duration-300 ${
                isAnyTaskActive || showTasks ? "bg-[#f0fbff]" : "hover:bg-[#f8f9fb]"
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 flex items-center justify-center rounded-full shadow-sm bg-white">
                  <CheckSquare color={isAnyTaskActive || showTasks ? "#008ecc" : "#1f1f1f"} size={18} />
                </div>
                <span className={`text-base font-medium ${isAnyTaskActive || showTasks ? "text-[#008ecc]" : ""}`}>
                  Tasks
                </span>
              </div>
              <div className="flex items-center gap-1.5 mr-0.5">
                {(adminTaskBadge > 0 || salesTaskBadge > 0 || salesTargetBadge > 0) && (
                  <Badge count={isAdmin ? adminTaskBadge : salesTaskBadge + salesTargetBadge} />
                )}
                <ChevronRight size={18} className={`transition-transform duration-200 ${showTasks ? "rotate-90" : ""}`} />
              </div>
            </button>

            {showTasks && (
              <div className="pl-12 mt-2 flex flex-col gap-2">
                {/* Task Management - admin only */}
                {(isAdmin || userPermissions.task_management) && (
                  <NavLink
                    to="/task-management"
                    className={`flex items-center gap-3 p-2 rounded-full transition-all duration-300 ${
                      isTaskMgmtActive ? "bg-[#f2fbff]" : "hover:bg-[#f8f9fb]"
                    }`}
                  >
                    <div className="w-7 h-7 flex items-center justify-center rounded-full shadow-sm bg-white">
                      <ClipboardList color={isTaskMgmtActive ? "#008ecc" : "#1f1f1f"} size={16} />
                    </div>
                    <span className={`flex-1 text-sm ${isTaskMgmtActive ? "text-[#008ecc] font-semibold" : "text-gray-700"}`}>
                      Task Management
                    </span>
                    {adminTaskBadge > 0 && <Badge count={adminTaskBadge} />}
                  </NavLink>
                )}

                {/* Target Management - admin only */}
                {(isAdmin || userPermissions.target_management) && (
                  <NavLink
                    to="/target-management"
                    className={`flex items-center gap-3 p-2 rounded-full transition-all duration-300 ${
                      isTargetMgmtActive ? "bg-[#f2fbff]" : "hover:bg-[#f8f9fb]"
                    }`}
                  >
                    <div className="w-7 h-7 flex items-center justify-center rounded-full shadow-sm bg-white">
                      <Target color={isTargetMgmtActive ? "#008ecc" : "#1f1f1f"} size={16} />
                    </div>
                    <span className={`text-sm ${isTargetMgmtActive ? "text-[#008ecc] font-semibold" : "text-gray-700"}`}>
                      Target Management
                    </span>
                  </NavLink>
                )}

                {/* My Tasks - sales person only */}
                {(!isAdmin && userPermissions.assigned_tasks) && (
                  <NavLink
                    to="/assigned-tasks"
                    className={`flex items-center gap-3 p-2 rounded-full transition-all duration-300 ${
                      isAssignedActive ? "bg-[#f2fbff]" : "hover:bg-[#f8f9fb]"
                    }`}
                  >
                    <div className="w-7 h-7 flex items-center justify-center rounded-full shadow-sm bg-white">
                      <CheckSquare color={isAssignedActive ? "#008ecc" : "#1f1f1f"} size={16} />
                    </div>
                    <span className={`flex-1 text-sm ${isAssignedActive ? "text-[#008ecc] font-semibold" : "text-gray-700"}`}>
                      My Tasks
                    </span>
                    {salesTaskBadge > 0 && <Badge count={salesTaskBadge} />}
                  </NavLink>
                )}

                {/* My Targets - sales person only (show unless explicitly disabled) */}
                {(!isAdmin && userPermissions.my_targets !== false) && (
                  <NavLink
                    to="/my-targets"
                    className={`flex items-center gap-3 p-2 rounded-full transition-all duration-300 ${
                      isMyTargetsActive ? "bg-[#f2fbff]" : "hover:bg-[#f8f9fb]"
                    }`}
                  >
                    <div className="w-7 h-7 flex items-center justify-center rounded-full shadow-sm bg-white">
                      <Target color={isMyTargetsActive ? "#008ecc" : "#1f1f1f"} size={16} />
                    </div>
                    <span className={`flex-1 text-sm ${isMyTargetsActive ? "text-[#008ecc] font-semibold" : "text-gray-700"}`}>
                      My Targets
                    </span>
                    {salesTargetBadge > 0 && <Badge count={salesTargetBadge} />}
                  </NavLink>
                )}
              </div>
            )}
          </div>
        )}

        {/* WhatsApp Chat */}
        {/* <SidebarItem
          to="/whatsapp"
          icon={<MessageCircle />}
          label="WhatsApp Chat"
          hasPermission={isAdmin || userPermissions.whatsapp_chat}
        /> */}

=======
>>>>>>> 8e9d26f7782666b41d38d40c09c78e721872dfdc
        {/* Proposal */}
        <SidebarItem
          to="proposal"
          icon={<ClipboardList />}
          label="Proposal"
          hasPermission={isAdmin || userPermissions.proposal}
        />

        {/* Invoice */}
        <SidebarItem
          to="invoices"
          exact
          icon={<FileText />}
          label="Invoices"
          hasPermission={isAdmin || userPermissions.invoices}
        />

        <SidebarItem
          to="DealAnalysis"
          icon={<ClipboardList />}
          label="Deal Analysis"
        />

        <SidebarItem
          to="LossAnalysis"
          icon={<ClipboardList />}
          label="Loss Analysis"
        />

        <SidebarItem
          to="cltv/dashboard"
          icon={<ClipboardList />}
          label="Won Analysis"
        />

        {/* Streak Leaderboard */}
        <SidebarItem
          to="leaderboard"
          icon={<Trophy />}
          label="Leaderboard"
          hasPermission={isAdmin || userPermissions.streak_leaderboard}
        />

        {/* Users & Roles */}
        <SidebarItem
          to="user&roles"
          icon={<Shield />}
          label="Users & Roles"
          hasPermission={isAdmin || userPermissions.users_roles}
        />

        {/* Internal Messages */}
        <MessagesItem to="messages" />

        {/* Email Chat */}
        <SidebarItem
          to="emailchat"
          icon={<Mail />}
          label="Email Chat"
          hasPermission={isAdmin || userPermissions.email_chat}
        />

        {/* Mass Email Campaigns */}
        <SidebarItem
          to="mass-email"
          icon={<Mail />}
          label="Email Campaign"
          hasPermission={isAdmin || userPermissions.email_campaigns}
        />

        {/* Team Analytics */}
        <SidebarItem
          to="team-analytics"
          icon={<BarChart3 />}
          label="Team Analytics"
          hasPermission={isAdmin || userPermissions.reports}
        />

        {/* Upgrade Plan */}
        {isAdmin && (
          <SidebarItem
            to={`/${tenantSlug}/plans`}
            icon={<TrendingUp />}
            label="Upgrade Plan"
          />
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
