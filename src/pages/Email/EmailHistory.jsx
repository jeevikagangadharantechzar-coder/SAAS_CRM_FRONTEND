import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from "react-toastify";
import {
  Download,
  X,
  ArrowLeft,
  Mail,
  Paperclip,
  Users,
  Calendar,
  FileText,
  Clock,
  Trash2,
  CheckSquare,
  Square,
  AlertCircle
} from 'lucide-react';

const EmailHistory = () => { 
  const API_URL = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();

  const [historyData, setHistoryData] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit, setHistoryLimit] = useState(15);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Delete states
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [selectAllMode, setSelectAllMode] = useState(false); 
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [emailToDelete, setEmailToDelete] = useState(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Modal states
  const [selectedRecipients, setSelectedRecipients] = useState(null);
  const [showRecipientsModal, setShowRecipientsModal] = useState(false);
  const [selectedEmailContent, setSelectedEmailContent] = useState(null);
  const [showEmailViewModal, setShowEmailViewModal] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState([]);
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);
  const [allContacts, setAllContacts] = useState([]);

  // Get current user from localStorage
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
      } catch (e) {
        console.error("Error parsing user:", e);
      }
    }
    fetchHistory(1);
    fetchAllContacts();
  }, []);

  // Fetch email history
  const fetchHistory = async (page = 1, limit = historyLimit) => {
    try {
      setLoadingHistory(true);
      const token = localStorage.getItem("token");

      const response = await axios.get(
        `${API_URL}/email/history?page=${page}&limit=${limit}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setHistoryData(response.data.data);
      setHistoryTotalPages(response.data.totalPages);
      setHistoryTotal(response.data.total);
      setHistoryPage(page);

    } catch (error) {
      console.error("History fetch error:", error);
      toast.error("Failed to fetch email history");
    } finally {
      setLoadingHistory(false);
    }
  };

  // Fetch all contacts for recipient names
  const fetchAllContacts = async () => {
    try {
      const token = localStorage.getItem('token');
      
      let contactsData = [];
      
      // Fetch leads
      try {
        const leadsResponse = await axios.get(`${API_URL}/leads/getAllLead`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        let leadsData = [];
        if (leadsResponse.data?.leads) {
          leadsData = leadsResponse.data.leads;
        } else if (Array.isArray(leadsResponse.data)) {
          leadsData = leadsResponse.data;
        } else if (leadsResponse.data?.data) {
          leadsData = leadsResponse.data.data;
        }
        
        const formattedLeads = leadsData
          .filter(lead => lead.email)
          .map(lead => ({
            email: lead.email || '',
            name: lead.leadName || lead.name || '',
          }));
        
        contactsData = [...contactsData, ...formattedLeads];
      } catch (error) {
        console.error('Error fetching leads:', error);
      }
      
      // Fetch deals
      try {
        const dealsResponse = await axios.get(`${API_URL}/deals/getAll`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        let dealsData = [];
        if (Array.isArray(dealsResponse.data)) {
          dealsData = dealsResponse.data;
        } else if (dealsResponse.data?.deals) {
          dealsData = dealsResponse.data.deals;
        } else if (dealsResponse.data?.data) {
          dealsData = dealsResponse.data.data;
        }
        
        const formattedDeals = dealsData
          .filter(deal => deal.email || deal.leadEmail)
          .map(deal => {
            const email = deal.email || deal.leadEmail || '';
            const name = deal.dealName || deal.leadName || '';
            return { email, name };
          });
        
        contactsData = [...contactsData, ...formattedDeals];
      } catch (error) {
        console.error('Error fetching deals:', error);
      }
      
      // Remove duplicates by email
      const uniqueContacts = [];
      const emailSet = new Set();
      
      contactsData.forEach(contact => {
        if (contact.email && !emailSet.has(contact.email.toLowerCase())) {
          emailSet.add(contact.email.toLowerCase());
          uniqueContacts.push(contact);
        }
      });
      
      setAllContacts(uniqueContacts);
      
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  // Get contact name by email
  const getContactNameByEmail = (email) => {
    const contact = allContacts.find(c => c.email?.toLowerCase() === email?.toLowerCase());
    return contact ? contact.name : email;
  };

  // Handle page change
  const handlePageChange = (page) => {
    fetchHistory(page, historyLimit);
  };

  // Handle limit change
  const handleLimitChange = (e) => {
    const newLimit = Number(e.target.value);
    setHistoryLimit(newLimit);
    fetchHistory(1, newLimit);
  };

  // Selection handlers
  const handleSelectEmail = (emailId) => {
    // If in "Select All" mode, turning it off
    if (selectAllMode) {
      setSelectAllMode(false);
    }
    
    setSelectedEmails(prev => {
      if (prev.includes(emailId)) {
        return prev.filter(id => id !== emailId);
      } else {
        return [...prev, emailId];
      }
    });
  };

  // Handle Select All - This now means ALL emails across all pages
  const handleSelectAll = () => {
    if (selectAllMode) {
      // Deselect all
      setSelectedEmails([]);
      setSelectAllMode(false);
      toast.info("Selection cleared");
    } else {
      // Select ALL emails
      setSelectAllMode(true);
      
      // For UI feedback, select all current page emails
      const currentPageIds = historyData.map(email => email._id);
      setSelectedEmails(currentPageIds);
      
      toast.success(`All ${historyTotal} emails will be deleted when you confirm`, {
        icon: <AlertCircle className="w-5 h-5" />
      });
    }
  };

  // Check if an email is selected
  const isEmailSelected = (emailId) => {
    return selectAllMode || selectedEmails.includes(emailId);
  };

  // Get selection count display
  const getSelectionCount = () => {
    if (selectAllMode) {
      return historyTotal;
    }
    return selectedEmails.length;
  };

  // Get selection text
  const getSelectionText = () => {
    const count = getSelectionCount();
    if (count === 0) return '';
    
    if (selectAllMode) {
      return `All ${count} emails selected across all pages`;
    }
    return `${count} email${count > 1 ? 's' : ''} selected`;
  };

  // Delete handlers
  const handleDeleteClick = (email) => {
    setEmailToDelete(email);
    setShowDeleteModal(true);
  };

/* ── Handle Bulk Delete Click Function ─────────────────────── */
  const handleBulkDeleteClick = () => {
    if (getSelectionCount() > 0) {
      setShowBulkDeleteModal(true);
    }
  };

  const confirmDelete = async () => {
    if (!emailToDelete) return;
    
    try {
      setDeleting(true);
      const token = localStorage.getItem("token");
      
      await axios.delete(`${API_URL}/email/delete/${emailToDelete._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Email deleted successfully");
      setShowDeleteModal(false);
      setEmailToDelete(null);
      
      // Refresh current page
      fetchHistory(historyPage, historyLimit);
      
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(error.response?.data?.message || "Failed to delete email");
    } finally {
      setDeleting(false);
    }
  };

/* ── Confirm Bulk Delete Function ─────────────────────── */
  const confirmBulkDelete = async () => {
    const selectionCount = getSelectionCount();
    if (selectionCount === 0) return;
    
    try {
      setDeleting(true);
      const token = localStorage.getItem("token");
      
      // Prepare request based on selection mode
      const requestData = selectAllMode 
        ? { selectAll: true } // This tells backend to delete ALL emails
        : { emailIds: selectedEmails }; // Delete specific emails
      
      const response = await axios.post(
        `${API_URL}/email/bulk-delete`,
        requestData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(response.data.message || "Emails deleted successfully");
      setShowBulkDeleteModal(false);
      setSelectedEmails([]);
      setSelectAllMode(false);
      
      // Refresh current page
      fetchHistory(historyPage, historyLimit);
      
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast.error(error.response?.data?.message || "Failed to delete emails");
    } finally {
      setDeleting(false);
    }
  };

  // Download attachment
  const downloadAttachment = async (file) => {
    try {
      const token = localStorage.getItem("token");
      const downloadUrl = `${API_URL}/files/download?filePath=${encodeURIComponent(file.path)}`;

      const response = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.filename;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("File downloaded successfully");
    } catch (error) {
      toast.error("Failed to download file");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/mass-email')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Go back"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Email History</h1>
              <p className="text-gray-600 text-sm mt-1">
                Total: {historyTotal} emails • Page {historyPage} of {historyTotalPages}
              </p>
            </div>
          </div>
          
          {/* Bulk delete button and selection info */}
          {getSelectionCount() > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-4 sm:mt-0 w-full sm:w-auto">
              <span className="text-sm text-gray-600">
                {getSelectionText()}
              </span>
              <button
                onClick={handleBulkDeleteClick}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected ({getSelectionCount()})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {loadingHistory ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : historyData.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No sent emails found.</p>
            <button
              onClick={() => navigate('/mass-email')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create New Email
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Select All Row */}
            <div className="p-4 border-b bg-blue-50 flex items-center gap-4">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-2 text-sm font-medium"
              >
                {selectAllMode ? (
                  <>
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                    <span className="text-blue-600">✓ All {historyTotal} emails selected</span>
                  </>
                ) : (
                  <>
                    <Square className="w-5 h-5 text-gray-600" />
                    <span className="text-gray-700">Select all {historyTotal} emails</span>
                  </>
                )}
              </button>
              {selectAllMode && (
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                  All pages selected
                </span>
              )}
            </div>

            {/* Table View for larger screens */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Select
                      </span>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Template
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Recipients
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Attachments
                    </th>
                    {currentUser?.role?.name === "Admin" && (
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Sent By
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Created At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Sent / Scheduled For
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {historyData.map((email) => (
                    <tr key={email._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleSelectEmail(email._id)}
                          className="flex items-center"
                          disabled={selectAllMode}
                        >
                          {isEmailSelected(email._id) ? (
                            <CheckSquare className={`w-4 h-4 ${selectAllMode ? 'text-blue-300' : 'text-blue-600'}`} />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            setSelectedEmailContent(email.content);
                            setShowEmailViewModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                        >
                          <FileText className="w-4 h-4" />
                          {email.templateTitle || "Custom Email"}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {email.subject}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            setSelectedRecipients(email.recipients);
                            setShowRecipientsModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <Users className="w-4 h-4" />
                          {email.recipients.length} {email.recipients.length === 1 ? 'Recipient' : 'Recipients'}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        {email.attachments && email.attachments.length > 0 ? (
                          <button
                            onClick={() => {
                              setSelectedAttachments(email.attachments);
                              setShowAttachmentsModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            <Paperclip className="w-4 h-4" />
                            {email.attachments.length} {email.attachments.length === 1 ? 'File' : 'Files'}
                          </button>
                        ) : (
                          <span className="text-gray-400 text-sm">No files</span>
                        )}
                      </td>
                      {currentUser?.role?.name === "Admin" && (
                        <td className="px-6 py-4">
                          {email.createdBy ? (
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                                {email.createdBy.firstName?.charAt(0)}{email.createdBy.lastName?.charAt(0)}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {email.createdBy.firstName} {email.createdBy.lastName}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {email.createdBy.email}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">Unknown</span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(email.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          {email.status === 'scheduled' ? (
                            <>
                              <Clock className="w-4 h-4 text-blue-500" />
                              <span className="text-blue-600 font-medium">
                                {email.scheduledFor ? new Date(email.scheduledFor).toLocaleString() : 'Pending'}
                              </span>
                            </>
                          ) : (
                            <>
                              <Calendar className="w-4 h-4 text-green-500" />
                              <span className="text-green-600 font-medium">
                                {new Date(email.updatedAt || email.createdAt).toLocaleString()}
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleDeleteClick(email)}
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                          title="Delete email"
                          disabled={selectAllMode}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Card View for mobile screens */}
            <div className="md:hidden space-y-4 p-4">
              {historyData.map((email) => (
                <div key={email._id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSelectEmail(email._id)}
                        disabled={selectAllMode}
                      >
                        {isEmailSelected(email._id) ? (
                          <CheckSquare className={`w-4 h-4 ${selectAllMode ? 'text-blue-300' : 'text-blue-600'}`} />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedEmailContent(email.content);
                          setShowEmailViewModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                      >
                        <FileText className="w-4 h-4" />
                        {email.templateTitle || "Custom Email"}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeleteClick(email)}
                        className="text-red-600 hover:text-red-800 p-1"
                        disabled={selectAllMode}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center bg-gray-50 p-2 rounded text-xs text-gray-600">
                     <div>
                       <span className="font-semibold block text-gray-500 mb-1">Created At</span>
                       {new Date(email.createdAt).toLocaleDateString()}
                     </div>
                     <div className="text-right">
                       <span className="font-semibold block text-gray-500 mb-1">Sent / Scheduled</span>
                       {email.status === 'scheduled' ? (
                         <span className="text-blue-600 font-medium flex items-center justify-end">
                           <Clock className="w-3 h-3 mr-1" />
                           {email.scheduledFor ? new Date(email.scheduledFor).toLocaleString() : 'Pending'}
                         </span>
                       ) : (
                         <span className="text-green-600 font-medium flex items-center justify-end">
                           <Calendar className="w-3 h-3 mr-1" />
                           {new Date(email.updatedAt || email.createdAt).toLocaleString()}
                         </span>
                       )}
                     </div>
                  </div>
                  
                  <p className="text-sm font-medium text-gray-900">{email.subject}</p>
                  
                  <div className="flex flex-wrap gap-3 text-sm">
                    <button
                      onClick={() => {
                        setSelectedRecipients(email.recipients);
                        setShowRecipientsModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Users className="w-4 h-4" />
                      {email.recipients.length} Recipients
                    </button>
                    
                    {email.attachments?.length > 0 && (
                      <button
                        onClick={() => {
                          setSelectedAttachments(email.attachments);
                          setShowAttachmentsModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <Paperclip className="w-4 h-4" />
                        {email.attachments.length} Files
                      </button>
                    )}
                  </div>

                  {currentUser?.role?.name === "Admin" && email.createdBy && (
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs">
                        {email.createdBy.firstName?.charAt(0)}{email.createdBy.lastName?.charAt(0)}
                      </div>
                      <span className="text-sm text-gray-600">
                        {email.createdBy.firstName} {email.createdBy.lastName}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-t bg-gray-50 gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Rows per page:</span>
                <select
                  value={historyLimit}
                  onChange={handleLimitChange}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(historyPage - 1)}
                  disabled={historyPage === 1}
                  className={`px-3 py-1.5 rounded-md text-sm ${
                    historyPage === 1
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Previous
                </button>
                
                <span className="text-sm text-gray-600">
                  Page {historyPage} of {historyTotalPages}
                </span>

                <button
                  onClick={() => handlePageChange(historyPage + 1)}
                  disabled={historyPage === historyTotalPages}
                  className={`px-3 py-1.5 rounded-md text-sm ${
                    historyPage === historyTotalPages
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Single Email Modal */}
      {showDeleteModal && emailToDelete && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">Delete Email</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the email "{emailToDelete.subject}"? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setEmailToDelete(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">Delete Multiple Emails</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete {getSelectionCount()} selected emails? 
              {selectAllMode && " This will delete ALL emails in your history."}
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={confirmBulkDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  `Delete ${getSelectionCount()} Emails`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipients Modal */}
      {showRecipientsModal && selectedRecipients && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold">Recipients ({selectedRecipients.length})</h3>
              <button
                onClick={() => {
                  setShowRecipientsModal(false);
                  setSelectedRecipients(null);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-3">
                {selectedRecipients.map((email, index) => {
                  const contact = allContacts.find(
                    (c) => c.email?.toLowerCase() === email?.toLowerCase()
                  );
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">
                          {contact?.name || "Unknown"}
                        </div>
                        <div className="text-sm text-gray-500">{email}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Content Modal */}
      {showEmailViewModal && selectedEmailContent && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold">Email Preview</h3>
              <button
                onClick={() => {
                  setShowEmailViewModal(false);
                  setSelectedEmailContent(null);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedEmailContent }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Attachments Modal */}
      {showAttachmentsModal && selectedAttachments.length > 0 && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold">Attachments ({selectedAttachments.length})</h3>
              <button
                onClick={() => {
                  setShowAttachmentsModal(false);
                  setSelectedAttachments([]);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="space-y-3">
                {selectedAttachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-900 truncate">{file.filename}</span>
                    </div>
                    <button
                      onClick={() => downloadAttachment(file)}
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center gap-1 flex-shrink-0"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailHistory;