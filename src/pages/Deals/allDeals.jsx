import { useEffect, useState, useMemo, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { MoreVertical, Edit, Trash2, Eye, Plus, Trophy, Calendar, Clock, AlertCircle, Bell, X, Ban, Upload, Download, FileSpreadsheet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import ReactDOM from "react-dom";
import { TourProvider, useTour } from "@reactour/tour";
import { initSocket, getSocket } from "../../utils/socket";
import { exportRowsToExcel, downloadExcelTemplate, parseExcelFile } from "../../utils/excelImportExport";

const API_URL = import.meta.env.VITE_API_URL;

/* ── Import/Export column definitions — shared between Export, Template,
   and Import so a downloaded template always re-uploads successfully. ── */
const DEAL_COLUMNS = [
  { key: "dealName",        label: "Deal Name" },
  { key: "companyName",     label: "Company Name" },
  { key: "phoneNumber",     label: "Phone Number" },
  { key: "dealTitle",       label: "Deal Title" },
  { key: "assignedTo",      label: "Assigned To (Email)" },
  { key: "value",           label: "Value" },
  { key: "currency",        label: "Currency" },
  { key: "clientType",      label: "Client Type (B2B/B2C)" },
  { key: "discountGiven",   label: "Discount Given (%)", type: "number" },
  { key: "stage",           label: "Stage" },
  { key: "email",           label: "Email" },
  { key: "source",          label: "Source" },
  { key: "companySize",     label: "Company Size" },
  { key: "industry",        label: "Industry" },
  { key: "requirement",     label: "Requirement", wrap: true },
  { key: "address",         label: "Address", wrap: true },
  { key: "country",         label: "Country" },
  { key: "notes",           label: "Notes", wrap: true },
  { key: "followUpDate",    label: "Follow Up Date (YYYY-MM-DD)", type: "date" },
  { key: "followUpComment", label: "Follow Up Comment", wrap: true },
  { key: "createdAt",       label: "Created At", type: "date", exportOnly: true },
];

const CURRENCY_SYMBOLS = {
  USD: "$", EUR: "€", INR: "₹", GBP: "£", JPY: "¥",
  AUD: "A$", CAD: "C$", CHF: "CHF", MYR: "RM", AED: "د.إ",
  SGD: "S$", ZAR: "R", SAR: "﷼",
};

// Colorful pill styling per deal stage (mirrors the Rejected badge already
// on this page) so every stage in the table reads the same way.
const STAGE_BADGE_STYLES = {
  "Qualification": "bg-blue-50 text-blue-700 border-blue-200",
  "Proposal Sent-Negotiation": "bg-purple-50 text-purple-700 border-purple-200",
  "Invoice Sent": "bg-amber-50 text-amber-700 border-amber-200",
  "Closed Won": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Closed Lost": "bg-red-50 text-red-700 border-red-200",
};

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
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userCurrency = storedUser?.currency || "USD";
  const userCurrencySymbol = CURRENCY_SYMBOLS[userCurrency] || userCurrency;
  const navigate = useNavigate();
  const { tenantSlug } = useParams();
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get("status");
  const [clientTypeFilter, setClientTypeFilter] = useState("");
  const [showTodayOnly, setShowTodayOnly] = useState(false);
  const { setIsOpen, setSteps, setCurrentStep, close } = useTour();

  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Import / Export
  const importFileInputRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [users, setUsers] = useState([]);
  const [userRole, setUserRole] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [filters, setFilters] = useState({ stage: "", assignedTo: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownCoords, setDropdownCoords] = useState(null);
  const [hoveredDeal, setHoveredDeal] = useState(null);
  const [tooltipCoords, setTooltipCoords] = useState(null);
  const [tooltipTimeout, setTooltipTimeout] = useState(null);
  const [targetLinkedDealIds, setTargetLinkedDealIds] = useState(new Map());

  // Sales-only custom date-range filter — folded into the existing filter bar
  // below (no separate card). "Custom Range" toggles the two date inputs +
  // the Deal Won/Deal Lost/Pending Deal tick-box dropdown; once From, To, and
  // at least one type are set, it fetches matching deals from the backend
  // (getAll with start/end/dealType) since the default fetch no longer
  // returns previous-day Closed Won/Lost deals — those only come back into
  // view through this search.
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [dealTypeFilter, setDealTypeFilter] = useState({ won: false, lost: false, pending: false });
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [customRangeDeals, setCustomRangeDeals] = useState([]);

  // General-purpose Start/End Date filter — available to every role (unlike
  // the sales-only Custom Range panel above). Plain createdAt range, no deal
  // type involved; reuses the same backend start/end params the Custom Range
  // search already uses, just without a dealType so the backend takes its
  // plain-createdAt branch.
  const [dateFilterFrom, setDateFilterFrom] = useState("");
  const [dateFilterTo, setDateFilterTo] = useState("");
  const [dateFilterDeals, setDateFilterDeals] = useState([]);

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [dealToReject, setDealToReject] = useState(null); // { id, name }
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Rejection-reason hover tooltip (portalled so it's never clipped)
  const [hoveredRejectedDeal, setHoveredRejectedDeal] = useState(null);
  const [rejectTooltipCoords, setRejectTooltipCoords] = useState(null);
  const [rejectTooltipTimeout, setRejectTooltipTimeout] = useState(null);

  const handleRejectionHover = (deal, event) => {
    if (rejectTooltipTimeout) clearTimeout(rejectTooltipTimeout);
    const rect = event.currentTarget.getBoundingClientRect();
    setRejectTooltipCoords({ top: rect.bottom + window.scrollY + 6, left: rect.left + window.scrollX });
    setHoveredRejectedDeal(deal);
  };
  const handleRejectionLeave = () => {
    const timeout = setTimeout(() => setHoveredRejectedDeal(null), 200);
    setRejectTooltipTimeout(timeout);
  };

  const itemsPerPage = 10;

  // Tour setup on mount
  useEffect(() => {
    const userData = localStorage.getItem("user");
    let role = "";
    if (userData) {
      try {
        const user = JSON.parse(userData);
        role = user.role?.name || "";
        setCurrentUserId(user._id || user.id || "");
      } catch (err) {
        console.error("Error parsing user data:", err);
      }
    }
    setUserRole(role);
  }, [setIsOpen, setSteps]);

  useEffect(() => {
    initSocket();
  }, []);

  // This page never polls — it only ever refreshes off these socket events,
  // for both roles. Sales gets the fuller treatment (optimistic removal +
  // toast when Admin rejects one of theirs); Admin just gets a silent refetch
  // so their own list stays live too, without a "removed from your list"
  // toast that wouldn't make sense for their own action.
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !userRole) return;

    if (userRole === "Admin") {
      const refresh = () => fetchDeals();
      socket.on("deal_stage_updated", refresh);
      socket.on("deal_rejected", refresh);
      return () => {
        socket.off("deal_stage_updated", refresh);
        socket.off("deal_rejected", refresh);
      };
    }

    const rejectedHandler = ({ dealId, dealName }) => {
      setDeals((prev) => prev.filter((d) => d._id !== dealId));
      toast.info(`Deal "${dealName}" was rejected by Admin and removed from your list.`);
    };
    // Any stage change (e.g. moving to Closed Won) should refresh immediately
    // so the card's new stage — and the Deals Snapshot below — show up right
    // away instead of looking stale.
    const stageHandler = () => fetchDeals();
    socket.on("deal_rejected", rejectedHandler);
    socket.on("deal_stage_updated", stageHandler);
    return () => {
      socket.off("deal_rejected", rejectedHandler);
      socket.off("deal_stage_updated", stageHandler);
    };
  }, [userRole]);

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
      if (typeDropdownOpen && !e.target.closest(".deal-type-dropdown")) {
        setTypeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdownId, typeDropdownOpen]);

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
    } catch (err) {
      console.error("Fetch deals error:", err);
      toast.error("Failed to fetch deals");
    } finally {
      setLoading(false);
    }
  };

