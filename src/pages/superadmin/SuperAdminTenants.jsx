import React, { useEffect, useRef, useState } from "react";
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
  Edit,
  ChevronLeft,
  ChevronRight,
  Filter,
  ChevronDown,
  SlidersHorizontal,
  Check,
} from "lucide-react";
import { superApi } from "../../services/api";

const FILTER_FIELDS = [
  { key: "search", label: "Search" },
  { key: "plan", label: "Current Plan" },
  { key: "planStatus", label: "Plan Status" },
  { key: "accountStatus", label: "Account Status" },
  { key: "dateRange", label: "Created Date Range" },
];

const FILTER_FIELDS_STORAGE_KEY = "superadmin_tenant_filter_fields";

const SuperAdminTenants = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [tenants, setTenants] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [accountStatusFilter, setAccountStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Which filter fields the admin has chosen to show in the Tenant Filter panel
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

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Delete Confirmation modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Edit Tenant modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", adminName: "", adminEmail: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [toggleTarget,setToggleTarget] = useState(null);

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

  const handleEditClick = (tenant) => {
    setEditingTenant(tenant);
    setEditForm({
      name: tenant.name || "",
      adminName: tenant.adminName || "",
      adminEmail: tenant.adminEmail || "",
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.adminName.trim() || !editForm.adminEmail.trim()) {
      alert("Please fill in all required fields.");
      return;
    }

    setIsEditing(true);
    try {
      const res = await superApi.put(`/tenants/${editingTenant._id}`, editForm);
      if (res.data?.success) {
        setIsEditModalOpen(false);
        setEditingTenant(null);
        fetchTenants();
      } else {
        alert(res.data?.error || "Failed to update tenant details.");
      }
    } catch (err) {
      console.error("Failed to update tenant:", err);
      alert(err.response?.data?.error || "Failed to update tenant details.");
    } finally {
      setIsEditing(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, planFilter, statusFilter, accountStatusFilter, dateFrom, dateTo]);

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
    if (key === "plan") setPlanFilter("all");
    if (key === "planStatus") setStatusFilter("all");
    if (key === "accountStatus") setAccountStatusFilter("all");
    if (key === "dateRange") {
      setDateFrom("");
      setDateTo("");
    }
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

  const areAllFieldsSelected = FILTER_FIELDS.every((field) => activeFilterFields.includes(field.key));

  const handleSelectAllFields = () => {
    if (areAllFieldsSelected) {
      FILTER_FIELDS.forEach((field) => resetFieldValue(field.key));
      setActiveFilterFields([]);
    } else {
      setActiveFilterFields(FILTER_FIELDS.map((f) => f.key));
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setPlanFilter("all");
    setStatusFilter("all");
    setAccountStatusFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters =
    searchQuery !== "" ||
    planFilter !== "all" ||
    statusFilter !== "all" ||
    accountStatusFilter !== "all" ||
    dateFrom !== "" ||
    dateTo !== "";



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

  const planOptions = Array.from(
    new Set(tenants.map((t) => t.plan_id?.plan_name).filter(Boolean))
  ).sort();

  const statusOptions = Array.from(
    new Set(tenants.map((t) => t.plan_status).filter(Boolean))
  ).sort();

  const filteredTenants = tenants.filter((t) => {
    const query = searchQuery.toLowerCase();
    const matchesQuery =
      t.name.toLowerCase().includes(query) ||
      t.slug.toLowerCase().includes(query) ||
      t.adminEmail.toLowerCase().includes(query) ||
      t.adminName.toLowerCase().includes(query);

    const matchesPlan = planFilter === "all" || t.plan_id?.plan_name === planFilter;
    const matchesStatus = statusFilter === "all" || t.plan_status === statusFilter;

    const matchesAccountStatus =
      accountStatusFilter === "all" ||
      (accountStatusFilter === "active" ? !!t.isActive : !t.isActive);

    let matchesDateRange = true;
    if (dateFrom || dateTo) {
      const created = t.createdAt ? new Date(t.createdAt) : null;
      if (!created) {
        matchesDateRange = false;
      } else {
        if (dateFrom && created < new Date(`${dateFrom}T00:00:00`)) matchesDateRange = false;
        if (dateTo && created > new Date(`${dateTo}T23:59:59.999`)) matchesDateRange = false;
      }
    }

    return matchesQuery && matchesPlan && matchesStatus && matchesAccountStatus && matchesDateRange;
  });

  const totalPages = Math.ceil(filteredTenants.length / limit) || 1;
  const paginatedTenants = filteredTenants.slice((page - 1) * limit, page * limit);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-slate-900 dark:text-white">Tenant Businesses</h2>
          <p className="text-base text-slate-600 dark:text-slate-400">Provision, inspect, and configure multi-tenant databases.</p>
        </div>

        <div className="flex items-center space-x-3">
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
        <div className="p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-xl text-sm">
          <span>{error}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        {/* Filter Toggle Bar */}
        <div className="p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md font-medium text-sm transition-colors border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer"
            >
              <Filter className="w-4 h-4" />
              <span>Tenant Filter</span>
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
                  {FILTER_FIELDS.map((field) => {
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

        {/* Collapsible Filters */}
        {showFilters && (
          <div className="p-5 pt-0 animate-in fade-in slide-in-from-top-2 duration-200">
            {activeFilterFields.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No filters selected. Click <strong>Customize</strong> to add filters.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeFilterFields.includes("search") && (
                  <div className="relative w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="Search by company name, slug, or admin details..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] focus:border-transparent bg-white dark:bg-slate-800 dark:text-white shadow-inner"
                    />
                  </div>
                )}

                {activeFilterFields.includes("plan") && (
                  <select
                    value={planFilter}
                    onChange={(e) => setPlanFilter(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] focus:border-transparent bg-white dark:bg-slate-800 dark:text-white shadow-inner cursor-pointer"
                  >
                    <option value="all">All Plans</option>
                    {planOptions.map((plan) => (
                      <option key={plan} value={plan}>
                        {plan}
                      </option>
                    ))}
                  </select>
                )}

                {activeFilterFields.includes("planStatus") && (
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] focus:border-transparent bg-white dark:bg-slate-800 dark:text-white shadow-inner cursor-pointer"
                  >
                    <option value="all">All Plan Statuses</option>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                )}

                {activeFilterFields.includes("accountStatus") && (
                  <select
                    value={accountStatusFilter}
                    onChange={(e) => setAccountStatusFilter(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] focus:border-transparent bg-white dark:bg-slate-800 dark:text-white shadow-inner cursor-pointer"
                  >
                    <option value="all">All Account Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                )}

                {activeFilterFields.includes("dateRange") && (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] focus:border-transparent bg-white dark:bg-slate-800 dark:text-white shadow-inner"
                    />
                    <span className="text-slate-400 dark:text-slate-500 text-sm">to</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] focus:border-transparent bg-white dark:bg-slate-800 dark:text-white shadow-inner"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase text-xs font-bold border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4">Company Name</th>
                <th className="px-6 py-4">Slug</th>
                <th className="px-6 py-4">Current Plan</th>
                <th className="px-6 py-4 text-center">Plan Status</th>
                <th className="px-6 py-4">Administrator</th>
                <th className="px-6 py-4">Created Date</th>
                <th className="px-6 py-4 text-center">Account Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 text-sm ${loading && tenants.length > 0 ? "opacity-50 pointer-events-none" : ""}`}>
              {loading && tenants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="animate-spin text-[#008ecc]" size={32} />
                      <span className="font-medium">Querying platform databases...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedTenants.length > 0 ? (
                paginatedTenants.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td
                      className="px-6 py-4 font-bold text-slate-900 dark:text-white cursor-pointer hover:text-[#008ecc] hover:underline"
                      onClick={() => navigate(`/superadmin/tenants/${t._id}`)}
                    >
                      {t.name}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-[#008ecc] dark:text-[#33b8ff] bg-[#f2fbff] dark:bg-[#008ecc]/10 rounded px-2.5 py-1 inline-block my-3 ml-6 border border-blue-100 dark:border-[#008ecc]/30 font-semibold">
                      {t.slug}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">
                      {t.plan_id?.plan_name || "Trial / Custom"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                          t.plan_status === "active"
                            ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
                            : t.plan_status === "trial"
                            ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                            : t.plan_status === "expired"
                            ? "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800"
                            : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700"
                        }`}
                      >
                        {t.plan_status ? t.plan_status.charAt(0).toUpperCase() + t.plan_status.slice(1) : "Unknown"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{t.adminName}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{t.adminEmail}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                      {t.createdAt ? format(new Date(t.createdAt), "MMM dd, yyyy") : "N/A"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                          t.isActive
                            ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
                            : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700"
                        }`}
                      >
                        {t.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-3">
                        {/* Toggle active button */}
                          <button
    onClick={() => setToggleTarget(t)}
    className="text-slate-500 hover:text-[#008ecc] transition-colors cursor-pointer"

                          title={t.isActive ? "Deactivate Tenant" : "Activate Tenant"}
                        >
                          {t.isActive ? (
                            <ToggleRight size={28} className="text-[#008ecc]" />
                          ) : (
                            <ToggleLeft size={28} className="text-slate-400" />
                          )}
                        </button>

                        {/* Edit button */}
                        <button
                          onClick={() => handleEditClick(t)}
                          className="p-1.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-[#008ecc]/40 hover:text-[#008ecc] transition-all cursor-pointer flex items-center justify-center"
                          title="Edit Tenant Details"
                        >
                          <Edit size={15} />
                        </button>
                        {/* Delete button */}
                        <button
                          onClick={() => setDeleteTarget(t)}
                          className="p-1.5 border border-red-100 dark:border-red-900/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-all cursor-pointer"
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
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    No tenants found matching your query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {filteredTenants.length > 0 && (
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                Showing <span className="text-slate-700 dark:text-slate-200">{(page - 1) * limit + 1}</span>–<span className="text-slate-700 dark:text-slate-200">{Math.min(page * limit, filteredTenants.length)}</span> of <span className="text-slate-700 dark:text-slate-200">{filteredTenants.length}</span> records
              </span>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>Rows per page:</span>
                <select 
                  value={limit}
                  onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008ecc]/50 cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 hover:border-[#008ecc]/40 hover:text-[#008ecc] text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-sm"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-1.5 rounded-xl shadow-sm">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 hover:border-[#008ecc]/40 hover:text-[#008ecc] text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-sm"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DANGER: DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full border border-red-100 dark:border-red-900 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 bg-red-600 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle size={22} className="animate-bounce" />
                <h3 className="">Critical Action: Delete Tenant</h3>
              </div>
              <button
                onClick={() => setDeleteTarget(null)}
                className="text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl flex items-start space-x-3 text-red-800 dark:text-red-300">
                <AlertTriangle size={24} className="flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="">Destructive Action Warning</h3>
                  <p className="text-base text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    Deleting the tenant <strong>{deleteTarget.name}</strong> is permanent. This wipes all CRM leads, deals, proposals, invoices, settings, and documents under slug <strong>{deleteTarget.slug}</strong>. There is no undo.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Type <span className="font-bold text-red-600">"delete"</span> below to authorize:
                </label>
                <input
                  type="text"
                  placeholder="delete"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 font-mono text-center"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer text-sm"
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

      {/* EDIT TENANT DETAILS MODAL */}
      {isEditModalOpen && editingTenant && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-100">
                <Building2 size={20} className="text-[#008ecc]" />
                <h3 className="">Edit Tenant Details</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] focus:border-transparent bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-inner"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Administrator Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={editForm.adminName}
                  onChange={(e) => setEditForm({ ...editForm, adminName: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] focus:border-transparent bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-inner"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Administrator Email <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="email"
                  value={editForm.adminEmail}
                  onChange={(e) => setEditForm({ ...editForm, adminEmail: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] focus:border-transparent bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-inner"
                />
              </div>

              <div className="p-3.5 bg-blue-50/50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-xl text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                Updating the company and administrator information here will automatically update the master record and synchronize it with the tenant's primary database user.
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isEditing}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditing}
                  className="flex-1 py-2.5 bg-[#008ecc] text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 cursor-pointer text-sm shadow-md"
                >
                  {isEditing ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      

      {/* Toggle Status Confirmation Modal */}
      {toggleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-transparent dark:border-slate-700 w-full max-w-md p-6 animate-in zoom-in-95">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {toggleTarget.isActive ? "Deactivate" : "Activate"} Tenant?
            </h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm">
              Are you sure you want to {toggleTarget.isActive ? "deactivate" : "activate"} the account for <strong>{toggleTarget.name}</strong>? 
              {toggleTarget.isActive && " They will immediately lose access to the CRM."}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setToggleTarget(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleToggleActive(toggleTarget._id, toggleTarget.isActive);
                  setToggleTarget(null);
                }}
                className={`px-4 py-2 font-bold rounded-lg text-white transition-colors cursor-pointer ${
                  toggleTarget.isActive ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
                }`}
              >
                Yes, {toggleTarget.isActive ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminTenants;
