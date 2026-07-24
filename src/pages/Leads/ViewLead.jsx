import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft, ChevronRight, User, Mail, Phone, Building, Building2,
  FileText, Calendar, Clock, Paperclip, Download, Eye,
  X, FileImage, File, AlertCircle, Loader2, Edit, Save, BookOpen,
  Handshake, Ban, MapPin, Globe, MessageSquarePlus, Upload, Trash2,
} from "lucide-react";
import { toast } from "react-toastify";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { getNames } from "country-list";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";

const countryNames = getNames();

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

const API_URL = import.meta.env.VITE_API_URL;

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

const formatNotesMeta = (record) => {
  const authorName = record?.notesUpdatedBy
    ? `${record.notesUpdatedBy.firstName || ""} ${record.notesUpdatedBy.lastName || ""}`.trim()
    : "";
  const dateLabel = record?.notesUpdatedAt
    ? new Date(record.notesUpdatedAt).toLocaleDateString("en-US", {
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

const NotesPopup = ({ record, onClose }) => {
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
              <span className="text-xs text-slate-500">{formatNotesMeta(record)}</span>
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
          <p className="text-slate-800 whitespace-pre-wrap break-words">{record.notes}</p>
        </div>
      </div>
    </div>
  );
};

// ─── Follow-up note voice attachment ─────────
// Kept in sync with the backend's extension maps (middlewares/upload.js,
// routes/files.routes.js) — this upload only accepts audio files.
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

const FollowUpAudioPlayer = ({ audioPath }) => {
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
      <p className="text-xs text-slate-400 flex items-center gap-1 mt-2">
        <Loader2 className="w-3 h-3 animate-spin" /> Loading recording…
      </p>
    );
  }
  if (status === "error") {
    return <p className="text-xs text-red-400 mt-2">Could not load recording</p>;
  }
  return <audio controls src={src} className="w-full mt-2 h-9" />;
};

// ─── MIME map ────────────────────────────────
const EXT_TO_MIME = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
  gif: "image/gif",  webp: "image/webp", svg: "image/svg+xml",
  bmp: "image/bmp",  tiff: "image/tiff", tif: "image/tiff",
  ico: "image/x-icon", avif: "image/avif",
  pdf: "application/pdf",
  txt: "text/plain", csv: "text/csv", log: "text/plain",
  md:  "text/plain", json: "application/json", xml: "application/xml",
};

// ─── Helpers ─────────────────────────────────
const getExt      = (name = "") => (name.split(".").pop() || "").toLowerCase().trim();
const getMime     = (file)      => EXT_TO_MIME[getExt(file.name)] || "application/octet-stream";
const formatSize  = (b)         => !b ? "" : b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;

const getCategory = (file) => {
  const ext = getExt(file.name);
  if (["jpg","jpeg","png","gif","webp","svg","bmp","tiff","tif","ico","avif","heic","heif"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (["txt","csv","log","md","json","xml","yaml","yml"].includes(ext)) return "text";
  const mime = (file.type || "").toLowerCase();
  if (mime.startsWith("image/"))  return "image";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("text/"))   return "text";
  return "other";
};

const canPreview = (file) => ["image","pdf","text"].includes(getCategory(file));

const STYLES = {
  image: { bg: "bg-green-100",  fg: "text-green-600",  Icon: FileImage },
  pdf:   { bg: "bg-red-100",    fg: "text-red-600",    Icon: FileText  },
  text:  { bg: "bg-yellow-100", fg: "text-yellow-600", Icon: FileText  },
  other: { bg: "bg-blue-100",   fg: "text-blue-600",   Icon: File      },
};

// ─── Authenticated fetch → ArrayBuffer ───────
const authFetch = async (filePath, signal) => {
  const token = localStorage.getItem("token");
  const res   = await fetch(
    `${API_URL}/files/preview?filePath=${encodeURIComponent(filePath)}`,
    { headers: { Authorization: `Bearer ${token}` }, signal }
  );
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`HTTP ${res.status}: ${msg.slice(0, 120)}`);
  }
  return res.arrayBuffer();
};

