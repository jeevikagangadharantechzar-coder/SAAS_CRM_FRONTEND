import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import {
  Eye,
  Clock,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  RefreshCw,
  ExternalLink,
  User,
  Building,
  Info,
  Filter,
  CheckSquare,
  XSquare,
  Search,
  X,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import PricingSuggestionCard from "./PricingSuggestioncard";

const API_URL = import.meta.env.VITE_API_URL;

const CURRENCY_SYMBOLS = {
  USD: "$", EUR: "€", INR: "₹", GBP: "£", JPY: "¥",
  AUD: "A$", CAD: "C$", CHF: "CHF", MYR: "RM", AED: "د.إ",
  SGD: "S$", ZAR: "R", SAR: "﷼",
};

const ClientReviewTable = () => {
  const navigate = useNavigate();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPricingCard, setShowPricingCard] = useState(false);
  const [pricingDeal, setPricingDeal] = useState(null);
  const [selectedClassification, setSelectedClassification] = useState("all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showUnreviewedOnly, setShowUnreviewedOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userId, setUserId] = useState("");
  const [userCurrency, setUserCurrency] = useState("USD");
  const [isPageChanging, setIsPageChanging] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    pages: 1,
    limit: 10,
    unreviewedCount: 0
  });

  const [reviewForm, setReviewForm] = useState({
    supportTickets: 0,
    progress: "Average",
    reviewNotes: "",
    clientHealthScore: 50,
    delivered: false
  });

  const classifications = [
    { value: "all", label: "All Clients", color: "bg-gray-100 text-gray-700" },
    { value: "Upsell", label: "Upsell", color: "bg-purple-100 text-purple-700" },
    { value: "Top Value", label: "Top Value", color: "bg-green-100 text-green-700" },
    { value: "At Risk", label: "At Risk", color: "bg-red-100 text-red-700" },
    { value: "Dormant", label: "Dormant", color: "bg-gray-100 text-gray-700" }
  ];

  // Debounce function
  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // Calculate days since follow-up properly
  const calculateDaysSince = (lastFollowUpDate) => {
    if (!lastFollowUpDate) return 0;
    
    try {
      const lastDate = new Date(lastFollowUpDate);
      const now = new Date();
      
      lastDate.setHours(0, 0, 0, 0);
      now.setHours(0, 0, 0, 0);
      
      const diffTime = now - lastDate;
      const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      return Math.max(0, days);
    } catch (error) {
      console.error("Error calculating days:", error);
      return 0;
    }
  };

  const debouncedSetSearch = useCallback(
    debounce((value) => {
      setDebouncedSearch(value);
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 500),
    []
  );

/* ──  Search Function ─────────────────────── */
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    debouncedSetSearch(value);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Get user info
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user"));
    if (userData) {
      setUserRole(userData.role?.name || "");
      setUserId(userData._id || "");
      setUserCurrency(userData.currency || "USD");
    }
  }, []);

  const currencySymbol = CURRENCY_SYMBOLS[userCurrency] || userCurrency;

  // Listen for CLV updates
  useEffect(() => {
    const handleCLVUpdate = (event) => {
      console.log(" CLV updated, refreshing table...", event.detail);
      fetchWonDeals();
      toast.info("Client data updated");
    };
    
    window.addEventListener('clv-updated', handleCLVUpdate);
    
    return () => {
      window.removeEventListener('clv-updated', handleCLVUpdate);
    };
  }, []);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchWonDeals();
  }, [pagination.page, selectedClassification, showUnreviewedOnly, debouncedSearch, userRole, userId]);

