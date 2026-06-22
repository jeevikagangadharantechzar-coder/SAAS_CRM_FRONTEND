import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { MoreVertical, Edit, Trash2, Eye, Plus, Trophy, Calendar, Clock, AlertCircle, Bell, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import ReactDOM from "react-dom";
import { TourProvider, useTour } from "@reactour/tour";

const API_URL = import.meta.env.VITE_API_URL;

const dealTourSteps = [
  { selector: ".tour-deals-header", content: "Welcome to the Deals Management page! Here you can view, edit, and manage all your deals." },
  { selector: ".tour-create-deal", content: "Click here to create a new deal and add important details like value, stage, and assigned user." },
  { selector: ".tour-filters", content: "Use these filters to narrow down deals by stage, assigned user, or name." },
  { selector: ".tour-deals-table", content: "This is your deals table. It shows all your deals with their details such as stage, value, and assignee." },
  { selector: ".tour-deal-name", content: "Click a Deal Name to view its detailed information. Hover over the bell icon to see follow-up details." },
  { selector: ".tour-deal-actions", content: "Use the Edit or Delete icons to quickly manage a deal." },
  { selector: ".tour-finish", content: "That's the end of the tour! Click the button below to finish it anytime." },
];

/* ── Fetch Deals Function ─────────────────────── */
function AllDealsComponent() {
  const navigate = useNavigate();
  const { tenantSlug } = useParams();
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get("status");
  const [clientTypeFilter, setClientTypeFilter] = useState("");
  const [showTodayOnly, setShowTodayOnly] = useState(false);
  const { setIsOpen, setSteps, setCurrentStep, close } = useTour();

  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [selectedDeals, setSelectedDeals] = useState([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteDeal, setDeleteDeal] = useState(null);
  const [users, setUsers] = useState([]);
  const [userRole, setUserRole] = useState("");
  const [filters, setFilters] = useState({ stage: "", assignedTo: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownCoords, setDropdownCoords] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [hoveredDeal, setHoveredDeal] = useState(null);
  const [tooltipCoords, setTooltipCoords] = useState(null);
  const [tooltipTimeout, setTooltipTimeout] = useState(null);

  const itemsPerPage = 10;

  // Tour setup on mount
  useEffect(() => {
    const userData = localStorage.getItem("user");
    let role = "";
    if (userData) {
      try {
        const user = JSON.parse(userData);
        role = user.role?.name || "";
      } catch (err) {
        console.error("Error parsing user data:", err);
      }
    }
    setUserRole(role);
    const hasTakenTour = localStorage.getItem("dealsTourCompleted");
    if (!hasTakenTour && role === "Sales") {
      setSteps(dealTourSteps);
      setTimeout(() => setIsOpen(true), 1000);
    }
  }, [setIsOpen, setSteps]);

  const startTour = () => {
    setSteps(dealTourSteps);
    setCurrentStep(0);
    setIsOpen(true);
    localStorage.setItem("dealsTourCompleted", "true");
  };

  const finishTour = () => {
    close();
    localStorage.setItem("dealsTourCompleted", "true");
    toast.success(
      "Tour completed! You can always restart it using the 'Take Tour' button."
    );
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (openDropdownId && !e.target.closest(".dropdown-menu")) {
        setOpenDropdownId(null);
        setDropdownCoords(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdownId]);

  // Close tooltip on scroll
  useEffect(() => {
    const handleCloseTooltip = () => {
      if (tooltipTimeout) clearTimeout(tooltipTimeout);
      setHoveredDeal(null);
    };
    document.addEventListener("scroll", handleCloseTooltip);
    return () => {
      document.removeEventListener("scroll", handleCloseTooltip);
    };
  }, [tooltipTimeout]);

/* ── Toggle Dropdown Function ─────────────────────── */
  const toggleDropdown = (id, event) => {
    if (openDropdownId === id) {
      setOpenDropdownId(null);
      setDropdownCoords(null);
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      setDropdownCoords({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
      setOpenDropdownId(id);
    }
  };
/* ── Handle Bell Hover Function ─────────────────────── */
  const handleBellHover = (deal, event) => {
    // Clear any existing timeout
    if (tooltipTimeout) clearTimeout(tooltipTimeout);
    
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipCoords({
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX - 10,
    });
    setHoveredDeal(deal);
  };

/* ── Handle Tooltip Leave Function ─────────────────────── */
  const handleTooltipLeave = () => {
    const timeout = setTimeout(() => {
      setHoveredDeal(null);
    }, 200);
    setTooltipTimeout(timeout);
  };

  // Navigate to deal with follow-up tab open
  const handleViewFollowUpDetails = (dealId) => {
    setHoveredDeal(null);
    navigate(`/${tenantSlug}/Pipelineview/${dealId}?tab=followup`);
  };

/* ── Format Currency Value Function ─────────────────────── */
  const formatCurrencyValue = (val) => {
    if (!val) return "-";
    const match = val.match(/^([\d,]+)\s*([A-Z]+)$/i);
    if (!match) return val;
    const number = match[1].replace(/,/g, "");
    const currency = match[2].toUpperCase();
    return `${Number(number).toLocaleString("en-IN")} ${currency}`;
  };

/* ── Format Time Only Function ─────────────────────── */
  const formatTimeOnly = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };
/* ── Format Date Short Function ─────────────────────── */
  const formatDateShort = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

/* ── Truncate Words Function ─────────────────────── */
  const truncateWords = (text, wordLimit = 4) => {
    if (!text) return "";
    const words = text.split(" ");
    if (words.length <= wordLimit) return text;
    return words.slice(0, wordLimit).join(" ") + "...";
  };

/* ──  Follow-up  Function ─────────────────────── */
  const isFollowUpToday = (followUpDate) => {
    if (!followUpDate) return false;
    const today = new Date();
    const followUp = new Date(followUpDate);
    return followUp.toDateString() === today.toDateString();
  };

  const isFollowUpOverdue = (followUpDate) => {
    if (!followUpDate) return false;
    const now = new Date();
    const followUp = new Date(followUpDate);
    return followUp < now && !isFollowUpToday(followUpDate);
  };

/* ── Fetch Deals Function ─────────────────────── */
  const fetchDeals = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/deals/getAll`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDeals(res.data || []);
      setTotalPages(Math.ceil((res.data?.length || 0) / itemsPerPage));
    } catch (err) {
      console.error("Fetch deals error:", err);
      toast.error("Failed to fetch deals");
    } finally {
      setLoading(false);
    }
  };

/* ── Fetch Users Function ─────────────────────── */
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const filteredSales = (res.data.users || []).filter(
        (u) => u.role?.name?.toLowerCase() === "sales"
      );
      setUsers(filteredSales);
    } catch (err) {
      console.error("Fetch users error:", err);
    }
  };

  useEffect(() => {
    fetchDeals();
    fetchUsers();
  }, []);

  // Auto-refresh deals every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDeals();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

/* ── Format Date Function ─────────────────────── */
  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "-";

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) setCurrentPage(newPage);
  };

  const filteredDeals = deals
    .filter((d) => d.dealName?.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter((d) => (clientTypeFilter ? d.clientType === clientTypeFilter : true))
    .filter((d) => (filters.stage ? d.stage === filters.stage : true))
    .filter((d) => (filters.assignedTo ? d.assignedTo?._id === filters.assignedTo : true))
    .filter((d) => {
      if (statusFilter === "won") {
        const stage = d.stage?.toLowerCase() || "";
        return stage.includes("won") || stage.includes("closed won");
      }
      return true;
    })
    .filter((d) => {
      if (!showTodayOnly) return true;
      if (!d.followUpDate) return false;
      const today = new Date();
      const followUp = new Date(d.followUpDate);
      return followUp.toDateString() === today.toDateString();
    });

  const paginatedDeals = filteredDeals.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Checkbox helpers
  const handleCheckboxChange = (id) =>
    setSelectedDeals((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allFilteredIds = filteredDeals.map((d) => d._id);
      setSelectedDeals(allFilteredIds);
    } else {
      setSelectedDeals([]);
    }
  };

  const isAllSelected =
    filteredDeals.length > 0 &&
    filteredDeals.every((d) => selectedDeals.includes(d._id));

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (!selectedDeals.length) return toast.info("Select deals to delete");
    setIsBulkDeleteModalOpen(true);
  };

/* ── Handle Bulk Delete Confirm Function ─────────────────────── */
  const handleBulkDeleteConfirm = async () => {
    try {
      setIsBulkDeleting(true);
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/deals/bulk-delete`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { ids: selectedDeals },
      });
      toast.success(`Successfully deleted ${selectedDeals.length} deal(s)`);
      setSelectedDeals([]);
      setIsBulkDeleteModalOpen(false);
      await fetchDeals();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete deals");
    } finally {
      setIsBulkDeleting(false);
    }
  };

/* ── Handle Edit Function ─────────────────────── */
  const handleEdit = (deal) => {
    navigate(`/${tenantSlug}/createDeal`, { state: { deal } });
    setOpenDropdownId(null);
  };

/* ── Handle Delete Click Function ─────────────────────── */
  const handleDeleteClick = (deal) => {
    setDeleteDeal(deal);
    setIsDeleteModalOpen(true);
    setOpenDropdownId(null);
  };

/* ── Handle Delete Confirm Function ─────────────────────── */
  const handleDeleteConfirm = async () => {
    try {
      setIsDeleting(true);
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/deals/delete-deal/${deleteDeal._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Deal deleted successfully");
      setIsDeleteModalOpen(false);
      await fetchDeals();
      setSelectedDeals((prev) => prev.filter((d) => d !== deleteDeal._id));
    } catch (err) {
      console.error("Delete error:", err);
      toast.error(err.response?.data?.message || "Failed to delete deal");
    } finally {
      setIsDeleting(false);
    }
  };

/* ── Handle Deal Name Click Function ─────────────────────── */
  const handleDealNameClick = (dealId) => {
    navigate(`/${tenantSlug}/Pipelineview/${dealId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3 tour-deals-header">
        <h2 className="text-xl font-semibold text-gray-800">All Deals</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={startTour}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 tour-finish"
          >
            <Eye className="w-4 h-4" /> Take Tour
          </button>
          {userRole === "Admin" && (
            <button
              onClick={() => navigate(`/${tenantSlug}/createDeal`)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 tour-create-deal"
            >
              <Plus className="w-4 h-4" /> Create Deal
            </button>
          )}
        </div>
      </div>

      {statusFilter === "won" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-green-600" />
            <span className="text-green-800">
              Showing only <strong>Won Deals</strong>
            </span>
          </div>
          <button
            onClick={() => navigate(`/${tenantSlug}/deals`)}
            className="text-sm text-green-600 hover:text-green-800 font-medium px-3 py-1 rounded-md hover:bg-green-100 transition-colors"
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3 tour-filters">
        <div className="flex flex-wrap gap-6 items-center">
          <select
            value={filters.stage}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, stage: e.target.value }))
            }
            className="border rounded-md px-4 py-2 bg-white text-sm"
          >
            <option value="">All Stages</option>
            <option value="Qualification">Qualification</option>
            <option value="Proposal Sent-Negotiation">Proposal Sent-Negotiation</option>
            <option value="Invoice Sent">Invoice Sent</option>
            <option value="Closed Won">Closed Won</option>
            <option value="Closed Lost">Closed Lost</option>
          </select>

          <select
            value={filters.assignedTo}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, assignedTo: e.target.value }))
            }
            className="border rounded-md bg-white px-4 py-2 text-sm"
          >
            <option value="">All Assigned</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>
                {u.firstName} {u.lastName}
              </option>
            ))}
          </select>
          <select
            value={clientTypeFilter}
            onChange={(e) => setClientTypeFilter(e.target.value)}
            className="border rounded-md bg-white px-4 py-2 text-sm"
          >
            <option value="">All Client Types</option>
            <option value="B2B">B2B</option>
            <option value="B2C">B2C</option>
          </select>
          {/* Today's Follow-up Button */}
          <button
            onClick={() => setShowTodayOnly(!showTodayOnly)}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
              showTodayOnly
                ? "bg-orange-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Calendar size={16} />
            Today's Follow-up
            {showTodayOnly && (
              <X 
                size={14} 
                className="ml-1 cursor-pointer hover:text-white" 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTodayOnly(false);
                }}
              />
            )}
          </button>

          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Deal Name..."
            className="border rounded-full px-4 py-2 bg-white text-sm"
          />
        </div>
      </div>
      {showTodayOnly && (
        <div className="mb-3 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1">
          <Calendar size={12} />
          Showing today's follow-up only
        </div>
      )}

      {/* Bulk Delete Bar */}
      {selectedDeals.length > 0 && (
        <div className="mb-3 flex items-center gap-3">
          <span className="text-sm text-gray-600 font-medium">
            {selectedDeals.length} deal{selectedDeals.length > 1 ? "s" : ""} selected
          </span>
          <button
            onClick={handleBulkDelete}
            disabled={isBulkDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
          >
            <Trash2 size={15} />
            {isBulkDeleting
              ? "Deleting..."
              : `Delete Selected (${selectedDeals.length})`}
          </button>
          <button
            onClick={() => setSelectedDeals([])}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Deals Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm tour-deals-table">
        <table className="min-w-full text-sm text-gray-700">
          <thead className="bg-gray-100">
            <tr>
              
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={isAllSelected}
                    ref={(input) => {
                      if (input) {
                        input.indeterminate = !isAllSelected && selectedDeals.length > 0;
                      }
                    }}
                  />
                </th>
              
              <th className="px-6 py-3 text-left">Deal Name</th>
              <th className="px-6 py-3 text-left">Client Type</th>
              <th className="px-6 py-3 text-left">Assigned To</th>
              <th className="px-6 py-3 text-left">Stage</th>
              <th className="px-6 py-3 text-left">Value</th>
              <th className="px-6 py-3 text-left">Created At</th>
              <th className="px-6 py-3 text-left tour-deal-actions">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedDeals.length > 0 ? (
              paginatedDeals.map((deal, idx) => {
                const hasFollowUp = deal.followUpDate;
                const isToday = isFollowUpToday(deal.followUpDate);
                const isOverdue = isFollowUpOverdue(deal.followUpDate);
                
                return (
                  <tr
                    key={deal._id}
                    className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                  >
                    
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          onChange={() => handleCheckboxChange(deal._id)}
                          checked={selectedDeals.includes(deal._id)}
                        />
                      </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDealNameClick(deal._id)}
                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium tour-deal-name"
                        >
                          {deal.dealName || "-"}
                        </button>
                        {/* Small bell icon that triggers hover tooltip */}
                        {hasFollowUp && (
                          <div
                            className="relative inline-flex cursor-pointer"
                            onMouseEnter={(e) => handleBellHover(deal, e)}
                            onMouseLeave={handleTooltipLeave}
                          >
                            <Bell 
                              size={12} 
                              className={`${isToday ? "text-orange-500 animate-pulse" : isOverdue ? "text-red-400" : "text-purple-400"} hover:scale-110 transition-transform`}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">{deal.clientType || "-"}</td>
                    <td className="px-6 py-4">
                      {deal.assignedTo
                        ? `${deal.assignedTo.firstName} ${deal.assignedTo.lastName}`
                        : "-"}
                    </td>
                    <td className="px-6 py-4">{deal.stage || "-"}</td>
                    <td className="px-6 py-4">
                      {formatCurrencyValue(deal.value)}
                    </td>
                    <td className="px-6 py-4">{formatDate(deal.createdAt)}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={(e) => toggleDropdown(deal._id, e)}
                        className="p-2 rounded hover:bg-gray-200"
                      >
                        <MoreVertical size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={userRole === "Admin" ? "7" : "6"}
                  className="px-6 py-8 text-center text-gray-500"
                >
                  No deals found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded border bg-white hover:bg-gray-100 disabled:opacity-50"
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded border bg-white hover:bg-gray-100 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Simple Tooltip - Only shows date, time, and truncated notes */}
      {hoveredDeal && tooltipCoords && ReactDOM.createPortal(
        <div
          className="fixed z-50"
          style={{
            top: tooltipCoords.top,
            left: tooltipCoords.left - 180,
            transform: "translateY(-50%)",
          }}
          onMouseEnter={() => {
            if (tooltipTimeout) clearTimeout(tooltipTimeout);
          }}
          onMouseLeave={handleTooltipLeave}
        >
          <div className="relative">
            {/* Arrow */}
            <div className="absolute right-[-6px] top-1/2 transform -translate-y-1/2 w-2.5 h-2.5 bg-white rotate-45 border-r border-t border-gray-200"></div>
            
            {/* Tooltip Content */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden min-w-[180px] max-w-[240px]">
              
              {/* Header */}
              <div className={`px-3 py-1.5 ${
                isFollowUpToday(hoveredDeal.followUpDate)
                  ? "bg-orange-500"
                  : isFollowUpOverdue(hoveredDeal.followUpDate)
                  ? "bg-red-500"
                  : hoveredDeal.followUpDate
                  ? "bg-purple-500"
                  : "bg-gray-500"
              }`}>
                <span className="text-white text-xs font-medium">
                  {isFollowUpToday(hoveredDeal.followUpDate) ? "Due Today" : 
                   isFollowUpOverdue(hoveredDeal.followUpDate) ? "Overdue" : 
                   hoveredDeal.followUpDate ? "Follow-up" : "No Follow-up"}
                </span>
              </div>

              {/* Body */}
              <div className="px-3 py-2">
                {hoveredDeal.followUpDate ? (
                  <>
                    {/* Date & Time */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={10} className="text-purple-500" />
                        <span className="text-xs text-gray-600">
                          {formatDateShort(hoveredDeal.followUpDate)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={10} className="text-purple-500" />
                        <span className="text-xs text-gray-600">
                          {formatTimeOnly(hoveredDeal.followUpDate)}
                        </span>
                      </div>
                    </div>

                    {/* Notes - ONLY 4 words with clickable ... */}
                    {hoveredDeal.followUpComment && (
                      <button
                        onClick={() => handleViewFollowUpDetails(hoveredDeal._id)}
                        className="w-full text-left hover:bg-purple-50 rounded-md transition-colors"
                      >
                        <div className="pt-1 border-t border-gray-100">
                          <p className="text-xs text-gray-700 leading-relaxed">
                            {(() => {
                              const words = hoveredDeal.followUpComment.split(" ");
                              if (words.length <= 3) {
                                return hoveredDeal.followUpComment;
                              }
                              const truncated = words.slice(0, 3).join(" ");
                              return (
                                <>
                                  {truncated}{" "}
                                  <span className="text-purple-600 font-medium inline-block">
                                    ...
                                  </span>
                                </>
                              );
                            })()}
                          </p>
                        </div>
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-gray-500 text-center py-1">
                    No follow-up scheduled
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Dropdown Actions */}
      {openDropdownId &&
        dropdownCoords &&
        ReactDOM.createPortal(
          <div
            className="dropdown-menu absolute z-50 bg-white border rounded-md shadow-lg w-40"
            style={{
              top: dropdownCoords.top,
              left: dropdownCoords.left,
            }}
          >
            <button
              onClick={() =>
                handleEdit(deals.find((d) => d._id === openDropdownId))
              }
              className="flex items-center px-3 py-2 hover:bg-gray-100 w-full text-left"
            >
              <Edit size={16} className="mr-2" /> Edit
            </button>
            <button
              onClick={() =>
                handleDeleteClick(deals.find((d) => d._id === openDropdownId))
              }
              className="flex items-center px-3 py-2 hover:bg-gray-100 w-full text-left text-red-600"
            >
              <Trash2 size={16} className="mr-2" /> Delete
            </button>
          </div>,
          document.body
        )}

      {/* Delete Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-sm p-6">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete{" "}
            <strong>{deleteDeal?.dealName}</strong>?
          </p>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Modal */}
      <Dialog open={isBulkDeleteModalOpen} onOpenChange={setIsBulkDeleteModalOpen}>
        <DialogContent className="max-w-sm p-6">
          <DialogHeader>
            <DialogTitle>Confirm Bulk Delete</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete <strong>{selectedDeals.length}</strong> deal(s)?
          </p>
          <p className="text-sm text-red-600 mt-2">This action cannot be undone.</p>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => setIsBulkDeleteModalOpen(false)}
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkDeleteConfirm}
              disabled={isBulkDeleting}
              className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed"
            >
              {isBulkDeleting ? "Deleting..." : "Delete All"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Add CSS for fade-in animation
const style = document.createElement('style');
style.textContent = `
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(-5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .animate-fade-in {
    animation: fade-in 0.15s ease-out;
  }
`;
document.head.appendChild(style);

// Wrap component with TourProvider
export const AllDeals = () => {
  return (
    <TourProvider
      steps={dealTourSteps}
      afterOpen={() => (document.body.style.overflow = "hidden")}
      beforeClose={() => (document.body.style.overflow = "unset")}
      showNumber={false}
      styles={{
        popover: (base) => ({
          ...base,
          backgroundColor: "#fff",
          color: "#1f1f1f",
        }),
        maskArea: (base) => ({ ...base, rx: 8 }),
        badge: (base) => ({
          ...base,
          display: "none",
        }),
        close: (base) => ({
          ...base,
          right: "auto",
          left: 8,
          top: 8,
        }),
        footer: (base) => ({
          ...base,
          justifyContent: "space-between",
        }),
        buttonClose: (base) => ({
          ...base,
          display: "none",
        }),
      }}
      footer={({ close }) => (
        <div className="flex justify-between items-center w-full px-4 py-2 border-t border-gray-200">
          <button
            onClick={close}
            className="text-gray-700 hover:text-gray-900 font-semibold"
          >
            Finish Tour
          </button>
          <div />
        </div>
      )}
    >
      <AllDealsComponent />
    </TourProvider>
  );
};