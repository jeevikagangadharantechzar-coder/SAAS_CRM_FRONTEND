import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import WhatsAppMessageModal from "../../components/whatsapp/WhatsAppMessageModal";
import axios from "axios";
import {
  ArrowLeft, ChevronRight, ChevronLeft, User, Mail, Phone, Building, Building2,
  FileText, Calendar, Clock, Paperclip, Download, Eye,
  X, FileImage, File, AlertCircle, Loader2, Edit, Save, BookOpen,
  Handshake, Ban, MapPin, Globe, MessageSquarePlus, Upload, Trash2, Plus,
  Briefcase, UserCheck, Users, LocateFixed, Tag,
  PlusCircle, StickyNote, CheckSquare, Target as TargetIcon, XCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { getNames } from "country-list";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import LinkedTasksTargetsTab from "../../components/LinkedTasksTargetsTab";
import MeetingModal from "../meetings/MeetingModal.jsx";
import useMeetings from "../meetings/useMeetings.js";
import { GoogleConnectBanner } from "../meetings/Meetings.jsx";

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
  fontSize: "0.875rem",
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
  const latest = record?.notesList?.[0];
  const authorName = latest?.createdBy
    ? `${latest.createdBy.firstName || ""} ${latest.createdBy.lastName || ""}`.trim()
    : "";
  const dateLabel = latest?.createdAt
    ? new Date(latest.createdAt).toLocaleDateString("en-US", {
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
          <div className="space-y-4">
            {(record.notesList || []).map((n) => (
              <div key={n._id} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="mb-3">
                  <p className="text-slate-800 text-[0.9375rem] whitespace-pre-wrap break-words">{n.text}</p>
                </div>
                <p className="text-[0.8125rem] text-slate-500 font-medium">
                  {n.createdBy ? `${n.createdBy.firstName || ""} ${n.createdBy.lastName || ""}`.trim() || "Unknown User" : "Unknown User"} — {new Date(n.createdAt).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
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
// /uploads is served as public static files (see backend app.js), so an
// already-uploaded image thumbnail can be shown directly — no authenticated
// fetch needed (the bigger click-to-enlarge preview still goes through the
// existing authenticated PreviewModal/ImagePreview for consistency).
const buildImageUrl = (path) =>
  `${API_URL.replace("/api", "")}/${String(path || "").replace(/^\/+/, "")}`;

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

// Documents only — photos have their own dedicated Images tab/upload.
const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
];

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

// Same icon/color language as the Deal Activity Log's ACTIVITY_TYPE_META
// (Pipeline_modal_view.jsx) — visual consistency across the app. Keys must
// match the `type` values getLeadActivityLog (leads.controller.js) emits.
const LEAD_ACTIVITY_TYPE_META = {
  lead_created:        { icon: PlusCircle,       bg: "bg-blue-100",    iconColor: "text-blue-600" },
  status_changed:      { icon: Tag,              bg: "bg-indigo-100",  iconColor: "text-indigo-600" },
  assignee_changed:    { icon: UserCheck,        bg: "bg-violet-100",  iconColor: "text-violet-600" },
  lead_edited:         { icon: Edit,             bg: "bg-slate-200",   iconColor: "text-slate-600" },
  notes_updated:       { icon: StickyNote,       bg: "bg-yellow-100",  iconColor: "text-yellow-600" },
  followup_note:       { icon: Calendar,         bg: "bg-purple-100",  iconColor: "text-purple-600" },
  followup_rescheduled:{ icon: Calendar,         bg: "bg-purple-100",  iconColor: "text-purple-600" },
  attachment_uploaded: { icon: Paperclip,        bg: "bg-cyan-100",    iconColor: "text-cyan-600" },
  lead_rejected:       { icon: Ban,              bg: "bg-red-100",     iconColor: "text-red-600" },
  lead_converted:      { icon: Handshake,        bg: "bg-emerald-100", iconColor: "text-emerald-600" },
  task_activity:       { icon: CheckSquare,      bg: "bg-amber-100",   iconColor: "text-amber-600" },
  target_linked:       { icon: TargetIcon,       bg: "bg-amber-100",   iconColor: "text-amber-700" },
  target_reason_note:  { icon: TargetIcon,       bg: "bg-orange-100",  iconColor: "text-orange-600" },
  meeting_scheduled:   { icon: Calendar,         bg: "bg-pink-100",    iconColor: "text-pink-600" },
  meeting_cancelled:   { icon: XCircle,          bg: "bg-red-100",     iconColor: "text-red-600" },
  email_sent:          { icon: Mail,             bg: "bg-cyan-100",    iconColor: "text-cyan-600" },
  email_scheduled:     { icon: Mail,             bg: "bg-cyan-100",    iconColor: "text-cyan-600" },
  email_cancelled:     { icon: XCircle,          bg: "bg-red-100",     iconColor: "text-red-600" },
  default:             { icon: Clock,            bg: "bg-slate-100",   iconColor: "text-slate-500" },
};

// ════════════════════════════════════════════════════════════
// Main ViewLead
// ════════════════════════════════════════════════════════════
const ViewLead = () => {
  const { id, tenantSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // The Leads list appends its active filters as a querystring when
  // navigating here (e.g. ?status=Hot&source=Website) — carry it back so
  // "All Leads" / post-action redirects return to the same filtered view.
  const leadsListPath = `/${tenantSlug}/leads${location.search}`;
  const userRole = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}").role?.name || ""; }
    catch { return ""; }
  })();
  const [lead,        setLead]        = useState(null);
  const [activeTab,   setActiveTab]   = useState("details");
  const [previewFile, setPreviewFile] = useState(null);
  const [isNotesPopupOpen, setIsNotesPopupOpen] = useState(false);

  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Swipe navigation between leads — the ordered list of {_id, leadName}
  // this lead was opened from (Leads table), passed via navigation state by
  // the caller. Mirrors the same pattern used on the Deal Details page.
  const [leadSequence, setLeadSequence] = useState(
    () => location.state?.leadSequence || []
  );

  useEffect(() => {
    const fetchFullSequence = async () => {
      try {
        const token = localStorage.getItem("token");
        const searchParams = location.search ? `${location.search}&sequenceOnly=true` : `?sequenceOnly=true`;
        const { data } = await axios.get(`${API_URL}/leads/getAllLead${searchParams}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (data && data.sequence) {
          setLeadSequence(data.sequence);
        }
      } catch (err) {
        console.error("Failed to fetch full lead sequence:", err);
      }
    };
    fetchFullSequence();
  }, [location.search]);
  const leadSequenceIndex = leadSequence.findIndex((l) => l._id === id);
  const prevLeadInfo =
    leadSequenceIndex > 0 ? leadSequence[leadSequenceIndex - 1] : null;
  const nextLeadInfo =
    leadSequenceIndex >= 0 && leadSequenceIndex < leadSequence.length - 1
      ? leadSequence[leadSequenceIndex + 1]
      : null;

  const swipeContainerRef = useRef(null);
  const [swipeX, setSwipeX] = useState(0);
  const [isSwipeAnimating, setIsSwipeAnimating] = useState(false);

  // Tracks which lead id `lead` and the swipe transform currently correspond
  // to. When the route moves to a NEW id (via a completed swipe), this is
  // caught and reacted to synchronously during this same render — see the
  // identical pattern (and its rationale) on the Deal Details page.
  const [syncedLeadId, setSyncedLeadId] = useState(id);
  if (id !== syncedLeadId) {
    setSyncedLeadId(id);
    setSwipeX(0);
    setIsSwipeAnimating(false);

    const prefetched = location.state?.prefetchedLead;
    if (prefetched && prefetched._id === id) {
      setLead(prefetched);
    } else {
      setLead(null);
    }
  }

  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const swipeOffsetRef = useRef(0);
  const lastSwipeDirectionRef = useRef(null);
  const wheelResetTimerRef = useRef(null);
  const isSwipeLockedRef = useRef(false);
  const nextLeadInfoRef = useRef(nextLeadInfo);
  const prevLeadInfoRef = useRef(prevLeadInfo);
  const completeSwipeRef = useRef(null);
  const [isSwipeTransitioning, setIsSwipeTransitioning] = useState(false);

  const SWIPE_THRESHOLD = 90;
  const SWIPE_WHEEL_THRESHOLD = 120;
  const SWIPE_DURATION_MS = 220;
  const MAX_PREFETCH_WAIT_MS = 400;
  // How long to keep new input locked out after a lead lands, to drain any
  // trailing trackpad momentum events left over from the gesture that
  // triggered the swipe in the first place.
  const SWIPE_COOLDOWN_MS = 350;

  useEffect(() => {
    nextLeadInfoRef.current = nextLeadInfo;
    prevLeadInfoRef.current = prevLeadInfo;
  });

  // Landing: once the route has settled on this id, clear the transition
  // indicator and release the swipe lock (after a short cooldown) so the
  // next gesture can commit. Without this, isSwipeTransitioning and
  // isSwipeLockedRef would stay stuck from the first swipe onward — the
  // progress bar never disappears and further swipes silently no-op.
  useEffect(() => {
    if (!id) return;
    setIsSwipeTransitioning(false);

    const unlockTimer = setTimeout(() => {
      isSwipeLockedRef.current = false;
    }, SWIPE_COOLDOWN_MS);

    return () => clearTimeout(unlockTimer);
  }, [id]);

  const completeSwipe = useCallback(
    (direction) => {
      if (isSwipeLockedRef.current) return;
      const target = direction === "next" ? nextLeadInfo : prevLeadInfo;
      swipeOffsetRef.current = 0;
      if (!target) {
        setIsSwipeAnimating(true);
        setSwipeX(0);
        return;
      }
      isSwipeLockedRef.current = true;
      if (wheelResetTimerRef.current) {
        clearTimeout(wheelResetTimerRef.current);
        wheelResetTimerRef.current = null;
      }
      const width = swipeContainerRef.current?.offsetWidth || window.innerWidth;
      setIsSwipeAnimating(true);
      setSwipeX(direction === "next" ? width : -width);
      setIsSwipeTransitioning(true);
      lastSwipeDirectionRef.current = direction;
      setLead(null);

      const token = localStorage.getItem("token");
      const prefetchPromise = axios
        .get(`${API_URL}/leads/getLead/${target._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => res.data)
        .catch(() => undefined);
      const boundedPrefetch = Promise.race([
        prefetchPromise,
        new Promise((resolve) => setTimeout(resolve, MAX_PREFETCH_WAIT_MS)),
      ]);
      const minExitWait = new Promise((resolve) =>
        setTimeout(resolve, SWIPE_DURATION_MS),
      );

      Promise.all([boundedPrefetch, minExitWait]).then(([prefetchedLead]) => {
        navigate(`/${tenantSlug}/leads/view/${target._id}${location.search}`, {
          state: { leadSequence, prefetchedLead },
        });
      });
    },
    [nextLeadInfo, prevLeadInfo, navigate, tenantSlug, leadSequence, location.search],
  );

  useEffect(() => {
    completeSwipeRef.current = completeSwipe;
  });

  const cancelDrag = useCallback(() => {
    isDraggingRef.current = false;
    swipeOffsetRef.current = 0;
    setIsSwipeAnimating(true);
    setSwipeX(0);
  }, []);

  const finishDrag = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    if (isSwipeLockedRef.current) {
      setSwipeX(0);
      return;
    }
    const currentX = swipeOffsetRef.current;
    if (currentX > SWIPE_THRESHOLD && nextLeadInfo) {
      completeSwipe("next");
    } else if (currentX < -SWIPE_THRESHOLD && prevLeadInfo) {
      completeSwipe("prev");
    } else {
      swipeOffsetRef.current = 0;
      setIsSwipeAnimating(true);
      setSwipeX(0);
    }
  }, [nextLeadInfo, prevLeadInfo, completeSwipe]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingRef.current || isSwipeLockedRef.current) return;
      if ((e.buttons & 1) === 0) {
        cancelDrag();
        return;
      }
      const offset = e.clientX - dragStartXRef.current;
      swipeOffsetRef.current = offset;
      setSwipeX(offset);
    };
    const handleMouseUp = () => finishDrag();
    const handleBlur = () => cancelDrag();

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [finishDrag, cancelDrag]);

  const handleSwipeMouseDown = (e) => {
    if (isSwipeLockedRef.current) return;
    if (e.button !== 0) return;
    if (
      e.target.closest("input, textarea, select, button, a, [contenteditable]")
    )
      return;
    isDraggingRef.current = true;
    setIsSwipeAnimating(false);
    dragStartXRef.current = e.clientX;
  };

  const recentHorizontalIntentUntilRef = useRef(0);

  const handleWheelEvent = useCallback((e) => {
    if (isSwipeLockedRef.current || isDraggingRef.current) {
      e.preventDefault();
      return;
    }

    const usingShiftFallback =
      e.shiftKey && Math.abs(e.deltaX) < Math.abs(e.deltaY);
    const isHorizontalIntent =
      usingShiftFallback || Math.abs(e.deltaX) >= Math.abs(e.deltaY);
    const now = performance.now();
    const isMidHorizontalGesture = now < recentHorizontalIntentUntilRef.current;

    if (!isHorizontalIntent && !isMidHorizontalGesture) return;

    if (isHorizontalIntent) {
      recentHorizontalIntentUntilRef.current = now + 300;
    }

    e.preventDefault();

    const rawDelta = usingShiftFallback ? e.deltaY : e.deltaX;
    const offset = swipeOffsetRef.current + rawDelta;
    swipeOffsetRef.current = offset;
    setIsSwipeAnimating(false);
    setSwipeX(offset);

    if (wheelResetTimerRef.current) clearTimeout(wheelResetTimerRef.current);

    if (offset > SWIPE_WHEEL_THRESHOLD && nextLeadInfoRef.current) {
      swipeOffsetRef.current = 0;
      completeSwipeRef.current?.("next");
      return;
    }
    if (offset < -SWIPE_WHEEL_THRESHOLD && prevLeadInfoRef.current) {
      swipeOffsetRef.current = 0;
      completeSwipeRef.current?.("prev");
      return;
    }

    wheelResetTimerRef.current = setTimeout(() => {
      swipeOffsetRef.current = 0;
      setIsSwipeAnimating(true);
      setSwipeX(0);
    }, 200);
  }, []);

  const attachSwipeContainerRef = useCallback(
    (node) => {
      const previousNode = swipeContainerRef.current;
      if (previousNode && previousNode !== node) {
        previousNode.removeEventListener("wheel", handleWheelEvent);
      }
      swipeContainerRef.current = node;
      if (node) {
        node.addEventListener("wheel", handleWheelEvent, { passive: false });
      }
    },
    [handleWheelEvent],
  );

  // Follow-up notes state
  const [addNoteModalOpen, setAddNoteModalOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const [audioFileUrl, setAudioFileUrl] = useState(null);
  const [audioFileError, setAudioFileError] = useState("");
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [savingEditNoteId, setSavingEditNoteId] = useState(null);
  const [deletingNoteId, setDeletingNoteId] = useState(null);

  // Convert-to-deal state
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [converting, setConverting] = useState(false);
  const [dealData, setDealData] = useState({ value: "", currency: "USD", notes: "", stage: "Qualification" });

  // Reject state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [showWAModal, setShowWAModal] = useState(false);

  // Lead details edit state
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const [editErrors, setEditErrors] = useState({});
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [isNoteSubmitting, setIsNoteSubmitting] = useState(false);
  const [editingSingleNoteId, setEditingSingleNoteId] = useState(null);
  const [editingSingleNoteText, setEditingSingleNoteText] = useState("");
  const [isSavingSingleNote, setIsSavingSingleNote] = useState(false);
  const [deletingSingleNoteId, setDeletingSingleNoteId] = useState(null);
  const [salesUsers, setSalesUsers] = useState([]);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  // Dynamic custom fields (edit mode)
  const [cfDraftOpen, setCfDraftOpen] = useState(false);
  const [cfDraftRows, setCfDraftRows] = useState([]); // [{id, name, type, options}]
  const cfIdRef = useRef(0);
  const nextCfId = () => `cf-${Date.now()}-${cfIdRef.current++}`;

  useEffect(() => {
    const token = localStorage.getItem("token");
    axios.get(`${API_URL}/leads/getLead/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setLead(r.data))
      .catch(() => toast.error("Failed to fetch lead details"));
  }, [id]);

  const [activityFeed, setActivityFeed] = useState([]);
  const [isActivityLoading, setIsActivityLoading] = useState(false);

  const fetchActivity = useCallback(() => {
    const token = localStorage.getItem("token");
    setIsActivityLoading(true);
    return axios.get(`${API_URL}/leads/${id}/activity`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setActivityFeed(r.data.activity || []))
      .catch(() => toast.error("Failed to load activity log"))
      .finally(() => setIsActivityLoading(false));
  }, [id]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  // Meetings — same embedded MeetingModal + useMeetings hook the Deal
  // Details page and the real Meetings page both use.
  const { createMeeting, updateMeeting, cancelMeeting, googleConfigured, zoomConfigured, connectGoogle } = useMeetings();
  // Same planFeature check the real Meetings page uses to decide whether the
  // "Connect Google" nudge is even relevant for this tenant's plan.
  const hasGoogleMeetSync = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}").planFeatures?.google_meet_sync !== false; }
    catch { return true; }
  })();
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  // Same open-create/open-edit split the real Meetings page uses — null
  // means the modal is in "create" mode, a meeting object means "edit".
  const [editMeeting, setEditMeeting] = useState(null);
  const [leadMeetings, setLeadMeetings] = useState([]);
  const [isMeetingsLoading, setIsMeetingsLoading] = useState(false);

  const fetchLeadMeetings = useCallback(() => {
    const token = localStorage.getItem("token");
    setIsMeetingsLoading(true);
    return axios.get(`${API_URL}/leads/${id}/meetings`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setLeadMeetings(r.data || []))
      .catch(() => toast.error("Failed to load meetings"))
      .finally(() => setIsMeetingsLoading(false));
  }, [id]);

  useEffect(() => {
    fetchLeadMeetings();
  }, [fetchLeadMeetings]);

  const openCreateMeeting = () => {
    setEditMeeting(null);
    setIsMeetingModalOpen(true);
  };

  const openEditMeeting = (meeting) => {
    setEditMeeting(meeting);
    setIsMeetingModalOpen(true);
  };

  const closeMeetingModal = () => {
    setIsMeetingModalOpen(false);
    setEditMeeting(null);
  };

  const handleMeetingSave = async (formData) => {
    if (editMeeting) {
      await updateMeeting(editMeeting._id, formData);
    } else {
      await createMeeting({ ...formData, leadId: id });
    }
    closeMeetingModal();
    fetchLeadMeetings();
    fetchActivity();
  };

  const handleCancelMeeting = async (meetingId) => {
    if (!window.confirm("Cancel this meeting?")) return;
    await cancelMeeting(meetingId);
    fetchLeadMeetings();
    fetchActivity();
  };

  // Emails — same "campaign sends matched by contact email" the Deal
  // Details page's Email tab uses (MassEmail has no leadId link).
  const [leadEmails, setLeadEmails] = useState([]);
  const [isEmailsLoading, setIsEmailsLoading] = useState(false);

  const fetchLeadEmails = useCallback(() => {
    const token = localStorage.getItem("token");
    setIsEmailsLoading(true);
    return axios.get(`${API_URL}/leads/${id}/emails`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setLeadEmails(r.data || []))
      .catch(() => toast.error("Failed to load emails"))
      .finally(() => setIsEmailsLoading(false));
  }, [id]);

  useEffect(() => {
    fetchLeadEmails();
  }, [fetchLeadEmails]);

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
      alternateEmail: lead.alternateEmail || "",
      phoneNumber: lead.phoneNumber || "",
      alternatePhoneNumber: lead.alternatePhoneNumber || "",
      clientType: lead.clientType || "",
      requirement: lead.requirement || "",
      address: lead.address || "",
      city: lead.city || "",
      state: lead.state || "",
      pincode: lead.pincode || "",
      country: lead.country || "",
      latitude: lead.latitude || "",
      longitude: lead.longitude || "",
      assignTo: lead.assignTo?._id || "",
      source: lead.source || "",
      industry: lead.industry || "",
      status: lead.status || "Cold",
      NumberOfEmployees: lead.NumberOfEmployees ?? "",
      followUpDate: lead.followUpDate
        ? new Date(lead.followUpDate).toISOString().slice(0, 10)
        : "",
      customFields: (lead.customFields || []).map((f) => ({
        id: nextCfId(),
        cardTitle: f.cardTitle || "",
        name: f.name || "",
        type: f.type || "text",
        options: f.options || [],
        value: f.value || "",
      })),
    });
    setEditErrors({});
    setIsEditingDetails(true);
  };

  const cancelEditDetails = () => {
    setIsEditingDetails(false);
    setEditFormData(null);
    setEditErrors({});
    setCfDraftOpen(false);
    setCfDraftRows([]);
  };

  /* ── Dynamic custom fields (edit mode) ─────────────────────── */
  const toggleCfDraft = () => {
    const willOpen = !cfDraftOpen;
    setCfDraftOpen(willOpen);
    if (willOpen && cfDraftRows.length === 0) {
      setCfDraftRows([{ id: nextCfId(), name: "", type: "text", options: "" }]);
    }
  };

  const addCfDraftRow = () => {
    setCfDraftRows((prev) => [...prev, { id: nextCfId(), name: "", type: "text", options: "" }]);
  };

  const updateCfDraftRow = (rowId, key, value) => {
    setCfDraftRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, [key]: value } : r)));
  };

  const removeCfDraftRow = (rowId) => {
    setCfDraftRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const cancelCfDraft = () => {
    setCfDraftRows([]);
    setCfDraftOpen(false);
  };

  const saveCfDraft = () => {
    const validRows = cfDraftRows.filter((r) => r.name.trim());
    if (validRows.length === 0) {
      cancelCfDraft();
      return;
    }

    const newFields = validRows.map((r) => ({
      id: r.id,
      cardTitle: "",
      name: r.name.trim(),
      type: r.type,
      options:
        r.type === "dropdown"
          ? r.options.split(",").map((o) => o.trim()).filter(Boolean)
          : [],
      value: "",
    }));

    setEditFormData((prev) => ({
      ...prev,
      customFields: [...(prev.customFields || []), ...newFields],
    }));
    cancelCfDraft();
  };

  const updateEditCustomFieldValue = (fid, value) => {
    setEditFormData((prev) => ({
      ...prev,
      customFields: (prev.customFields || []).map((f) =>
        f.id === fid ? { ...f, value } : f
      ),
    }));
  };

  const removeEditCustomField = (fid) => {
    setEditFormData((prev) => ({
      ...prev,
      customFields: (prev.customFields || []).filter((f) => f.id !== fid),
    }));
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "email") {
      setEditErrors((prev) => ({ ...prev, email: !!value && !validateEmail(value) }));
    }
    if (name === "alternateEmail") {
      setEditErrors((prev) => ({ ...prev, alternateEmail: !!value && !validateEmail(value) }));
    }
    if (name === "phoneNumber") {
      setEditErrors((prev) => ({
        ...prev,
        phoneNumber: !!value && !isEffectivelyEmptyPhone(value) && !validatePhoneNumber(value),
      }));
    }
    if (name === "alternatePhoneNumber") {
      setEditErrors((prev) => ({
        ...prev,
        alternatePhoneNumber: !!value && !isEffectivelyEmptyPhone(value) && !validatePhoneNumber(value),
      }));
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsFetchingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const response = await axios.get(
            "https://nominatim.openstreetmap.org/reverse",
            {
              params: {
                lat: latitude,
                lon: longitude,
                format: "json",
              },
            }
          );

          const addr = response.data.address || {};
          const matchedCountry =
            countryNames.find(
              (c) => c.toLowerCase() === (addr.country || "").toLowerCase()
            ) || addr.country || "";

          setEditFormData((prev) => ({
            ...prev,
            address: response.data.display_name || prev.address,
            city: addr.city || addr.town || addr.village || addr.county || "",
            state: addr.state || "",
            pincode: addr.postcode || "",
            country: matchedCountry,
            latitude,
            longitude,
          }));
          toast.success("Location fetched successfully");
        } catch (error) {
          console.error("Error fetching address:", error);
          toast.error("Failed to fetch address details. Please enter manually.");
        } finally {
          setIsFetchingLocation(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error(
          error.code === error.PERMISSION_DENIED
            ? "Location permission denied. Please enter manually."
            : "Unable to fetch your location. Please enter manually."
        );
        setIsFetchingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAddNote = async () => {
    if (!noteInput.trim()) return;
    try {
      setIsNoteSubmitting(true);
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_URL}/leads/${id}/notes`, { text: noteInput.trim() }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLead(res.data.lead);
      setNoteInput("");
      toast.success("Note added");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add note");
    } finally {
      setIsNoteSubmitting(false);
    }
  };

  const startEditSingleNote = (note) => {
    setEditingSingleNoteId(note._id);
    setEditingSingleNoteText(note.text);
  };

  const cancelEditSingleNote = () => {
    setEditingSingleNoteId(null);
    setEditingSingleNoteText("");
  };

  const handleEditSingleNote = async (noteId) => {
    if (!editingSingleNoteText.trim()) return;
    try {
      setIsSavingSingleNote(true);
      const token = localStorage.getItem("token");
      const res = await axios.patch(`${API_URL}/leads/${id}/notes/${noteId}`, { text: editingSingleNoteText.trim() }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLead(res.data.lead);
      cancelEditSingleNote();
      toast.success("Note updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update note");
    } finally {
      setIsSavingSingleNote(false);
    }
  };

  const handleDeleteSingleNote = async (noteId) => {
    if (!window.confirm("Delete this note?")) return;
    try {
      setDeletingSingleNoteId(noteId);
      const token = localStorage.getItem("token");
      const res = await axios.delete(`${API_URL}/leads/${id}/notes/${noteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLead(res.data.lead);
      toast.success("Note deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete note");
    } finally {
      setDeletingSingleNoteId(null);
    }
  };

  const saveDetails = async () => {
    if (!editFormData.leadName.trim()) return toast.error("Lead Name is required");
    if (!editFormData.companyName.trim()) return toast.error("Company Name is required");
    if (editFormData.email && !validateEmail(editFormData.email))
      return toast.error("Please enter a valid email address");
    if (editFormData.alternateEmail && !validateEmail(editFormData.alternateEmail))
      return toast.error("Please enter a valid alternate email address");
    if (
      editFormData.phoneNumber &&
      !isEffectivelyEmptyPhone(editFormData.phoneNumber) &&
      !validatePhoneNumber(editFormData.phoneNumber)
    )
      return toast.error("Please enter a valid phone number");
    if (
      editFormData.alternatePhoneNumber &&
      !isEffectivelyEmptyPhone(editFormData.alternatePhoneNumber) &&
      !validatePhoneNumber(editFormData.alternatePhoneNumber)
    )
      return toast.error("Please enter a valid alternate phone number");

    try {
      setIsSavingDetails(true);
      const token = localStorage.getItem("token");

      const payload = {
        leadName: editFormData.leadName.trim(),
        companyName: editFormData.companyName.trim(),
        email: editFormData.email,
        alternateEmail: editFormData.alternateEmail,
        phoneNumber: editFormData.phoneNumber && !editFormData.phoneNumber.startsWith("+")
          ? `+${editFormData.phoneNumber}`
          : editFormData.phoneNumber,
        alternatePhoneNumber: editFormData.alternatePhoneNumber && !editFormData.alternatePhoneNumber.startsWith("+")
          ? `+${editFormData.alternatePhoneNumber}`
          : editFormData.alternatePhoneNumber,
        clientType: editFormData.clientType,
        requirement: editFormData.requirement,
        address: editFormData.address,
        city: editFormData.city,
        state: editFormData.state,
        pincode: editFormData.pincode,
        country: editFormData.country,
        latitude: editFormData.latitude,
        longitude: editFormData.longitude,
        assignTo: editFormData.assignTo,
        source: editFormData.source,
        industry: editFormData.industry,
        status: editFormData.status,
        NumberOfEmployees: editFormData.NumberOfEmployees,
        followUpDate: editFormData.followUpDate,
        // updateLead always rebuilds attachments from this field — passing the
        // lead's current attachments back verbatim so this save doesn't wipe them.
        existingAttachments: JSON.stringify(lead.attachments || []),
        existingImages: JSON.stringify(lead.images || []),
        customFields: JSON.stringify(
          (editFormData.customFields || []).map((f) => ({
            cardTitle: f.cardTitle,
            name: f.name,
            type: f.type,
            options: f.options,
            value: f.value,
          }))
        ),
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
    cancelEditNote();
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

      setLead((prev) => ({ ...prev, followUpNotes: res.data.lead.followUpNotes, followUpNotesHistory: res.data.lead.followUpNotesHistory }));
      toast.success("Follow-up note added");
      closeAddNoteModal();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add follow-up note");
    } finally {
      setSavingNote(false);
    }
  };

  const startEditNote = (n) => {
    setEditingNoteId(n._id);
    setEditingNoteText(n.note);
  };

  const cancelEditNote = () => {
    setEditingNoteId(null);
    setEditingNoteText("");
  };

  const handleEditFollowUpNote = async (noteId) => {
    if (!editingNoteText.trim()) return;

    try {
      setSavingEditNoteId(noteId);
      const token = localStorage.getItem("token");

      const res = await axios.patch(
        `${API_URL}/leads/${id}/followup-notes/${noteId}`,
        { note: editingNoteText.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setLead((prev) => ({ ...prev, followUpNotes: res.data.lead.followUpNotes, followUpNotesHistory: res.data.lead.followUpNotesHistory }));
      toast.success("Follow-up note updated");
      cancelEditNote();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update follow-up note");
    } finally {
      setSavingEditNoteId(null);
    }
  };

  const handleDeleteFollowUpNote = async (noteId) => {
    if (!window.confirm("Delete this follow-up note?")) return;

    try {
      setDeletingNoteId(noteId);
      const token = localStorage.getItem("token");

      const res = await axios.delete(
        `${API_URL}/leads/${id}/followup-notes/${noteId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setLead((prev) => ({ ...prev, followUpNotes: res.data.lead.followUpNotes, followUpNotesHistory: res.data.lead.followUpNotesHistory }));
      toast.success("Follow-up note deleted");
      if (editingNoteId === noteId) cancelEditNote();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete follow-up note");
    } finally {
      setDeletingNoteId(null);
    }
  };

  // ── Convert to Deal ─────────────────────────
  const openConvertModal = () => {
    setDealData({
      value: lead.value || "",
      currency: lead.currency || "USD",
      notes: (lead.notesList || []).map(n => n.text).join("\n\n"),
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
      setTimeout(() => navigate(leadsListPath), 1200);
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
      setTimeout(() => navigate(leadsListPath), 1200);
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

/* ── Attachments: upload ─────────────────────── */
  // updateLead always rebuilds attachments from `existingAttachments` (unlike
  // deals' PATCH, which appends), so we must resend the lead's current
  // attachments verbatim alongside the new files or this upload wipes them.
  const handleUploadAttachments = async (files) => {
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const totalFiles = (lead.attachments?.length || 0) + fileList.length;
    if (totalFiles > 5) return toast.error("Maximum 5 attachments allowed");

    if (fileList.some((file) => !ALLOWED_FILE_TYPES.includes(file.type)))
      return toast.error("Only PDF, Word, Excel, or PowerPoint files are allowed — use the Images tab for photos");

    if (fileList.some((file) => file.size > 20 * 1024 * 1024))
      return toast.error("Some files exceed the 20MB size limit");

    try {
      setIsUploadingAttachment(true);
      const token = localStorage.getItem("token");
      const dataToSend = new FormData();
      fileList.forEach((file) => dataToSend.append("attachments", file));
      dataToSend.append("existingAttachments", JSON.stringify(lead.attachments || []));

      const res = await axios.put(`${API_URL}/leads/updateLead/${id}`, dataToSend, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });

      setLead(res.data.lead);
      toast.success(fileList.length > 1 ? "Attachments uploaded" : "Attachment uploaded");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to upload attachment");
    } finally {
      setIsUploadingAttachment(false);
    }
  };

/* ── Images: upload ─────────────────────── */
  const handleUploadImages = async (files) => {
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const totalFiles = (lead.images?.length || 0) + fileList.length;
    if (totalFiles > 5) return toast.error("Maximum 5 images allowed");

    if (fileList.some((file) => !file.type.startsWith("image/")))
      return toast.error("Only image files are allowed");

    if (fileList.some((file) => file.size > 20 * 1024 * 1024))
      return toast.error("Some images exceed the 20MB size limit");

    try {
      setIsUploadingImage(true);
      const token = localStorage.getItem("token");
      const dataToSend = new FormData();
      fileList.forEach((file) => dataToSend.append("images", file));
      dataToSend.append("existingImages", JSON.stringify(lead.images || []));

      const res = await axios.put(`${API_URL}/leads/updateLead/${id}`, dataToSend, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });

      setLead(res.data.lead);
      toast.success(fileList.length > 1 ? "Images uploaded" : "Image uploaded");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to upload image");
    } finally {
      setIsUploadingImage(false);
    }
  };

/* ── Attachments/Images: delete ─────────────────────── */
  const [deletingAttachmentIdx, setDeletingAttachmentIdx] = useState(null);
  const handleDeleteAttachment = async (idx) => {
    if (!window.confirm("Delete this attachment?")) return;
    try {
      setDeletingAttachmentIdx(idx);
      const token = localStorage.getItem("token");
      const remaining = (lead.attachments || []).filter((_, i) => i !== idx);
      const dataToSend = new FormData();
      dataToSend.append("existingAttachments", JSON.stringify(remaining));

      const res = await axios.put(`${API_URL}/leads/updateLead/${id}`, dataToSend, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });

      setLead(res.data.lead);
      toast.success("Attachment deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete attachment");
    } finally {
      setDeletingAttachmentIdx(null);
    }
  };

  const [deletingImageIdx, setDeletingImageIdx] = useState(null);
  const handleDeleteImage = async (idx) => {
    if (!window.confirm("Delete this image?")) return;
    try {
      setDeletingImageIdx(idx);
      const token = localStorage.getItem("token");
      const remaining = (lead.images || []).filter((_, i) => i !== idx);
      const dataToSend = new FormData();
      dataToSend.append("existingImages", JSON.stringify(remaining));

      const res = await axios.put(`${API_URL}/leads/updateLead/${id}`, dataToSend, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });

      setLead(res.data.lead);
      toast.success("Image deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete image");
    } finally {
      setDeletingImageIdx(null);
    }
  };

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
    <div
      className="min-h-screen py-8 px-4"
      style={{
        overflowX: "hidden",
        overscrollBehaviorX: "none",
        touchAction: "pan-y",
      }}
    >
      {/* Swipe animation keyframes — see the identical pattern on the Deal
          Details page for the full rationale. */}
      <style>{`
        @keyframes leadSwipeProgressBar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        @keyframes leadSlideInFromRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes leadSlideInFromLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        .lead-slide-in-right { animation: leadSlideInFromRight ${SWIPE_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1); }
        .lead-slide-in-left { animation: leadSlideInFromLeft ${SWIPE_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1); }
      `}</style>

      {isSwipeTransitioning && (
        <div className="fixed top-0 left-0 right-0 h-[3px] z-[60] bg-blue-100 overflow-hidden">
          <div
            className="h-full w-1/4 bg-blue-500 rounded-r-full"
            style={{ animation: "leadSwipeProgressBar 0.9s ease-in-out infinite" }}
          />
        </div>
      )}

      <div
        key={id}
        ref={attachSwipeContainerRef}
        onMouseDown={handleSwipeMouseDown}
        className={`max-w-6xl mx-auto select-none ${
          lastSwipeDirectionRef.current === "next"
            ? "lead-slide-in-right"
            : lastSwipeDirectionRef.current === "prev"
              ? "lead-slide-in-left"
              : ""
        }`}
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: isSwipeAnimating
            ? `transform ${SWIPE_DURATION_MS}ms ease`
            : "none",
          cursor: prevLeadInfo || nextLeadInfo ? "grab" : "default",
          willChange: "transform",
          overscrollBehaviorX: "contain",
        }}
      >
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center text-slate-600 mb-3">
              <Link
                to={leadsListPath}
                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                <ArrowLeft size={16} className="mr-1" />
                All Leads
              </Link>
              <ChevronRight size={16} className="mx-2" />
              <span className="text-slate-500">View Lead</span>
            </div>
            <div className="flex items-center gap-4">
              {prevLeadInfo && (
                <button
                  onClick={() => completeSwipe("prev")}
                  title={`Previous lead: ${prevLeadInfo.leadName}`}
                  className="hidden sm:flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors max-w-[110px]"
                >
                  <ChevronLeft size={14} className="shrink-0" />
                  <span className="truncate">{prevLeadInfo.leadName}</span>
                </button>
              )}
              <h1 className="text-gray-900 text-[1rem]">
                {lead.leadName}
              </h1>
              {nextLeadInfo && (
                <button
                  onClick={() => completeSwipe("next")}
                  title={`Next lead: ${nextLeadInfo.leadName}`}
                  className="hidden sm:flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors max-w-[110px]"
                >
                  <span className="truncate">{nextLeadInfo.leadName}</span>
                  <ChevronRight size={14} className="shrink-0" />
                </button>
              )}
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

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* WhatsApp button — always shown when lead has a phone number */}
            {lead.phoneNumber && (
              <button
                onClick={() => setShowWAModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
                style={{ background: "#25D366" }}
              >
                <svg viewBox="0 0 24 24" fill="white" width="16" height="16">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </button>
            )}

          {(canConvert || canReject) && (
            <>
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
            </>
          )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
          {["details", "tasks_targets", "attachments", "images", "activity", "followups", "notes", "meetings", "email"].map((tab) => (
            <button
              key={tab}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "tasks_targets"
                ? "Tasks & Targets"
                : tab === "followups"
                ? "Follow-up Notes"
                : tab === "notes"
                ? "Notes"
                : tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === "attachments" &&
                lead.attachments?.length > 0 && (
                  <span className="ml-1 bg-gray-100 text-gray-500 py-0.5 px-1.5 rounded-full text-xs">
                    {lead.attachments.length}
                  </span>
                )}
              {tab === "images" &&
                lead.images?.length > 0 && (
                  <span className="ml-1 bg-gray-100 text-gray-500 py-0.5 px-1.5 rounded-full text-xs">
                    {lead.images.length}
                  </span>
                )}
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
                    <h2 className="text-slate-900">Lead Details</h2>
                    <p className="text-base text-slate-600 mt-1">Comprehensive information about this lead</p>
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
                        <h3 className="text-slate-700">Client Information</h3>
                        <div className="space-y-4">
                          <InfoRow icon={<User size={18}/>}     label="Lead Name" value={lead.leadName} />
                          <InfoRow icon={<Building size={18}/>} label="Company"   value={lead.companyName || "Not specified"} />
                          <InfoRow icon={<Mail size={18}/>}     label="Email"
                            value={lead.email
                              ? <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">{lead.email}</a>
                              : "N/A"} />
                          <InfoRow icon={<Mail size={18}/>}     label="Alternate Email"
                            value={lead.alternateEmail
                              ? <a href={`mailto:${lead.alternateEmail}`} className="text-blue-600 hover:underline">{lead.alternateEmail}</a>
                              : "Not specified"} />
                          <InfoRow icon={<Phone size={18}/>}    label="Phone"
                            value={lead.phoneNumber
                              ? <a href={`tel:${lead.phoneNumber.startsWith("+") ? lead.phoneNumber : `+${lead.phoneNumber}`}`} className="text-blue-600 hover:underline">{lead.phoneNumber.startsWith("+") ? lead.phoneNumber : `+${lead.phoneNumber}`}</a>
                              : "N/A"} />
                          <InfoRow icon={<Phone size={18}/>}    label="Alternate Phone"
                            value={lead.alternatePhoneNumber
                              ? <a href={`tel:${lead.alternatePhoneNumber.startsWith("+") ? lead.alternatePhoneNumber : `+${lead.alternatePhoneNumber}`}`} className="text-blue-600 hover:underline">{lead.alternatePhoneNumber.startsWith("+") ? lead.alternatePhoneNumber : `+${lead.alternatePhoneNumber}`}</a>
                              : "Not specified"} />
                          <InfoRow icon={<Building2 size={18}/>} label="Client Type" value={lead.clientType || "Not specified"} />
                          <InfoRow icon={<Globe size={18}/>}     label="Source"      value={lead.source || "Not specified"} />
                          <InfoRow icon={<Briefcase size={18}/>} label="Industry"    value={lead.industry || "Not specified"} />
                          <InfoRow icon={<Users size={18}/>}     label="Number of Employees" value={lead.NumberOfEmployees || "Not specified"} />
                        </div>
                      </div>
                      <div className="space-y-5">
                        <h3 className="text-sm font-medium text-slate-700 uppercase tracking-wide invisible">Client Information</h3>
                        <div className="space-y-4">
                          <InfoRow icon={<UserCheck size={18}/>} label="Status"      value={lead.status || "Not specified"} />
                          <InfoRow icon={<FileText size={18}/>} label="Requirement" value={lead.requirement || "Not specified"} />
                          <InfoRow icon={<MapPin size={18}/>}   label="Address"     value={lead.address || "Not specified"} />
                          <InfoRow icon={<MapPin size={18}/>}   label="City"        value={lead.city || "Not specified"} />
                          <InfoRow icon={<MapPin size={18}/>}   label="State"       value={lead.state || "Not specified"} />
                          <InfoRow icon={<MapPin size={18}/>}   label="Pincode"     value={lead.pincode || "Not specified"} />
                          <InfoRow icon={<Globe size={18}/>}    label="Country"     value={lead.country || "Not specified"} />
                          <InfoRow icon={<LocateFixed size={18}/>} label="Latitude"  value={lead.latitude || "Not specified"} />
                          <InfoRow icon={<LocateFixed size={18}/>} label="Longitude" value={lead.longitude || "Not specified"} />
                          <InfoRow icon={<Calendar size={18}/>} label="Follow-up Date" value={lead.followUpDate ? new Date(lead.followUpDate).toLocaleDateString() : "Not specified"} />
                          <InfoRow icon={<Calendar size={18}/>} label="Created"     value={new Date(lead.createdAt).toLocaleDateString()} />
                          {lead.assignTo && userRole !== "Sales" && (
                            <InfoRow icon={<User size={18}/>}   label="Assigned To"
                              value={`${lead.assignTo.firstName} ${lead.assignTo.lastName} (${lead.assignTo.email})`} />
                          )}
                        </div>
                      </div>
                    </div>

                    {lead.customFields?.length > 0 && (
                      <div className="pt-6 border-t border-slate-200 p-6">
                        <h3 className="text-sm font-medium text-slate-700 uppercase tracking-wide mb-4">
                          Custom Fields
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {lead.customFields.map((f, idx) => (
                            <InfoRow
                              key={f._id || `${f.name}-${idx}`}
                              icon={<Tag size={18} />}
                              label={f.name}
                              value={f.value || "Not specified"}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {lead.notesList?.length > 0 && (
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
                            <p className="text-slate-900 truncate mt-1">
                              {lead.notesList[0].text}
                            </p>
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
                        <h3 className="text-slate-700 mb-1">
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
                          <label className="block text-sm font-medium text-slate-700 mb-1">Alternate Email</label>
                          <input
                            type="email"
                            name="alternateEmail"
                            value={editFormData.alternateEmail}
                            onChange={handleEditChange}
                            placeholder="name@example.com"
                            className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition ${
                              editErrors.alternateEmail ? "border-red-500" : "border-slate-300"
                            }`}
                          />
                          {editErrors.alternateEmail && (
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
                          <label className="block text-sm font-medium text-slate-700 mb-1">Alternate Phone</label>
                          <div
                            className={`border rounded-lg ${
                              editErrors.alternatePhoneNumber ? "border-red-500" : "border-slate-300"
                            }`}
                          >
                            <PhoneInput
                              country={"in"}
                              preferredCountries={["in"]}
                              countryCodeEditable={false}
                              value={editFormData.alternatePhoneNumber}
                              onChange={(phone) =>
                                handleEditChange({ target: { name: "alternatePhoneNumber", value: phone } })
                              }
                              specialLabel=""
                              inputStyle={phoneInputStyle}
                              buttonStyle={phoneButtonStyle}
                            />
                          </div>
                          {editErrors.alternatePhoneNumber && (
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
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
                          <select
                            name="source"
                            value={editFormData.source}
                            onChange={handleEditChange}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition"
                          >
                            <option value="">Select Source</option>
                            <option value="Website">Website</option>
                            <option value="Referral">Referral</option>
                            <option value="Social Media">Social Media</option>
                            <option value="Email">Email</option>
                            <option value="Phone">Phone</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Industry</label>
                          <select
                            name="industry"
                            value={editFormData.industry}
                            onChange={handleEditChange}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition"
                          >
                            <option value="">Select Industry</option>
                            <option value="IT">IT</option>
                            <option value="Finance">Finance</option>
                            <option value="Healthcare">Healthcare</option>
                            <option value="Education">Education</option>
                            <option value="Manufacturing">Manufacturing</option>
                            <option value="Retail">Retail</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Number of Employees</label>
                          <input
                            type="number"
                            name="NumberOfEmployees"
                            value={editFormData.NumberOfEmployees}
                            onChange={handleEditChange}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-slate-700 mb-1">
                          Lead Information
                        </h3>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                          <select
                            name="status"
                            value={editFormData.status}
                            onChange={handleEditChange}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition"
                          >
                            <option value="Hot">Hot</option>
                            <option value="Warm">Warm</option>
                            <option value="Cold">Cold</option>
                            <option value="Junk">Junk</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Follow-up Date</label>
                          <input
                            type="date"
                            name="followUpDate"
                            value={editFormData.followUpDate}
                            onChange={handleEditChange}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition"
                          />
                        </div>
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
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-medium text-slate-700">Address</label>
                            <button
                              type="button"
                              onClick={handleUseCurrentLocation}
                              disabled={isFetchingLocation}
                              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-teal-300 text-teal-700 hover:bg-teal-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <LocateFixed size={14} />
                              {isFetchingLocation ? "Fetching location..." : "Use Current Location"}
                            </button>
                          </div>
                          <input
                            name="address"
                            value={editFormData.address}
                            onChange={handleEditChange}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                          <input
                            name="city"
                            value={editFormData.city}
                            onChange={handleEditChange}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                          <input
                            name="state"
                            value={editFormData.state}
                            onChange={handleEditChange}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Pincode</label>
                          <input
                            name="pincode"
                            value={editFormData.pincode}
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
                          <label className="block text-sm font-medium text-slate-700 mb-1">Latitude</label>
                          <input
                            name="latitude"
                            value={editFormData.latitude || ""}
                            onChange={handleEditChange}
                            placeholder="Auto-filled via current location, or enter manually"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Longitude</label>
                          <input
                            name="longitude"
                            value={editFormData.longitude || ""}
                            onChange={handleEditChange}
                            placeholder="Auto-filled via current location, or enter manually"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition"
                          />
                        </div>
                        {userRole !== "Sales" && (
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
                        )}
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-200">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-slate-700 uppercase tracking-wide">
                          Custom Fields
                        </h3>
                        <button
                          type="button"
                          onClick={toggleCfDraft}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-dashed border-blue-400 text-blue-600 hover:bg-blue-50 transition"
                        >
                          <Plus size={14} /> Add Field
                        </button>
                      </div>

                      {(editFormData.customFields || []).length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          {editFormData.customFields.map((f) => (
                            <div key={f.id}>
                              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
                                {f.name}
                                <span className="text-[0.625rem] font-bold uppercase tracking-wide bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                  Custom
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeEditCustomField(f.id)}
                                  className="ml-auto text-slate-400 hover:text-red-500"
                                >
                                  <X size={14} />
                                </button>
                              </label>

                              {f.type === "textarea" ? (
                                <textarea
                                  rows={3}
                                  value={f.value}
                                  onChange={(e) => updateEditCustomFieldValue(f.id, e.target.value)}
                                  placeholder={`Enter ${f.name}`}
                                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition resize-none"
                                />
                              ) : f.type === "dropdown" ? (
                                <select
                                  value={f.value}
                                  onChange={(e) => updateEditCustomFieldValue(f.id, e.target.value)}
                                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition"
                                >
                                  <option value="">Select {f.name}</option>
                                  {(f.options || []).map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type={f.type}
                                  value={f.value}
                                  onChange={(e) => updateEditCustomFieldValue(f.id, e.target.value)}
                                  placeholder={`Enter ${f.name}`}
                                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {cfDraftOpen && (
                        <div className="space-y-3 bg-blue-50 border border-dashed border-blue-300 rounded-lg p-4">
                          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                            New fields (not saved yet)
                          </p>

                          {cfDraftRows.map((row) => (
                            <div
                              key={row.id}
                              className="grid grid-cols-1 sm:grid-cols-[1.3fr_1fr_1fr_auto] gap-3 items-end"
                            >
                              <div>
                                <label className="block text-xs text-slate-500 mb-1">Field name</label>
                                <input
                                  type="text"
                                  value={row.name}
                                  placeholder="e.g. GST Number"
                                  onChange={(e) => updateCfDraftRow(row.id, "name", e.target.value)}
                                  className="w-full border border-slate-300 rounded-md px-2.5 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-xs text-slate-500 mb-1">Field type</label>
                                <select
                                  value={row.type}
                                  onChange={(e) => updateCfDraftRow(row.id, "type", e.target.value)}
                                  className="w-full border border-slate-300 rounded-md px-2.5 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none"
                                >
                                  <option value="text">Text</option>
                                  <option value="number">Number</option>
                                  <option value="date">Date</option>
                                  <option value="textarea">Textarea</option>
                                  <option value="dropdown">Dropdown</option>
                                </select>
                              </div>

                              {row.type === "dropdown" ? (
                                <div>
                                  <label className="block text-xs text-slate-500 mb-1">
                                    Options (comma sep.)
                                  </label>
                                  <input
                                    type="text"
                                    value={row.options}
                                    placeholder="e.g. Yes, No"
                                    onChange={(e) => updateCfDraftRow(row.id, "options", e.target.value)}
                                    className="w-full border border-slate-300 rounded-md px-2.5 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none"
                                  />
                                </div>
                              ) : (
                                <div />
                              )}

                              <button
                                type="button"
                                onClick={() => removeCfDraftRow(row.id)}
                                className="h-[38px] w-[38px] flex items-center justify-center rounded-md border border-slate-300 text-slate-400 hover:text-red-500 hover:border-red-300"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}

                          <div className="flex items-center gap-3 pt-1">
                            <button
                              type="button"
                              onClick={addCfDraftRow}
                              className="text-xs font-semibold text-blue-600 hover:underline"
                            >
                              + Add another field
                            </button>
                            <div className="flex-1" />
                            <button
                              type="button"
                              onClick={cancelCfDraft}
                              className="text-xs font-semibold px-3 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={saveCfDraft}
                              className="text-xs font-semibold px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                            >
                              Save Fields
                            </button>
                          </div>
                        </div>
                      )}
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

            {/* ── Tasks & Targets ── */}
            {activeTab === "tasks_targets" && (
              <div className="p-4 sm:p-6 bg-white animate-fade-in max-w-5xl mx-auto">
                <LinkedTasksTargetsTab itemType="lead" itemId={id} />
              </div>
            )}

            {/* ── Attachments ── */}
            {activeTab === "attachments" && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-slate-900">Attachments</h2>
                    <p className="text-base text-slate-600 mt-1">Files and documents related to this lead</p>
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
                      onChange={(e) => {
                        handleUploadAttachments(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
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
                              <button
                                onClick={() => handleDeleteAttachment(idx)}
                                disabled={deletingAttachmentIdx === idx}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              >
                                {deletingAttachmentIdx === idx ? (
                                  <span className="inline-block w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Trash2 size={15} />
                                )}
                                <span className="hidden sm:inline">Delete</span>
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

            {/* ── Images ── */}
            {activeTab === "images" && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-slate-900">Images</h2>
                    <p className="text-base text-slate-600 mt-1">Photos related to this lead</p>
                  </div>
                  <label
                    className={`inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex-shrink-0 cursor-pointer ${isUploadingImage ? "opacity-50 pointer-events-none" : ""}`}
                  >
                    <Plus size={15} />
                    {isUploadingImage ? "Uploading…" : "Upload"}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={isUploadingImage}
                      onChange={(e) => {
                        handleUploadImages(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <div className="p-6">
                  {lead.images?.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {lead.images.map((image, idx) => (
                        <div
                          key={`${image.path}-${idx}`}
                          className="group relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50 cursor-pointer hover:border-blue-300 transition-colors"
                          onClick={() => openPreview(image)}
                        >
                          <img
                            src={buildImageUrl(image.path)}
                            alt={image.name}
                            className="w-full h-32 object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                            <Eye size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                            <p className="text-xs text-white truncate">{image.name}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadFile(image.path, image.name);
                            }}
                            className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-white/90 text-slate-600 opacity-0 group-hover:opacity-100 hover:text-blue-600 transition-opacity"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteImage(idx);
                            }}
                            disabled={deletingImageIdx === idx}
                            className="absolute top-1.5 right-9 p-1.5 rounded-lg bg-white/90 text-slate-600 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-opacity disabled:opacity-50"
                          >
                            {deletingImageIdx === idx ? (
                              <span className="inline-block w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileImage size={24} className="text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium">No images found</p>
                      <p className="text-slate-400 text-sm mt-1">Photos uploaded with this lead will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Activity ── */}
            {activeTab === "activity" && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-slate-900">Activity Timeline</h2>
                  <p className="text-base text-slate-600 mt-1">Recent activities and updates for this lead</p>
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
                        const meta = LEAD_ACTIVITY_TYPE_META[event.type] || LEAD_ACTIVITY_TYPE_META.default;
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
                                      month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
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

            {/* ── Follow-up Notes Timeline ── */}
            {activeTab === "followups" && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-slate-900">Follow-up Notes Timeline</h2>
                  <p className="text-base text-slate-600 mt-1">Every note added, edited, or deleted for this lead</p>
                </div>
                <div className="p-6 space-y-6">
                  {Array.isArray(lead.followUpNotesHistory) && lead.followUpNotesHistory.length > 0 ? (
                    [...lead.followUpNotesHistory]
                      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                      .map((h, i) => {
                        const config = {
                          added:   { color: "bg-emerald-100", icon: <MessageSquarePlus size={16} className="text-emerald-600" />, label: "Note added" },
                          edited:  { color: "bg-amber-100",   icon: <Edit             size={16} className="text-amber-600" />,   label: "Note edited" },
                          deleted: { color: "bg-red-100",     icon: <Trash2           size={16} className="text-red-600" />,     label: "Note deleted" },
                        }[h.action] || { color: "bg-slate-100", icon: <Clock size={16} className="text-slate-600" />, label: h.action };
                        const actor = h.performedBy
                          ? `${h.performedBy.firstName || ""} ${h.performedBy.lastName || ""}`.trim()
                          : "";
                        return (
                          <div key={h._id || i} className="flex items-start">
                            <div className={`w-10 h-10 ${config.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                              {config.icon}
                            </div>
                            <div className="ml-4 min-w-0">
                              <h3 className="text-slate-700">
                                {config.label}{actor && ` by ${actor}`}
                              </h3>
                              {h.note && (
                                <p className="text-sm text-slate-600 mt-0.5 line-clamp-2 whitespace-pre-wrap">{h.note}</p>
                              )}
                              <p className="text-sm text-slate-500 mt-0.5">{new Date(h.createdAt).toLocaleString()}</p>
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <p className="text-sm text-slate-500">No follow-up note activity yet</p>
                  )}
                </div>
              </div>
            )}
            {/* ── Notes ── */}
            {activeTab === "notes" && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Notes</h2>
                <div className="mb-6 relative">
                  <textarea
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="Write a note..."
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition min-h-[120px] resize-y"
                  />
                  <div className="absolute bottom-3 right-3">
                    <button
                      onClick={handleAddNote}
                      disabled={isNoteSubmitting || !noteInput.trim()}
                      className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {isNoteSubmitting ? "Adding..." : "Add Note"}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                      Newest first
                    </span>
                    <div className="h-px bg-slate-200 flex-1 ml-4" />
                  </div>
                  
                  {(lead.notesList || []).map((n) => {
                    const isEditing = editingSingleNoteId === n._id;
                    const isDeleting = deletingSingleNoteId === n._id;
                    return (
                      <div key={n._id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 transition-colors hover:bg-slate-100/50">
                        {isEditing ? (
                          <>
                            <textarea
                              value={editingSingleNoteText}
                              onChange={(e) => setEditingSingleNoteText(e.target.value)}
                              rows={3}
                              className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition resize-y mb-2"
                              autoFocus
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={cancelEditSingleNote}
                                disabled={isSavingSingleNote}
                                className="px-3 py-1.5 rounded-lg border text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleEditSingleNote(n._id)}
                                disabled={!editingSingleNoteText.trim() || isSavingSingleNote}
                                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                              >
                                {isSavingSingleNote ? "Saving..." : "Save"}
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between items-start mb-3">
                              <p className="text-slate-800 text-[0.9375rem] whitespace-pre-wrap break-words">{n.text}</p>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button onClick={() => startEditSingleNote(n)} className="text-slate-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors">
                                  <Edit size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteSingleNote(n._id)}
                                  disabled={isDeleting}
                                  className="text-slate-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                            <p className="text-[0.8125rem] text-slate-500 font-medium">
                              {n.createdBy ? `${n.createdBy.firstName || ""} ${n.createdBy.lastName || ""}`.trim() || "Unknown User" : "Unknown User"} — {new Date(n.createdAt).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            </p>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Meetings ── */}
            {activeTab === "meetings" && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Meetings</h2>
                    <p className="text-sm text-slate-600 mt-1">Scheduled with this lead's contact</p>
                  </div>
                  <button
                    onClick={openCreateMeeting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex-shrink-0"
                  >
                    <Plus size={15} />
                    Schedule Meeting
                  </button>
                </div>
                <div className="p-6 space-y-3">
                  {/* Same nudge the real Meetings page shows — Google Meet
                      links can't be auto-generated until this is connected,
                      so surface that here instead of only after the user
                      fills the whole form and hits the save-time error. */}
                  {hasGoogleMeetSync && !googleConfigured && (
                    <GoogleConnectBanner onConnect={connectGoogle} />
                  )}
                  {isMeetingsLoading ? (
                    <p className="text-sm text-slate-500">Loading meetings…</p>
                  ) : leadMeetings.length === 0 ? (
                    <p className="text-sm text-slate-500">No meetings scheduled yet.</p>
                  ) : (
                    leadMeetings.map((m) => {
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
                              {m.startDateTime && new Date(m.startDateTime).toLocaleString("en-US", {
                                month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
                              })}
                              {" — "}
                              {m.provider === "zoom" ? "Zoom" : "Google Meet"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            {isUpcoming && (
                              <>
                                <button
                                  onClick={() => openEditMeeting(m)}
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

            {/* ── Email ── */}
            {activeTab === "email" && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Emails</h2>
                    <p className="text-sm text-slate-600 mt-1">Campaign sends to this lead's contact</p>
                  </div>
                  <button
                    onClick={() =>
                      navigate(`/${tenantSlug}/create-email`, {
                        state: {
                          selectedContacts: lead.email
                            ? [{ name: lead.leadName || lead.email, email: lead.email, type: "lead" }]
                            : [],
                        },
                      })
                    }
                    disabled={!lead.email}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex-shrink-0 disabled:opacity-50"
                  >
                    <Mail size={15} />
                    Send Email
                  </button>
                </div>
                <div className="p-6 space-y-3">
                  {isEmailsLoading ? (
                    <p className="text-sm text-slate-500">Loading emails…</p>
                  ) : leadEmails.length === 0 ? (
                    <p className="text-sm text-slate-500">No emails sent to this contact yet.</p>
                  ) : (
                    leadEmails.map((e) => (
                      <div
                        key={e._id}
                        onClick={() => navigate(`/${tenantSlug}/${e.status === "scheduled" ? "scheduled-emails" : "email-history"}`)}
                        className="p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 cursor-pointer transition-colors flex items-center justify-between gap-4"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900">{e.subject}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {(e.scheduledFor || e.createdAt) && new Date(e.scheduledFor || e.createdAt).toLocaleString("en-US", {
                              month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
                            })}
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

          {/* Sidebar */}
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h3 className="text-slate-700 mb-4">Client</h3>
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
                  .map((n, i) => {
                    const isEditing = editingNoteId === n._id;
                    return (
                      <div key={n._id || i} className="border border-slate-200 rounded-lg p-2.5">
                        {isEditing ? (
                          <>
                            <textarea
                              value={editingNoteText}
                              onChange={(e) => setEditingNoteText(e.target.value)}
                              rows={3}
                              className="w-full px-2 py-1.5 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                              autoFocus
                            />
                            <div className="flex justify-end gap-2 mt-2">
                              <button
                                onClick={cancelEditNote}
                                disabled={savingEditNoteId === n._id}
                                className="px-3 py-1 rounded-md border text-xs text-slate-700 hover:bg-slate-100"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleEditFollowUpNote(n._id)}
                                disabled={!editingNoteText.trim() || savingEditNoteId === n._id}
                                className="px-3 py-1 rounded-md bg-blue-600 text-white text-xs hover:bg-blue-700 disabled:opacity-50"
                              >
                                {savingEditNoteId === n._id ? "Saving..." : "Save"}
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm text-slate-800 whitespace-pre-wrap">{n.note}</p>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => startEditNote(n)}
                                  disabled={deletingNoteId === n._id}
                                  className="p-1 text-slate-400 hover:text-blue-600"
                                  title="Edit note"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteFollowUpNote(n._id)}
                                  disabled={deletingNoteId === n._id}
                                  className="p-1 text-slate-400 hover:text-red-500"
                                  title="Delete note"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            {n.audioPath && <FollowUpAudioPlayer audioPath={n.audioPath} />}
                            <p className="text-xs text-slate-400 mt-1.5">
                              {new Date(n.createdAt).toLocaleDateString("en-US", {
                                month: "short", day: "numeric", year: "numeric",
                              })}{" at "}
                              {new Date(n.createdAt).toLocaleTimeString("en-US", {
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </p>
                          </>
                        )}
                      </div>
                    );
                  })}
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

      {/* WhatsApp message modal */}
      <WhatsAppMessageModal
        isOpen={showWAModal}
        onClose={() => setShowWAModal(false)}
        lead={lead}
      />

      {/* Meeting scheduling/editing — the exact same modal the real Meetings
          page uses, in both create and edit mode. */}
      <MeetingModal
        isOpen={isMeetingModalOpen}
        onClose={closeMeetingModal}
        onSave={handleMeetingSave}
        editMeeting={editMeeting}
        zoomConfigured={zoomConfigured}
        googleMeetSyncEnabled={googleConfigured}
        initialAttendees={lead.email ? [lead.email] : []}
      />
    </div>
  );
};

export default ViewLead;
