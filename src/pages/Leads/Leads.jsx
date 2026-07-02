import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import { TourProvider, useTour } from "@reactour/tour";
import { useTranslation } from "react-i18next";

import {
  MoreVertical,
  Trash2,
  Edit,
  Handshake,
  Search,
  Plus,
  Eye,
  Calendar,
  Bell,
  MessageSquarePlus,
} from "lucide-react";

import { initSocket } from "../../utils/socket";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

const API_URL = import.meta.env.VITE_API_URL;

/* ── Tour Steps (i18n-aware) ─────────────────────── */
const getTourSteps = (t) => [
  { selector: ".tour-lead-header",   content: t("leads.tour.welcome") },
  { selector: ".tour-create-lead",   content: t("leads.tour.createLead") },
  { selector: ".tour-search",        content: t("leads.tour.search") },
  { selector: ".tour-filters",       content: t("leads.tour.filters") },
  { selector: ".tour-lead-table",    content: t("leads.tour.table") },
  { selector: ".tour-checkbox",      content: t("leads.tour.checkbox") },
  { selector: ".tour-lead-actions",  content: t("leads.tour.actions") },
  { selector: ".tour-finish",        content: t("leads.tour.finish") },
];

/* ── Lead Table Component ─────────────────────── */
function LeadTableComponent() {
  const navigate = useNavigate();
  const { tenantSlug } = useParams();
  const location = useLocation();
  const { setIsOpen } = useTour();
  const { t } = useTranslation();

  const [leads, setLeads] = useState([]);
  const [selectedLeads, setSelectedLeads] = useState([]);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState(null);

  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLeads, setTotalLeads] = useState(0);
  const itemsPerPage = 10;

  const [menuOpen, setMenuOpen] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 1 });

  const [userRole, setUserRole] = useState("");
  const [targetLinkedLeadIds, setTargetLinkedLeadIds] = useState(new Map());

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [clientTypeFilter, setClientTypeFilter] = useState("");
  const [followUpFilter, setFollowUpFilter] = useState(
    location.state?.followUpFilter === "missed" ? "missed" : "all"
  );
  
  // Store users with their IDs for assignee filter
  const [usersList, setUsersList] = useState([]);

  // Convert Deal Modal
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [converting, setConverting] = useState(false);

  const [dealData, setDealData] = useState({
    value: 0,
    currency: "USD",
    notes: "",
    stage: "Qualification",
  });

  // Inline follow-up editor state
  const dateInputRefs = useRef({});
  const [editingFollowUpId, setEditingFollowUpId] = useState(null);
  const [followUpSavingId, setFollowUpSavingId] = useState(null);

  // Add Follow-up Note modal
  const [addNoteModalOpen, setAddNoteModalOpen] = useState(false);
  const [noteLead, setNoteLead] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Follow-up History modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyLead, setHistoryLead] = useState(null);

  const startTour = () => setIsOpen(true);

  // user role
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      setUserRole(user.role?.name || "");
    }
  }, []);

  // Fetch users for assignee filter
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsersList(response.data.users || []);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };
    fetchUsers();
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, sourceFilter, assigneeFilter, followUpFilter]);

  // currencies
  const allowedCurrencies = [
    { code: "USD", symbol: "$", name: "US Dollar" },
    { code: "EUR", symbol: "€", name: "Euro" },
    { code: "INR", symbol: "₹", name: "Indian Rupee" },
    { code: "GBP", symbol: "£", name: "British Pound" },
    { code: "JPY", symbol: "¥", name: "Japanese Yen" },
    { code: "AUD", symbol: "A$", name: "Australian Dollar" },
    { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
    { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
    { code: "MYR", symbol: "RM", name: "Malaysian Ringgit" },
    { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
    { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
    { code: "ZAR", symbol: "R", name: "South African Rand" },
    { code: "SAR", symbol: "﷼", name: "Saudi Riyal" },
  ];

  useEffect(() => {
    initSocket();
  }, []);

  // fetch leads
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
      });

    // Search filter - make sure it's properly trimmed
    if (debouncedSearch && debouncedSearch.trim()) {
      params.append("search", debouncedSearch.trim());
    }
    
    // Status filter - send only if not empty
    if (statusFilter && statusFilter !== "") {
      params.append("status", statusFilter);
    }
    
    // Source filter - send only if not empty
    if (sourceFilter && sourceFilter !== "") {
      params.append("source", sourceFilter);
    }

    // client filter 
    if (clientTypeFilter && clientTypeFilter !== "") {
      params.append("clientType", clientTypeFilter);
    }

    // Assignee filter - send the user ID directly
    if (assigneeFilter && assigneeFilter !== "") {
      params.append("assignee", assigneeFilter);
    }

    // Follow-up filter
    if (followUpFilter === "missed" || followUpFilter === "completed") {
      params.append("followUpStatus", followUpFilter);
    }

      console.log("Fetching leads with params:", Object.fromEntries(params));

      const { data } = await axios.get(
        `${API_URL}/leads/getAllLead?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const isNew = data && !Array.isArray(data) && Array.isArray(data.leads);
      const leadsArr = isNew ? data.leads : (Array.isArray(data) ? data : []);
      const total = isNew ? data.totalLeads : leadsArr.length;
      const pages = isNew ? data.totalPages : Math.ceil(leadsArr.length / itemsPerPage);

      setLeads(leadsArr);
      setTotalLeads(total);
      setTotalPages(pages);

    } catch (err) {
      console.error("Fetch leads error:", err);
      toast.error(t("leads.toast.fetchFailed"));
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, statusFilter, sourceFilter, assigneeFilter, clientTypeFilter,followUpFilter, itemsPerPage, t]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Fetch target-linked lead IDs for sales users
  useEffect(() => {
    const userData = localStorage.getItem("user");
    const role = userData ? (JSON.parse(userData)?.role?.name || "") : "";
    if (role === "Admin") return;
    const token = localStorage.getItem("token");
    const tenantSlugVal = window.location.pathname.split("/")[1];
    const si = import.meta.env.VITE_SI_URI || "http://localhost:5000";
    axios.get(`${si}/${tenantSlugVal}/api/targets/my`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        const map = new Map();
        (r.data || []).forEach(t => (t.linkedLeads || []).forEach(l => {
          map.set(String(l._id || l), { startDate: t.startDate, endDate: t.endDate, assignedAt: t.createdAt });
        }));
        setTargetLinkedLeadIds(map);
      })
      .catch(() => {});
  }, []);

  // Pagination helpers
  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    setSelectedLeads([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [];
    const left = Math.max(2, currentPage - 1);
    const right = Math.min(totalPages - 1, currentPage + 1);
    pages.push(1);
    if (left > 2) pages.push("...");
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  const handleMenuToggle = (leadId, e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const menuHeight = 120;
    const viewportHeight = window.innerHeight;

    let top = rect.bottom + window.scrollY + 4;
    let left = rect.right + window.scrollX - 160;

    if (rect.bottom + menuHeight > viewportHeight) {
      top = rect.top + window.scrollY - menuHeight - 4;
    }

    setMenuPosition({ top, left });
    setMenuOpen(menuOpen === leadId ? null : leadId);
  };

  const handleEdit = (leadId) => {
    navigate(`/${tenantSlug}/createleads?id=${leadId}`);
    setMenuOpen(null);
  };

  const handleDeleteClick = (leadId) => {
    setLeadToDelete(leadId);
    setShowDeleteModal(true);
    setMenuOpen(null);
  };

  const handleDeleteLead = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.delete(`${API_URL}/leads/deleteLead/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 200) {
        setLeads((prev) => prev.filter((lead) => lead._id !== id));
        toast.success(t("leads.toast.deleteSuccess"));
        if (leads.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
        fetchLeads();
      } else {
        toast.error(t("leads.toast.deleteFailed"));
      }
    } catch (error) {
      toast.error(t("leads.toast.deleteError"));
    } finally {
      setShowDeleteModal(false);
      setLeadToDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    try {
      const token = localStorage.getItem("token");
      const responses = await Promise.all(
        selectedLeads.map((id) =>
          axios.delete(`${API_URL}/leads/deleteLead/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );

      const allSuccess = responses.every((res) => res.status === 200);
      if (allSuccess) {
        setLeads((prev) => prev.filter((l) => !selectedLeads.includes(l._id)));
        toast.success(t("leads.toast.bulkDeleteSuccess", { count: selectedLeads.length }));
        setSelectedLeads([]);
        if (leads.length === selectedLeads.length && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
        fetchLeads();
      } else {
        toast.error(t("leads.toast.bulkDeletePartialFail"));
      }
    } catch (error) {
      toast.error(t("leads.toast.bulkDeleteError"));
    } finally {
      setShowDeleteModal(false);
    }
  };

  const handleSelectLead = (id) => {
    setSelectedLeads((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedLeads(leads.map((l) => l._id));
    else setSelectedLeads([]);
  };

  // Convert Modal
  const openConvertModal = (lead) => {
    setSelectedLead(lead);
    setDealData({
      value: lead.value || 0,
      currency: lead.currency || "USD",
      notes: lead.notes || "",
      stage: "Qualification",
    });
    setConvertModalOpen(true);
    setMenuOpen(null);
  };

  const handleDealFieldChange = (field, value) => {
    setDealData((prev) => ({ ...prev, [field]: value }));
  };

  const handleConvertDeal = async () => {
    if (!selectedLead) return;

    try {
      setConverting(true);
      const token = localStorage.getItem("token");
      const toastId = toast.loading(t("leads.toast.convertingLoad"));

      const response = await axios.patch(
        `${API_URL}/leads/${selectedLead._id}/convert`,
        { ...dealData },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.update(toastId, {
        render: response.data.message || t("leads.toast.convertingLoad"),
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });

      setLeads((prev) => prev.filter((l) => l._id !== selectedLead._id));
      setSelectedLeads((prev) => prev.filter((id) => id !== selectedLead._id));
      setConvertModalOpen(false);
      setSelectedLead(null);
      fetchLeads();

    } catch (err) {
      toast.dismiss();
      console.error("Conversion error:", err);
      toast.error(err.response?.data?.message || t("leads.toast.convertFailed"));
    } finally {
      setConverting(false);
    }
  };

  // A follow-up is "missed" if its date has passed, the lead is still open,
  // and no follow-up note has been logged for it yet.
  const isFollowUpMissed = (lead) => {
    if (!lead.followUpDate) return false;
    if (lead.status === "Converted" || lead.status === "Junk") return false;
    const isPastDue = new Date(lead.followUpDate) < new Date();
    const hasNotes  = Array.isArray(lead.followUpNotes) && lead.followUpNotes.length > 0;
    return isPastDue && !hasNotes;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const toDateInputValue = (dateString) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .split("T")[0];
  };

  const updateFollowUpDateInline = async (leadId, newDate) => {
    if (!newDate) return;

    try {
      setFollowUpSavingId(leadId);
      const token = localStorage.getItem("token");

      await axios.patch(
        `${API_URL}/leads/${leadId}/followup`,
        { followUpDate: newDate },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setLeads((prev) =>
        prev.map((l) => (l._id === leadId ? { ...l, followUpDate: newDate } : l))
      );

      toast.success(t("leads.toast.followUpSuccess"));
    } catch (err) {
      console.error("Follow-up update error:", err);
      toast.error(err.response?.data?.message || t("leads.toast.followUpFailed"));
    } finally {
      setFollowUpSavingId(null);
      setEditingFollowUpId(null);
    }
  };

  const openFollowUpPicker = (leadId) => {
    setEditingFollowUpId(leadId);

    setTimeout(() => {
      const el = dateInputRefs.current[leadId];
      if (!el) return;

      el.focus();
      el.click();

      if (typeof el.showPicker === "function") {
        el.showPicker();
      }
    }, 0);
  };

  const openAddNoteModal = (lead) => {
    setNoteLead(lead);
    setNoteText("");
    setAddNoteModalOpen(true);
    setMenuOpen(null);
  };

  const handleAddFollowUpNote = async () => {
    if (!noteText.trim() || !noteLead) return;

    try {
      setSavingNote(true);
      const token = localStorage.getItem("token");

      const res = await axios.post(
        `${API_URL}/leads/${noteLead._id}/followup-notes`,
        { note: noteText.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setLeads((prev) =>
        prev.map((l) =>
          l._id === noteLead._id ? { ...l, followUpNotes: res.data.lead.followUpNotes } : l
        )
      );

      toast.success("Follow-up note added");
      setAddNoteModalOpen(false);
      setNoteLead(null);
      setNoteText("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add follow-up note");
    } finally {
      setSavingNote(false);
    }
  };

  const openHistoryModal = (lead) => {
    setHistoryLead(lead);
    setHistoryModalOpen(true);
  };

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      const token = localStorage.getItem("token");

      const res = await axios.patch(
        `${API_URL}/leads/${leadId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.status === 200) {
        setLeads((prev) =>
          prev.map((l) => (l._id === leadId ? { ...l, status: newStatus } : l))
        );
        toast.success(t("leads.toast.statusSuccess"));
      }
    } catch (error) {
      toast.error(t("leads.toast.statusFailed"));
    }
  };

  const statusClasses = {
    Hot: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
    Warm: "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100",
    Cold: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
    Junk: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
    Converted: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
  };

  const getStatusSelectClass = (status) => {
    return `w-full px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 ${
      statusClasses[status] ||
      "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
    } ${
      status === "Hot"
        ? "focus:ring-red-300"
        : status === "Warm"
        ? "focus:ring-yellow-300"
        : status === "Cold"
        ? "focus:ring-blue-300"
        : status === "Junk"
        ? "focus:ring-gray-300"
        : "focus:ring-green-300"
    }`;
  };

  useEffect(() => {
    const handleClickOutside = () => setMenuOpen(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const firstItem = totalLeads === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const lastItem = Math.min(currentPage * itemsPerPage, totalLeads);

  if (loading && leads.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        newestOnTop
        closeOnClick
        draggable
        pauseOnHover
        theme="light"
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div className="tour-lead-header">
          <h2 className="text-2xl font-bold text-gray-800">{t("leads.title")}</h2>
          <p className="text-sm text-gray-500 mt-1">{t("leads.subtitle")}</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={startTour}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 tour-finish"
          >
            <Eye className="w-4 h-4" /> {t("leads.buttons.takeTour")}
          </button>

          {selectedLeads.length > 0 && (
            <button
              onClick={() => {
                setLeadToDelete(null);
                setShowDeleteModal(true);
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {t("leads.buttons.deleteSelected", { count: selectedLeads.length })}
            </button>
          )}

          {userRole === "Admin" && (
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow flex items-center gap-2 tour-create-lead"
              onClick={() => navigate(`/${tenantSlug}/createleads`)}
            >
              <Plus className="w-4 h-4" /> {t("leads.buttons.createLead")}
            </button>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 tour-filters">
          <div className="relative w-full tour-search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={t("leads.filters.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {userRole === "Admin" && (
            <div>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">{t("leads.filters.allAssignees")}</option>
                {usersList.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">{t("leads.filters.allStatus")}</option>
              <option value="Hot">{t("leads.status.hot")}</option>
              <option value="Warm">{t("leads.status.warm")}</option>
              <option value="Cold">{t("leads.status.cold")}</option>
              <option value="Junk">{t("leads.status.junk")}</option>
              <option value="Converted">{t("leads.status.converted")}</option>
            </select>
          </div>

          <div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">{t("leads.filters.allSources")}</option>
              <option value="Website">{t("leads.source.website")}</option>
              <option value="Referral">{t("leads.source.referral")}</option>
              <option value="Social Media">{t("leads.source.socialMedia")}</option>
              <option value="Email">{t("leads.source.email")}</option>
              <option value="Cold Call">{t("leads.source.coldCall")}</option>
              <option value="Other">{t("leads.source.other")}</option>
            </select>
          </div>

          <div>
            <select
              value={clientTypeFilter}
              onChange={(e) => setClientTypeFilter(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">{t("leads.filters.allClientTypes")}</option>
              <option value="B2B">B2B</option>
              <option value="B2C">B2C</option>
            </select>
          </div>

          <div>
            <select
              value={followUpFilter}
              onChange={(e) => setFollowUpFilter(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">All Follow-ups</option>
              <option value="completed">Completed Follow-ups</option>
              <option value="missed">Missed Follow-ups</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto tour-lead-table">
        <table className="min-w-max w-full table-auto divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="whitespace-nowrap">
              <th className="px-4 py-3 tour-checkbox">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  checked={selectedLeads.length === leads.length && leads.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t("leads.table.lead")}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t("leads.table.contact")}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t("leads.table.company")}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t("leads.table.clientType")}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t("leads.table.country")}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t("leads.table.source")}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t("leads.table.status")}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t("leads.table.assignee")}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t("leads.table.created")}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t("leads.table.followUp")}</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                History
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tour-lead-actions">{t("leads.table.actions")}</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {leads.length > 0 ? (
              leads.map((lead, idx) => (
                <tr
                  key={lead._id}
                  className={`hover:bg-gray-50 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} whitespace-nowrap`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      checked={selectedLeads.includes(lead._id)}
                      onChange={() => handleSelectLead(lead._id)}
                    />
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                        {lead.leadName?.charAt(0) || "L"}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span
                            onClick={() => navigate(`/${tenantSlug}/leads/view/${lead._id}`)}
                            className="font-medium text-blue-600 text-sm cursor-pointer hover:underline"
                          >
                            {lead.leadName || t("leads.table.unnamedLead")}
                          </span>
                          {targetLinkedLeadIds.has(String(lead._id)) && (() => {
                            const tInfo = targetLinkedLeadIds.get(String(lead._id));
                            const fmtD = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
                            const fmtT = (d) => d ? new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "";
                            return (
                              <div className="group relative inline-flex cursor-default">
                                <Bell size={16} className="text-orange-500 animate-pulse drop-shadow-sm" />
                                <div className="absolute top-full left-0 mt-1.5 hidden group-hover:flex flex-col min-w-[200px] shadow-xl z-50 pointer-events-none" style={{borderRadius:"10px", overflow:"hidden", border:"1px solid #fed7aa"}}>
                                  <div style={{background:"#f97316"}} className="px-3 py-2">
                                    <span className="text-white text-[11px] font-bold">🎯 This is your target</span>
                                  </div>
                                  <div className="bg-white px-3 py-2 space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] text-gray-400 w-16 shrink-0">Assigned</span>
                                      <span className="text-[10px] font-semibold text-gray-700">{fmtD(tInfo?.assignedAt)} {fmtT(tInfo?.assignedAt)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] text-gray-400 w-16 shrink-0">Due Date</span>
                                      <span className="text-[10px] font-semibold text-orange-600">{fmtD(tInfo?.endDate)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                        <span className="text-gray-400 text-xs">{lead.email || "-"}</span>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-700">{lead.phoneNumber || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{lead.companyName || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{lead.clientType || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{lead.country || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{lead.source || "-"}</td>

                  <td className="px-4 py-3">
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                      className={getStatusSelectClass(lead.status)}
                    >
                      <option value="Hot">{t("leads.status.hot")}</option>
                      <option value="Warm">{t("leads.status.warm")}</option>
                      <option value="Cold">{t("leads.status.cold")}</option>
                      <option value="Junk">{t("leads.status.junk")}</option>
                    </select>
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-700">
                    {lead.assignTo
                      ? typeof lead.assignTo === "object"
                        ? `${lead.assignTo.firstName} ${lead.assignTo.lastName}`
                        : t("leads.table.assignedUser")
                      : "-"}
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-700">{formatDate(lead.createdAt)}</td>

                  <td className="px-4 py-3 text-sm text-gray-700">
                    <div className="relative flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openFollowUpPicker(lead._id)}
                        className="inline-flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-100 transition"
                        disabled={followUpSavingId === lead._id}
                      >
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">
                          {followUpSavingId === lead._id
                            ? t("leads.table.saving")
                            : formatDate(lead.followUpDate)}
                        </span>
                      </button>

                      {isFollowUpMissed(lead) && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-600 border border-red-200 whitespace-nowrap">
                          Missed
                        </span>
                      )}

                      {editingFollowUpId === lead._id && (
                        <input
                          ref={(el) => (dateInputRefs.current[lead._id] = el)}
                          type="date"
                          defaultValue={toDateInputValue(lead.followUpDate)}
                          className="absolute left-0 top-0 w-0 h-0 opacity-0"
                          onChange={(e) => updateFollowUpDateInline(lead._id, e.target.value)}
                          onBlur={() => setEditingFollowUpId(null)}
                        />
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => openHistoryModal(lead)}
                      className={`inline-flex items-center justify-center p-2 rounded-lg hover:bg-gray-100 transition-colors ${
                        isFollowUpMissed(lead) ? "text-red-500 hover:text-red-600" : "text-gray-500 hover:text-blue-600"
                      }`}
                      title={isFollowUpMissed(lead) ? "Missed follow-up — view history" : "View follow-up history"}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>

                  <td className="px-4 py-3 text-right relative">
                    <div className="relative inline-block text-left">
                      <button
                        className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                        onClick={(e) => handleMenuToggle(lead._id, e)}
                      >
                        <MoreVertical className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>

                    {menuOpen === lead._id && (
                      <div
                        className="fixed z-50 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
                        style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEdit(lead._id); }}
                          className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Edit className="w-4 h-4 mr-2" /> {t("leads.actions.edit")}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openAddNoteModal(lead);
                          }}
                          className="flex items-center w-full px-3 py-2 text-sm text-blue-600 hover:bg-gray-100"
                        >
                          <MessageSquarePlus className="w-4 h-4 mr-2" /> Add Follow-up Note
                        </button>

                        {lead.status !== "Converted" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openConvertModal(lead); }}
                            className="flex items-center w-full px-3 py-2 text-sm text-green-600 hover:bg-gray-100"
                          >
                            <Handshake className="w-4 h-4 mr-2" /> {t("leads.actions.convert")}
                          </button>
                        )}

                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteClick(lead._id); }}
                          className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-gray-100"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> {t("leads.actions.delete")}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={12} className="px-4 py-12 text-center text-gray-500 text-sm">
                  {t("leads.table.noLeads")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-3">
          <p className="text-sm text-gray-500">
            {t("leads.pagination.showing")}{" "}
            <span className="font-semibold text-gray-700">{firstItem}</span>–
            <span className="font-semibold text-gray-700">{lastItem}</span>{" "}
            {t("leads.pagination.of")}{" "}
            <span className="font-semibold text-gray-700">{totalLeads}</span>
          </p>

          <div className="flex items-center gap-1">
            <button onClick={() => goToPage(1)} disabled={currentPage === 1}
              className="px-2 py-1.5 text-sm border rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">«</button>
            <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">
              {t("leads.pagination.prev")}
            </button>

            {pageNumbers().map((p, i) =>
              p === "..." ? (
                <span key={`d${i}`} className="px-2 text-gray-400">…</span>
              ) : (
                <button key={p} onClick={() => goToPage(p)}
                  className={`min-w-[36px] px-2 py-1.5 text-sm border rounded-lg transition-colors ${
                    currentPage === p
                      ? "bg-blue-600 text-white border-blue-600 font-semibold"
                      : "hover:bg-gray-100 text-gray-700"
                  }`}>
                  {p}
                </button>
              )
            )}

            <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">
              {t("leads.pagination.next")}
            </button>
            <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages}
              className="px-2 py-1.5 text-sm border rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">»</button>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              {t("leads.deleteModal.title")}
            </DialogTitle>
          </DialogHeader>

          <p className="mb-6 text-gray-700">
            {leadToDelete
              ? t("leads.deleteModal.messageSingle")
              : t("leads.deleteModal.messageBulk", { count: selectedLeads.length })}
          </p>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setShowDeleteModal(false); setLeadToDelete(null); }}
              className="px-4 py-2 rounded-lg border hover:bg-gray-100 text-gray-700"
            >
              {t("leads.deleteModal.cancel")}
            </button>

            <button
              onClick={() => leadToDelete ? handleDeleteLead(leadToDelete) : handleBulkDelete()}
              className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {t("leads.deleteModal.delete")}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Convert Modal */}
      <Dialog open={convertModalOpen} onOpenChange={setConvertModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Handshake className="w-5 h-5" />
              {t("leads.convertModal.title")}
            </DialogTitle>
          </DialogHeader>

          {selectedLead && (
            <>
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  {t("leads.convertModal.convertingPrefix")}{" "}
                  <strong>{selectedLead.leadName}</strong>
                  {selectedLead.companyName &&
                    ` ${t("leads.convertModal.fromLabel")} ${selectedLead.companyName}`}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("leads.convertModal.dealValue")}
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={dealData.value}
                    onChange={(e) => handleDealFieldChange("value", e.target.value)}
                    placeholder={t("leads.convertModal.valuePlaceholder")}
                    className="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:outline-none"
                  />
                  <select
                    value={dealData.currency}
                    onChange={(e) => handleDealFieldChange("currency", e.target.value)}
                    className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:outline-none"
                  >
                    {allowedCurrencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.symbol} {c.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("leads.convertModal.stage")}
                </label>
                <div className="w-full px-3 py-2 border rounded-md bg-gray-50 text-gray-700">
                  {dealData.stage || "Qualification"}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("leads.convertModal.notes")}
                </label>
                <textarea
                  name="notes"
                  value={dealData.notes}
                  onChange={(e) => handleDealFieldChange("notes", e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:outline-none"
                  placeholder={t("leads.convertModal.notesPlaceholder")}
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConvertModalOpen(false)}
                  className="px-4 py-2 rounded-lg border hover:bg-gray-100 text-gray-700"
                  disabled={converting}
                >
                  {t("leads.convertModal.cancel")}
                </button>

                <button
                  onClick={handleConvertDeal}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
                  disabled={converting}
                >
                  {converting ? t("leads.convertModal.convertingBtn") : t("leads.convertModal.convert")}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Follow-up Note Modal */}
      <Dialog open={addNoteModalOpen} onOpenChange={setAddNoteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <MessageSquarePlus className="w-5 h-5" />
              Add Follow-up Note
            </DialogTitle>
          </DialogHeader>

          {noteLead && (
            <p className="text-sm text-gray-500 mb-3">
              {noteLead.leadName}
              {noteLead.companyName && ` · ${noteLead.companyName}`}
            </p>
          )}

          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={4}
            placeholder="What happened during this follow-up?"
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
          />

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => setAddNoteModalOpen(false)}
              className="px-4 py-2 rounded-lg border hover:bg-gray-100 text-gray-700"
              disabled={savingNote}
            >
              Cancel
            </button>

            <button
              onClick={handleAddFollowUpNote}
              disabled={!noteText.trim() || savingNote}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {savingNote ? "Saving..." : "Save Note"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Follow-up History Modal */}
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <Eye className="w-5 h-5" />
              Follow-up History{historyLead ? ` — ${historyLead.leadName}` : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto space-y-3 mt-2">
            {!historyLead?.followUpNotes?.length ? (
              <p className={`text-sm text-center py-8 ${
                historyLead && isFollowUpMissed(historyLead) ? "text-red-500 font-medium" : "text-gray-500"
              }`}>
                {historyLead && isFollowUpMissed(historyLead)
                  ? "No follow-up notes logged — this follow-up was missed."
                  : "No follow-up notes yet."}
              </p>
            ) : (
              [...historyLead.followUpNotes]
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .map((n, i) => (
                  <div key={n._id || i} className="border border-gray-200 rounded-lg p-3">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{n.note}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(n.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {" at "}
                      {new Date(n.createdAt).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))
            )}
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={() => setHistoryModalOpen(false)}
              className="px-4 py-2 rounded-lg border hover:bg-gray-100 text-gray-700"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function LeadTable() {
  const { t, i18n } = useTranslation();
  return (
    <TourProvider
      key={i18n.language}
      steps={getTourSteps(t)}
      afterOpen={() => (document.body.style.overflow = "hidden")}
      beforeClose={() => (document.body.style.overflow = "unset")}
      styles={{
        popover: (base) => ({ ...base, backgroundColor: "#fff", color: "#1f1f1f" }),
        maskArea: (base) => ({ ...base, rx: 8 }),
        badge: (base) => ({ ...base, display: "none" }),
        close: (base) => ({ ...base, right: "auto", left: 8, top: 8 }),
      }}
    >
      <LeadTableComponent />
    </TourProvider>
  );
}
