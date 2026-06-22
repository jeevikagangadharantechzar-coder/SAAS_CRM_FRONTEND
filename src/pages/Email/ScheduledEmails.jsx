import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription
} from "@radix-ui/react-dialog";
import { 
  Trash2, 
  ArrowLeft, 
  User as UserIcon,
  Clock,
  Calendar,
  Users,
  Mail,
  FileText,
  Plus
} from "lucide-react";
import { toast } from "react-toastify";

export default function ScheduledEmails() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [scheduledEmails, setScheduledEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [emailToDelete, setEmailToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    // Get current user from localStorage
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
      } catch (e) {
        console.error("Error parsing user:", e);
      }
    }
    
    fetchScheduledEmails();
  }, []);

/* ── Fetch Scheduled Emails Function ─────────────────────── */
  const fetchScheduledEmails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/email/scheduled`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setScheduledEmails(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching scheduled emails:", error);
      toast.error("Failed to fetch scheduled emails");
    } finally {
      setLoading(false);
    }
  };

  /* ── Handle Delete Scheduled Email Function ─────────────────────── */
  const handleDeleteScheduledEmail = async () => {
    if (!emailToDelete) return;

    try {
      setIsDeleting(true);
      const token = localStorage.getItem("token");
      const response = await axios.delete(
        `${API_URL}/email/delete/${emailToDelete._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success("Scheduled email deleted successfully");

        setScheduledEmails((prev) =>
          prev.filter((email) => email._id !== emailToDelete._id)
        );

        setShowDeleteModal(false);
        setEmailToDelete(null);
      }
    } catch (error) {
      console.error("Error deleting scheduled email:", error);
      toast.error(
        error.response?.data?.message || "Failed to delete scheduled email"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper function to get assignee name
  const getAssigneeName = (email) => {
    if (email.createdBy && typeof email.createdBy === 'object') {
      return `${email.createdBy.firstName || ''} ${email.createdBy.lastName || ''}`.trim();
    }
    return null;
  };

  // Helper function to get assignee initials
  const getAssigneeInitials = (email) => {
    if (email.createdBy && typeof email.createdBy === 'object') {
      const first = email.createdBy.firstName?.charAt(0) || '';
      const last = email.createdBy.lastName?.charAt(0) || '';
      return (first + last).toUpperCase();
    }
    return '?';
  };

  return (
    <div className="p-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/mass-email')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Go back to Mass Email"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h2 className="text-2xl font-semibold">Scheduled Emails</h2>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : scheduledEmails.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No scheduled emails found.</p>
          <p className="text-gray-400 text-sm mb-4">Schedule an email to see it here</p>
          <button
            onClick={() => navigate('/mass-email')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
          >
            <Plus size={18} />
            Create New Email
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {scheduledEmails.map((email) => (
            <div
              key={email._id}
              className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        {email.subject}
                      </h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <FileText className="w-3 h-3" />
                        Template: {email.templateTitle || "Custom Email"}
                      </p>
                    </div>
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {email.status}
                    </span>
                  </div>
                  
                  {/* Show assignee for Admin only */}
                  {currentUser?.role?.name === "Admin" && getAssigneeName(email) && (
                    <div className="mt-3 flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                        {getAssigneeInitials(email)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <UserIcon className="w-3 h-3 text-gray-400" />
                          <span className="text-xs font-medium text-gray-500">Scheduled by:</span>
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {getAssigneeName(email)}
                        </div>
                        {email.createdBy?.email && (
                          <div className="text-xs text-gray-500">
                            {email.createdBy.email}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 sm:ml-4 flex-shrink-0">
                  <button
                    onClick={() => navigate(`/create-email/${email._id}`)}
                    className="px-2 sm:px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1 whitespace-nowrap"
                  >
                    <FileText className="w-3 h-3" />
                    <span className="hidden sm:inline">Edit</span>
                    <span className="sm:hidden">Edit</span>
                  </button>

                  {/* Cancel Modal Trigger */}
                  <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                    <DialogTrigger asChild>
                      <button
                        onClick={() => setEmailToDelete(email)}
                        className="px-2 sm:px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1 whitespace-nowrap"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Cancel</span>
                        <span className="sm:hidden">Cancel</span>
                      </button>
                    </DialogTrigger>

                    <DialogPortal>
                      <DialogOverlay className="fixed inset-0 bg-black/30" />
                      <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg w-[400px]">
                        <DialogTitle className="sr-only">Confirm Cancel Scheduled Email</DialogTitle>
                        <DialogDescription className="sr-only">
                          Are you sure you want to cancel the scheduled email? This action cannot be undone.
                        </DialogDescription>
                        <div className="flex items-center gap-2 text-red-600 mb-4">
                          <Trash2 className="w-5 h-5" />
                          <span className="font-semibold text-lg">Confirm Cancel</span>
                        </div>

                        <p className="mb-6 text-gray-700">
                          Are you sure you want to cancel the scheduled email{" "}
                          <strong>{emailToDelete?.subject}</strong>? This action cannot
                          be undone.
                        </p>

                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => setShowDeleteModal(false)}
                            className="px-4 py-2 rounded-lg border hover:bg-gray-100 text-gray-700"
                          >
                            No
                          </button>

                          <button
                            onClick={handleDeleteScheduledEmail}
                            disabled={isDeleting}
                            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"
                          >
                            {isDeleting ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                                Cancelling...
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-4 h-4" />
                                Yes, Cancel
                              </>
                            )}
                          </button>
                        </div>
                      </DialogContent>
                    </DialogPortal>
                  </Dialog>
                </div>
              </div>

              <div className="mt-4 text-sm text-gray-600 border-t pt-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <div>
                      <span className="text-xs text-gray-500 block">Scheduled For</span>
                      <span className="font-medium">{new Date(email.scheduledFor).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <div>
                      <span className="text-xs text-gray-500 block">Recipients</span>
                      <span className="font-medium">{email.recipients.length} {email.recipients.length === 1 ? 'person' : 'people'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <div>
                      <span className="text-xs text-gray-500 block">Created</span>
                      <span className="font-medium">{new Date(email.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                {/* Show recipients preview for admin */}
                {currentUser?.role?.name === "Admin" && email.recipients.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-gray-100">
                    <div className="flex items-start gap-2">
                      <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <span className="text-xs font-medium text-gray-500 block mb-1">Recipients:</span>
                        <div className="flex flex-wrap gap-1">
                          {email.recipients.slice(0, 3).map((recipient, idx) => (
                            <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                              {recipient}
                            </span>
                          ))}
                          {email.recipients.length > 3 && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                              +{email.recipients.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}