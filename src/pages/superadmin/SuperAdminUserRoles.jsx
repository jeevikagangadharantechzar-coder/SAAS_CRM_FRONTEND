import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { superApi } from "../../services/api";
import { toast } from "react-toastify";
import { format } from "date-fns";
import {
  UserCog, ShieldCheck, Plus, Pencil, Trash2, X, Loader2, KeyRound, MailCheck, Users, Shield,
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-slate-800">{editingUser ? "Edit Super Admin" : "Create Super Admin"}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Jordan Lee"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Email</label>
            <input
              type="email"
              required
              placeholder="e.g. jordan@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Role</label>
            <select
              required
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all bg-white"
            >
              <option value="">Select a role</option>
              {roles.map((r) => (
                <option key={r._id} value={r._id}>{r.name}</option>
              ))}
            </select>
          </div>

          {!editingUser && (
            <div className="flex items-start space-x-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <MailCheck className="flex-shrink-0 mt-0.5 text-emerald-600" size={16} />
              <p className="text-xs text-emerald-800 leading-relaxed">
                A secure password will be <strong>auto-generated</strong> and emailed to this address along with their login link. They never need to set one themselves.
              </p>
            </div>
          )}

          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer text-sm"
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-slate-800">{editingRole ? "Edit Role" : "Create Role"}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Role Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Support Manager"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Description</label>
            <textarea
              rows={2}
              placeholder="Optional"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Permissions</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                <label
                  key={key}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium cursor-pointer transition-all ${
                    permissions[key]
                      ? "bg-[#f2fbff] border-[#008ecc]/40 text-[#008ecc]"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!!permissions[key]}
                    onChange={() => togglePermission(key)}
                    className="h-4 w-4 rounded border-slate-300"
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
              className="flex-1 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer text-sm"
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-slate-900">Super Admin Users & Roles</h2>
          <p className="text-base text-slate-600">Manage who can access the Management Console and what they can do.</p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-150 p-1 rounded-xl border border-slate-200 self-start md:self-auto" style={{ backgroundColor: "#f1f5f9" }}>
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "users"
                ? "bg-white text-slate-800 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users size={16} />
            <span>Users</span>
          </button>
          <button
            onClick={() => setActiveTab("roles")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "roles"
                ? "bg-white text-slate-800 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Shield size={16} />
            <span>Roles</span>
          </button>
        </div>
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

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-600">
                <thead className="bg-slate-50/70 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Created</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Loading super admins...</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-semibold">No super admin accounts found.</td></tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user._id} className="hover:bg-slate-50/50 transition">
                        <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2">
                          <UserCog size={16} className="text-[#008ecc]" />
                          {user.name}
                          {user._id === currentAdminId && (
                            <span className="text-xs font-bold text-[#008ecc] bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">You</span>
                          )}
                        </td>
                        <td className="px-6 py-4">{user.email}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border bg-slate-50 text-slate-700 border-slate-200 uppercase">
                            {user.role?.name || "No Role"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {user.createdAt ? format(new Date(user.createdAt), "MMM dd, yyyy") : "—"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => handleResetPassword(user)}
                              disabled={busyId === user._id}
                              className="text-slate-400 hover:text-amber-600 transition-colors cursor-pointer disabled:opacity-40"
                              title="Reset password"
                            >
                              <KeyRound size={16} />
                            </button>
                            <button
                              onClick={() => { setEditingUser(user); setUserModalOpen(true); }}
                              className="text-slate-400 hover:text-[#008ecc] transition-colors cursor-pointer"
                              title="Edit super admin"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user)}
                              disabled={busyId === user._id || user._id === currentAdminId}
                              className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
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

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-600">
                <thead className="bg-slate-50/70 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Role Name</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Permissions Enabled</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">Loading roles...</td></tr>
                  ) : roles.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-semibold">No roles created yet.</td></tr>
                  ) : (
                    roles.map((role) => {
                      const enabledCount = Object.values(role.permissions || {}).filter(Boolean).length;
                      return (
                        <tr key={role._id} className="hover:bg-slate-50/50 transition">
                          <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2">
                            <ShieldCheck size={16} className="text-[#008ecc]" />
                            {role.name}
                          </td>
                          <td className="px-6 py-4 text-slate-500">{role.description || "—"}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border bg-blue-50 text-[#008ecc] border-blue-100">
                              {enabledCount} / {Object.keys(PERMISSION_LABELS).length}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <button
                                onClick={() => { setEditingRole(role); setRoleModalOpen(true); }}
                                className="text-slate-400 hover:text-[#008ecc] transition-colors cursor-pointer"
                                title="Edit role"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteRole(role)}
                                disabled={role.name.toLowerCase() === "owner"}
                                className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-slate-400"
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
