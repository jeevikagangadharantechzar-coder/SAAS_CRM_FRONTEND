import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import ClientReviewTable from "./ClientReviewTable";
import ClassificationModal from "./ClassificationModal";

import {
  TrendingUp,
  AlertTriangle,
  Users,
  DollarSign,
  Clock,
  Activity,
  Shield,
  Star,
  Download,
  RefreshCw,
  Eye,
  Zap,
  Info,
  X,
  Filter
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";
import "react-toastify/dist/ReactToastify.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

const API_URL = import.meta.env.VITE_API_URL;

const CURRENCY_SYMBOLS = {
  USD: "$", EUR: "€", INR: "₹", GBP: "£", JPY: "¥",
  AUD: "A$", CAD: "C$", CHF: "CHF", MYR: "RM", AED: "د.إ",
  SGD: "S$", ZAR: "R", SAR: "﷼",
};

// Custom debounce function
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

const CLVDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [userRole, setUserRole] = useState("");
  const [userId, setUserId] = useState("");
  
  // Filter states
  const [selectedClassification, setSelectedClassification] = useState("all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  
  // Modal states
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [showTopValueModal, setShowTopValueModal] = useState(false);
  const [showAtRiskModal, setShowAtRiskModal] = useState(false);
  const [showDormantModal, setShowDormantModal] = useState(false);
  const [showTotalCLVModal, setShowTotalCLVModal] = useState(false);
  
  // Criteria modal states
  const [showUpsellCriteriaModal, setShowUpsellCriteriaModal] = useState(false);
  const [showTopValueCriteriaModal, setShowTopValueCriteriaModal] = useState(false);
  const [showAtRiskCriteriaModal, setShowAtRiskCriteriaModal] = useState(false);
  const [showDormantCriteriaModal, setShowDormantCriteriaModal] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  const [topPage, setTopPage] = useState(1);
  const [upsellPage, setUpsellPage] = useState(1);
  const [atRiskPage, setAtRiskPage] = useState(1);
  const [dormantPage, setDormantPage] = useState(1);

  // Classifications for filter
  const classifications = [
    { value: "all", label: "All Classifications", color: "bg-gray-100 text-gray-700" },
    { value: "Upsell", label: "Upsell", color: "bg-purple-100 text-purple-700" },
    { value: "Top Value", label: "Top Value", color: "bg-green-100 text-green-700" },
    { value: "At Risk", label: "At Risk", color: "bg-red-100 text-red-700" },
    { value: "Dormant", label: "Dormant", color: "bg-gray-100 text-gray-700" }
  ];

  // Get user info
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user"));
    if (userData) {
      setUserRole(userData.role?.name || "");
      setUserId(userData._id || "");
    }
  }, []);

  const user = JSON.parse(localStorage.getItem("user"));
  const userCurrency = user?.currency || "USD";
  const currencySymbol = CURRENCY_SYMBOLS[userCurrency] || userCurrency;

  useEffect(() => {
    fetchDashboardData();
  }, [userRole, userId, selectedClassification]);
  
/* ── Fetch Dashboard Data Function ─────────────────────── */
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");

      if (!token) {
        toast.error("Authentication required");
        navigate("/login");
        return;
      }

      const response = await axios.get(`${API_URL}/cltv/dashboard`, {
        params: {
          classification: selectedClassification === "all" ? "" : selectedClassification
        },
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000,
      });

      if (response.data.success) {
        setDashboardData(response.data.data);
        setLastUpdated(new Date());
      } else {
        throw new Error(response.data.message || "Failed to load dashboard");
      }
    } catch (error) {
      console.error("Error fetching CLV dashboard:", error);
      setError(error.message);

      if (error.code === "ECONNABORTED") {
        toast.error("Request timeout - please try again");
      } else if (error.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        navigate("/login");
      } else if (error.code === "ERR_NETWORK") {
        toast.error("Cannot connect to server. Please check if backend is running.");
      } else {
        toast.error(error.response?.data?.message || "Failed to load CLV dashboard");
      }
    } finally {
      setLoading(false);
    }
  };

