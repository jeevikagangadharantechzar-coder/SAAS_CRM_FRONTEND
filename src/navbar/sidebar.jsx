import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNotifications } from "../context/NotificationContext";
import {
  Home,
  ChevronRight,
  X,
  Shield,
  TrendingUp,
  TrendingDown,
  ClipboardList,
  Users,
  GitBranch,
  BarChart3,
  Trophy,
  Mail,
  MessageSquare,
  CheckSquare,
  Target,
  Calendar,
  Briefcase,
  Receipt,
  Send,
  ArrowUpCircle,
} from "lucide-react";

import { NavLink, useLocation, useParams } from "react-router-dom";

const IconCircle = ({ children, isActive, sidebarOpen = true }) => (
  <div
    className={`flex items-center justify-center rounded-full transition-all duration-300 ${
      sidebarOpen
        ? `w-10 h-10 shadow-sm ${isActive ? "bg-[#f2fbff]" : "bg-white"}`
        : "w-10 h-10 bg-transparent shadow-none"
    }`}
  >
    {React.cloneElement(children, {
      color: isActive ? "#008ecc" : "#475569",
      size: 18,
    })}
  </div>
);

/* ── Sidebar Item ─────────────────────── */
const SidebarItem = ({
  to,
  icon,
  label,
  exact = false,
  onClick,
  hasPermission = true,
  sidebarOpen = true,
}) => {
  const { tenantSlug } = useParams();
  const location = useLocation();

  if (!hasPermission) return null;

  const resolvedTo =
    tenantSlug && !to.startsWith(`/${tenantSlug}`) && !to.startsWith("http")
      ? `/${tenantSlug}${to.startsWith("/") ? to : "/" + to}`
      : to;

  const isActive = exact
    ? location.pathname === resolvedTo
    : location.pathname.startsWith(resolvedTo);

  return (
    <NavLink
      to={resolvedTo}
      end={exact}
      onClick={onClick}
      className={
        `flex items-center justify-center transition-all duration-300 ${
          sidebarOpen
            ? `w-full p-2.5 rounded-full justify-between ${
                isActive ? "bg-[#f2fbff]/80 shadow-sm border border-blue-50" : "hover:bg-[#f8f9fb]"
              }`
            : `w-10 h-10 rounded-full ${
                isActive ? "bg-[#f2fbff] shadow-sm border border-blue-100" : "hover:bg-[#f8f9fb]"
              }`
        }`
      }
      title={!sidebarOpen ? label : ""}
    >
      {sidebarOpen ? (
        <div className="flex items-center space-x-3 w-full justify-start">
          <IconCircle isActive={isActive} sidebarOpen={sidebarOpen}>
            {icon}
          </IconCircle>
          <span
            className={`text-base font-medium transition-opacity duration-200 ${
              isActive ? "text-[#008ecc]" : "text-slate-750"
            }`}
          >
            {label}
          </span>
        </div>
      ) : (
        React.cloneElement(icon, {
          color: isActive ? "#008ecc" : "#475569",
          size: 18,
        })
      )}
    </NavLink>
  );
};

/* ── Collapsible Section ─────────────────────── */
const Collapsible = ({
  label,
  icon,
  open,
  onToggle,
  children,
  hasPermission = true,
  sidebarOpen = true,
  activePaths = [],
}) => {
  const { tenantSlug } = useParams();
  const location = useLocation();

  if (!hasPermission) return null;

  const hasActiveChild = React.Children.toArray(children).some((child) => {
    if (!child) return false;
    const childTo = child.props.to;
    const resolvedChildTo =
      tenantSlug && !childTo.startsWith(`/${tenantSlug}`) && !childTo.startsWith("http")
        ? `/${tenantSlug}${childTo.startsWith("/") ? childTo : "/" + childTo}`
        : childTo;
    return location.pathname.startsWith(resolvedChildTo);
  });

  const isChildActive = activePaths.some((p) => location.pathname.includes(p)) || hasActiveChild;

  return (
    <div className="w-full flex flex-col items-center">
      <button
        onClick={onToggle}
        className={`flex items-center justify-center transition-all duration-300 cursor-pointer ${
          sidebarOpen
            ? `w-full p-2.5 rounded-full justify-between ${
                open || isChildActive ? "bg-[#f2fbff]/50" : "hover:bg-[#f8f9fb]"
              }`
            : `w-10 h-10 rounded-full ${
                open || isChildActive ? "bg-[#f2fbff] shadow-sm border border-blue-100" : "hover:bg-[#f8f9fb]"
              }`
        }`}
        title={!sidebarOpen ? label : ""}
      >
        {sidebarOpen ? (
          <>
            <div className="flex items-center space-x-3 w-full justify-start">
              <IconCircle isActive={open || isChildActive} sidebarOpen={sidebarOpen}>
                {icon}
              </IconCircle>
              <span
                className={`text-base font-medium ${
                  isChildActive ? "text-[#008ecc]" : "text-slate-750"
                }`}
              >
                {label}
              </span>
            </div>
            <ChevronRight
              size={16}
              className={`ml-2 text-slate-400 transition-transform duration-250 ${
                open ? "rotate-90 text-[#008ecc]" : ""
              }`}
            />
          </>
        ) : (
          React.cloneElement(icon, {
            color: open || isChildActive ? "#008ecc" : "#475569",
            size: 18,
          })
        )}
      </button>

      {open && (
        <div
          className={`${
            sidebarOpen ? "pl-11 w-full" : "pl-0 flex flex-col items-center"
          } mt-1.5 flex flex-col gap-1.5 transition-all duration-300`}
        >
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child, { sidebarOpen });
            }
            return child;
          })}
        </div>
      )}
    </div>
  );
};

/* ── Small Link ─────────────────────── */
const SmallLink = ({ to, icon, label, hasPermission = true, sidebarOpen = true, badge = 0 }) => {
  const { tenantSlug } = useParams();
  const location = useLocation();

  if (!hasPermission) return null;

  const resolvedTo =
    tenantSlug && !to.startsWith(`/${tenantSlug}`) && !to.startsWith("http")
      ? `/${tenantSlug}${to.startsWith("/") ? to : "/" + to}`
      : to;

  const isResolvedActive = location.pathname.startsWith(resolvedTo);

  return (
    <NavLink
      to={resolvedTo}
      end={false}
      className={
        `flex items-center justify-center transition-all duration-300 w-full ${
          sidebarOpen
            ? `p-2 rounded-full justify-start gap-2.5 ${
                isResolvedActive ? "bg-[#f2fbff]/80 shadow-sm border border-blue-50" : "hover:bg-[#f8f9fb]"
              }`
            : `w-10 h-10 rounded-full ${
                isResolvedActive ? "bg-[#f2fbff] shadow-sm border border-blue-100" : "hover:bg-[#f8f9fb]"
              }`
        }`
      }
      title={!sidebarOpen ? label : ""}
    >
      {sidebarOpen ? (
        <>
          <div className="relative w-8 h-8 flex items-center justify-center rounded-full shadow-sm bg-white">
            {React.cloneElement(icon, {
              color: isResolvedActive ? "#008ecc" : "#475569",
              size: 15,
            })}
            {badge > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
            )}
          </div>
          <span
            className={`text-base font-medium ${
              isResolvedActive ? "text-[#008ecc]" : "text-slate-600"
            }`}
          >
            {label}
          </span>
          {badge > 0 && (
            <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </>
      ) : (
        <div className="relative">
          {React.cloneElement(icon, {
            color: isResolvedActive ? "#008ecc" : "#475569",
            size: 18,
          })}
          {badge > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
              {badge > 9 ? "9+" : badge}
            </span>
          )}
        </div>
      )}
    </NavLink>
  );
};

