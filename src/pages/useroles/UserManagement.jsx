import React from "react";

import { useState, useEffect, useRef } from "react";
import AddUserModal from "./UserTop";
import CreateRoleModal from "./CreateRoleModal";
import EditUserModal from "./EditUserModal";
import EditRoleModal from "./EditRoleModal";
import DeleteModal from "./DeleteModal";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { useSelector } from "react-redux";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Shield,
  Mail,
  Phone,
  Users,
  HelpCircle,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Lock,
  Star,
  Briefcase,
  DollarSign,
  Headphones,
  BarChart,
  Settings,
  Award,
} from "react-feather";
import { TourProvider, useTour } from "@reactour/tour";

//  Centralized image URL builder
export const buildProfileImageUrl = (profileImage, baseUrl) => {
  if (!profileImage) return null;
  if (profileImage.startsWith("http://") || profileImage.startsWith("https://")) {
    return profileImage;
  }
  const base = (baseUrl || "").replace(/\/+$/, "");
  let imageName = profileImage
    .replace(/^\/+/, "")
    .replace(/^uploads\/users\//, "")
    .replace(/^uploads\//, "");
  return `${base}/uploads/users/${imageName}`;
};

// Utility: Scroll an element into view with its scrollable parents
function scrollIntoViewWithParents(el, options = {}) {
  if (!el) return;
  let parent = el.parentElement;
  while (parent) {
    const style = getComputedStyle(parent);
    const overflowY = style.overflowY;
    if (overflowY === "auto" || overflowY === "scroll") {
      const parentRect = parent.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      if (elRect.top < parentRect.top || elRect.bottom > parentRect.bottom) {
        parent.scrollTop +=
          elRect.top - parentRect.top - parentRect.height / 2 + elRect.height / 2;
      }
    }
    parent = parent.parentElement;
  }
  el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center", ...options });
}

const tourSteps = [
  { selector: ".add-user-btn button",        content: "Click here to add a new user with details, role, and status." },
  { selector: ".create-role-btn button",      content: "Click here to create a new role with permissions." },
  { selector: ".users-table .search-input",  content: "Search users by name, email, or phone number." },
  { selector: ".users-table .pagination",    content: "Use the pagination controls to navigate users." },
  { selector: ".roles-table .search-input",  content: "Search roles by name. The table updates as you type." },
  { selector: ".roles-table .first-role-row",content: "Each role row shows the role name with edit/delete options." },
  { selector: ".tour-finish",                content: "You've completed the tour! Restart anytime." },
];

const getRoleIcon = (roleName) => {
  const name = roleName?.toLowerCase() || "";
  if (name.includes("admin") || name.includes("super"))       return <Award     size={16} className="text-purple-600" />;
  if (name.includes("sales"))                                  return <DollarSign size={16} className="text-green-600" />;
  if (name.includes("manager"))                                return <Briefcase  size={16} className="text-blue-600" />;
  if (name.includes("support") || name.includes("customer"))  return <Headphones size={16} className="text-orange-600" />;
  if (name.includes("analyst") || name.includes("report"))    return <BarChart   size={16} className="text-teal-600" />;
  if (name.includes("executive") || name.includes("director"))return <Star       size={16} className="text-yellow-600" />;
  if (name.includes("developer") || name.includes("tech"))    return <Settings   size={16} className="text-indigo-600" />;
  return <Lock size={16} className="text-gray-600" />;
};

const DEFAULT_AVATAR =
  "https://static.vecteezy.com/system/resources/previews/020/429/953/non_2x/admin-icon-vector.jpg";

// ── Sort newest first by createdAt ────────────────────────────────────────────
const sortNewestFirst = (arr) =>
  [...arr].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

function UserManagementInner() {
  const API_URL = import.meta.env.VITE_API_URL;
  const API_SI  = import.meta.env.VITE_SI_URI;

  const { user } = useSelector((state) => state.auth);

  const [roles,              setRoles]              = useState([]);
  const [users,              setUsers]              = useState([]);
  const [currentPageUsers,   setCurrentPageUsers]   = useState(1);
  const [currentPageRoles,   setCurrentPageRoles]   = useState(1);
  const [itemsPerPage] = useState(5); 
  const [selectedItem,       setSelectedItem]       = useState(null);

  const limit = user?.tenantLimit?.max_users || 0;
  const isLimitReached = limit > 0 && users.length >= limit;
  const [actionType,         setActionType]         = useState("");
  const [itemType,           setItemType]           = useState("");
  const [searchUserQuery,    setSearchUserQuery]    = useState("");
  const [searchRoleQuery,    setSearchRoleQuery]    = useState("");
  const [statusFilter,       setStatusFilter]       = useState("all");
  const [activeSlide,        setActiveSlide]        = useState("users");

  const { setIsOpen, setCurrentStep, currentStep } = useTour();
  const containerRef = useRef(null);

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPageUsers(1); }, [searchUserQuery, statusFilter]);
  useEffect(() => { setCurrentPageRoles(1); }, [searchRoleQuery]);
  
  //  ADDED: Reset to page 1 when data changes
  useEffect(() => { setCurrentPageUsers(1); }, [users]);
  useEffect(() => { setCurrentPageRoles(1); }, [roles]);

  useEffect(() => {
    if (currentStep != null && tourSteps[currentStep]?.selector) {
      const el = document.querySelector(tourSteps[currentStep].selector);
      if (el) setTimeout(() => scrollIntoViewWithParents(el), 250);
    }
  }, [currentStep]);

  const startTour = () => { setCurrentStep(0); setIsOpen(true); };

  // ── Fetch roles ────────────────────────────────────────────────────────────
  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.get(`${API_URL}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const raw = Array.isArray(data) ? data : data.roles || [];
      setRoles(sortNewestFirst(raw));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load roles");
    }
  };

  // ── Fetch users ────────────────────────────────────────────────────────────
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.get(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const usersWithImageUrl = (data.users || []).map((user) => {
        const profileImageUrl = user.profileImage
          ? `${buildProfileImageUrl(user.profileImage, API_SI)}?t=${Date.now()}`
          : null;
        return { ...user, profileImageUrl };
      });
      setUsers(sortNewestFirst(usersWithImageUrl));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load users");
    }
  };

  const handleAction = (item, type, action) => {
    setSelectedItem(item);
    setItemType(type);
    setActionType(action);
  };

  const handleDeleteConfirm = async () => {
    const deletePromise = async () => {
      const token = localStorage.getItem("token");
      const url = itemType === "user"
        ? `${API_URL}/users/delete-user/${selectedItem._id}`
        : `${API_URL}/roles/delete-role/${selectedItem._id}`;
      await axios.delete(url, { headers: { Authorization: `Bearer ${token}` } });
      itemType === "user" ? fetchUsers() : fetchRoles();
      setActionType("");
    };

    toast.promise(deletePromise(), {
      loading: `Deleting ${itemType}...`,
      success: `${itemType === "user" ? "User" : "Role"} deleted successfully!`,
      error:   `Failed to delete ${itemType}`,
    });
  };

  useEffect(() => { fetchRoles(); fetchUsers(); }, []);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.firstName?.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
      user.mobileNumber?.toLowerCase().includes(searchUserQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active"   && user.status === "Active") ||
      (statusFilter === "inactive" && user.status !== "Active");
    return matchesSearch && matchesStatus;
  });

  const filteredRoles = roles.filter((role) =>
    role.name?.toLowerCase().includes(searchRoleQuery.toLowerCase())
  );

  // ── Pagination — users ──────────────────────────────────────────────────────
  const totalPagesUsers = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  
  //   Ensure current page is within valid range
  const safeCurrentPageUsers = Math.min(Math.max(1, currentPageUsers), totalPagesUsers);
  
  // Update state if page is out of range
  if (safeCurrentPageUsers !== currentPageUsers && currentPageUsers !== 1) {
    setCurrentPageUsers(safeCurrentPageUsers);
  }
  
  const indexOfLastUser = safeCurrentPageUsers * itemsPerPage;
  const indexOfFirstUser = indexOfLastUser - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);

  // ── Pagination — roles ──────────────────────────────────────────────────────
  const totalPagesRoles = Math.ceil(filteredRoles.length / itemsPerPage) || 1;
  
  //  Ensure current page is within valid range
  const safeCurrentPageRoles = Math.min(Math.max(1, currentPageRoles), totalPagesRoles);
  
  //  Update state if page is out of range
  if (safeCurrentPageRoles !== currentPageRoles && currentPageRoles !== 1) {
    setCurrentPageRoles(safeCurrentPageRoles);
  }
  
  const indexOfLastRole = safeCurrentPageRoles * itemsPerPage;
  const indexOfFirstRole = indexOfLastRole - itemsPerPage;
  const currentRoles = filteredRoles.slice(indexOfFirstRole, indexOfLastRole);

  //  Updated page change handlers with bounds checking
  const handlePageChangeUsers = (newPage) => {
    setCurrentPageUsers(Math.min(Math.max(1, newPage), totalPagesUsers));
  };
  
  const handlePageChangeRoles = (newPage) => {
    setCurrentPageRoles(Math.min(Math.max(1, newPage), totalPagesRoles));
  };

  const countPermissions = (permissions) => {
    if (!permissions || typeof permissions !== "object") return 0;
    let count = 0;
    for (const key in permissions) { if (permissions[key] === true) count++; }
    return count;
  };

  const formatPermissionName = (key) =>
    key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 flex flex-col items-center">

      {/* ── react-hot-toast Toaster ─────────────────────────────────────────── */}
      <Toaster
        position="top-right"
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "500",
            boxShadow: "0 4px 12px rgba(0,0,0,0.10)",
          },
          success: {
            style: {
              background: "#f0fdf4",
              color: "#166534",
              border: "1px solid #bbf7d0",
            },
            iconTheme: { primary: "#22c55e", secondary: "#f0fdf4" },
          },
          error: {
            style: {
              background: "#fef2f2",
              color: "#991b1b",
              border: "1px solid #fecaca",
            },
            iconTheme: { primary: "#ef4444", secondary: "#fef2f2" },
          },
          loading: {
            style: {
              background: "#eff6ff",
              color: "#1e40af",
              border: "1px solid #bfdbfe",
            },
          },
        }}
      />

      {/* Modals */}
      {actionType === "edit" && itemType === "user" && (
        <EditUserModal
          user={selectedItem}
          roles={roles}
          users={users}
          onClose={() => setActionType("")}
          onUserUpdated={fetchUsers}
        />
      )}
      {actionType === "edit" && itemType === "role" && (
        <EditRoleModal
          role={selectedItem}
          onClose={() => setActionType("")}
          onRoleUpdated={fetchRoles}
        />
      )}
      {actionType === "delete" && (
        <DeleteModal
          item={selectedItem}
          itemType={itemType}
          onClose={() => setActionType("")}
          onConfirm={handleDeleteConfirm}
        />
      )}

      <div className="w-full max-w-6xl mx-auto flex flex-col items-center" ref={containerRef}>

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="w-full mb-6 flex flex-col items-center">
          <div className="w-full flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <div className="text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                User &amp; Role Management
              </h1>
              <p className="text-gray-600 mt-1 text-sm">Manage users and their access permissions</p>
            </div>
            <div className="flex flex-wrap gap-3 items-center justify-center">
              <div className="add-user-btn">
                <AddUserModal onUserCreated={fetchUsers} disabled={isLimitReached} users={users} />
              </div>
              <div className="create-role-btn"><CreateRoleModal onRoleCreated={fetchRoles} /></div>
              <button
                onClick={startTour}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 text-sm font-medium flex items-center gap-2 tour-finish"
              >
                <HelpCircle size={16} />Take Tour
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="w-full border-b border-gray-200 mb-6">
            <nav className="flex justify-center space-x-1">
              <button
                onClick={() => setActiveSlide("users")}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeSlide === "users"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users size={18} />Users ({filteredUsers.length})
                </div>
              </button>
              <button
                onClick={() => setActiveSlide("roles")}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeSlide === "roles"
                    ? "border-green-600 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Shield size={18} />Roles ({filteredRoles.length})
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* ── Content ───────────────────────────────────────────────────────── */}
        <div className="w-full flex justify-center">

          {/* ══ Users Table ══════════════════════════════════════════════════ */}
          <div className={`transition-all duration-300 w-full max-w-6xl ${activeSlide === "users" ? "block" : "hidden"}`}>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden users-table">

              {/* Plan Limit Warning Banner */}
              {isLimitReached && (
                <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 text-amber-800 text-sm flex items-start space-x-2.5 animate-in fade-in duration-200">
                  <span className="text-lg mt-0.5">⚠️</span>
                  <div className="text-left">
                    <span className="font-bold block text-amber-900">User limit reached for your current plan</span>
                    <span className="text-amber-700 text-xs mt-0.5 block leading-relaxed">
                      You have reached the maximum allowed limit of {limit} users for your current plan. To add more users, please contact superadmin to upgrade your subscription.
                    </span>
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-md"><Users size={20} className="text-blue-600" /></div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Users</h2>
                      <p className="text-sm text-gray-500">
                        {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""} total
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={searchUserQuery}
                        onChange={(e) => setSearchUserQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full md:w-64 search-input"
                      />
                    </div>
                    <div className="relative">
                      <Filter size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none w-full md:w-40"
                      >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profile</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentUsers.length > 0 ? (
                      currentUsers.map((user, index) => (
                        <tr
                          key={user._id}
                          className={`hover:bg-gray-50 transition-colors user-row ${index === 0 ? "first-user-row" : ""}`}
                        >
                          <td className="px-6 py-4">
                            <img
                              src={user.profileImageUrl || DEFAULT_AVATAR}
                              alt={user.firstName}
                              className="h-10 w-10 rounded-full object-cover border border-gray-300"
                              onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_AVATAR; }}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</div>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Phone size={12} /><span>{user.mobileNumber || "-"}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Mail size={14} className="text-gray-400" />
                              <span className="text-sm text-gray-700">{user.email}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {getRoleIcon(user.role?.name)}
                              <span className="text-sm text-gray-700">{user.role?.name || "No role"}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {user.status === "Active" ? (
                              <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium">
                                <CheckCircle size={12} />Active
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-medium">
                                <XCircle size={12} />Inactive
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleAction(user, "user", "edit")}
                                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                title="Edit user"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleAction(user, "user", "delete")}
                                className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                title="Delete user"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <Users size={40} className="text-gray-300 mb-3" />
                            <h3 className="text-gray-500 font-medium mb-1">No users found</h3>
                            <p className="text-gray-400 text-sm">
                              {searchUserQuery || statusFilter !== "all"
                                ? "Try adjusting your search or filter"
                                : "Start by adding your first user"}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/*  Users Pagination - using safeCurrentPageUsers */}
              {filteredUsers.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 pagination">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-gray-600">
                      Showing <span className="font-medium">{indexOfFirstUser + 1}</span> to{" "}
                      <span className="font-medium">{Math.min(indexOfLastUser, filteredUsers.length)}</span> of{" "}
                      <span className="font-medium">{filteredUsers.length}</span> users
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChangeUsers(safeCurrentPageUsers - 1)}
                        disabled={safeCurrentPageUsers === 1}
                        className="p-2 rounded border border-gray-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <div className="flex items-center gap-1">
                        {[...Array(totalPagesUsers)].map((_, i) => (
                          <button
                            key={i}
                            onClick={() => handlePageChangeUsers(i + 1)}
                            className={`px-3 py-1 rounded text-sm font-medium ${
                              safeCurrentPageUsers === i + 1
                                ? "bg-blue-600 text-white"
                                : "text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => handlePageChangeUsers(safeCurrentPageUsers + 1)}
                        disabled={safeCurrentPageUsers === totalPagesUsers}
                        className="p-2 rounded border border-gray-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ══ Roles Table ═════════════════════════════════════════════════ */}
          <div className={`transition-all duration-300 w-full max-w-6xl ${activeSlide === "roles" ? "block" : "hidden"}`}>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden roles-table">

              {/* Controls */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-md"><Shield size={20} className="text-green-600" /></div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Roles</h2>
                      <p className="text-sm text-gray-500">
                        {filteredRoles.length} role{filteredRoles.length !== 1 ? "s" : ""} total
                      </p>
                    </div>
                  </div>
                  <div className="relative w-full md:w-64">
                    <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search roles..."
                      value={searchRoleQuery}
                      onChange={(e) => setSearchRoleQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent w-full search-input"
                    />
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissions</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentRoles.length > 0 ? (
                      currentRoles.map((role, index) => {
                        const permissionCount   = countPermissions(role.permissions);
                        const activePermissions = role.permissions
                          ? Object.entries(role.permissions)
                              .filter(([, v]) => v === true)
                              .map(([k]) => formatPermissionName(k))
                              .slice(0, 3)
                          : [];
                        return (
                          <tr
                            key={role._id}
                            className={`hover:bg-gray-50 transition-colors role-row ${index === 0 ? "first-role-row" : ""}`}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-100 rounded-md">{getRoleIcon(role.name)}</div>
                                <div className="font-medium text-gray-900">{role.name}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-700">
                                {permissionCount} permission{permissionCount !== 1 ? "s" : ""}
                              </div>
                              {permissionCount > 0 && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {activePermissions.join(", ")}{permissionCount > 3 && "..."}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleAction(role, "role", "edit")}
                                  className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                  title="Edit role"
                                >
                                  <Edit size={16} />
                                </button>
                                {role.name !== "Admin" && (
                                  <button
                                    onClick={() => handleAction(role, "role", "delete")}
                                    className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                    title="Delete role"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="3" className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <Shield size={40} className="text-gray-300 mb-3" />
                            <h3 className="text-gray-500 font-medium mb-1">No roles found</h3>
                            <p className="text-gray-400 text-sm">
                              {searchRoleQuery
                                ? "Try adjusting your search"
                                : "Create your first role to get started"}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/*  Roles Pagination - using safeCurrentPageRoles */}
              {filteredRoles.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 pagination">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-gray-600">
                      Showing <span className="font-medium">{indexOfFirstRole + 1}</span> to{" "}
                      <span className="font-medium">{Math.min(indexOfLastRole, filteredRoles.length)}</span> of{" "}
                      <span className="font-medium">{filteredRoles.length}</span> roles
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChangeRoles(safeCurrentPageRoles - 1)}
                        disabled={safeCurrentPageRoles === 1}
                        className="p-2 rounded border border-gray-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <div className="flex items-center gap-1">
                        {[...Array(totalPagesRoles)].map((_, i) => (
                          <button
                            key={i}
                            onClick={() => handlePageChangeRoles(i + 1)}
                            className={`px-3 py-1 rounded text-sm font-medium ${
                              safeCurrentPageRoles === i + 1
                                ? "bg-green-600 text-white"
                                : "text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => handlePageChangeRoles(safeCurrentPageRoles + 1)}
                        disabled={safeCurrentPageRoles === totalPagesRoles}
                        className="p-2 rounded border border-gray-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserManagement() {
  return (
    <TourProvider
      steps={tourSteps}
      scrollSmooth
      mutationObservables={[document.querySelector("#root")]}
      scrollIntoViewOptions={{ behavior: "smooth", block: "center", inline: "center" }}
      afterOpen={() => (document.body.style.overflow = "hidden")}
      beforeClose={() => (document.body.style.overflow = "unset")}
      styles={{
        popover: (base) => ({
          ...base,
          backgroundColor: "#fff",
          color: "#1f1f1f",
          maxWidth: "320px",
          borderRadius: "8px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          border: "1px solid #e5e7eb",
        }),
        maskArea: (base) => ({ ...base, rx: 8 }),
        badge:   (base) => ({ ...base, display: "none" }),
        close:   (base) => ({ ...base, right: "auto", left: 8, top: 8 }),
      }}
    >
      <UserManagementInner />
    </TourProvider>
  );
}