/* ── Handle Calculate CLV Function ─────────────────────── */
  const handleCalculateCLV = async () => {
    try {
      setCalculating(true);
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication required");
        navigate("/login");
        return;
      }

      toast.info("Calculating CLV for all clients... This may take a moment.");
      const response = await axios.post(
        `${API_URL}/cltv/calculate-all`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 120000,
        }
      );

      if (response.data.success) {
        toast.success(`Successfully calculated CLV for ${response.data.count || 0} clients`);
        fetchDashboardData();
      }
    } catch (error) {
      console.error("Error calculating CLV:", error);
      if (error.code === "ECONNABORTED") {
        toast.error("Calculation timeout - processing in background");
      } else {
        toast.error(error.response?.data?.message || "Failed to calculate CLV");
      }
    } finally {
      setCalculating(false);
    }
  };

/* ── Handle Export Report Function ─────────────────────── */
  const handleExportReport = () => {
    if (!dashboardData) {
      toast.error("No data to export");
      return;
    }
    try {
      let csvContent = "Company Name,Classification,CLV,Support Tickets,Health Score,Days Inactive,Delivered,Progress\n";
      
      const allClients = [
        ...(dashboardData.topClients || []),
        ...(dashboardData.riskyClients || []),
        ...(dashboardData.dormantClients || []),
        ...(dashboardData.upsellClients || []),
        ...(dashboardData.allClientsList || [])
      ];
      
      const uniqueClients = Array.from(new Map(allClients.map(c => [c.companyName, c])).values());
      
      uniqueClients.forEach((client) => {
        csvContent += `${client.companyName},${client.classification || "N/A"},${client.clv || client.dealValue || 0},${client.supportTickets || 0},${client.clientHealthScore || 50},${client.daysSinceFollowUp || 0},${client.delivered ? 'Yes' : 'No'},${client.progress || 'N/A'}\n`;
      });
      
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clv-report-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Report exported successfully");
    } catch (error) {
      console.error("Error exporting report:", error);
      toast.error("Failed to export report");
    }
  };

/* ── Get Classification Color Function ─────────────────────── */
  const getClassificationColor = (classification) => {
    switch (classification) {
      case "Top Value":
        return "text-green-600 bg-green-100";
      case "Upsell":
        return "text-purple-600 bg-purple-100";
      case "At Risk":
        return "text-red-600 bg-red-100";
      case "Dormant":
        return "text-gray-600 bg-gray-100";
      default:
        return "text-blue-600 bg-blue-100";
    }
  };

/* ── Format Currency Function ─────────────────────── */
  const formatCurrency = (value) => {
    if (!value && value !== 0) return `${currencySymbol}0`;
    return `${currencySymbol}${value.toLocaleString()}`;
  };

