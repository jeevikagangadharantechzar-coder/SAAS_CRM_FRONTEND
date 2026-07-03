import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Mail,
  Send,
  FileText,
  Clock,
  X,
  CheckSquare,
  Square,
  Eye,
  CheckCircle,
  RefreshCw,
  Users,
  Briefcase,
  MailOpen,
  Filter,
  User,
  Building,
  Phone,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from "react-toastify";


const MassEmail = () => {
  const API_URL = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();
  
  const [allContacts, setAllContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [attachments, setAttachments] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [contactTypeFilter, setContactTypeFilter] = useState('all');
  
  // Add current user state
  const [currentUser, setCurrentUser] = useState(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailData, setEmailData] = useState({
    subject: '',
    content: '',
    selectedContacts: []
  });

  const [menuOpen, setMenuOpen] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 1 });
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledTime, setScheduledTime] = useState(""); // HH:MM
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Get current user from localStorage on component mount
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
  }, []);

  // Given an email, find the name from allContacts
  const getContactNameByEmail = (email) => {
    const contact = allContacts.find(c => c.email.toLowerCase() === email.toLowerCase());
    return contact ? contact.name : email; // fallback to email if name not found
  };

  let scheduleTimeoutRef = null;
  
  // Fetch ALL contacts: Current leads + Deals
  useEffect(() => {
    fetchAllContacts();
  }, []);

  const fetchAllContacts = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');

      const response = await axios.get(`${API_URL}/email/contacts`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const contacts = response.data?.data || [];

      console.log('Total contacts fetched:', contacts.length);

      setAllContacts(contacts);
      setFilteredContacts(contacts);

    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter contacts based on search and type filter
  useEffect(() => {
    let filtered = allContacts;
    
    if (contactTypeFilter !== 'all') {
      filtered = filtered.filter(contact => contact.type === contactTypeFilter);
    }
    
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(contact =>
        (contact.name && contact.name.toLowerCase().includes(query)) ||
        (contact.email && contact.email.toLowerCase().includes(query)) ||
        (contact.company && contact.company.toLowerCase().includes(query)) ||
        (contact.phone && contact.phone.includes(query)) ||
        (contact.status && contact.status.toLowerCase().includes(query))
      );
    }
    
    setFilteredContacts(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchQuery, contactTypeFilter, allContacts]);

  // Pagination calculations
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredContacts.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredContacts.length / rowsPerPage);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pageNumbers.push(i);
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pageNumbers.push(i);
      } else {
        pageNumbers.push(1);
        pageNumbers.push('...');
        pageNumbers.push(currentPage - 1);
        pageNumbers.push(currentPage);
        pageNumbers.push(currentPage + 1);
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }
    
    return pageNumbers;
  };

  // Pagination handlers
  const handlePageChange = (pageNumber) => {
    if (pageNumber === '...' || pageNumber === currentPage) return;
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

/* ── Handle Next Page Function ─────────────────────── */
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

/* ── Handle Previous Page Function ─────────────────────── */
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

/* ── Handle Rows Per Page Change Function ─────────────────────── */
  const handleRowsPerPageChange = (e) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  // Handle checkbox selection
  const handleSelectContact = (displayId) => {
    setSelectedContacts(prev =>
      prev.includes(displayId) 
        ? prev.filter(id => id !== displayId) 
        : [...prev, displayId]
    );
  };

/* ── Handle Select All Function ─────────────────────── */
  const handleSelectAll = () => {
    if (selectedContacts.length === currentRows.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(currentRows.map(contact => contact.displayId));
    }
  };

/* ── Handle Select All Filtered Function ─────────────────────── */
  const handleSelectAllFiltered = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map(contact => contact.displayId));
    }
  };

  // Open email modal
  const handleCreateEmail = () => {
    if (selectedContacts.length === 0) {
      alert('Please select at least one contact to send email');
      return;
    }
    
    const selectedContactDetails = allContacts.filter(contact => 
      selectedContacts.includes(contact.displayId)
    );
    
    navigate("/create-email", {
      state: {
        selectedContacts: selectedContactDetails
      }
    });

  };

  
  // Save draft
  const handleSaveDraft = () => {
    try {
      const draftData = {
        subject: emailData.subject,
        content: emailData.content,
        recipients: emailData.selectedContacts,
        savedAt: new Date().toISOString()
      };

      const existingDrafts = JSON.parse(localStorage.getItem('emailDrafts') || '[]');
      existingDrafts.push(draftData);
      localStorage.setItem('emailDrafts', JSON.stringify(existingDrafts));

      alert('Draft saved successfully!');
      setShowEmailModal(false);
      setEmailData({ subject: '', content: '', selectedContacts: [] });
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Failed to save draft.');
    }
  };

  useEffect(() => {
    const handleClickOutside = () => setMenuOpen(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Get status color
  const getStatusColor = (type, status) => {
    if (type === 'deal') {
      return 'bg-purple-50 text-purple-700 border border-purple-200';
    }
    
    switch(status) {
      case 'Hot': return 'bg-red-50 text-red-700';
      case 'Warm': return 'bg-yellow-50 text-yellow-700';
      case 'Cold': return 'bg-blue-50 text-blue-700';
      case 'Junk': return 'bg-gray-50 text-gray-700';
      case 'Converted': return 'bg-green-50 text-green-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  // Get contact type badge
  const getContactTypeBadge = (type) => {
    switch(type) {
      case 'lead': 
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Lead</span>;
      case 'deal': 
        return <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">Deal</span>;
      default: 
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">Contact</span>;
    }
  };

  // Count contacts by type
  const leadCount = allContacts.filter(c => c.type === 'lead').length;
  const dealCount = allContacts.filter(c => c.type === 'deal').length;

  // Export selected contacts
  const handleExportContacts = () => {
    if (selectedContacts.length === 0) {
      alert('Please select contacts to export');
      return;
    }

    const selectedData = allContacts.filter(contact => 
      selectedContacts.includes(contact.displayId)
    );

    const csvContent = [
      ['Name', 'Email', 'Phone', 'Company', 'Type', 'Status'],
      ...selectedData.map(contact => [
        contact.name,
        contact.email,
        contact.phone,
        contact.company,
        contact.type,
        contact.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contacts_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4" />
          <p className="text-gray-600">Loading all contacts...</p>
          <p className="text-sm text-gray-500 mt-2">Fetching from Leads & Deals</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Email Campaign</h1>
          <p className="text-gray-600 mt-1">
            Communicate with multiple lead and deal contacts via email
          </p>
        </div>
        <div className="flex gap-3">
          {/* Scheduled Emails Button */}
          <button
            onClick={() => navigate('/scheduled-emails')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Clock size={18} />
            Scheduled Emails
          </button>

          {/* View History Button - Updated to navigate to separate page */}
          <button
            onClick={() => navigate('/email-history')}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 flex items-center gap-2"
          >
            <Eye size={18} />
            View History
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-blue-100 rounded-lg border border-blue-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Contacts</p>
              <p className="text-2xl font-bold text-gray-800">{allContacts.length}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-green-100 rounded-lg border border-green-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Leads</p>
              <p className="text-2xl font-bold text-gray-800">{leadCount}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <User className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-purple-100 rounded-lg border border-purple-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Deals</p>
              <p className="text-2xl font-bold text-gray-800">{dealCount}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Briefcase className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search contacts by name, email, company, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Type Filter */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setContactTypeFilter('all')}
                className={`px-4 py-2 rounded-lg border text-sm font-medium ${
                  contactTypeFilter === 'all' 
                    ? 'bg-blue-100 border-blue-300 text-blue-700' 
                    : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setContactTypeFilter('lead')}
                className={`px-4 py-2 rounded-lg border text-sm font-medium flex items-center gap-2 ${
                  contactTypeFilter === 'lead' 
                    ? 'bg-green-100 border-green-300 text-green-700' 
                    : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <User className="w-4 h-4" /> Leads
              </button>
              <button
                onClick={() => setContactTypeFilter('deal')}
                className={`px-4 py-2 rounded-lg border text-sm font-medium flex items-center gap-2 ${
                  contactTypeFilter === 'deal' 
                    ? 'bg-purple-100 border-purple-300 text-purple-700' 
                    : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <Briefcase className="w-4 h-4" /> Deals
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-4 lg:mt-0">
            {/* Refresh Button */}
            <button
              onClick={fetchAllContacts}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              title="Refresh contacts"
            >
              <RefreshCw size={18} />
            </button>

            {/* Create Email Button */}
            <button
              onClick={handleCreateEmail}
              disabled={selectedContacts.length === 0}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                selectedContacts.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <MailOpen size={18} />
              Create Email ({selectedContacts.length})
            </button>
          </div>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredContacts.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">No Contacts Found</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery 
                ? 'Try adjusting your search or filters' 
                : 'No contacts available. Create leads or deals first.'}
            </p>
            <button
              onClick={fetchAllContacts}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Refresh Contacts
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-12">
                      <button
                        onClick={handleSelectAllFiltered}
                        className="flex items-center"
                        title={selectedContacts.length === currentRows.length ? "Deselect all on this page" : "Select all on this page"}
                      >
                        {filteredContacts.length > 0 &&
                         filteredContacts.every(c => selectedContacts.includes(c.displayId)) ? (
                          <CheckSquare size={20} className="text-blue-600" />
                         ) : (
                          <Square size={20} className="text-gray-400" />
                        )}

                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Type & Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentRows.map((contact) => (
                    <tr key={contact.displayId} className="hover:bg-gray-50">
                      {/* Checkbox */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          checked={selectedContacts.includes(contact.displayId)}
                          onChange={() => handleSelectContact(contact.displayId)}
                        />
                      </td>

                      {/* Contact Info */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center font-semibold ${
                            contact.type === 'deal' 
                              ? 'bg-purple-100 text-purple-600' 
                              : 'bg-blue-100 text-blue-600'
                          }`}>
                            {contact.name?.charAt(0) || 'C'}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {contact.name || 'Unnamed Contact'}
                            </div>
                            <div className="text-sm text-blue-600">
                              {contact.email || 'No email'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact Details */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          {contact.phone && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Phone className="w-4 h-4 mr-2" />
                              {contact.phone}
                            </div>
                          )}
                          {contact.source && (
                            <div className="text-xs text-gray-500">
                              Source: {contact.source}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Company */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">
                            {contact.company || 'No company'}
                          </span>
                        </div>
                      </td>

                      {/* Type & Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-2">
                          {getContactTypeBadge(contact.type)}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(contact.type, contact.status)}`}>
                            {contact.status || 'N/A'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Component */}
            {totalPages > 1 && (
              <div className="border-t border-gray-200">
                <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between bg-white gap-4">
                  {/* Rows per page selector */}
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-700">Rows per page:</span>
                    <select
                      value={rowsPerPage}
                      onChange={handleRowsPerPageChange}
                      className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                  
                  {/* Page info */}
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-medium">{indexOfFirstRow + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(indexOfLastRow, filteredContacts.length)}
                    </span>{' '}
                    of <span className="font-medium">{filteredContacts.length}</span> contacts
                  </div>
                  
                  {/* Page navigation */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handlePrevPage}
                      disabled={currentPage === 1}
                      className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1 ${
                        currentPage === 1
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <ChevronLeft size={16} />
                      Previous
                    </button>
                    
                    {/* Page numbers */}
                    <div className="flex items-center space-x-1">
                      {getPageNumbers().map((page, index) => (
                        <button
                          key={index}
                          onClick={() => handlePageChange(page)}
                          className={`min-w-[36px] h-9 flex items-center justify-center rounded-md text-sm ${
                            page === currentPage
                              ? 'bg-blue-600 text-white'
                              : page === '...'
                              ? 'text-gray-500 cursor-default'
                              : 'text-gray-700 hover:bg-gray-100 border border-gray-300'
                          }`}
                          disabled={page === '...'}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    
                    <button
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1 ${
                        currentPage === totalPages
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Next
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Summary Footer */}
            <div className="border-t border-gray-200 px-6 py-3 bg-gray-50">
              <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-600 gap-3">
                <div className="flex items-center gap-4">
                  <div>
                    Page <span className="font-medium">{currentPage}</span> of{' '}
                    <span className="font-medium">{totalPages}</span> •{' '}
                    <span className="font-medium">{currentRows.length}</span> contacts on this page
                  </div>
                  {selectedContacts.length > 0 && (
                    <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm">
                      {selectedContacts.length} selected
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-100 border border-blue-300 mr-2"></div>
                    <span>Leads: {leadCount}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-purple-100 border border-purple-300 mr-2"></div>
                    <span>Deals: {dealCount}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MassEmail;