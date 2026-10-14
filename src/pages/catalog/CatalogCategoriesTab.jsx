import React, { useState } from "react";
import {
  Layers,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  Search,
  Package,
} from "lucide-react";
import { toast } from "react-toastify";
import { deleteCatalogCategory } from "../../services/catalog.service";
import CatalogCategoryModal from "./CatalogCategoryModal";

const CatalogCategoriesTab = ({
  categories = [],
  fetchCategories,
  canManage = true,
}) => {
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteConfirmCategory, setDeleteConfirmCategory] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  const handleDeleteCategory = async () => {
    if (!deleteConfirmCategory) return;
    setIsDeleting(true);
    try {
      await deleteCatalogCategory(deleteConfirmCategory._id);
      toast.success("Category deleted successfully");
      setDeleteConfirmCategory(null);
      fetchCategories();
    } catch (err) {
      console.error("Delete category error:", err);
      toast.error(
        err.response?.data?.message ||
          "Cannot delete category that has items associated with it"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories by name or description..."
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:border-purple-500 focus:ring-purple-100 transition-all"
          />
        </div>

        {canManage && (
          <button
            onClick={() => {
              setEditingCategory(null);
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Category</span>
          </button>
        )}
      </div>

      {/* Categories Grid */}
      {filteredCategories.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-100 p-16 text-center">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <Layers size={28} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">No categories found</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {search
                  ? "No categories matched your search"
                  : "Organize your products & services by creating categories like Software, Consulting, or Subscriptions."}
              </p>
            </div>
            {canManage && !search && (
              <button
                onClick={() => {
                  setEditingCategory(null);
                  setIsModalOpen(true);
                }}
                className="mt-2 flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-xs font-semibold rounded-xl hover:bg-purple-700 transition cursor-pointer"
              >
                <Plus size={15} /> Create First Category
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((cat) => (
            <div
              key={cat._id}
              className="bg-white rounded-2xl shadow-xs border border-slate-100 p-5 flex flex-col justify-between hover:shadow-md transition-shadow relative group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-xs border border-black/5"
                      style={{
                        backgroundColor: `${cat.color || "#22415F"}18`,
                        color: cat.color || "#22415F",
                      }}
                    >
                      {cat.icon || "📦"}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                        {cat.name}
                      </h3>
                      <span
                        className={`inline-block text-[0.65rem] font-semibold px-2 py-0.5 rounded-full ${
                          cat.isActive !== false
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {cat.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingCategory(cat);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Category"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmCategory(cat)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Category"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-500 leading-relaxed min-h-[32px]">
                  {cat.description || "No description provided."}
                </p>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1 font-medium">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: cat.color || "#22415F" }}
                  />
                  Color Tag
                </span>
                <span className="font-mono text-[0.65rem] text-slate-400">
                  {cat.color || "#22415F"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Category Modal */}
      <CatalogCategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCategorySaved={fetchCategories}
        editingCategory={editingCategory}
      />

      {/* Delete Category Modal */}
      {deleteConfirmCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Delete Category?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <span className="font-semibold text-slate-700">"{deleteConfirmCategory.name}"</span>?
                Categories linked to existing catalog items cannot be deleted until those items are reassigned or removed.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmCategory(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCategory}
                disabled={isDeleting}
                className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? "Deleting..." : "Delete Category"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogCategoriesTab;