/* ── Format Number Function ─────────────────────── */
  const formatNumber = (value, decimals = 1) => {
    const num = Number(value);
    return isNaN(num) ? "0" : num.toFixed(decimals);
  };



  // Stable, data-driven monthly revenue trend using useMemo
  const monthlyData = useMemo(() => {
    if (dashboardData?.revenueTrends && dashboardData.revenueTrends.length > 0) {
      const months = dashboardData.revenueTrends.map((t) => t.month);
      const values = dashboardData.revenueTrends.map((t) => t.revenue || 0);
      return { months, values };
    }

    // Fallback stable mock data (avoids Math.random on every render)
    const currentDate = new Date();
    const months = [];
    const values = [];
    const mockRevenues = [350000, 420000, 380000, 490000, 520000, 600000];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setMonth(currentDate.getMonth() - i);
      
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = monthNames[date.getMonth()];
      const year = date.getFullYear();
      
      months.push(`${monthName} ${year}`);
      values.push(mockRevenues[5 - i]);
    }
    
    return { months, values };
  }, [dashboardData]);

  // Safe growth percentage calculation to prevent division by zero (NaN/Infinity)
  const growthPercent = useMemo(() => {
    const startVal = monthlyData.values[0] || 0;
    const endVal = monthlyData.values[5] || 0;
    if (startVal === 0) {
      return endVal > 0 ? 100 : 0;
    }
    return Math.round(((endVal - startVal) / startVal) * 100);
  }, [monthlyData]);

  // Handle loading state
  if (loading && !dashboardData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertTriangle size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Failed to load dashboard</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // Define data AFTER loading checks
  const data = dashboardData || {
    summary: {
      totalClients: 0,
      totalCLV: 0,
      avgCLV: 0,
      clientsAtRiskPercent: 0,
      upsellCount: 0,
      topValueCount: 0,
      dormantCount: 0,
      atRiskCount: 0,
    },
    valueCategories: {
      "High Value": 0,
      "Medium Value": 0,
      "Low Value": 0,
    },
    classificationDistribution: {},
    topClients: [],
    riskyClients: [],
    dormantClients: [],
    upsellClients: [],
    allClientsList: [],
    recentReviews: [],
    revenueTrends: [],
  };

  const classificationData = {
    labels: Object.keys(data.classificationDistribution).length > 0 
      ? Object.keys(data.classificationDistribution)
      : ["Upsell", "Top Value", "At Risk", "Dormant"],
    datasets: [
      {
        data: Object.keys(data.classificationDistribution).length > 0
          ? Object.values(data.classificationDistribution)
          : [0, 0, 0, 0],
        backgroundColor: [
          "rgba(168, 85, 247, 0.8)",
          "rgba(34, 197, 94, 0.8)",
          "rgba(239, 68, 68, 0.8)",
          "rgba(156, 163, 175, 0.8)",
        ],
        borderWidth: 1,
      },
    ],
  };

  //  Direct data for chart
  const revenueData = {
    labels: monthlyData.months,
    datasets: [
      {
        label: "Monthly Revenue",
        data: monthlyData.values,
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        borderWidth: 2,
        tension: 0.3,
        fill: true,
        pointBackgroundColor: "rgb(59, 130, 246)",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const revenueOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.8)",
        titleColor: "#fff",
        bodyColor: "#fff",
        padding: 10,
        cornerRadius: 4,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            let value = context.raw;
            return `${label}: ${currencySymbol}${value.toLocaleString()}`;
          }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return currencySymbol + value.toLocaleString();
          },
        },
        grid: {
          color: "rgba(0,0,0,0.05)",
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 bg-gray-50 min-h-screen">
      <ToastContainer position="top-right" autoClose={5000} />

      {/* Classification Modals */}
      <ClassificationModal
        isOpen={showUpsellModal}
        onClose={() => setShowUpsellModal(false)}
        title="Upsell Clients"
        data={dashboardData?.upsellClients || []}
        type="Upsell"
      />
      
      <ClassificationModal
        isOpen={showTopValueModal}
        onClose={() => setShowTopValueModal(false)}
        title="Top Value Clients"
        data={dashboardData?.topClients || []}
        type="Top Value"
      />
      
      <ClassificationModal
        isOpen={showAtRiskModal}
        onClose={() => setShowAtRiskModal(false)}
        title="At Risk Clients"
        data={dashboardData?.riskyClients || []}
        type="At Risk"
      />
      
      <ClassificationModal
        isOpen={showDormantModal}
        onClose={() => setShowDormantModal(false)}
        title="Dormant Clients"
        data={dashboardData?.dormantClients || []}
        type="Dormant"
      />

      {/* Criteria Modals */}
      {showUpsellCriteriaModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-lg flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md mx-4">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Upsell Criteria</h2>
                <button onClick={() => setShowUpsellCriteriaModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X size={20} />
                </button>
              </div>
              <div className="p-3 sm:p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h3 className="font-medium text-purple-800 mb-3 flex items-center gap-2 text-sm sm:text-base">
                  <Zap size={16} />
                  Upsell Qualification Rules
                </h3>
                <ul className="space-y-2 text-xs sm:text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 font-bold">•</span>
                    <span className="text-gray-700">Progress: <span className="font-bold text-purple-600">Excellent</span></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 font-bold">•</span>
                    <span className="text-gray-700">Support tickets <span className="font-bold text-purple-600">&lt; 3</span></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 font-bold">•</span>
                    <span className="text-gray-700">Deal value <span className="font-bold text-purple-600">≥ ₹500,000</span></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 font-bold">•</span>
                    <span className="text-gray-700">Health score <span className="font-bold text-purple-600">≥ 80</span></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 font-bold">•</span>
                    <span className="text-gray-700">Follow-up days <span className="font-bold text-purple-600">≤ 30</span></span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTopValueCriteriaModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-lg flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md mx-4">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Top Value Criteria</h2>
                <button onClick={() => setShowTopValueCriteriaModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X size={20} />
                </button>
              </div>
              <div className="p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-medium text-green-800 mb-3 flex items-center gap-2 text-sm sm:text-base">
                  <Star size={16} />
                  Top Value Qualification Rules
                </h3>
                <ul className="space-y-2 text-xs sm:text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">•</span>
                    <span className="text-gray-700">All deals that don't match other classifications</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAtRiskCriteriaModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-lg flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md mx-4">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">At Risk Criteria</h2>
                <button onClick={() => setShowAtRiskCriteriaModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X size={20} />
                </button>
              </div>
              <div className="p-3 sm:p-4 bg-red-50 rounded-lg border border-red-200">
                <h3 className="font-medium text-red-800 mb-3 flex items-center gap-2 text-sm sm:text-base">
                  <AlertTriangle size={16} />
                  At Risk Qualification Rules
                </h3>
                <ul className="space-y-2 text-xs sm:text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 font-bold">•</span>
                    <span className="text-gray-700">Progress: <span className="font-bold text-red-600">Poor</span></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 font-bold">•</span>
                    <span className="text-gray-700">OR Health score <span className="font-bold text-red-600">&lt; 70</span></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 font-bold">•</span>
                    <span className="text-gray-700">OR Support tickets <span className="font-bold text-red-600">≥ 5</span></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 font-bold">•</span>
                    <span className="text-gray-700">OR Follow-up days <span className="font-bold text-red-600">&gt; 30</span></span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDormantCriteriaModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-lg flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md mx-4">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Dormant Criteria</h2>
                <button onClick={() => setShowDormantCriteriaModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X size={20} />
                </button>
              </div>
              <div className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2 text-sm sm:text-base">
                  <Clock size={16} />
                  Dormant Qualification Rules
                </h3>
                <ul className="space-y-2 text-xs sm:text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-gray-600 font-bold">•</span>
                    <span className="text-gray-700">Follow-up days <span className="font-bold text-gray-600">&gt; 90</span></span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header - Mobile Responsive - SEARCH REMOVED */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
        <div className="mb-3 sm:mb-0">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">Client Life Time Value (CLTV) Dashboard</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            {userRole === "Admin" 
              ? "Monitor client profitability"
              : "Monitor your assigned clients"}
          </p>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-1">
              Updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        
        {/* Action Buttons - Mobile Optimized */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Classification Filter */}
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs sm:text-sm flex items-center gap-1 hover:bg-gray-50"
            >
              <Filter size={14} />
              <span className="hidden sm:inline">
                {classifications.find(c => c.value === selectedClassification)?.label || "Filter"}
              </span>
            </button>
            
            {showFilterDropdown && (
              <div className="absolute right-0 mt-2 w-40 sm:w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                {classifications.map((cls) => (
                  <button
                    key={cls.value}
                    onClick={() => {
                      setSelectedClassification(cls.value);
                      setShowFilterDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs sm:text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
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

          {/* Refresh Button */}
          <button
            onClick={fetchDashboardData}
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg flex items-center gap-1 text-xs sm:text-sm"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          
          {/* Recalculate Button - PROMINENT */}
          <button
            onClick={handleCalculateCLV}
            disabled={calculating}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg flex items-center gap-1 text-xs sm:text-sm font-medium disabled:bg-indigo-400"
          >
            <RefreshCw size={14} className={calculating ? "animate-spin" : ""} />
            <span>{calculating ? "Calculating..." : "Recalculate"}</span>
          </button>
          
          {/* Export Button */}
          <button
            onClick={handleExportReport}
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg flex items-center gap-1 text-xs sm:text-sm"
            title="Export"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Summary Cards - Responsive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
        {/* Dormant Card */}
        <div 
          className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 md:p-6 cursor-pointer hover:shadow-md transition"
          onClick={() => setShowDormantModal(true)}
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <p className="text-xs text-gray-500 truncate">Dormant</p>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDormantCriteriaModal(true);
                  }}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <Info size={12} />
                </button>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-600 truncate">{data.summary.dormantCount || 0}</p>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 hidden sm:block">Click to view</p>
            </div>
            <div className="p-2 sm:p-3 bg-gray-100 rounded-lg flex-shrink-0">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-gray-600" />
            </div>
          </div>
        </div>

        {/* Upsell Card */}
        <div 
          className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 md:p-6 cursor-pointer hover:shadow-md transition"
          onClick={() => setShowUpsellModal(true)}
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <p className="text-xs text-gray-500 truncate">Upsell</p>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowUpsellCriteriaModal(true);
                  }}
                  className="text-gray-400 hover:text-purple-600 flex-shrink-0"
                >
                  <Info size={12} />
                </button>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-purple-600 truncate">{data.summary.upsellCount || 0}</p>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 hidden sm:block">Click to view</p>
            </div>
            <div className="p-2 sm:p-3 bg-purple-100 rounded-lg flex-shrink-0">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* At Risk Card */}
        <div 
          className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 md:p-6 cursor-pointer hover:shadow-md transition"
          onClick={() => setShowAtRiskModal(true)}
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <p className="text-xs text-gray-500 truncate">At Risk</p>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAtRiskCriteriaModal(true);
                  }}
                  className="text-gray-400 hover:text-red-600 flex-shrink-0"
                >
                  <Info size={12} />
                </button>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-red-600 truncate">{data.summary.atRiskCount || 0}</p>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 hidden sm:block">Click to view</p>
            </div>
            <div className="p-2 sm:p-3 bg-red-100 rounded-lg flex-shrink-0">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-red-600" />
            </div>
          </div>
        </div>

        {/* Top Value Card */}
        <div 
          className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 md:p-6 cursor-pointer hover:shadow-md transition"
          onClick={() => setShowTopValueModal(true)}
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <p className="text-xs text-gray-500 truncate">Top Value</p>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTopValueCriteriaModal(true);
                  }}
                  className="text-gray-400 hover:text-green-600 flex-shrink-0"
                >
                  <Info size={12} />
                </button>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 truncate">{data.summary.topValueCount || 0}</p>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 hidden sm:block">Click to view</p>
            </div>
            <div className="p-2 sm:p-3 bg-green-100 rounded-lg flex-shrink-0">
              <Star className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Second Row Summary - Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
        {/* Total CLV Card */}
        <div 
          className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 md:p-6 cursor-pointer hover:shadow-md transition"
          onClick={() => setShowTotalCLVModal(true)}
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 mb-1">Total CLV</p>
              <p className="text-base sm:text-lg md:text-2xl font-bold text-gray-800 truncate">{formatCurrency(data.summary.totalCLV)}</p>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-1">Avg: {formatCurrency(data.summary.avgCLV)}</p>
            </div>
            <div className="p-2 sm:p-3 bg-blue-100 rounded-lg flex-shrink-0">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Clients at Risk */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 mb-1">At Risk %</p>
              <p className="text-base sm:text-lg md:text-2xl font-bold text-gray-800">{formatNumber(data.summary.clientsAtRiskPercent || 0)}%</p>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-1 truncate">
                ({(data.summary.atRiskCount || 0) + (data.summary.dormantCount || 0)}/{data.summary.totalClients || 1})
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-yellow-100 rounded-lg flex-shrink-0">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Total Clients Card */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 md:p-6 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 mb-1">Total Clients</p>
              <p className="text-base sm:text-lg md:text-2xl font-bold text-gray-800">{data.summary.totalClients || 0}</p>
            </div>
            <div className="p-2 sm:p-3 bg-blue-100 rounded-lg flex-shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Client Review Table */}
      <div className="mb-6 sm:mb-8">
        <ClientReviewTable />
      </div>

      {/* Charts - Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Revenue Trend */}
        <div className="lg:col-span-2 bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
              <span className="truncate">Revenue Trend</span>
            </h2>
            <span className="text-[10px] sm:text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full whitespace-nowrap">
              6 Months
            </span>
          </div>

          <div className="h-48 sm:h-56 md:h-64 lg:h-72">
            <Line data={revenueData} options={revenueOptions} />
          </div>
          
          {/* Monthly Revenue Summary - Responsive */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-100">
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500">Total</p>
              <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">
                {currencySymbol}{(monthlyData.values.reduce((a, b) => a + b, 0) / 100000).toFixed(1)}L
              </p>
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500">Avg</p>
              <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">
                {currencySymbol}{Math.round(monthlyData.values.reduce((a, b) => a + b, 0) / 6 / 1000)}K
              </p>
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500">Growth</p>
              <p className={`text-xs sm:text-sm font-semibold ${monthlyData.values[5] >= monthlyData.values[0] ? 'text-green-600' : 'text-red-600'}`}>
                {monthlyData.values[5] >= monthlyData.values[0] ? '↑' : '↓'} 
                {Math.abs(growthPercent)}%
              </p>
            </div>
          </div>
        </div>

        {/* Client Classification */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Classification</h2>
          <div className="h-48 sm:h-56 md:h-64">
            {Object.keys(data.classificationDistribution).length > 0 ? (
              <Doughnut
                data={classificationData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { 
                      position: "bottom",
                      labels: {
                        boxWidth: 10,
                        padding: 10,
                        font: {
                          size: window.innerWidth < 640 ? 9 : 11
                        }
                      }
                    },
                  },
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-xs sm:text-sm text-gray-500 px-2 text-center">
                No classification data
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Client Classification Sections - Mobile Optimized */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Top Value Clients */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Star size={16} className="text-yellow-500" />
              <span>Top Value</span>
            </h2>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowTopValueCriteriaModal(true)}
                className="text-blue-600 p-1 hover:bg-blue-50 rounded"
                title="Criteria"
              >
                <Info size={14} />
              </button>
              <button 
                onClick={() => setClassificationModalData({
                  isOpen: true,
                  title: "Top Value Clients",
                  data: dashboardData?.topClients || [],
                  classification: "Top Value"
                })}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-gray-50 hover:bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs transition border border-gray-200"
              >
                <Eye size={14} />
                View {dashboardData?.topClients?.length || 0}
              </button>
            </div>
          </div>
          
          <div className="space-y-3">
            {(dashboardData?.topClients || []).length > 0 ? (
              <>
                {(dashboardData?.topClients || []).slice((topPage - 1) * itemsPerPage, topPage * itemsPerPage).map((client, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 sm:p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-gray-100"
                    onClick={() => navigate(`/cltv/client/${encodeURIComponent(client.companyName)}`)}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full ${getClassificationColor(client.classification)} flex items-center justify-center font-medium text-xs sm:text-sm flex-shrink-0`}>
                        {client.companyName?.charAt(0) || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-800 truncate">{client.companyName}</p>
                        <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs">
                          <span className="text-gray-500 truncate">{formatCurrency(client.clv)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 ml-1 flex-shrink-0">
                      <span className="text-[10px] sm:text-xs text-gray-500 hidden sm:inline">{client.supportTickets || 0}</span>
                      <Eye size={14} className="text-gray-400" />
                    </div>
                  </div>
                ))}
                {Math.ceil((dashboardData?.topClients?.length || 0) / itemsPerPage) > 1 && (
                  <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-100">
                    <button
                      onClick={() => setTopPage(p => Math.max(1, p - 1))}
                      disabled={topPage === 1}
                      className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <span className="text-xs text-gray-500">
                      Page {topPage} of {Math.ceil((dashboardData?.topClients?.length || 0) / itemsPerPage)}
                    </span>
                    <button
                      onClick={() => setTopPage(p => Math.min(Math.ceil((dashboardData?.topClients?.length || 0) / itemsPerPage), p + 1))}
                      disabled={topPage === Math.ceil((dashboardData?.topClients?.length || 0) / itemsPerPage)}
                      className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6 sm:py-8 text-gray-500 text-xs sm:text-sm bg-gray-50 rounded-lg border border-dashed border-gray-200">
                No clients
              </div>
            )}
          </div>
        </div>

        {/* Upsell Clients */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Zap size={16} className="text-purple-500" />
              <span>Upsell</span>
            </h2>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowUpsellCriteriaModal(true)}
                className="text-blue-600 p-1 hover:bg-blue-50 rounded"
                title="Criteria"
              >
                <Info size={14} />
              </button>
              <button 
                onClick={() => setClassificationModalData({
                  isOpen: true,
                  title: "Upsell Clients",
                  data: dashboardData?.upsellClients || [],
                  classification: "Upsell"
                })}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-gray-50 hover:bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs transition border border-gray-200"
              >
                <Eye size={14} />
                View {dashboardData?.upsellClients?.length || 0}
              </button>
            </div>
          </div>
          
          <div className="space-y-3">
            {(dashboardData?.upsellClients || []).length > 0 ? (
              <>
                {(dashboardData?.upsellClients || []).slice((upsellPage - 1) * itemsPerPage, upsellPage * itemsPerPage).map((client, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 sm:p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-gray-100"
                    onClick={() => navigate(`/cltv/client/${encodeURIComponent(client.companyName)}`)}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-medium text-xs sm:text-sm flex-shrink-0">
                        {client.companyName?.charAt(0) || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-800 truncate">{client.companyName}</p>
                        <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                          {formatCurrency(client.clv)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-1 flex-shrink-0">
                      <span className="text-[10px] sm:text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full whitespace-nowrap">
                        Ready
                      </span>
                    </div>
                  </div>
                ))}
                {Math.ceil((dashboardData?.upsellClients?.length || 0) / itemsPerPage) > 1 && (
                  <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-100">
                    <button
                      onClick={() => setUpsellPage(p => Math.max(1, p - 1))}
                      disabled={upsellPage === 1}
                      className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <span className="text-xs text-gray-500">
                      Page {upsellPage} of {Math.ceil((dashboardData?.upsellClients?.length || 0) / itemsPerPage)}
                    </span>
                    <button
                      onClick={() => setUpsellPage(p => Math.min(Math.ceil((dashboardData?.upsellClients?.length || 0) / itemsPerPage), p + 1))}
                      disabled={upsellPage === Math.ceil((dashboardData?.upsellClients?.length || 0) / itemsPerPage)}
                      className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6 sm:py-8 text-gray-500 text-xs sm:text-sm bg-gray-50 rounded-lg border border-dashed border-gray-200">
                No clients
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Second Row - Mobile Optimized */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* At Risk Clients */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" />
              <span>At Risk</span>
            </h2>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowAtRiskCriteriaModal(true)}
                className="text-blue-600 p-1 hover:bg-blue-50 rounded"
                title="Criteria"
              >
                <Info size={14} />
              </button>
              <button 
                onClick={() => setClassificationModalData({
                  isOpen: true,
                  title: "At Risk Clients",
                  data: dashboardData?.riskyClients || [],
                  classification: "At Risk"
                })}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-gray-50 hover:bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs transition border border-gray-200"
              >
                <Eye size={14} />
                View {dashboardData?.riskyClients?.length || 0}
              </button>
            </div>
          </div>
          
          <div className="space-y-3">
            {(dashboardData?.riskyClients || []).length > 0 ? (
              <>
                {(dashboardData?.riskyClients || []).slice((atRiskPage - 1) * itemsPerPage, atRiskPage * itemsPerPage).map((client, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 sm:p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-gray-100"
                    onClick={() => navigate(`/cltv/client/${encodeURIComponent(client.companyName)}`)}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-medium text-xs sm:text-sm flex-shrink-0">
                        {client.companyName?.charAt(0) || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-800 truncate">{client.companyName}</p>
                        <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                          {client.daysSinceFollowUp || 0}d without follow-up
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-1 flex-shrink-0">
                      <span className="text-[10px] sm:text-xs text-red-600 font-medium">
                        Risk
                      </span>
                    </div>
                  </div>
                ))}
                {Math.ceil((dashboardData?.riskyClients?.length || 0) / itemsPerPage) > 1 && (
                  <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-100">
                    <button
                      onClick={() => setAtRiskPage(p => Math.max(1, p - 1))}
                      disabled={atRiskPage === 1}
                      className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <span className="text-xs text-gray-500">
                      Page {atRiskPage} of {Math.ceil((dashboardData?.riskyClients?.length || 0) / itemsPerPage)}
                    </span>
                    <button
                      onClick={() => setAtRiskPage(p => Math.min(Math.ceil((dashboardData?.riskyClients?.length || 0) / itemsPerPage), p + 1))}
                      disabled={atRiskPage === Math.ceil((dashboardData?.riskyClients?.length || 0) / itemsPerPage)}
                      className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6 sm:py-8 text-gray-500 text-xs sm:text-sm bg-gray-50 rounded-lg border border-dashed border-gray-200">
                No clients
              </div>
            )}
          </div>
        </div>

        {/* Dormant Clients */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Clock size={16} className="text-gray-500" />
              <span>Dormant</span>
            </h2>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowDormantCriteriaModal(true)}
                className="text-blue-600 p-1 hover:bg-blue-50 rounded"
                title="Criteria"
              >
                <Info size={14} />
              </button>
              <button 
                onClick={() => setClassificationModalData({
                  isOpen: true,
                  title: "Dormant Clients",
                  data: dashboardData?.dormantClients || [],
                  classification: "Dormant"
                })}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-gray-50 hover:bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs transition border border-gray-200"
              >
                <Eye size={14} />
                View {dashboardData?.dormantClients?.length || 0}
              </button>
            </div>
          </div>
          
          <div className="space-y-3">
            {(dashboardData?.dormantClients || []).length > 0 ? (
              <>
                {(dashboardData?.dormantClients || []).slice((dormantPage - 1) * itemsPerPage, dormantPage * itemsPerPage).map((client, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 sm:p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-gray-100"
                    onClick={() => navigate(`/cltv/client/${encodeURIComponent(client.companyName)}`)}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-medium text-xs sm:text-sm flex-shrink-0">
                        {client.companyName?.charAt(0) || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-800 truncate">{client.companyName}</p>
                        <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                          {client.daysSinceFollowUp || 0}d
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-1 flex-shrink-0">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/cltv/client/${encodeURIComponent(client.companyName)}`);
                        }}
                        className="text-[10px] sm:text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 whitespace-nowrap"
                      >
                        Engage
                      </button>
                    </div>
                  </div>
                ))}
                {Math.ceil((dashboardData?.dormantClients?.length || 0) / itemsPerPage) > 1 && (
                  <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-100">
                    <button
                      onClick={() => setDormantPage(p => Math.max(1, p - 1))}
                      disabled={dormantPage === 1}
                      className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <span className="text-xs text-gray-500">
                      Page {dormantPage} of {Math.ceil((dashboardData?.dormantClients?.length || 0) / itemsPerPage)}
                    </span>
                    <button
                      onClick={() => setDormantPage(p => Math.min(Math.ceil((dashboardData?.dormantClients?.length || 0) / itemsPerPage), p + 1))}
                      disabled={dormantPage === Math.ceil((dashboardData?.dormantClients?.length || 0) / itemsPerPage)}
                      className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6 sm:py-8 text-gray-500 text-xs sm:text-sm bg-gray-50 rounded-lg border border-dashed border-gray-200">
                No clients
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Reviews Section - Mobile Optimized */}
      {data.recentReviews?.length > 0 && (
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Recent Reviews</h2>
          <div className="space-y-3">
            {data.recentReviews.map((review, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-lg gap-2">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs sm:text-sm flex-shrink-0">
                    {review.companyName?.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-gray-800 truncate">{review.companyName}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                      {new Date(review.reviewedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-auto sm:ml-0">
                  <span className={`text-[10px] sm:text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                    review.progress === "Excellent" ? "bg-green-100 text-green-700" :
                    review.progress === "Good" ? "bg-blue-100 text-blue-700" :
                    review.progress === "Average" ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {review.progress}
                  </span>
                  <span className="text-[10px] sm:text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full whitespace-nowrap">
                    {review.clientHealthScore}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Total CLV Modal - Mobile Optimized */}
      {showTotalCLVModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto mx-3">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">CLV Breakdown</h2>
                <button onClick={() => setShowTotalCLVModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X size={20} />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                  <p className="text-[10px] sm:text-xs text-green-600">High Value</p>
                  <p className="text-base sm:text-lg md:text-2xl font-bold">{data.valueCategories?.["High Value"] || 0}</p>
                </div>
                <div className="bg-yellow-50 p-3 sm:p-4 rounded-lg">
                  <p className="text-[10px] sm:text-xs text-yellow-600">Medium Value</p>
                  <p className="text-base sm:text-lg md:text-2xl font-bold">{data.valueCategories?.["Medium Value"] || 0}</p>
                </div>
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                  <p className="text-[10px] sm:text-xs text-gray-600">Low Value</p>
                  <p className="text-base sm:text-lg md:text-2xl font-bold">{data.valueCategories?.["Low Value"] || 0}</p>
                </div>
                <div className="bg-purple-50 p-3 sm:p-4 rounded-lg">
                  <p className="text-[10px] sm:text-xs text-purple-600">Upsell</p>
                  <p className="text-base sm:text-lg md:text-2xl font-bold">{data.summary.upsellCount || 0}</p>
                </div>
                <div className="bg-green-100 p-3 sm:p-4 rounded-lg">
                  <p className="text-[10px] sm:text-xs text-green-700">Top Value</p>
                  <p className="text-base sm:text-lg md:text-2xl font-bold">{data.summary.topValueCount || 0}</p>
                </div>
                <div className="bg-red-50 p-3 sm:p-4 rounded-lg">
                  <p className="text-[10px] sm:text-xs text-red-600">At Risk</p>
                  <p className="text-base sm:text-lg md:text-2xl font-bold">{data.summary.atRiskCount || 0}</p>
                </div>
                <div className="bg-gray-100 p-3 sm:p-4 rounded-lg">
                  <p className="text-[10px] sm:text-xs text-gray-600">Dormant</p>
                  <p className="text-base sm:text-lg md:text-2xl font-bold">{data.summary.dormantCount || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CLVDashboard;