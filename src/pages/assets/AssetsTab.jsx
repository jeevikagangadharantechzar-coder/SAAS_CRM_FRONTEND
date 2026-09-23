import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import { toast } from "react-toastify";
import { Plus, Pencil, Trash2, X, Loader2, Package, IndianRupee, StickyNote, PlusCircle } from "lucide-react";

const STATUS_LIST = ["In stock", "Assigned", "In use", "Under maintenance", "Retired"];
const STATUS_STYLE = {
  "In stock": "bg-slate-100 text-slate-600 border-slate-200",
  "Assigned": "bg-amber-50 text-amber-700 border-amber-200",
  "In use": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Under maintenance": "bg-red-50 text-red-700 border-red-200",
  "Retired": "bg-slate-50 text-slate-400 border-slate-200",
};

const AssetFormModal = ({ isOpen, onClose, onSaved, editingAsset, categories, assignableUsers, defaultCategoryId }) => {
  // A non-admin creating a brand-new asset can only ever assign it to
  // themselves (the backend enforces this too) — no dropdown needed there,
  // just show who it'll belong to. Editing an asset they already own still
  // lets them hand it off to someone else via the normal dropdown below.
  const currentUser = (() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return { id: u?._id, name: `${u?.firstName || ""} ${u?.lastName || ""}`.trim(), isAdmin: u?.role?.name?.toLowerCase() === "admin" };
    } catch {
      return { id: null, name: "", isAdmin: false };
    }
  })();
  const lockAssigneeToSelf = !currentUser.isAdmin && !editingAsset;

  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [fieldValues, setFieldValues] = useState({});
  const [assignedTo, setAssignedTo] = useState("");
  const [status, setStatus] = useState("In stock");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  // One-off extra fields for this single asset only — separate from the
  // category's shared fieldValues above. Same shape/purpose as Invoice's
  // Custom Fields.
  const [customFields, setCustomFields] = useState([]);
  const [saving, setSaving] = useState(false);

  const selectedCategory = categories.find((c) => c._id === categoryId);

  useEffect(() => {
    if (!isOpen) return;
    if (editingAsset) {
      setCategoryId(editingAsset.category?._id || "");
      setName(editingAsset.name || "");
      setFieldValues(editingAsset.fieldValues || {});
      setAssignedTo(editingAsset.assignedTo?._id || "");
      setStatus(editingAsset.status || "In stock");
      setValue(editingAsset.value ?? "");
      setNotes(editingAsset.notes || "");
      setCustomFields((editingAsset.customFields || []).map((f) => ({ ...f })));
    } else {
      setCategoryId(defaultCategoryId || categories[0]?._id || "");
      setName("");
      setFieldValues({});
      setAssignedTo(lockAssigneeToSelf ? currentUser.id || "" : "");
      setStatus("In stock");
      setValue("");
      setNotes("");
      setCustomFields([]);
    }
  }, [isOpen, editingAsset, defaultCategoryId, categories, lockAssigneeToSelf, currentUser.id]);

  if (!isOpen) return null;

  const handleFieldValueChange = (fieldId, val) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: val }));
  };

  const handleAddCustomField = () => {
    setCustomFields((prev) => [...prev, { label: "", type: "text", value: "" }]);
  };
  const handleCustomFieldChange = (index, key, val) => {
    setCustomFields((prev) => prev.map((f, i) => (i === index ? { ...f, [key]: val } : f)));
  };
  const handleRemoveCustomField = (index) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!categoryId) { toast.warn("Please select a category."); return; }
    if (!name.trim()) { toast.warn("Asset name is required."); return; }
    if (customFields.some((f) => !f.label.trim())) { toast.warn("Every custom field needs a name."); return; }

    const payload = {
      category: categoryId,
      name,
      status,
      assignedTo: assignedTo || null,
      value: value === "" ? null : Number(value),
      notes,
      fieldValues,
      customFields: customFields.filter((f) => f.label.trim()),
    };

    setSaving(true);
    try {
      if (editingAsset) {
        await api.put(`/assets/${editingAsset._id}`, payload);
        toast.success("Asset updated successfully.");
      } else {
        await api.post("/assets", payload);
        toast.success("Asset created successfully.");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save asset.");
    } finally {
      setSaving(false);
    }
  };

  const renderDynamicField = (f) => {
    const val = fieldValues[f._id] ?? "";
    if (f.type === "Dropdown") {
      return (
        <select
          value={val}
          onChange={(e) => handleFieldValueChange(f._id, e.target.value)}
          className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition bg-white"
        >
          <option value="">Select {f.label}</option>
          {(f.options || []).map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      );
    }
    if (f.type === "Date") {
      return (
        <input
          type="date"
          value={val}
          onChange={(e) => handleFieldValueChange(f._id, e.target.value)}
          className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition"
        />
      );
    }
    if (f.type === "Number" || f.type === "Currency") {
      return (
        <input
          type="number"
          value={val}
          onChange={(e) => handleFieldValueChange(f._id, e.target.value)}
          className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition"
        />
      );
    }
    return (
      <input
        type="text"
        value={val}
        onChange={(e) => handleFieldValueChange(f._id, e.target.value)}
        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition"
      />
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-slate-800">{editingAsset ? "Edit Asset" : "Add New Asset"}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Asset Category</label>
            <select
              required
              value={categoryId}
              onChange={(e) => { setCategoryId(e.target.value); setFieldValues({}); }}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all bg-white"
            >
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Asset Name / Identifier</label>
            <input
              type="text"
              required
              placeholder="e.g. MacBook Pro #4521"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all"
            />
          </div>

          {selectedCategory?.fields?.map((f) => (
            <div key={f._id}>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{f.label}</label>
              {renderDynamicField(f)}
            </div>
          ))}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Assigned To</label>
              {lockAssigneeToSelf ? (
                <div className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-700">
                  {currentUser.name || "You"} <span className="text-xs text-slate-400">(you)</span>
                </div>
              ) : (
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all bg-white"
                >
                  <option value="">Unassigned</option>
                  {assignableUsers.map((u) => (
                    <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all bg-white"
              >
                {STATUS_LIST.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Estimated Value</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 1200"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Notes</label>
            <textarea
              rows={2}
              placeholder="Optional"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all resize-none"
            />
          </div>

          {/* Custom Fields — one-off extras for this asset, separate from the
              category's shared field layout. Same pattern as Invoice's Custom Fields. */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Custom Fields</label>
              <button
                type="button"
                onClick={handleAddCustomField}
                className="flex items-center gap-1 text-xs font-semibold text-[#008ecc] hover:text-[#007bb0] transition cursor-pointer"
              >
                <PlusCircle size={14} />
                Add Field
              </button>
            </div>

            {customFields.length === 0 ? (
              <p className="text-xs text-slate-400">No custom fields added.</p>
            ) : (
              <div className="space-y-2">
                {customFields.map((field, index) => (
                  <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => handleCustomFieldChange(index, "label", e.target.value)}
                      placeholder="Field name"
                      className="w-full sm:w-1/3 p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition"
                    />
                    <select
                      value={field.type}
                      onChange={(e) => handleCustomFieldChange(index, "type", e.target.value)}
                      className="w-full sm:w-28 p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition bg-white"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                    </select>
                    <input
                      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                      value={field.value}
                      onChange={(e) => handleCustomFieldChange(index, "value", e.target.value)}
                      placeholder="Value"
                      className="w-full sm:flex-1 p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomField(index)}
                      className="p-2.5 text-red-500 hover:text-red-700 transition cursor-pointer flex-shrink-0"
                      title="Remove field"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
              {editingAsset ? "Save Changes" : "Create Asset"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Read-only view opened by clicking a row — shows every field (core + this
// asset's category-specific ones) with nothing editable. The Edit button is
// the only way into AssetFormModal from here.
const AssetViewModal = ({ asset, onClose, onEdit }) => {
  if (!asset) return null;
  const category = asset.category;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
          <span
            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ backgroundColor: `${category?.color || "#6B7280"}22`, color: category?.color || "#6B7280" }}
          >
            {category?.icon || <Package size={18} />}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-slate-800 truncate">{asset.name}</h3>
            <p className="text-xs text-slate-400">{category?.name || "—"}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Assigned To</span>
              <span className="text-sm text-slate-800">
                {asset.assignedTo ? `${asset.assignedTo.firstName} ${asset.assignedTo.lastName}` : "Unassigned"}
              </span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Status</span>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${STATUS_STYLE[asset.status] || STATUS_STYLE["In stock"]}`}>
                {asset.status}
              </span>
            </div>
          </div>

          {category?.fields?.length > 0 && (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              {category.fields.map((f) => (
                <div key={f._id}>
                  <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{f.label}</span>
                  <span className="text-sm text-slate-800">{asset.fieldValues?.[f._id] || "—"}</span>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 border-t border-slate-100">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              <IndianRupee size={12} /> Estimated Value
            </span>
            <span className="text-sm text-slate-800">
              {asset.value !== null && asset.value !== undefined ? asset.value.toLocaleString() : "—"}
            </span>
          </div>

          <div>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              <StickyNote size={12} /> Notes
            </span>
            <span className="text-sm text-slate-800 whitespace-pre-wrap">{asset.notes || "—"}</span>
          </div>

          {asset.customFields?.length > 0 && (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              {asset.customFields.map((f, i) => (
                <div key={i}>
                  <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{f.label}</span>
                  <span className="text-sm text-slate-800">{f.value || "—"}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#008ecc] text-white rounded-xl font-semibold hover:bg-[#007bb0] transition-all cursor-pointer text-sm shadow-md"
          >
            <Pencil size={14} />
            Edit
          </button>
        </div>
      </div>
    </div>
  );
};

const AssetsTab = ({ categories, setCategories, categoriesLoaded, setCategoriesLoaded }) => {
  // The backend always forces non-admins to "only my own assets" and ignores
  // whatever assignedTo filter they send — showing them a working-looking
  // "Assigned To" dropdown would be misleading, since picking anyone never
  // actually changes their results.
  const isAdmin = (() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return user?.role?.name?.toLowerCase() === "admin";
    } catch {
      return false;
    }
  })();

  const [assets, setAssets] = useState([]);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [viewingAsset, setViewingAsset] = useState(null);

  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterAssignee, setFilterAssignee] = useState("All");
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAssets, setTotalAssets] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const PAGE_SIZE_OPTIONS = [10, 15, 25, 50];

  const fetchCategories = async () => {
    try {
      const res = await api.get("/assets/categories");
      setCategories(res.data?.categories || []);
      setCategoriesLoaded(true);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to load categories.");
    }
  };

  const fetchAssignableUsers = async () => {
    try {
      // /users (not /users/sales) — the shared "assign to" lookup already used
      // by Leads/Deals/Reports/etc. across this CRM, returns every role so an
      // asset can be assigned to an Admin too, not only Sales.
      const res = await api.get("/users");
      setAssignableUsers(res.data?.users || []);
    } catch {
      // non-blocking — assignee dropdown just stays empty
    }
  };

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await api.get("/assets", {
        params: {
          category: filterCategory,
          status: filterStatus,
          assignedTo: filterAssignee,
          search: search.trim() || undefined,
          page,
          limit: pageSize,
        },
      });
      setAssets(res.data?.assets || []);
      setTotalPages(res.data?.totalPages || 1);
      setTotalAssets(res.data?.totalAssets || 0);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to load assets.");
    } finally {
      setLoading(false);
    }
  };

  // Zero-delay timer + cleanup, same StrictMode-safe trick as the effect
  // below — without it, this fires its fetches twice in dev (StrictMode has
  // no cleanup to cancel against on a plain synchronous effect).
  useEffect(() => {
    const t = setTimeout(() => {
      if (!categoriesLoaded) fetchCategories();
      fetchAssignableUsers();
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Any filter/search/page-size change means the current page number no
  // longer makes sense against the new result set — always jump back to
  // page 1. Calling setPage(1) when it's already 1 is a no-op (no re-render),
  // so this is harmless on mount and on every change that starts from page 1.
  useEffect(() => {
    setPage(1);
  }, [filterCategory, filterStatus, filterAssignee, search, pageSize]);

  // The actual fetch — depends on the filters AND page, debounced together.
  // When a filter change above also changes `page` (e.g. 3 -> 1), this effect
  // re-runs a second time with the corrected page and its cleanup cancels the
  // first (stale-page) timer, so only one real request goes out either way —
  // same StrictMode-safe cleanup pattern as the effect above it.
  useEffect(() => {
    const t = setTimeout(fetchAssets, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCategory, filterStatus, filterAssignee, search, page, pageSize]);

  const handleDelete = async (asset) => {
    if (!window.confirm(`Delete asset "${asset.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/assets/${asset._id}`);
      toast.success("Asset deleted successfully.");
      fetchAssets();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete asset.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="p-2.5 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition bg-white"
          >
            <option value="All">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>{c.icon} {c.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="p-2.5 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition bg-white"
          >
            <option value="All">All Statuses</option>
            {STATUS_LIST.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {isAdmin && (
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="p-2.5 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition bg-white"
            >
              <option value="All">All Assignees</option>
              <option value="Unassigned">Unassigned</option>
              {assignableUsers.map((u) => (
                <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
              ))}
            </select>
          )}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assets…"
            className="p-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition w-44"
          />
        </div>

        <button
          onClick={() => { setEditingAsset(null); setModalOpen(true); }}
          disabled={categories.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#008ecc] text-white rounded-xl font-semibold hover:bg-[#007bb0] transition-all cursor-pointer text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          title={categories.length === 0 ? "Create a category first" : "Add a new asset"}
        >
          <Plus size={16} />
          New Asset
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="bg-slate-50/70 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Asset</th>
                <th className="px-6 py-4">Assigned To</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Value</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Loading assets...</td></tr>
              ) : assets.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-semibold">No assets match this view.</td></tr>
              ) : (
                assets.map((a) => (
                  <tr
                    key={a._id}
                    onClick={() => setViewingAsset(a)}
                    className="hover:bg-slate-50/50 transition cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                          style={{ backgroundColor: `${a.category?.color || "#6B7280"}22`, color: a.category?.color || "#6B7280" }}
                        >
                          {a.category?.icon || <Package size={16} />}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate">{a.name}</div>
                          <div className="text-xs text-slate-400 truncate">{a.category?.name || "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {a.assignedTo ? `${a.assignedTo.firstName} ${a.assignedTo.lastName}` : <span className="text-slate-400">Unassigned</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${STATUS_STYLE[a.status] || STATUS_STYLE["In stock"]}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {a.value !== null && a.value !== undefined ? a.value.toLocaleString() : "—"}
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => { setEditingAsset(a); setModalOpen(true); }}
                          className="text-slate-400 hover:text-[#008ecc] transition-colors cursor-pointer"
                          title="Edit asset"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(a)}
                          className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Delete asset"
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

        {totalAssets > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">
                Page {page} of {totalPages} — {totalAssets} asset{totalAssets === 1 ? "" : "s"} total
              </span>
              <div className="flex items-center gap-1.5">
                <label htmlFor="asset-page-size" className="text-xs text-slate-500">Show</label>
                <select
                  id="asset-page-size"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="p-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition bg-white"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <AssetFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={fetchAssets}
        editingAsset={editingAsset}
        categories={categories}
        assignableUsers={assignableUsers}
        defaultCategoryId={filterCategory !== "All" ? filterCategory : null}
      />

      <AssetViewModal
        asset={viewingAsset}
        onClose={() => setViewingAsset(null)}
        onEdit={() => {
          setEditingAsset(viewingAsset);
          setViewingAsset(null);
          setModalOpen(true);
        }}
      />
    </div>
  );
};

export default AssetsTab;
