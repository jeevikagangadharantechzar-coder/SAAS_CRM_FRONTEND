import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import { TourProvider, useTour } from "@reactour/tour";
import { useTranslation } from "react-i18next";

import {
  MoreVertical,
  Ban,
  Edit,
  Handshake,
  Search,
  Plus,
  Eye,
  Calendar,
  Bell,
  MessageSquarePlus,
  Upload,
  Trash2,
  Loader2,
  Upload,
  Download,
  FileSpreadsheet,
} from "lucide-react";

import { initSocket, getSocket } from "../../utils/socket";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { exportRowsToExcel, downloadExcelTemplate, parseExcelFile } from "../../utils/excelImportExport";

const API_URL = import.meta.env.VITE_API_URL;

// Kept in sync with the backend's extension maps (middlewares/upload.js,
// routes/files.routes.js). Browsers don't reliably report audio mimetypes for
// every extension — e.g. a WhatsApp "*.mpeg" voice note comes back as
// "video/mpeg" — so extension is used as the source of truth for voice notes.
const AUDIO_EXT_MIME_MAP = {
  mp3: "audio/mpeg", mpeg: "audio/mpeg", mpga: "audio/mpeg",
  wav: "audio/wav", ogg: "audio/ogg", webm: "audio/webm",
  m4a: "audio/mp4", mp4: "audio/mp4", aac: "audio/aac",
  opus: "audio/opus", amr: "audio/amr", caf: "audio/x-caf", "3gp": "audio/3gpp",
};

const guessAudioMime = (filename = "") => {
  const ext = filename.split(".").pop()?.toLowerCase();
  return AUDIO_EXT_MIME_MAP[ext] || "application/octet-stream";
};

/* ── Import/Export column definitions — shared between Export, Template,
   and Import so a downloaded template always re-uploads successfully. ── */
// Mirrors the Create Lead form's own field groups/order (CreateLeads.jsx
// `fieldGroups`) exactly, so the template reads like the form itself.
const LEAD_COLUMNS = [
  // Basic Information
  { key: "leadName",     label: "Lead Name" },
  { key: "companyName",  label: "Company Name" },
  { key: "phoneNumber",  label: "Phone Number" },
  { key: "email",        label: "Email" },
  { key: "address",      label: "Address", wrap: true },
  { key: "country",      label: "Country" },
  // Business Details
  { key: "clientType",   label: "Client Type (B2B/B2C)" },
  { key: "industry",     label: "Industry" },
  { key: "source",       label: "Source" },
  { key: "requirement",  label: "Requirement", wrap: true },
  // Lead Management
  { key: "status",       label: "Status" },
  { key: "assignTo",     label: "Assign To (Email)" },
  { key: "followUpDate", label: "Follow-up Date (YYYY-MM-DD)", type: "date" },
  // Additional Information
  { key: "notes",        label: "Notes", wrap: true },
  // Read-only, export only
  { key: "createdAt",    label: "Created At", type: "date", exportOnly: true },
];

/* ── Tour Steps (i18n-aware) ─────────────────────── */
const getTourSteps = (t) => [
  { selector: ".tour-lead-header",   content: t("leads.tour.welcome") },
  { selector: ".tour-create-lead",   content: t("leads.tour.createLead") },
  { selector: ".tour-search",        content: t("leads.tour.search") },
  { selector: ".tour-filters",       content: t("leads.tour.filters") },
  { selector: ".tour-lead-table",    content: t("leads.tour.table") },
  { selector: ".tour-lead-actions",  content: t("leads.tour.actions") },
  { selector: ".tour-finish",        content: t("leads.tour.finish") },
];

