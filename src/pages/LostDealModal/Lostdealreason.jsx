import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import axios from "axios";
import {
  BarChart3,
  PieChart,
  TrendingDown,
  AlertCircle,
  Users,
  DollarSign,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Target,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  ChevronRight,
  Search,
  BarChart,
  TrendingUp,
  Shield,
  Lightbulb,
  ChevronLeft,
  ChevronRight as RightIcon,
  AlertTriangle,
  TrendingUp as UpTrend,
  TrendingDown as DownTrend,
  Activity,
  Zap,
  Target as TargetIcon,
  Briefcase,
  Building2,
  UserCircle,
  CalendarDays,
  Tag,
  Percent,
  TrendingUp as TrendUp,
  TrendingDown as TrendDown,
  Minus,
  Award,
  Flame,
  Sparkles,
  LineChart,
  PieChart as PieChartIcon,
  UsersRound,
  Lightbulb as LightbulbIcon,
  Clock as ClockIcon,
  Calendar as CalendarIcon,
  IndianRupee,
  X,
  BarChartHorizontal,
  Layers,
  GitBranch,
  PieChart as PieChartLucide,
  RotateCcw,
  Eye,
  Filter as FilterIcon,
  SortAsc,
  SortDesc,
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ----------------------------------------------------------------------
// Counter Animation Component
// ----------------------------------------------------------------------
const Counter = ({ value, duration = 1000, formatter = (val) => val }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime;
    let animationFrame;
    const startValue = 0;
    const endValue = value;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 3);
      const currentCount = startValue + (endValue - startValue) * easeOutQuart;
      setCount(currentCount);
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [value, duration]);

  return <>{formatter(count)}</>;
};

// ----------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------
const LOSS_REASONS = [
  "Price too high",
  "No follow-up",
  "Competitor chosen",
  "No client decision",
  "Requirements mismatch",
  "Budget constraints",
  "Timing issues",
  "Lost to internal solution",
  "Poor product fit",
  "Communication breakdown",
  "Timeline issues",
  "Ghosted/No Reply",
  "Feature Missing",
  "Competitor (Zoho)",
];

const STAGES = [
  "Qualification",
  "Proposal Sent-Negotiation",
  "Invoice Sent",
  "Closed Won",
  "Closed Lost",
];

const COLORS = [
  "#ef4444","#f97316","#eab308","#84cc16","#10b981",
  "#06b6d4","#3b82f6","#8b5cf6","#ec4899","#6b7280",
];

// ----------------------------------------------------------------------
// Helper Functions
// ----------------------------------------------------------------------
const parseValue = (value) => {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const numeric = value.replace(/[^0-9.-]/g, "");
    const parsed = parseFloat(numeric);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const formatCurrency = (value) => {
  if (!value || isNaN(value)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatNumber = (value) => {
  if (!value || isNaN(value)) return "0";
  return new Intl.NumberFormat("en-IN").format(Math.round(value));
};

const formatDate = (dateString) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace(/ /g, "-");
};

const getOwnerName = (assignedTo) => {
  if (!assignedTo) return "Unassigned";
  if (assignedTo.name) return assignedTo.name;
  const firstName = assignedTo.firstName || "";
  const lastName = assignedTo.lastName || "";
  return `${firstName} ${lastName}`.trim() || "Unassigned";
};

const getReasonColor = (reason) => {
  const colors = {
    "Price too high": "#ef4444",
    "No follow-up": "#f97316",
    "Competitor chosen": "#eab308",
    "No client decision": "#84cc16",
    "Requirements mismatch": "#10b981",
    "Budget constraints": "#06b6d4",
    "Timing issues": "#3b82f6",
    "Timeline issues": "#3b82f6",
    "Lost to internal solution": "#8b5cf6",
    "Poor product fit": "#ec4899",
    "Communication breakdown": "#6b7280",
    "Ghosted/No Reply": "#94a3b8",
    "Feature Missing": "#f59e0b",
    "Competitor (Zoho)": "#dc2626",
  };
  return colors[reason] || "#6b7280";
};

const getStageRecoveryRate = (stage) => {
  const rates = {
    "Qualification": 15,
    "Proposal Sent-Negotiation": 25,
    "Invoice Sent": 45,
    "Closed Won": 0,
    "Closed Lost": 0,
    "Unknown": 10,
  };
  return rates[stage] || 10;
};

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------
export default function LostDealAnalytics() {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
  const navigate = useNavigate();

  // --------------------------------------------------------------------
  // State
  // --------------------------------------------------------------------
  const [analytics, setAnalytics] = useState({
    totalLostDeals: 0,
    totalLostValue: 0,
    invoiceSentDeals: { count: 0, value: 0, percentage: 0 },
    monthlyTrend: [],
    reasonDistribution: [],
    topLostUsers: [],
    recentLostDeals: [],
    industryAnalysis: [],
    dealSizeAnalysis: [],
    highValueDeals: [],
    statisticalAnalysis: {
      avgDealValue: 0,
      medianDealValue: 0,
      stdDeviation: 0,
      winRate: 0,
      lossRate: 0,
      recoveryRate: 0,
      trend: "stable",
      predictedLosses: 0,
    },
    stageAnalysis: [],
  });

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    reason: "",
    assignedTo: "",
    industry: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [timeFrame, setTimeFrame] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedReasonModal, setSelectedReasonModal] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dealSortBy, setDealSortBy] = useState("date");
  const [dealSortOrder, setDealSortOrder] = useState("desc");

  //   date range toggle state
  const [showDateRange, setShowDateRange] = useState(false);
  const dateRangeRef = useRef(null);

  // Close date range picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dateRangeRef.current && !dateRangeRef.current.contains(e.target)) {
        setShowDateRange(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --------------------------------------------------------------------
  // Data Fetching
  // --------------------------------------------------------------------
 const fetchAnalytics = useCallback(async (currentTimeFrame, currentFilters) => {
  try {
    setIsLoading(true);
    const token = localStorage.getItem("token");

    const params = new URLSearchParams();
    
    // Calculate date range based on timeframe
    const now = new Date();
    let startDate = null;
    let endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    
    switch (currentTimeFrame) {
      case "week": {
        // Last 7 days (including today)
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      }
      case "month": {
        // Last month (previous calendar month)
        // Example: If today is March 15, show February 1 - February 28/29
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      }
      case "quarter": {
        // Last quarter (previous 3 months)
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 3);
        startDate.setHours(0, 0, 0, 0);
        break;
      }
      case "year": {
        // Last year (previous calendar year)
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.getFullYear() - 1, 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;
      }
      case "all":
      default:
        startDate = null;
        endDate = null;
        break;
    }
    
    // Override with manual date filters if they exist
    if (currentFilters.startDate) {
      params.append("startDate", currentFilters.startDate);
    } else if (startDate) {
      params.append("startDate", startDate.toISOString().split('T')[0]);
    }
    
    if (currentFilters.endDate) {
      params.append("endDate", currentFilters.endDate);
    } else if (endDate) {
      params.append("endDate", endDate.toISOString().split('T')[0]);
    }
    
    // Add other filters
    if (currentFilters.reason) params.append("reason", currentFilters.reason);
    if (currentFilters.assignedTo) params.append("assignedTo", currentFilters.assignedTo);
    if (currentFilters.industry) params.append("industry", currentFilters.industry);
    
    // Add timeframe for reference
    params.append("timeframe", currentTimeFrame);

    console.log("Fetching with params:", Object.fromEntries(params)); // Debug log

    const response = await axios.get(
      `${API_URL}/deals/analytics/lost?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (response.data.success) {
      setAnalytics(response.data.data);
    } else {
      toast.error("Failed to load analytics data");
    }
  } catch (error) {
    console.error("Failed to fetch analytics:", error);
    toast.error("Failed to load analytics. Please try again.");
  } finally {
    setIsLoading(false);
  }
}, [API_URL]);

  // --------------------------------------------------------------------
  // Effects — always pass current timeFrame + filters explicitly to avoid stale closures
  // --------------------------------------------------------------------
  useEffect(() => {
    fetchAnalytics(timeFrame, filters);
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeFrame]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAnalytics(timeFrame, filters);
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data.users || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  // --------------------------------------------------------------------
  // Derived Data (useMemo)
  // --------------------------------------------------------------------
  const parsedRecentDeals = useMemo(() => {
    return (analytics.recentLostDeals || []).map((deal) => ({
      ...deal,
      parsedValue: parseValue(deal.value),
    }));
  }, [analytics.recentLostDeals]);

  const totalLostValueCorrect = useMemo(() => {
    return parsedRecentDeals.reduce((sum, deal) => sum + deal.parsedValue, 0);
  }, [parsedRecentDeals]);

  const stageCounts = useMemo(() => {
    const counts = {
      "Qualification": { count: 0, totalValue: 0 },
      "Proposal Sent-Negotiation": { count: 0, totalValue: 0 },
      "Invoice Sent": { count: 0, totalValue: 0 },
      "Closed Won": { count: 0, totalValue: 0 },
      "Closed Lost": { count: 0, totalValue: 0 },
    };

    parsedRecentDeals.forEach((deal) => {
      const stage = deal.stageLostAt || "Unknown";
      if (counts[stage]) {
        counts[stage].count += 1;
        counts[stage].totalValue += deal.parsedValue;
      } else if (stage !== "Unknown") {
        counts[stage] = { count: 1, totalValue: deal.parsedValue };
      }
    });

    return Object.entries(counts)
      .filter(([_, data]) => data.count > 0)
      .map(([stage, data]) => ({
        stage,
        count: data.count,
        totalValue: data.totalValue,
        percentage:
          parsedRecentDeals.length > 0
            ? Math.round((data.count / parsedRecentDeals.length) * 100)
            : 0,
      }));
  }, [parsedRecentDeals]);

  const highValueDeals = useMemo(() => {
    return parsedRecentDeals
      .filter((deal) => deal.parsedValue >= 500000)
      .map((deal) => ({
        ...deal,
        recoverableValue:
          deal.parsedValue * (getStageRecoveryRate(deal.stageLostAt) / 100),
      }));
  }, [parsedRecentDeals]);

  const highValueTotal = useMemo(() => {
    return highValueDeals.reduce((sum, deal) => sum + deal.parsedValue, 0);
  }, [highValueDeals]);

  const insights = useMemo(() => {
    if (!parsedRecentDeals.length) return [];
    const total = parsedRecentDeals.length;
    const reasonMap = {};
    parsedRecentDeals.forEach((deal) => {
      const reason = deal.lossReason || "Unknown";
      if (!reasonMap[reason]) reasonMap[reason] = { count: 0, value: 0 };
      reasonMap[reason].count += 1;
      reasonMap[reason].value += deal.parsedValue;
    });
    return Object.entries(reasonMap)
      .map(([reason, data]) => ({
        _id: reason,
        count: data.count,
        value: data.value,
        percentage: Math.round((data.count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [parsedRecentDeals]);

  const topReasons = insights.slice(0, 3);

  const topLostUsersCorrect = useMemo(() => {
    const userMap = {};
    parsedRecentDeals.forEach((deal) => {
      if (deal.assignedTo) {
        const userId = deal.assignedTo._id || deal.assignedTo.id;
        if (!userId) return;
        if (!userMap[userId]) {
          userMap[userId] = { ...deal.assignedTo, lostDeals: 0, lostValue: 0 };
        }
        userMap[userId].lostDeals += 1;
        userMap[userId].lostValue += deal.parsedValue;
      }
    });
    return Object.values(userMap).sort((a, b) => b.lostDeals - a.lostDeals);
  }, [parsedRecentDeals]);

  const getHighestLossStage = useMemo(() => {
    if (!stageCounts.length) return null;
    return stageCounts.reduce((max, stage) =>
      stage.count > max.count ? stage : max
    );
  }, [stageCounts]);

  const getHighestLossReason = useMemo(() => {
    if (!insights.length) return null;
    return insights.reduce((max, reason) =>
      reason.count > max.count ? reason : max
    );
  }, [insights]);

  const getHighestValueIndustry = useMemo(() => {
    if (!analytics.industryAnalysis || !analytics.industryAnalysis.length)
      return null;
    return analytics.industryAnalysis.reduce((max, industry) =>
      (industry.value || 0) > (max.value || 0) ? industry : max
    );
  }, [analytics.industryAnalysis]);

  const getTopSalesRep = useMemo(() => {
    if (!topLostUsersCorrect.length) return null;
    return topLostUsersCorrect[0];
  }, [topLostUsersCorrect]);

  // Compute timeframe boundary for client-side filtering
  const timeFrameStartDate = useMemo(() => {
    // If manual dates are set, let those take over — no timeframe cap
    if (filters.startDate || filters.endDate) return null;
    const now = new Date();
    switch (timeFrame) {
      case "week": {
        const d = new Date(now); d.setDate(d.getDate() - 7); d.setHours(0,0,0,0); return d;
      }
      case "month": {
        const d = new Date(now); d.setMonth(d.getMonth() - 1); d.setHours(0,0,0,0); return d;
      }
      case "quarter": {
        const d = new Date(now); d.setMonth(d.getMonth() - 3); d.setHours(0,0,0,0); return d;
      }
      case "year": {
        const d = new Date(now); d.setFullYear(d.getFullYear() - 1); d.setHours(0,0,0,0); return d;
      }
      case "all":
      default:
        return null;
    }
  }, [timeFrame, filters.startDate, filters.endDate]);

  //  Client-side filtering (timeframe + search + dropdowns + date range)
  const filteredRecentDeals = useMemo(() => {
    let filtered = parsedRecentDeals;

    // Timeframe filter (skipped when manual dates are set)
    if (timeFrameStartDate) {
      filtered = filtered.filter(
        (deal) => deal.lostDate && new Date(deal.lostDate) >= timeFrameStartDate
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (deal) =>
          (deal.dealName || "").toLowerCase().includes(query) ||
          (deal.companyName || "").toLowerCase().includes(query) ||
          (deal.lossReason || "").toLowerCase().includes(query) ||
          getOwnerName(deal.assignedTo).toLowerCase().includes(query)
      );
    }

    if (filters.reason) {
      filtered = filtered.filter((deal) => deal.lossReason === filters.reason);
    }

    if (filters.assignedTo) {
      filtered = filtered.filter(
        (deal) =>
          deal.assignedTo?._id === filters.assignedTo ||
          deal.assignedTo?.id === filters.assignedTo
      );
    }

    if (filters.industry) {
      filtered = filtered.filter((deal) => deal.industry === filters.industry);
    }

    // Manual date range — end of day inclusive for endDate
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter(
        (deal) => deal.lostDate && new Date(deal.lostDate) >= start
      );
    }

    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(
        (deal) => deal.lostDate && new Date(deal.lostDate) <= end
      );
    }

    return filtered;
  }, [parsedRecentDeals, searchQuery, filters, timeFrameStartDate]);

  const sortedDealsForTableView = useMemo(() => {
    let sorted = [...filteredRecentDeals];
    if (dealSortBy === "date") {
      sorted.sort((a, b) => {
        const dateA = a.lostDate ? new Date(a.lostDate).getTime() : 0;
        const dateB = b.lostDate ? new Date(b.lostDate).getTime() : 0;
        return dealSortOrder === "desc" ? dateB - dateA : dateA - dateB;
      });
    } else if (dealSortBy === "value") {
      sorted.sort((a, b) =>
        dealSortOrder === "desc"
          ? b.parsedValue - a.parsedValue
          : a.parsedValue - b.parsedValue
      );
    }
    return sorted;
  }, [filteredRecentDeals, dealSortBy, dealSortOrder]);

  const totalPages = Math.ceil(sortedDealsForTableView.length / itemsPerPage);
  const paginatedDeals = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedDealsForTableView.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedDealsForTableView, currentPage, itemsPerPage]);

  // --------------------------------------------------------------------
  // Event Handlers
  // --------------------------------------------------------------------
  const handlePageChange = (page) => setCurrentPage(page);

  const handleViewDeal = (dealId) => navigate(`/Pipelineview/${dealId}`);

  // also resets showDateRange
  const clearFilters = () => {
    const clearedFilters = {
      startDate: "",
      endDate: "",
      reason: "",
      assignedTo: "",
      industry: "",
    };
    setFilters(clearedFilters);
    setSearchQuery("");
    setCurrentPage(1);
    setShowDateRange(false);
    fetchAnalytics(timeFrame, clearedFilters);
  };

  const handleReasonClick = (reason) => {
    const reasonData = {
      reason: reason._id,
      count: reason.count,
      percentage: reason.percentage,
      deals: parsedRecentDeals.filter((deal) => deal.lossReason === reason._id),
      totalValue: parsedRecentDeals
        .filter((deal) => deal.lossReason === reason._id)
        .reduce((sum, deal) => sum + deal.parsedValue, 0),
    };

    const industriesMap = new Map();
    reasonData.deals.forEach((deal) => {
      const industry = deal.industry || "Unknown";
      if (!industriesMap.has(industry))
        industriesMap.set(industry, { count: 0, value: 0 });
      const d = industriesMap.get(industry);
      d.count += 1;
      d.value += deal.parsedValue;
    });
    reasonData.industries = Array.from(industriesMap.entries()).map(
      ([name, data]) => ({ name, count: data.count, value: data.value })
    );

    const stagesMap = new Map();
    reasonData.deals.forEach((deal) => {
      const stage = deal.stageLostAt || "Unknown";
      if (!stagesMap.has(stage)) stagesMap.set(stage, { count: 0, value: 0 });
      const d = stagesMap.get(stage);
      d.count += 1;
      d.value += deal.parsedValue;
    });
    reasonData.stages = Array.from(stagesMap.entries()).map(([name, data]) => ({
      name,
      count: data.count,
      value: data.value,
    }));

    const usersMap = new Map();
    reasonData.deals.forEach((deal) => {
      if (deal.assignedTo) {
        const userId = deal.assignedTo._id || deal.assignedTo.id;
        const userName = getOwnerName(deal.assignedTo);
        if (!usersMap.has(userId))
          usersMap.set(userId, { name: userName, count: 0, value: 0 });
        const d = usersMap.get(userId);
        d.count += 1;
        d.value += deal.parsedValue;
      }
    });
    reasonData.topUsers = Array.from(usersMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setSelectedReasonModal(reasonData);
    setIsModalOpen(true);
  };

  const toggleSort = (sortBy) => {
    if (dealSortBy === sortBy) {
      setDealSortOrder(dealSortOrder === "desc" ? "asc" : "desc");
    } else {
      setDealSortBy(sortBy);
      setDealSortOrder("desc");
    }
  };

  const handleTodayFilter = () => {
    const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
    setFilters((f) => ({ ...f, startDate: today, endDate: today }));
    setShowDateRange(false);
  };

  const isTodayActive = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return filters.startDate === today && filters.endDate === today;
  }, [filters.startDate, filters.endDate]);

  const exportCSV = () => {
    try {
      const headers = ["Date Lost","Deal Name","Stage Lost At","Value","Loss Reason","Owner"];
      const rows = sortedDealsForTableView.map((deal) => [
        formatDate(deal.lostDate),
        deal.dealName || "",
        deal.stageLostAt || "Unknown",
        formatCurrency(deal.parsedValue),
        deal.lossReason || "",
        getOwnerName(deal.assignedTo),
      ]);
      const csvContent =
        "data:text/csv;charset=utf-8,\uFEFF" +
        [headers.join(","), ...rows.map((row) => row.map((item) => `"${item}"`).join(","))].join("\n");
      const link = document.createElement("a");
      link.setAttribute("href", encodeURI(csvContent));
      link.setAttribute("download", `lost-deals-${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("CSV exported successfully!");
    } catch (error) {
      console.error("CSV export failed:", error);
      toast.error("Failed to export CSV");
    }
  };

  const exportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Lost Deals Report", 14, 15);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 22);
      const tableColumn = ["Date Lost","Deal Name","Stage Lost At","Value","Loss Reason","Owner"];
      const tableRows = sortedDealsForTableView.map((deal) => [
        formatDate(deal.lostDate),
        deal.dealName || "",
        deal.stageLostAt || "Unknown",
        `Rs. ${Number(deal.parsedValue || 0).toLocaleString("en-IN")}`,
        deal.lossReason || "",
        getOwnerName(deal.assignedTo),
      ]);
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 30,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
      });
      doc.save(`lost-deals-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF exported successfully!");
    } catch (error) {
      console.error("PDF export failed:", error);
      toast.error("Failed to export PDF");
    }
  };

  const invoiceSentDeals = useMemo(() => {
    const deals = parsedRecentDeals.filter(
      (deal) => deal.stageLostAt === "Invoice Sent"
    );
    const count = deals.length;
    const value = deals.reduce((sum, deal) => sum + deal.parsedValue, 0);
    const percentage =
      parsedRecentDeals.length > 0
        ? Math.round((count / parsedRecentDeals.length) * 100)
        : 0;
    return { count, value, percentage };
  }, [parsedRecentDeals]);

  // Helper: label for date range button
  const dateRangeLabel = useMemo(() => {
    if (filters.startDate && filters.endDate)
      return `${formatDate(filters.startDate)} → ${formatDate(filters.endDate)}`;
    if (filters.startDate) return `From ${formatDate(filters.startDate)}`;
    if (filters.endDate) return `Until ${formatDate(filters.endDate)}`;
    return "Date Range";
  }, [filters.startDate, filters.endDate]);

  const hasDateFilter = filters.startDate || filters.endDate;

  // --------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <span
            className="cursor-pointer hover:text-blue-600"
            onClick={() => navigate("/team-analytics       ")}
          >
            Reports
          </span>
          <ChevronRight size={14} />
          <span className="font-medium text-blue-600">Lost Deal Analytics</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
              Lost Deal Analysis & Intelligence
            </h1>
            <p className="text-gray-500 mt-1">
              Analyze patterns and recover lost opportunities
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
            <button
              onClick={exportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
            >
              <Download size={16} />
              PDF
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
            >
              <Download size={16} />
              CSV
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Recovery Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Lost Value */}
        <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl p-5 text-white shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <IndianRupee size={20} />
            </div>
          </div>
          <div className="text-2xl font-bold mb-1">
            <Counter
              value={totalLostValueCorrect}
              duration={1500}
              formatter={(val) => formatCurrency(val)}
            />
          </div>
          <div className="text-sm text-rose-100">Total Lost Value</div>
        </div>

        {/* Total Lost Deals */}
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <XCircle size={20} />
            </div>
          </div>
          <div className="text-2xl font-bold mb-1">
            <Counter
              value={parsedRecentDeals.length}
              duration={1500}
              formatter={(val) => formatNumber(val)}
            />
          </div>
          <div className="text-sm text-amber-100">Total Lost Deals</div>
        </div>

        {/* Deals Lost at Invoice Sent */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <RotateCcw size={20} />
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-white/20 font-bold">
              {invoiceSentDeals.percentage}% of total
            </span>
          </div>
          <div className="text-2xl font-bold mb-1">
            <Counter
              value={invoiceSentDeals.count}
              duration={1500}
              formatter={(val) => formatNumber(val)}
            />
          </div>
          <div className="text-sm text-emerald-100">Deals Lost at Invoice Sent</div>
          <div className="text-xs text-emerald-200 mt-2">
            Value: {formatCurrency(invoiceSentDeals.value)}
          </div>
        </div>

        {/* Percentage */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Percent size={20} />
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-white/20 font-bold">
              {invoiceSentDeals.percentage}% of total
            </span>
          </div>
          <div className="text-3xl font-bold mb-1">
            <Counter
              value={invoiceSentDeals.percentage}
              duration={1500}
              formatter={(val) => `${Math.round(val)}%`}
            />
          </div>
          <div className="text-sm text-purple-100">Lost at Invoice Sent Stage</div>
          <div className="text-xs text-purple-200 mt-2">
            {invoiceSentDeals.count} out of {parsedRecentDeals.length} deals
          </div>
          <div className="text-base font-semibold mt-2 pt-2 border-t border-white/20">
            Total Value: {formatCurrency(invoiceSentDeals.value)}
          </div>
        </div>
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 rounded-lg text-red-600">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h4 className="font-semibold text-red-800 mb-1">High-Value Alert</h4>
              <p className="text-sm text-red-600 mb-2">
                {highValueDeals.length} deals over ₹5L lost
              </p>
              <button
                onClick={() =>
                  document
                    .getElementById("high-value-deals")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="text-xs font-medium text-red-700 hover:text-red-800"
              >
                Review →
              </button>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <Lightbulb size={18} />
            </div>
            <div>
              <h4 className="font-semibold text-blue-800 mb-1">Top Pattern</h4>
              <p className="text-sm text-blue-600 mb-2">
                "{topReasons[0]?._id || "No data"}" -{" "}
                {topReasons[0]?.percentage || 0}%
              </p>
              <button
                onClick={() =>
                  topReasons[0]?._id &&
                  setFilters({ ...filters, reason: topReasons[0]._id })
                }
                className="text-xs font-medium text-blue-700 hover:text-blue-800"
              >
                Filter →
              </button>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 rounded-lg text-green-600">
              <Zap size={18} />
            </div>
            <div>
              <h4 className="font-semibold text-green-800 mb-1">Recovery Opportunity</h4>
              <p className="text-sm text-green-600 mb-2">
                Focus on {getHighestLossStage?.stage || "early"} stage...
              </p>
              <button
                onClick={() =>
                  toast.info("Focus on Invoice Sent stage for recovery")
                }
                className="text-xs font-medium text-green-700 hover:text-green-800"
              >
                Learn more →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        {/* Top row: search + timeframe + clear */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search deals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <select
              value={timeFrame}
              onChange={(e) => setTimeFrame(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="week">This Week</option>
              <option value="month">Last Month</option>
              <option value="quarter">Last Quarter</option>
              <option value="year">Last Year</option>
              <option value="all">All Time</option>
            </select>

            <button
              onClick={clearFilters}
              className="px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/*  Filter row: compact date range button + 3 dropdowns — all on one line */}
        <div className="flex flex-wrap items-center gap-3 mt-4">
          {/* Date Range Toggle */}
          <div className="relative" ref={dateRangeRef}>
            <button
              onClick={() => setShowDateRange((prev) => !prev)}
              className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors whitespace-nowrap ${
                hasDateFilter
                  ? "border-blue-400 bg-blue-50 text-blue-700 font-medium"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Calendar size={14} />
              <span className="max-w-[180px] truncate">{dateRangeLabel}</span>
              {hasDateFilter && (
                <span
                  className="ml-1 text-blue-400 hover:text-blue-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFilters((f) => ({ ...f, startDate: "", endDate: "" }));
                    setShowDateRange(false);
                  }}
                >
                  <X size={13} />
                </span>
              )}
            </button>

            {/* Dropdown date pickers */}
            {showDateRange && (
              <div className="absolute top-full left-0 mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-lg p-3 whitespace-nowrap">
                {/* Quick preset: Today */}
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                  <span className="text-xs text-gray-400 font-medium">Quick:</span>
                  <button
                    onClick={handleTodayFilter}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      isTodayActive
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                    }`}
                  >
                    Today
                  </button>
                </div>
                {/* Manual range inputs */}
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500 font-medium">From</label>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) =>
                        setFilters({ ...filters, startDate: e.target.value })
                      }
                      className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <span className="text-gray-400 mt-4">→</span>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500 font-medium">To</label>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) =>
                        setFilters({ ...filters, endDate: e.target.value })
                      }
                      className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <button
                    onClick={() => setShowDateRange(false)}
                    className="mt-4 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Reason dropdown */}
          <select
            value={filters.reason}
            onChange={(e) => setFilters({ ...filters, reason: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 bg-white"
          >
            <option value="">All Reasons</option>
            {LOSS_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </select>

          {/* User dropdown */}
          <select
            value={filters.assignedTo}
            onChange={(e) =>
              setFilters({ ...filters, assignedTo: e.target.value })
            }
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 bg-white"
          >
            <option value="">All Users</option>
            {users.map((user) => (
              <option key={user._id} value={user._id}>
                {user.firstName} {user.lastName}
              </option>
            ))}
          </select>

          {/* Industry dropdown */}
          <select
            value={filters.industry}
            onChange={(e) =>
              setFilters({ ...filters, industry: e.target.value })
            }
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 bg-white"
          >
            <option value="">All Industries</option>
            {analytics.industryAnalysis?.map((industry) => (
              <option key={industry._id} value={industry._id}>
                {industry._id}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 text-xs text-gray-500">
          Showing {filteredRecentDeals.length} of {parsedRecentDeals.length} deals
        </div>

        {/* Deal-Wise View Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mt-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Eye size={18} className="text-blue-500" />
              Deal-Wise View - Lost Opportunities
            </h3>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
                <button
                  onClick={() => toggleSort("date")}
                  className={`flex items-center gap-1 px-2 sm:px-3 py-1 text-[11px] sm:text-xs rounded-md transition-colors whitespace-nowrap ${
                    dealSortBy === "date"
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <Calendar size={14} />
                  Date
                  {dealSortBy === "date" &&
                    (dealSortOrder === "desc" ? (
                      <SortDesc size={14} />
                    ) : (
                      <SortAsc size={14} />
                    ))}
                </button>

                <button
                  onClick={() => toggleSort("value")}
                  className={`flex items-center gap-1 px-2 sm:px-3 py-1 text-[11px] sm:text-xs rounded-md transition-colors whitespace-nowrap ${
                    dealSortBy === "value"
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <IndianRupee size={14} />
                  Value
                  {dealSortBy === "value" &&
                    (dealSortOrder === "desc" ? (
                      <SortDesc size={14} />
                    ) : (
                      <SortAsc size={14} />
                    ))}
                </button>
              </div>

              <span className="text-xs text-gray-500 whitespace-nowrap">
                {filteredRecentDeals.length} deals
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="h-40 flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-y border-gray-100">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Date Lost</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Deal Name</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Stage Lost At</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Value</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Loss Reason</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDeals.length > 0 ? (
                      paginatedDeals.map((deal) => {
                        const stageLostAt = deal.stageLostAt || "Unknown";
                        return (
                          <tr
                            key={deal._id}
                            className="border-b border-gray-100 hover:bg-gray-50"
                          >
                            <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                              {formatDate(deal.lostDate)}
                            </td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() => handleViewDeal(deal._id)}
                                className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {deal.dealName || "—"}
                              </button>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  stageLostAt === "Invoice Sent"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {stageLostAt}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-medium text-gray-800">
                              {formatCurrency(deal.parsedValue)}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className="px-2 py-1 rounded-full text-xs cursor-pointer hover:opacity-80"
                                style={{
                                  backgroundColor:
                                    getReasonColor(deal.lossReason) + "20",
                                  color: getReasonColor(deal.lossReason),
                                }}
                                onClick={() => {
                                  const reason = insights.find(
                                    (r) => r._id === deal.lossReason
                                  );
                                  if (reason) handleReasonClick(reason);
                                }}
                              >
                                {deal.lossReason || "—"}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-blue-600 text-xs font-bold">
                                    {getOwnerName(deal.assignedTo)
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")}
                                  </span>
                                </div>
                                <span className="text-gray-600">
                                  {getOwnerName(deal.assignedTo)}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan="6"
                          className="py-8 text-center text-gray-500"
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
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-500">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-200 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    {Array.from(
                      { length: Math.min(5, totalPages) },
                      (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) pageNum = i + 1;
                        else if (currentPage <= 3) pageNum = i + 1;
                        else if (currentPage >= totalPages - 2)
                          pageNum = totalPages - 4 + i;
                        else pageNum = currentPage - 2 + i;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-3 py-1 border rounded-md text-sm ${
                              currentPage === pageNum
                                ? "bg-blue-600 text-white border-blue-600"
                                : "border-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      }
                    )}
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-200 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Loss Reason Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <PieChart size={18} className="text-purple-500" />
                Loss Reasons
              </h3>
              <span className="text-sm bg-purple-50 text-purple-700 px-2 py-1 rounded-full">
                {parsedRecentDeals.length} total
              </span>
            </div>

            {isLoading ? (
              <div className="h-64 flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {insights.map((reason, index) => (
                  <div
                    key={reason._id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                      selectedReasonModal?.reason === reason._id
                        ? "border-purple-300 bg-purple-50"
                        : "border-gray-100 hover:border-purple-200 hover:bg-gray-50"
                    }`}
                    onClick={() => handleReasonClick(reason)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${
                            index === 0
                              ? "bg-red-100 text-red-700"
                              : index === 1
                              ? "bg-orange-100 text-orange-700"
                              : index === 2
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {index + 1}
                        </span>
                        <span className="font-medium text-gray-700">
                          {reason._id}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800">
                          {reason.count}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {reason.percentage}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          width: `${reason.percentage}%`,
                          backgroundColor: getReasonColor(reason._id),
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stage Analysis */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Layers size={18} className="text-indigo-500" />
                Stage Analysis - Where Deals Are Lost
              </h3>
              <span className="text-sm bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">
                Total Deals: {parsedRecentDeals.length}
              </span>
            </div>

            {isLoading ? (
              <div className="h-40 flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {stageCounts.map((stage) => (
                  <div
                    key={stage.stage}
                    className="border border-gray-100 rounded-lg p-4 hover:shadow-sm transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold text-gray-800 text-base">
                          {stage.stage}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {stage.count} deal{stage.count !== 1 ? "s" : ""} |{" "}
                          {formatCurrency(stage.totalValue)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-indigo-600">
                          {stage.percentage}%
                        </div>
                        <div className="text-xs text-gray-500">of total</div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 mt-2">
                      <div
                        className="h-2.5 rounded-full transition-all"
                        style={{
                          width: `${stage.percentage}%`,
                          backgroundColor:
                            stage.stage === "Invoice Sent"
                              ? "#f59e0b"
                              : stage.stage === "Closed Lost"
                              ? "#ef4444"
                              : "#6366f1",
                        }}
                      />
                    </div>
                    {stage.stage === "Invoice Sent" && (
                      <div className="mt-2 text-xs text-amber-600 font-medium flex items-center gap-1">
                        <AlertCircle size={12} />
                        High recovery potential - Focus on negotiation before invoicing
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Monthly Trend */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
    <BarChart3 size={18} className="text-blue-500" />
    Monthly Trend
  </h3>

  {isLoading ? (
    <div className="h-56 flex justify-center items-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  ) : analytics.monthlyTrend?.length > 0 ? (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={(() => {
            const raw = analytics.monthlyTrend;

            const sorted = [...raw].sort(
              (a, b) => new Date(a._id) - new Date(b._id)
            );

            const start = new Date(sorted[0]._id + "-01");
            const end = new Date(sorted[sorted.length - 1]._id + "-01");

            const map = {};

            // merge duplicates
            sorted.forEach((m) => {
              if (!map[m._id]) {
                map[m._id] = { deals: 0, value: 0 };
              }
              map[m._id].deals += m.count;
              map[m._id].value += m.value;
            });

            const result = [];
            const current = new Date(start);

            while (current <= end) {
              const key = current.toISOString().slice(0, 7);

              result.push({
                month: current.toLocaleDateString("en-US", {
                  month: "short",
                  year: "2-digit",
                }),
                deals: map[key]?.deals || 0,
                value: map[key]?.value || 0,
              });

              current.setMonth(current.getMonth() + 1);
            }

            return result;
          })()}
          margin={{ top: 10, right: 20, left: 50, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            dataKey="month"
            interval={0}
            tick={{ fontSize: 12 }}
          />

          <YAxis
            tickFormatter={(value) => value.toLocaleString()}
            width={80}
          />

          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
            }}
            formatter={(value, name) =>
              name === "Value"
                ? [`₹${value.toLocaleString()}`, "Value"]
                : [value, "Deals"]
            }
          />

          <Legend />

          <Bar
            dataKey="deals"
            name="Deals"
            fill="#3B82F6"
            radius={[6, 6, 0, 0]}
          />

          <Bar
            dataKey="value"
            name="Value"
            fill="#10B981"
            radius={[6, 6, 0, 0]}
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  ) : (
    <div className="h-56 flex items-center justify-center text-gray-500">
      No trend data available
    </div>
  )}
</div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Deals Lost at Invoice Sent */}
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100">
            <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Zap size={16} className="text-emerald-500" />
              Deals Lost at Invoice Sent Stage
            </h3>

            <div className="space-y-3">
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-3 border border-amber-200">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <div className="text-xs font-semibold text-amber-700">
                      Deals Lost at Invoice Sent
                    </div>
                    <div className="text-2xl font-bold text-amber-800">
                      {invoiceSentDeals.percentage}%
                    </div>
                    <div className="text-xs text-amber-600">
                      {invoiceSentDeals.count} deals
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Total Value</div>
                    <div className="text-lg font-bold text-emerald-700">
                      {formatCurrency(invoiceSentDeals.value)}
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      Recovery:{" "}
                      {formatCurrency(invoiceSentDeals.value * 0.45)}
                    </div>
                  </div>
                </div>
                <div className="w-full bg-amber-200 rounded-full h-2">
                  <div
                    className="bg-amber-600 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${invoiceSentDeals.percentage}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-gray-600">
                    Lost Deals Details
                  </span>
                  <span className="text-xs text-gray-500">
                    Recovery Potential: 45%
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {parsedRecentDeals
                    .filter((deal) => deal.stageLostAt === "Invoice Sent")
                    .map((deal) => {
                      const recoveryAmount = deal.parsedValue * 0.45;
                      return (
                        <div
                          key={deal._id}
                          className="bg-white rounded-lg p-3 border border-gray-100 hover:shadow-sm transition-all cursor-pointer"
                          onClick={() => handleViewDeal(deal._id)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="font-medium text-gray-800 text-sm">
                                {deal.dealName || "Unnamed Deal"}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {deal.companyName || "No company"}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-red-600">
                                {formatCurrency(deal.parsedValue)}
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                            <div className="flex items-center gap-2">
                              <span
                                className="px-2 py-0.5 rounded-full text-xs"
                                style={{
                                  backgroundColor:
                                    getReasonColor(deal.lossReason) + "20",
                                  color: getReasonColor(deal.lossReason),
                                }}
                              >
                                {deal.lossReason || "No reason"}
                              </span>
                              <span className="text-xs text-gray-400">
                                {formatDate(deal.lostDate)}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-emerald-600 font-medium">
                                Recoverable: {formatCurrency(recoveryAmount)}
                              </div>
                              <div className="text-xs text-gray-400">
                                45% recovery rate
                              </div>
                            </div>
                          </div>
                          <div className="mt-2">
                            <div className="w-full bg-gray-100 rounded-full h-1">
                              <div
                                className="bg-emerald-500 h-1 rounded-full"
                                style={{ width: "45%" }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  {parsedRecentDeals.filter(
                    (deal) => deal.stageLostAt === "Invoice Sent"
                  ).length === 0 && (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No deals lost at Invoice Sent stage
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="bg-white rounded-lg p-2 text-center border-l-4 border-rose-500">
                  <div className="text-xs text-gray-500">Total Lost Value</div>
                  <div className="text-sm font-bold text-rose-600">
                    {formatCurrency(totalLostValueCorrect)}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-2 text-center border-l-4 border-emerald-500">
                  <div className="text-xs text-gray-500">Recoverable Total</div>
                  <div className="text-sm font-bold text-emerald-600">
                    {formatCurrency(invoiceSentDeals.value * 0.45)}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-2 text-center border-l-4 border-amber-500">
                  <div className="text-xs text-gray-500">Total Deals Lost</div>
                  <div className="text-sm font-bold text-amber-600">
                    {parsedRecentDeals.length}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-2 text-center border-l-4 border-purple-500">
                  <div className="text-xs text-gray-500">Lost at Invoice Sent</div>
                  <div className="text-sm font-bold text-purple-600">
                    {invoiceSentDeals.count}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {invoiceSentDeals.percentage}% of total
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Loss Contributors */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Users size={18} className="text-orange-500" />
              Top Contributors
            </h3>

            <div className="space-y-3">
              {topLostUsersCorrect.slice(0, 4).map((user, index) => (
                <div
                  key={user._id || user.id || index}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {getOwnerName(user)
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      {index < 3 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-[10px] text-white font-bold">
                            {index + 1}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-800 text-sm">
                        {getOwnerName(user)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {user.email || ""}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-orange-600">
                      {user.lostDeals}
                    </div>
                    <div className="text-xs text-gray-400">lost</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Full Width Sections */}
      <div className="mt-6 space-y-6">
        {/* High Value Lost Deals */}
        <div
          id="high-value-deals"
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Award size={18} className="text-amber-500" />
              High-Value Lost Deals (₹5L+)
            </h3>
            <span className="text-sm text-gray-500">
              Total: {formatCurrency(highValueTotal)}
            </span>
          </div>

          {highValueDeals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {highValueDeals.slice(0, 5).map((deal, index) => {
                const stageLostAt = deal.stageLostAt || "Unknown";
                const recoveryRate = getStageRecoveryRate(stageLostAt);
                const recoverable = deal.parsedValue * (recoveryRate / 100);

                return (
                  <div
                    key={deal._id}
                    className="border border-gray-100 rounded-lg p-4 hover:shadow-sm transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium text-gray-800">
                          {deal.dealName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {deal.companyName}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-bold ${
                          index === 0
                            ? "bg-red-100 text-red-700"
                            : index === 1
                            ? "bg-orange-100 text-orange-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {index === 0 ? "HIGH" : index === 1 ? "MED" : "LOW"}{" "}
                        Priority
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-3">
                      <div>
                        <div className="text-sm text-gray-500">Value</div>
                        <div className="font-bold text-red-600">
                          {formatCurrency(deal.parsedValue)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Stage Lost</div>
                        <div className="text-sm text-gray-700">{stageLostAt}</div>
                      </div>
                    </div>
                    <div className="mt-2 flex justify-between items-center">
                      <span
                        className="px-2 py-1 rounded-full text-xs cursor-pointer"
                        style={{
                          backgroundColor:
                            getReasonColor(deal.lossReason) + "20",
                          color: getReasonColor(deal.lossReason),
                        }}
                        onClick={() => {
                          const reason = insights.find(
                            (r) => r._id === deal.lossReason
                          );
                          if (reason) handleReasonClick(reason);
                        }}
                      >
                        {deal.lossReason || "Not specified"}
                      </span>
                      <span className="text-xs font-medium text-green-600">
                        {recoveryRate}% recoverable ({formatCurrency(recoverable)})
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              No high-value lost deals found
            </div>
          )}
        </div>

        {/* Stage Intelligence Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Activity size={18} className="text-indigo-500" />
            Stage Intelligence Summary
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
              <div className="text-sm text-purple-700 mb-1">
                Most Vulnerable Stage
              </div>
              <div className="text-lg font-bold text-purple-900">
                {getHighestLossStage?.stage || "N/A"}
              </div>
              <div className="text-xs text-purple-600 mt-1">
                {getHighestLossStage?.count || 0} deal
                {getHighestLossStage?.count !== 1 ? "s" : ""} (
                {formatCurrency(getHighestLossStage?.totalValue || 0)})
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
              <div className="text-sm text-blue-700 mb-1">
                Most Common Loss Reason
              </div>
              <div className="text-lg font-bold text-blue-900">
                {getHighestLossReason?._id || "N/A"}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                {getHighestLossReason?.count || 0} occurrence
                {getHighestLossReason?.count !== 1 ? "s" : ""}
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-4">
              <div className="text-sm text-emerald-700 mb-1">
                Highest Value Lost Industry
              </div>
              <div className="text-lg font-bold text-emerald-900">
                {getHighestValueIndustry?._id || "N/A"}
              </div>
              <div className="text-xs text-emerald-600 mt-1">
                {formatCurrency(getHighestValueIndustry?.value || 0)}
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4">
              <div className="text-sm text-amber-700 mb-1">
                Sales Rep with Most Lost Deals
              </div>
              <div className="text-lg font-bold text-amber-900">
                {getTopSalesRep ? getOwnerName(getTopSalesRep) : "N/A"}
              </div>
              <div className="text-xs text-amber-600 mt-1">
                {getTopSalesRep?.lostDeals || 0} deal
                {getTopSalesRep?.lostDeals !== 1 ? "s" : ""} lost
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reason Detail Modal */}
      {isModalOpen && selectedReasonModal && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {selectedReasonModal.reason}
                </h2>
                <p className="text-gray-500 mt-1">
                  {selectedReasonModal.count} deals lost | Total Value:{" "}
                  {formatCurrency(selectedReasonModal.totalValue)}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <BarChart size={18} />
                  Top 10 Deals by Value
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart
                      data={selectedReasonModal.deals
                        .sort((a, b) => b.parsedValue - a.parsedValue)
                        .slice(0, 10)
                        .map((deal) => ({
                          name: deal.dealName || "Unknown",
                          value: deal.parsedValue,
                        }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Bar
                        dataKey="value"
                        fill={getReasonColor(selectedReasonModal.reason)}
                      />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <Building2 size={18} />
                    Industries Breakdown
                  </h3>
                  <div className="space-y-3">
                    {selectedReasonModal.industries.map((industry, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center p-2 bg-white rounded-lg"
                      >
                        <div>
                          <div className="font-medium text-gray-800">
                            {industry.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {industry.count} deals
                          </div>
                        </div>
                        <div className="font-semibold text-gray-800">
                          {formatCurrency(industry.value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <GitBranch size={18} />
                    Stage Breakdown
                  </h3>
                  <div className="space-y-3">
                    {selectedReasonModal.stages.map((stage, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center p-2 bg-white rounded-lg"
                      >
                        <div>
                          <div className="font-medium text-gray-800">
                            {stage.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {stage.count} deals
                          </div>
                        </div>
                        <div className="font-semibold text-gray-800">
                          {formatCurrency(stage.value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Users size={18} />
                  Top Users Responsible
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedReasonModal.topUsers.map((user, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-white rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">
                            {user.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {user.count} deals
                          </div>
                        </div>
                      </div>
                      <div className="font-semibold text-gray-800">
                        {formatCurrency(user.value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-100 p-6 flex justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};