/* ── Fetch Won Deals Function ─────────────────────── */
  const fetchWonDeals = async () => {
    try {
      setLoading(true);
      setIsPageChanging(true); // Set page changing state
      const token = localStorage.getItem("token");

      if (!token) {
        toast.error("Authentication required");
        navigate("/login");
        return;
      }

      console.log(" Fetching deals with params:", {
        page: pagination.page,
        limit: pagination.limit,
        classification: selectedClassification,
        showUnreviewedFirst: showUnreviewedOnly,
        search: debouncedSearch
      });

      const response = await axios.get(
        `${API_URL}/cltv/won-deals`, {
          params: {
            page: pagination.page,
            limit: pagination.limit,
            classification: selectedClassification,
            showUnreviewedFirst: showUnreviewedOnly ? "true" : "false",
            search: debouncedSearch
          },
          headers: { Authorization: `Bearer ${token}` },
          timeout: 30000
        }
      );

      if (response.data.success) {
        let fetchedDeals = response.data.data || [];
        
        // Filter for salesperson
        if (userRole !== "Admin" && userId) {
          fetchedDeals = fetchedDeals.filter(deal => 
            deal.salespersonId === userId
          );
        }
        
        // Process deals to calculate daysSinceFollowUp from followUpDate
        const processedDeals = fetchedDeals.map(deal => {
          const lastFollowUp = deal.followUpDate || deal.lastFollowUpDate;
          const daysSince = calculateDaysSince(lastFollowUp);
          
          return {
            ...deal,
            daysSinceFollowUp: daysSince,
            supportTicketCount: deal.supportTicketCount || 0,
            hasReview: deal.hasReview === true || deal.reviewStatus === "Submitted"
          };
        });
        
        console.log(" Fetched deals:", processedDeals.map(d => ({
          company: d.companyName,
          daysInactive: d.daysSinceFollowUp,
          followUpDate: d.followUpDate
        })));
        
        setDeals(processedDeals);
        
        if (response.data.pagination) {
          setPagination({
            page: pagination.page,
            total: response.data.pagination.total,
            pages: response.data.pagination.pages,
            limit: pagination.limit,
            unreviewedCount: response.data.pagination.unreviewedCount || 0
          });
        }
      }
    } catch (error) {
      console.error("Error fetching won deals:", error);
      
      if (error.code === "ECONNABORTED") {
        toast.error("Request timeout - try a more specific search");
      } else if (error.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        navigate("/login");
      } else {
        toast.error(error.response?.data?.message || "Failed to load client reviews");
      }
      
      setDeals([]);
    } finally {
      setLoading(false);
      // Add a small delay to prevent flickering
      setTimeout(() => setIsPageChanging(false), 300);
    }
  };

/* ── Handle Refresh Function ─────────────────────── */
  const handleRefresh = async () => {
    setRefreshing(true);
    setPagination(prev => ({ ...prev, page: 1 }));
    await fetchWonDeals();
    setRefreshing(false);
    toast.success("Data refreshed!");
  };

/* ── Get Classification Badge ─────────────────────── */
  const handleRowClick = (deal, e) => {
    if (e.target.closest('button')) return;
    navigate(`/Pipelineview/${deal._id}`);
  };

/* ── Handle View Client Details ─────────────────────── */
  const handleViewClientDetails = (deal, e) => {
    e.stopPropagation();
    navigate(`/cltv/client/${encodeURIComponent(deal.companyName)}`);
  };

/* ── Handle Open Review ─────────────────────── */
  const handleOpenReview = async (deal, e) => {
    e.stopPropagation();
    setSelectedDeal(deal);
    
    if (deal.hasReview) {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${API_URL}/cltv/client/${encodeURIComponent(deal.companyName)}?dealId=${deal._id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (response.data.success && response.data.data.reviews?.length > 0) {
          const latestReview = response.data.data.reviews[0];
          setReviewForm({
            supportTickets: latestReview.supportTickets || "",
            progress: latestReview.progress || "Average",
            reviewNotes: latestReview.reviewNotes || "",
            clientHealthScore: latestReview.clientHealthScore || 50,
            delivered: latestReview.delivered || false
          });
        } else {
          setReviewForm({
            supportTickets: deal.supportTicketCount || "",
            progress: deal.reviewProgress || "Average",
            reviewNotes: "",
            clientHealthScore: deal.clientHealthScore || 50,
            delivered: deal.delivered || false
          });
        }
      } catch (error) {
        console.error("Error fetching review data:", error);
        setReviewForm({
          supportTickets: deal.supportTicketCount || "",
          progress: deal.reviewProgress || "Average",
          reviewNotes: "",
          clientHealthScore: deal.clientHealthScore || 50,
          delivered: deal.delivered || false
        });
      }
    } else {
      setReviewForm({
        supportTickets: deal.supportTicketCount || "",
        progress: deal.reviewProgress || "Average",
        reviewNotes: "",
        clientHealthScore: deal.clientHealthScore || 50,
        delivered: deal.delivered || false
      });
    }
    
    setShowReviewModal(true);
  };