/* ── Fetch Custom Range Deals Function ─────────────────────── */
  // Sales-only: the default getAll fetch above excludes previous-day Closed
  // Won/Lost deals, so once From, To, and at least one type are set, hit the
  // backend again with start/end/dealType to pull in whatever matches that
  // search specifically (backend matches Won/Lost by wonAt/lostDate, Pending
  // by createdAt).
  const fetchCustomRangeDeals = async (from, to, types) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/deals/getAll`, {
        params: { start: from, end: to, dealType: types.join(",") },
        headers: { Authorization: `Bearer ${token}` },
      });
      setCustomRangeDeals(res.data || []);
    } catch (err) {
      console.error("Fetch custom range deals error:", err);
      toast.error("Failed to fetch custom range deals");
    }
  };

  useEffect(() => {
    const types = [dealTypeFilter.won && "won", dealTypeFilter.lost && "lost", dealTypeFilter.pending && "pending"].filter(Boolean);
    if (!customFrom || !customTo || types.length === 0) {
      setCustomRangeDeals([]);
      return;
    }
    fetchCustomRangeDeals(customFrom, customTo, types);
  }, [customFrom, customTo, dealTypeFilter]);

/* ── Fetch Date Range Deals Function ─────────────────────── */
  // General Start/End Date filter (any role). No dealType is sent, so the
  // backend matches plain createdAt — this also correctly reaches deals a
  // sales user's default fetch would otherwise hide (e.g. an older Closed
  // Won/Lost deal), same as the Custom Range search already does.
  const fetchDateRangeDeals = async (from, to) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/deals/getAll`, {
        params: { start: from, end: to },
        headers: { Authorization: `Bearer ${token}` },
      });
      setDateFilterDeals(res.data || []);
    } catch (err) {
      console.error("Fetch date range deals error:", err);
      toast.error("Failed to fetch deals for the selected date range");
    }
  };

  useEffect(() => {
    if (!dateFilterFrom || !dateFilterTo) {
      setDateFilterDeals([]);
      return;
    }
    fetchDateRangeDeals(dateFilterFrom, dateFilterTo);
  }, [dateFilterFrom, dateFilterTo]);