/* ── Messages Sidebar Item with unread badge ─ */
const MessagesItem = ({ to, sidebarOpen = true }) => {
  const [unread, setUnread] = useState(0);
  const { tenantSlug } = useParams();
  const location = useLocation();

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL;
    const activeSlug = localStorage.getItem("tenantSlug") || tenantSlug;
    const token = localStorage.getItem("token");
    if (!activeSlug || !token) return;

    const BASE = `${API_URL.replace("/api", "")}/${tenantSlug}/api`;
    const headers = { Authorization: `Bearer ${token}` };

    const fetchUnread = async () => {
      try {
        const [dmRes, grpRes] = await Promise.allSettled([
          axios.get(`${BASE}/chat/unread-count`, { headers }),
          axios.get(`${BASE}/groups`, { headers }),
        ]);
        const dmUnread = dmRes.status === "fulfilled" ? (dmRes.value.data.unreadCount || 0) : 0;
        const grpUnread =
          grpRes.status === "fulfilled"
            ? (grpRes.value.data.groups || []).reduce((s, g) => s + (g.unreadCount || 0), 0)
            : 0;
        setUnread(dmUnread + grpUnread);
      } catch (_e) {}
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);

    const handleLive = (e) => setUnread(e.detail.count);
    window.addEventListener("crm:chat_unread", handleLive);

    return () => {
      clearInterval(interval);
      window.removeEventListener("crm:chat_unread", handleLive);
    };
  }, [tenantSlug]);

  const resolvedTo =
    tenantSlug && !to.startsWith(`/${tenantSlug}`) && !to.startsWith("http")
      ? `/${tenantSlug}${to.startsWith("/") ? to : "/" + to}`
      : to.startsWith("/") ? to : `/${to}`;

  const isActive = location.pathname.startsWith(resolvedTo);

  return (
    <NavLink
      to={resolvedTo}
      className={
        `flex items-center justify-center transition-all duration-300 ${
          sidebarOpen
            ? `w-full p-2.5 rounded-full justify-between ${
                isActive ? "bg-[#f2fbff]/80 shadow-sm border border-blue-50" : "hover:bg-[#f8f9fb]"
              }`
            : `w-10 h-10 rounded-full ${
                isActive ? "bg-[#f2fbff] shadow-sm border border-blue-100" : "hover:bg-[#f8f9fb]"
              }`
        }`
      }
      title={!sidebarOpen ? "Messages" : ""}
    >
      {sidebarOpen ? (
        <>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <IconCircle isActive={isActive} sidebarOpen={sidebarOpen}>
                <MessageSquare />
              </IconCircle>
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
              )}
            </div>
            <span className={`text-base font-medium ${isActive ? "text-[#008ecc]" : "text-gray-700"}`}>
              Messages
            </span>
          </div>
          {unread > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </>
      ) : (
        <div className="relative">
          <MessageSquare color={isActive ? "#008ecc" : "#475569"} size={18} />
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-[#008ecc] text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
              !
            </span>
          )}
        </div>
      )}
    </NavLink>
  );
};

