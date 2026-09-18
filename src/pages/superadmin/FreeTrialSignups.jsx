import React, { useEffect, useRef, useState, useCallback ,} from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  Rocket,
  Search,
  Trash2,
  AlertTriangle,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  ChevronDown,
  SlidersHorizontal,
  Check,
} from "lucide-react";
import { superApi } from "../../services/api";

const PERIOD_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "weekly", label: "Last 7 Days" },
  { value: "monthly", label: "Last 30 Days" },
  { value: "custom", label: "Custom Range" },
];

const FILTER_FIELDS = [
  { key: "search", label: "Search" },
  { key: "industry", label: "Industry" },
  { key: "package", label: "Package" },
  { key: "country", label: "Country" },
  { key: "trialStatus", label: "Trial Status" },
  { key: "signupDate", label: "Signup Date" },
];

const FILTER_FIELDS_STORAGE_KEY = "superadmin_freetrial_filter_fields";

const TrialStatusBadge = ({ tenant }) => {
  if (!tenant) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700">
        Unknown
      </span>
    );
  }

  const isExpired = tenant.plan_end_date && new Date(tenant.plan_end_date) < new Date();

  if (!tenant.isActive) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700">
        Inactive
      </span>
    );
  }

  if (tenant.plan_status === "expired") {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800">
        Expired
      </span>
    );
  }

  if (tenant.plan_status === "grace") {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border bg-orange-50 text-orange-700 border-orange-200">
        Grace Period
      </span>
    );
  }

  if (tenant.plan_status === "trial" && isExpired) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border bg-amber-50 text-amber-700 border-amber-200">
        Trial Expired
      </span>
    );
  }

  if (tenant.plan_status === "trial") {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border bg-blue-50 dark:bg-blue-900/30 text-blue-700 border-blue-200">
        On Trial
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
      Converted
    </span>
  );
};

