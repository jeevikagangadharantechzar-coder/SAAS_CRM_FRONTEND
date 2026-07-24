import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import DatePicker from "react-datepicker";
import { FaCalendarAlt, FaEye, FaTrash } from "react-icons/fa";
import { BsThreeDotsVertical } from "react-icons/bs";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "react-datepicker/dist/react-datepicker.css";
import { List, LayoutGrid } from "lucide-react";
import ProposalPipelineView from "./ProposalPipelineView";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { TourProvider, useTour } from "@reactour/tour";

// Status styles
const STATUS_STYLES = {
  draft: "bg-orange-50 text-orange-700 border-orange-200",
  sent: "bg-blue-50 text-blue-700 border-blue-200",
  "no reply": "bg-gray-50 text-gray-500 border-gray-200",
  rejection: "bg-red-50 text-red-600 border-red-200",
  success: "bg-green-50 text-green-700 border-green-200",
};

const PAGE_SIZE = 10;

// Tour steps
const tourSteps = [
  {
    selector: ".tour-header",
    content:
      "This is your proposal dashboard where you can manage all your proposals.",
  },
  {
    selector: ".tour-drafts",
    content: "View your draft proposals that are not yet sent to clients.",
  },
  {
    selector: ".tour-new-proposal",
    content: "Create a new proposal to send to your clients.",
  },
  {
    selector: ".tour-filters",
    content:
      "Filter proposals by status, creation date, or search for specific proposals.",
  },
  {
    selector: ".tour-proposal-table",
    content: "This table lists all your proposals with their details.",
  },
  {
    selector: ".tour-deal-title",
    content: "Click on a deal title to view the full proposal details.",
  },
  {
    selector: ".tour-status",
    content:
      "Change the status of your proposals (Draft, Sent, No Reply, Rejection, Success).",
  },
  {
    selector: ".tour-followup",
    content:
      "Click on the follow-up date to set or edit a reminder for following up with the client.",
  },
  {
    selector: ".tour-actions",
    content:
      "Access additional options like viewing the full proposal or deleting it.",
  },
  {
    selector: ".tour-finish",
    content:
      "You've completed the tour! Click the 'Take Tour' button anytime to review the features again.",
  },
];