// ════════════════════════════════════════════════════════════
// ImagePreview
// ════════════════════════════════════════════════════════════
const ImagePreview = ({ filePath, mime }) => {
  const [status,  setStatus]  = useState("loading"); // loading | done | error
  const [src,     setSrc]     = useState(null);
  const [errMsg,  setErrMsg]  = useState("");

  useEffect(() => {
    const ctrl = new AbortController();
    let   live = true;

    setStatus("loading");
    setSrc(null);
    setErrMsg("");

    authFetch(filePath, ctrl.signal)
      .then((buf) => {
        if (!live) return;
        if (buf.byteLength === 0) throw new Error("Server returned an empty file");
        const url = URL.createObjectURL(new Blob([buf], { type: mime }));
        setSrc(url);
        setStatus("done");
      })
      .catch((err) => {
        if (!live || err.name === "AbortError") return;
        console.error("ImagePreview fetch:", err.message);
        setErrMsg(err.message);
        setStatus("error");
      });

    return () => {
      live = false;
      ctrl.abort();
      // revoke after a short delay so the <img> finishes painting first
      setSrc((prev) => { if (prev) setTimeout(() => URL.revokeObjectURL(prev), 10000); return prev; });
    };
  }, [filePath, mime]);

  if (status === "loading") return (
    <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-400">
      <Loader2 size={48} className="animate-spin text-blue-500" />
      <p className="text-sm font-medium">Loading image…</p>
    </div>
  );

  if (status === "error") return (
    <div className="flex flex-col items-center justify-center py-28 gap-3 px-6 text-center">
      <AlertCircle size={52} className="text-red-400" />
      <p className="text-sm font-semibold text-slate-700">Could not load image</p>
      <p className="text-xs text-slate-400 max-w-sm break-words">{errMsg}</p>
    </div>
  );

  // status === "done" — just hand src to <img>, browser renders it
  return (
    <div className="flex items-center justify-center min-h-64 p-4 bg-slate-50">
      <img
        src={src}
        alt="Preview"
        className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-md"
        onError={(e) => {
          // last-resort fallback: try rendering the raw URL directly
          // (shouldn't be needed, but catches edge cases)
          console.warn("img onError — blob may be malformed");
          setErrMsg("Browser could not render this image format");
          setStatus("error");
        }}
      />
    </div>
  );
};

// ════════════════════════════════════════════════════════════
// PdfPreview
// ════════════════════════════════════════════════════════════
const PdfPreview = ({ filePath }) => {
  const [status, setStatus] = useState("loading");
  const [src,    setSrc]    = useState(null);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    const ctrl = new AbortController();
    let   live = true;

    setStatus("loading");

    authFetch(filePath, ctrl.signal)
      .then((buf) => {
        if (!live) return;
        const url = URL.createObjectURL(new Blob([buf], { type: "application/pdf" }));
        setSrc(url);
        setStatus("done");
      })
      .catch((err) => {
        if (!live || err.name === "AbortError") return;
        setErrMsg(err.message);
        setStatus("error");
      });

    return () => {
      live = false;
      ctrl.abort();
      setSrc((prev) => { if (prev) setTimeout(() => URL.revokeObjectURL(prev), 5000); return prev; });
    };
  }, [filePath]);

  if (status === "loading") return (
    <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-400">
      <Loader2 size={48} className="animate-spin text-blue-500" />
      <p className="text-sm font-medium">Loading PDF…</p>
    </div>
  );
  if (status === "error") return (
    <div className="flex flex-col items-center justify-center py-28 gap-3 text-center px-6">
      <AlertCircle size={52} className="text-red-400" />
      <p className="text-sm font-semibold text-slate-700">Could not load PDF</p>
      <p className="text-xs text-slate-400">{errMsg}</p>
    </div>
  );
  return <iframe src={src} title="PDF" className="w-full border-0" style={{ height: "76vh" }} />;
};

