import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { superApi } from "../../services/api";
import { toast } from "react-toastify";
import { format } from "date-fns";
import {
  UserCog, ShieldCheck, Plus, Pencil, Trash2, X, Loader2, KeyRound, MailCheck, Users, Shield,
  Filter, ChevronDown, SlidersHorizontal, Check, Search,
} from "lucide-react";

const PERMISSION_LABELS = {
  dashboard: "Dashboard",
  tenants: "Tenants",
  free_trials: "Free Trial Signups",
  analysis: "Conversion Analysis",
  upgrade_requests: "Upgrade Requests",
  support_tickets: "Support Tickets",
  subscription_plans: "Subscription Plans",
  settings: "Settings",
  admin_users: "Super Admin Users & Roles",
};

const EMPTY_PERMISSIONS = Object.fromEntries(Object.keys(PERMISSION_LABELS).map((k) => [k, false]));

const FILTER_FIELDS = [
  { key: "search", label: "Search" },
  { key: "role", label: "Role" },
  { key: "dateRange", label: "Created Date Range" },
  { key: "permission", label: "Permission" },
];

const FILTER_FIELDS_STORAGE_KEY = "superadmin_adminuserroles_filter_fields";

const UserFormModal = ({ isOpen, onClose, onSaved, editingUser, roles }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(editingUser?.name || "");
      setEmail(editingUser?.email || "");
      setRoleId(editingUser?.role?._id || "");
    }
  }, [isOpen, editingUser]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !roleId) {
      toast.warn("Name, email, and role are all required.");
      return;
    }
    setSaving(true);
    try {
      if (editingUser) {
        await superApi.put(`/admin-users/${editingUser._id}`, { name, email, roleId });
        toast.success("Super admin updated successfully.");
      } else {
        const res = await superApi.post("/admin-users", { name, email, roleId });
        toast.success(res.data?.message || "Super admin created. Credentials have been emailed.");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || "Failed to save super admin.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-slate-800 dark:text-slate-200">{editingUser ? "Edit Super Admin" : "Create Super Admin"}</h3>
          <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Jordan Lee"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Email</label>
            <input
              type="email"
              required
              placeholder="e.g. jordan@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Role</label>
            <select
              required
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all bg-white dark:bg-slate-900"
            >
              <option value="">Select a role</option>
              {roles.map((r) => (
                <option key={r._id} value={r._id}>{r.name}</option>
              ))}
            </select>
          </div>

          {!editingUser && (
            <div className="flex items-start space-x-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <MailCheck className="flex-shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" size={16} />
              <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                A secure password will be <strong>auto-generated</strong> and emailed to this address along with their login link. They never need to set one themselves.
              </p>
            </div>
          )}

          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-[#008ecc] text-white rounded-xl font-semibold hover:bg-[#007bb0] disabled:opacity-50 cursor-pointer text-sm shadow-md flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="animate-spin" size={16} />}
              {editingUser ? "Save Changes" : "Create & Send Credentials"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const RoleFormModal = ({ isOpen, onClose, onSaved, editingRole }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState(EMPTY_PERMISSIONS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(editingRole?.name || "");
      setDescription(editingRole?.description || "");
      setPermissions({ ...EMPTY_PERMISSIONS, ...(editingRole?.permissions || {}) });
    }
  }, [isOpen, editingRole]);

  if (!isOpen) return null;

  const togglePermission = (key) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warn("Role name is required.");
      return;
    }
    setSaving(true);
    try {
      if (editingRole) {
        await superApi.put(`/admin-roles/${editingRole._id}`, { name, description, permissions });
        toast.success("Role updated successfully.");
      } else {
        await superApi.post("/admin-roles", { name, description, permissions });
        toast.success("Role created successfully.");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || "Failed to save role.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full border border-slate-100 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-slate-800 dark:text-slate-200">{editingRole ? "Edit Role" : "Create Role"}</h3>
          <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Role Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Support Manager"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Description</label>
            <textarea
              rows={2}
              placeholder="Optional"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Permissions</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                <label
                  key={key}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium cursor-pointer transition-all ${
                    permissions[key]
                      ? "bg-[#f2fbff] dark:bg-blue-900/30 border-[#008ecc]/40 text-[#008ecc] dark:text-[#33b8ff]"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!!permissions[key]}
                    onChange={() => togglePermission(key)}
                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-700"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-[#008ecc] text-white rounded-xl font-semibold hover:bg-[#007bb0] disabled:opacity-50 cursor-pointer text-sm shadow-md flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="animate-spin" size={16} />}
              {editingRole ? "Save Changes" : "Create Role"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SuperAdminUserRoles = () => {
  const currentAdminId = useSelector((state) => state.auth.superAdmin?.id);
  const canManageAdmins = useSelector((state) => state.auth.superAdmin?.role?.permissions?.admin_users);

  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [permissionFilter, setPermissionFilter] = useState("all");

  const [activeFilterFields, setActiveFilterFields] = useState(() => {
    try {
      const saved = localStorage.getItem(FILTER_FIELDS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore malformed/inaccessible localStorage, fall back to default
    }
    return FILTER_FIELDS.map((f) => f.key);
  });
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const fieldPickerRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        superApi.get("/admin-users"),
        superApi.get("/admin-roles"),
      ]);
      setUsers(usersRes.data?.users || []);
      setRoles(rolesRes.data?.roles || []);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to load super admin users & roles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (!canManageAdmins) {
    return <Navigate to="/superadmin/dashboard" replace />;
  }

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Delete super admin "${user.name}"? This cannot be undone.`)) return;
    setBusyId(user._id);
    try {
      await superApi.delete(`/admin-users/${user._id}`);
      toast.success("Super admin deleted.");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete super admin.");
    } finally {
      setBusyId(null);
    }
  };

  const handleResetPassword = async (user) => {
    if (!window.confirm(`Reset password for "${user.name}"? A new password will be emailed to them.`)) return;
    setBusyId(user._id);
    try {
      const res = await superApi.post(`/admin-users/${user._id}/reset-password`);
      toast.success(res.data?.message || "Password reset. New credentials emailed.");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to reset password.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteRole = async (role) => {
    if (!window.confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;
    try {
      await superApi.delete(`/admin-roles/${role._id}`);
      toast.success("Role deleted successfully.");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete role.");
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem(FILTER_FIELDS_STORAGE_KEY, JSON.stringify(activeFilterFields));
    } catch {
      // ignore write failures (private browsing, storage disabled, etc.)
    }
  }, [activeFilterFields]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (fieldPickerRef.current && !fieldPickerRef.current.contains(e.target)) {
        setShowFieldPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const resetFieldValue = (key) => {
    if (key === "search") setSearchQuery("");
    if (key === "role") setRoleFilter("all");
    if (key === "dateRange") {
      setDateFrom("");
      setDateTo("");
    }
    if (key === "permission") setPermissionFilter("all");
  };

  const toggleFilterField = (key) => {
    setActiveFilterFields((prev) => {
      if (prev.includes(key)) {
        resetFieldValue(key);
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
  };

  const visibleFilterFields = FILTER_FIELDS.filter((field) => {
    if ((field.key === "role" || field.key === "dateRange") && activeTab !== "users") return false;
    if (field.key === "permission" && activeTab !== "roles") return false;
    return true;
  });

  const areAllFieldsSelected = visibleFilterFields.every((field) => activeFilterFields.includes(field.key));

  const handleSelectAllFields = () => {
    const visibleKeys = visibleFilterFields.map((f) => f.key);
    if (areAllFieldsSelected) {
      visibleFilterFields.forEach((field) => resetFieldValue(field.key));
      setActiveFilterFields((prev) => prev.filter((k) => !visibleKeys.includes(k)));
    } else {
      setActiveFilterFields((prev) => Array.from(new Set([...prev, ...visibleKeys])));
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setRoleFilter("all");
    setDateFrom("");
    setDateTo("");
    setPermissionFilter("all");
  };

  const hasActiveFilters =
    searchQuery !== "" ||
    roleFilter !== "all" ||
    dateFrom !== "" ||
    dateTo !== "" ||
    permissionFilter !== "all";

  const filteredUsers = users.filter((u) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !query || u.name?.toLowerCase().includes(query) || u.email?.toLowerCase().includes(query);

    const matchesRole = roleFilter === "all" || u.role?._id === roleFilter;

    let matchesDateRange = true;
    if (dateFrom || dateTo) {
      const created = u.createdAt ? new Date(u.createdAt) : null;
      if (!created) {
        matchesDateRange = false;
      } else {
        if (dateFrom && created < new Date(`${dateFrom}T00:00:00`)) matchesDateRange = false;
        if (dateTo && created > new Date(`${dateTo}T23:59:59.999`)) matchesDateRange = false;
      }
    }

    return matchesQuery && matchesRole && matchesDateRange;
  });

  const filteredRoles = roles.filter((r) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !query || r.name?.toLowerCase().includes(query) || r.description?.toLowerCase().includes(query);

    const matchesPermission = permissionFilter === "all" || !!r.permissions?.[permissionFilter];

    return matchesQuery && matchesPermission;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-slate-900 dark:text-white">Super Admin Users & Roles</h2>
          <p className="text-base text-slate-600 dark:text-slate-400">Manage who can access the Management Console and what they can do.</p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-150 p-1 rounded-xl border border-slate-200 dark:border-slate-700 self-start md:self-auto" style={{ backgroundColor: "#f1f5f9" }}>
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "users"
                ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-sm border border-slate-200 dark:border-slate-700/50"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200"
            }`}
          >
            <Users size={16} />
            <span>Users</span>
          </button>
          <button
            onClick={() => setActiveTab("roles")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "roles"
                ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-sm border border-slate-200 dark:border-slate-700/50"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200"
            }`}
          >
            <Shield size={16} />
            <span>Roles</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl">
        <div className="p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md font-medium text-sm transition-colors border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer"
            >
              <Filter className="w-4 h-4" />
              <span>{activeTab === "users" ? "User Filter" : "Role Filter"}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </button>

            <div className="relative" ref={fieldPickerRef}>
              <button
                onClick={() => setShowFieldPicker((v) => !v)}
                title="Choose which filters to show"
                className="flex items-center gap-2 px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md font-medium text-sm transition-colors border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Customize</span>
              </button>

              {showFieldPicker && (
                <div className="absolute left-0 z-20 mt-1 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                    Filters to show
                  </div>
                  <button
                    onClick={handleSelectAllFields}
                    className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold text-[#008ecc] hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-100 dark:border-slate-700"
                  >
                    <span>{areAllFieldsSelected ? "Deselect All" : "Select All"}</span>
                    <span
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        areAllFieldsSelected
                          ? "bg-[#008ecc] border-[#008ecc] text-white"
                          : "border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      {areAllFieldsSelected && <Check className="w-3 h-3" />}
                    </span>
                  </button>
                  {visibleFilterFields.map((field) => {
                    const isActive = activeFilterFields.includes(field.key);
                    return (
                      <button
                        key={field.key}
                        onClick={() => toggleFilterField(field.key)}
                        className="flex items-center justify-between w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                      >
                        <span>{field.label}</span>
                        <span
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isActive
                              ? "bg-[#008ecc] border-[#008ecc] text-white"
                              : "border-slate-300 dark:border-slate-600"
                          }`}
                        >
                          {isActive && <Check className="w-3 h-3" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-[#008ecc] hover:underline cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>

        {showFilters && (
          <div className="p-5 pt-0 animate-in fade-in slide-in-from-top-2 duration-200">
            {activeFilterFields.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No filters selected. Click <strong>Customize</strong> to add filters.
              </p>
            ) : (
              <div className="flex flex-col lg:flex-row lg:items-center gap-3 flex-wrap">
                {activeFilterFields.includes("search") && (
                  <div className="relative w-full lg:max-w-xs">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={activeTab === "users" ? "Search by name or email" : "Search by name or description"}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-9 pr-4 py-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#008ecc] focus:bg-white dark:bg-slate-900 transition-colors"
                    />
                  </div>
                )}

                {activeTab === "users" && activeFilterFields.includes("role") && (
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-4 py-2 text-sm text-slate-600 dark:text-slate-400 focus:outline-none focus:border-[#008ecc] cursor-pointer"
                  >
                    <option value="all">All Roles</option>
                    {roles.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                )}

                {activeTab === "users" && activeFilterFields.includes("dateRange") && (
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5">
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="text-sm text-slate-600 dark:text-slate-400 bg-transparent focus:outline-none cursor-pointer"
                    />
                    <span className="text-slate-300">–</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="text-sm text-slate-600 dark:text-slate-400 bg-transparent focus:outline-none cursor-pointer"
                    />
                  </div>
                )}

                {activeTab === "roles" && activeFilterFields.includes("permission") && (
                  <select
                    value={permissionFilter}
                    onChange={(e) => setPermissionFilter(e.target.value)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-4 py-2 text-sm text-slate-600 dark:text-slate-400 focus:outline-none focus:border-[#008ecc] cursor-pointer"
                  >
                    <option value="all">All Permissions</option>
                    {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {activeTab === "users" ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { setEditingUser(null); setUserModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#008ecc] text-white rounded-xl font-semibold hover:bg-[#007bb0] transition-all cursor-pointer text-sm shadow-md"
            >
              <Plus size={16} />
              Create Super Admin
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-600 dark:text-slate-400">
                <thead className="bg-slate-50/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Created</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">Loading super admins...</td></tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 font-semibold">{hasActiveFilters ? "No super admins matching your filters." : "No super admin accounts found."}</td></tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <UserCog size={16} className="text-[#008ecc] dark:text-[#33b8ff]" />
                          {user.name}
                          {user._id === currentAdminId && (
                            <span className="text-xs font-bold text-[#008ecc] dark:text-[#33b8ff] bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/50 rounded-full px-2 py-0.5">You</span>
                          )}
                        </td>
                        <td className="px-6 py-4">{user.email}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 uppercase">
                            {user.role?.name || "No Role"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                          {user.createdAt ? format(new Date(user.createdAt), "MMM dd, yyyy") : "—"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => handleResetPassword(user)}
                              disabled={busyId === user._id}
                              className="text-slate-400 dark:text-slate-500 hover:text-amber-600 transition-colors cursor-pointer disabled:opacity-40"
                              title="Reset password"
                            >
                              <KeyRound size={16} />
                            </button>
                            <button
                              onClick={() => { setEditingUser(user); setUserModalOpen(true); }}
                              className="text-slate-400 dark:text-slate-500 hover:text-[#008ecc] dark:text-[#33b8ff] transition-colors cursor-pointer"
                              title="Edit super admin"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user)}
                              disabled={busyId === user._id || user._id === currentAdminId}
                              className="text-slate-400 dark:text-slate-500 hover:text-red-600 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              title={user._id === currentAdminId ? "You cannot delete your own account" : "Delete super admin"}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { setEditingRole(null); setRoleModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#008ecc] text-white rounded-xl font-semibold hover:bg-[#007bb0] transition-all cursor-pointer text-sm shadow-md"
            >
              <Plus size={16} />
              Create Role
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-600 dark:text-slate-400">
                <thead className="bg-slate-50/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Role Name</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Permissions Enabled</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">Loading roles...</td></tr>
                  ) : filteredRoles.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 font-semibold">{hasActiveFilters ? "No roles matching your filters." : "No roles created yet."}</td></tr>
                  ) : (
                    filteredRoles.map((role) => {
                      const enabledCount = Object.values(role.permissions || {}).filter(Boolean).length;
                      return (
                        <tr key={role._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                          <td className="px-6 py-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <ShieldCheck size={16} className="text-[#008ecc] dark:text-[#33b8ff]" />
                            {role.name}
                          </td>
                          <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{role.description || "—"}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border bg-blue-50 dark:bg-blue-900/30 text-[#008ecc] dark:text-[#33b8ff] border-blue-100 dark:border-blue-800/50">
                              {enabledCount} / {Object.keys(PERMISSION_LABELS).length}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <button
                                onClick={() => { setEditingRole(role); setRoleModalOpen(true); }}
                                className="text-slate-400 dark:text-slate-500 hover:text-[#008ecc] dark:text-[#33b8ff] transition-colors cursor-pointer"
                                title="Edit role"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteRole(role)}
                                disabled={role.name.toLowerCase() === "owner"}
                                className="text-slate-400 dark:text-slate-500 hover:text-red-600 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-slate-400 dark:text-slate-500"
                                title={role.name.toLowerCase() === "owner" ? "The Owner role cannot be deleted" : "Delete role"}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <UserFormModal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        onSaved={fetchData}
        editingUser={editingUser}
        roles={roles}
      />
      <RoleFormModal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        onSaved={fetchData}
        editingRole={editingRole}
      />
    </div>
  );
};

export default SuperAdminUserRoles;
