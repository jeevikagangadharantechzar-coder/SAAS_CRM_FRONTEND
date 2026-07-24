import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  ArrowLeft, Calendar, FileText, Mail, Paperclip, Tag, Clock,
  User, Building, Building2, DollarSign, CheckCircle, XCircle, AlertCircle,
  Download, Eye, ChevronRight, ChevronLeft, Phone, MapPin, Globe, Briefcase,
  BookOpen, X, FileImage, File as FileIcon, Plus, Edit, RefreshCw, Archive, Save
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { getNames } from "country-list";
import useLostDealModal from "../LostDealModal/LossDeal";
import LostDealModal from "../LostDealModal/ModalLoss";
import { useModal } from "../../context/ModalContext";
import InvoiceModal from "../invoice/InvoiceModal.jsx";
import MeetingModal from "../meetings/MeetingModal.jsx";
import useMeetings from "../meetings/useMeetings.js";

// Email validation function
const validateEmail = (email) => {
  if (!email) return true; // Empty is allowed (not required)
  const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone number validation function - stricter validation
const validatePhoneNumber = (phone) => {
  if (!phone) return true; // Empty is allowed (not required)
  const cleaned = phone.replace(/[\s\-().]/g, "");
  if (!/^[+]?[0-9]/.test(cleaned)) return false;
  const withoutPlus = cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
  if (withoutPlus.length < 7 || withoutPlus.length > 15) return false;
  if (!/^\d+$/.test(withoutPlus)) return false;
  if (/^(\d)\1+$/.test(withoutPlus)) return false;
  if (withoutPlus.length < 10 && withoutPlus.startsWith("0")) return false;
  return true;
};

// True when the phone value is just a dial code with no subscriber digits typed yet
const isEffectivelyEmptyPhone = (phone) => {
  if (!phone) return true;
  return phone.replace(/\D/g, "").length <= 3;
};

const currencyOptions = [
  { code: "USD", label: "🇺🇸 USD" },
  { code: "EUR", label: "🇪🇺 EUR" },
  { code: "INR", label: "🇮🇳 INR" },
  { code: "GBP", label: "🇬🇧 GBP" },
  { code: "JPY", label: "🇯🇵 JPY" },
  { code: "AUD", label: "🇦🇺 AUD" },
  { code: "CAD", label: "🇨🇦 CAD" },
  { code: "CHF", label: "🇨🇭 CHF" },
  { code: "MYR", label: "🇲🇾 MYR" },
  { code: "AED", label: "🇦🇪 AED" },
  { code: "SGD", label: "🇸🇬 SGD" },
  { code: "ZAR", label: "🇿🇦 ZAR" },
  { code: "SAR", label: "🇸🇦 SAR" },
];

const phoneInputStyle = {
  width: "100%",
  height: "42px",
  fontSize: "14px",
  paddingLeft: "55px",
  borderRadius: "0.5rem",
  border: "none",
};

const phoneButtonStyle = {
  borderRadius: "0.5rem 0 0 0.5rem",
  height: "42px",
  background: "white",
  border: "none",
  borderRight: "1px solid #e5e7eb",
};

// ─────────────────────────────────────────────
// File helper utilities
// ─────────────────────────────────────────────
const getFileExtension = (filename = "") =>
  filename.split(".").pop()?.toLowerCase() || "";

const getFileCategory = (name = "", mimeType = "") => {
  const ext = getFileExtension(name);
  const mime = mimeType.toLowerCase();
  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "image";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (mime === "text/plain" || mime === "text/csv" || ["txt", "csv"].includes(ext)) return "text";
  return "other";
};

const canPreview = (name, mimeType) =>
  ["image", "pdf", "text"].includes(getFileCategory(name, mimeType));

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const FILE_STYLES = {
  image: { bg: "bg-green-100", icon: "text-green-600" },
  pdf: { bg: "bg-red-100", icon: "text-red-600" },
  text: { bg: "bg-yellow-100", icon: "text-yellow-600" },
  other: { bg: "bg-blue-100", icon: "text-blue-600" },
};

// Proposal status colors — matches ProposalHead.jsx's STATUS_STYLES exactly,
// so a proposal's status pill looks the same everywhere it's shown.
const PROPOSAL_STATUS_STYLES = {
  draft: "bg-orange-50 text-orange-700 border-orange-200",
  sent: "bg-blue-50 text-blue-700 border-blue-200",
  "no reply": "bg-gray-50 text-gray-500 border-gray-200",
  rejection: "bg-red-50 text-red-600 border-red-200",
  success: "bg-green-50 text-green-700 border-green-200",
};

// Activity Log — icon/color per backend event type (Pipeline_modal_view.jsx's
// `activeTab === "activity"` panel). Keys must match dealDetail.controller.js's
// `getActivityLog` event `type` field exactly.
const ACTIVITY_TYPE_META = {
  stage_change:            { icon: Tag,         bg: "bg-indigo-100", iconColor: "text-indigo-600" },
  assignee_changed:        { icon: User,        bg: "bg-violet-100", iconColor: "text-violet-600" },
  followup:                { icon: Calendar,    bg: "bg-purple-100", iconColor: "text-purple-600" },
  attachment_uploaded:     { icon: Paperclip,   bg: "bg-blue-100",   iconColor: "text-blue-600" },
  note_added:              { icon: Edit,        bg: "bg-yellow-100", iconColor: "text-yellow-600" },
  proposal_sent:           { icon: FileText,    bg: "bg-teal-100",   iconColor: "text-teal-600" },
  proposal_status_changed: { icon: FileText,    bg: "bg-teal-100",   iconColor: "text-teal-600" },
  invoice_created:         { icon: DollarSign,  bg: "bg-green-100",  iconColor: "text-green-600" },
  invoice_status_changed:  { icon: DollarSign,  bg: "bg-green-100",  iconColor: "text-green-600" },
  meeting_scheduled:       { icon: Calendar,    bg: "bg-pink-100",   iconColor: "text-pink-600" },
  meeting_cancelled:       { icon: XCircle,     bg: "bg-red-100",    iconColor: "text-red-600" },
  email_sent:              { icon: Mail,        bg: "bg-cyan-100",   iconColor: "text-cyan-600" },
  email_scheduled:         { icon: Mail,        bg: "bg-cyan-100",   iconColor: "text-cyan-600" },
  email_cancelled:         { icon: XCircle,     bg: "bg-red-100",    iconColor: "text-red-600" },
  default:                 { icon: Clock,       bg: "bg-slate-100",  iconColor: "text-slate-600" },
};

// ─────────────────────────────────────────────
// TextPreview — loads and shows text file content
// ─────────────────────────────────────────────
const TextPreview = ({ url }) => {
  const [content, setContent] = useState("Loading…");
  useEffect(() => {
    fetch(url)
      .then((r) => r.text())
      .then(setContent)
      .catch(() => setContent("Could not load file contents."));
  }, [url]);
  return (
    <pre className="whitespace-pre-wrap text-sm text-slate-700 bg-white p-4 rounded-lg border border-slate-200 max-h-[60vh] overflow-auto font-mono leading-relaxed">
      {content}
    </pre>
  );
};

// ─────────────────────────────────────────────
// PreviewModal — shows image / PDF / text inline
// ─────────────────────────────────────────────
const PreviewModal = ({ file, onClose }) => {
  // Close on Escape key
  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden"
        style={{ maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <FileText size={20} className="text-slate-500 flex-shrink-0" />
            <span className="font-medium text-slate-900 truncate text-sm">
              {file.name}
            </span>
            {file.size > 0 && (
              <span className="text-xs text-slate-400 flex-shrink-0">
                {formatFileSize(file.size)}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0"
            title="Close (Esc)"
          >
            <X size={20} className="text-slate-600" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-auto bg-slate-50 p-3">
          {file.category === "image" && (
            <div className="flex items-center justify-center min-h-64 p-4">
              <img
                src={file.url}
                alt={file.name}
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-md"
              />
            </div>
          )}
          {file.category === "pdf" && (
            <iframe
              src={file.url}
              title={file.name}
              className="w-full rounded-lg border-0"
              style={{ height: "75vh" }}
            />
          )}
          {file.category === "text" && (
            <div className="p-2">
              <TextPreview url={file.url} />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end px-5 py-3 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Notes meta helper + popup
// ─────────────────────────────────────────────
const formatNotesMeta = (deal) => {
  const authorName = deal?.notesUpdatedBy
    ? `${deal.notesUpdatedBy.firstName || ""} ${deal.notesUpdatedBy.lastName || ""}`.trim()
    : "";
  const dateLabel = deal?.notesUpdatedAt
    ? new Date(deal.notesUpdatedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";
  if (authorName && dateLabel) return `by ${authorName} · ${dateLabel}`;
  if (authorName) return `by ${authorName}`;
  if (dateLabel) return dateLabel;
  return "Tap to view full note";
};

const NotesPopup = ({ deal, onClose }) => {
  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
        style={{ maxHeight: "80vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <BookOpen size={20} className="text-slate-500 flex-shrink-0" />
            <div className="min-w-0">
              <span className="font-medium text-slate-900 text-sm block">Notes</span>
              <span className="text-xs text-slate-500">{formatNotesMeta(deal)}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0"
            title="Close (Esc)"
          >
            <X size={20} className="text-slate-600" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-5">
          <p className="text-slate-800 whitespace-pre-wrap break-words">{deal.notes}</p>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
function Pipeline_modal_view() {
  const API_URL = import.meta.env.VITE_API_URL;
  const { dealId, tenantSlug } = useParams();
  const navigate = useNavigate();

  const [deal, setDeal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Deal Score — provisional placeholder score shown top-right in the header
  const [dealScore, setDealScore] = useState(null);

  // Activity Log — unified feed from the backend (stage changes, notes,
  // proposal/invoice/meeting events, attachments), replacing the old
  // hardcoded 3-item stub.
  const [activityFeed, setActivityFeed] = useState([]);
  const [isActivityLoading, setIsActivityLoading] = useState(false);

  // Details tab — pending Tasks & Targets highlight banner
  const [highlights, setHighlights] = useState({ pendingTasks: [], pendingTargets: [] });

  // Notes tab
  const [notes, setNotes] = useState([]);
  const [isNotesLoading, setIsNotesLoading] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Proposal tab
  const [dealProposals, setDealProposals] = useState([]);
  const [isProposalsLoading, setIsProposalsLoading] = useState(false);

  // Invoice tab
  const [dealInvoices, setDealInvoices] = useState([]);
  const [isInvoicesLoading, setIsInvoicesLoading] = useState(false);
  const [editingInvoiceForModal, setEditingInvoiceForModal] = useState(null);

  // Meeting tab
  const [dealMeetings, setDealMeetings] = useState([]);
  const [isMeetingsLoading, setIsMeetingsLoading] = useState(false);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);

  // Email tab
  const [dealEmails, setDealEmails] = useState([]);
  const [isEmailsLoading, setIsEmailsLoading] = useState(false);

  // Invoice tab — reuses the real Invoice page's own modal/context, so
  // create/edit/mark-paid behave identically to the actual Invoice page.
  const { openModal: openInvoiceModal } = useModal();

  // Meeting tab — reuses the real Meetings page's own hook, so create,
  // alarms, and toasts behave identically to the actual Meetings page.
  const { createMeeting, cancelMeeting, googleConfigured, zoomConfigured } = useMeetings();

  // Use Lost Deal Modal hook — same one CreateDeal.jsx uses, so switching a
  // deal to Closed Lost always captures a reason regardless of which screen
  // the edit happens from.
  const {
    modalOpen: lostModalOpen,
    lossReason,
    lossNotes,
    validationError,
    LOSS_REASONS,
    isLoading: lostModalLoading,
    setLossReason,
    setLossNotes,
    openModal: openLostDealModal,
    closeModal: closeLostDealModal,
    validateAndExecute: validateLostDeal,
  } = useLostDealModal();
  const [activeTab, setActiveTab] = useState("details");
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [followUpData, setFollowUpData] = useState({
    followUpDate: null,
    followUpComment: "",
    previousOutcome: "",
    previousNotes: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [followUpPage, setFollowUpPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // Preview state
  const [previewFile, setPreviewFile] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(null); // index of loading file
  const [isNotesPopupOpen, setIsNotesPopupOpen] = useState(false);

  // Deal details edit state
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const [editErrors, setEditErrors] = useState({});
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [countries] = useState(getNames());

  // Helper function to get auth token
  const getAuthToken = () => {
    return localStorage.getItem("token");
  };

  // Handle authentication errors
  const handleAuthError = (error) => {
    if (error.response?.status === 401) {
      toast.error("Session expired. Please login again.");
      localStorage.removeItem("token");
      navigate("/login");
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (dealId) fetchDealDetails();
  }, [dealId]);

  const fetchDealDetails = async () => {
    try {
      setIsLoading(true);
      const token = getAuthToken();
      if (!token) {
        toast.error("Please login to continue");
        navigate("/login");
        return;
      }

     const response = await axios.get(`${API_URL}/deals/${dealId}`, {
  headers: { Authorization: `Bearer ${token}` },
});
      setDeal(response.data);
    } catch (err) {
      if (!handleAuthError(err)) {
        console.error("Failed to fetch deal details:", err);
        toast.error(err.response?.data?.message || "Failed to load deal details");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Deal Details page additions: score, activity, notes, highlights,
  // proposals, invoices, meetings, emails — each a live read against its own
  // backend module, never duplicated/cached beyond this component's state.
  const authHeader = () => ({ headers: { Authorization: `Bearer ${getAuthToken()}` } });

  // Upload new attachments directly from this tab — same
  // PATCH /deals/update-deal/:id endpoint the Create/Edit Deal form already
  // uses. Not sending `existingAttachments` at all makes the backend keep
  // the deal's current attachments as-is and just append the new files, so
  // there's no risk of accidentally dropping anything already there.
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const handleUploadAttachments = async (files) => {
    if (!files || files.length === 0) return;
    try {
      setIsUploadingAttachment(true);
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("attachments", f));
      await axios.patch(`${API_URL}/deals/update-deal/${dealId}`, formData, {
        headers: { Authorization: `Bearer ${getAuthToken()}`, "Content-Type": "multipart/form-data" },
      });
      toast.success(files.length > 1 ? "Attachments uploaded" : "Attachment uploaded");
      fetchDealDetails();
      fetchActivity();
    } catch (err) {
      console.error("Failed to upload attachment:", err);
      toast.error(err.response?.data?.message || "Failed to upload attachment");
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const fetchDealScore = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/deals/${dealId}/score`, authHeader());
      setDealScore(res.data.score);
    } catch (err) {
      console.error("Failed to fetch deal score:", err);
    }
  }, [dealId]);

  const fetchHighlights = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/deals/${dealId}/highlights`, authHeader());
      setHighlights({ pendingTasks: res.data.pendingTasks || [], pendingTargets: res.data.pendingTargets || [] });
    } catch (err) {
      console.error("Failed to fetch deal highlights:", err);
    }
  }, [dealId]);

  const fetchActivity = useCallback(async () => {
    try {
      setIsActivityLoading(true);
      const res = await axios.get(`${API_URL}/deals/${dealId}/activity`, authHeader());
      setActivityFeed(res.data.activity || []);
    } catch (err) {
      console.error("Failed to fetch activity log:", err);
      toast.error("Failed to load activity log");
    } finally {
      setIsActivityLoading(false);
    }
  }, [dealId]);

  const fetchNotes = useCallback(async () => {
    try {
      setIsNotesLoading(true);
      const res = await axios.get(`${API_URL}/deals/${dealId}/notes`, authHeader());
      setNotes(res.data.notes || []);
    } catch (err) {
      console.error("Failed to fetch notes:", err);
      toast.error("Failed to load notes");
    } finally {
      setIsNotesLoading(false);
    }
  }, [dealId]);

  const handleAddNote = async () => {
    if (!newNoteText.trim()) return;
    try {
      setIsAddingNote(true);
      const res = await axios.post(`${API_URL}/deals/${dealId}/notes`, { text: newNoteText.trim() }, authHeader());
      setNotes((prev) => [res.data.note, ...prev]);
      setNewNoteText("");
      toast.success("Note added");
      fetchActivity();
    } catch (err) {
      console.error("Failed to add note:", err);
      toast.error(err.response?.data?.message || "Failed to add note");
    } finally {
      setIsAddingNote(false);
    }
  };

  const fetchDealProposals = useCallback(async () => {
    try {
      setIsProposalsLoading(true);
      const res = await axios.get(`${API_URL}/deals/${dealId}/proposals`, authHeader());
      setDealProposals(res.data || []);
    } catch (err) {
      console.error("Failed to fetch proposals:", err);
      toast.error("Failed to load proposals");
    } finally {
      setIsProposalsLoading(false);
    }
  }, [dealId]);

  // Change a proposal's status right from this page — same endpoint and
  // options ProposalHead.jsx's own status dropdown uses, so behavior is
  // identical to changing it on the real Proposal page.
  const handleProposalStatusChange = async (proposalId, newStatus) => {
    try {
      await axios.put(`${API_URL}/proposal/updatestatus/${proposalId}`, { status: newStatus }, authHeader());
      setDealProposals((prev) => prev.map((p) => (p._id === proposalId ? { ...p, status: newStatus } : p)));
      toast.success("Proposal status updated");
      fetchActivity();
    } catch (err) {
      console.error("Failed to update proposal status:", err);
      toast.error(err.response?.data?.error || "Failed to update proposal status");
    }
  };

  const fetchDealInvoices = useCallback(async () => {
    try {
      setIsInvoicesLoading(true);
      const res = await axios.get(`${API_URL}/deals/${dealId}/invoices`, authHeader());
      setDealInvoices(res.data || []);
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
      toast.error("Failed to load invoices");
    } finally {
      setIsInvoicesLoading(false);
    }
  }, [dealId]);

  const fetchDealMeetings = useCallback(async () => {
    try {
      setIsMeetingsLoading(true);
      const res = await axios.get(`${API_URL}/deals/${dealId}/meetings`, authHeader());
      setDealMeetings(res.data || []);
    } catch (err) {
      console.error("Failed to fetch meetings:", err);
      toast.error("Failed to load meetings");
    } finally {
      setIsMeetingsLoading(false);
    }
  }, [dealId]);

  const fetchDealEmails = useCallback(async () => {
    try {
      setIsEmailsLoading(true);
      const res = await axios.get(`${API_URL}/deals/${dealId}/emails`, authHeader());
      setDealEmails(res.data || []);
    } catch (err) {
      console.error("Failed to fetch emails:", err);
      toast.error("Failed to load emails");
    } finally {
      setIsEmailsLoading(false);
    }
  }, [dealId]);

  // Invoice saved (created/updated/marked paid) inside the embedded
  // InvoiceModal — refetch this deal's invoice list, and the deal itself,
  // since a full payment flips the deal to Closed Won inside InvoiceModal's
  // own save logic (its existing PATCH /deals/update-deal call), so the
  // header's stage badge needs to pick that up too.
  const handleInvoiceSaved = () => {
    fetchDealInvoices();
    fetchDealDetails();
    fetchActivity();
  };

  // Same endpoint/flow InvoiceHead.jsx's "Send to Email" action uses — emails
  // the invoice PDF, then best-effort bumps the deal to "Invoice Sent"
  // (failure to bump the stage must not be reported as a failed send).
  const [sendingInvoiceEmailId, setSendingInvoiceEmailId] = useState(null);
  const handleSendInvoiceEmail = async (invoiceId) => {
    try {
      setSendingInvoiceEmailId(invoiceId);
      await axios.post(`${API_URL}/invoices/sendEmail/${invoiceId}`, {}, authHeader());
      toast.success("Invoice email sent");
      try {
        await axios.patch(`${API_URL}/deals/update-deal/${dealId}`, { stage: "Invoice Sent" }, authHeader());
        fetchDealDetails();
      } catch (_) {}
      fetchDealInvoices();
      fetchActivity();
    } catch (err) {
      console.error("Failed to send invoice email:", err);
      toast.error(err.response?.data?.error || "Failed to send invoice email");
    } finally {
      setSendingInvoiceEmailId(null);
    }
  };

  // Meeting saved via the embedded MeetingModal — delegates to the real
  // Meetings page's own createMeeting (same API call, alarms, toasts),
  // just folding in this deal's id and contact email.
  const handleMeetingSave = async (formData) => {
    // Attendees already come prefilled with the deal's email (visible and
    // editable in the modal itself, via initialAttendees below) — no need to
    // force it back in here, which would undo the user deliberately removing it.
    await createMeeting({ ...formData, dealId: deal._id });
    setIsMeetingModalOpen(false);
    fetchDealMeetings();
    fetchActivity();
  };

  // Same cancelMeeting the real Meetings page uses (PUT /meetings/:id,
  // {status: "cancelled"}) — Edit stays on the real Meetings page itself
  // (per request), Cancel is quick enough to keep inline here.
  const handleCancelMeeting = async (meetingId) => {
    if (!window.confirm("Cancel this meeting?")) return;
    await cancelMeeting(meetingId);
    fetchDealMeetings();
    fetchActivity();
  };

  // Score + Task/Target highlights load once alongside the deal itself
  useEffect(() => {
    if (dealId) {
      fetchDealScore();
      fetchHighlights();
    }
  }, [dealId, fetchDealScore, fetchHighlights]);

  // Everything else loads lazily, the first time its tab is opened
  useEffect(() => {
    if (!dealId) return;
    if (activeTab === "activity" && activityFeed.length === 0 && !isActivityLoading) fetchActivity();
    if (activeTab === "notes" && notes.length === 0 && !isNotesLoading) fetchNotes();
    if (activeTab === "proposal" && dealProposals.length === 0 && !isProposalsLoading) fetchDealProposals();
    if (activeTab === "invoice" && dealInvoices.length === 0 && !isInvoicesLoading) fetchDealInvoices();
    if (activeTab === "meeting" && dealMeetings.length === 0 && !isMeetingsLoading) fetchDealMeetings();
    if (activeTab === "email" && dealEmails.length === 0 && !isEmailsLoading) fetchDealEmails();
  }, [activeTab, dealId]);

  // Handle schedule follow-up
  const handleScheduleFollowUp = async () => {
    // If rescheduling, enforce completing previous follow-up
    if (deal.followUpDate) {
      if (!followUpData.previousOutcome) {
        toast.error("Please select an outcome for the previous follow-up");
        return;
      }
      if (!followUpData.previousNotes || followUpData.previousNotes.trim() === "") {
        toast.error("Please provide notes for the previous follow-up");
        return;
      }
    }

    if (!followUpData.followUpDate) {
      toast.error("Please select a follow-up date");
      return;
    }

    try {
      setIsSubmitting(true);
      const token = getAuthToken();
      if (!token) {
        toast.error("Please login to continue");
        navigate("/login");
        return;
      }

      const payload = {
        dealId: deal._id,
        followUpDate:
          followUpData.followUpDate instanceof Date
            ? followUpData.followUpDate.toISOString()
            : followUpData.followUpDate,
        followUpComment: followUpData.followUpComment,
        // Include the previous follow-up data if rescheduling
        previousFollowUpDate: deal.followUpDate || null,
        previousOutcome: followUpData.previousOutcome || "",
        previousNotes: followUpData.previousNotes || ""
      };

      const response = await axios.post(
  `${API_URL}/deals/schedule-followup/${dealId}`, 
  payload,
  { headers: { Authorization: `Bearer ${token}` } }
);

      toast.success(response.data.message || "Follow-up scheduled successfully");
      setIsFollowUpModalOpen(false);
      setFollowUpData({ followUpDate: null, followUpComment: "", previousOutcome: "", previousNotes: "" });
      
      // Refresh deal details to show updated follow-up
      fetchDealDetails();
    } catch (err) {
      if (!handleAuthError(err)) {
        console.error("Failed to schedule follow-up:", err);
        toast.error(err.response?.data?.message || "Failed to schedule follow-up");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle completing a follow-up without scheduling a new one
  const handleCompleteOnly = async () => {
    if (!followUpData.previousOutcome) {
      toast.error("Please select an outcome for the previous follow-up");
      return;
    }
    if (!followUpData.previousNotes || followUpData.previousNotes.trim() === "") {
      toast.error("Please provide notes for the previous follow-up");
      return;
    }

    try {
      setIsSubmitting(true);
      const token = getAuthToken();
      if (!token) {
        toast.error("Please login to continue");
        navigate("/login");
        return;
      }

      const payload = {
        outcome: followUpData.previousOutcome,
        notes: followUpData.previousNotes
      };

      const response = await axios.post(
        `${API_URL}/deals/${dealId}/complete-followup`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(response.data.message || "Follow-up completed successfully");
      setIsFollowUpModalOpen(false);
      setFollowUpData({ followUpDate: null, followUpComment: "", previousOutcome: "", previousNotes: "" });
      
      // Refresh deal details
      fetchDealDetails();
    } catch (err) {
      if (!handleAuthError(err)) {
        console.error("Failed to complete follow-up:", err);
        toast.error(err.response?.data?.message || "Failed to complete follow-up");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Download handler ────────────────────────────────────────
  const downloadFile = useCallback(async (filePath, fileName) => {
    if (!filePath) return toast.error("File path is missing");
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error("Please login to continue");
        navigate("/login");
        return;
      }

      const params = new URLSearchParams({ filePath });
      const res = await axios.get(`${API_URL}/files/download?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName || filePath.split("/").pop() || "file");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("File downloaded successfully");
    } catch (err) {
      if (!handleAuthError(err)) {
        console.error("Download failed:", err);
        toast.error(err.response?.data?.message || "Failed to download file");
      }
    }
  }, [API_URL, navigate]);

  // ── Preview handler ─────────────────────────────────────────
  const openPreview = useCallback(async (file, idx) => {
    if (!file.path) return toast.error("File path is missing");
    setPreviewLoading(idx);
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error("Please login to continue");
        navigate("/login");
        return;
      }

      const params = new URLSearchParams({ filePath: file.path });
      const res = await axios.get(`${API_URL}/files/preview?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      const contentType = res.headers["content-type"] || "application/octet-stream";
      const blobUrl = window.URL.createObjectURL(
        new Blob([res.data], { type: contentType })
      );

      setPreviewFile({
        url: blobUrl,
        name: file.name || file.path?.split("/").pop() || "file",
        size: file.size || 0,
        category: getFileCategory(file.name, file.type),
      });
    } catch (err) {
      if (!handleAuthError(err)) {
        console.error("Preview failed:", err);
        toast.error(err.response?.data?.message || "Failed to load preview");
      }
    } finally {
      setPreviewLoading(null);
    }
  }, [API_URL, navigate]);

  const closePreview = useCallback(() => {
    if (previewFile?.url) window.URL.revokeObjectURL(previewFile.url);
    setPreviewFile(null);
  }, [previewFile]);

  // ── Deal details edit handlers ────────────────────────────────
  const parseDealValue = (val) => {
    if (!val) return { amount: "", currency: "INR" };
    const match = String(val).match(/^([\d,]+)\s*([A-Za-z]+)$/);
    if (!match) return { amount: String(val).replace(/,/g, ""), currency: "INR" };
    return { amount: match[1].replace(/,/g, ""), currency: match[2].toUpperCase() };
  };

  const DEAL_STAGES = ["Qualification", "Proposal Sent-Negotiation", "Invoice Sent", "Closed Won", "Closed Lost"];

  const startEditDetails = () => {
    const { amount, currency } = parseDealValue(deal.value);
    setEditFormData({
      dealName: deal.dealName || "",
      dealValue: amount,
      currency: currency || deal.currency || "INR",
      stage: deal.stage || "Qualification",
      notes: deal.notes || "",
      companyName: deal.companyName || "",
      email: deal.email || "",
      phoneNumber: deal.phoneNumber || "",
      alternativeEmail: deal.alternativeEmail || "",
      alternativeNumber: deal.alternativeNumber || "",
      clientType: deal.clientType || "",
      address: deal.address || "",
      country: deal.country || "",
    });
    setEditErrors({});
    setIsEditingDetails(true);
  };

  const cancelEditDetails = () => {
    setIsEditingDetails(false);
    setEditFormData(null);
    setEditErrors({});
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "email" || name === "alternativeEmail") {
      setEditErrors((prev) => ({ ...prev, [name]: !!value && !validateEmail(value) }));
    }
    if (name === "phoneNumber" || name === "alternativeNumber") {
      setEditErrors((prev) => ({
        ...prev,
        [name]: !!value && !isEffectivelyEmptyPhone(value) && !validatePhoneNumber(value),
      }));
    }
  };

  const performSaveDetails = async (extraFields = {}) => {
    try {
      setIsSavingDetails(true);
      const token = getAuthToken();
      if (!token) {
        toast.error("Please login to continue");
        navigate("/login");
        return;
      }

      const payload = {
        dealName: editFormData.dealName.trim(),
        dealValue: editFormData.dealValue,
        currency: editFormData.currency,
        stage: editFormData.stage,
        notes: editFormData.notes,
        companyName: editFormData.companyName.trim(),
        email: editFormData.email,
        phoneNumber: editFormData.phoneNumber,
        alternativeEmail: editFormData.alternativeEmail,
        alternativeNumber: editFormData.alternativeNumber,
        clientType: editFormData.clientType,
        address: editFormData.address.trim(),
        country: editFormData.country.trim(),
        ...extraFields,
      };

      const response = await axios.patch(
        `${API_URL}/deals/update-deal/${dealId}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setDeal(response.data.deal);
      setIsEditingDetails(false);
      setEditFormData(null);
      toast.success(response.data.message || "Deal updated successfully");
    } catch (err) {
      if (!handleAuthError(err)) {
        console.error("Failed to update deal:", err);
        toast.error(err.response?.data?.message || "Failed to update deal");
      }
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleLostDealConfirm = useCallback(async (lossData) => {
    if (lossData?.reason) {
      await performSaveDetails({ lossReason: lossData.reason, lossNotes: lossData.notes || "" });
    }
  }, [editFormData]);

  const saveDetails = async () => {
    if (!editFormData.dealName.trim()) return toast.error("Deal Name is required");
    if (!editFormData.companyName.trim()) return toast.error("Company Name is required");
    if (editFormData.email && !validateEmail(editFormData.email))
      return toast.error("Please enter a valid email address");
    if (editFormData.alternativeEmail && !validateEmail(editFormData.alternativeEmail))
      return toast.error("Please enter a valid alternative email address");
    if (
      editFormData.phoneNumber &&
      !isEffectivelyEmptyPhone(editFormData.phoneNumber) &&
      !validatePhoneNumber(editFormData.phoneNumber)
    )
      return toast.error("Please enter a valid phone number");
    if (
      editFormData.alternativeNumber &&
      !isEffectivelyEmptyPhone(editFormData.alternativeNumber) &&
      !validatePhoneNumber(editFormData.alternativeNumber)
    )
      return toast.error("Please enter a valid alternative phone number");

    // Moving into Closed Lost always needs a reason, same as the Create/Edit
    // Deal form — intercept the save and collect it before writing anything.
    if (editFormData.stage === "Closed Lost" && deal.stage !== "Closed Lost") {
      openLostDealModal(deal._id, handleLostDealConfirm);
      return;
    }

    await performSaveDetails();
  };

  // ── Format helpers ──────────────────────────────────────────
  const formatCurrencyValue = (val) => {
    if (!val) return "-";
    const match = val.match(/^([\d,]+)\s*([A-Za-z]+)$/);
    if (!match) return val;
    const number = match[1].replace(/,/g, "");
    const currency = match[2].toUpperCase();
    const formattedNumber = Number(number).toLocaleString("en-IN");
    return `${formattedNumber} ${currency}`;
  };

  const getStageBadgeClass = (stage) => {
    switch (stage) {
      case "Closed Won":
        return {
          icon: CheckCircle,
          color: "text-emerald-700",
          bgColor: "bg-emerald-50",
          borderColor: "border-emerald-200",
          label: "Deal Closed",
        };
      case "Closed Lost":
        return {
          icon: XCircle,
          color: "text-rose-700",
          bgColor: "bg-rose-50",
          borderColor: "border-rose-200",
          label: "Deal Lost",
        };
      case "Qualification":
        return {
          icon: AlertCircle,
          color: "text-blue-700",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          label: "Qualification",
        };
      case "Proposal Sent-Negotiation":
        return {
          icon: Clock,
          color: "text-amber-700",
          bgColor: "bg-amber-50",
          borderColor: "border-amber-200",
          label: "Proposal Sent-Negotiation",
        };
      case "Invoice Sent":
        return {
          icon: Mail,
          color: "text-purple-700",
          bgColor: "bg-purple-50",
          borderColor: "border-purple-200",
          label: "Invoice Sent",
        };
      default:
        return {
          icon: AlertCircle,
          color: "text-slate-700",
          bgColor: "bg-slate-100",
          borderColor: "border-slate-200",
          label: stage || "Unknown",
        };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4" />
          <p className="text-slate-600">Loading deal details...</p>
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg max-w-md w-full">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="text-rose-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">
            Deal Not Found
          </h2>
          <p className="text-slate-600 mb-6">
            The deal you're looking for doesn't exist or may have been removed.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Pipeline
          </button>
        </div>
      </div>
    );
  }

  const stageConfig = getStageBadgeClass(deal.stage);
  const StageIcon = stageConfig.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Preview Modal */}
      {previewFile && (
        <PreviewModal file={previewFile} onClose={closePreview} />
      )}

      {/* Notes Popup */}
      {isNotesPopupOpen && (
        <NotesPopup deal={deal} onClose={() => setIsNotesPopupOpen(false)} />
      )}

      {/* Invoice creation/edit — the exact same modal the real Invoice page
          uses, prefilled with this deal so its own send/paid/partially-paid
          logic doesn't need to be duplicated here. */}
      <InvoiceModal onInvoiceSaved={handleInvoiceSaved} editingInvoice={editingInvoiceForModal} presetDeal={deal} />

      {/* Meeting scheduling — the exact same modal the real Meetings page
          uses. */}
      <MeetingModal
        isOpen={isMeetingModalOpen}
        onClose={() => setIsMeetingModalOpen(false)}
        onSave={handleMeetingSave}
        editMeeting={null}
        zoomConfigured={zoomConfigured}
        googleMeetSyncEnabled={googleConfigured}
        initialAttendees={deal.email ? [deal.email] : []}
      />

      <LostDealModal
        isOpen={lostModalOpen}
        onClose={closeLostDealModal}
        lossReason={lossReason}
        lossNotes={lossNotes}
        validationError={validationError}
        LOSS_REASONS={LOSS_REASONS}
        onReasonChange={setLossReason}
        onNotesChange={setLossNotes}
        onConfirm={validateLostDeal}
        title="Update Loss Reason"
        dealName={deal.dealName}
        isLoading={lostModalLoading}
      />

      {/* Follow-up Modal */}
      {isFollowUpModalOpen && (
        <div className="fixed inset-0 z-[50] overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
            onClick={() => {
              setIsFollowUpModalOpen(false);
              setFollowUpData({ followUpDate: null, followUpComment: "", previousOutcome: "", previousNotes: "" });
            }}
          />

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all w-full max-w-lg">
                <div className="bg-white px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Clock className="text-purple-600" size={20} />
                      {deal.followUpDate ? "Reschedule Follow-up" : "Schedule First Follow-up"}
                    </h3>
                    <button
                      onClick={() => {
                        setIsFollowUpModalOpen(false);
                        setFollowUpData({ followUpDate: null, followUpComment: "", previousOutcome: "", previousNotes: "" });
                      }}
                      className="rounded-lg p-1 hover:bg-gray-100 transition-colors"
                    >
                      <X size={20} className="text-gray-500" />
                    </button>
                  </div>
                </div>

                <div className="bg-white px-6 py-6">
                  <div className="space-y-6">
                    {deal.followUpDate && (
                      <div className="bg-gray-50 -mx-6 px-6 py-4 border-b border-gray-200 mb-6">
                        <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <CheckCircle size={16} className="text-gray-500" />
                          Complete Previous Follow-up
                        </h4>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Outcome <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={followUpData.previousOutcome}
                              onChange={(e) => setFollowUpData(prev => ({ ...prev, previousOutcome: e.target.value }))}
                              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none transition"
                            >
                              <option value="">Select outcome...</option>
                              <option value="Completed">Completed</option>
                              <option value="Missed">Missed / No Response</option>
                              <option value="Rescheduled">Rescheduled</option>
                              <option value="Client No-Show">Client No-Show</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Outcome Notes <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              rows={3}
                              value={followUpData.previousNotes}
                              onChange={(e) => setFollowUpData(prev => ({ ...prev, previousNotes: e.target.value }))}
                              placeholder="Reason for missing, or summary of the conversation..."
                              className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white shadow-sm text-sm text-gray-700 placeholder-gray-400 transition resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-4">
                        {deal.followUpDate ? "Schedule Next Follow-up" : "Schedule Follow-up"}
                      </h4>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Follow-up Date & Time <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <DatePicker
                          selected={followUpData.followUpDate}
                          onChange={(date) => {
                            setFollowUpData(prev => ({ ...prev, followUpDate: date }));
                          }}
                          showTimeSelect
                          timeFormat="HH:mm"
                          timeIntervals={15}
                          timeCaption="Time"
                          dateFormat="MMMM d, yyyy h:mm aa"
                          placeholderText="Select date and time"
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none transition pl-10"
                          minDate={new Date()}
                          isClearable
                          calendarClassName="font-sans"
                          popperClassName="z-[10000]"
                        />
                        <Calendar className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Select a date and time for the follow-up reminder
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Follow-up Notes
                      </label>
                      <textarea
                        rows={4}
                        value={followUpData.followUpComment}
                        onChange={(e) => {
                          setFollowUpData(prev => ({ ...prev, followUpComment: e.target.value }));
                        }}
                        placeholder="Enter meeting agenda, discussion points, or specific items to cover..."
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white shadow-sm text-sm text-gray-700 placeholder-gray-400 transition resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-4 sm:px-6 flex flex-col sm:flex-row justify-end gap-3 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFollowUpModalOpen(false);
                      setFollowUpData({ followUpDate: null, followUpComment: "", previousOutcome: "", previousNotes: "" });
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors order-3 sm:order-1"
                  >
                    Cancel
                  </button>
                  {deal.followUpDate && (
                    <button
                      type="button"
                      onClick={handleCompleteOnly}
                      disabled={isSubmitting}
                      className="w-full sm:w-auto px-5 py-2.5 bg-white border border-purple-600 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 order-2 sm:order-2"
                    >
                      {isSubmitting ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-600"></div>
                      ) : (
                        <CheckCircle size={16} />
                      )}
                      Complete & No Next Follow-up
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleScheduleFollowUp}
                    disabled={isSubmitting || !followUpData.followUpDate}
                    className="w-full sm:w-auto px-5 py-2.5 bg-purple-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 order-1 sm:order-3"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                        Scheduling...
                      </>
                    ) : (
                      <>
                        <Calendar size={16} />
                        {deal.followUpDate ? "Reschedule Follow-up" : "Schedule Follow-up"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center text-slate-600 mb-3">
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                <ArrowLeft size={16} className="mr-1" />
                Back to Pipeline
              </button>
              <ChevronRight size={16} className="mx-2" />
              <span className="text-slate-500">View Deal</span>
            </div>
            <div className="flex items-center gap-4">
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                {deal.dealName}
              </h1>
              <div
                className={`inline-flex items-center px-4 py-2 rounded-full ${stageConfig.bgColor} ${stageConfig.color} border ${stageConfig.borderColor}`}
              >
                <StageIcon size={16} className="mr-2" />
                <span className="capitalize font-medium text-sm">
                  {stageConfig.label}
                </span>
              </div>
            </div>
          </div>

          {/* Deal Score — provisional placeholder score, top-right corner */}
          {dealScore !== null && (
            <div
              className={`inline-flex flex-col items-center px-5 py-2 rounded-xl border ${
                dealScore >= 70
                  ? "bg-green-50 text-green-700 border-green-200"
                  : dealScore >= 40
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}
              title="Deal Score (provisional)"
            >
              <span className="text-2xl font-bold leading-none">{dealScore}</span>
              <span className="text-[11px] font-medium uppercase tracking-wide mt-1">Deal Score</span>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
          <button
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "details"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => setActiveTab("details")}
          >
            Details
          </button>
          <button
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "attachments"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => setActiveTab("attachments")}
          >
            Attachments{" "}
            {deal.attachments &&
              deal.attachments.length > 0 &&
              `(${deal.attachments.length})`}
          </button>
          <button
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "activity"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => setActiveTab("activity")}
          >
            Activity
          </button>
          <button
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "followup"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => setActiveTab("followup")}
          >
            Follow-up History
          </button>
          <button
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "notes"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => setActiveTab("notes")}
          >
            Notes
          </button>
          <button
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "proposal"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => setActiveTab("proposal")}
          >
            Proposal
          </button>
          <button
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "invoice"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => setActiveTab("invoice")}
          >
            Invoice
          </button>
          <button
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "meeting"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => setActiveTab("meeting")}
          >
            Meeting
          </button>
          <button
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "email"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => setActiveTab("email")}
          >
            Email
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Column */}
          <div className="lg:col-span-2">
            {/* Details Card */}
            {activeTab === "details" && (
              <>
              {(highlights.pendingTasks.length > 0 || highlights.pendingTargets.length > 0) && (
                <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-amber-200">
                    <h3 className="text-sm font-semibold text-amber-900">Pending Tasks & Targets</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {highlights.pendingTasks.map((t) => (
                      <div key={t._id} className="flex items-start gap-2 text-sm">
                        <CheckCircle size={15} className="text-amber-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium text-slate-900">{t.title}</span>
                          {t.description && <p className="text-slate-600">{t.description}</p>}
                          {t.dueDate && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              Due {new Date(t.dueDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    {highlights.pendingTargets.map((tg) => (
                      <div key={tg._id} className="flex items-start gap-2 text-sm">
                        <Tag size={15} className="text-amber-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium text-slate-900">Target</span>
                          {tg.description && <p className="text-slate-600">{tg.description}</p>}
                          {tg.endDate && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              Ends {new Date(tg.endDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Deal Details
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                      Comprehensive information about this deal
                    </p>
                  </div>
                  {!isEditingDetails && (
                    <button
                      onClick={startEditDetails}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                    >
                      <Edit size={15} />
                      Edit
                    </button>
                  )}
                </div>
                <div className="p-6">
                  {!isEditingDetails ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Deal Information */}
                      <div className="space-y-5">
                        <div>
                          <h3 className="text-sm font-medium text-slate-700 mb-3 uppercase tracking-wide">
                            Deal Information
                          </h3>
                          <div className="space-y-4">
                            <div className="flex items-center text-slate-700">
                              <Tag size={18} className="mr-3 text-slate-500" />
                              <div>
                                <p className="text-sm font-medium">Deal Name</p>
                                <p className="text-slate-900">{deal.dealName}</p>
                              </div>
                            </div>
                            <div className="flex items-center text-slate-700">
                              <DollarSign
                                size={18}
                                className="mr-3 text-slate-500"
                              />
                              <div>
                                <p className="text-sm font-medium">Value</p>
                                <p className="text-slate-900">
                                  {formatCurrencyValue(deal.value)}
                                </p>
                              </div>
                            </div>
                            {deal.notes && (
                              <button
                                type="button"
                                onClick={() => setIsNotesPopupOpen(true)}
                                className="w-full flex items-start text-left text-slate-700 hover:bg-slate-50 rounded-lg -mx-2 px-2 py-1 transition-colors group"
                              >
                                <BookOpen
                                  size={18}
                                  className="mr-3 mt-0.5 text-slate-500 flex-shrink-0 group-hover:text-blue-600 transition-colors"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium group-hover:text-blue-600 transition-colors">
                                    Notes
                                  </p>
                                  <p className="text-slate-900 truncate">{deal.notes}</p>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {formatNotesMeta(deal)}
                                  </p>
                                </div>
                              </button>
                            )}
                            {deal.followUpDate && (
                              <div className="flex items-center text-slate-700">
                                <Clock
                                  size={18}
                                  className="mr-3 text-slate-500"
                                />
                                <div>
                                  <p className="text-sm font-medium">
                                    Follow-up Date
                                  </p>
                                  <p className="text-slate-900">
                                    {deal.followUpDate ? (
                                      <>
                                        {new Date(
                                          deal.followUpDate
                                        ).toLocaleDateString("en-US", {
                                          weekday: "short",
                                          year: "numeric",
                                          month: "short",
                                          day: "numeric",
                                        })}
                                        <span className="text-slate-500 ml-2">
                                          •{" "}
                                          {new Date(
                                            deal.followUpDate
                                          ).toLocaleTimeString("en-US", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            hour12: true,
                                          })}
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-slate-400">
                                        Not set
                                      </span>
                                    )}
                                  </p>
                                  {deal.followUpComment && (
                                    <p className="text-sm text-slate-600 mt-2">
                                      <span className="font-medium">Notes:</span>{" "}
                                      {deal.followUpComment}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Company Information */}
                      <div className="space-y-5">
                        <div>
                          <h3 className="text-sm font-medium text-slate-700 mb-3 uppercase tracking-wide">
                            Company Information
                          </h3>
                          <div className="space-y-4">
                            <div className="flex items-center text-slate-700">
                              <Building
                                size={18}
                                className="mr-3 text-slate-500"
                              />
                              <div>
                                <p className="text-sm font-medium">
                                  Company Name
                                </p>
                                <p className="text-slate-900">
                                  {deal.companyName || "Not specified"}
                                </p>
                              </div>
                            </div>
                            {deal.email && (
                              <div className="flex items-center text-slate-700">
                                <Mail size={18} className="mr-3 text-slate-500" />
                                <div>
                                  <p className="text-sm font-medium">Email</p>
                                  <a
                                    href={`mailto:${deal.email}`}
                                    className="text-blue-600 hover:underline text-slate-900"
                                  >
                                    {deal.email}
                                  </a>
                                </div>
                              </div>
                            )}
                            {deal.phoneNumber && (
                              <div className="flex items-center text-slate-700">
                                <Phone
                                  size={18}
                                  className="mr-3 text-slate-500"
                                />
                                <div>
                                  <p className="text-sm font-medium">
                                    Phone Number
                                  </p>
                                  <p className="text-slate-900">
                                    {deal.phoneNumber}
                                  </p>
                                </div>
                              </div>
                            )}
                            {deal.alternativeEmail && (
                              <div className="flex items-center text-slate-700">
                                <Mail size={18} className="mr-3 text-slate-500" />
                                <div>
                                  <p className="text-sm font-medium">Alternative Email</p>
                                  <a
                                    href={`mailto:${deal.alternativeEmail}`}
                                    className="text-blue-600 hover:underline text-slate-900"
                                  >
                                    {deal.alternativeEmail}
                                  </a>
                                </div>
                              </div>
                            )}
                            {deal.alternativeNumber && (
                              <div className="flex items-center text-slate-700">
                                <Phone
                                  size={18}
                                  className="mr-3 text-slate-500"
                                />
                                <div>
                                  <p className="text-sm font-medium">
                                    Alternative Number
                                  </p>
                                  <p className="text-slate-900">
                                    {deal.alternativeNumber}
                                  </p>
                                </div>
                              </div>
                            )}
                            <div className="flex items-center text-slate-700">
                              <Building2 size={18} className="mr-3 text-slate-500" />
                              <div>
                                <p className="text-sm font-medium">Client Type</p>
                                <p className="text-slate-900">{deal.clientType || "Not specified"}</p>
                              </div>
                            </div>
                            <div className="flex items-center text-slate-700">
                              <MapPin size={18} className="mr-3 text-slate-500" />
                              <div>
                                <p className="text-sm font-medium">Address</p>
                                <p className="text-slate-900">{deal.address || "Not specified"}</p>
                              </div>
                            </div>
                            <div className="flex items-center text-slate-700">
                              <Globe size={18} className="mr-3 text-slate-500" />
                              <div>
                                <p className="text-sm font-medium">Country</p>
                                <p className="text-slate-900">{deal.country || "Not specified"}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Deal Information (edit) */}
                        <div className="space-y-4">
                          <h3 className="text-sm font-medium text-slate-700 mb-1 uppercase tracking-wide">
                            Deal Information
                          </h3>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Deal Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              name="dealName"
                              value={editFormData.dealName}
                              onChange={handleEditChange}
                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Value
                            </label>
                            <div className="flex gap-2">
                              <select
                                name="currency"
                                value={editFormData.currency}
                                onChange={handleEditChange}
                                className="border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white w-28 focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition"
                              >
                                {currencyOptions.map((c) => (
                                  <option key={c.code} value={c.code}>{c.label}</option>
                                ))}
                              </select>
                              <input
                                value={editFormData.dealValue}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === "" || /^[0-9]+$/.test(val)) {
                                    handleEditChange({ target: { name: "dealValue", value: val } });
                                  }
                                }}
                                placeholder="Enter deal value"
                                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition min-w-0"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Stage
                            </label>
                            <select
                              name="stage"
                              value={editFormData.stage}
                              onChange={handleEditChange}
                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition"
                            >
                              {DEAL_STAGES.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Notes
                            </label>
                            <textarea
                              name="notes"
                              rows={4}
                              value={editFormData.notes}
                              onChange={handleEditChange}
                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition resize-none"
                            />
                          </div>
                        </div>

                        {/* Company Information (edit) */}
                        <div className="space-y-4">
                          <h3 className="text-sm font-medium text-slate-700 mb-1 uppercase tracking-wide">
                            Company Information
                          </h3>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Company Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              name="companyName"
                              value={editFormData.companyName}
                              onChange={handleEditChange}
                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Email
                            </label>
                            <input
                              type="email"
                              name="email"
                              value={editFormData.email}
                              onChange={handleEditChange}
                              placeholder="name@example.com"
                              className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition ${
                                editErrors.email ? "border-red-500" : "border-slate-300"
                              }`}
                            />
                            {editErrors.email && (
                              <p className="text-red-500 text-xs mt-1">Invalid email format</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Phone Number
                            </label>
                            <div
                              className={`border rounded-lg ${
                                editErrors.phoneNumber ? "border-red-500" : "border-slate-300"
                              }`}
                            >
                              <PhoneInput
                                country={"in"}
                                preferredCountries={["in"]}
                                countryCodeEditable={false}
                                value={editFormData.phoneNumber}
                                onChange={(phone) =>
                                  handleEditChange({ target: { name: "phoneNumber", value: phone } })
                                }
                                specialLabel=""
                                inputStyle={phoneInputStyle}
                                buttonStyle={phoneButtonStyle}
                              />
                            </div>
                            {editErrors.phoneNumber && (
                              <p className="text-red-500 text-xs mt-1">Invalid phone number format</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Alternative Email
                            </label>
                            <input
                              type="email"
                              name="alternativeEmail"
                              value={editFormData.alternativeEmail}
                              onChange={handleEditChange}
                              placeholder="alt@example.com"
                              className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition ${
                                editErrors.alternativeEmail ? "border-red-500" : "border-slate-300"
                              }`}
                            />
                            {editErrors.alternativeEmail && (
                              <p className="text-red-500 text-xs mt-1">Invalid email format</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Alternative Number
                            </label>
                            <div
                              className={`border rounded-lg ${
                                editErrors.alternativeNumber ? "border-red-500" : "border-slate-300"
                              }`}
                            >
                              <PhoneInput
                                country={"in"}
                                preferredCountries={["in"]}
                                countryCodeEditable={false}
                                value={editFormData.alternativeNumber}
                                onChange={(phone) =>
                                  handleEditChange({ target: { name: "alternativeNumber", value: phone } })
                                }
                                specialLabel=""
                                inputStyle={phoneInputStyle}
                                buttonStyle={phoneButtonStyle}
                              />
                            </div>
                            {editErrors.alternativeNumber && (
                              <p className="text-red-500 text-xs mt-1">Invalid phone number format</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Client Type
                            </label>
                            <select
                              name="clientType"
                              value={editFormData.clientType}
                              onChange={handleEditChange}
                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition"
                            >
                              <option value="">Select Client Type</option>
                              <option value="B2B">B2B</option>
                              <option value="B2C">B2C</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Address
                            </label>
                            <input
                              name="address"
                              value={editFormData.address}
                              onChange={handleEditChange}
                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Country
                            </label>
                            <select
                              name="country"
                              value={editFormData.country}
                              onChange={handleEditChange}
                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition"
                            >
                              <option value="">Select Country</option>
                              {countries.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={cancelEditDetails}
                          disabled={isSavingDetails}
                          className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={saveDetails}
                          disabled={isSavingDetails}
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {isSavingDetails ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />
                          ) : (
                            <Save size={16} />
                          )}
                          Save Changes
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              </>
            )}

            {/* Attachments Card */}
            {activeTab === "attachments" && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Attachments
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                      Files and documents related to this deal
                    </p>
                  </div>
                  <label
                    className={`inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex-shrink-0 cursor-pointer ${isUploadingAttachment ? "opacity-50 pointer-events-none" : ""}`}
                  >
                    <Plus size={15} />
                    {isUploadingAttachment ? "Uploading…" : "Upload"}
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      disabled={isUploadingAttachment}
                      onChange={(e) => { handleUploadAttachments(e.target.files); e.target.value = ""; }}
                    />
                  </label>
                </div>
                <div className="p-6">
                  {deal.attachments && deal.attachments.length > 0 ? (
                    <ul className="space-y-3">
                      {deal.attachments.map((file, idx) => {
                        const fileName = file.name || file.path?.split("/").pop() || `File ${idx + 1}`;
                        const filePath = file.path || "";
                        const mimeType = file.type || "";
                        const cat = getFileCategory(fileName, mimeType);
                        const style = FILE_STYLES[cat];
                        const showPreviewBtn = canPreview(fileName, mimeType);
                        const isLoadingThis = previewLoading === idx;

                        return (
                          <li
                            key={idx}
                            className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors"
                          >
                            {/* File info */}
                            <div className="flex items-center min-w-0 flex-1">
                              <div className={`p-3 rounded-lg mr-4 flex-shrink-0 ${style.bg}`}>
                                <FileText size={20} className={style.icon} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">
                                  {fileName}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {cat.toUpperCase()}
                                  {file.size > 0 && <span> • {formatFileSize(file.size)}</span>}
                                  {file.source && (
                                    <span className={`ml-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                                      file.source === "lead"
                                        ? "bg-purple-100 text-purple-700"
                                        : "bg-blue-100 text-blue-700"
                                    }`}>
                                      {file.source}
                                    </span>
                                  )}
                                  {file.uploadedAt && (
                                    <span> • {new Date(file.uploadedAt).toLocaleDateString()}</span>
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                              {/* Preview button — only for image/pdf/text */}
                              {showPreviewBtn && (
                                <button
                                  onClick={() => openPreview(file, idx)}
                                  disabled={isLoadingThis}
                                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-60"
                                  title="Preview file"
                                >
                                  {isLoadingThis ? (
                                    <span className="inline-block w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Eye size={15} />
                                  )}
                                  <span className="hidden sm:inline">
                                    {isLoadingThis ? "Loading…" : "Preview"}
                                  </span>
                                </button>
                              )}

                              {/* Download button — always shown */}
                              <button
                                onClick={() => downloadFile(filePath, fileName)}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Download file"
                              >
                                <Download size={15} />
                                <span className="hidden sm:inline">Download</span>
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Paperclip size={24} className="text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium">No attachments found</p>
                      <p className="text-slate-400 text-sm mt-1">
                        Files uploaded with this deal will appear here
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Activity Card — unified live feed from the backend */}
            {activeTab === "activity" && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Activity Timeline
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Everything that happened on this deal, in one place
                  </p>
                </div>
                <div className="p-6 max-h-[405px] overflow-y-auto">
                  {isActivityLoading ? (
                    <p className="text-sm text-slate-500">Loading activity…</p>
                  ) : activityFeed.length === 0 ? (
                    <p className="text-sm text-slate-500">No activity recorded yet.</p>
                  ) : (
                    <div className="relative">
                      {/* Connecting line — runs behind every icon, center to
                          center, so consecutive events read as one continuous
                          timeline instead of disconnected blocks. */}
                      {activityFeed.length > 1 && (
                        <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-slate-200" />
                      )}
                      {activityFeed.map((event, idx) => {
                        const meta = ACTIVITY_TYPE_META[event.type] || ACTIVITY_TYPE_META.default;
                        const Icon = meta.icon;
                        return (
                          <div
                            key={`${event.type}-${event.timestamp}-${idx}`}
                            className={`flex items-start ${idx !== activityFeed.length - 1 ? "mb-8" : ""}`}
                          >
                            <div className="flex-shrink-0">
                              <div className={`relative z-10 w-10 h-10 ${meta.bg} rounded-full flex items-center justify-center`}>
                                <Icon size={16} className={meta.iconColor} />
                              </div>
                            </div>
                            <div className="ml-4">
                              <h3 className="text-sm font-medium text-slate-900">{event.description}</h3>
                              <p className="text-sm text-slate-500 mt-1">
                                {event.performedBy?.name ? `${event.performedBy.name} — ` : ""}
                                {event.timestamp
                                  ? new Date(event.timestamp).toLocaleString("en-US", {
                                      month: "long", day: "numeric", year: "numeric",
                                      hour: "2-digit", minute: "2-digit",
                                    })
                                  : ""}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Follow-up History Tab */}
            {activeTab === "followup" && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                <div className="p-6 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">
                        Follow-up History
                      </h2>
                      <p className="text-sm text-slate-600 mt-1">
                        Track all follow-ups for this deal (Most recent first)
                      </p>
                    </div>
                    {!deal.followUpDate && (
                      <button
                        onClick={() => setIsFollowUpModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
                      >
                        <Plus size={16} />
                        Schedule First Follow-up
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  {/* Current Follow-up */}
                  {deal.followUpDate ? (
                    <div className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                          <Clock size={16} className="text-purple-600" />
                          Upcoming Follow-up
                        </h3>
                        <button
                          onClick={() => {
                            setFollowUpData({
                              followUpDate: new Date(deal.followUpDate),
                              followUpComment: deal.followUpComment || ""
                            });
                            setIsFollowUpModalOpen(true);
                          }}
                          className="text-sm text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"
                        >
                          <Edit size={14} />
                          Reschedule
                        </button>
                      </div>
                      <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-slate-700">
                              Date & Time
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              <Calendar size={18} className="text-purple-500" />
                              <span className="text-lg font-semibold text-slate-900">
                                {new Date(deal.followUpDate).toLocaleDateString("en-US", {
                                  weekday: "long",
                                  month: "long",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-2">
                              <Clock size={18} className="text-purple-500" />
                              <span className="text-lg font-semibold text-slate-900">
                                {new Date(deal.followUpDate).toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                })}
                              </span>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-700">
                              Status
                            </p>
                            <div className="mt-2">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                                <Clock size={14} className="mr-1" />
                                Scheduled
                              </span>
                            </div>
                          </div>
                        </div>

                        {deal.followUpComment && (
                          <div className="mt-4 pt-4 border-t border-purple-200">
                            <p className="text-sm font-medium text-slate-700 mb-2">
                              Notes
                            </p>
                            <div className="bg-white rounded-lg p-4 border border-purple-100">
                              <p className="text-slate-700">
                                {deal.followUpComment}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-8 p-6 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <p className="text-slate-600 font-medium mb-4">
                        At present there is no follow-up
                      </p>
                      <button
                        onClick={() => setIsFollowUpModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition shadow-sm"
                      >
                        <Plus size={16} />
                        Schedule Follow-up
                      </button>
                    </div>
                  )}

                  {/* Past Follow-ups - Sorted Most Recent First */}
                  {deal.followUpHistory && (() => {
                    const filteredHistory = deal.followUpHistory.filter(h => h.action !== "Scheduled");
                    if (filteredHistory.length === 0) return null;

                    return (
                      <div className="mt-8">
                        <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                          <Archive size={16} className="text-slate-600" />
                          Past Follow-ups ({filteredHistory.length})
                        </h3>

                        <div className="space-y-4">
                          {/* Sort the history array by date in descending order (most recent first) */}
                          {(() => {
                            const sortedHistory = [...filteredHistory].sort((a, b) => {
                              const dateA = a.date ? new Date(a.date).getTime() : 0;
                              const dateB = b.date ? new Date(b.date).getTime() : 0;
                              return dateB - dateA;
                            });
                          
                          const totalPages = Math.ceil(sortedHistory.length / ITEMS_PER_PAGE);
                          const startIndex = (followUpPage - 1) * ITEMS_PER_PAGE;
                          const currentItems = sortedHistory.slice(startIndex, startIndex + ITEMS_PER_PAGE);

                          return (
                            <>
                              {currentItems.map((followUp, index) => {
                                const actionDate = followUp.date
                                  ? new Date(followUp.date)
                                  : null;
                                const scheduledDate = followUp.followUpDate
                                  ? new Date(followUp.followUpDate)
                                  : null;

                                const outcome = followUp.outcome || (followUp.action === "Scheduled" ? "Scheduled" : followUp.action) || "Completed";

                                return (
                                  <div
                                    key={index}
                                    className="border border-slate-200 rounded-xl p-5 hover:bg-slate-50 transition"
                                  >
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <div className="flex items-center gap-3">
                                          <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                              outcome === "Successful" ||
                                              outcome === "Completed"
                                                ? "bg-green-100"
                                                : outcome === "Rescheduled"
                                                  ? "bg-yellow-100"
                                                  : outcome === "Cancelled"
                                                    ? "bg-red-100"
                                                    : outcome === "Created" ||
                                                      outcome === "Updated"
                                                      ? "bg-blue-100"
                                                      : "bg-gray-100"
                                            }`}
                                          >
                                            {outcome === "Successful" ||
                                            outcome === "Completed" ? (
                                              <CheckCircle
                                                size={20}
                                                className="text-green-600"
                                              />
                                            ) : outcome === "Rescheduled" ? (
                                              <RefreshCw
                                                size={20}
                                                className="text-yellow-600"
                                              />
                                            ) : outcome === "Cancelled" ? (
                                              <XCircle
                                                size={20}
                                                className="text-red-600"
                                              />
                                            ) : outcome === "Created" ? (
                                              <Plus
                                                size={20}
                                                className="text-blue-600"
                                              />
                                            ) : outcome === "Updated" ? (
                                              <Edit
                                                size={20}
                                                className="text-blue-600"
                                              />
                                            ) : (
                                              <CheckCircle
                                                size={20}
                                                className="text-gray-600"
                                              />
                                            )}
                                          </div>
                                          <div>
                                            <h4 className="font-medium text-slate-900">
                                              Follow-up {outcome}
                                            </h4>
                                            <div className="flex items-center gap-4 mt-1">
                                              {actionDate ? (
                                                <>
                                                  <div className="flex items-center gap-1 text-sm text-slate-600">
                                                    <span className="font-medium text-slate-700 mr-1">Logged:</span>
                                                    <Calendar size={14} />
                                                    <span>
                                                      {actionDate.toLocaleDateString(
                                                        "en-US",
                                                        {
                                                          month: "short",
                                                          day: "numeric",
                                                          year: "numeric",
                                                        }
                                                      )}
                                                    </span>
                                                  </div>
                                                  <div className="flex items-center gap-1 text-sm text-slate-600">
                                                    <Clock size={14} />
                                                    <span>
                                                      {actionDate.toLocaleTimeString(
                                                        "en-US",
                                                        {
                                                          hour: "2-digit",
                                                          minute: "2-digit",
                                                          hour12: true,
                                                        }
                                                      )}
                                                    </span>
                                                  </div>
                                                </>
                                              ) : (
                                                <span className="text-sm text-slate-500">
                                                  Date not available
                                                </span>
                                              )}
                                            </div>

                                            {/* Show when it was scheduled for (if different from action date) */}
                                            {scheduledDate && actionDate &&
                                              Math.abs(scheduledDate.getTime() - actionDate.getTime()) > 1000 && (
                                                <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                                  <span>Scheduled for: </span>
                                                  <span className="font-medium">
                                                    {scheduledDate.toLocaleDateString(
                                                      "en-US",
                                                      {
                                                        month: "short",
                                                        day: "numeric",
                                                      }
                                                    )}
                                                  </span>
                                                  <span className="mx-1">at</span>
                                                  <span className="font-medium">
                                                    {scheduledDate.toLocaleTimeString(
                                                      "en-US",
                                                      {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                      }
                                                    )}
                                                  </span>
                                                </div>
                                              )}
                                          </div>
                                        </div>

                                        <div className="mt-4">
                                          <p className="text-sm font-medium text-slate-700 mb-2">
                                            Agenda / Plan
                                          </p>
                                          <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                                            <p className="text-slate-700">
                                              {followUp.followUpComment || <span className="text-slate-400 italic">No agenda provided</span>}
                                            </p>
                                          </div>
                                        </div>

                                        {followUp.action !== "Scheduled" && (
                                          <div className="mt-4">
                                            <p className="text-sm font-medium text-slate-700 mb-2">
                                              Meeting Summary
                                            </p>
                                            <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                                              <p className="text-slate-700">
                                                {followUp.notes || <span className="text-slate-400 italic">No summary provided</span>}
                                              </p>
                                            </div>
                                          </div>
                                        )}

                                        {followUp.changedBy && (followUp.changedBy.firstName || followUp.changedBy.lastName) && (
                                          <div className="mt-4">
                                            <p className="text-sm font-medium text-slate-700">
                                              Updated by
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                                                <User
                                                  size={14}
                                                  className="text-slate-600"
                                                />
                                              </div>
                                              <span className="text-sm text-slate-700">
                                                {followUp.changedBy.firstName || "User"}{" "}
                                                {followUp.changedBy.lastName || ""}
                                              </span>
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      <div className="text-right">
                                        <span
                                          className={`text-xs px-3 py-1 rounded-full font-medium ${
                                            outcome === "Successful" ||
                                            outcome === "Completed"
                                              ? "bg-green-100 text-green-800"
                                              : outcome === "Rescheduled"
                                                ? "bg-yellow-100 text-yellow-800"
                                                : outcome === "Cancelled"
                                                  ? "bg-red-100 text-red-800"
                                                  : outcome === "Created" ||
                                                    outcome === "Updated"
                                                    ? "bg-blue-100 text-blue-800"
                                                    : "bg-gray-100 text-gray-800"
                                          }`}
                                        >
                                          {outcome}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}

                              {totalPages > 1 && (
                                <div className="flex items-center justify-between border-t border-slate-200 bg-white pt-6 mt-6">
                                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                    <div>
                                      <p className="text-sm text-slate-700">
                                        Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(startIndex + ITEMS_PER_PAGE, sortedHistory.length)}</span> of <span className="font-medium">{sortedHistory.length}</span> results
                                      </p>
                                    </div>
                                    <div>
                                      <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                        <button
                                          onClick={() => setFollowUpPage(p => Math.max(1, p - 1))}
                                          disabled={followUpPage === 1}
                                          className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 transition-colors"
                                        >
                                          <span className="sr-only">Previous</span>
                                          <ChevronLeft size={16} />
                                        </button>
                                        
                                        {Array.from({ length: totalPages }).map((_, i) => (
                                          <button
                                            key={i}
                                            onClick={() => setFollowUpPage(i + 1)}
                                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus:outline-offset-0 transition-colors ${
                                              followUpPage === i + 1 
                                                ? 'z-10 bg-purple-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600' 
                                                : 'text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50'
                                            }`}
                                          >
                                            {i + 1}
                                          </button>
                                        ))}
                                        
                                        <button
                                          onClick={() => setFollowUpPage(p => Math.min(totalPages, p + 1))}
                                          disabled={followUpPage === totalPages}
                                          className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 transition-colors"
                                        >
                                          <span className="sr-only">Next</span>
                                          <ChevronRight size={16} />
                                        </button>
                                      </nav>
                                    </div>
                                  </div>
                                  
                                  {/* Mobile Pagination */}
                                  <div className="flex flex-1 justify-between sm:hidden">
                                    <button
                                      onClick={() => setFollowUpPage(p => Math.max(1, p - 1))}
                                      disabled={followUpPage === 1}
                                      className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                    >
                                      Previous
                                    </button>
                                    <button
                                      onClick={() => setFollowUpPage(p => Math.min(totalPages, p + 1))}
                                      disabled={followUpPage === totalPages}
                                      className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                    >
                                      Next
                                    </button>
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Notes Tab */}
            {activeTab === "notes" && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-lg font-semibold text-slate-900">Notes</h2>
                  <p className="text-sm text-slate-600 mt-1">Newest first</p>
                </div>
                <div className="p-6 border-b border-slate-100">
                  <textarea
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Write a note…"
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={handleAddNote}
                      disabled={isAddingNote || !newNoteText.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {isAddingNote ? "Adding…" : "Add Note"}
                    </button>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {isNotesLoading ? (
                    <p className="text-sm text-slate-500">Loading notes…</p>
                  ) : notes.length === 0 ? (
                    <p className="text-sm text-slate-500">No notes yet.</p>
                  ) : (
                    notes.map((n) => (
                      <div key={n._id} className={`p-4 rounded-lg border ${n.seed ? "bg-slate-50 border-slate-200" : "bg-white border-slate-200"}`}>
                        <p className="text-sm text-slate-800 whitespace-pre-wrap break-words">{n.text}</p>
                        <p className="text-xs text-slate-500 mt-2">
                          {n.seed ? "Original note — " : ""}
                          {n.createdBy?.name || "Unknown"}
                          {n.createdAt && ` — ${new Date(n.createdAt).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}`}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Proposal Tab */}
            {activeTab === "proposal" && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Proposals</h2>
                    <p className="text-sm text-slate-600 mt-1">Sent to this deal's contact</p>
                  </div>
                  <button
                    onClick={() => navigate(`/${tenantSlug}/proposal/sendproposal`, { state: { presetDealId: deal._id, returnToDealId: deal._id } })}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex-shrink-0"
                  >
                    <Plus size={15} />
                    New Proposal
                  </button>
                </div>
                <div className="p-6 space-y-3">
                  {isProposalsLoading ? (
                    <p className="text-sm text-slate-500">Loading proposals…</p>
                  ) : dealProposals.length === 0 ? (
                    <p className="text-sm text-slate-500">No proposals yet.</p>
                  ) : (
                    dealProposals.map((p) => {
                      // Drafts have nothing to view yet — open them in the same
                      // edit-and-send flow the Drafts page itself uses
                      // (proposal + isEditing prefill), so "Send" here behaves
                      // identically to sending from Drafts, just returning to
                      // this Deal page afterward instead of the Proposal list.
                      const goToProposal = () => {
                        if (p.status === "draft") {
                          navigate(`/${tenantSlug}/proposal/sendproposal`, {
                            state: { proposal: p, isEditing: true, returnToDealId: deal._id },
                          });
                        } else {
                          navigate(`/${tenantSlug}/proposal/view/${p._id}`);
                        }
                      };
                      return (
                        <div
                          key={p._id}
                          onClick={goToProposal}
                          className="p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 cursor-pointer transition-colors flex items-center justify-between gap-4"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-900">{p.title}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {p.createdAt && new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              {p.lastUpdatedBy?.name ? ` — last updated by ${p.lastUpdatedBy.name}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={p.status}
                              onChange={(e) => handleProposalStatusChange(p._id, e.target.value)}
                              disabled={p.status === "draft"}
                              title={p.status === "draft" ? "Send this draft first (it hasn't been emailed yet) before its status can change" : ""}
                              className={`text-xs font-medium px-2 py-1 rounded-full border capitalize ${p.status === "draft" ? "opacity-60 cursor-not-allowed" : "cursor-pointer"} ${PROPOSAL_STATUS_STYLES[p.status] || "bg-slate-100 text-slate-700 border-slate-200"}`}
                            >
                              <option value="draft" disabled={p.status !== "draft"}>Draft</option>
                              <option value="sent">Sent</option>
                              <option value="no reply">No Reply</option>
                              <option value="rejection">Rejection</option>
                              <option value="success">Success</option>
                            </select>
                            {p.status === "draft" && (
                              <button
                                onClick={goToProposal}
                                className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                              >
                                Finish & Send
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Invoice Tab */}
            {activeTab === "invoice" && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Invoices</h2>
                    <p className="text-sm text-slate-600 mt-1">Billed to this deal</p>
                  </div>
                  <button
                    onClick={() => { setEditingInvoiceForModal(null); openInvoiceModal(); }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex-shrink-0"
                  >
                    <Plus size={15} />
                    New Invoice
                  </button>
                </div>
                <div className="p-6 space-y-3">
                  {isInvoicesLoading ? (
                    <p className="text-sm text-slate-500">Loading invoices…</p>
                  ) : dealInvoices.length === 0 ? (
                    <p className="text-sm text-slate-500">No invoices yet.</p>
                  ) : (
                    dealInvoices.map((inv) => (
                      <div
                        key={inv._id}
                        onClick={() => { setEditingInvoiceForModal(inv); openInvoiceModal(); }}
                        className="p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 cursor-pointer transition-colors flex items-center justify-between gap-4"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900">#{inv.invoicenumber}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {inv.dueDate && `Due ${new Date(inv.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                            {inv.amountPaid ? ` — ${inv.amountPaid} ${inv.currency} paid` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleSendInvoiceEmail(inv._id)}
                            disabled={sendingInvoiceEmailId === inv._id}
                            className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                          >
                            {sendingInvoiceEmailId === inv._id ? "Sending…" : "Send to Email"}
                          </button>
                          <span
                            className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
                              inv.status === "paid"
                                ? "bg-green-100 text-green-700"
                                : inv.status === "partially_paid"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {inv.status?.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Meeting Tab */}
            {activeTab === "meeting" && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Meetings</h2>
                    <p className="text-sm text-slate-600 mt-1">Scheduled with this deal's contact</p>
                  </div>
                  <button
                    onClick={() => setIsMeetingModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex-shrink-0"
                  >
                    <Plus size={15} />
                    Schedule Meeting
                  </button>
                </div>
                <div className="p-6 space-y-3">
                  {isMeetingsLoading ? (
                    <p className="text-sm text-slate-500">Loading meetings…</p>
                  ) : dealMeetings.length === 0 ? (
                    <p className="text-sm text-slate-500">No meetings scheduled yet.</p>
                  ) : (
                    dealMeetings.map((m) => {
                      const isUpcoming = m.status === "scheduled" && new Date(m.startDateTime) > new Date();
                      return (
                        <div
                          key={m._id}
                          onClick={() => navigate(`/${tenantSlug}/meetings`)}
                          className="p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 cursor-pointer transition-colors flex items-center justify-between gap-4"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-900">{m.title}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {m.startDateTime && new Date(m.startDateTime).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              {" — "}{m.provider === "zoom" ? "Zoom" : "Google Meet"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            {isUpcoming && (
                              <>
                                <button
                                  onClick={() => navigate(`/${tenantSlug}/meetings`)}
                                  className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleCancelMeeting(m._id)}
                                  className="text-xs font-medium px-2.5 py-1 rounded-full bg-white border border-orange-300 text-orange-600 hover:bg-orange-50 transition-colors"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 capitalize">
                              {m.status}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Email Tab */}
            {activeTab === "email" && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Emails</h2>
                    <p className="text-sm text-slate-600 mt-1">Campaign sends to this deal's contact</p>
                  </div>
                  <button
                    onClick={() => navigate(`/${tenantSlug}/create-email`, { state: { selectedContacts: deal.email ? [{ name: deal.dealName || deal.email, email: deal.email, type: "deal" }] : [] } })}
                    disabled={!deal.email}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex-shrink-0 disabled:opacity-50"
                  >
                    <Mail size={15} />
                    Send Email
                  </button>
                </div>
                <div className="p-6 space-y-3">
                  {isEmailsLoading ? (
                    <p className="text-sm text-slate-500">Loading emails…</p>
                  ) : dealEmails.length === 0 ? (
                    <p className="text-sm text-slate-500">No emails sent to this contact yet.</p>
                  ) : (
                    dealEmails.map((e) => (
                      <div
                        key={e._id}
                        onClick={() => navigate(`/${tenantSlug}/${e.status === "scheduled" ? "scheduled-emails" : "email-history"}`)}
                        className="p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 cursor-pointer transition-colors flex items-center justify-between gap-4"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900">{e.subject}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {(e.scheduledFor || e.createdAt) &&
                              new Date(e.scheduledFor || e.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 capitalize flex-shrink-0">
                          {e.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200 p-5">
              <h3 className="text-sm font-medium text-slate-700 mb-3 uppercase tracking-wide">
                Deal Status
              </h3>
              <div
                className={`inline-flex items-center px-4 py-2 rounded-full ${stageConfig.bgColor} ${stageConfig.color} border ${stageConfig.borderColor} mb-4`}
              >
                <StageIcon size={16} className="mr-2" />
                <span className="capitalize font-medium text-sm">
                  {stageConfig.label}
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-2">
                Last updated {new Date(deal.updatedAt).toLocaleDateString()}
              </p>
            </div>

            {/* Company Card */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200 p-5">
              <h3 className="text-sm font-medium text-slate-700 mb-4 uppercase tracking-wide">
                Company
              </h3>
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mr-3">
                  <Building size={20} className="text-slate-600" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">
                    {deal.companyName || "Unknown Company"}
                  </h4>
                </div>
              </div>
              <div className="space-y-2">
                {deal.email && (
                  <a
                    href={`mailto:${deal.email}`}
                    className="flex items-center text-sm text-slate-600 hover:text-blue-600 transition-colors"
                  >
                    <Mail size={14} className="mr-2" />
                    {deal.email}
                  </a>
                )}
                {deal.phoneNumber && (
                  <div className="flex items-center text-sm text-slate-600">
                    <Phone size={14} className="mr-2" />
                    {deal.phoneNumber}
                  </div>
                )}
                {deal.alternativeEmail && (
                  <a
                    href={`mailto:${deal.alternativeEmail}`}
                    className="flex items-center text-sm text-slate-600 hover:text-blue-600 transition-colors"
                  >
                    <Mail size={14} className="mr-2" />
                    {deal.alternativeEmail}
                    <span className="ml-1 text-xs text-slate-400">(alt)</span>
                  </a>
                )}
                {deal.alternativeNumber && (
                  <div className="flex items-center text-sm text-slate-600">
                    <Phone size={14} className="mr-2" />
                    {deal.alternativeNumber}
                    <span className="ml-1 text-xs text-slate-400">(alt)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200 p-5">
              <h3 className="text-sm font-medium text-slate-700 mb-4 uppercase tracking-wide">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    if (deal.followUpDate) {
                      setFollowUpData({
                        followUpDate: new Date(deal.followUpDate),
                        followUpComment: deal.followUpComment || ""
                      });
                    }
                    setIsFollowUpModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left text-slate-700 hover:bg-purple-50 rounded-lg transition-colors"
                >
                  <Calendar size={16} className="text-purple-600" />
                  {deal.followUpDate ? "Reschedule Follow-up" : "Schedule Follow-up"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Pipeline_modal_view;