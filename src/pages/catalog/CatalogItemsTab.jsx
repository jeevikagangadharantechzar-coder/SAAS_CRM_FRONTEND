import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Package,
  Layers,
  DollarSign,
  Tag,
  Hash,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Boxes,
  Briefcase,
  Wrench,
  Link2,
  Calendar,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  getCatalogItems,
  toggleCatalogItemStatus,
  deleteCatalogItem,
} from "../../services/catalog.service";
import CatalogItemModal from "./CatalogItemModal";

const CatalogItemsTab = ({
  categories = [],
  canManage = true,
  initialType = "",
  lockType = false,
  onStatsUpdate,
}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState(initialType || "");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [parentProductFilter, setParentProductFilter] = useState("");
  // Date filter is stored per module so Products and Services don't share it
  const storageKey = (name) => `catalog_${initialType || "all"}_${name}`;
  // Date mode: "range" or "single"
  const [dateMode, setDateMode] = useState(() => {
    return sessionStorage.getItem(storageKey("dateMode")) || "range";
  });
  const [startDate, setStartDate] = useState(() => {
    return sessionStorage.getItem(storageKey("startDate")) || "";
  });
  const [endDate, setEndDate] = useState(() => {
    return sessionStorage.getItem(storageKey("endDate")) || "";
  });
  const [singleDate, setSingleDate] = useState(() => {
    return sessionStorage.getItem(storageKey("singleDate")) || "";
  });
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  const updateStartDate = (val) => {
    setStartDate(val);
    if (val) sessionStorage.setItem(storageKey("startDate"), val);
    else sessionStorage.removeItem(storageKey("startDate"));
  };

  const updateEndDate = (val) => {
    setEndDate(val);
    if (val) sessionStorage.setItem(storageKey("endDate"), val);
    else sessionStorage.removeItem(storageKey("endDate"));
  };

  const updateSingleDate = (val) => {
    setSingleDate(val);
    if (val) {
      sessionStorage.setItem(storageKey("singleDate"), val);
      // In single date mode, query range is from start of that date to end of that date
      updateStartDate(val);
      updateEndDate(val);
    } else {
      sessionStorage.removeItem(storageKey("singleDate"));
      updateStartDate("");
      updateEndDate("");
    }
  };

  const updateDateMode = (mode) => {
    setDateMode(mode);
    sessionStorage.setItem(storageKey("dateMode"), mode);
    if (mode === "single") {
      if (startDate) {
        updateSingleDate(startDate);
      }
    } else {
      if (singleDate) {
        updateStartDate(singleDate);
        updateEndDate(singleDate);
      }
    }
  };

  // Keep type filter in sync if initialType changes
  useEffect(() => {
    if (initialType) {
      setTypeFilter(initialType);
    }
  }, [initialType]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [allServices, setAllServices] = useState([]);
  const [expandedProductIds, setExpandedProductIds] = useState(new Set());

  const toggleExpandProduct = (productId) => {
    setExpandedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        sort: sortField,
        order: sortOrder,
      };
      if (search.trim()) params.search = search.trim();
      if (typeFilter) params.type = typeFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (statusFilter !== "") params.isActive = statusFilter === "active";
      if (parentProductFilter) params.parentProduct = parentProductFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const data = await getCatalogItems(params);
      setItems(data.items || []);
      setTotalCount(data.total || data.count || (data.items ? data.items.length : 0));
      setTotalPages(data.totalPages || Math.ceil((data.total || 0) / limit) || 1);

      if (onStatsUpdate && data.stats) {
        onStatsUpdate(data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch catalog items:", err);
      toast.error("Failed to load catalog items");
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, categoryFilter, statusFilter, parentProductFilter, startDate, endDate, sortField, sortOrder, onStatsUpdate]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleToggleStatus = async (item) => {
    try {
      await toggleCatalogItemStatus(item._id);
      toast.success(`${item.name} is now ${item.isActive ? "inactive" : "active"}`);
      fetchItems();
      
    } catch {
      toast.error("Failed to toggle item status");
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteConfirmItem) return;
    setIsDeleting(true);
    try {
      await deleteCatalogItem(deleteConfirmItem._id);
      toast.success(`${deleteConfirmItem.name} removed from catalog`);
      setDeleteConfirmItem(null);
      fetchItems();
      
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete catalog item");
    } finally {
      setIsDeleting(false);
    }
  };

  const clearDateFilter = () => {
    updateStartDate("");
    updateEndDate("");
    updateSingleDate("");
    setPage(1);
  };

  const handleQuickDatePreset = (preset) => {
    const today = new Date();
    // Local date parts, not toISOString() — that converts to UTC and shifts IST dates back a day
    const formatDate = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    if (preset === "today") {
      const dStr = formatDate(today);
      if (dateMode === "single") {
        updateSingleDate(dStr);
      } else {
        updateStartDate(dStr);
        updateEndDate(dStr);
      }
    } else if (preset === "this_week") {
      const first = new Date(today);
      first.setDate(today.getDate() - today.getDay());
      updateStartDate(formatDate(first));
      updateEndDate(formatDate(today));
      if (dateMode === "single") updateDateMode("range");
    } else if (preset === "this_month") {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      updateStartDate(formatDate(first));
      updateEndDate(formatDate(today));
      if (dateMode === "single") updateDateMode("range");
    } else if (preset === "this_year") {
      const first = new Date(today.getFullYear(), 0, 1);
      updateStartDate(formatDate(first));
      updateEndDate(formatDate(today));
      if (dateMode === "single") updateDateMode("range");
    } else if (preset === "all") {
      clearDateFilter();
      return;
    }
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar (Fully Responsive) */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl shadow-xs border border-slate-100 flex flex-col gap-3">
        {/* Top Row: Search Input + Add Button */}
        <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search by name, SKU, or description..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-100 transition-all"
            />
          </div>

          {canManage && (
            <button
              onClick={() => {
                setEditingItem(null);
                setIsModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Plus size={16} />
              <span>{initialType === "Service" ? "Add Service" : initialType === "Product" ? "Add Product" : "Add Item"}</span>
            </button>
          )}
        </div>

        {/* Bottom Filter Row: Type, Category, Status, Responsive Date Picker & Quick Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          {/* Type Filter */}
          {!lockType && (
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer min-w-[110px]"
            >
              <option value="">All Types</option>
              <option value="Product">Products</option>
              <option value="Service">Services</option>
            </select>
          )}

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer min-w-[125px]"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.icon ? `${cat.icon} ` : ""}{cat.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer min-w-[110px]"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Service Linkage Filter (Shown for Services mode) */}
          {(typeFilter === "Service" || initialType === "Service") && (
            <select
              value={parentProductFilter}
              onChange={(e) => {
                setParentProductFilter(e.target.value);
                setPage(1);
              }}
              className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium rounded-xl border border-purple-200 bg-purple-50/50 text-purple-700 hover:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100 cursor-pointer min-w-[135px]"
            >
              <option value="">All Services</option>
              <option value="none">Standalone Only</option>
              {allServices.length > 0 &&
                Array.from(
                  new Set(
                    allServices
                      .filter((s) => s.parentProduct && s.parentProductName)
                      .map((s) => JSON.stringify({ id: s.parentProduct?._id || s.parentProduct, name: s.parentProductName }))
                  )
                ).map((str) => {
                  const p = JSON.parse(str);
                  return (
                    <option key={p.id} value={p.id}>
                      ↳ Linked: {p.name}
                    </option>
                  );
                })}
            </select>
          )}

          {/* Responsive Date Filter Container */}
          <div className="w-full lg:w-auto flex flex-wrap sm:flex-nowrap items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 sm:py-1">
            <div className="flex items-center gap-1 shrink-0 text-slate-500 font-semibold text-[11px]">
              <Calendar size={13} className="text-slate-400" />
              <span>Date:</span>
            </div>

            {/* Mode Selector: Single Day vs Date Range */}
            <div className="flex items-center bg-white border border-slate-200/80 rounded-lg p-0.5 text-[10px] font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => {
                  updateDateMode("single");
                  setPage(1);
                }}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  dateMode === "single"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "hover:text-slate-900"
                }`}
              >
                Single Day
              </button>
              <button
                type="button"
                onClick={() => {
                  updateDateMode("range");
                  setPage(1);
                }}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  dateMode === "range"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "hover:text-slate-900"
                }`}
              >
                Range
              </button>
            </div>

            {dateMode === "single" ? (
              <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
                <input
                  type="date"
                  value={singleDate || startDate}
                  onClick={(e) => {
                    try {
                      if (typeof e.target.showPicker === "function") {
                        e.target.showPicker();
                      }
                    } catch (_) {}
                  }}
                  onChange={(e) => {
                    updateSingleDate(e.target.value);
                    setPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer min-w-[125px]"
                />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
                  <span className="text-[10px] text-slate-400 font-medium uppercase">From</span>
                  <input
                    type="date"
                    value={startDate}
                    onClick={(e) => {
                      try {
                        if (typeof e.target.showPicker === "function") {
                          e.target.showPicker();
                        }
                      } catch (_) {}
                    }}
                    onChange={(e) => {
                      updateStartDate(e.target.value);
                      setPage(1);
                    }}
                    className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer min-w-[125px]"
                  />
                </div>

                <div className="flex items-center gap-1.5 flex-1 sm:flex-initial border-l border-slate-200/80 pl-2 sm:pl-1.5">
                  <span className="text-[10px] text-slate-400 font-medium uppercase">To</span>
                  <input
                    type="date"
                    value={endDate}
                    onClick={(e) => {
                      try {
                        if (typeof e.target.showPicker === "function") {
                          e.target.showPicker();
                        }
                      } catch (_) {}
                    }}
                    onChange={(e) => {
                      updateEndDate(e.target.value);
                      setPage(1);
                    }}
                    className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer min-w-[125px]"
                  />
                </div>
              </>
            )}

            {(startDate || endDate || singleDate) && (
              <button
                type="button"
                onClick={clearDateFilter}
                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                title="Clear date filter"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Date Range Shortcut Pills */}
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-500 ml-auto">
            <button
              type="button"
              onClick={() => handleQuickDatePreset("today")}
              className="px-2 py-0.5 rounded-md hover:bg-slate-100 hover:text-slate-800 transition-colors"
            >
              Today
            </button>
            <span className="text-slate-300">·</span>
            <button
              type="button"
              onClick={() => handleQuickDatePreset("this_month")}
              className="px-2 py-0.5 rounded-md hover:bg-slate-100 hover:text-slate-800 transition-colors"
            >
              This Month
            </button>
            <span className="text-slate-300">·</span>
            <button
              type="button"
              onClick={() => handleQuickDatePreset("this_year")}
              className="px-2 py-0.5 rounded-md hover:bg-slate-100 hover:text-slate-800 transition-colors"
            >
              This Year
            </button>
            {(startDate || endDate) && (
              <>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={() => handleQuickDatePreset("all")}
                  className="px-2 py-0.5 rounded-md text-rose-500 hover:bg-rose-50 transition-colors font-medium"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-[0.7rem] uppercase tracking-wider text-slate-500 font-bold">
                <th className="py-3 px-4">Item Name & Details</th>
                <th className="py-3 px-4">SKU / Code</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Unit Price</th>
                <th className="py-3 px-4 text-center">Tax</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                    <p>Loading catalog items...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                        <Package size={24} />
                      </div>
                      <p className="text-sm font-semibold text-slate-700">No catalog items found</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {search || typeFilter || categoryFilter || statusFilter || startDate || endDate
                          ? "Try adjusting your filters or date range"
                          : "Create your first product or service to start building your sales catalog"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isProduct = item.type === "Product";
                  const attachedServices = isProduct
                    ? allServices.filter(
                        (srv) =>
                          (srv.parentProduct?._id || srv.parentProduct || srv.attributes?.parentProduct) === item._id
                      )
                    : [];
                  const isExpanded = expandedProductIds.has(item._id);

                  return (
                    <React.Fragment key={item._id}>
                      <tr className="hover:bg-slate-50/60 transition-colors group">
                        <td className="py-3.5 px-4 font-medium text-slate-800">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                isProduct ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                              }`}
                            >
                              {isProduct ? <Boxes size={16} /> : <Wrench size={16} />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-800 truncate block">
                                  {item.name}
                                </span>
                                {isProduct && attachedServices.length > 0 && (
                                  <button
                                    onClick={() => toggleExpandProduct(item._id)}
                                    className="inline-flex items-center gap-1 text-[0.65rem] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200 transition cursor-pointer"
                                    title="Click to view linked services"
                                  >
                                    <Link2 size={10} />
                                    <span>{attachedServices.length} Service{attachedServices.length > 1 ? "s" : ""}</span>
                                    {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                                  </button>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-[0.7rem] text-slate-400 truncate max-w-xs">
                                  {item.description}
                                </p>
                              )}
                              {!isProduct && (
                                item.parentProductName ? (
                                  <span className="text-[0.65rem] font-medium text-purple-600 block mt-0.5">
                                    ↳ Linked to: <strong>{item.parentProductName}</strong>
                                  </span>
                                ) : (
                                  <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[0.62rem] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                    Standalone Service
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[0.72rem] text-slate-500 font-semibold">
                          {item.sku}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[0.68rem] font-semibold border ${
                              isProduct
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-purple-50 text-purple-700 border-purple-200"
                            }`}
                          >
                            {isProduct ? <Boxes size={11} /> : <Briefcase size={11} />}
                            {item.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {item.category ? (
                            <span className="inline-flex items-center gap-1 text-slate-600 text-xs">
                              {item.category.icon && <span>{item.category.icon}</span>}
                              <span>{item.category.name}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-800 text-xs">
                          {item.currency || "INR"} {Number(item.unitPrice || 0).toLocaleString()}
                          {item.billingUnit ? (
                            <span className="text-[0.68rem] font-normal text-slate-400 block">
                              / {item.billingUnit}
                            </span>
                          ) : null}
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-600 text-xs">
                          {item.taxRate !== undefined && item.taxRate !== null ? `${item.taxRate}%` : "0%"}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => canManage && handleToggleStatus(item)}
                            disabled={!canManage}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.68rem] font-semibold transition ${
                              item.isActive
                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            } ${canManage ? "cursor-pointer" : "cursor-default"}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${item.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                            {item.isActive ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {canManage && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingItem(item);
                                  setIsModalOpen(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                title="Edit Item"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmItem(item)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Delete Item"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Attached Services Row */}
                      {isProduct && isExpanded && attachedServices.length > 0 && (
                        attachedServices.map((srv) => (
                          <tr key={srv._id} className="bg-purple-50/30 border-b border-purple-100/50">
                            <td className="py-2.5 px-4 pl-12 text-slate-700">
                              <div className="flex items-center gap-2">
                                <span className="text-purple-500">↳</span>
                                <Wrench size={13} className="text-purple-600 shrink-0" />
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-slate-800 text-xs">
                                      {srv.name}
                                    </span>
                                    {srv.serviceType && (
                                      <span className="text-[0.62rem] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">
                                        {srv.serviceType}
                                      </span>
                                    )}
                                  </div>
                                  {srv.serviceScope && (
                                    <span className="text-[0.65rem] text-slate-500 block truncate">
                                      Scope: {srv.serviceScope}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-4 font-mono text-[0.7rem] text-slate-500">
                              {srv.sku}
                            </td>
                            <td className="py-2.5 px-4">
                              <span className="text-[0.65rem] font-semibold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-full">
                                Attached Service
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-xs text-slate-500">
                              {srv.category?.name || "—"}
                            </td>
                            <td className="py-2.5 px-4 text-right font-semibold text-xs text-slate-800">
                              {srv.currency || "INR"} {Number(srv.unitPrice || 0).toLocaleString()}
                              {srv.billingUnit ? ` / ${srv.billingUnit}` : ""}
                            </td>
                            <td className="py-2.5 px-4 text-center text-xs text-slate-500">
                              {srv.taxRate || 0}%
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <span className={`text-[0.65rem] font-medium px-2 py-0.5 rounded-full ${srv.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                                {srv.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              {canManage && (
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => {
                                      setEditingItem(srv);
                                      setIsModalOpen(true);
                                    }}
                                    className="p-1 text-slate-400 hover:text-blue-600 rounded"
                                    title="Edit Service"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmItem(srv)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                    title="Delete Service"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-700">{(page - 1) * limit + 1}</span> to{" "}
              <span className="font-semibold text-slate-700">
                {Math.min(page * limit, totalCount)}
              </span>{" "}
              of <span className="font-semibold text-slate-700">{totalCount}</span> items
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="px-1 text-slate-400">...</span>
                    )}
                    <button
                      onClick={() => setPage(p)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        page === p
                          ? "bg-blue-600 text-white"
                          : "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                ))}
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Item Create/Edit Modal */}
      <CatalogItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onItemSaved={() => {
          fetchItems();
        }}
        editingItem={editingItem}
        categories={categories}
        initialType={initialType}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Delete Catalog Item?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <span className="font-semibold text-slate-700">"{deleteConfirmItem.name}"</span> ({deleteConfirmItem.sku})?
                This action cannot be undone if the item has never been referenced.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteItem}
                disabled={isDeleting}
                className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? "Deleting..." : "Delete Item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogItemsTab;
