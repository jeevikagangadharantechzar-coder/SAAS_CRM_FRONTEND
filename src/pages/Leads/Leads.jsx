import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import { TourProvider, useTour } from "@reactour/tour";

import {
  MoreVertical,
  Trash2,
  Edit,
  Handshake,
  Search,
  Plus,
  Eye,
  Calendar,
} from "lucide-react";

import { initSocket } from "../../utils/socket";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

const API_URL = import.meta.env.VITE_API_URL;

/* ── Tour Steps ─────────────────────── */
const tourSteps = [
  {
    selector: ".tour-lead-header",
    content:
      "Welcome to the Leads Management page! Here you can view, manage, and convert your leads.",
  },
  {
    selector: ".tour-create-lead",
    content:
      "Click here to create a new lead. You'll be able to add all the necessary details about a potential customer.",
  },
  {
    selector: ".tour-search",
    content:
      "Use this search bar to quickly find leads by name, email, phone, company, or source.",
  },
  {
    selector: ".tour-filters",
    content:
      "Filter your leads by status, assignee, or source to focus on specific segments of your pipeline.",
  },
  {
    selector: ".tour-lead-table",
    content:
      "This is your leads table. It shows all your leads with their key information and status.",
  },
  {
    selector: ".tour-checkbox",
    content:
      "Select individual leads by checking these boxes, or use the header checkbox to select all visible leads.",
  },
  {
    selector: ".tour-lead-actions",
    content:
      "Click the three-dot menu to edit, convert, or delete a lead. Converting a lead turns it into a deal.",
  },
  {
    selector: ".tour-finish",
    content:
      "You've completed the tour! Click here anytime to review the features again.",
  },
];

