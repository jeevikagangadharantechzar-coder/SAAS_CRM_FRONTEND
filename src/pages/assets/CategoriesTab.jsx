import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import { toast } from "react-toastify";
import { Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";

const FIELD_TYPES = ["Text", "Number", "Date", "Dropdown", "Currency"];
const COLORS = ["#22415F", "#2F7A5C", "#B8792D", "#9C4430", "#5B4B8A", "#6B7280"];
// A curated spread rather than every field type having its own icon — covers
// property, IT, vehicles, machinery, office and general goods so it works
// across sectors instead of assuming one industry.
const ICON_CHOICES = [
  "📦", "🏠", "🏢", "💻", "🖥️", "📱", "🔑", "⚙️",
  "🚗", "🚚", "🛠️", "🖨️", "📷", "🏭", "💼", "🪑",
  "🔧", "📄", "🧰", "🛡️",
];

// Type an option and press Enter or comma to add it as a removable chip —
// replaces a bare "comma-separated" text box that gave no feedback about
// how to actually add more than one option.
const OptionsChipInput = ({ options, onChange }) => {
  const [draft, setDraft] = useState("");

  const commitDraft = () => {
    const val = draft.trim();
    if (val && !options.includes(val)) onChange([...options, val]);
    setDraft("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitDraft();
    } else if (e.key === "Backspace" && draft === "" && options.length > 0) {
      onChange(options.slice(0, -1));
    }
  };

  const removeAt = (idx) => onChange(options.filter((_, i) => i !== idx));

  return (
    <div className="w-full sm:flex-1">
      <div className="flex flex-wrap items-center gap-1.5 p-2 border border-slate-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-[#008ecc] transition">
        {options.map((opt, idx) => (
          <span key={opt} className="flex items-center gap-1 bg-blue-50 text-[#008ecc] text-xs font-semibold px-2 py-1 rounded-full">
            {opt}
            <button type="button" onClick={() => removeAt(idx)} className="hover:text-red-600 cursor-pointer leading-none">
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitDraft}
          placeholder={options.length === 0 ? "Type an option, press Enter" : "Add another…"}
          className="flex-1 min-w-[100px] text-sm outline-none py-0.5"
        />
      </div>
      <p className="text-[11px] text-slate-400 mt-1">Press Enter or comma after each option to add it.</p>
    </div>
  );
};

const CategoryFormModal = ({ isOpen, onClose, onSaved, editingCategory }) => {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📦");
  const [color, setColor] = useState(COLORS[0]);
  const [fields, setFields] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(editingCategory?.name || "");
      setIcon(editingCategory?.icon || "📦");
      setColor(editingCategory?.color || COLORS[0]);
      setFields(
        editingCategory?.fields?.length
          ? editingCategory.fields.map((f) => ({ ...f, options: f.options || [] }))
          : [{ label: "", type: "Text", options: [] }]
      );
    }
  }, [isOpen, editingCategory]);

  if (!isOpen) return null;

  const addFieldRow = () => setFields((prev) => [...prev, { label: "", type: "Text", options: [] }]);
  const removeFieldRow = (i) => setFields((prev) => prev.filter((_, idx) => idx !== i));
  const changeField = (i, key, value) =>
    setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, [key]: value } : f)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warn("Category name is required.");
      return;
    }
    const cleanedFields = fields
      .filter((f) => f.label.trim())
      .map((f) => ({
        label: f.label.trim(),
        type: f.type,
        ...(f.type === "Dropdown" ? { options: f.options } : {}),
      }));

    setSaving(true);
    try {
      if (editingCategory) {
        await api.put(`/assets/categories/${editingCategory._id}`, { name, icon, color, fields: cleanedFields });
        toast.success("Category updated successfully.");
      } else {
        await api.post("/assets/categories", { name, icon, color, fields: cleanedFields });
        toast.success("Category created successfully.");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save category.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-slate-800">{editingCategory ? "Edit Category" : "Create Category"}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Category Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Company Vehicles"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Icon</label>
            <div className="grid grid-cols-8 sm:grid-cols-10 gap-2">
              {ICON_CHOICES.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  title={ic}
                  className={`w-9 h-9 flex items-center justify-center text-lg rounded-lg border-2 cursor-pointer transition ${
                    icon === ic ? "border-[#008ecc] bg-blue-50" : "border-transparent bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full cursor-pointer border-2 ${color === c ? "border-slate-800" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Custom Fields for this Category
              </label>
              <button type="button" onClick={addFieldRow} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold transition">
                <Plus size={14} /> Add Field
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Name, Status and Assigned To always exist automatically — everything else is up to you.
            </p>
            <div className="space-y-2">
              {fields.map((f, i) => (
                <div key={i} className="flex flex-col sm:flex-row gap-2 items-stretch">
                  <input
                    type="text"
                    value={f.label}
                    onChange={(e) => changeField(i, "label", e.target.value)}
                    placeholder="Field label (e.g. Serial Number)"
                    className="w-full sm:flex-1 p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition"
                  />
                  <select
                    value={f.type}
                    onChange={(e) => changeField(i, "type", e.target.value)}
                    className="w-full sm:w-32 p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition bg-white"
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  {f.type === "Dropdown" && (
                    <OptionsChipInput
                      options={f.options}
                      onChange={(opts) => changeField(i, "options", opts)}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeFieldRow(i)}
                    className="p-2.5 text-red-500 hover:text-red-700 transition self-end sm:self-auto"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
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
              {editingCategory ? "Save Changes" : "Create Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CategoriesTab = ({ categories, setCategories, categoriesLoaded, setCategoriesLoaded }) => {
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [search, setSearch] = useState("");

  // Categories are shared tenant-wide structure — creating/editing/deleting
  // one needs assets_manage_categories specifically, not just the general
  // "assets" permission that got someone onto this page at all. Admin always
  // has it (matches the backend's requirePermission Admin bypass).
  const canManageCategories = (() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return user?.role?.name?.toLowerCase() === "admin" || !!user?.role?.permissions?.assets_manage_categories;
    } catch {
      return false;
    }
  })();

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get("/assets/categories");
      setCategories(res.data?.categories || []);
      setCategoriesLoaded(true);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to load categories.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!categoriesLoaded) fetchCategories();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (category) => {
    if (!window.confirm(`Delete category "${category.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/assets/categories/${category._id}`);
      toast.success("Category deleted successfully.");
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete category.");
    }
  };

  const filteredCategories = search.trim()
    ? categories.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()))
    : categories;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories…"
            className="p-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#008ecc] transition w-56"
          />
          <span className="text-xs text-slate-400">
            {filteredCategories.length} of {categories.length}
          </span>
        </div>
        {canManageCategories && (
          <button
            onClick={() => { setEditingCategory(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#008ecc] text-white rounded-xl font-semibold hover:bg-[#007bb0] transition-all cursor-pointer text-sm shadow-md"
          >
            <Plus size={16} />
            New Category
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-12">Loading categories...</div>
      ) : categories.length === 0 ? (
        <div className="text-center text-slate-400 py-12 font-semibold">No categories yet.</div>
      ) : filteredCategories.length === 0 ? (
        <div className="text-center text-slate-400 py-12 font-semibold">No categories match "{search}".</div>
      ) : (
        <div className="flex flex-wrap gap-4">
          {filteredCategories.map((cat) => (
            <div
              key={cat._id}
              className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 w-full sm:w-[260px] flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ backgroundColor: `${cat.color}22`, color: cat.color }}
                >
                  {cat.icon}
                </span>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 truncate">{cat.name}</div>
                  <div className="text-xs text-slate-400">{cat.fields?.length || 0} custom field{cat.fields?.length === 1 ? "" : "s"}</div>
                </div>
              </div>
              {canManageCategories && (
                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => { setEditingCategory(cat); setModalOpen(true); }}
                    className="text-slate-400 hover:text-[#008ecc] transition-colors cursor-pointer"
                    title="Edit category"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(cat)}
                    className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                    title="Delete category"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <CategoryFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={fetchCategories}
        editingCategory={editingCategory}
      />
    </div>
  );
};

export default CategoriesTab;
