import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import { Trash2, RotateCcw, Search, Info, Users, Briefcase, ChevronLeft, ChevronRight } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

const API_URL = import.meta.env.VITE_API_URL;
const TRASH_RETENTION_DAYS = 30;

export default function TrashPage() {
  const navigate = useNavigate();
  const { tenantSlug } = useParams();

  // Trash is Admin-only end to end (every backend route 403s for non-admins) —
  // this just avoids showing a broken page full of failed-request toasts to
  // anyone who lands here directly.
  useEffect(() => {
    const userData = localStorage.getItem("user");
    const role = userData ? JSON.parse(userData)?.role?.name : "";
    if (role !== "Admin") navigate(`/${tenantSlug}/dashboard`, { replace: true });
  }, [navigate, tenantSlug]);

  const [itemType, setItemType] = useState("leads"); // "leads" | "deals"

  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [usersList, setUsersList] = useState([]);

  // Restore confirmation
  const [restoring, setRestoring] = useState(false);

  // Delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); // { id, name } | null for bulk
  const [deleting, setDeleting] = useState(false);

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

  // Switching tabs or filters always resets pagination and the current selection.
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [itemType, debouncedSearch, assigneeFilter, itemsPerPage]);

  const fetchTrash = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({ page: currentPage, limit: itemsPerPage });
      if (debouncedSearch.trim()) params.append("search", debouncedSearch.trim());
      if (assigneeFilter) params.append("assignee", assigneeFilter);

      const endpoint = itemType === "leads" ? "leads/trash" : "deals/trash";
      const { data } = await axios.get(`${API_URL}/${endpoint}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const list = itemType === "leads" ? (data.leads || []) : (data.deals || []);
      const total = itemType === "leads" ? data.totalLeads : data.totalDeals;

      setItems(list);
      setTotalItems(total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to fetch trashed ${itemType}`);
    } finally {
      setLoading(false);
    }
  }, [itemType, currentPage, debouncedSearch, assigneeFilter, itemsPerPage]);

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectItem = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const handleSelectAll = (e) => {
    setSelectedIds(e.target.checked ? items.map((i) => i._id) : []);
  };

  /* ── Restore ─────────────────────── */
  const handleRestoreClick = async (item) => {
    const name = itemType === "leads" ? item.leadName : item.dealName;
    if (!window.confirm(`Restore "${name}" out of trash?`)) return;

    setRestoring(true);
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_URL}/${itemType}/${item._id}/restore`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(itemType === "leads" ? "Lead restored" : "Deal restored");
      setItems((prev) => prev.filter((i) => i._id !== item._id));
      setSelectedIds((prev) => prev.filter((id) => id !== item._id));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to restore");
    } finally {
      setRestoring(false);
    }
  };

  const handleBulkRestore = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Restore ${selectedIds.length} selected item(s) out of trash?`)) return;

    setRestoring(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_URL}/${itemType}/trash/bulk-restore`,
        { ids: selectedIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`${selectedIds.length} item(s) restored`);
      setSelectedIds([]);
      fetchTrash();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to restore selected items");
    } finally {
      setRestoring(false);
    }
  };

  /* ── Permanent Delete ─────────────────────── */
  const handleDeleteClick = (item) => {
    setItemToDelete({ id: item._id, name: itemType === "leads" ? item.leadName : item.dealName });
    setShowDeleteModal(true);
  };

  const handleBulkDeleteClick = () => {
    setItemToDelete(null);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      if (itemToDelete) {
        const singleUrl = itemType === "leads"
          ? `${API_URL}/leads/deleteLead/${itemToDelete.id}`
          : `${API_URL}/deals/delete-deal/${itemToDelete.id}`;
        await axios.delete(singleUrl, { headers });
        toast.success(itemType === "leads" ? "Lead permanently deleted" : "Deal permanently deleted");
      } else {
        await axios.post(
          `${API_URL}/${itemType}/trash/bulk-delete`,
          { ids: selectedIds },
          { headers }
        );
        toast.success(`${selectedIds.length} item(s) permanently deleted`);
        setSelectedIds([]);
      }

      setShowDeleteModal(false);
      setItemToDelete(null);
      fetchTrash();
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

  const daysLeft = (trashedAt) => {
    if (!trashedAt) return null;
    const purgeAt = new Date(trashedAt).getTime() + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    return Math.max(0, Math.ceil((purgeAt - Date.now()) / (24 * 60 * 60 * 1000)));
  };

  const firstItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const lastItem = Math.min(currentPage * itemsPerPage, totalItems);
  const allSelected = items.length > 0 && selectedIds.length === items.length;

  if (loading && items.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-500" />
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 overflow-hidden">
      <ToastContainer position="top-right" autoClose={3000} newestOnTop closeOnClick draggable pauseOnHover theme="light" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Trash2 className="w-6 h-6 text-gray-500" /> Trash
          </h2>
          <p className="text-sm text-gray-500 mt-1">Deleted leads and deals — restore them or delete permanently.</p>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkRestore}
              disabled={restoring}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow flex items-center gap-2 disabled:opacity-60"
            >
              <RotateCcw className="w-4 h-4" />
              Restore Selected ({selectedIds.length})
            </button>
            <button
              onClick={handleBulkDeleteClick}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected ({selectedIds.length})
            </button>
          </div>
        )}
      </div>

      {/* 30-day retention banner */}
      <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 flex items-center gap-2 text-amber-800 text-sm">
        <Info className="w-4 h-4 shrink-0" />
        Items in Trash are automatically deleted after {TRASH_RETENTION_DAYS} days.
      </div>

      {/* Leads / Deals toggle */}
      <div className="inline-flex bg-gray-100 rounded-lg p-1 mb-4">
        <button
          onClick={() => setItemType("leads")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            itemType === "leads" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Users className="w-4 h-4" /> Leads
        </button>
        <button
          onClick={() => setItemType("deals")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            itemType === "deals" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Briefcase className="w-4 h-4" /> Deals
        </button>
      </div>

      {/* Search & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 max-w-[95vw]">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder={`Search trashed ${itemType}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>

        <div>
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
          >
            <option value="">All Assignees</option>
            {usersList.map((user) => (
              <option key={user._id} value={user._id}>
                {user.firstName} {user.lastName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-max w-full table-auto divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="whitespace-nowrap">
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-gray-600 border-gray-300 rounded"
                  checked={allSelected}
                  onChange={handleSelectAll}
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                {itemType === "leads" ? "Lead" : "Deal"}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Contact</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Company</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Assignee</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Trashed On</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Auto-delete</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {items.length > 0 ? (
              items.map((item, idx) => {
                const name = itemType === "leads" ? item.leadName : item.dealName;
                const assignee = itemType === "leads" ? item.assignTo : item.assignedTo;
                const left = daysLeft(item.trashedAt);
                return (
                  <tr key={item._id} className={`hover:bg-gray-50 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} whitespace-nowrap`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-gray-600 border-gray-300 rounded"
                        checked={selectedIds.includes(item._id)}
                        onChange={() => handleSelectItem(item._id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-700 text-sm">{name || `Unnamed ${itemType === "leads" ? "Lead" : "Deal"}`}</span>
                        <span className="text-gray-400 text-xs">{item.email || "-"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.phoneNumber || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.companyName || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {assignee ? `${assignee.firstName || ""} ${assignee.lastName || ""}`.trim() : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDate(item.trashedAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                        left !== null && left <= 3
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-gray-50 text-gray-600 border-gray-200"
                      }`}>
                        {left !== null ? `${left} day${left === 1 ? "" : "s"} left` : "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleRestoreClick(item)}
                          disabled={restoring}
                          className="p-2 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors disabled:opacity-60"
                          title="Restore"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(item)}
                          className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete permanently"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-500 text-sm">
                  No trashed {itemType} found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination — same footer style as the main Leads table: rows-per-page
            select, a "Showing X–Y of Z" summary, and prev/next chevrons only
            (no numbered page buttons). Always rendered, buttons just disable
            themselves when there's nothing to page through. */}
        <div className="flex items-center justify-end gap-6 border-t border-gray-200 bg-white px-4 py-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="border-none bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
            </select>
          </div>

          <span>
            Showing {firstItem}–{lastItem} of {totalItems}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              aria-label="Previous page"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              aria-label="Next page"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Confirm Permanent Delete
            </DialogTitle>
          </DialogHeader>

          <p className="mb-6 text-gray-700">
            Are you sure you want to permanently delete{" "}
            {itemToDelete ? <span className="font-semibold">"{itemToDelete.name}"</span> : `${selectedIds.length} selected item(s)`}?
            This action cannot be undone.
          </p>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setShowDeleteModal(false); setItemToDelete(null); }}
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
