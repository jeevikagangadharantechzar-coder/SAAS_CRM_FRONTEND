import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setCredentials } from "../../store/authSlice";
import {
  Building2,
  Plus,
  Search,
  Trash2,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Mail,
  User,
  ExternalLink,
  X,
} from "lucide-react";
import { superApi } from "../../services/api";

const SuperAdminTenants = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [tenants, setTenants] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Delete Confirmation modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const fetchTenants = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await superApi.get("/tenants");
      if (res.data && Array.isArray(res.data.tenants)) {
        setTenants(res.data.tenants);
      } else if (res.data && Array.isArray(res.data.data)) {
        setTenants(res.data.data);
      } else if (res.data && Array.isArray(res.data)) {
        setTenants(res.data);
      } else {
        setTenants([]);
      }
    } catch (err) {
      console.error("Failed to fetch tenants:", err);
      setError("Failed to fetch tenants from database. Please check your connection and try again.");
      setTenants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleImpersonate = async (tenant) => {
    try {
      const res = await superApi.post(`/tenants/${tenant._id}/impersonate`);
      const { token, slug, user } = res.data;
      if (token) {
        dispatch(
          setCredentials({
            token,
            slug,
            user,
          })
        );
        // Open the tenant dashboard in a new tab
        window.open(`/${slug}/dashboard`, "_blank");
      }
    } catch (err) {
      console.error("Failed to impersonate tenant:", err);
      alert(err.response?.data?.message || err.response?.data?.error || "Failed to log in to tenant dashboard");
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      // Optimistic UI toggle
      setTenants((prev) =>
        prev.map((t) => (t._id === id ? { ...t, isActive: !currentStatus } : t))
      );

      await superApi.patch(`/tenants/${id}/toggle`);
    } catch (err) {
      console.error("Failed to toggle tenant activation status:", err);
      // Revert UI toggle on error
      setTenants((prev) =>
        prev.map((t) => (t._id === id ? { ...t, isActive: currentStatus } : t))
      );
      alert("Failed to change tenant state");
    }
  };

  const handleDeleteTenant = async () => {
    if (!deleteTarget) return;
    if (deleteConfirmText.toLowerCase() !== "delete") {
      alert("Please type 'delete' to confirm.");
      return;
    }

    try {
      await superApi.delete(`/tenants/${deleteTarget._id}`);
      setDeleteTarget(null);
      setDeleteConfirmText("");
      fetchTenants();
    } catch (err) {
      console.error("Failed to delete tenant:", err);
      alert("Failed to delete tenant");
    }
  };

  const filteredTenants = tenants.filter((t) => {
    const query = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(query) ||
      t.slug.toLowerCase().includes(query) ||
      t.adminEmail.toLowerCase().includes(query) ||
      t.adminName.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Tenant Organizations</h2>
          <p className="text-slate-500 text-sm">Provision, inspect, and configure multi-tenant databases.</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchTenants}
            className="p-2 border border-slate-200 rounded-xl bg-white hover:border-[#008ecc]/40 hover:text-[#008ecc] text-slate-600 transition-all cursor-pointer shadow-sm"
            title="Refresh database"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => navigate("/superadmin/tenants/create")}
            className="flex items-center space-x-2 px-4 py-2 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-md cursor-pointer text-sm"
            style={{ backgroundColor: "#008ecc" }}
          >
            <Plus size={18} />
            <span>Create Tenant</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-sm">
          <span>{error}</span>
        </div>
      )}

      {/* Control panel and Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Search Toolbar */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by company name, slug, or admin details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] focus:border-transparent bg-white shadow-inner"
            />
          </div>
        </div>

        {/* Tenant Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/50 text-slate-600 uppercase text-xs font-bold border-b border-slate-200">
                <th className="px-6 py-4">Company Name</th>
                <th className="px-6 py-4">Slug</th>
                <th className="px-6 py-4">Current Plan</th>
                <th className="px-6 py-4">Administrator</th>
                <th className="px-6 py-4">Created Date</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="animate-spin text-[#008ecc]" size={32} />
                      <span className="font-medium">Querying platform databases...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTenants.length > 0 ? (
                filteredTenants.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-50/50 transition-colors">
                    <td
                      className="px-6 py-4 font-bold text-slate-900 cursor-pointer hover:text-[#008ecc] hover:underline"
                      onClick={() => navigate(`/superadmin/tenants/${t._id}`)}
                    >
                      {t.name}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-[#008ecc] bg-[#f2fbff] rounded px-2.5 py-1 inline-block my-3 ml-6 border border-blue-100 font-semibold">
                      {t.slug}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {t.plan_id?.plan_name || "Trial / Custom"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800">{t.adminName}</span>
                        <span className="text-xs text-slate-500">{t.adminEmail}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {t.createdAt ? format(new Date(t.createdAt), "MMM dd, yyyy") : "N/A"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                          t.isActive
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-gray-50 text-gray-500 border-gray-200"
                        }`}
                      >
                        {t.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-3">
                        {/* Toggle active button */}
                        <button
                          onClick={() => handleToggleActive(t._id, t.isActive)}
                          className="text-slate-500 hover:text-[#008ecc] transition-colors cursor-pointer"
                          title={t.isActive ? "Deactivate Tenant" : "Activate Tenant"}
                        >
                          {t.isActive ? (
                            <ToggleRight size={28} className="text-[#008ecc]" />
                          ) : (
                            <ToggleLeft size={28} className="text-slate-400" />
                          )}
                        </button>
                        {/* Launch portal button */}
                        <button
                          onClick={() => handleImpersonate(t)}
                          className="p-1.5 border border-slate-200 rounded-lg hover:border-[#008ecc]/40 hover:text-[#008ecc] transition-all cursor-pointer flex items-center justify-center"
                          title="Open tenant portal directly"
                        >
                          <ExternalLink size={15} />
                        </button>
                        {/* Delete button */}
                        <button
                          onClick={() => setDeleteTarget(t)}
                          className="p-1.5 border border-red-100 rounded-lg hover:bg-red-50 text-red-500 transition-all cursor-pointer"
                          title="Delete Tenant"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No tenants found matching your query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DANGER: DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-red-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 bg-red-600 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle size={22} className="animate-bounce" />
                <h3 className="text-lg font-bold">Critical Action: Delete Tenant</h3>
              </div>
              <button
                onClick={() => setDeleteTarget(null)}
                className="text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-red-800">
                <AlertTriangle size={24} className="flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Destructive Action Warning</h4>
                  <p className="text-xs mt-1 leading-relaxed">
                    Deleting the tenant <strong>{deleteTarget.name}</strong> is permanent. This wipes all CRM leads, deals, proposals, invoices, settings, and documents under slug <strong>{deleteTarget.slug}</strong>. There is no undo.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Type <span className="font-bold text-red-600">"delete"</span> below to authorize:
                </label>
                <input
                  type="text"
                  placeholder="delete"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 font-mono text-center"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteTenant}
                  disabled={deleteConfirmText.toLowerCase() !== "delete"}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 cursor-pointer text-sm shadow-md"
                >
                  Wipe Database
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminTenants;