/* ── Follow-up voice note player ─────────────────────── */
// Fetches the recording through the authenticated /files/preview endpoint
// (a plain <audio src> can't carry the Authorization header) and hands the
// browser a blob URL to play.
function FollowUpAudioPlayer({ audioPath }) {
  const [status, setStatus] = useState("loading"); // loading | done | error
  const [src, setSrc] = useState(null);

  useEffect(() => {
    const ctrl = new AbortController();
    let live = true;
    setStatus("loading");

    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${API_URL}/files/preview?filePath=${encodeURIComponent(audioPath)}`,
          { headers: { Authorization: `Bearer ${token}` }, signal: ctrl.signal }
        );
        if (!res.ok) throw new Error("Failed to load recording");
        const mime = res.headers.get("Content-Type") || "application/octet-stream";
        const buf = await res.arrayBuffer();
        if (!live) return;
        setSrc(URL.createObjectURL(new Blob([buf], { type: mime })));
        setStatus("done");
      } catch (err) {
        if (!live || err.name === "AbortError") return;
        setStatus("error");
      }
    })();

    return () => {
      live = false;
      ctrl.abort();
      setSrc((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [audioPath]);

  if (status === "loading") {
    return (
      <p className="text-xs text-gray-400 flex items-center gap-1 mt-2">
        <Loader2 className="w-3 h-3 animate-spin" /> Loading recording…
      </p>
    );
  }
  if (status === "error") {
    return <p className="text-xs text-red-400 mt-2">Could not load recording</p>;
  }
  return <audio controls src={src} className="w-full mt-2 h-9" />;
}

/* ── Lead Table Component ─────────────────────── */
function LeadTableComponent() {
  const navigate = useNavigate();
  const { tenantSlug } = useParams();
  const location = useLocation();
  const { setIsOpen } = useTour();
  const { t } = useTranslation();

  const [leads, setLeads] = useState([]);

  // Import / Export
  const importFileInputRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [leadToReject, setLeadToReject] = useState(null); // { id, name }
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Rejection-reason hover tooltip (portalled so it never gets clipped by the
  // table's horizontal-scroll container)
  const [hoveredRejectedLead, setHoveredRejectedLead] = useState(null);
  const [rejectTooltipCoords, setRejectTooltipCoords] = useState(null);
  const [rejectTooltipTimeout, setRejectTooltipTimeout] = useState(null);

  const handleRejectionHover = (lead, event) => {
    if (rejectTooltipTimeout) clearTimeout(rejectTooltipTimeout);
    const rect = event.currentTarget.getBoundingClientRect();
    setRejectTooltipCoords({ top: rect.bottom + window.scrollY + 6, left: rect.left + window.scrollX });
    setHoveredRejectedLead(lead);
  };

  const handleRejectionLeave = () => {
    const timeout = setTimeout(() => setHoveredRejectedLead(null), 200);
    setRejectTooltipTimeout(timeout);
  };

  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLeads, setTotalLeads] = useState(0);
  const itemsPerPage = 10;

  const [menuOpen, setMenuOpen] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 1 });

  const [userRole, setUserRole] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [targetLinkedLeadIds, setTargetLinkedLeadIds] = useState(new Map());

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [clientTypeFilter, setClientTypeFilter] = useState("");
  const [followUpFilter, setFollowUpFilter] = useState(
    location.state?.followUpFilter === "missed" ? "missed" : "all"
  );
  
  // Store users with their IDs for assignee filter
  const [usersList, setUsersList] = useState([]);

  // Convert Deal Modal
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [converting, setConverting] = useState(false);

  const [dealData, setDealData] = useState({
    value: 0,
    currency: "USD",
    notes: "",
    stage: "Qualification",
  });

  // Inline follow-up editor state
  const dateInputRefs = useRef({});
  const [editingFollowUpId, setEditingFollowUpId] = useState(null);
  const [followUpSavingId, setFollowUpSavingId] = useState(null);

  // Add Follow-up Note modal
  const [addNoteModalOpen, setAddNoteModalOpen] = useState(false);
  const [noteLead, setNoteLead] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Voice note upload for follow-up note
  const [audioFile, setAudioFile] = useState(null);
  const [audioFileUrl, setAudioFileUrl] = useState(null);
  const [audioFileError, setAudioFileError] = useState("");

  // Follow-up History modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyLead, setHistoryLead] = useState(null);

  const startTour = () => setIsOpen(true);

  // user role
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      setUserRole(user.role?.name || "");
      setCurrentUserId(user._id || user.id || "");
    }
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

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, sourceFilter, assigneeFilter, followUpFilter]);

  // currencies
  const allowedCurrencies = [
    { code: "USD", symbol: "$", name: "US Dollar" },
    { code: "EUR", symbol: "€", name: "Euro" },
    { code: "INR", symbol: "₹", name: "Indian Rupee" },
    { code: "GBP", symbol: "£", name: "British Pound" },
    { code: "JPY", symbol: "¥", name: "Japanese Yen" },
    { code: "AUD", symbol: "A$", name: "Australian Dollar" },
    { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
    { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
    { code: "MYR", symbol: "RM", name: "Malaysian Ringgit" },
    { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
    { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
    { code: "ZAR", symbol: "R", name: "South African Rand" },
    { code: "SAR", symbol: "﷼", name: "Saudi Riyal" },
  ];

  useEffect(() => {
    initSocket();
  }, []);

  // When Admin rejects a lead, it disappears from the sales person's own
  // account immediately instead of waiting for their next list refresh.
  useEffect(() => {
    if (userRole === "Admin") return;
    const socket = getSocket();
    if (!socket) return;
    const handler = ({ leadId, leadName }) => {
      setLeads((prev) => prev.filter((l) => l._id !== leadId));
      toast.info(`Lead "${leadName}" was rejected by Admin and removed from your list.`);
    };
    socket.on("lead_rejected", handler);
    return () => socket.off("lead_rejected", handler);
  }, [userRole]);

  // When Admin converts one of the sales person's leads to a deal, it disappears
  // from their own account immediately too — the read-only copy is Admin-only.
  // (Also fires for the sales person's own conversions — harmless no-op there
  // since handleConvertDeal already removed it optimistically.)
  useEffect(() => {
    if (userRole === "Admin") return;
    const socket = getSocket();
    if (!socket) return;
    const handler = ({ leadId }) => {
      setLeads((prev) => prev.filter((l) => l._id !== leadId));
    };
    socket.on("lead_converted", handler);
    return () => socket.off("lead_converted", handler);
  }, [userRole]);

  // fetch leads
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
      });

    // Search filter - make sure it's properly trimmed
    if (debouncedSearch && debouncedSearch.trim()) {
      params.append("search", debouncedSearch.trim());
    }
    
    // Status filter - send only if not empty
    if (statusFilter && statusFilter !== "") {
      params.append("status", statusFilter);
    }
    
    // Source filter - send only if not empty
    if (sourceFilter && sourceFilter !== "") {
      params.append("source", sourceFilter);
    }

    // client filter 
    if (clientTypeFilter && clientTypeFilter !== "") {
      params.append("clientType", clientTypeFilter);
    }

    // Assignee filter - send the user ID directly
    if (assigneeFilter && assigneeFilter !== "") {
      params.append("assignee", assigneeFilter);
    }

    // Follow-up filter
    if (followUpFilter === "missed" || followUpFilter === "completed") {
      params.append("followUpStatus", followUpFilter);
    }

      console.log("Fetching leads with params:", Object.fromEntries(params));

      const { data } = await axios.get(
        `${API_URL}/leads/getAllLead?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const isNew = data && !Array.isArray(data) && Array.isArray(data.leads);
      const leadsArr = isNew ? data.leads : (Array.isArray(data) ? data : []);
      const total = isNew ? data.totalLeads : leadsArr.length;
      const pages = isNew ? data.totalPages : Math.ceil(leadsArr.length / itemsPerPage);

      setLeads(leadsArr);
      setTotalLeads(total);
      setTotalPages(pages);

    } catch (err) {
      console.error("Fetch leads error:", err);
      toast.error(t("leads.toast.fetchFailed"));
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, statusFilter, sourceFilter, assigneeFilter, clientTypeFilter,followUpFilter, itemsPerPage, t]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

/* ── Export Leads to Excel ─────────────────────── */
  const handleExportLeads = async ({ startDate, endDate } = {}) => {
    try {
      setExporting(true);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      const { data } = await axios.get(`${API_URL}/leads/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!data?.data?.length) {
        toast.info("No data found for the selected criteria. There is nothing to export.");
        return;
      }
      await exportRowsToExcel(data.data, LEAD_COLUMNS, `leads_${new Date().toISOString().slice(0, 10)}.xlsx`, "Leads");
      toast.success(`Exported ${data.data.length} lead(s)`);
      setShowExportModal(false);
      setExportStartDate("");
      setExportEndDate("");
    } catch (err) {
      console.error("Export leads error:", err);
      toast.error("Failed to export leads");
    } finally {
      setExporting(false);
    }
  };

/* ── Download Leads Import Template ─────────────────────── */
  const handleDownloadTemplate = () => {
    downloadExcelTemplate(LEAD_COLUMNS, "leads_import_template.xlsx", "Leads Template");
  };

/* ── Import Leads from Excel ─────────────────────── */
  const handleImportButtonClick = () => {
    importFileInputRef.current?.click();
  };

  const handleImportFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    try {
      setImporting(true);
      const rows = await parseExcelFile(file, LEAD_COLUMNS);
      if (!rows.length) {
        toast.error("No rows found in the uploaded file");
        return;
      }

      const token = localStorage.getItem("token");
      const { data } = await axios.post(
        `${API_URL}/leads/bulk-import`,
        { leads: rows },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.created > 0) {
        toast.success(`Imported ${data.created} lead(s)${data.failed ? `, ${data.failed} failed` : ""}`);
      }
      if (data.failed > 0) {
        console.warn("Lead import errors:", data.errors);
        toast.error(`${data.failed} row(s) failed — see console for details`);
      }
      fetchLeads();
    } catch (err) {
      console.error("Import leads error:", err);
      toast.error(err.response?.data?.message || "Failed to import leads");
    } finally {
      setImporting(false);
    }
  };

  // Fetch target-linked lead IDs for sales users
  useEffect(() => {
    const userData = localStorage.getItem("user");
    const role = userData ? (JSON.parse(userData)?.role?.name || "") : "";
    if (role === "Admin") return;
    const token = localStorage.getItem("token");
    const tenantSlugVal = window.location.pathname.split("/")[1];
    const si = import.meta.env.VITE_SI_URI || "http://localhost:5000";
    axios.get(`${si}/${tenantSlugVal}/api/targets/my`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        const map = new Map();
        (r.data || []).forEach(t => (t.linkedLeads || []).forEach(l => {
          map.set(String(l._id || l), { startDate: t.startDate, endDate: t.endDate, assignedAt: t.createdAt });
        }));
        setTargetLinkedLeadIds(map);
      })
      .catch(() => {});
  }, []);

  // Pagination helpers
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

  const handleMenuToggle = (leadId, e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const menuHeight = 120;
    const viewportHeight = window.innerHeight;

    let top = rect.bottom + window.scrollY + 4;
    let left = rect.right + window.scrollX - 160;

    if (rect.bottom + menuHeight > viewportHeight) {
      top = rect.top + window.scrollY - menuHeight - 4;
    }

    setMenuPosition({ top, left });
    setMenuOpen(menuOpen === leadId ? null : leadId);
  };

  const handleEdit = (leadId) => {
    navigate(`/${tenantSlug}/createleads?id=${leadId}`);
    setMenuOpen(null);
  };

  const handleRejectClick = (lead) => {
    setLeadToReject({ id: lead._id, name: lead.leadName });
    setRejectReason("");
    setShowRejectModal(true);
    setMenuOpen(null);
  };

  const handleRejectSubmit = async () => {
    if (!leadToReject) return;
    if (!rejectReason.trim()) return toast.error("Please enter a reason for rejecting this lead");
    setRejecting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_URL}/leads/${leadToReject.id}/reject`,
        { reason: rejectReason.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Lead rejected");
      setShowRejectModal(false);
      setLeadToReject(null);
      setRejectReason("");
      fetchLeads();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reject lead");
    } finally {
      setRejecting(false);
    }
  };

  // Convert Modal
  const openConvertModal = (lead) => {
    setSelectedLead(lead);
    setDealData({
      value: lead.value || 0,
      currency: lead.currency || "USD",
      notes: lead.notes || "",
      stage: "Qualification",
    });
    setConvertModalOpen(true);
    setMenuOpen(null);
  };

  const handleDealFieldChange = (field, value) => {
    setDealData((prev) => ({ ...prev, [field]: value }));
  };

  const handleConvertDeal = async () => {
    if (!selectedLead) return;

    try {
      setConverting(true);
      const token = localStorage.getItem("token");
      const toastId = toast.loading(t("leads.toast.convertingLoad"));

      const response = await axios.patch(
        `${API_URL}/leads/${selectedLead._id}/convert`,
        { ...dealData },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.update(toastId, {
        render: response.data.message || t("leads.toast.convertingLoad"),
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });

      // The lead always keeps a "Converted" copy server-side, but only Admin's
      // own account can see it — the sales person never sees a copy of their
      // own (or anyone else's) conversions.
      if (userRole === "Admin") {
        setLeads((prev) => prev.map((l) => (l._id === selectedLead._id ? { ...l, status: "Converted" } : l)));
      } else {
        setLeads((prev) => prev.filter((l) => l._id !== selectedLead._id));
      }
      setConvertModalOpen(false);
      setSelectedLead(null);
      fetchLeads();

    } catch (err) {
      toast.dismiss();
      console.error("Conversion error:", err);
      toast.error(err.response?.data?.message || t("leads.toast.convertFailed"));
    } finally {
      setConverting(false);
    }
  };

  // A follow-up is "missed" only once its calendar day has fully passed
  // (today's follow-ups are never "missed" yet), the lead is still open,
  // and no follow-up note has been logged for it yet.
  const isFollowUpMissed = (lead) => {
    if (!lead.followUpDate) return false;
    if (lead.status === "Converted" || lead.status === "Junk") return false;
    const followUpDay = new Date(lead.followUpDate);
    followUpDay.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isPastDue = followUpDay < today;
    const hasNotes  = Array.isArray(lead.followUpNotes) && lead.followUpNotes.length > 0;
    return isPastDue && !hasNotes;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const toDateInputValue = (dateString) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .split("T")[0];
  };

  const updateFollowUpDateInline = async (leadId, newDate) => {
    if (!newDate) return;

    try {
      setFollowUpSavingId(leadId);
      const token = localStorage.getItem("token");

      await axios.patch(
        `${API_URL}/leads/${leadId}/followup`,
        { followUpDate: newDate },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setLeads((prev) =>
        prev.map((l) => (l._id === leadId ? { ...l, followUpDate: newDate } : l))
      );

      toast.success(t("leads.toast.followUpSuccess"));
    } catch (err) {
      console.error("Follow-up update error:", err);
      toast.error(err.response?.data?.message || t("leads.toast.followUpFailed"));
    } finally {
      setFollowUpSavingId(null);
      setEditingFollowUpId(null);
    }
  };

  const openFollowUpPicker = (leadId) => {
    setEditingFollowUpId(leadId);

    setTimeout(() => {
      const el = dateInputRefs.current[leadId];
      if (!el) return;

      el.focus();
      el.click();

      if (typeof el.showPicker === "function") {
        el.showPicker();
      }
    }, 0);
  };

  const discardAudioFile = () => {
    setAudioFileUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setAudioFile(null);
    setAudioFileError("");
  };

  const openAddNoteModal = (lead) => {
    setNoteLead(lead);
    setNoteText("");
    discardAudioFile();
    setAddNoteModalOpen(true);
    setMenuOpen(null);
  };

  const closeAddNoteModal = () => {
    setAddNoteModalOpen(false);
    setNoteLead(null);
    setNoteText("");
    discardAudioFile();
  };

  const handleAudioFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setAudioFileError("");
    const mime = guessAudioMime(file.name);
    if (!file.type.startsWith("audio/") && mime === "application/octet-stream") {
      setAudioFileError("Please choose an audio file");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setAudioFileError("Audio file must be under 20MB");
      return;
    }

    setAudioFileUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      // Re-wrap with the extension-derived mime so the preview player isn't
      // stuck with a wrong/generic type the browser guessed from the name.
      return URL.createObjectURL(new Blob([file], { type: mime || file.type }));
    });
    setAudioFile(file);
  };

  const handleAddFollowUpNote = async () => {
    if (!noteText.trim() || !noteLead) return;

    try {
      setSavingNote(true);
      const token = localStorage.getItem("token");

      let payload;
      if (audioFile) {
        payload = new FormData();
        payload.append("note", noteText.trim());
        payload.append("audio", audioFile);
      } else {
        payload = { note: noteText.trim() };
      }

      const res = await axios.post(
        `${API_URL}/leads/${noteLead._id}/followup-notes`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setLeads((prev) =>
        prev.map((l) =>
          l._id === noteLead._id ? { ...l, followUpNotes: res.data.lead.followUpNotes } : l
        )
      );

      toast.success("Follow-up note added");
      closeAddNoteModal();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add follow-up note");
    } finally {
      setSavingNote(false);
    }
  };

  const openHistoryModal = (lead) => {
    setHistoryLead(lead);
    setHistoryModalOpen(true);
  };

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      const token = localStorage.getItem("token");

      const res = await axios.patch(
        `${API_URL}/leads/${leadId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.status === 200) {
        setLeads((prev) =>
          prev.map((l) => (l._id === leadId ? { ...l, status: newStatus } : l))
        );
        toast.success(t("leads.toast.statusSuccess"));
      }
    } catch (error) {
      toast.error(t("leads.toast.statusFailed"));
    }
  };

  const statusClasses = {
    Hot: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
    Warm: "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100",
    Cold: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
    Junk: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
    Converted: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
  };

  const getStatusSelectClass = (status) => {
    return `w-full px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 ${
      statusClasses[status] ||
      "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
    } ${
      status === "Hot"
        ? "focus:ring-red-300"
        : status === "Warm"
        ? "focus:ring-yellow-300"
        : status === "Cold"
        ? "focus:ring-blue-300"
        : status === "Junk"
        ? "focus:ring-gray-300"
        : "focus:ring-green-300"
    }`;
  };

  useEffect(() => {
    const handleClickOutside = () => setMenuOpen(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const firstItem = totalLeads === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const lastItem = Math.min(currentPage * itemsPerPage, totalLeads);

  if (loading && leads.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        newestOnTop
        closeOnClick
        draggable
        pauseOnHover
        theme="light"
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div className="tour-lead-header">
          <h2 className="text-2xl font-bold text-gray-800">{t("leads.title")}</h2>
          <p className="text-sm text-gray-500 mt-1">{t("leads.subtitle")}</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={startTour}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 tour-finish"
          >
            <Eye className="w-4 h-4" /> {t("leads.buttons.takeTour")}
          </button>

          {userRole === "Admin" && (
            <button
              onClick={() => navigate(`/${tenantSlug}/leads/rejected`)}
              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <Ban className="w-4 h-4" /> Reject Leads
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
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow flex items-center gap-2 tour-create-lead"
              onClick={() => navigate(`/${tenantSlug}/createleads`)}
            >
              <Plus className="w-4 h-4" /> {t("leads.buttons.createLead")}
            </button>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 tour-filters">
          <div className="relative w-full tour-search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={t("leads.filters.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {userRole === "Admin" && (
            <div>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">{t("leads.filters.allAssignees")}</option>
                {usersList.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">{t("leads.filters.allStatus")}</option>
              <option value="Hot">{t("leads.status.hot")}</option>
              <option value="Warm">{t("leads.status.warm")}</option>
              <option value="Cold">{t("leads.status.cold")}</option>
              <option value="Junk">{t("leads.status.junk")}</option>
              <option value="Converted">{t("leads.status.converted")}</option>
            </select>
          </div>

          <div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">{t("leads.filters.allSources")}</option>
              <option value="Website">{t("leads.source.website")}</option>
              <option value="Referral">{t("leads.source.referral")}</option>
              <option value="Social Media">{t("leads.source.socialMedia")}</option>
              <option value="Email">{t("leads.source.email")}</option>
              <option value="Cold Call">{t("leads.source.coldCall")}</option>
              <option value="Other">{t("leads.source.other")}</option>
            </select>
          </div>

          <div>
            <select
              value={clientTypeFilter}
              onChange={(e) => setClientTypeFilter(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">{t("leads.filters.allClientTypes")}</option>
              <option value="B2B">B2B</option>
              <option value="B2C">B2C</option>
            </select>
          </div>

          <div>
            <select
              value={followUpFilter}
              onChange={(e) => setFollowUpFilter(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">All Follow-ups</option>
              <option value="completed">Completed Follow-ups</option>
              <option value="missed">Missed Follow-ups</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto tour-lead-table">
        <table className="min-w-max w-full table-auto divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="whitespace-nowrap">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t("leads.table.lead")}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t("leads.table.contact")}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t("leads.table.company")}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t("leads.table.clientType")}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t("leads.table.country")}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t("leads.table.source")}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t("leads.table.status")}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t("leads.table.assignee")}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t("leads.table.created")}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t("leads.table.followUp")}</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                {t("leads.table.history")}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tour-lead-actions">{t("leads.table.actions")}</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {leads.length > 0 ? (
              leads.map((lead, idx) => {
                const isTerminal = lead.status === "Rejected" || lead.status === "Converted";
                const isActiveDisabled = lead.isActive === false && userRole !== "Admin";
                const isDisabled = isTerminal || isActiveDisabled;
                const rejectedByName = lead.rejectedBy ? `${lead.rejectedBy.firstName || ""} ${lead.rejectedBy.lastName || ""}`.trim() : "";
                const convertedByName = lead.convertedBy ? `${lead.convertedBy.firstName || ""} ${lead.convertedBy.lastName || ""}`.trim() : "";
                const isSelfRejected = lead.rejectedBy && String(lead.rejectedBy._id) === String(currentUserId);
                const isSelfConverted = lead.convertedBy && String(lead.convertedBy._id) === String(currentUserId);
                const rejectedBadgeText = isSelfRejected ? "You rejected the lead" : `${rejectedByName || "Admin"} rejected the lead`;
                const convertedBadgeText = isSelfConverted ? "You converted lead to deal" : `${convertedByName || "Someone"} converted lead to deal`;
                return (
                <tr
                  key={lead._id}
                  title={isActiveDisabled ? "Disabled — pending admin reassignment" : undefined}
                  className={`hover:bg-gray-50 ${
                    idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                  } whitespace-nowrap ${
                    isActiveDisabled ? "opacity-50 grayscale pointer-events-none select-none"
                    : isTerminal ? "pointer-events-none select-none"
                    : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                        {lead.leadName?.charAt(0) || "L"}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span
                            onClick={() => navigate(`/${tenantSlug}/leads/view/${lead._id}`)}
                            className="font-medium text-blue-600 text-sm cursor-pointer hover:underline"
                          >
                            {lead.leadName || t("leads.table.unnamedLead")}
                          </span>
                          {lead.status === "Rejected" ? (
                            <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full border border-red-200 pointer-events-auto">
                              {rejectedBadgeText}
                            </span>
                          ) : lead.status === "Converted" ? (
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200 pointer-events-auto">
                              {convertedBadgeText}
                            </span>
                          ) : isActiveDisabled ? (
                            <span className="text-[9px] bg-gray-200 text-gray-600 font-bold px-1.5 py-0.5 rounded-full uppercase" title="Overdue — pending admin reassignment">
                              Pending Reassignment
                            </span>
                          ) : null}
                          {targetLinkedLeadIds.has(String(lead._id)) && (() => {
                            const tInfo = targetLinkedLeadIds.get(String(lead._id));
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
                        <span className="text-gray-400 text-xs">{lead.email || "-"}</span>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-700">{lead.phoneNumber || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{lead.companyName || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{lead.clientType || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{lead.country || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{lead.source || "-"}</td>

                  <td className="px-4 py-3">
                    {lead.status === "Rejected" ? (
                      <span
                        className="text-xs px-3 py-1.5 rounded-full font-medium bg-red-50 text-red-700 border border-red-200 cursor-default pointer-events-auto inline-block"
                        onMouseEnter={(e) => lead.rejectionReason && handleRejectionHover(lead, e)}
                        onMouseLeave={handleRejectionLeave}
                      >
                        Rejected
                      </span>
                    ) : lead.status === "Converted" ? (
                      <span className="text-xs px-3 py-1.5 rounded-full font-medium bg-green-50 text-green-700 border border-green-200">
                        Converted
                      </span>
                    ) : (
                      <select
                        value={lead.status}
                        disabled={isDisabled}
                        onChange={(e) =>
                          handleStatusChange(lead._id, e.target.value)
                        }
                        className={`${getStatusSelectClass(lead.status)} ${isDisabled ? "cursor-not-allowed opacity-70" : ""}`}
                      >
                        <option value="Hot">Hot</option>
                        <option value="Warm">Warm</option>
                        <option value="Cold">Cold</option>
                        <option value="Junk">Junk</option>
                      </select>
                    )}
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-700">
                    {lead.assignTo
                      ? typeof lead.assignTo === "object"
                        ? `${lead.assignTo.firstName} ${lead.assignTo.lastName}`
                        : t("leads.table.assignedUser")
                      : "-"}
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-700">{formatDate(lead.createdAt)}</td>

                  <td className="px-4 py-3 text-sm text-gray-700">
                    <div className="relative flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => !isDisabled && openFollowUpPicker(lead._id)}
                        className={`inline-flex items-center gap-2 px-2 py-1 rounded-md transition ${isDisabled ? "cursor-not-allowed" : "hover:bg-gray-100"}`}
                        title={isDisabled ? "Disabled pending admin reassignment" : "Click to update follow-up date"}
                        disabled={followUpSavingId === lead._id || isDisabled}
                      >
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">
                          {followUpSavingId === lead._id
                            ? t("leads.table.saving")
                            : formatDate(lead.followUpDate)}
                        </span>
                      </button>

                      {isFollowUpMissed(lead) && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-600 border border-red-200 whitespace-nowrap">
                          Missed
                        </span>
                      )}

                      {editingFollowUpId === lead._id && (
                        <input
                          ref={(el) => (dateInputRefs.current[lead._id] = el)}
                          type="date"
                          defaultValue={toDateInputValue(lead.followUpDate)}
                          className="absolute left-0 top-0 w-0 h-0 opacity-0"
                          onChange={(e) => updateFollowUpDateInline(lead._id, e.target.value)}
                          onBlur={() => setEditingFollowUpId(null)}
                        />
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => openHistoryModal(lead)}
                      className={`inline-flex items-center justify-center p-2 rounded-lg hover:bg-gray-100 transition-colors ${
                        isFollowUpMissed(lead) ? "text-red-500 hover:text-red-600" : "text-gray-500 hover:text-blue-600"
                      }`}
                      title={isFollowUpMissed(lead) ? "Missed follow-up — view history" : "View follow-up history"}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>

                  <td className="px-4 py-3 text-right relative">
                    <div className="relative inline-block text-left">
                      <button
                        className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                        onClick={(e) => handleMenuToggle(lead._id, e)}
                      >
                        <MoreVertical className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>

                    {menuOpen === lead._id && (
                      <div
                        className="fixed z-50 w-52 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
                        style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isDisabled) return;
                            handleEdit(lead._id);
                          }}
                          disabled={isDisabled}
                          className={`flex items-center w-full px-3 py-2 text-sm whitespace-nowrap ${isDisabled ? "text-gray-300 cursor-not-allowed" : "text-gray-700 hover:bg-gray-100"}`}
                        >
                          <Edit className="w-4 h-4 mr-2" /> {t("leads.actions.edit")}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isDisabled) return;
                            openAddNoteModal(lead);
                          }}
                          disabled={isDisabled}
                          className={`flex items-center w-full px-3 py-2 text-sm whitespace-nowrap ${isDisabled ? "text-gray-300 cursor-not-allowed" : "text-blue-600 hover:bg-gray-100"}`}
                        >
                          <MessageSquarePlus className="w-4 h-4 mr-2" /> Add Follow-up Note
                        </button>

                        {lead.status !== "Converted" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openConvertModal(lead); }}
                            disabled={isDisabled}
                            className={`flex items-center w-full px-3 py-2 text-sm whitespace-nowrap ${isDisabled ? "text-gray-300 cursor-not-allowed" : "text-green-600 hover:bg-gray-100"}`}
                          >
                            <Handshake className="w-4 h-4 mr-2" /> {t("leads.actions.convert")}
                          </button>
                        )}

                        {userRole === "Admin" && !isTerminal && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRejectClick(lead);
                            }}
                            className="flex items-center w-full px-3 py-2 text-sm whitespace-nowrap text-red-600 hover:bg-gray-100"
                          >
                            <Ban className="w-4 h-4 mr-2" /> Reject
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={12} className="px-4 py-12 text-center text-gray-500 text-sm">
                  {t("leads.table.noLeads")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-3">
          <p className="text-sm text-gray-500">
            {t("leads.pagination.showing")}{" "}
            <span className="font-semibold text-gray-700">{firstItem}</span>–
            <span className="font-semibold text-gray-700">{lastItem}</span>{" "}
            {t("leads.pagination.of")}{" "}
            <span className="font-semibold text-gray-700">{totalLeads}</span>
          </p>

          <div className="flex items-center gap-1">
            <button onClick={() => goToPage(1)} disabled={currentPage === 1}
              className="px-2 py-1.5 text-sm border rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">«</button>
            <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">
              {t("leads.pagination.prev")}
            </button>

            {pageNumbers().map((p, i) =>
              p === "..." ? (
                <span key={`d${i}`} className="px-2 text-gray-400">…</span>
              ) : (
                <button key={p} onClick={() => goToPage(p)}
                  className={`min-w-[36px] px-2 py-1.5 text-sm border rounded-lg transition-colors ${
                    currentPage === p
                      ? "bg-blue-600 text-white border-blue-600 font-semibold"
                      : "hover:bg-gray-100 text-gray-700"
                  }`}>
                  {p}
                </button>
              )
            )}

            <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">
              {t("leads.pagination.next")}
            </button>
            <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages}
              className="px-2 py-1.5 text-sm border rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">»</button>
          </div>
        </div>
      )}

      {/* Rejection reason tooltip — portalled so it's never clipped by the table's scroll container */}
      {hoveredRejectedLead?.rejectionReason && rejectTooltipCoords && ReactDOM.createPortal(
        <div
          className="fixed z-50 w-80 max-h-72 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl p-3"
          style={{ top: rejectTooltipCoords.top, left: rejectTooltipCoords.left }}
          onMouseEnter={() => { if (rejectTooltipTimeout) clearTimeout(rejectTooltipTimeout); }}
          onMouseLeave={handleRejectionLeave}
        >
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Rejection Reason</p>
            {hoveredRejectedLead.rejectedAt && (
              <p className="text-[10px] text-gray-400 font-medium shrink-0 ml-2">
                {new Date(hoveredRejectedLead.rejectedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                {" "}
                {new Date(hoveredRejectedLead.rejectedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>
          <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{hoveredRejectedLead.rejectionReason}</p>
        </div>,
        document.body
      )}

      {/* Export Modal */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-800">
              <Download className="w-5 h-5" />
              Export Leads
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-gray-500 mb-3">
            Optionally filter by date range. Leave both blank to export all leads.
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
              onClick={() => handleExportLeads({ startDate: exportStartDate, endDate: exportEndDate })}
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
              Reject Lead
            </DialogTitle>
          </DialogHeader>

          <p className="mb-3 text-gray-700">
            Rejecting <span className="font-semibold">{leadToReject?.name}</span>. It will be marked
            Rejected and stay disabled in the list for everyone. Please give a reason.
          </p>

          <textarea
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejecting this lead..."
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none mb-4"
          />

          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowRejectModal(false);
                setLeadToReject(null);
                setRejectReason("");
              }}
              className="px-4 py-2 rounded-lg border hover:bg-gray-100 text-gray-700"
            >
              {t("leads.deleteModal.cancel")}
            </button>

            <button
              onClick={handleRejectSubmit}
              disabled={rejecting || !rejectReason.trim()}
              className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center gap-2 disabled:opacity-60"
            >
              <Ban className="w-4 h-4" />
              {rejecting ? "Rejecting..." : "Reject Lead"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Convert Modal */}
      <Dialog open={convertModalOpen} onOpenChange={setConvertModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Handshake className="w-5 h-5" />
              {t("leads.convertModal.title")}
            </DialogTitle>
          </DialogHeader>

          {selectedLead && (
            <>
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  {t("leads.convertModal.convertingPrefix")}{" "}
                  <strong>{selectedLead.leadName}</strong>
                  {selectedLead.companyName &&
                    ` ${t("leads.convertModal.fromLabel")} ${selectedLead.companyName}`}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("leads.convertModal.dealValue")}
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={dealData.value}
                    onChange={(e) => handleDealFieldChange("value", e.target.value)}
                    placeholder={t("leads.convertModal.valuePlaceholder")}
                    className="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:outline-none"
                  />
                  <select
                    value={dealData.currency}
                    onChange={(e) => handleDealFieldChange("currency", e.target.value)}
                    className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:outline-none"
                  >
                    {allowedCurrencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.symbol} {c.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("leads.convertModal.stage")}
                </label>
                <div className="w-full px-3 py-2 border rounded-md bg-gray-50 text-gray-700">
                  {dealData.stage || "Qualification"}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("leads.convertModal.notes")}
                </label>
                <textarea
                  name="notes"
                  value={dealData.notes}
                  onChange={(e) => handleDealFieldChange("notes", e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:outline-none"
                  placeholder={t("leads.convertModal.notesPlaceholder")}
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConvertModalOpen(false)}
                  className="px-4 py-2 rounded-lg border hover:bg-gray-100 text-gray-700"
                  disabled={converting}
                >
                  {t("leads.convertModal.cancel")}
                </button>

                <button
                  onClick={handleConvertDeal}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
                  disabled={converting}
                >
                  {converting ? t("leads.convertModal.convertingBtn") : t("leads.convertModal.convert")}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Follow-up Note Modal */}
      <Dialog open={addNoteModalOpen} onOpenChange={(open) => (open ? setAddNoteModalOpen(true) : closeAddNoteModal())}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <MessageSquarePlus className="w-5 h-5" />
              Add Follow-up Note
            </DialogTitle>
          </DialogHeader>

          {noteLead && (
            <p className="text-sm text-gray-500 mb-3">
              {noteLead.leadName}
              {noteLead.companyName && ` · ${noteLead.companyName}`}
            </p>
          )}

          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={4}
            placeholder="What happened during this follow-up?"
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
          />

          {/* Voice note upload */}
          <div className="mt-3">
            <div className="flex items-center gap-3">
              <label
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm cursor-pointer ${savingNote ? "opacity-50 pointer-events-none" : ""}`}
              >
                <Upload className="w-4 h-4" />
                {audioFile ? "Replace audio file" : "Upload audio file"}
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioFileChange}
                  disabled={savingNote}
                  className="hidden"
                />
              </label>

              {audioFile && (
                <button
                  type="button"
                  onClick={discardAudioFile}
                  className="text-gray-400 hover:text-red-500"
                  title="Remove audio file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {audioFileError && (
              <p className="text-xs text-red-500 mt-2">{audioFileError}</p>
            )}

            {audioFile && (
              <p className="text-xs text-gray-500 mt-2 truncate">{audioFile.name}</p>
            )}

            {audioFileUrl && (
              <audio controls src={audioFileUrl} className="w-full mt-2 h-9" />
            )}
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={closeAddNoteModal}
              className="px-4 py-2 rounded-lg border hover:bg-gray-100 text-gray-700"
              disabled={savingNote}
            >
              Cancel
            </button>

            <button
              onClick={handleAddFollowUpNote}
              disabled={!noteText.trim() || savingNote}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {savingNote ? "Saving..." : "Save Note"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Follow-up History Modal */}
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <Eye className="w-5 h-5" />
              Follow-up History{historyLead ? ` — ${historyLead.leadName}` : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto space-y-3 mt-2">
            {!historyLead?.followUpNotes?.length ? (
              <p className={`text-sm text-center py-8 ${
                historyLead && isFollowUpMissed(historyLead) ? "text-red-500 font-medium" : "text-gray-500"
              }`}>
                {historyLead && isFollowUpMissed(historyLead)
                  ? "No follow-up notes logged — this follow-up was missed."
                  : "No follow-up notes yet."}
              </p>
            ) : (
              [...historyLead.followUpNotes]
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .map((n, i) => (
                  <div key={n._id || i} className="border border-gray-200 rounded-lg p-3">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{n.note}</p>
                    {n.audioPath && <FollowUpAudioPlayer audioPath={n.audioPath} />}
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(n.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {" at "}
                      {new Date(n.createdAt).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))
            )}
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={() => setHistoryModalOpen(false)}
              className="px-4 py-2 rounded-lg border hover:bg-gray-100 text-gray-700"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function LeadTable() {
  const { t, i18n } = useTranslation();
  return (
    <TourProvider
      key={i18n.language}
      steps={getTourSteps(t)}
      afterOpen={() => (document.body.style.overflow = "hidden")}
      beforeClose={() => (document.body.style.overflow = "unset")}
      styles={{
        popover: (base) => ({ ...base, backgroundColor: "#fff", color: "#1f1f1f" }),
        maskArea: (base) => ({ ...base, rx: 8 }),
        badge: (base) => ({ ...base, display: "none" }),
        close: (base) => ({ ...base, right: "auto", left: 8, top: 8 }),
      }}
    >
      <LeadTableComponent />
    </TourProvider>
  );
}