// ════════════════════════════════════════════════════════════
// TextPreview
// ════════════════════════════════════════════════════════════
const TextPreview = ({ filePath }) => {
  const [status,  setStatus]  = useState("loading");
  const [content, setContent] = useState("");
  const [errMsg,  setErrMsg]  = useState("");

  useEffect(() => {
    const ctrl = new AbortController();
    let   live = true;

    const token = localStorage.getItem("token");
    fetch(`${API_URL}/files/preview?filePath=${encodeURIComponent(filePath)}`, {
      headers: { Authorization: `Bearer ${token}` }, signal: ctrl.signal,
    })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
      .then((t)  => { if (!live) return; setContent(t); setStatus("done"); })
      .catch((err) => { if (!live || err.name === "AbortError") return; setErrMsg(err.message); setStatus("error"); });

    return () => { live = false; ctrl.abort(); };
  }, [filePath]);

  if (status === "loading") return (
    <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
      <Loader2 size={40} className="animate-spin text-blue-500" />
      <p className="text-sm">Loading…</p>
    </div>
  );
  if (status === "error") return (
    <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
      <AlertCircle size={44} className="text-red-400" />
      <p className="text-sm text-slate-600">{errMsg}</p>
    </div>
  );
  return (
    <pre className="whitespace-pre-wrap text-sm text-slate-700 bg-white p-4 m-3 rounded-lg border border-slate-200 max-h-[70vh] overflow-auto font-mono leading-relaxed">
      {content}
    </pre>
  );
};