/* ── Lead Table Component ─────────────────────── */
function LeadTableComponent() {
  const navigate = useNavigate();
  const { tenantSlug } = useParams();
  const { setIsOpen } = useTour();

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

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [clientTypeFilter, setClientTypeFilter] = useState("");
  
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
  }, [debouncedSearch, statusFilter, sourceFilter, assigneeFilter]);

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
// Update the fetchLeads function to handle filters correctly
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

    console.log("Fetching leads with params:", Object.fromEntries(params)); // Debug log

    const { data } = await axios.get(
      `${API_URL}/leads/getAllLead?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Handle both response shapes
    const isNew = data && !Array.isArray(data) && Array.isArray(data.leads);
    const leadsArr = isNew ? data.leads : (Array.isArray(data) ? data : []);
    const total = isNew ? data.totalLeads : leadsArr.length;
    const pages = isNew ? data.totalPages : Math.ceil(leadsArr.length / itemsPerPage);

    setLeads(leadsArr);
    setTotalLeads(total);
    setTotalPages(pages);

  } catch (err) {
    console.error("Fetch leads error:", err);
    toast.error("Failed to fetch leads");
  } finally {
    setLoading(false);
  }
}, [currentPage, debouncedSearch, statusFilter, sourceFilter, assigneeFilter, clientTypeFilter, itemsPerPage]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

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
        toast.success("Lead deleted successfully");
        if (leads.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
        fetchLeads(); // Refresh after delete
      } else {
        toast.error("Failed to delete lead");
      }
    } catch (error) {
      toast.error("Error deleting lead");
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
        toast.success(`${selectedLeads.length} leads deleted successfully`);
        setSelectedLeads([]);
        if (leads.length === selectedLeads.length && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
        fetchLeads(); // Refresh after delete
      } else {
        toast.error("Failed to delete some leads");
      }
    } catch (error) {
      toast.error("Error deleting leads");
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
      const toastId = toast.loading("Converting lead to deal...");

      const response = await axios.patch(
        `${API_URL}/leads/${selectedLead._id}/convert`,
        { ...dealData },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.update(toastId, {
        render: response.data.message || "Lead converted to deal successfully",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });

      setLeads((prev) => prev.filter((l) => l._id !== selectedLead._id));
      setSelectedLeads((prev) => prev.filter((id) => id !== selectedLead._id));
      setConvertModalOpen(false);
      setSelectedLead(null);
      fetchLeads(); // Refresh after conversion

    } catch (err) {
      toast.dismiss();
      console.error("Conversion error:", err);
      toast.error(
        err.response?.data?.message || "Conversion failed. Please try again."
      );
    } finally {
      setConverting(false);
    }
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

      toast.success("Follow-up date updated");
    } catch (err) {
      console.error("Follow-up update error:", err);
      toast.error(
        err.response?.data?.message || "Failed to update follow-up date"
      );
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
        toast.success("Status updated successfully");
      }
    } catch (error) {
      toast.error("Failed to update status");
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
          <h2 className="text-2xl font-bold text-gray-800">Leads</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage and track your potential customers
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={startTour}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 tour-finish"
          >
            <Eye className="w-4 h-4" /> Take Tour
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
              Delete Selected ({selectedLeads.length})
            </button>
          )}

         {userRole === "Admin" && (
  <button
    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow flex items-center gap-2 tour-create-lead"
    onClick={() => navigate(`/${tenantSlug}/createleads`)}
  >
    <Plus className="w-4 h-4" /> Create Lead
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
              placeholder="Search leads by name, email, phone, company..."
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
                <option value="">All Assignees</option>
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
              <option value="">All Status</option>
              <option value="Hot">Hot</option>
              <option value="Warm">Warm</option>
              <option value="Cold">Cold</option>
              <option value="Junk">Junk</option>
              <option value="Converted">Converted</option>
            </select>
          </div>

          <div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">All Sources</option>
              <option value="Website">Website</option>
              <option value="Referral">Referral</option>
              <option value="Social Media">Social Media</option>
              <option value="Email">Email</option>
              <option value="Cold Call">Cold Call</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <select
              value={clientTypeFilter}
              onChange={(e) => setClientTypeFilter(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">All Client Types</option>
              <option value="B2B">B2B</option>
              <option value="B2C">B2C</option>
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
                  checked={
                    selectedLeads.length === leads.length && leads.length > 0
                  }
                  onChange={handleSelectAll}
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Lead
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Contact
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Company
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Client Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Country
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Source
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Assignee
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Created
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                Follow-Up
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tour-lead-actions">
                Actions
              </th>
             </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {leads.length > 0 ? (
              leads.map((lead, idx) => (
                <tr
                  key={lead._id}
                  className={`hover:bg-gray-50 ${
                    idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                  } whitespace-nowrap`}
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
                        <span
                          onClick={() => navigate(`/${tenantSlug}/leads/view/${lead._id}`)}
                          className="font-medium text-blue-600 text-sm cursor-pointer hover:underline"
                        >
                          {lead.leadName || "Unnamed Lead"}
                        </span>
                        <span className="text-gray-400 text-xs">
                          {lead.email || "-"}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-700">
                    {lead.phoneNumber || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {lead.companyName || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {lead.clientType || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {lead.country || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {lead.source || "-"}
                  </td>

                  <td className="px-4 py-3">
                    <select
                      value={lead.status}
                      onChange={(e) =>
                        handleStatusChange(lead._id, e.target.value)
                      }
                      className={getStatusSelectClass(lead.status)}
                    >
                      <option value="Hot">Hot</option>
                      <option value="Warm">Warm</option>
                      <option value="Cold">Cold</option>
                      <option value="Junk">Junk</option>
                    </select>
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-700">
                    {lead.assignTo
                      ? typeof lead.assignTo === "object"
                        ? `${lead.assignTo.firstName} ${lead.assignTo.lastName}`
                        : "Assigned User"
                      : "-"}
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-700">
                    {formatDate(lead.createdAt)}
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-700">
                    <div className="relative flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openFollowUpPicker(lead._id)}
                        className="inline-flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-100 transition"
                        title="Click to update follow-up date"
                        disabled={followUpSavingId === lead._id}
                      >
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">
                          {followUpSavingId === lead._id
                            ? "Saving..."
                            : formatDate(lead.followUpDate)}
                        </span>
                      </button>

                      {editingFollowUpId === lead._id && (
                        <input
                          ref={(el) => (dateInputRefs.current[lead._id] = el)}
                          type="date"
                          defaultValue={toDateInputValue(lead.followUpDate)}
                          className="absolute left-0 top-0 w-0 h-0 opacity-0"
                          onChange={(e) =>
                            updateFollowUpDateInline(lead._id, e.target.value)
                          }
                          onBlur={() => setEditingFollowUpId(null)}
                        />
                      )}
                    </div>
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
                        style={{
                          top: `${menuPosition.top}px`,
                          left: `${menuPosition.left}px`,
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(lead._id);
                          }}
                          className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Edit className="w-4 h-4 mr-2" /> Edit
                        </button>

                        {lead.status !== "Converted" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openConvertModal(lead);
                            }}
                            className="flex items-center w-full px-3 py-2 text-sm text-green-600 hover:bg-gray-100"
                          >
                            <Handshake className="w-4 h-4 mr-2" /> Convert
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(lead._id);
                          }}
                          className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-gray-100"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={11}
                  className="px-4 py-12 text-center text-gray-500 text-sm"
                >
                  No leads found.
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
            Showing <span className="font-semibold text-gray-700">{firstItem}</span>–<span className="font-semibold text-gray-700">{lastItem}</span> of <span className="font-semibold text-gray-700">{totalLeads}</span>
          </p>

          <div className="flex items-center gap-1">
            <button onClick={() => goToPage(1)} disabled={currentPage === 1}
              className="px-2 py-1.5 text-sm border rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">«</button>
            <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">‹ Prev</button>

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
              className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">Next ›</button>
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
              Confirm Delete
            </DialogTitle>
          </DialogHeader>

          <p className="mb-6 text-gray-700">
            Are you sure you want to delete{" "}
            {leadToDelete
              ? "this lead"
              : `${selectedLeads.length} selected leads`}
            ? This action cannot be undone.
          </p>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setLeadToDelete(null);
              }}
              className="px-4 py-2 rounded-lg border hover:bg-gray-100 text-gray-700"
            >
              Cancel
            </button>

            <button
              onClick={() =>
                leadToDelete
                  ? handleDeleteLead(leadToDelete)
                  : handleBulkDelete()
              }
              className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
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
              Convert Lead to Deal
            </DialogTitle>
          </DialogHeader>

          {selectedLead && (
            <>
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  Converting: <strong>{selectedLead.leadName}</strong>
                  {selectedLead.companyName &&
                    ` from ${selectedLead.companyName}`}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deal Value
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={dealData.value}
                    onChange={(e) =>
                      handleDealFieldChange("value", e.target.value)
                    }
                    placeholder="Enter value"
                    className="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:outline-none"
                  />

                  <select
                    value={dealData.currency}
                    onChange={(e) =>
                      handleDealFieldChange("currency", e.target.value)
                    }
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
                  Stage
                </label>
                <div className="w-full px-3 py-2 border rounded-md bg-gray-50 text-gray-700">
                  {dealData.stage || "Qualification"}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={dealData.notes}
                  onChange={(e) =>
                    handleDealFieldChange("notes", e.target.value)
                  }
                  rows={3}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:outline-none"
                  placeholder="Add any notes..."
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConvertModalOpen(false)}
                  className="px-4 py-2 rounded-lg border hover:bg-gray-100 text-gray-700"
                  disabled={converting}
                >
                  Cancel
                </button>

                <button
                  onClick={handleConvertDeal}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
                  disabled={converting}
                >
                  {converting ? "Converting..." : "Convert"}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function LeadTable() {
  return (
    <TourProvider steps={tourSteps}
      afterOpen={() => (document.body.style.overflow = "hidden")}
      beforeClose={() => (document.body.style.overflow = "unset")}
      styles={{
        popover: (base) => ({ ...base, backgroundColor: "#fff", color: "#1f1f1f" }),
        maskArea: (base) => ({ ...base, rx: 8 }),
        badge: (base) => ({ ...base, display: "none" }),
        close: (base) => ({ ...base, right: "auto", left: 8, top: 8 }),
      }}>
      <LeadTableComponent />
    </TourProvider>
  );
}