/* ── Handle Submit Review Function ─────────────────────── */
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selectedDeal) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");

      const reviewData = {
        companyId: selectedDeal._id,
        companyName: selectedDeal.companyName || "",
        clientName: selectedDeal.clientName || selectedDeal.companyName || "Unknown",
        dealId: selectedDeal._id,
        dealValue: selectedDeal.dealValue || "0",
        delivered: reviewForm.delivered || false,
        salespersonId: selectedDeal.salespersonId || null,
        salespersonName: selectedDeal.assignedTo || "",
        supportTickets: parseInt(reviewForm.supportTickets) || 0,
        progress: reviewForm.progress || "Average",
        reviewNotes: reviewForm.reviewNotes || "",
        clientHealthScore: parseInt(reviewForm.clientHealthScore) || 50
      };

      const response = await axios.post(
        `${API_URL}/cltv/client-review`,
        reviewData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (response.data.success) {
        toast.success("Review saved successfully. CLV recalculated.");
        setShowReviewModal(false);
        setPricingDeal(selectedDeal);
        setShowPricingCard(true);
        
        window.dispatchEvent(new CustomEvent('clv-updated', { 
          detail: { companyName: selectedDeal.companyName } 
        }));
        
        await fetchWonDeals();
      } else {
        toast.error(response.data.message || "Failed to save review");
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      if (error.response) {
        toast.error(error.response.data?.message || "Failed to save review");
      } else if (error.request) {
        toast.error("No response from server. Please check your connection.");
      } else {
        toast.error("Error: " + error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

/* ── Handle Page Change Function ─────────────────────── */
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages && newPage !== pagination.page) {
      setIsPageChanging(true);
      setPagination({ ...pagination, page: newPage });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

/* ── Toggle Unreviewed Only Function ─────────────────────── */
  const toggleUnreviewedOnly = () => {
    setShowUnreviewedOnly(!showUnreviewedOnly);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

/* ── Get Classification Badge ─────────────────────── */
  const getClassificationBadge = (classification, hasReview) => {
    if (!hasReview) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          Not yet Reviewed
        </span>
      );
    }

    const cls = classifications.find(c => c.value === classification);
    if (!cls) return null;
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${cls.color}`}>
        {cls.label}
      </span>
    );
  };

/* ── Get Progress Badge ─────────────────────── */
  const getProgressBadge = (progress) => {
    const colors = {
      "Excellent": "bg-green-100 text-green-700",
      "Good": "bg-blue-100 text-blue-700",
      "Average": "bg-yellow-100 text-yellow-700",
      "Poor": "bg-red-100 text-red-700"
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${colors[progress] || "bg-gray-100 text-gray-700"}`}>
        {progress}
      </span>
    );
  };

/* ── Format Currency Function ─────────────────────── */
  const formatCurrency = (value, currency) => {
    const symbol = CURRENCY_SYMBOLS[currency] || currency || "₹";
    if (!value) return `${symbol}0`;
    try {
      const numericValue = parseFloat(value.toString().replace(/[₹$€£¥,\s]/g, ''));
      return `${symbol}${numericValue.toLocaleString()}`;
    } catch {
      return `${symbol}0`;
    }
  };

/* ── Format Preferred Currency Function ─────────────────────── */
  const formatPreferredCurrency = (value) => {
    if (!value) return `${currencySymbol}0`;
    try {
      const numericValue = parseFloat(value.toString().replace(/[₹,\s]/g, ''));
      return `${currencySymbol}${numericValue.toLocaleString()}`;
    } catch {
      return `${currencySymbol}0`;
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= pagination.pages; i++) {
      if (i === 1 || i === pagination.pages || (i >= pagination.page - delta && i <= pagination.page + delta)) {
        range.push(i);
      }
    }

    range.forEach((i) => {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    });

    return rangeWithDots;
  };

  if (loading && deals.length === 0 && pagination.page === 1) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          {/* Header with title */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Client Review Table</h2>
              <p className="text-sm text-gray-500 mt-1">
                {userRole === "Admin" 
                  ? "All clients with Closed Won deals requiring health review"
                  : "Your assigned clients with Closed Won deals"}
              </p>
              {pagination.unreviewedCount > 0 && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {pagination.unreviewedCount} unreviewed {pagination.unreviewedCount === 1 ? 'client' : 'clients'}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Search Bar */}
              <div className="relative flex-1 sm:w-64">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search by company or deal..."
                  className="w-full pl-8 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <Search size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                {searchQuery && (
                  <button onClick={clearSearch} className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <X size={14} className="text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>

              {/* Classification Filter */}
              <div className="relative">
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50"
                >
                  <Filter size={16} />
                  <span className="hidden sm:inline">
                    {classifications.find(c => c.value === selectedClassification)?.label || "Filter"}
                  </span>
                </button>
                
                {showFilterDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                    {classifications.map((cls) => (
                      <button
                        key={cls.value}
                        onClick={() => {
                          setSelectedClassification(cls.value);
                          setPagination(prev => ({ ...prev, page: 1 }));
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                          selectedClassification === cls.value ? 'bg-blue-50 text-blue-600' : ''
                        }`}
                      >
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${cls.color}`}>
                          {cls.label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Unreviewed Only Toggle Button */}
              <button
                onClick={toggleUnreviewedOnly}
                className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-all ${
                  showUnreviewedOnly 
                    ? 'bg-amber-600 text-white' 
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
                title={showUnreviewedOnly ? "Show all clients" : "Show unreviewed only"}
              >
                <AlertCircle size={16} />
                <span className="hidden sm:inline">Unreviewed</span>
                {showUnreviewedOnly ? <CheckCircle size={14} /> : <XSquare size={14} />}
              </button>
              
              <button
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className={`p-2 rounded-lg transition ${
                  refreshing || loading
                    ? 'bg-blue-100 text-blue-600 cursor-not-allowed' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="Refresh data"
              >
                <RefreshCw size={18} className={refreshing || loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
          
          {/* Search results info */}
          {debouncedSearch && (
            <p className="text-xs text-gray-500 mt-2">
              Search results for "{debouncedSearch}" • {pagination.total} matches
            </p>
          )}
        </div>

        {showPricingCard && pricingDeal && (
          <div className="m-4">
            <PricingSuggestionCard
              companyId={pricingDeal._id}
              dealValue={pricingDeal.dealValue}
              onClose={() => setShowPricingCard(false)}
            />
          </div>
        )}

        {/* Fixed height container to prevent jumping */}
        <div className="overflow-x-auto" style={{ minHeight: '400px' }}>
          {isPageChanging ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deal Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {userCurrency} Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Delivered
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tickets
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days Inactive
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Classification
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {deals.length > 0 ? (
                  deals.map((deal, idx) => (
                    <tr
                      key={deal._id || idx}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                        !deal.hasReview ? 'bg-amber-50/30 hover:bg-amber-50' : ''
                      }`}
                      onClick={(e) => handleRowClick(deal, e)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
                            !deal.hasReview 
                              ? 'bg-amber-100 text-amber-600' 
                              : 'bg-blue-100 text-blue-600'
                          }`}>
                            <User size={14} />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {deal.clientName}
                            </div>
                            {!deal.hasReview && (
                              <span className="text-xs text-amber-600 flex items-center gap-1">
                                <AlertCircle size={10} />
                                Needs Review
                              </span>
                            )}
                            {deal.hasReview && (
                              <span className="text-xs text-green-600 flex items-center gap-1">
                                <CheckCircle size={10} />
                                Reviewed
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building size={14} className="text-gray-400 mr-1" />
                          <span className="text-sm text-gray-700">{deal.companyName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(deal.dealValue, deal.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatPreferredCurrency(deal.preferredCurrencyValue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {deal.delivered ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckSquare size={16} />
                            Yes
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-gray-400">
                            <XSquare size={16} />
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {deal.assignedTo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-1">
                          <MessageSquare size={14} className="text-gray-400" />
                          <span className={deal.supportTicketCount > 5 ? 'text-red-600 font-medium' : 'text-gray-700'}>
                            {deal.supportTicketCount || 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={deal.daysSinceFollowUp > 90 ? 'text-red-600 font-medium' : 'text-gray-700'}>
                          {deal.daysSinceFollowUp || 0} days
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {getProgressBadge(deal.reviewProgress || deal.progress)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {getClassificationBadge(deal.classification, deal.hasReview)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {deal.hasReview ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle size={16} />
                            Submitted
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-600">
                            <AlertTriangle size={16} />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleOpenReview(deal, e)}
                            className={`flex items-center gap-1 transition-colors text-xs px-2 py-1 rounded ${
                              deal.hasReview 
                                ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                                : 'text-amber-600 bg-amber-50 hover:bg-amber-100 font-medium'
                            }`}
                            title={deal.hasReview ? "Edit Review" : "Add Review"}
                          >
                            <Eye size={14} />
                            {deal.hasReview ? "Edit" : "Review"}
                          </button>
                          
                          <button
                            onClick={(e) => handleViewClientDetails(deal, e)}
                            className="text-purple-600 hover:text-purple-800 flex items-center gap-1 transition-colors text-xs bg-purple-50 px-2 py-1 rounded"
                            title="View Client Details"
                          >
                            <ExternalLink size={14} />
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="12" className="px-6 py-8 text-center text-gray-500">
                      {debouncedSearch ? (
                        <div className="flex flex-col items-center gap-2">
                          <Search size={24} className="text-gray-300" />
                          <p>No results found for "{debouncedSearch}"</p>
                          <button 
                            onClick={clearSearch}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            Clear search
                          </button>
                        </div>
                      ) : userRole === "Admin" ? (
                        "No closed won deals found"
                      ) : (
                        "No deals assigned to you"
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-500">
              Showing page {pagination.page} of {pagination.pages} • Total: {pagination.total} clients
              {pagination.unreviewedCount > 0 && (
                <span className="ml-2 text-amber-600">
                  ({pagination.unreviewedCount} unreviewed)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1 || isPageChanging}
                className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
              
              <div className="flex items-center gap-1">
                {getPageNumbers().map((pageNum, index) => (
                  pageNum === '...' ? (
                    <span key={`dots-${index}`} className="px-2 text-gray-400">...</span>
                  ) : (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      disabled={isPageChanging}
                      className={`w-8 h-8 rounded-lg text-sm transition-all ${
                        pagination.page === pageNum
                          ? 'bg-blue-600 text-white font-medium'
                          : 'hover:bg-gray-100 text-gray-700'
                      } ${isPageChanging ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {pageNum}
                    </button>
                  )
                ))}
              </div>
              
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages || isPageChanging}
                className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedDeal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-lg flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                {selectedDeal.hasReview ? "Edit Client Review" : "New Client Review"}
              </h3>

              {!selectedDeal.hasReview && (
                <div className="bg-amber-50 p-4 rounded-lg mb-6 border border-amber-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-800">This client needs a review</h4>
                      <p className="text-sm text-amber-700 mt-1">
                        Complete this review to classify the client and update their CLV metrics.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-1">
                  <Info size={14} />
                  Client Information
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-blue-600">Client Name:</p>
                    <p className="font-medium">{selectedDeal.clientName}</p>
                  </div>
                  <div>
                    <p className="text-blue-600">Company:</p>
                    <p className="font-medium">{selectedDeal.companyName}</p>
                  </div>
                  <div>
                    <p className="text-blue-600">Deal Value:</p>
                    <p className="font-medium">{formatCurrency(selectedDeal.dealValue, selectedDeal.currency)}</p>
                  </div>
                  <div>
                    <p className="text-blue-600">Assigned To:</p>
                    <p className="font-medium">{selectedDeal.assignedTo}</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmitReview}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Progress
                    </label>
                    <select
                      value={reviewForm.progress}
                      onChange={(e) => setReviewForm({ ...reviewForm, progress: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Excellent">Excellent</option>
                      <option value="Good">Good</option>
                      <option value="Average">Average</option>
                      <option value="Poor">Poor</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Review Notes
                    </label>
                    <textarea
                      rows={3}
                      value={reviewForm.reviewNotes}
                      onChange={(e) => setReviewForm({ ...reviewForm, reviewNotes: e.target.value })}
                      placeholder="Enter your review notes..."
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Manual Support Tickets
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={reviewForm.supportTickets}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setReviewForm({ ...reviewForm, supportTickets: val === "" ? "" : parseInt(val, 10) });
                      }}
                      placeholder="Add manual tickets..."
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Health Score (1-100)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={reviewForm.clientHealthScore}
                      onChange={(e) => {
                        // Strip out all non-digit characters (including +, -, ., e)
                        const cleanVal = e.target.value.replace(/\D/g, "");
                        if (cleanVal === "") {
                          setReviewForm({ ...reviewForm, clientHealthScore: "" });
                          return;
                        }
                        let val = parseInt(cleanVal, 10);
                        if (isNaN(val)) {
                          val = "";
                        } else {
                          if (val > 100) val = 100;
                          if (val < 1) val = 1;
                        }
                        setReviewForm({ ...reviewForm, clientHealthScore: val });
                      }}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={reviewForm.delivered}
                        onChange={(e) => setReviewForm({ ...reviewForm, delivered: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span className="text-sm text-gray-700">Delivered</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(false)}
                    className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      selectedDeal.hasReview ? "Update Review" : "Save Review"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ClientReviewTable;