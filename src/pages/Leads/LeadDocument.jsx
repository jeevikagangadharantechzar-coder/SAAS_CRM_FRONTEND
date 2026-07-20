import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Paperclip,
  Eye,
  Download,
  X,
  FileImage,
  FileText,
  File,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

const API_URL = import.meta.env.VITE_API_URL;

const EXT_TO_MIME = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
  gif: "image/gif",  webp: "image/webp", svg: "image/svg+xml",
  bmp: "image/bmp",  tiff: "image/tiff", tif: "image/tiff",
  ico: "image/x-icon", avif: "image/avif",
  pdf: "application/pdf",
  txt: "text/plain", csv: "text/csv", log: "text/plain",
  md:  "text/plain", json: "application/json", xml: "application/xml",
};

const getExt      = (name = "") => (name.split(".").pop() || "").toLowerCase().trim();
const getMime     = (file)      => EXT_TO_MIME[getExt(file.name)] || "application/octet-stream";
const formatSize  = (b)         => !b ? "" : b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

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

const canPreview = (file) => ["image", "pdf", "text"].includes(getCategory(file));

const STYLES = {
  image: { bg: "bg-green-100",  fg: "text-green-600",  Icon: FileImage },
  pdf:   { bg: "bg-red-100",    fg: "text-red-600",    Icon: FileText  },
  text:  { bg: "bg-yellow-100", fg: "text-yellow-600", Icon: FileText  },
  other: { bg: "bg-blue-100",   fg: "text-blue-600",   Icon: File      },
};

const authFetch = async (filePath, signal) => {
  const token = localStorage.getItem("token");
  const res = await fetch(
    `${API_URL}/files/preview?filePath=${encodeURIComponent(filePath)}`,
    { headers: { Authorization: `Bearer ${token}` }, signal }
  );
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`HTTP ${res.status}: ${msg.slice(0, 120)}`);
  }
  return res.arrayBuffer();
};

const ImagePreview = ({ filePath, mime }) => {
  const [status, setStatus] = useState("loading");
  const [src, setSrc] = useState(null);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    const ctrl = new AbortController();
    let live = true;

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
        setErrMsg(err.message);
        setStatus("error");
      });

    return () => {
      live = false;
      ctrl.abort();
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

  return (
    <div className="flex items-center justify-center min-h-64 p-4 bg-slate-50">
      <img
        src={src}
        alt="Preview"
        className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-md"
        onError={() => { setErrMsg("Browser could not render this image format"); setStatus("error"); }}
      />
    </div>
  );
};

