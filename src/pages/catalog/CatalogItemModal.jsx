import React, { useState, useEffect } from "react";
import { X, AlertCircle, Package, Tag, DollarSign, Percent, Layers, Hash, Wrench, Link2, CheckCircle2, ArrowRightLeft, RefreshCw } from "lucide-react";
import { toast } from "react-toastify";
import { createCatalogItem, updateCatalogItem, getCatalogItems, getCurrencyExchangeRate } from "../../services/catalog.service";

const BILLING_UNITS_PRODUCT = [
  { value: "unit", label: "Per Unit" },
  { value: "piece", label: "Per Piece" },
  { value: "set", label: "Per Set" },
  { value: "box", label: "Per Box" },
];

const BILLING_UNITS_SERVICE = [
  { value: "year", label: "Per Year (Annual AMC / License)" },
  { value: "month", label: "Per Month" },
  { value: "hour", label: "Per Hour" },
  { value: "day", label: "Per Day / Visit" },
  { value: "session", label: "Per Session" },
  { value: "project", label: "Per Project / Fixed Package" },
  { value: "unit", label: "One-Time Service" },
];

const CURRENCIES = [
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "AED", symbol: "AED", name: "UAE Dirham" },
  { code: "SAR", symbol: "SAR", name: "Saudi Riyal" },
  { code: "QAR", symbol: "QAR", name: "Qatari Riyal" },
  { code: "KWD", symbol: "KWD", name: "Kuwaiti Dinar" },
  { code: "OMR", symbol: "OMR", name: "Omani Rial" },
  { code: "BHD", symbol: "BHD", name: "Bahraini Dinar" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "RUB", symbol: "₽", name: "Russian Ruble" },
  { code: "THB", symbol: "฿", name: "Thai Baht" },
  { code: "PHP", symbol: "₱", name: "Philippine Peso" },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah" },
  { code: "VND", symbol: "₫", name: "Vietnamese Dong" },
  { code: "KRW", symbol: "₩", name: "South Korean Won" },
  { code: "TRY", symbol: "₺", name: "Turkish Lira" },
  { code: "MXN", symbol: "Mex$", name: "Mexican Peso" },
  { code: "EGP", symbol: "E£", name: "Egyptian Pound" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
  { code: "PKR", symbol: "₨", name: "Pakistani Rupee" },
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka" },
  { code: "LKR", symbol: "Rs", name: "Sri Lankan Rupee" },
  { code: "NPR", symbol: "रू", name: "Nepalese Rupee" },
];

const SERVICE_NATURES = [
  "Installation & Setup",
  "Warranty / AMC (Annual Maintenance)",
  "Preventive Maintenance & Calibration",
  "Repair & Diagnostic Service",
  "Training & User Onboarding",
  "Technical Support & 24/7 SLA",
  "Software License / Firmware Renewal",
  "Custom Consultation",
];

