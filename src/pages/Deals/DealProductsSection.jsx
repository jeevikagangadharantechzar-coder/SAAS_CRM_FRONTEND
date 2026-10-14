import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Package,
  Search,
  Plus,
  Trash2,
  Tag,
  DollarSign,
  Percent,
  Check,
  ChevronDown,
  Layers,
  AlertCircle,
  Briefcase,
  Boxes,
  Wrench,
  CornerDownRight,
  ShieldCheck,
} from "lucide-react";
import { getCatalogItems, getCatalogCategories } from "../../services/catalog.service";

const DealProductsSection = ({
  items = [],
  setItems,
  currency = "INR",
  onTotalChange,
}) => {
  const [catalogItems, setCatalogItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [itemsData, catsData] = await Promise.all([
          getCatalogItems({ isActive: true, limit: 150 }),
          getCatalogCategories({ isActive: true }),
        ]);
        setCatalogItems(itemsData.items || []);
        const catList = Array.isArray(catsData) ? catsData : catsData.categories || [];
        setCategories(catList);
      } catch (err) {
        console.error("Failed to fetch catalog for deals:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter available catalog items
  const availableItems = useMemo(() => {
    return catalogItems.filter((item) => {
      // Must be active
      if (item.isActive === false) return false;
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = item.name?.toLowerCase().includes(q);
        const matchesSku = item.sku?.toLowerCase().includes(q);
        if (!matchesName && !matchesSku) return false;
      }
      // Type
      if (selectedType && item.type !== selectedType) return false;
      // Category
      if (selectedCategory) {
        const itemCatId = item.category?._id || item.category;
        if (itemCatId !== selectedCategory) return false;
      }
      return true;
    });
  }, [catalogItems, search, selectedType, selectedCategory]);

  // Handle adding an item to the deal
  const handleAddItem = (item) => {
    const existingIndex = items.findIndex(
      (it) => (it.catalogItem?._id || it.catalogItem) === item._id
    );

    if (existingIndex !== -1) {
      // If already added, increment quantity
      const updated = [...items];
      updated[existingIndex].quantity = (Number(updated[existingIndex].quantity) || 1) + 1;
      setItems(updated);
    } else {
      const newItem = {
        catalogItem: item._id,
        name: item.name,
        sku: item.sku,
        type: item.type || "Product",
        unitPrice: Number(item.unitPrice) || 0,
        quantity: 1,
        taxRate: Number(item.taxRate) || 0,
        discount: 0,
        billingUnit: item.billingUnit || "unit",
        hsnSac: item.hsnSac || "",
        categoryName: item.category?.name || "",
        isNewSelection: true,
      };
      setItems([...items, newItem]);
    }
  };

  // Handle item change
  const handleItemFieldChange = (index, field, value) => {
    const updated = [...items];
    const val = field === "quantity" || field === "unitPrice" || field === "taxRate" || field === "discount"
      ? (value === "" ? 0 : Number(value))
      : value;
    updated[index] = { ...updated[index], [field]: val };
    setItems(updated);
  };

  // Handle item removal
  const handleRemoveItem = (index) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  // Calculations
  const calculations = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    const itemTotals = items.map((it) => {
      const qty = Math.max(Number(it.quantity) || 0, 0);
      const price = Math.max(Number(it.unitPrice) || 0, 0);
      const lineSubtotal = qty * price;
      
      const discountPct = Math.min(Math.max(Number(it.discount) || 0, 0), 100);
      const lineDiscount = (lineSubtotal * discountPct) / 100;
      const taxableAmount = Math.max(lineSubtotal - lineDiscount, 0);

      const taxRate = Math.max(Number(it.taxRate) || 0, 0);
      const lineTax = (taxableAmount * taxRate) / 100;

      const lineTotal = taxableAmount + lineTax;

      subtotal += lineSubtotal;
      totalDiscount += lineDiscount;
      totalTax += lineTax;

      return {
        lineSubtotal,
        lineDiscount,
        lineTax,
        lineTotal,
      };
    });

    const total = subtotal - totalDiscount + totalTax;

    return {
      subtotal,
      totalDiscount,
      totalTax,
      total,
      itemTotals,
    };
  }, [items]);

  // Ref to hold current onTotalChange to avoid effect dependency re-triggers
  const onTotalChangeRef = useRef(onTotalChange);
  useEffect(() => {
    onTotalChangeRef.current = onTotalChange;
  }, [onTotalChange]);

  const lastReportedTotalRef = useRef(null);

  // Notify parent of total change only when calculated total actually changes
  useEffect(() => {
    if (items.length > 0 && onTotalChangeRef.current) {
      const formattedTotal = calculations.total.toFixed(2);
      if (lastReportedTotalRef.current !== formattedTotal) {
        lastReportedTotalRef.current = formattedTotal;
        onTotalChangeRef.current(formattedTotal);
      }
    } else if (items.length === 0) {
      if (lastReportedTotalRef.current !== null) {
        lastReportedTotalRef.current = null;
        if (onTotalChangeRef.current) {
          onTotalChangeRef.current("");
        }
      }
    }
  }, [calculations.total, items.length]);

  return (
    <div className="space-y-4 p-4 md:p-6 border border-blue-100 bg-blue-50/20 rounded-2xl shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-blue-100/70 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Package size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Products & Services
            </h2>
            <p className="text-xs text-slate-500">
              Select commercial items to dynamically calculate deal value and snapshot pricing
            </p>
          </div>
        </div>

        {items.length > 0 && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 self-start sm:self-auto">
            {items.length} {items.length === 1 ? "Item" : "Items"} Selected
          </span>
        )}
      </div>

      {/* Catalog Selector Accordion / Dropdown */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <Search size={14} className="text-blue-600" /> Browse & Add From Catalog
          </span>
          <button
            type="button"
            onClick={() => setIsDropdownOpen((o) => !o)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer flex items-center gap-1"
          >
            <span>{isDropdownOpen ? "Hide Catalog Picker" : "Show Catalog Picker"}</span>
            <ChevronDown size={14} className={`transform transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
          </button>
        </div>

        {isDropdownOpen && (
          <div className="space-y-3 pt-2 border-t border-slate-100 animate-in fade-in duration-150">
            {/* Search and Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search item name or SKU..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">All Types (Product & Service)</option>
                <option value="Product">Products Only</option>
                <option value="Service">Services Only</option>
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.icon ? `${c.icon} ` : ""}{c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Catalog Items Quick Grid */}
            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
              {loading ? (
                <div className="py-6 text-center text-xs text-slate-400">Loading catalog items...</div>
              ) : availableItems.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No active catalog items matched your search.
                </div>
              ) : (
                availableItems.map((catItem) => {
                  const isAlreadySelected = items.some(
                    (it) => (it.catalogItem?._id || it.catalogItem) === catItem._id
                  );
                  // Find services linked to this product
                  const attachedServices = catItem.type === "Product"
                    ? catalogItems.filter(
                        (srv) =>
                          srv.type === "Service" &&
                          (srv.parentProduct?._id || srv.parentProduct || srv.attributes?.parentProduct) === catItem._id
                      )
                    : [];

                  return (
                    <div
                      key={catItem._id}
                      className={`rounded-xl border transition-all ${
                        isAlreadySelected
                          ? "bg-blue-50/40 border-blue-200"
                          : "bg-slate-50/60 border-slate-150 hover:bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between p-2.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                              catItem.type === "Product"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-purple-100 text-purple-700"
                            }`}
                          >
                            {catItem.type === "Product" ? "P" : "S"}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-slate-800 truncate">
                                {catItem.name}
                              </span>
                              <span className="text-[0.65rem] font-mono px-1.5 py-0.2 bg-slate-200/70 text-slate-600 rounded">
                                {catItem.sku}
                              </span>
                              {catItem.category && (
                                <span
                                  className="text-[0.65rem] px-1.5 py-0.2 rounded-full font-medium"
                                  style={{
                                    backgroundColor: `${catItem.category.color || "#22415F"}15`,
                                    color: catItem.category.color || "#22415F",
                                  }}
                                >
                                  {catItem.category.name}
                                </span>
                              )}
                            </div>
                            <span className="text-[0.7rem] text-slate-500 block">
                              {catItem.currency || currency} {Number(catItem.unitPrice || 0).toLocaleString()}
                              {catItem.billingUnit ? ` / ${catItem.billingUnit}` : ""} • Tax: {catItem.taxRate || 0}%
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddItem(catItem)}
                          className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                            isAlreadySelected
                              ? "bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
                              : "bg-white border border-slate-200 text-slate-700 hover:border-blue-500 hover:text-blue-600"
                          }`}
                        >
                          <Plus size={13} />
                          <span>{isAlreadySelected ? "Add More" : "Add to Deal"}</span>
                        </button>
                      </div>

                      {/* Attached Services Checklist for this Product */}
                      {catItem.type === "Product" && attachedServices.length > 0 && (
                        <div className="bg-purple-50/30 border-t border-purple-100/70 px-3 py-2 rounded-b-xl space-y-1.5">
                          <span className="text-[0.65rem] font-bold text-purple-900 uppercase tracking-wider block">
                            Attach Services for this Product:
                          </span>
                          <div className="space-y-1">
                            {attachedServices.map((srv) => {
                              const isSrvAdded = items.some(
                                (it) => (it.catalogItem?._id || it.catalogItem) === srv._id
                              );
                              return (
                                <div
                                  key={srv._id}
                                  className="flex items-center justify-between py-1 px-2 rounded bg-white/70 border border-purple-100 hover:bg-white text-xs"
                                >
                                  <label className="flex items-center gap-2 cursor-pointer min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={isSrvAdded}
                                      onChange={() => {
                                        if (isSrvAdded) {
                                          const idx = items.findIndex(
                                            (it) => (it.catalogItem?._id || it.catalogItem) === srv._id
                                          );
                                          if (idx !== -1) handleRemoveItem(idx);
                                        } else {
                                          handleAddItem(srv);
                                        }
                                      }}
                                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                    />
                                    <span className="font-medium text-slate-700 truncate">
                                      🛠️ {srv.name}
                                    </span>
                                    {srv.serviceType && (
                                      <span className="text-[0.6rem] text-purple-700 bg-purple-50 px-1 rounded">
                                        {srv.serviceType}
                                      </span>
                                    )}
                                  </label>
                                  <span className="text-[0.7rem] font-semibold text-purple-900 shrink-0 ml-2">
                                    + {currency} {Number(srv.unitPrice || 0).toLocaleString()}
                                    {srv.billingUnit ? `/${srv.billingUnit}` : ""}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected Items Table */}
      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-blue-200 p-8 text-center">
          <Package size={32} className="mx-auto text-blue-300 mb-2" />
          <h3 className="text-sm font-semibold text-slate-700">No Products or Services Selected Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Click <strong>"Show Catalog Picker"</strong> above to select items for this deal, or enter a manual deal value in the Deal Information card.
          </p>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(true)}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition cursor-pointer"
          >
            <Plus size={14} /> Browse Catalog
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Item & SKU</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-center">Quantity</th>
                    <th className="py-2.5 px-3 text-center">Tax %</th>
                    <th className="py-2.5 px-3 text-center">Disc %</th>
                    <th className="py-2.5 px-3 text-right">Line Total</th>
                    <th className="py-2.5 px-3 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it, idx) => {
                    const rowCalculations = calculations.itemTotals[idx] || {
                      lineSubtotal: 0,
                      lineDiscount: 0,
                      lineTax: 0,
                      lineTotal: 0,
                    };

                    return (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        {/* Item & SKU */}
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-800">{it.name}</div>
                          <div className="text-[0.65rem] font-mono text-slate-400">
                            {it.sku || "N/A"} {it.billingUnit ? `(${it.billingUnit})` : ""}
                          </div>
                        </td>

                        {/* Type */}
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[0.65rem] font-semibold ${
                              it.type === "Product"
                                ? "bg-blue-50 text-blue-700 border border-blue-100"
                                : "bg-purple-50 text-purple-700 border border-purple-100"
                            }`}
                          >
                            {it.type || "Product"}
                          </span>
                        </td>

                        {/* Unit Price */}
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={it.unitPrice}
                            onChange={(e) => handleItemFieldChange(idx, "unitPrice", e.target.value)}
                            className="w-24 px-2 py-1 text-right text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>

                        {/* Quantity */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="inline-flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                            <button
                              type="button"
                              onClick={() =>
                                handleItemFieldChange(idx, "quantity", Math.max((Number(it.quantity) || 1) - 1, 1))
                              }
                              className="px-2 py-1 text-slate-600 hover:bg-slate-200 transition font-bold"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={it.quantity}
                              onChange={(e) => handleItemFieldChange(idx, "quantity", e.target.value)}
                              className="w-12 text-center text-xs font-semibold py-1 bg-transparent border-0 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleItemFieldChange(idx, "quantity", (Number(it.quantity) || 0) + 1)
                              }
                              className="px-2 py-1 text-slate-600 hover:bg-slate-200 transition font-bold"
                            >
                              +
                            </button>
                          </div>
                        </td>

                        {/* Tax Rate % */}
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={it.taxRate}
                            onChange={(e) => handleItemFieldChange(idx, "taxRate", e.target.value)}
                            className="w-14 px-1.5 py-1 text-center text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>

                        {/* Discount % */}
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={it.discount}
                            onChange={(e) => handleItemFieldChange(idx, "discount", e.target.value)}
                            className="w-14 px-1.5 py-1 text-center text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>

                        {/* Line Total */}
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {currency}{" "}
                          {rowCalculations.lineTotal.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>

                        {/* Remove */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Remove Item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Calculations Breakdown Summary Card */}
            <div className="bg-slate-50/70 p-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-xs text-slate-500 space-y-1">
                <div className="flex items-center gap-1.5 text-blue-700 font-medium">
                  <Check size={14} />
                  <span>Calculated automatically from {items.length} line {items.length === 1 ? "item" : "items"}</span>
                </div>
                <p className="text-[0.7rem] text-slate-400">
                  Item snapshots are preserved and will carry forward to Proposals and Invoices.
                </p>
              </div>

              <div className="space-y-1.5 text-xs text-right min-w-[200px]">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold">
                    {currency} {calculations.subtotal.toFixed(2)}
                  </span>
                </div>
                {calculations.totalDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span className="font-semibold">
                      - {currency} {calculations.totalDiscount.toFixed(2)}
                    </span>
                  </div>
                )}
                {calculations.totalTax > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Tax:</span>
                    <span className="font-semibold">
                      + {currency} {calculations.totalTax.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-1.5 border-t border-slate-200">
                  <span>Total Deal Value:</span>
                  <span className="text-blue-600 font-bold">
                    {currency} {calculations.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealProductsSection;