const ProposalHeadContent = () => {
  const API_URL = import.meta.env.VITE_API_URL;

  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openActionId, setOpenActionId] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCreatedDate, setFilterCreatedDate] = useState(null);
  const [filterAssignee, setFilterAssignee] = useState("");
  const [usersList, setUsersList] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [draftCount, setDraftCount] = useState(0);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [followUpDate, setFollowUpDate] = useState(null);
  const [followUpComment, setFollowUpComment] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProposals, setSelectedProposals] = useState([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [viewMode, setViewMode] = useState("list");

  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const { setIsOpen, setCurrentStep } = useTour();

  // Fetch proposals
  const fetchProposals = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/proposal/getall`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProposals(response.data);
      setDraftCount(response.data.filter((p) => p.status === "draft").length);
      setError("");
    } catch {
      setError("Failed to load proposals.");
      toast.error("Failed to load proposals.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProposals();
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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenActionId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API_URL}/proposal/updatestatus/${id}`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProposals((prev) =>
        prev.map((p) => (p._id === id ? { ...p, status: newStatus } : p))
      );

      // Update draft count if status changed to/from draft
      if (newStatus === "draft") {
        setDraftCount((prev) => prev + 1);
      } else {
        const proposal = proposals.find((p) => p._id === id);
        if (proposal && proposal.status === "draft") {
          setDraftCount((prev) => prev - 1);
        }
      }

      toast.success(`Status updated to ${newStatus}`);
    } catch {
      toast.error("Failed to update status.");
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("token");
      // Check if it's a draft to update draft count
      const proposalToDelete = proposals.find((p) => p._id === id);
      const isDraft = proposalToDelete && proposalToDelete.status === "draft";

      await axios.delete(`${API_URL}/proposal/delete/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProposals((prev) => prev.filter((p) => p._id !== id));

      // Update draft count if deleted proposal was a draft
      if (isDraft) {
        setDraftCount((prev) => prev - 1);
      }

      toast.success("Proposal deleted successfully.");
    } catch {
      toast.error("Failed to delete proposal.");
    }
  };

  const openFollowUpDialog = (proposal) => {
    setSelectedProposal(proposal);
    setFollowUpDate(
      proposal.followUpDate ? new Date(proposal.followUpDate) : null
    );
    setFollowUpComment(proposal.followUpComment || "");
    setIsEditing(false);
    setFollowUpDialogOpen(true);
  };

  const saveFollowUp = async () => {
    if (!selectedProposal) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `${API_URL}/proposal/followup/${selectedProposal._id}`,
        { followUpDate, followUpComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProposals((prev) =>
        prev.map((p) =>
          p._id === selectedProposal._id ? res.data.proposal : p
        )
      );
      toast.success("Follow-up updated!");
      setFollowUpDialogOpen(false);
    } catch {
      toast.error("Failed to update follow-up.");
    }
  };

  // Filter proposals
  const filteredProposals = proposals.filter((proposal) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      proposal.title?.toLowerCase().includes(search) ||
      proposal.email?.toLowerCase().includes(search) ||
      proposal.dealTitle?.toLowerCase().includes(search);

    const matchesFilters =
      (filterStatus === "" || proposal.status === filterStatus) &&
      (filterCreatedDate === null ||
        (proposal.createdAt &&
          new Date(proposal.createdAt).toLocaleDateString() ===
            new Date(filterCreatedDate).toLocaleDateString())) &&
      (filterAssignee === "" ||
        (proposal.deal &&
          (proposal.deal.assignedTo?._id === filterAssignee ||
           proposal.deal.assignedTo === filterAssignee)));

    return matchesSearch && matchesFilters;
  });

  const totalPages = Math.ceil(filteredProposals.length / PAGE_SIZE);
  const currentPageProposals = filteredProposals.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const openDropdown = (id, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
    });
    setOpenActionId(openActionId === id ? null : id);
  };

  // Checkbox helpers for bulk delete
  const handleCheckboxChange = (id) =>
    setSelectedProposals((prev) =>
      prev.includes(id) ? prev.filter((prop) => prop !== id) : [...prev, id]
    );

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allFilteredIds = filteredProposals.map((prop) => prop._id);
      setSelectedProposals(allFilteredIds);
    } else {
      setSelectedProposals([]);
    }
  };

  const isAllSelected = 
    filteredProposals.length > 0 && 
    selectedProposals.length === filteredProposals.length;

  // Bulk Delete functions
  const handleBulkDelete = () => {
    if (!selectedProposals.length) return toast.info("Select proposals to delete");
    setIsBulkDeleteModalOpen(true);
  };

  const handleBulkDeleteConfirm = async () => {
    try {
      setIsBulkDeleting(true);
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/proposal/bulk-delete`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { ids: selectedProposals },
      });
      toast.success(`Successfully deleted ${selectedProposals.length} proposal(s)`);
      setSelectedProposals([]);
      setIsBulkDeleteModalOpen(false);
      await fetchProposals();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete proposals");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedProposals([]);
  };

  const startTour = () => {
    setIsOpen(true);
    setCurrentStep(0);
  };

  return (
    <div className="min-h-screen py-8 px-4 md:px-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 tour-header">
        <h1 className="text-2xl font-bold text-gray-800">Proposal List</h1>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={startTour}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 tour-finish"
          >
            <FaEye className="w-4 h-4" /> Take Tour
          </button>
          <Link to="/proposal/drafts" className="tour-drafts">
            <button className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2 rounded-lg font-medium shadow-sm transition">
              Drafts ({draftCount})
            </button>
          </Link>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md flex items-center justify-center transition ${
                viewMode === "list"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              title="List View"
            >
              <List size={20} />
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`p-2 rounded-md flex items-center justify-center transition ${
                viewMode === "kanban"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              title="Kanban View"
            >
              <LayoutGrid size={20} />
            </button>
          </div>
          <Link to="/proposal/sendproposal" className="tour-new-proposal">
            <button className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-700 transition">
              + New Proposal
            </button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-8 mb-6 items-center tour-filters">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded-md px-4 py-2 bg-white focus:ring-2 focus:ring-blue-400"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="no reply">No Reply</option>
          <option value="rejection">Rejection</option>
          <option value="success">Success</option>
        </select>

        <select
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          className="border rounded-md px-4 py-2 bg-white focus:ring-2 focus:ring-blue-400"
        >
          <option value="">All Assignees</option>
          {usersList.map((user) => (
            <option key={user._id || user.id} value={user._id || user.id}>
              {user.firstName} {user.lastName}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <DatePicker
            selected={filterCreatedDate}
            onChange={(date) => {
              setFilterCreatedDate(date);
              setCurrentPage(1);
            }}
            customInput={
              <button className="border rounded-md bg-white px-3 py-2 text-left w-full flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {filterCreatedDate
                    ? new Date(filterCreatedDate).toLocaleDateString()
                    : "Create Date"}<FaCalendarAlt className="text-gray-500" />
                </span>
              </button>
            }
          />

          {filterCreatedDate && (
            <button
              onClick={() => {
                setFilterCreatedDate(null);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-md"
            >
              Clear
            </button>
          )}
        </div>

        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by title, email, or deal"
          className="border rounded-full px-3 py-2 bg-white focus:ring-2 focus:ring-blue-400 md:w-1/3"
        />
      </div>

      {/* Bulk Delete Bar */}
      {selectedProposals.length > 0 && (
        <div className="mb-4 flex items-center justify-between bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-red-700 font-medium">
              {selectedProposals.length} proposal{selectedProposals.length > 1 ? "s" : ""} selected
            </span>
            <button
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
            >
              <FaTrash size={14} />
              {isBulkDeleting ? "Deleting..." : `Delete Selected (${selectedProposals.length})`}
            </button>
            <button
              onClick={handleClearSelection}
              className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-100 rounded-md transition-colors"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}

      {/* Table or Kanban */}
      {viewMode === "list" ? (
        <>
          <div className="overflow-x-auto bg-white shadow rounded-lg tour-proposal-table">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-700">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={isAllSelected}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = 
                        selectedProposals.length > 0 && 
                        selectedProposals.length < filteredProposals.length;
                    }
                  }}
                />
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">
                Title
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">
                Deal Title
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">
                Email
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">
                Status
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">
                Follow-up Date
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {currentPageProposals.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-4 text-gray-400">
                  No proposals found
                </td>
              </tr>
            ) : (
              currentPageProposals.map((proposal) => (
                <tr
                  key={proposal._id}
                  className="border-b hover:bg-gray-50 transition relative"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      onChange={() => handleCheckboxChange(proposal._id)}
                      checked={selectedProposals.includes(proposal._id)}
                    />
                  </td>
                  <td className="px-4 py-3">{proposal.title}</td>
                  <td className="px-4 py-3 text-blue-600 hover:underline cursor-pointer tour-deal-title">
                    <Link to={`/proposal/view/${proposal._id}`}>
                      {proposal.dealTitle || "No Deal"}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{proposal.email}</td>
                  <td className="px-4 py-3 tour-status">
                    <select
                      value={proposal.status}
                      onChange={(e) =>
                        handleStatusChange(proposal._id, e.target.value)
                      }
                      disabled={proposal.status === "draft"}
                      title={proposal.status === "draft" ? "Send this draft first (it hasn't been emailed yet) before its status can change" : ""}
                      className={`border px-2 py-1 rounded ${
                        STATUS_STYLES[proposal.status]
                      } ${proposal.status === "draft" ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                      <option value="draft" disabled={proposal.status !== "draft"}>Draft</option>
                      <option value="sent">Sent</option>
                      <option value="no reply">No Reply</option>
                      <option value="rejection">Rejection</option>
                      <option value="success">Success</option>
                    </select>
                  </td>
                  <td
                    className="px-4 py-3 cursor-pointer text-blue-600 hover:underline tour-followup"
                    onClick={() => openFollowUpDialog(proposal)}
                  >
                    {proposal.followUpDate
                      ? new Date(proposal.followUpDate).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })
                      : new Date(proposal.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 relative tour-actions">
                    <button
                      onClick={(e) => openDropdown(proposal._id, e)}
                      className="p-1"
                    >
                      <BsThreeDotsVertical />
                    </button>

                    {openActionId === proposal._id &&
                      ReactDOM.createPortal(
                        <div
                          ref={dropdownRef}
                          className="absolute bg-white shadow-md rounded border z-50"
                          style={{
                            top: dropdownPosition.top,
                            left: dropdownPosition.left,
                          }}
                        >
                          <button
                            onClick={() =>
                              navigate(`/proposal/view/${proposal._id}`)
                            }
                            className="block px-4 py-2 w-full text-left hover:bg-gray-100"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDelete(proposal._id)}
                            className="block px-4 py-2 w-full text-left text-red-600 hover:bg-gray-100"
                          >
                            Delete
                          </button>
                        </div>,
                        document.body
                      )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6 tour-pagination">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={`px-3 py-1.5 rounded-lg border text-sm transition 
              ${
                currentPage === 1
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-700 hover:bg-gray-50 border-gray-300"
              }`}
          >
            Prev
          </button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`px-3 py-1.5 rounded-lg text-sm transition 
                  ${
                    currentPage === pageNum
                      ? "bg-blue-600 text-white font-medium shadow-sm"
                      : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className={`px-3 py-1.5 rounded-lg border text-sm transition 
              ${
                currentPage === totalPages
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-700 hover:bg-gray-50 border-gray-300"
              }`}
          >
            Next
          </button>
        </div>
      )}
      </>
      ) : (
        <ProposalPipelineView
          proposals={filteredProposals}
          handleStatusChange={handleStatusChange}
          handleDelete={handleDelete}
          openFollowUpDialog={openFollowUpDialog}
        />
      )}

      {/* Follow-up Dialog */}
      <Dialog open={followUpDialogOpen} onOpenChange={setFollowUpDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Follow-up Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {!isEditing ? (
              <>
                <div>
                  <p className="text-sm text-gray-500">Follow-up Date</p>
                  <p className="font-medium">
                    {followUpDate
                      ? new Date(followUpDate).toLocaleString()
                      : "No date set"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Comment</p>
                  <p className="font-medium">
                    {followUpComment || "No comment added"}
                  </p>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Edit
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="relative">
                  <FaCalendarAlt className="absolute left-3 top-3 text-gray-400" />
                  <DatePicker
                    selected={followUpDate}
                    onChange={(date) => setFollowUpDate(date)}
                    showTimeSelect
                    dateFormat="Pp"
                    placeholderText="Select follow-up date"
                    className="w-full border px-10 py-2 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <textarea
                  value={followUpComment}
                  onChange={(e) => setFollowUpComment(e.target.value)}
                  className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Add a follow-up comment"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveFollowUp}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Save
                  </button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Modal */}
      <Dialog open={isBulkDeleteModalOpen} onOpenChange={setIsBulkDeleteModalOpen}>
        <DialogContent className="max-w-sm p-6">
          <DialogHeader>
            <DialogTitle>Confirm Bulk Delete</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete <strong>{selectedProposals.length}</strong> proposal(s)?
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
};

const ProposalHead = () => {
  return (
    <TourProvider
      steps={tourSteps}
      afterOpen={() => (document.body.style.overflow = "hidden")}
      beforeClose={() => (document.body.style.overflow = "unset")}
      disableInteraction={true}
      styles={{
        popover: (base) => ({
          ...base,
          backgroundColor: "#fff",
          color: "#1f1f1f",
          borderRadius: "12px",
        }),
        maskArea: (base) => ({ ...base, rx: 8 }),
        badge: (base) => ({ ...base, display: "none" }),
        close: (base) => ({
          ...base,
          right: "auto",
          left: 8,
          top: 8,
        }),
        controls: (base) => ({
          ...base,
          marginTop: 16,
        }),
      }}
    >
      <ProposalHeadContent />
    </TourProvider>
  );
};

export default ProposalHead;