import React, { useState, useEffect, useCallback } from "react";
import { Package, Layers, Tag, Briefcase, Plus, CheckCircle, Boxes } from "lucide-react";
import { toast } from "react-toastify";
import { getCatalogCategories } from "../../services/catalog.service";
import CatalogItemsTab from "./CatalogItemsTab";
import CatalogCategoriesTab from "./CatalogCategoriesTab";

const CatalogManagement = ({ mode = "all" }) => {
  const [activeTab, setActiveTab] = useState(mode === "categories" ? "categories" : "items");
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({
    totalItems: 0,
    productsCount: 0,
    servicesCount: 0,
    activeCount: 0,
    categoriesCount: 0,
  });
  const [userRole, setUserRole] = useState("");
  const [userPermissions, setUserPermissions] = useState({});

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      setUserRole(stored.role?.name || "");
      setUserPermissions(stored.role?.permissions || {});
    } catch {
      // ignore
    }
  }, []);

  const isAdmin = userRole.toLowerCase() === "admin";
  const canManageItems = isAdmin || userPermissions.products_services === true;
  const canManageCategories = isAdmin || userPermissions.manage_catalog_categories === true;

  const fetchCategories = useCallback(async () => {
    try {
      const data = await getCatalogCategories();
      const list = Array.isArray(data) ? data : data.categories || [];
      setCategories(list);
      setStats((prev) => ({ ...prev, categoriesCount: list.length }));
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  }, []);

  const handleStatsUpdate = useCallback((statsData) => {
    if (!statsData) return;
    setStats((prev) => ({
      ...prev,
      totalItems: statsData.totalItems ?? prev.totalItems,
      productsCount: statsData.productsCount ?? prev.productsCount,
      servicesCount: statsData.servicesCount ?? prev.servicesCount,
      activeCount: statsData.activeCount ?? prev.activeCount,
    }));
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const isProductOnly = mode === "product";
  const isServiceOnly = mode === "service";

  const pageTitle = isProductOnly
    ? "Products Catalog"
    : isServiceOnly
    ? "Services Catalog"
    : "Products & Services Catalog";

  const pageSubtitle = isProductOnly
    ? "Manage products, inventory SKUs, specifications, and pricing."
    : isServiceOnly
    ? "Manage professional services, consulting packages, delivery SLAs, and billing rates."
    : "Manage commercial items, dynamic pricing, categories, and taxes available for Deals and Invoices.";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {pageTitle}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
              Commercial Hub
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            {pageSubtitle}
          </p>
        </div>

        {/* Tab Toggle Buttons */}
        <div
          className={`flex items-center bg-slate-150/70 p-1 rounded-xl border border-slate-200/70 self-start md:self-auto ${
            mode === "categories" ? "hidden" : ""
          }`}
        >
          <button
            onClick={() => setActiveTab("items")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "items"
                ? "bg-white text-slate-800 shadow-xs border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {isProductOnly ? <Boxes size={16} /> : isServiceOnly ? <Briefcase size={16} /> : <Package size={16} />}
            <span>
              {isProductOnly ? "Products" : isServiceOnly ? "Services" : "All Items"}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "categories"
                ? "bg-white text-slate-800 shadow-xs border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers size={16} />
            <span>Categories</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div
        className={`grid gap-4 ${
          isProductOnly || isServiceOnly
            ? "grid-cols-1 sm:grid-cols-2"
            : "grid-cols-2 sm:grid-cols-4"
        }`}
      >
        {isProductOnly && (
          <>
            <div className="bg-white rounded-2xl p-4.5 border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
                <Boxes size={22} />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">
                  Total Products
                </span>
                <span className="text-xl font-bold text-slate-800 mt-0.5 block">
                  {stats.productsCount}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4.5 border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
                <Layers size={22} />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">
                  Product Categories
                </span>
                <span className="text-xl font-bold text-slate-800 mt-0.5 block">
                  {stats.categoriesCount}
                </span>
              </div>
            </div>
          </>
        )}

        {isServiceOnly && (
          <>
            <div className="bg-white rounded-2xl p-4.5 border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-xs">
                <Briefcase size={22} />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">
                  Total Services
                </span>
                <span className="text-xl font-bold text-slate-800 mt-0.5 block">
                  {stats.servicesCount}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4.5 border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
                <Layers size={22} />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">
                  Service Categories
                </span>
                <span className="text-xl font-bold text-slate-800 mt-0.5 block">
                  {stats.categoriesCount}
                </span>
              </div>
            </div>
          </>
        )}

        {!isProductOnly && !isServiceOnly && (
          <>
            <div className="bg-white rounded-2xl p-4.5 border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
                <Package size={22} />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">
                  Total Items
                </span>
                <span className="text-xl font-bold text-slate-800 mt-0.5 block">
                  {stats.totalItems}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4.5 border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
                <Boxes size={22} />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">
                  Products
                </span>
                <span className="text-xl font-bold text-slate-800 mt-0.5 block">
                  {stats.productsCount}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4.5 border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-xs">
                <Briefcase size={22} />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">
                  Services
                </span>
                <span className="text-xl font-bold text-slate-800 mt-0.5 block">
                  {stats.servicesCount}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4.5 border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
                <Layers size={22} />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">
                  Categories
                </span>
                <span className="text-xl font-bold text-slate-800 mt-0.5 block">
                  {stats.categoriesCount}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Content Area */}
      {activeTab === "items" ? (
        <CatalogItemsTab
          categories={categories}
          canManage={canManageItems}
          initialType={isProductOnly ? "Product" : isServiceOnly ? "Service" : ""}
          lockType={isProductOnly || isServiceOnly}
          onStatsUpdate={handleStatsUpdate}
        />
      ) : (
        <CatalogCategoriesTab
          categories={categories}
          fetchCategories={fetchCategories}
          canManage={canManageCategories}
        />
      )}
    </div>
  );
};

export default CatalogManagement;
