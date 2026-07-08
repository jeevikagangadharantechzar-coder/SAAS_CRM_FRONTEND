import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import { ArrowLeft, Ban, Search, Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

const API_URL = import.meta.env.VITE_API_URL;

export default function RejectedLeads() {
  const navigate = useNavigate();
  const { tenantSlug } = useParams();

  const [leads, setLeads] = useState([]);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLeads, setTotalLeads] = useState(0);
  const itemsPerPage = 10;

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [clientTypeFilter, setClientTypeFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [usersList, setUsersList] = useState([]);

  // Delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState(null); // { id, name } | null for bulk
  const [deleting, setDeleting] = useState(false);

  // Rejection-reason hover tooltip (portalled so it's never clipped)
  const [hoveredLead, setHoveredLead] = useState(null);
  const [tooltipCoords, setTooltipCoords] = useState(null);
  const [tooltipTimeout, setTooltipTimeout] = useState(null);

  const handleReasonHover = (lead, event) => {
    if (tooltipTimeout) clearTimeout(tooltipTimeout);
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipCoords({ top: rect.bottom + window.scrollY + 6, left: rect.left + window.scrollX });
    setHoveredLead(lead);
  };
  const handleReasonLeave = () => {
    const timeout = setTimeout(() => setHoveredLead(null), 200);
    setTooltipTimeout(timeout);
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsersList(response.data.users || []);
      } catch {
        // non-critical
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, sourceFilter, clientTypeFilter, assigneeFilter, startDate, endDate]);

  const fetchRejectedLeads = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({ page: currentPage, limit: itemsPerPage });
      if (debouncedSearch.trim()) params.append("search", debouncedSearch.trim());
      if (sourceFilter) params.append("source", sourceFilter);
      if (clientTypeFilter) params.append("clientType", clientTypeFilter);
      if (assigneeFilter) params.append("assignee", assigneeFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const { data } = await axios.get(`${API_URL}/leads/rejected?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setLeads(data.leads || []);
      setTotalLeads(data.totalLeads || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch rejected leads");
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, sourceFilter, clientTypeFilter, assigneeFilter, startDate, endDate]);

  useEffect(() => {
    fetchRejectedLeads();
  }, [fetchRejectedLeads]);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
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

  const handleSelectLead = (id) => {
    setSelectedLeads((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const handleSelectAll = (e) => {
    setSelectedLeads(e.target.checked ? leads.map((l) => l._id) : []);
  };

  const handleDeleteClick = (lead) => {
    setLeadToDelete({ id: lead._id, name: lead.leadName });
    setShowDeleteModal(true);
  };

  const handleBulkDeleteClick = () => {
    setLeadToDelete(null);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      if (leadToDelete) {
        await axios.delete(`${API_URL}/leads/deleteLead/${leadToDelete.id}`, { headers });
        toast.success("Rejected lead deleted");
      } else {
        await axios.post(`${API_URL}/leads/rejected/bulk-delete`, { ids: selectedLeads }, { headers });
        toast.success(`${selectedLeads.length} rejected lead(s) deleted`);
        setSelectedLeads([]);
      }
      setShowDeleteModal(false);
      setLeadToDelete(null);
      fetchRejectedLeads();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };
  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    return `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
  };

  const firstItem = totalLeads === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const lastItem = Math.min(currentPage * itemsPerPage, totalLeads);
  const allSelected = leads.length > 0 && selectedLeads.length === leads.length;

  if (loading && leads.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500" />
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 overflow-hidden">
      <ToastContainer position="top-right" autoClose={3000} newestOnTop closeOnClick draggable pauseOnHover theme="light" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <button
            onClick={() => navigate(`/${tenantSlug}/leads`)}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-1"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Leads
          </button>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Ban className="w-6 h-6 text-red-500" /> Rejected Leads
          </h2>
          <p className="text-sm text-gray-500 mt-1">Leads rejected by admin, with their reason, who rejected them, and when</p>
        </div>

        {selectedLeads.length > 0 && (
          <button
            onClick={handleBulkDeleteClick}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete Selected ({selectedLeads.length})
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 max-w-[95vw] mx-auto">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name, email, phone, company, reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-11/12 md:w-full mx-auto pl-10 pr-4 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-400 block"
            />
          </div>

          <div>
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="w-11/12 md:w-full mx-auto p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
            >
              <option value="">All Assignees</option>
              {usersList.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.firstName} {user.lastName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-11/12 md:w-full mx-auto p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-[95vw] mx-auto items-end">
          <div className="col-span-1">
            <select
              value={clientTypeFilter}
              onChange={(e) => setClientTypeFilter(e.target.value)}
              className="w-11/12 md:w-full mx-auto p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
            >
              <option value="">All Client Types</option>
              <option value="B2B">B2B</option>
              <option value="B2C">B2C</option>
            </select>
          </div>
          <div className="col-span-1 md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Rejected from</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-11/12 md:w-full mx-auto p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Rejected to</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-11/12 md:w-full mx-auto p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-max w-full table-auto divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="whitespace-nowrap">
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-red-600 border-gray-300 rounded"
                  checked={allSelected}
                  onChange={handleSelectAll}
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Lead</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Contact</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Company</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Source</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Reason</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rejected By</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rejected At</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Assignee</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {leads.length > 0 ? (
              leads.map((lead, idx) => {
                const rejectedByName = lead.rejectedBy ? `${lead.rejectedBy.firstName || ""} ${lead.rejectedBy.lastName || ""}`.trim() : "-";
                return (
                  <tr key={lead._id} className={`hover:bg-gray-50 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} whitespace-nowrap`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-red-600 border-gray-300 rounded"
                        checked={selectedLeads.includes(lead._id)}
                        onChange={() => handleSelectLead(lead._id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-700 text-sm">{lead.leadName || "Unnamed Lead"}</span>
                        <span className="text-gray-400 text-xs">{lead.email || "-"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{lead.phoneNumber || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{lead.companyName || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{lead.source || "-"}</td>
                    <td className="px-4 py-3">
                      {lead.rejectionReason ? (
                        <span
                          className="text-xs px-3 py-1.5 rounded-full font-medium bg-red-50 text-red-700 border border-red-200 cursor-default inline-block"
                          onMouseEnter={(e) => handleReasonHover(lead, e)}
                          onMouseLeave={handleReasonLeave}
                        >
                          View reason
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{rejectedByName}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDate(lead.rejectedAt)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {lead.assignTo ? `${lead.assignTo.firstName} ${lead.assignTo.lastName}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteClick(lead)}
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete permanently"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-gray-500 text-sm">No rejected leads found.</td>
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
                  className={`min-w-[36px] px-2 py-1.5 text-sm border rounded-lg transition-colors ${currentPage === p ? "bg-red-600 text-white border-red-600 font-semibold" : "hover:bg-gray-100 text-gray-700"}`}>
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

      {/* Rejection reason tooltip — portalled so it's never clipped */}
      {hoveredLead?.rejectionReason && tooltipCoords && ReactDOM.createPortal(
        <div
          className="fixed z-50 w-80 max-h-72 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl p-3"
          style={{ top: tooltipCoords.top, left: tooltipCoords.left }}
          onMouseEnter={() => { if (tooltipTimeout) clearTimeout(tooltipTimeout); }}
          onMouseLeave={handleReasonLeave}
        >
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Rejection Reason</p>
            {hoveredLead.rejectedAt && (
              <p className="text-[10px] text-gray-400 font-medium shrink-0 ml-2">{formatDateTime(hoveredLead.rejectedAt)}</p>
            )}
          </div>
          <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{hoveredLead.rejectionReason}</p>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Confirm Delete
            </DialogTitle>
          </DialogHeader>

          <p className="mb-6 text-gray-700">
            Are you sure you want to permanently delete{" "}
            {leadToDelete ? <span className="font-semibold">"{leadToDelete.name}"</span> : `${selectedLeads.length} selected rejected lead(s)`}?
            This action cannot be undone.
          </p>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setShowDeleteModal(false); setLeadToDelete(null); }}
              className="px-4 py-2 rounded-lg border hover:bg-gray-100 text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center gap-2 disabled:opacity-60"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
