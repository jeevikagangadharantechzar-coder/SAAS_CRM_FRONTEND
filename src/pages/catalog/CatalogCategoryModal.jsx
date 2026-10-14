import React, { useState, useEffect } from "react";
import { X, Layers, Palette } from "lucide-react";
import { toast } from "react-toastify";
import { createCatalogCategory, updateCatalogCategory } from "../../services/catalog.service";

const CATEGORY_COLORS = [
  "#22415F",
  "#3B82F6",
  "#10B981",
  "#8B5CF6",
  "#F59E0B",
  "#EC4899",
  "#06B6D4",
  "#EF4444",
  "#64748B",
];

const CATEGORY_ICONS = ["📦", "💻", "🔧", "☁️", "🛡️", "📊", "🎯", "🚀", "📱", "⚙️", "📈", "💡"];

const CatalogCategoryModal = ({ isOpen, onClose, onCategorySaved, editingCategory }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#22415F",
    icon: "📦",
    isActive: true,
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingCategory) {
      setFormData({
        name: editingCategory.name || "",
        description: editingCategory.description || "",
        color: editingCategory.color || "#22415F",
        icon: editingCategory.icon || "📦",
        isActive: editingCategory.isActive !== false,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        color: "#22415F",
        icon: "📦",
        isActive: true,
      });
    }
    setErrors({});
  }, [editingCategory, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrors({ name: "Category name is required" });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        color: formData.color,
        icon: formData.icon,
        isActive: formData.isActive,
      };

      if (editingCategory) {
        await updateCatalogCategory(editingCategory._id, payload);
        toast.success("Category updated successfully!");
      } else {
        await createCatalogCategory(payload);
        toast.success("Category created successfully!");
      }

      onCategorySaved();
      onClose();
    } catch (err) {
      console.error("Save category error:", err);
      const msg = err.response?.data?.message || err.response?.data?.error || "Failed to save category";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-150 w-full max-w-lg my-auto max-h-[92vh] flex flex-col overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        {/* Header (sticky at top) */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-xs shrink-0">
              <Layers size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-800 truncate">
                {editingCategory ? "Edit Category" : "Add Catalog Category"}
              </h2>
              <p className="text-xs text-slate-500 truncate hidden sm:block">
                Organize products and services dynamically
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Category Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Software, Hardware, Consulting, Maintenance"
              className={`w-full px-3.5 py-2 text-sm rounded-xl border bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                errors.name
                  ? "border-rose-300 focus:ring-rose-200"
                  : "border-slate-200 focus:border-purple-500 focus:ring-purple-100"
              }`}
            />
            {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
          </div>

          {/* Icon Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Category Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, icon: ic }))}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-base border transition-all cursor-pointer ${
                    formData.icon === ic
                      ? "border-purple-500 bg-purple-50 scale-110 shadow-xs"
                      : "border-slate-200 bg-slate-50 hover:bg-white"
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Palette size={14} /> Color Tag
            </label>
            <div className="flex flex-wrap gap-2.5 items-center">
              {CATEGORY_COLORS.map((clr) => (
                <button
                  key={clr}
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, color: clr }))}
                  className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                    formData.color === clr ? "ring-2 ring-offset-2 ring-purple-500 scale-110" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: clr }}
                />
              ))}
              <input
                type="color"
                name="color"
                value={formData.color}
                onChange={handleChange}
                className="w-7 h-7 rounded-full border-0 p-0 cursor-pointer overflow-hidden"
                title="Custom color"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              placeholder="Brief description of this item category..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:border-purple-500 focus:ring-purple-100 transition-all resize-none"
            />
          </div>

          {/* Status */}
          <div className="flex items-center gap-3 pt-1">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
            <span className="text-sm font-medium text-slate-700">
              Active Category
            </span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-xl shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? "Saving..." : editingCategory ? "Update Category" : "Create Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CatalogCategoryModal;
