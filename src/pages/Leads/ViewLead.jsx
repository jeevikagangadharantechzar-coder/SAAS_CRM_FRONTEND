import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft, ChevronRight, User, Mail, Phone, Building, Building2,
  FileText, Calendar, Clock, Paperclip, Download, Eye,
  X, FileImage, File, AlertCircle, Loader2,
} from "lucide-react";
import { toast } from "react-toastify";

const API_URL = import.meta.env.VITE_API_URL;

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
  const { id } = useParams();
  const [lead,        setLead]        = useState(null);
  const [activeTab,   setActiveTab]   = useState("details");
  const [previewFile, setPreviewFile] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    axios.get(`${API_URL}/leads/getLead/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setLead(r.data))
      .catch(() => toast.error("Failed to fetch lead details"));
  }, [id]);

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

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center text-slate-600 mb-3">
              <Link
                to="/leads"
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
            </div>
          </div>
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
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-lg font-semibold text-slate-900">Lead Details</h2>
                  <p className="text-sm text-slate-600 mt-1">Comprehensive information about this lead</p>
                </div>
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
                      <InfoRow icon={<Calendar size={18}/>} label="Created"     value={new Date(lead.createdAt).toLocaleDateString()} />
                      {lead.assignTo && (
                        <InfoRow icon={<User size={18}/>}   label="Assigned To"
                          value={`${lead.assignTo.firstName} ${lead.assignTo.lastName} (${lead.assignTo.email})`} />
                      )}
                    </div>
                  </div>
                </div>

                {lead.notes && (
                  <div className="mt-8 pt-6 border-t border-slate-200 p-6">
                    <h3 className="text-sm font-medium text-slate-700 mb-3 uppercase tracking-wide">
                      Additional Notes
                    </h3>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <p className="text-slate-700">{lead.notes}</p>
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
    </div>
  );
};

export default ViewLead;