const FreeTrialSignups = () => {
  const navigate = useNavigate();

  const [signups, setSignups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [packageFilter, setPackageFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [trialStatusFilter, setTrialStatusFilter] = useState("all");
  const [filterOptions, setFilterOptions] = useState({
    industries: [],
    packages: [],
    countries: [],
    trialStatuses: [],
  });

  const [showFilters, setShowFilters] = useState(false);
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

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [tenantsList, setTenantsList] = useState([]);

  const fetchTenantsList = async () => {
    try {
      const res = await superApi.get("/tenants");
      if (res.data && Array.isArray(res.data.tenants)) {
        setTenantsList(res.data.tenants);
      } else if (res.data && Array.isArray(res.data.data)) {
        setTenantsList(res.data.data);
      } else if (res.data && Array.isArray(res.data)) {
        setTenantsList(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch tenants list for mapping:", err);
    }
  };

  const handleRowClick = (id) => {
    navigate(`/superadmin/free-trials/${id}`);
  };

  const fetchSignups = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit };
      if (search.trim()) params.search = search.trim();
      if (period === "weekly" || period === "monthly") params.period = period;
      if (period === "custom") {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }
      if (industryFilter !== "all") params.industry = industryFilter;
      if (packageFilter !== "all") params.package = packageFilter;
      if (countryFilter !== "all") params.country = countryFilter;
      if (trialStatusFilter !== "all") params.trialStatus = trialStatusFilter;

      const res = await superApi.get("/free-trials", { params });
      setSignups(res.data?.data || []);
      setPagination(res.data?.pagination || { total: 0, totalPages: 1 });
    } catch (err) {
      console.error("Failed to fetch free trial signups:", err);
      setError("Failed to fetch free trial signups. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const res = await superApi.get("/free-trials/filter-options");
      setFilterOptions({
        industries: res.data?.industries || [],
        packages: res.data?.packages || [],
        countries: res.data?.countries || [],
        trialStatuses: res.data?.trialStatuses || [],
      });
    } catch (err) {
      console.error("Failed to fetch free trial filter options:", err);
    }
  };

  useEffect(() => {
    fetchSignups();
    fetchTenantsList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, period, startDate, endDate, limit, industryFilter, packageFilter, countryFilter, trialStatusFilter]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

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

  // Debounce search input
  useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 400);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const handleIndustryChange = (value) => {
    setIndustryFilter(value);
    setPage(1);
  };

  const handlePackageChange = (value) => {
    setPackageFilter(value);
    setPage(1);
  };

  const handleCountryChange = (value) => {
    setCountryFilter(value);
    setPage(1);
  };

  const handleTrialStatusChange = (value) => {
    setTrialStatusFilter(value);
    setPage(1);
  };

  const handlePeriodChange = (value) => {
    setPeriod(value);
    setPage(1);
    if (value !== "custom") {
      setStartDate("");
      setEndDate("");
    }
  };

  const resetFieldValue = (key) => {
    if (key === "search") {
      setSearchInput("");
      setSearch("");
    }
    if (key === "industry") setIndustryFilter("all");
    if (key === "package") setPackageFilter("all");
    if (key === "country") setCountryFilter("all");
    if (key === "trialStatus") setTrialStatusFilter("all");
    if (key === "signupDate") {
      setPeriod("all");
      setStartDate("");
      setEndDate("");
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
    setSearchInput("");
    setSearch("");
    setIndustryFilter("all");
    setPackageFilter("all");
    setCountryFilter("all");
    setTrialStatusFilter("all");
    setPeriod("all");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const hasActiveFilters =
    search !== "" ||
    industryFilter !== "all" ||
    packageFilter !== "all" ||
    countryFilter !== "all" ||
    trialStatusFilter !== "all" ||
    period !== "all";

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteConfirmText.toLowerCase() !== "delete") {
      alert("Please type 'delete' to confirm.");
      return;
    }

    setIsDeleting(true);
    try {
      await superApi.delete(`/free-trials/${deleteTarget._id}`);
      setDeleteTarget(null);
      setDeleteConfirmText("");
      // If we deleted the last row on a page beyond page 1, step back a page
      if (signups.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        fetchSignups();
      }
    } catch (err) {
      console.error("Failed to delete free trial signup:", err);
      alert(err.response?.data?.error || "Failed to delete signup record.");
    } finally {
      setIsDeleting(false);
    }
  };

  const { total = 0, totalPages = 1 } = pagination;
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, total);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-slate-900 dark:text-white flex items-center gap-2">
            <Rocket size={22} className="text-[#008ecc] dark:text-[#33b8ff]" />
            Free Trial Signups
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-400">All data submitted through the landing page free trial form.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-xl text-sm">
          <span>{error}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        {/* Filter Toggle Bar */}
        <div className="p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md font-medium text-sm transition-colors border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
            >
              <Filter className="w-4 h-4" />
              <span>Signup Filter</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </button>

            <div className="relative" ref={fieldPickerRef}>
              <button
                onClick={() => setShowFieldPicker((v) => !v)}
                title="Choose which filters to show"
                className="flex items-center gap-2 px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md font-medium text-sm transition-colors border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
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
              <div className="flex flex-col lg:flex-row lg:items-center gap-3 flex-wrap">
                {activeFilterFields.includes("search") && (
                  <div className="relative w-full lg:max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                    <input
                      type="text"
                      placeholder="Search by name, email, or business name..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] focus:border-transparent bg-white dark:bg-slate-900 shadow-inner"
                    />
                  </div>
                )}

                {activeFilterFields.includes("industry") && (
                  <select
                    value={industryFilter}
                    onChange={(e) => handleIndustryChange(e.target.value)}
                    className="border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] focus:border-transparent bg-white dark:bg-slate-900 shadow-inner cursor-pointer"
                  >
                    <option value="all">All Industries</option>
                    {filterOptions.industries.map((industry) => (
                      <option key={industry} value={industry}>
                        {industry}
                      </option>
                    ))}
                  </select>
                )}

                {activeFilterFields.includes("package") && (
                  <select
                    value={packageFilter}
                    onChange={(e) => handlePackageChange(e.target.value)}
                    className="border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] focus:border-transparent bg-white dark:bg-slate-900 shadow-inner cursor-pointer"
                  >
                    <option value="all">All Packages</option>
                    {filterOptions.packages.map((pkg) => (
                      <option key={pkg} value={pkg}>
                        {pkg}
                      </option>
                    ))}
                  </select>
                )}

                {activeFilterFields.includes("country") && (
                  <select
                    value={countryFilter}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] focus:border-transparent bg-white dark:bg-slate-900 shadow-inner cursor-pointer"
                  >
                    <option value="all">All Countries</option>
                    {filterOptions.countries.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                )}

                {activeFilterFields.includes("trialStatus") && (
                  <select
                    value={trialStatusFilter}
                    onChange={(e) => handleTrialStatusChange(e.target.value)}
                    className="border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] focus:border-transparent bg-white dark:bg-slate-900 shadow-inner cursor-pointer"
                  >
                    <option value="all">All Trial Statuses</option>
                    {filterOptions.trialStatuses.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                )}

                {activeFilterFields.includes("signupDate") && (
                  <>
                    <div className="flex items-center gap-2 flex-wrap">
                      {PERIOD_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => handlePeriodChange(opt.value)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${period === opt.value
                            ? "bg-[#008ecc] text-white border-[#008ecc] shadow-sm"
                            : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-[#008ecc]/40 hover:text-[#008ecc] dark:text-[#33b8ff]"
                            }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {period === "custom" && (
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => {
                            setStartDate(e.target.value);
                            setPage(1);
                          }}
                          className="border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] bg-white dark:bg-slate-900"
                        />
                        <span className="text-slate-400 dark:text-slate-500 text-sm">to</span>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => {
                            setEndDate(e.target.value);
                            setPage(1);
                          }}
                          className="border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc] bg-white dark:bg-slate-900"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase text-xs font-bold border-b border-slate-200 dark:border-slate-700">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Business Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Industry</th>
                <th className="px-6 py-4">Country</th>
                <th className="px-6 py-4">Package</th>
                <th className="px-6 py-4">Signup Date</th>
                <th className="px-6 py-4 text-center">Trial Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 text-sm ${loading && signups.length > 0 ? "opacity-50 pointer-events-none" : ""}`}>
              {loading && signups.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="animate-spin text-[#008ecc] dark:text-[#33b8ff]" size={32} />
                      <span className="font-medium">Loading free trial signups...</span>
                    </div>
                  </td>
                </tr>
              ) : signups.length > 0 ? (
                signups.map((s) => (
                  <tr 
                    key={s._id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-bold">
                      <span
                        onClick={() => handleRowClick(s._id)}
                        className="cursor-pointer text-[#008ecc] dark:text-[#33b8ff] hover:underline transition-all"
                      >
                        {s.name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-[#008ecc] dark:text-[#33b8ff] bg-[#f2fbff] dark:bg-blue-900/30 rounded px-2.5 py-1 border border-blue-100 dark:border-blue-800/50 font-semibold">
                        {s.businessName}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{s.email}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{s.industry || "—"}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{s.country || "—"}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-semibold text-[#008ecc] dark:text-[#33b8ff]">
                      {(() => {
                        const tId = typeof s.tenant === 'object' ? s.tenant?._id : s.tenant;
                        const fullT = tenantsList.find(t => t._id === tId);
                        return fullT?.plan_id?.plan_name || s.tenant?.plan_id?.plan_name || s.interestedPackage || "—";
                      })()}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                      {s.createdAt ? format(new Date(s.createdAt), "MMM dd, yyyy") : "N/A"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <TrialStatusBadge tenant={s.tenant} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-3">
                        {s.tenant?.slug && (
                          <a
                            href={`/${s.tenant.slug}/login`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-[#008ecc]/40 hover:text-[#008ecc] dark:text-[#33b8ff] transition-all cursor-pointer flex items-center justify-center"
                            title="Open tenant login"
                          >
                            <ExternalLink size={15} />
                          </a>
                        )}
                        {(() => {
                          const isConverted = s.tenant && s.tenant.isActive && !["trial", "grace", "expired"].includes(s.tenant.plan_status);
                          return (
                            <button
                              onClick={() => setDeleteTarget(s)}
                              disabled={isConverted}
                              className={`p-1.5 border rounded-lg transition-all flex items-center justify-center ${
                                isConverted
                                  ? "border-slate-100 dark:border-slate-800 text-slate-300 bg-slate-50 dark:bg-slate-800/80 cursor-not-allowed"
                                  : "border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200 cursor-pointer"
                              }`}
                              title={isConverted ? "Cannot delete a Converted trial" : "Delete Signup Record"}
                            >
                              <Trash2 size={15} />
                            </button>
                          );
                        })()}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                    No free trial signups found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                Showing <span className="text-slate-700 dark:text-slate-300">{rangeStart}</span>–<span className="text-slate-700 dark:text-slate-300">{rangeEnd}</span> of <span className="text-slate-700 dark:text-slate-300">{total}</span> signups
              </span>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>Rows per page:</span>
                <select
                  value={limit}
                  onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008ecc]/50 cursor-pointer"
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
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 hover:border-[#008ecc]/40 hover:text-[#008ecc] dark:text-[#33b8ff] text-slate-600 dark:text-slate-400 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-sm"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 py-1.5 rounded-xl shadow-sm">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 hover:border-[#008ecc]/40 hover:text-[#008ecc] dark:text-[#33b8ff] text-slate-600 dark:text-slate-400 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-sm"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-red-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 bg-red-600 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle size={22} />
                <h3 className="">Delete Signup Record</h3>
              </div>
              <button
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteConfirmText("");
                }}
                className="text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-red-800">
                <AlertTriangle size={24} className="flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="">This only removes the signup log entry</h3>
                  <p className="text-base text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    This deletes the free trial signup record for <strong>{deleteTarget.businessName}</strong> ({deleteTarget.email}) from this list. It does <strong>not</strong> delete the tenant's workspace or database — manage that from the Tenants page.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Type <span className="font-bold text-red-600">"delete"</span> below to confirm:
                </label>
                <input
                  type="text"
                  placeholder="delete"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 font-mono text-center"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => {
                    setDeleteTarget(null);
                    setDeleteConfirmText("");
                  }}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteConfirmText.toLowerCase() !== "delete" || isDeleting}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 cursor-pointer text-sm shadow-md"
                >
                  {isDeleting ? "Deleting..." : "Delete Record"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FreeTrialSignups;