const CatalogItemModal = ({ isOpen, onClose, onItemSaved, editingItem, categories = [], initialType = "" }) => {
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    type: initialType || "Product",
    category: "",
    description: "",
    unitPrice: "",
    currency: "INR",
    taxRate: 18,
    billingUnit: initialType === "Service" ? "year" : "unit",
    hsnSac: "",
    isActive: true,
    // Product-specific
    brand: "",
    modelNumber: "",
    warrantyPeriod: "",
    dimensions: "",
    weight: "",
    // Service-specific
    parentProduct: "",
    serviceType: "Installation & Setup",
    serviceScope: "",
    deliveryMode: "On-site",
    slaResponseTime: "24 Hours Response",
    duration: "1 Year",
    deliverables: "",
    // Dynamic Custom Extra Fields
    customFields: [],
  });

  const selectedCurrencyObj = CURRENCIES.find((c) => c.code === formData.currency) || { symbol: formData.currency || "₹" };
  const currentSymbol = selectedCurrencyObj.symbol;

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");
  const [showAddCustomField, setShowAddCustomField] = useState(false);
  const [availableProducts, setAvailableProducts] = useState([]);

  // Fetch products for the Linked Product dropdown
  useEffect(() => {
    if (isOpen) {
      getCatalogItems({ type: "Product", limit: 300 })
        .then((res) => {
          setAvailableProducts(res.items || []);
        })
        .catch((err) => console.error("Failed to load products for service association:", err));
    }
  }, [isOpen]);

  useEffect(() => {
    if (editingItem) {
      setFormData({
        name: editingItem.name || "",
        sku: editingItem.sku || "",
        type: editingItem.type || "Product",
        category: editingItem.category?._id || editingItem.category || "",
        description: editingItem.description || "",
        unitPrice: editingItem.unitPrice !== undefined ? String(editingItem.unitPrice) : "",
        currency: editingItem.currency || "INR",
        taxRate: editingItem.taxRate !== undefined ? String(editingItem.taxRate) : "18",
        billingUnit: editingItem.billingUnit || (editingItem.type === "Service" ? "year" : "unit"),
        hsnSac: editingItem.hsnSac || "",
        isActive: editingItem.isActive !== false,
        brand: editingItem.brand || editingItem.attributes?.brand || "",
        modelNumber: editingItem.modelNumber || editingItem.attributes?.modelNumber || "",
        warrantyPeriod: editingItem.warrantyPeriod || editingItem.attributes?.warrantyPeriod || "",
        dimensions: editingItem.dimensions || editingItem.attributes?.dimensions || "",
        weight: editingItem.weight || editingItem.attributes?.weight || "",
        parentProduct: editingItem.parentProduct?._id || editingItem.parentProduct || editingItem.attributes?.parentProduct || "",
        serviceType: editingItem.serviceType || editingItem.attributes?.serviceType || "Installation & Setup",
        serviceScope: editingItem.serviceScope || editingItem.attributes?.serviceScope || "",
        deliveryMode: editingItem.deliveryMode || editingItem.attributes?.deliveryMode || "On-site",
        slaResponseTime: editingItem.slaResponseTime || editingItem.attributes?.slaResponseTime || "24 Hours Response",
        duration: editingItem.duration || editingItem.attributes?.duration || "1 Year",
        deliverables: editingItem.deliverables || editingItem.attributes?.deliverables || "",
        customFields: Array.isArray(editingItem.customFields)
          ? editingItem.customFields
          : editingItem.attributes?.customFields || [],
      });
    } else {
      setFormData({
        name: "",
        sku: "",
        type: initialType || "Product",
        category: categories.length > 0 ? categories[0]._id : "",
        description: "",
        unitPrice: "",
        currency: "INR",
        taxRate: "18",
        billingUnit: initialType === "Service" ? "year" : "unit",
        hsnSac: "",
        isActive: true,
        brand: "",
        modelNumber: "",
        warrantyPeriod: "",
        dimensions: "",
        weight: "",
        parentProduct: "",
        serviceType: "Installation & Setup",
        serviceScope: "",
        deliveryMode: "On-site",
        slaResponseTime: "24 Hours Response",
        duration: "1 Year",
        deliverables: "",
        customFields: [],
      });
    }
    setShowAddCustomField(false);
    setNewFieldName("");
    setNewFieldValue("");
    setErrors({});
  }, [editingItem, isOpen, categories]);

    const [isConvertingCurrency, setIsConvertingCurrency] = useState(false);
  const [conversionNote, setConversionNote] = useState("");

  const handleCurrencyChange = async (e) => {
    const newCurrency = e.target.value;
    const oldCurrency = formData.currency;
    const currentPrice = parseFloat(formData.unitPrice);

    setFormData((prev) => ({ ...prev, currency: newCurrency }));

    if (!isNaN(currentPrice) && currentPrice > 0 && oldCurrency !== newCurrency) {
      try {
        setIsConvertingCurrency(true);
        const res = await getCurrencyExchangeRate(oldCurrency, newCurrency, currentPrice);
        if (res?.convertedAmount != null) {
          setFormData((prev) => ({
            ...prev,
            currency: newCurrency,
            unitPrice: String(res.convertedAmount),
          }));
          setConversionNote(`Converted from ${oldCurrency} ${currentPrice.toLocaleString()} at rate 1 ${oldCurrency} = ${res.rate} ${newCurrency}`);
          setTimeout(() => setConversionNote(""), 8000);
        }
      } catch (err) {
        console.error("Currency conversion error:", err);
      } finally {
        setIsConvertingCurrency(false);
      }
    }
  };

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

  // When user selects a parent product for a service, auto-inherit category & currency
  const handleSelectParentProduct = (productId) => {
    const selectedProd = availableProducts.find((p) => p._id === productId);
    setFormData((prev) => ({
      ...prev,
      parentProduct: productId,
      category: selectedProd?.category?._id || selectedProd?.category || prev.category,
      currency: selectedProd?.currency || prev.currency,
      taxRate: selectedProd?.taxRate !== undefined ? selectedProd.taxRate : prev.taxRate,
      billingUnit: prev.billingUnit === "unit" ? "year" : prev.billingUnit,
    }));
    if (errors.parentProduct) {
      setErrors((prev) => ({ ...prev, parentProduct: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = formData.type === "Service" ? "Service Name is required" : "Product Name is required";
    }

    if (formData.type === "Product") {
      if (!formData.sku.trim()) newErrors.sku = "Product SKU / Code is required";
      if (!formData.category) newErrors.category = "Category is required";
    } else {
      // For Service: If not linked to a parent product, category is required
      if (!formData.parentProduct && !formData.category) {
        newErrors.category = "Please select a Category for this standalone service";
      }
    }

    if (formData.unitPrice === "" || isNaN(Number(formData.unitPrice)) || Number(formData.unitPrice) < 0) {
      newErrors.unitPrice = "Please enter a valid price";
    }
    if (formData.taxRate !== "" && (isNaN(Number(formData.taxRate)) || Number(formData.taxRate) < 0 || Number(formData.taxRate) > 100)) {
      newErrors.taxRate = "Tax rate must be between 0 and 100%";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const selectedParent = availableProducts.find((p) => p._id === formData.parentProduct);
      
      const payload = {
        name: formData.name.trim(),
        sku: formData.type === "Product" 
          ? formData.sku.trim().toUpperCase() 
          : (formData.sku.trim() || undefined),
        type: formData.type,
        category: formData.category || (selectedParent?.category?._id || selectedParent?.category || undefined),
        description: formData.description.trim(),
        unitPrice: Number(formData.unitPrice),
        currency: formData.currency || selectedParent?.currency || "INR",
        taxRate: formData.taxRate !== "" ? Number(formData.taxRate) : (selectedParent?.taxRate ?? 18),
        billingUnit: formData.billingUnit,
        hsnSac: formData.hsnSac.trim() || (formData.type === "Service" ? selectedParent?.hsnSac || "" : ""),
        isActive: formData.isActive,
        // Product specs
        brand: formData.type === "Product" ? formData.brand.trim() : undefined,
        modelNumber: formData.type === "Product" ? formData.modelNumber.trim() : undefined,
        warrantyPeriod: formData.type === "Product" ? formData.warrantyPeriod.trim() : undefined,
        dimensions: formData.type === "Product" ? formData.dimensions.trim() : undefined,
        weight: formData.type === "Product" ? formData.weight.trim() : undefined,
        // Service specs
        parentProduct: formData.type === "Service" ? formData.parentProduct || undefined : undefined,
        serviceType: formData.type === "Service" ? formData.serviceType : undefined,
        serviceScope: formData.type === "Service" ? formData.serviceScope.trim() : undefined,
        deliveryMode: formData.type === "Service" ? formData.deliveryMode : undefined,
        slaResponseTime: formData.type === "Service" ? formData.slaResponseTime.trim() : undefined,
        duration: formData.type === "Service" ? formData.duration.trim() : undefined,
        deliverables: formData.type === "Service" ? formData.deliverables.trim() : undefined,
        customFields: formData.customFields || [],
        attributes: {
          brand: formData.brand.trim(),
          modelNumber: formData.modelNumber.trim(),
          warrantyPeriod: formData.warrantyPeriod.trim(),
          dimensions: formData.dimensions.trim(),
          weight: formData.weight.trim(),
          parentProduct: formData.parentProduct || null,
          serviceType: formData.serviceType,
          serviceScope: formData.serviceScope.trim(),
          deliveryMode: formData.deliveryMode,
          slaResponseTime: formData.slaResponseTime.trim(),
          duration: formData.duration.trim(),
          deliverables: formData.deliverables.trim(),
          customFields: formData.customFields || [],
        },
      };

      if (editingItem && editingItem._id) {
        await updateCatalogItem(editingItem._id, payload);
        toast.success(`${payload.type} updated successfully!`);
      } else {
        await createCatalogItem(payload);
        toast.success(`${payload.type} created successfully!`);
      }

      onItemSaved();
      onClose();
    } catch (err) {
      console.error("Save catalog item error:", err);
      const msg = err.response?.data?.message || err.response?.data?.error || "Failed to save item";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCustomField = () => {
    if (!newFieldName.trim()) {
      toast.error("Please enter a field name");
      return;
    }
    const newField = {
      id: `cf-${Date.now()}`,
      fieldName: newFieldName.trim(),
      fieldValue: newFieldValue.trim(),
    };
    setFormData((prev) => ({
      ...prev,
      customFields: [...(prev.customFields || []), newField],
    }));
    setNewFieldName("");
    setNewFieldValue("");
    setShowAddCustomField(false);
  };

  const handleRemoveCustomField = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      customFields: prev.customFields.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  const handleCustomFieldValueChange = (index, value) => {
    setFormData((prev) => {
      const updated = [...(prev.customFields || [])];
      updated[index] = { ...updated[index], fieldValue: value };
      return { ...prev, customFields: updated };
    });
  };

  const selectedParentProduct = availableProducts.find((p) => p._id === formData.parentProduct);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-150 w-full max-w-2xl my-auto max-h-[92vh] flex flex-col overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-xs shrink-0 ${
              formData.type === "Service" ? "bg-purple-50 border border-purple-100 text-purple-600" : "bg-blue-50 border border-blue-100 text-blue-600"
            }`}>
              {formData.type === "Service" ? <Wrench size={20} /> : <Package size={20} />}
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-800 truncate">
                {editingItem && editingItem._id 
                  ? `Edit ${formData.type}` 
                  : (formData.type === "Service" ? "Add Service for Product" : "Add Product")}
              </h2>
              <p className="text-xs text-slate-500 truncate hidden sm:block">
                {formData.type === "Service" 
                  ? "Attach a warranty, AMC, installation, or maintenance service to an existing product"
                  : "Configure product details, SKU, and unit pricing"}
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
          {/* Top Toggle: Product vs Service */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Item Type <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setFormData((p) => ({ ...p, type: "Product", billingUnit: "unit" }))}
                className={`flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  formData.type === "Product"
                    ? "bg-white text-blue-600 shadow-sm border border-slate-200/60"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Package size={15} />
                Product
              </button>
              <button
                type="button"
                onClick={() => setFormData((p) => ({ ...p, type: "Service", billingUnit: "year" }))}
                className={`flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  formData.type === "Service"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Wrench size={15} />
                Service (AMC / Installation / Support)
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* DEDICATED SERVICE UI: ONLY SHOW LINKED PRODUCT & SERVICE DETAILS         */}
          {/* ========================================================================= */}
          {formData.type === "Service" ? (
            <div className="space-y-4">
              {/* 1. SELECT LINKED PRODUCT OR STANDALONE */}
              <div className="p-3.5 sm:p-4 rounded-2xl border-2 border-purple-200 bg-purple-50/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Link2 size={16} className="text-purple-600" />
                    Linked Product <span className="text-[11px] font-normal text-purple-600">(Optional)</span>
                  </label>
                  <span className="text-[0.68rem] font-semibold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-md">
                    {formData.parentProduct ? "Auto-links specs & category" : "Standalone Service"}
                  </span>
                </div>

                <select
                  name="parentProduct"
                  value={formData.parentProduct}
                  onChange={(e) => handleSelectParentProduct(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-purple-300 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:border-purple-500 focus:ring-purple-200 transition-all cursor-pointer"
                >
                  <option value="">-- None (Standalone Service - No Product Required) --</option>
                  {availableProducts.map((p) => (
                    <option key={p._id} value={p._id}>
                      📦 {p.name} {p.sku ? `(${p.sku})` : ""} - ₹{p.unitPrice || 0}
                    </option>
                  ))}
                </select>

                {/* Linked Product Preview Banner */}
                {selectedParentProduct ? (
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-purple-200/80 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                      <span>
                        Auto-linked to: <strong className="text-slate-900">{selectedParentProduct.name}</strong> 
                        {selectedParentProduct.categoryName ? ` • Category: ${selectedParentProduct.categoryName}` : ""}
                      </span>
                    </div>
                    <span className="font-semibold text-purple-700 shrink-0">
                      Currency: {selectedParentProduct.currency || "INR"}
                    </span>
                  </div>
                ) : (
                  /* Standalone: Let user pick category directly */
                  <div className="pt-2 border-t border-purple-200/70">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Service Category <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className={`w-full px-3.5 py-2 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all cursor-pointer ${
                        errors.category
                          ? "border-rose-400 focus:ring-rose-200"
                          : "border-slate-200 focus:border-purple-500 focus:ring-purple-100"
                      }`}
                    >
                      <option value="">-- Select Service Category --</option>
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat._id}>
                          {cat.icon ? `${cat.icon} ` : ""}{cat.name}
                        </option>
                      ))}
                    </select>
                    {errors.category && <p className="text-xs text-rose-600 font-medium mt-1">{errors.category}</p>}
                  </div>
                )}
              </div>

              {/* 2. SERVICE NAME & SERVICE TYPE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Service Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Annual Maintenance Contract (AMC)"
                    className={`w-full px-3.5 py-2 text-sm rounded-xl border bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                      errors.name
                        ? "border-rose-300 focus:ring-rose-200"
                        : "border-slate-200 focus:border-purple-500 focus:ring-purple-100"
                    }`}
                  />
                  {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Service Type / Nature
                  </label>
                  <select
                    name="serviceType"
                    value={formData.serviceType}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:border-purple-500 focus:ring-purple-100 transition-all cursor-pointer"
                  >
                    {SERVICE_NATURES.map((nat) => (
                      <option key={nat} value={nat}>
                        {nat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. SERVICE PRICING & BILLING UNIT */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Service Price <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm font-semibold text-slate-500 select-none min-w-[18px] text-center">{currentSymbol}</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      name="unitPrice"
                      value={formData.unitPrice}
                      onChange={handleChange}
                      placeholder="e.g. 5000"
                      className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                        errors.unitPrice
                          ? "border-rose-300 focus:ring-rose-200"
                          : "border-slate-200 focus:border-purple-500 focus:ring-purple-100"
                      }`}
                    />
                  </div>
                  {errors.unitPrice && <p className="text-xs text-rose-500 mt-1">{errors.unitPrice}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Billing Frequency
                  </label>
                  <select
                    name="billingUnit"
                    value={formData.billingUnit}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:border-purple-500 focus:ring-purple-100 transition-all cursor-pointer"
                  >
                    {BILLING_UNITS_SERVICE.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tax Rate (%)
                  </label>
                  <div className="relative">
                    <Percent size={16} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      name="taxRate"
                      value={formData.taxRate}
                      onChange={handleChange}
                      placeholder="18"
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:border-purple-500 focus:ring-purple-100 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* 4. SERVICE DELIVERY & SLA SPECIFICS */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-600 inline-block" />
                  Service Delivery & Terms
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Delivery Mode
                    </label>
                    <select
                      name="deliveryMode"
                      value={formData.deliveryMode}
                      onChange={handleChange}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                    >
                      <option value="On-site">On-site (At customer location)</option>
                      <option value="Remote">Remote / Online</option>
                      <option value="Hybrid">Hybrid (Remote + On-site)</option>
                      <option value="Workshop">Workshop / Service Center</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      SLA / Response Time
                    </label>
                    <input
                      type="text"
                      name="slaResponseTime"
                      value={formData.slaResponseTime}
                      onChange={handleChange}
                      placeholder="e.g. 24 Hours, 4 Hours on-site"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Coverage Duration
                    </label>
                    <input
                      type="text"
                      name="duration"
                      value={formData.duration}
                      onChange={handleChange}
                      placeholder="e.g. 1 Year, 6 Months"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Service Scope & Deliverables
                  </label>
                  <textarea
                    rows={2}
                    name="serviceScope"
                    value={formData.serviceScope}
                    onChange={handleChange}
                    placeholder="e.g. Includes 4 quarterly preventive visits, free spare parts replacement up to ₹10,000, 24/7 priority call desk."
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* DEDICATED PRODUCT UI: SKU, CATEGORY, HARDWARE SPECS                       */
            /* ========================================================================= */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Product Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Medical Imaging System X100"
                    className={`w-full px-3.5 py-2 text-sm rounded-xl border bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                      errors.name
                        ? "border-rose-300 focus:ring-rose-200"
                        : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                    }`}
                  />
                  {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    SKU / Product Code <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Hash size={16} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      name="sku"
                      value={formData.sku}
                      onChange={handleChange}
                      placeholder="e.g. PRD-MED-100"
                      className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 transition-all uppercase ${
                        errors.sku
                          ? "border-rose-300 focus:ring-rose-200"
                          : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                      }`}
                    />
                  </div>
                  {errors.sku && <p className="text-xs text-rose-500 mt-1">{errors.sku}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-100 transition-all cursor-pointer"
                  >
                    <option value="">No Category</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.icon ? `${cat.icon} ` : ""}{cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    HSN / SAC Code
                  </label>
                  <input
                    type="text"
                    name="hsnSac"
                    value={formData.hsnSac}
                    onChange={handleChange}
                    placeholder="e.g. 8471 or 9018"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              {/* Pricing & Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Unit Price <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm font-semibold text-slate-500 select-none min-w-[18px] text-center">{currentSymbol}</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      name="unitPrice"
                      value={formData.unitPrice}
                      onChange={handleChange}
                      placeholder="0.00"
                      className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                        errors.unitPrice
                          ? "border-rose-300 focus:ring-rose-200"
                          : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                      }`}
                    />
                  </div>
                  {errors.unitPrice && <p className="text-xs text-rose-500 mt-1">{errors.unitPrice}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Currency
                  </label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleCurrencyChange}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-100 transition-all"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.symbol} - {c.code} ({c.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Billing Unit
                  </label>
                  <select
                    name="billingUnit"
                    value={formData.billingUnit}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-100 transition-all"
                  >
                    {BILLING_UNITS_PRODUCT.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Hardware Specifications */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                  Product Hardware & Specifications
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Brand / Manufacturer
                    </label>
                    <input
                      type="text"
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      placeholder="e.g. Philips, GE, Techzar"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Model / Part Number
                    </label>
                    <input
                      type="text"
                      name="modelNumber"
                      value={formData.modelNumber}
                      onChange={handleChange}
                      placeholder="e.g. MOD-2024-X"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Warranty Period
                    </label>
                    <input
                      type="text"
                      name="warrantyPeriod"
                      value={formData.warrantyPeriod}
                      onChange={handleChange}
                      placeholder="e.g. 1 Year Standard"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Dimensions / Weight
                    </label>
                    <input
                      type="text"
                      name="dimensions"
                      value={formData.dimensions}
                      onChange={handleChange}
                      placeholder="e.g. 50 x 30 x 20 cm / 5 kg"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Description / Notes
            </label>
            <textarea
              name="description"
              rows={2}
              value={formData.description}
              onChange={handleChange}
              placeholder={formData.type === "Service" ? "Additional terms or notes for this service..." : "Provide product description..."}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-100 transition-all resize-none"
            />
          </div>

          {/* DYNAMIC CUSTOM EXTRA FIELDS SECTION */}
          <div className="pt-2 border-t border-slate-200/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[0.7rem] font-bold text-slate-600 uppercase tracking-wider">
                Additional Custom Attributes
              </span>
              {!showAddCustomField && (
                <button
                  type="button"
                  onClick={() => setShowAddCustomField(true)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                >
                  + Add Extra Field
                </button>
              )}
            </div>

            {formData.customFields && formData.customFields.length > 0 && (
              <div className="space-y-2 mb-2.5">
                {formData.customFields.map((field, idx) => (
                  <div
                    key={field.id || idx}
                    className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 text-xs"
                  >
                    <span className="font-semibold text-slate-700 min-w-[120px] truncate">
                      {field.fieldName}:
                    </span>
                    <input
                      type="text"
                      value={field.fieldValue || ""}
                      onChange={(e) => handleCustomFieldValueChange(idx, e.target.value)}
                      placeholder="Value..."
                      className="flex-1 px-2.5 py-1 text-xs rounded border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomField(idx)}
                      className="text-slate-400 hover:text-rose-600 transition px-1"
                      title="Remove attribute"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showAddCustomField && (
              <div className="p-2.5 rounded-lg bg-white border border-blue-200 shadow-xs space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    placeholder="Attribute Name (e.g. SLA Level, Priority)"
                    className="px-2.5 py-1.5 text-xs rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={newFieldValue}
                    onChange={(e) => setNewFieldValue(e.target.value)}
                    placeholder="Attribute Value"
                    className="px-2.5 py-1.5 text-xs rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddCustomField(false)}
                    className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCustomField}
                    className="px-3 py-1 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Add Field
                  </button>
                </div>
              </div>
            )}
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
              <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
            <span className="text-sm font-medium text-slate-700">
              Active in Catalog (Available for deals and invoices)
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
              className={`px-6 py-2 text-sm font-medium text-white rounded-xl shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                formData.type === "Service" ? "bg-purple-600 hover:bg-purple-700" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isSubmitting
                ? "Saving..."
                : editingItem && editingItem._id
                ? `Update ${formData.type}`
                : `Create ${formData.type}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CatalogItemModal;