/* ── Sidebar Component ─────────────────────── */
const Sidebar = ({ isOpen, toggleSidebar }) => {
  const API_URL = import.meta.env.VITE_API_URL;
  const [logo, setLogo] = useState(null);
  const [showDeals, setShowDeals] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showTasks, setShowTasks] = useState(false);

  const { notifications } = useNotifications();
  const location = useLocation();
  const { tenantSlug } = useParams();

  const [userPermissions, setUserPermissions] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const _user = (() => {
      try {
        return JSON.parse(localStorage.getItem("user") || "{}");
      } catch {
        return {};
      }
    })();

    const adminStatus = _user?.role?.name === "Admin";
    setIsAdmin(adminStatus);

    if (adminStatus) {
      setUserPermissions({
        dashboard: true,
        leads: true,
        deals_all: true,
        deals_pipeline: true,
        invoices: true,
        proposal: true,
        activities_calendar: true,
        activities_list: true,
        users_roles: true,
        email_chat: true,
        whatsapp_chat: true,
        reports: true,
        task_management: true,
        target_management: true,
        assigned_tasks: true,
        Meetings: true,
        streak_leaderboard: true,
        email_campaigns: true,
      });
    } else if (_user?.role?.permissions) {
      setUserPermissions(_user.role.permissions);
    }
  }, []);

  const adminTaskBadge = isAdmin
    ? notifications.filter(
        (n) =>
          n.type === "task" &&
          (n.meta?.taskCompleted || n.meta?.taskNoteAdded) &&
          !n.read &&
          !n.isRead
      ).length
    : 0;

  const salesTaskBadge = !isAdmin
    ? notifications.filter(
        (n) =>
          n.type === "task" &&
          (n.meta?.taskAssigned || n.meta?.taskApproved) &&
          !n.read &&
          !n.isRead
      ).length
    : 0;

  // Plain "target" notifications (lead converted by Admin, deal stage moved by
  // Admin, new target assigned, etc.) belong in the My Targets/Target
  // Management badge too, live, not just the header bell.
  const TARGET_NOTIF_TYPES = ["target", "target_reminder", "target_due_today", "target_expired", "target_reassign", "reason_note"];

  const salesTargetBadge = !isAdmin
    ? notifications.filter(
        (n) => TARGET_NOTIF_TYPES.includes(n.type) && !n.read && !n.isRead
      ).length
    : 0;

  const adminTargetBadge = isAdmin
    ? notifications.filter(
        (n) => TARGET_NOTIF_TYPES.includes(n.type) && !n.read && !n.isRead
      ).length
    : 0;

  const p = location.pathname;
  const isTaskMgmtActive = p.includes("/task-management");
  const isTargetMgmtActive = p.includes("/target-management");
  const isAssignedActive = p.includes("/assigned-tasks");
  const isMyTargetsActive = p.includes("/my-targets");
  const isAnyTaskActive =
    isTaskMgmtActive || isTargetMgmtActive || isAssignedActive || isMyTargetsActive;

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

  useEffect(() => {
    if (p.includes("/deals") || p.includes("/Pipelineview")) {
      setShowDeals(true);
    }
    if (
      p.includes("/DealAnalysis") ||
      p.includes("/LossAnalysis") ||
      p.includes("/cltv")
    ) {
      setShowAnalysis(true);
    }
    if (p.includes("/emailchat") || p.includes("/mass-email")) {
      setShowEmail(true);
    }
    if (isAnyTaskActive) {
      setShowTasks(true);
    }
  }, [p, isAnyTaskActive]);

  return (
    <aside
      className={`fixed lg:relative top-0 left-0 h-full bg-white transition-all duration-300 overflow-y-auto sidebar-scroll z-50 shadow-[4px_0_24px_rgba(0,0,0,0.02)] border-r border-slate-100
        ${isOpen ? "w-64 p-4" : "w-20 p-2"}
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} lg:translate-x-0`}
      id="main-sidebar"
    >
      {/* Header - Logo */}
      <div className="mb-8 flex flex-col items-center justify-center relative">
        <NavLink to="dashboard" className="cursor-pointer block">
          <img
            src={logo || "https://tzi.zaarapp.com//storage/uploads/logo//logo-dark.png"}
            alt="Company Logo"
            className={`w-auto object-contain mx-auto hover:opacity-80 transition-all duration-300 ${
              isOpen ? "h-16" : "h-7"
            }`}
            onError={(e) => {
              e.target.src = "https://tzi.zaarapp.com//storage/uploads/logo//logo-dark.png";
            }}
          />
        </NavLink>

        {isOpen && (
          <div className="relative group lg:hidden absolute top-0 right-0">
            <button
              onClick={toggleSidebar}
              className="p-1.5 hover:bg-gray-100 rounded-full cursor-pointer"
            >
              <X size={18} className="text-gray-600" />
            </button>
          </div>
        )}
      </div>

      <nav className={`flex flex-col gap-2.5 ${isOpen ? "px-1.5" : "px-0.5 items-center"}`}>
        {/* Dashboard */}
        <SidebarItem
          to="dashboard"
          icon={<Home />}
          label="Dashboard"
          hasPermission={isAdmin || userPermissions.dashboard}
          sidebarOpen={isOpen}
        />

        {/* Leads */}
        <SidebarItem
          to="leads"
          icon={<Users />}
          label="Leads"
          hasPermission={isAdmin || userPermissions.leads}
          sidebarOpen={isOpen}
        />

        {/* Deals (Collapsible) */}
        <Collapsible
          label="Deals"
          icon={<Briefcase />}
          open={showDeals}
          onToggle={() => setShowDeals((s) => !s)}
          sidebarOpen={isOpen}
          activePaths={["/deals", "/Pipelineview"]}
          hasPermission={
            isAdmin || userPermissions.deals_all || userPermissions.deals_pipeline
          }
        >
          <SmallLink
            to="Pipelineview"
            icon={<GitBranch />}
            label="Pipeline View"
            hasPermission={isAdmin || userPermissions.deals_pipeline}
          />
          <SmallLink
            to="deals"
            icon={<TrendingUp />}
            label="All Deals"
            hasPermission={isAdmin || userPermissions.deals_all}
          />
        </Collapsible>

        {/* Tasks (Collapsible) */}
        {(isAdmin ||
          userPermissions.task_management ||
          userPermissions.target_management ||
          userPermissions.assigned_tasks ||
          (!isAdmin && userPermissions.my_targets !== false)) && (
          <Collapsible
            label="Tasks"
            icon={<CheckSquare />}
            open={showTasks}
            onToggle={() => setShowTasks((s) => !s)}
            sidebarOpen={isOpen}
            activePaths={[
              "/task-management",
              "/target-management",
              "/assigned-tasks",
              "/my-targets",
            ]}
          >
            {(isAdmin || userPermissions.task_management) && (
              <SmallLink
                to="task-management"
                icon={<ClipboardList />}
                label="Task Management"
                badge={adminTaskBadge}
              />
            )}

            {(isAdmin || userPermissions.target_management) && (
              <SmallLink
                to="target-management"
                icon={<Target />}
                label="Target Management"
                badge={adminTargetBadge}
              />
            )}

            {!isAdmin && userPermissions.assigned_tasks && (
              <SmallLink
                to="assigned-tasks"
                icon={<CheckSquare />}
                label="My Tasks"
                badge={salesTaskBadge}
              />
            )}

            {!isAdmin && userPermissions.my_targets !== false && (
              <SmallLink
                to="my-targets"
                icon={<Target />}
                label="My Targets"
                badge={salesTargetBadge}
              />
            )}
          </Collapsible>
        )}

        {/* Proposal */}
        <SidebarItem
          to="proposal"
          icon={<ClipboardList />}
          label="Proposal"
          hasPermission={isAdmin || userPermissions.proposal}
          sidebarOpen={isOpen}
        />

        {/* Invoice */}
        <SidebarItem
          to="invoices"
          exact
          icon={<Receipt />}
          label="Invoices"
          hasPermission={isAdmin || userPermissions.invoices}
          sidebarOpen={isOpen}
        />

        {/* Analysis (Collapsible Group) */}
        <Collapsible
          label="Analysis"
          icon={<BarChart3 />}
          open={showAnalysis}
          onToggle={() => setShowAnalysis((s) => !s)}
          sidebarOpen={isOpen}
          activePaths={["/DealAnalysis", "/LossAnalysis", "/cltv"]}
        >
          <SmallLink
            to="DealAnalysis"
            icon={<BarChart3 />}
            label="Deal Analysis"
          />
          <SmallLink
            to="cltv/dashboard"
            icon={<TrendingUp />}
            label="Won Analysis"
          />
          <SmallLink
            to="LossAnalysis"
            icon={<TrendingDown />}
            label="Loss Analysis"
          />
        </Collapsible>

        {/* Streak Leaderboard */}
        <SidebarItem
          to="leaderboard"
          icon={<Trophy />}
          label="Leaderboard"
          hasPermission={isAdmin || userPermissions.streak_leaderboard}
          sidebarOpen={isOpen}
        />

        {/* Email (Collapsible Group) */}
        <Collapsible
          label="Email"
          icon={<Mail />}
          open={showEmail}
          onToggle={() => setShowEmail((s) => !s)}
          sidebarOpen={isOpen}
          hasPermission={
            isAdmin || userPermissions.email_chat || userPermissions.email_campaigns
          }
        >
          <SmallLink
            to="emailchat"
            icon={<Mail />}
            label="Email Chat"
            hasPermission={isAdmin || userPermissions.email_chat}
          />
          <SmallLink
            to="mass-email"
            icon={<Send />}
            label="Email Campaign"
            hasPermission={isAdmin || userPermissions.email_campaigns}
          />
        </Collapsible>

        {/* Internal Messages */}
        <MessagesItem to="messages" sidebarOpen={isOpen} />

        {/* Meetings */}
        <SidebarItem
          to="meetings"
          icon={<Calendar />}
          label="Meetings"
          hasPermission={isAdmin || userPermissions.Meetings}
          sidebarOpen={isOpen}
        />

        {/* Team Analytics */}
        <SidebarItem
          to="team-analytics"
          icon={<BarChart3 />}
          label="Team Analytics"
          hasPermission={isAdmin || userPermissions.reports}
          sidebarOpen={isOpen}
        />

        {/* Users & Roles */}
        <SidebarItem
          to="user&roles"
          icon={<Shield />}
          label="Users & Roles"
          hasPermission={isAdmin || userPermissions.users_roles}
          sidebarOpen={isOpen}
        />

        {/* Upgrade Plan */}
        {isAdmin && (
          <SidebarItem
            to={`/${tenantSlug}/plans`}
            icon={<ArrowUpCircle />}
            label="Upgrade Plan"
            sidebarOpen={isOpen}
          />
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