// ════════════════════════════════════════════════════════════
// PreviewModal
// ════════════════════════════════════════════════════════════
const PreviewModal = ({ file, onClose }) => {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={onClose}>
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden"
        style={{ maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <FileText size={20} className="text-slate-500 flex-shrink-0" />
            <span className="font-medium text-slate-900 truncate text-sm">{file.name}</span>
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-500 uppercase tracking-wide flex-shrink-0">
              {file.category}
            </span>
          </div>
          <button onClick={onClose} className="ml-4 p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={20} className="text-slate-600" />
          </button>
        </div>

        {/* Body — key forces full re-mount when file changes */}
        <div className="flex-1 overflow-auto bg-slate-50">
          {file.category === "image" && <ImagePreview key={file.path} filePath={file.path} mime={file.mime} />}
          {file.category === "pdf"   && <PdfPreview   key={file.path} filePath={file.path} />}
          {file.category === "text"  && <TextPreview  key={file.path} filePath={file.path} />}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-5 py-3 border-t border-slate-100 bg-white flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Small UI helpers ─────────────────────────
const InfoRow = ({ icon, label, value }) => (
  <div className="flex items-start text-slate-700">
    <span className="mr-3 text-slate-400 mt-0.5 flex-shrink-0">{icon}</span>
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <div className="text-slate-900 mt-0.5">{value}</div>
    </div>
  </div>
);

const ActivityItem = ({ color, icon, label, date }) => (
  <div className="flex items-start">
    <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center flex-shrink-0`}>{icon}</div>
    <div className="ml-4">
      <h3 className="text-sm font-medium text-slate-900">{label}</h3>
      <p className="text-sm text-slate-500 mt-0.5">{new Date(date).toLocaleString()}</p>
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════
// Main ViewLead
// ════════════════════════════════════════════════════════════
const ViewLead = () => {
  const { id, tenantSlug } = useParams();
  const navigate = useNavigate();
  const userRole = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}").role?.name || ""; }
    catch { return ""; }
  })();
  const [lead,        setLead]        = useState(null);
  const [activeTab,   setActiveTab]   = useState("details");
  const [previewFile, setPreviewFile] = useState(null);
  const [isNotesPopupOpen, setIsNotesPopupOpen] = useState(false);

  // Follow-up notes state
  const [addNoteModalOpen, setAddNoteModalOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const [audioFileUrl, setAudioFileUrl] = useState(null);
  const [audioFileError, setAudioFileError] = useState("");

  // Convert-to-deal state
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [converting, setConverting] = useState(false);
  const [dealData, setDealData] = useState({ value: "", currency: "USD", notes: "", stage: "Qualification" });

  // Reject state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Lead details edit state
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const [editErrors, setEditErrors] = useState({});
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [salesUsers, setSalesUsers] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    axios.get(`${API_URL}/leads/getLead/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setLead(r.data))
      .catch(() => toast.error("Failed to fetch lead details"));
  }, [id]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    axios.get(`${API_URL}/users/sales`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setSalesUsers(r.data.salesUsers || r.data.users || r.data || []))
      .catch(() => {});
  }, []);

  const startEditDetails = () => {
    setEditFormData({
      leadName: lead.leadName || "",
      companyName: lead.companyName || "",
      email: lead.email || "",
      phoneNumber: lead.phoneNumber || "",
      clientType: lead.clientType || "",
      requirement: lead.requirement || "",
      notes: lead.notes || "",
      address: lead.address || "",
      country: lead.country || "",
      assignTo: lead.assignTo?._id || "",
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

    if (name === "email") {
      setEditErrors((prev) => ({ ...prev, email: !!value && !validateEmail(value) }));
    }
    if (name === "phoneNumber") {
      setEditErrors((prev) => ({
        ...prev,
        phoneNumber: !!value && !isEffectivelyEmptyPhone(value) && !validatePhoneNumber(value),
      }));
    }
  };

  const saveDetails = async () => {
    if (!editFormData.leadName.trim()) return toast.error("Lead Name is required");
    if (!editFormData.companyName.trim()) return toast.error("Company Name is required");
    if (editFormData.email && !validateEmail(editFormData.email))
      return toast.error("Please enter a valid email address");
    if (
      editFormData.phoneNumber &&
      !isEffectivelyEmptyPhone(editFormData.phoneNumber) &&
      !validatePhoneNumber(editFormData.phoneNumber)
    )
      return toast.error("Please enter a valid phone number");

    try {
      setIsSavingDetails(true);
      const token = localStorage.getItem("token");

      const payload = {
        leadName: editFormData.leadName.trim(),
        companyName: editFormData.companyName.trim(),
        email: editFormData.email,
        phoneNumber: editFormData.phoneNumber,
        clientType: editFormData.clientType,
        requirement: editFormData.requirement,
        notes: editFormData.notes,
        address: editFormData.address,
        country: editFormData.country,
        assignTo: editFormData.assignTo,
        // updateLead always rebuilds attachments from this field — passing the
        // lead's current attachments back verbatim so this save doesn't wipe them.
        existingAttachments: JSON.stringify(lead.attachments || []),
      };

      const res = await axios.put(`${API_URL}/leads/updateLead/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setLead(res.data.lead);
      setIsEditingDetails(false);
      setEditFormData(null);
      toast.success(res.data.message || "Lead updated successfully");
    } catch (err) {
      console.error("Failed to update lead:", err);
      toast.error(err.response?.data?.message || "Failed to update lead");
    } finally {
      setIsSavingDetails(false);
    }
  };

  // ── Follow-up Notes ─────────────────────────
  const openAddNoteModal = () => {
    setNoteText("");
    setAudioFileError("");
    setAudioFile(null);
    setAudioFileUrl(null);
    setAddNoteModalOpen(true);
  };

  const discardAudioFile = () => {
    setAudioFileUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setAudioFile(null);
    setAudioFileError("");
  };

  const closeAddNoteModal = () => {
    setAddNoteModalOpen(false);
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
      return URL.createObjectURL(new Blob([file], { type: mime || file.type }));
    });
    setAudioFile(file);
  };

  const handleAddFollowUpNote = async () => {
    if (!noteText.trim()) return;

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
        `${API_URL}/leads/${id}/followup-notes`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setLead((prev) => ({ ...prev, followUpNotes: res.data.lead.followUpNotes }));
      toast.success("Follow-up note added");
      closeAddNoteModal();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add follow-up note");
    } finally {
      setSavingNote(false);
    }
  };

  // ── Convert to Deal ─────────────────────────
  const openConvertModal = () => {
    setDealData({
      value: lead.value || "",
      currency: lead.currency || "USD",
      notes: lead.notes || "",
      stage: "Qualification",
    });
    setConvertModalOpen(true);
  };

  const handleDealFieldChange = (field, value) => {
    setDealData((prev) => ({ ...prev, [field]: value }));
  };

  const handleConvertDeal = async () => {
    try {
      setConverting(true);
      const token = localStorage.getItem("token");
      const toastId = toast.loading("Converting lead to deal...");

      const response = await axios.patch(
        `${API_URL}/leads/${id}/convert`,
        { ...dealData },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.update(toastId, {
        render: response.data.message || "Lead converted to deal",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });

      setConvertModalOpen(false);
      setTimeout(() => navigate(`/${tenantSlug}/leads`), 1200);
    } catch (err) {
      toast.dismiss();
      console.error("Conversion error:", err);
      toast.error(err.response?.data?.message || "Failed to convert lead");
    } finally {
      setConverting(false);
    }
  };

  // ── Reject ───────────────────────────────────
  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) return toast.error("Please enter a reason for rejecting this lead");
    setRejecting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_URL}/leads/${id}/reject`,
        { reason: rejectReason.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Lead rejected");
      setShowRejectModal(false);
      setRejectReason("");
      setTimeout(() => navigate(`/${tenantSlug}/leads`), 1200);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reject lead");
    } finally {
      setRejecting(false);
    }
  };

/* ──  ─────────────────────── */
  const downloadFile = useCallback(async (filePath, fileName) => {
    if (!filePath) return toast.error("File path missing");
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(`${API_URL}/files/download?filePath=${encodeURIComponent(filePath)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf  = await res.arrayBuffer();
      const url  = URL.createObjectURL(new Blob([buf]));
      const a    = Object.assign(document.createElement("a"), { href: url, download: fileName || "file" });
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success("File downloaded successfully");
    } catch (e) { toast.error("Failed to download file"); }
  }, []);

/* ──  Preview Function ─────────────────────── */
  const openPreview = useCallback((file) => {
    if (!file.path) return toast.error("File path missing");
    setPreviewFile({ name: file.name, path: file.path, category: getCategory(file), mime: getMime(file) });
  }, []);

  if (!lead) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex items-center gap-3 text-slate-600">
        <Loader2 className="animate-spin h-6 w-6 text-blue-600" />
        <span>Loading lead details…</span>
      </div>
    </div>
  );

  const isTerminal = lead.status === "Rejected" || lead.status === "Converted";
  const canConvert = !isTerminal;
  const canReject = userRole === "Admin" && !isTerminal;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center text-slate-600 mb-3">
              <Link
                to={`/${tenantSlug}/leads`}
                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                <ArrowLeft size={16} className="mr-1" />
                All Leads
              </Link>
              <ChevronRight size={16} className="mx-2" />
              <span className="text-slate-500">View Lead</span>
            </div>
            <div className="flex items-center gap-4">
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                {lead.leadName}
              </h1>
              {lead.status === "Converted" && (
                <span className="text-xs px-3 py-1.5 rounded-full font-medium bg-green-50 text-green-700 border border-green-200">
                  Converted
                </span>
              )}
              {lead.status === "Rejected" && (
                <span className="text-xs px-3 py-1.5 rounded-full font-medium bg-red-50 text-red-700 border border-red-200">
                  Rejected
                </span>
              )}
            </div>
          </div>

          {(canConvert || canReject) && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {canConvert && (
                <button
                  onClick={openConvertModal}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Handshake size={16} />
                  Convert to Deal
                </button>
              )}
              {canReject && (
                <button
                  onClick={() => { setRejectReason(""); setShowRejectModal(true); }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Ban size={16} />
                  Reject
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-6">
          {["details", "attachments", "activity"].map((tab) => (
            <button
              key={tab}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === "attachments" &&
                lead.attachments &&
                lead.attachments.length > 0
                ? ` (${lead.attachments.length})`
                : ""}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">

            {/* ── Details ── */}
            {activeTab === "details" && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Lead Details</h2>
                    <p className="text-sm text-slate-600 mt-1">Comprehensive information about this lead</p>
                  </div>
                  {!isEditingDetails && !isTerminal && (
                    <button
                      onClick={startEditDetails}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                    >
                      <Edit size={15} />
                      Edit
                    </button>
                  )}
                </div>

                {!isEditingDetails ? (
                  <>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-5">
                        <h3 className="text-sm font-medium text-slate-700 uppercase tracking-wide">Client Information</h3>
                        <div className="space-y-4">
                          <InfoRow icon={<User size={18}/>}     label="Lead Name" value={lead.leadName} />
                          <InfoRow icon={<Building size={18}/>} label="Company"   value={lead.companyName || "Not specified"} />
                          <InfoRow icon={<Mail size={18}/>}     label="Email"
                            value={lead.email
                              ? <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">{lead.email}</a>
                              : "N/A"} />
                          <InfoRow icon={<Phone size={18}/>}    label="Phone"     value={lead.phoneNumber} />
                          <InfoRow icon={<Building2 size={18}/>} label="Client Type" value={lead.clientType || "Not specified"} />
                        </div>
                      </div>
                      <div className="space-y-5">
                        <h3 className="text-sm font-medium text-slate-700 uppercase tracking-wide">Lead Information</h3>
                        <div className="space-y-4">
                          <InfoRow icon={<FileText size={18}/>} label="Requirement" value={lead.requirement || "Not specified"} />
                          <InfoRow icon={<MapPin size={18}/>}   label="Address"     value={lead.address || "Not specified"} />
                          <InfoRow icon={<Globe size={18}/>}    label="Country"     value={lead.country || "Not specified"} />
                          <InfoRow icon={<Calendar size={18}/>} label="Created"     value={new Date(lead.createdAt).toLocaleDateString()} />
                          {lead.assignTo && (
                            <InfoRow icon={<User size={18}/>}   label="Assigned To"
                              value={`${lead.assignTo.firstName} ${lead.assignTo.lastName} (${lead.assignTo.email})`} />
                          )}
                        </div>
                      </div>
                    </div>

                    {lead.notes && (
                      <div className="mt-2 pt-6 border-t border-slate-200 p-6">
                        <button
                          type="button"
                          onClick={() => setIsNotesPopupOpen(true)}
                          className="w-full flex items-start text-left text-slate-700 hover:bg-slate-50 rounded-lg -mx-2 px-2 py-1 transition-colors group"
                        >
                          <BookOpen size={18} className="mr-3 mt-0.5 text-slate-500 flex-shrink-0 group-hover:text-blue-600 transition-colors" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium group-hover:text-blue-600 transition-colors uppercase tracking-wide">
                              Additional Notes
                            </p>
                            <p className="text-slate-900 truncate mt-1">{lead.notes}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{formatNotesMeta(lead)}</p>
                          </div>
                        </button>
                      </div>
                    )}

                    <div className="mt-2 pt-6 border-t border-slate-200 p-6">
                      {(() => {
                        const latestNote = Array.isArray(lead.followUpNotes) && lead.followUpNotes.length > 0
                          ? [...lead.followUpNotes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
                          : null;
                        return (
                          <button
                            type="button"
                            onClick={openAddNoteModal}
                            disabled={isTerminal}
                            className={`w-full flex items-start text-left text-slate-700 rounded-lg -mx-2 px-2 py-1 transition-colors group ${isTerminal ? "cursor-not-allowed opacity-60" : "hover:bg-slate-50"}`}
                          >
                            <MessageSquarePlus size={18} className="mr-3 mt-0.5 text-slate-500 flex-shrink-0 group-hover:text-blue-600 transition-colors" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium group-hover:text-blue-600 transition-colors uppercase tracking-wide">
                                Follow-up Notes
                              </p>
                              {latestNote ? (
                                <>
                                  <p className="text-slate-900 truncate mt-1">{latestNote.note}</p>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    Updated {new Date(latestNote.createdAt).toLocaleDateString("en-US", {
                                      month: "short", day: "numeric", year: "numeric",
                                    })}
                                  </p>
                                </>
                              ) : (
                                <p className="text-slate-500 mt-1">Tap to add a follow-up note</p>
                              )}
                            </div>
                          </button>
                        );
                      })()}
                    </div>
                  </>
                ) : (
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-slate-700 mb-1 uppercase tracking-wide">
                          Client Information
                        </h3>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Lead Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            name="leadName"
                            value={editFormData.leadName}
                            onChange={handleEditChange}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition"
                          />
                        </div>
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
                          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
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
                          <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
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
                          <label className="block text-sm font-medium text-slate-700 mb-1">Client Type</label>
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
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-slate-700 mb-1 uppercase tracking-wide">
                          Lead Information
                        </h3>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Requirement</label>
                          <textarea
                            name="requirement"
                            rows={3}
                            value={editFormData.requirement}
                            onChange={handleEditChange}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition resize-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                          <textarea
                            name="notes"
                            rows={4}
                            value={editFormData.notes}
                            onChange={handleEditChange}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition resize-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                          <input
                            name="address"
                            value={editFormData.address}
                            onChange={handleEditChange}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                          <select
                            name="country"
                            value={editFormData.country}
                            onChange={handleEditChange}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition"
                          >
                            <option value="">Select Country</option>
                            {countryNames.map((name) => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Assigned To</label>
                          <select
                            name="assignTo"
                            value={editFormData.assignTo}
                            onChange={handleEditChange}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition"
                          >
                            {salesUsers.map((u) => (
                              <option key={u._id} value={u._id}>
                                {u.firstName} {u.lastName}
                              </option>
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
            )}

            {/* ── Attachments ── */}
            {activeTab === "attachments" && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-lg font-semibold text-slate-900">Attachments</h2>
                  <p className="text-sm text-slate-600 mt-1">Files and documents related to this lead</p>
                </div>
                <div className="p-6">
                  {lead.attachments?.length > 0 ? (
                    <ul className="space-y-3">
                      {lead.attachments.map((file, idx) => {
                        const cat   = getCategory(file);
                        const s     = STYLES[cat];
                        return (
                          <li key={`${file.path}-${idx}`}
                            className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors"
                          >
                            <div className="flex items-center min-w-0 flex-1">
                              <div className={`p-3 rounded-lg mr-4 flex-shrink-0 ${s.bg}`}>
                                <s.Icon size={20} className={s.fg} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {cat.toUpperCase()}
                                  {file.size       && <span> • {formatSize(file.size)}</span>}
                                  {file.uploadedAt && <span> • {new Date(file.uploadedAt).toLocaleDateString()}</span>}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                              {canPreview(file) && (
                                <button
                                  onClick={() => openPreview(file)}
                                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                >
                                  <Eye size={15} />
                                  <span className="hidden sm:inline">Preview</span>
                                </button>
                              )}
                              <button
                                onClick={() => downloadFile(file.path, file.name)}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
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
                      <p className="text-slate-400 text-sm mt-1">Files uploaded with this lead will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Activity ── */}
            {activeTab === "activity" && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-lg font-semibold text-slate-900">Activity Timeline</h2>
                  <p className="text-sm text-slate-600 mt-1">Recent activities and updates for this lead</p>
                </div>
                <div className="p-6 space-y-6">
                  <ActivityItem color="bg-blue-100"    icon={<FileText size={16} className="text-blue-600"/>}    label="Lead created"       date={lead.createdAt} />
                  {lead.updatedAt      && <ActivityItem color="bg-emerald-100" icon={<Clock    size={16} className="text-emerald-600"/>} label="Lead updated"       date={lead.updatedAt} />}
                  {lead.followUpDate   && <ActivityItem color="bg-orange-100"  icon={<Calendar size={16} className="text-orange-600"/>}  label="Last Follow-Up"     date={lead.followUpDate} />}
                  {lead.lastReminderAt && <ActivityItem color="bg-yellow-100"  icon={<Clock    size={16} className="text-yellow-600"/>}  label="Last Reminder Sent" date={lead.lastReminderAt} />}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h3 className="text-sm font-medium text-slate-700 mb-4 uppercase tracking-wide">Client</h3>
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mr-3">
                  <User size={20} className="text-slate-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {lead.leadName}
                  </p>
                  <p className="text-xs text-slate-500">{lead.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {previewFile && <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
      {isNotesPopupOpen && <NotesPopup record={lead} onClose={() => setIsNotesPopupOpen(false)} />}

      {/* Add Follow-up Note Modal */}
      <Dialog open={addNoteModalOpen} onOpenChange={(open) => (open ? setAddNoteModalOpen(true) : closeAddNoteModal())}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <MessageSquarePlus className="w-5 h-5" />
              Follow-up Notes
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-slate-500 mb-1">
            {lead.leadName}
            {lead.companyName && ` · ${lead.companyName}`}
          </p>

          {(() => {
            const latestNote = Array.isArray(lead.followUpNotes) && lead.followUpNotes.length > 0
              ? [...lead.followUpNotes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
              : null;
            if (!latestNote) return null;
            return (
              <p className="text-xs text-slate-400 mb-3">
                Last updated {new Date(latestNote.createdAt).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                })}{" at "}
                {new Date(latestNote.createdAt).toLocaleTimeString("en-US", {
                  hour: "2-digit", minute: "2-digit",
                })}
              </p>
            );
          })()}

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
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm cursor-pointer ${savingNote ? "opacity-50 pointer-events-none" : ""}`}
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
                  className="text-slate-400 hover:text-red-500"
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
              <p className="text-xs text-slate-500 mt-2 truncate">{audioFile.name}</p>
            )}

            {audioFileUrl && (
              <audio controls src={audioFileUrl} className="w-full mt-2 h-9" />
            )}
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={closeAddNoteModal}
              className="px-4 py-2 rounded-lg border hover:bg-slate-100 text-slate-700"
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

          {Array.isArray(lead.followUpNotes) && lead.followUpNotes.length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-200">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Previous Notes
              </p>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {[...lead.followUpNotes]
                  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                  .map((n, i) => (
                    <div key={n._id || i} className="border border-slate-200 rounded-lg p-2.5">
                      <p className="text-sm text-slate-800 whitespace-pre-wrap">{n.note}</p>
                      {n.audioPath && <FollowUpAudioPlayer audioPath={n.audioPath} />}
                      <p className="text-xs text-slate-400 mt-1.5">
                        {new Date(n.createdAt).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}{" at "}
                        {new Date(n.createdAt).toLocaleTimeString("en-US", {
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}
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
            Rejecting <span className="font-semibold">{lead.leadName}</span>. It will be marked
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
              onClick={() => { setShowRejectModal(false); setRejectReason(""); }}
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
              Convert Lead to Deal
            </DialogTitle>
          </DialogHeader>

          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              Converting <strong>{lead.leadName}</strong>
              {lead.companyName && ` from ${lead.companyName}`}
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Deal Value</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={dealData.value}
                onChange={(e) => handleDealFieldChange("value", e.target.value)}
                placeholder="Enter deal value"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
            <div className="w-full px-3 py-2 border rounded-md bg-gray-50 text-gray-700">
              {dealData.stage || "Qualification"}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={dealData.notes}
              onChange={(e) => handleDealFieldChange("notes", e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:outline-none"
              placeholder="Any notes to carry over to the deal..."
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setConvertModalOpen(false)}
              className="px-4 py-2 rounded-lg border hover:bg-gray-100 text-gray-700"
              disabled={converting}
            >
              Cancel
            </button>

            <button
              onClick={handleConvertDeal}
              className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
              disabled={converting}
            >
              {converting ? "Converting..." : "Convert to Deal"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ViewLead;