/* ── Export Deals to Excel ─────────────────────── */
  const handleExportDeals = async ({ startDate, endDate } = {}) => {
    try {
      setExporting(true);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      const { data } = await axios.get(`${API_URL}/deals/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!data?.data?.length) {
        toast.info("No data found for the selected criteria. There is nothing to export.");
        return;
      }
      await exportRowsToExcel(data.data, DEAL_COLUMNS, `deals_${new Date().toISOString().slice(0, 10)}.xlsx`, "Deals");
      toast.success(`Exported ${data.data.length} deal(s)`);
      setShowExportModal(false);
      setExportStartDate("");
      setExportEndDate("");
    } catch (err) {
      console.error("Export deals error:", err);
      toast.error("Failed to export deals");
    } finally {
      setExporting(false);
    }
  };

/* ── Download Deals Import Template ─────────────────────── */
  const handleDownloadTemplate = () => {
    downloadExcelTemplate(DEAL_COLUMNS, "deals_import_template.xlsx", "Deals Template");
  };

/* ── Import Deals from Excel ─────────────────────── */
  const handleImportButtonClick = () => {
    importFileInputRef.current?.click();
  };

  const handleImportFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      setImporting(true);
      const rows = await parseExcelFile(file, DEAL_COLUMNS);
      if (!rows.length) {
        toast.error("No rows found in the uploaded file");
        return;
      }

      const token = localStorage.getItem("token");
      const { data } = await axios.post(
        `${API_URL}/deals/bulk-import`,
        { deals: rows },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.created > 0) {
        toast.success(`Imported ${data.created} deal(s)${data.failed ? `, ${data.failed} failed` : ""}`);
      }
      if (data.failed > 0) {
        console.warn("Deal import errors:", data.errors);
        toast.error(`${data.failed} row(s) failed — see console for details`);
      }
      fetchDeals();
    } catch (err) {
      console.error("Import deals error:", err);
      toast.error(err.response?.data?.message || "Failed to import deals");
    } finally {
      setImporting(false);
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
    // Fetch target-linked deal IDs for sales users (to show target bell icon)
    const userData = localStorage.getItem("user");
    const role = userData ? (JSON.parse(userData)?.role?.name || "") : "";
    if (role !== "Admin") {
      const token = localStorage.getItem("token");
      const tenantSlugVal = window.location.pathname.split("/")[1];
      const si = import.meta.env.VITE_SI_URI || "http://localhost:5000";
      axios.get(`${si}/${tenantSlugVal}/api/targets/my`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => {
          const map = new Map();
          (r.data || []).forEach(t => (t.linkedDeals || []).forEach(d => {
            map.set(String(d._id || d), { startDate: t.startDate, endDate: t.endDate, assignedAt: t.createdAt });
          }));
          setTargetLinkedDealIds(map);
        })
        .catch(() => {});
    }
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

  // Sales-only custom range + Deal Won/Deal Lost/Pending Deal tick-box filter —
  // active as soon as From, To, and at least one type are ticked. The backend
  // (fetchCustomRangeDeals above) already applies the right date field per
  // type, so this just marks which fetched ids should be shown.
  const customRangeIds = useMemo(() => {
    if (!customFrom || !customTo || (!dealTypeFilter.won && !dealTypeFilter.lost && !dealTypeFilter.pending)) return null;
    return new Set(customRangeDeals.map((d) => d._id));
  }, [customRangeDeals, customFrom, customTo, dealTypeFilter]);

  // General Start/End Date filter — active once both dates are set, regardless of role.
  const dateFilterIds = useMemo(() => {
    if (!dateFilterFrom || !dateFilterTo) return null;
    return new Set(dateFilterDeals.map((d) => d._id));
  }, [dateFilterDeals, dateFilterFrom, dateFilterTo]);

  // While a Custom Range or Date Range search is active, the table needs to
  // include deals fetched by that search even if they're not in the default
  // `deals` list (e.g. a previous-day Closed Won deal the default fetch excludes).
  const baseDeals = useMemo(() => {
    if (!customRangeIds && !dateFilterIds) return deals;
    const merged = new Map(deals.map((d) => [d._id, d]));
    if (customRangeIds) customRangeDeals.forEach((d) => { if (!merged.has(d._id)) merged.set(d._id, d); });
    if (dateFilterIds) dateFilterDeals.forEach((d) => { if (!merged.has(d._id)) merged.set(d._id, d); });
    return Array.from(merged.values());
  }, [deals, customRangeDeals, customRangeIds, dateFilterDeals, dateFilterIds]);

  const filteredDeals = baseDeals
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
    })
    .filter((d) => {
      // Sales-only: a Closed Won deal from a previous day stays out of the
      // default view — only today's wins show at initial render. Older wins
      // are still reachable through the Custom Range search (Deal Won +
      // date range) or the general Date Range filter, which is why this
      // check steps aside once either is active.
      if (userRole === "Admin" || customRangeIds || dateFilterIds) return true;
      if (d.stage !== "Closed Won") return true;
      if (!d.wonAt) return true;
      return new Date(d.wonAt).toDateString() === new Date().toDateString();
    })
    .filter((d) => {
      // Sales-only: a Closed Lost deal from a previous day stays out of the
      // default view — only today's losses show at initial render. Older
      // losses are still reachable through the Custom Range search (Deal
      // Lost + date range) or the general Date Range filter, which is why
      // this check steps aside once either is active.
      if (userRole === "Admin" || customRangeIds || dateFilterIds) return true;
      if (d.stage !== "Closed Lost") return true;
      if (!d.lostDate) return true;
      return new Date(d.lostDate).toDateString() === new Date().toDateString();
    })
    .filter((d) => !customRangeIds || customRangeIds.has(d._id))
    .filter((d) => !dateFilterIds || dateFilterIds.has(d._id));

  // Derived from the actually-filtered list rather than the raw fetch count —
  // matters once Custom Range merges in deals the default fetch didn't return.
  useEffect(() => {
    const pages = Math.max(1, Math.ceil(filteredDeals.length / itemsPerPage));
    setTotalPages(pages);
    if (currentPage > pages) setCurrentPage(pages);
  }, [filteredDeals.length]);

  const paginatedDeals = filteredDeals.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

/* ── Handle Edit Function ─────────────────────── */
  const handleEdit = (deal) => {
    navigate(`/${tenantSlug}/createDeal`, { state: { deal } });
    setOpenDropdownId(null);
  };

/* ── Handle Reject Click / Submit Functions ─────────────────────── */
  const handleRejectClick = (deal) => {
    setDealToReject({ id: deal._id, name: deal.dealName });
    setRejectReason("");
    setShowRejectModal(true);
    setOpenDropdownId(null);
  };

  const handleRejectSubmit = async () => {
    if (!dealToReject) return;
    if (!rejectReason.trim()) return toast.error("Please enter a reason for rejecting this deal");
    setRejecting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_URL}/deals/${dealToReject.id}/reject`,
        { reason: rejectReason.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Deal rejected");
      setShowRejectModal(false);
      setDealToReject(null);
      setRejectReason("");
      fetchDeals();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reject deal");
    } finally {
      setRejecting(false);
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
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={startTour}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 tour-finish"
          >
            <Eye className="w-4 h-4" /> Take Tour
          </button>
          {userRole === "Admin" && (
            <button
              onClick={() => navigate(`/${tenantSlug}/deals/rejected`)}
              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <Ban className="w-4 h-4" /> Reject Deals
            </button>
          )}
          {userRole === "Admin" && (
            <>
              <input
                ref={importFileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportFileChange}
                className="hidden"
              />
              <button
                onClick={handleDownloadTemplate}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                title="Download an Excel template with all required columns"
              >
                <FileSpreadsheet className="w-4 h-4" /> Download Template
              </button>
              <button
                onClick={handleImportButtonClick}
                disabled={importing}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-60"
              >
                <Upload className="w-4 h-4" /> {importing ? "Importing..." : "Import"}
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                disabled={exporting}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-60"
              >
                <Download className="w-4 h-4" /> {exporting ? "Exporting..." : "Export"}
              </button>
            </>
          )}
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
      <div className="mb-4 tour-filters">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 w-full items-center">
          <select
            value={filters.stage}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, stage: e.target.value }))
            }
            className="w-full border border-gray-300 rounded-md px-4 py-2 bg-white text-sm block h-10 outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full border border-gray-300 rounded-md bg-white px-4 py-2 text-sm block h-10 outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full border border-gray-300 rounded-md bg-white px-4 py-2 text-sm block h-10 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Client Types</option>
            <option value="B2B">B2B</option>
            <option value="B2C">B2C</option>
          </select>
          {/* Today's Follow-up Button */}
          <button
            onClick={() => setShowTodayOnly(!showTodayOnly)}
            className={`w-full px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition h-10 ${
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

          {/* General Date Range filter — available to every role. Plain
              createdAt range; leaving either side blank shows all records. */}
          <div className="flex items-center gap-2 w-11/12 md:w-auto mx-auto">
            <input
              type="date"
              value={dateFilterFrom}
              onChange={(e) => setDateFilterFrom(e.target.value)}
              max={dateFilterTo || undefined}
              title="Start Date"
              className="border rounded-md px-3 py-2 bg-white text-sm"
            />
            <span className="text-gray-400 text-sm">to</span>
            <input
              type="date"
              value={dateFilterTo}
              onChange={(e) => setDateFilterTo(e.target.value)}
              min={dateFilterFrom || undefined}
              title="End Date"
              className="border rounded-md px-3 py-2 bg-white text-sm"
            />
            {(dateFilterFrom || dateFilterTo) && (
              <button
                type="button"
                onClick={() => { setDateFilterFrom(""); setDateFilterTo(""); }}
                className="text-gray-400 hover:text-gray-600"
                title="Clear date filter"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Custom Range toggle — sales person only, never on Admin's page. */}
          {userRole && userRole !== "Admin" && (
            <button
              onClick={() => {
                setShowCustomRange((v) => {
                  const next = !v;
                  if (!next) { setCustomFrom(""); setCustomTo(""); setDealTypeFilter({ won: false, lost: false, pending: false }); }
                  return next;
                });
              }}
              className={`w-full px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition h-10 ${
                showCustomRange ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Calendar size={16} />
              Custom Range
            </button>
          )}

          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Deal Name..."
            className="w-full border border-gray-300 rounded-md px-4 py-2 bg-white text-sm block h-10 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Custom Range panel — its own clearly-separated row, not mixed in
            with the filters above, so From/To/Type read as one group. */}
        {userRole && userRole !== "Admin" && showCustomRange && (
          <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-500">From</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="border rounded-md px-3 py-2 bg-white text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-500">To</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="border rounded-md px-3 py-2 bg-white text-sm"
              />
            </div>

            {/* Deal Won / Deal Lost — tick-box multi-select dropdown */}
            <div className="relative deal-type-dropdown">
              <button
                type="button"
                onClick={() => setTypeDropdownOpen((v) => !v)}
                className="border rounded-md bg-white px-4 py-2 text-sm flex items-center gap-2 min-w-[160px] justify-between"
              >
                <span className="text-gray-700">
                  {[dealTypeFilter.won && "Deal Won", dealTypeFilter.lost && "Deal Lost", dealTypeFilter.pending && "Pending Deal"].filter(Boolean).join(", ") || "Select Type"}
                </span>
                <span className="text-gray-400">▾</span>
              </button>
              {typeDropdownOpen && (
                <div className="absolute z-20 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg py-1">
                  <label className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dealTypeFilter.won}
                      onChange={(e) => setDealTypeFilter((p) => ({ ...p, won: e.target.checked }))}
                      className="accent-green-600"
                    />
                    Deal Won
                  </label>
                  <label className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dealTypeFilter.lost}
                      onChange={(e) => setDealTypeFilter((p) => ({ ...p, lost: e.target.checked }))}
                      className="accent-red-600"
                    />
                    Deal Lost
                  </label>
                  <label className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dealTypeFilter.pending}
                      onChange={(e) => setDealTypeFilter((p) => ({ ...p, pending: e.target.checked }))}
                      className="accent-blue-600"
                    />
                    Pending Deal
                  </label>
                </div>
              )}
            </div>

            {/* Clear — resets From/To/Type and closes the custom range panel */}
            <button
              type="button"
              onClick={() => {
                setCustomFrom("");
                setCustomTo("");
                setDealTypeFilter({ won: false, lost: false, pending: false });
                setShowCustomRange(false);
              }}
              className="px-4 py-2 rounded-md text-sm font-medium text-gray-600 border border-gray-300 bg-white hover:bg-gray-100"
            >
              Clear
            </button>
          </div>
        )}
      </div>
      {showTodayOnly && (
        <div className="mb-3 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1">
          <Calendar size={12} />
          Showing today's follow-up only
        </div>
      )}

      {/* Deals Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm tour-deals-table">
        <table className="min-w-full text-sm text-gray-700">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left">Deal Name</th>
              <th className="px-6 py-3 text-left">Client Type</th>
              <th className="px-6 py-3 text-left">Assigned To</th>
              <th className="px-6 py-3 text-left">Stage</th>
              <th className="px-6 py-3 text-left">Value</th>
              <th className="px-6 py-3 text-left">Value ({userCurrency})</th>
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
                const isActiveDisabled = deal.isActive === false && userRole !== "Admin";
                const isTerminal = deal.stage === "Rejected" || deal.stage === "Closed Won";

                const rejectedByName = deal.rejectedBy ? `${deal.rejectedBy.firstName || ""} ${deal.rejectedBy.lastName || ""}`.trim() : "";
                const wonByName = deal.wonBy ? `${deal.wonBy.firstName || ""} ${deal.wonBy.lastName || ""}`.trim() : "";
                const convertedByName = deal.convertedBy ? `${deal.convertedBy.firstName || ""} ${deal.convertedBy.lastName || ""}`.trim() : "";
                const isSelfRejected = deal.rejectedBy && String(deal.rejectedBy._id) === String(currentUserId);
                const isSelfWon = deal.wonBy && String(deal.wonBy._id || deal.wonBy) === String(currentUserId);
                const isSelfConverted = deal.convertedBy && String(deal.convertedBy._id || deal.convertedBy) === String(currentUserId);
                const rejectedBadgeText = isSelfRejected ? "You rejected the deal" : `${rejectedByName || "Admin"} rejected the deal`;
                const wonByIsAdmin = deal.wonBy?.role?.name === "Admin";
                const wonBadgeText = isSelfWon ? "You closed deal won" : wonByIsAdmin ? `Admin ${wonByName || "—"} won the deal` : `${wonByName || "Someone"} closed deal won`;
                const convertedByIsAdmin = deal.convertedBy?.role?.name === "Admin";
                const convertedBadgeText = isSelfConverted ? "You converted lead to deal" : convertedByIsAdmin ? `Admin ${convertedByName || "—"} converted lead to deal` : `${convertedByName || "Someone"} converted lead to deal`;

                return (
                  <tr
                    key={deal._id}
                    title={isActiveDisabled ? "Disabled — pending admin reassignment" : undefined}
                    className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} ${
                      isActiveDisabled ? "opacity-50 grayscale pointer-events-none select-none"
                      : isTerminal ? "pointer-events-none select-none"
                      : ""
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDealNameClick(deal._id)}
                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium tour-deal-name"
                        >
                          {deal.dealName || "-"}
                        </button>
                        {deal.stage === "Rejected" ? (
                          <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full border border-red-200 pointer-events-auto">
                            {rejectedBadgeText}
                          </span>
                        ) : deal.stage === "Closed Won" ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200 pointer-events-auto">
                            {wonBadgeText}
                          </span>
                        ) : deal.convertedBy ? (
                          <span className="text-[10px] bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded-full border border-orange-200 pointer-events-auto">
                            {convertedBadgeText}
                          </span>
                        ) : isActiveDisabled ? (
                          <span className="text-[9px] bg-gray-200 text-gray-600 font-bold px-1.5 py-0.5 rounded-full uppercase" title="Overdue — pending admin reassignment">
                            Pending Reassignment
                          </span>
                        ) : null}
                        {/* Follow-up bell (only when not target-linked to avoid double bell) */}
                        {hasFollowUp && !targetLinkedDealIds.has(String(deal._id)) && (
                          <div
                            className="relative inline-flex cursor-pointer"
                            onMouseEnter={(e) => handleBellHover(deal, e)}
                            onMouseLeave={handleTooltipLeave}
                          >
                            <Bell
                              size={16}
                              className={`${isToday ? "text-orange-500 animate-pulse" : isOverdue ? "text-red-400" : "text-purple-400"} hover:scale-110 transition-transform`}
                            />
                          </div>
                        )}
                        {/* Target bell — shown when deal is linked to a target */}
                        {targetLinkedDealIds.has(String(deal._id)) && (() => {
                          const tInfo = targetLinkedDealIds.get(String(deal._id));
                          const fmtD = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
                          const fmtT = (d) => d ? new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "";
                          return (
                            <div className="group relative inline-flex cursor-default">
                              <Bell size={16} className="text-orange-500 animate-pulse drop-shadow-sm" />
                              <div className="absolute top-full left-0 mt-1.5 hidden group-hover:flex flex-col min-w-[200px] shadow-xl z-50 pointer-events-none" style={{borderRadius:"10px", overflow:"hidden", border:"1px solid #fed7aa"}}>
                                <div style={{background:"#f97316"}} className="px-3 py-2">
                                  <span className="text-white text-[11px] font-bold">🎯 This is your target</span>
                                </div>
                                <div className="bg-white px-3 py-2 space-y-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-gray-400 w-16 shrink-0">Assigned</span>
                                    <span className="text-[10px] font-semibold text-gray-700">{fmtD(tInfo?.assignedAt)} {fmtT(tInfo?.assignedAt)}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-gray-400 w-16 shrink-0">Due Date</span>
                                    <span className="text-[10px] font-semibold text-orange-600">{fmtD(tInfo?.endDate)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4">{deal.clientType || "-"}</td>
                    <td className="px-6 py-4">
                      {deal.assignedTo
                        ? `${deal.assignedTo.firstName} ${deal.assignedTo.lastName}`
                        : "-"}
                    </td>
                    <td className="px-6 py-4">
                      {deal.stage === "Rejected" ? (
                        <span
                          className="text-xs px-3 py-1.5 rounded-full font-medium bg-red-50 text-red-700 border border-red-200 cursor-default pointer-events-auto inline-block"
                          onMouseEnter={(e) => deal.rejectionReason && handleRejectionHover(deal, e)}
                          onMouseLeave={handleRejectionLeave}
                        >
                          Rejected
                        </span>
                      ) : deal.stage ? (
                        <span
                          className={`text-xs px-3 py-1.5 rounded-full font-medium border cursor-default inline-block ${
                            STAGE_BADGE_STYLES[deal.stage] || "bg-gray-50 text-gray-700 border-gray-200"
                          }`}
                        >
                          {deal.stage}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {formatCurrencyValue(deal.value)}
                    </td>
                    <td className="px-6 py-4">
                      {deal.preferredCurrency === userCurrency && deal.preferredCurrencyValue != null
                        ? `${userCurrencySymbol} ${Number(deal.preferredCurrencyValue).toLocaleString("en-IN")}`
                        : "-"}
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
                  colSpan={7}
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
            {(() => {
              const activeDeal = baseDeals.find((d) => d._id === openDropdownId);
              const activeIsTerminal = activeDeal?.stage === "Rejected" || activeDeal?.stage === "Closed Won";
              const editDisabled = (activeDeal?.isActive === false && userRole !== "Admin") || activeIsTerminal;
              return (
                <>
                  <button
                    onClick={() => !editDisabled && handleEdit(activeDeal)}
                    disabled={editDisabled}
                    title={editDisabled ? "Disabled pending admin reassignment" : undefined}
                    className={`flex items-center px-3 py-2 w-full text-left ${editDisabled ? "text-gray-300 cursor-not-allowed" : "hover:bg-gray-100"}`}
                  >
                    <Edit size={16} className="mr-2" /> Edit
                  </button>
                  {userRole === "Admin" && !activeIsTerminal && (
                    <button
                      onClick={() => handleRejectClick(activeDeal)}
                      className="flex items-center px-3 py-2 hover:bg-gray-100 w-full text-left text-red-600"
                    >
                      <Ban size={16} className="mr-2" /> Reject
                    </button>
                  )}
                </>
              );
            })()}
          </div>,
          document.body
        )}

      {/* Rejection reason tooltip — portalled so it's never clipped */}
      {hoveredRejectedDeal?.rejectionReason && rejectTooltipCoords && ReactDOM.createPortal(
        <div
          className="fixed z-50 w-80 max-h-72 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl p-3"
          style={{ top: rejectTooltipCoords.top, left: rejectTooltipCoords.left }}
          onMouseEnter={() => { if (rejectTooltipTimeout) clearTimeout(rejectTooltipTimeout); }}
          onMouseLeave={handleRejectionLeave}
        >
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Rejection Reason</p>
            {hoveredRejectedDeal.rejectedAt && (
              <p className="text-[10px] text-gray-400 font-medium shrink-0 ml-2">
                {new Date(hoveredRejectedDeal.rejectedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                {" "}
                {new Date(hoveredRejectedDeal.rejectedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>
          <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{hoveredRejectedDeal.rejectionReason}</p>
        </div>,
        document.body
      )}

      {/* Export Modal */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-800">
              <Download className="w-5 h-5" />
              Export Deals
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-gray-500 mb-3">
            Optionally filter by date range. Leave both blank to export all deals.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={exportStartDate}
                onChange={(e) => setExportStartDate(e.target.value)}
                max={exportEndDate || undefined}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={exportEndDate}
                onChange={(e) => setExportEndDate(e.target.value)}
                min={exportStartDate || undefined}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowExportModal(false);
                setExportStartDate("");
                setExportEndDate("");
              }}
              className="px-4 py-2 rounded-lg border hover:bg-gray-100 text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={() => handleExportDeals({ startDate: exportStartDate, endDate: exportEndDate })}
              disabled={exporting}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 disabled:opacity-60"
            >
              <Download className="w-4 h-4" />
              {exporting ? "Exporting..." : "Export"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Ban className="w-5 h-5" />
              Reject Deal
            </DialogTitle>
          </DialogHeader>

          <p className="mb-3 text-gray-700">
            Rejecting <span className="font-semibold">{dealToReject?.name}</span>. It will move to
            the Reject Deals list and disappear from the sales person's account. Please give a reason.
          </p>

          <textarea
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejecting this deal..."
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none mb-4"
          />

          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowRejectModal(false);
                setDealToReject(null);
                setRejectReason("");
              }}
              className="px-4 py-2 rounded-lg border hover:bg-gray-100 text-gray-700"
            >
              Cancel
            </button>

            <button
              onClick={handleRejectSubmit}
              disabled={rejecting || !rejectReason.trim()}
              className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center gap-2 disabled:opacity-60"
            >
              <Ban className="w-4 h-4" />
              {rejecting ? "Rejecting..." : "Reject Deal"}
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