const PdfPreview = ({ filePath }) => {
  const [status, setStatus] = useState("loading");
  const [src, setSrc] = useState(null);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    const ctrl = new AbortController();
    let live = true;

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

const TextPreview = ({ filePath }) => {
  const [status, setStatus] = useState("loading");
  const [content, setContent] = useState("");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    const ctrl = new AbortController();
    let live = true;

    const token = localStorage.getItem("token");
    fetch(`${API_URL}/files/preview?filePath=${encodeURIComponent(filePath)}`, {
      headers: { Authorization: `Bearer ${token}` }, signal: ctrl.signal,
    })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
      .then((t) => { if (!live) return; setContent(t); setStatus("done"); })
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

const FilePreviewModal = ({ file, onClose }) => {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4" onClick={onClose}>
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden"
        style={{ maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()}
      >
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

        <div className="flex-1 overflow-auto bg-slate-50">
          {file.category === "image" && <ImagePreview key={file.path} filePath={file.path} mime={file.mime} />}
          {file.category === "pdf"   && <PdfPreview   key={file.path} filePath={file.path} />}
          {file.category === "text"  && <TextPreview  key={file.path} filePath={file.path} />}
        </div>

        <div className="flex justify-end px-5 py-3 border-t border-slate-100 bg-white flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const LeadDocument = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLeads, setTotalLeads] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [attachmentsLead, setAttachmentsLead] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, itemsPerPage]);

  useEffect(() => {
    let active = true;

    const fetchLeads = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const params = new URLSearchParams({ page: currentPage, limit: itemsPerPage });
        if (debouncedSearch.trim()) params.append("search", debouncedSearch.trim());

        const { data } = await axios.get(`${API_URL}/leads/getAllLead?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!active) return;

        const isNew = data && !Array.isArray(data) && Array.isArray(data.leads);
        const leadsArr = isNew ? data.leads : (Array.isArray(data) ? data : []);
        setLeads(leadsArr);
        setTotalLeads(isNew ? data.totalLeads : leadsArr.length);
        setTotalPages(isNew ? data.totalPages : Math.ceil(leadsArr.length / itemsPerPage) || 1);
      } catch {
        if (active) toast.error("Failed to fetch leads");
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchLeads();
    return () => { active = false; };
  }, [currentPage, itemsPerPage, debouncedSearch]);

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) setCurrentPage(newPage);
  };

  const downloadFile = useCallback(async (filePath, fileName) => {
    if (!filePath) return toast.error("File path missing");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/files/download?filePath=${encodeURIComponent(filePath)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      const url = URL.createObjectURL(new Blob([buf]));
      const a = Object.assign(document.createElement("a"), { href: url, download: fileName || "file" });
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success("File downloaded successfully");
    } catch {
      toast.error("Failed to download file");
    }
  }, []);

  const openPreview = useCallback((file) => {
    if (!file.path) return toast.error("File path missing");
    setPreviewFile({ name: file.name, path: file.path, category: getCategory(file), mime: getMime(file) });
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
    <div className="p-4">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        newestOnTop
        closeOnClick
        draggable
        pauseOnHover
        theme="light"
      />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
        <h2 className="text-xl font-semibold text-gray-800">Lead Documents</h2>
      </div>

      <div className="mb-4 relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search Lead Name..."
          className="w-full border border-gray-300 rounded-md pl-9 pr-4 py-2 bg-white text-sm block h-10 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm text-gray-700">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left">Lead Name</th>
              <th className="px-6 py-3 text-left">Assignee</th>
              <th className="px-6 py-3 text-left">Attachment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {leads.length > 0 ? (
              leads.map((lead, idx) => (
                <tr key={lead._id} className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-50`}>
                  <td className="px-6 py-4">{lead.leadName}</td>
                  <td className="px-6 py-4">
                    {lead.assignTo ? `${lead.assignTo.firstName || ""} ${lead.assignTo.lastName || ""}`.trim() : "Unassigned"}
                  </td>
                  <td className="px-6 py-4">
                    {lead.attachments?.length > 0 ? (
                      <button
                        onClick={() => setAttachmentsLead(lead)}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                      >
                        Attachment
                      </button>
                    ) : (
                      <span className="text-gray-400">No attachment</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                  No leads found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-end gap-6 border-t border-gray-200 bg-white px-4 py-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="border-none bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
            </select>
          </div>

          <span>
            {firstItem}–{lastItem} of {totalLeads}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              aria-label="Previous page"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              aria-label="Next page"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <Dialog open={!!attachmentsLead} onOpenChange={(open) => !open && setAttachmentsLead(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gray-800">
              Attachment — {attachmentsLead?.leadName}
            </DialogTitle>
          </DialogHeader>

          {attachmentsLead?.attachments?.length > 0 ? (
            <ul className="space-y-3">
              {attachmentsLead.attachments.map((file, idx) => {
                const cat = getCategory(file);
                const s = STYLES[cat];
                return (
                  <li
                    key={`${file.path}-${idx}`}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    <div className="flex items-center min-w-0 flex-1">
                      <div className={`p-2 rounded-lg mr-3 flex-shrink-0 ${s.bg}`}>
                        <s.Icon size={18} className={s.fg} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {cat.toUpperCase()}
                          {file.size && <span> • {formatSize(file.size)}</span>}
                          {file.uploadedAt && <span> • {new Date(file.uploadedAt).toLocaleDateString()}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                      {canPreview(file) && (
                        <button
                          onClick={() => openPreview(file)}
                          className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Preview"
                        >
                          <Eye size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => downloadFile(file.path, file.name)}
                        className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-center py-8">
              <Paperclip size={24} className="text-slate-400 mx-auto mb-2" />
              <p className="text-slate-500 font-medium">No attachment</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
    </div>
  );
};

export default LeadDocument;
