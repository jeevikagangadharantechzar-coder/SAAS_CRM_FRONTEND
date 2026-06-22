import React, { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "../../components/ui/dialog";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  FaInbox, FaStar, FaExclamationCircle, FaFileAlt, FaPaperPlane,
  FaExclamationTriangle, FaTrash, FaEdit, FaPlus, FaSync, FaSearch,
  FaPaperclip, FaTimes, FaDownload, FaReply, FaReplyAll, FaForward,
  FaChevronLeft, FaSignOutAlt, FaSpinner, FaEnvelope, FaCheckSquare,
  FaSave, FaInfoCircle, FaImage, FaFilePdf, FaFileAudio, FaFileVideo,
  FaFileArchive, FaFile, FaFileExcel, FaFileCode, FaBars, FaArrowLeft,
  FaShieldAlt,
} from "react-icons/fa";
import { MdInbox, MdAttachFile, MdFlashOn, MdLock } from "react-icons/md";

// ─── CONSTANTS ──────────────────────────────────────────────────────────────
const GMAIL_ATTACH_LIMIT = 25 * 1024 * 1024;

// ─── STORAGE HELPERS ─────────────────────────────────────────────────────────
// Cache keys are still scoped by email for safety (prevents stale cross-account
// cache bleed if two accounts are used on the same browser in sequence).
const makeStorageKey = (email, suffix) =>
  email ? `gmail_${suffix}_${email}` : null;

const save    = (key, data) => { try { if (key) localStorage.setItem(key, JSON.stringify(data)); } catch { } };
const load    = (key, def)  => { try { if (!key) return def; const s = localStorage.getItem(key); return s ? JSON.parse(s) : def; } catch { return def; } };
const loadSet = (key)       => { try { if (!key) return new Set(); const s = localStorage.getItem(key); return s ? new Set(JSON.parse(s)) : new Set(); } catch { return new Set(); } };

const clearUserStorage = (email) => {
  if (!email) return;
  [
    "threads", "pageTokens", "totalCounts", "actualCounts",
    "activeLabel", "lastFetch", "selectedThread", "messages",
    "deleted", "trashMoved",
  ].forEach((p) => {
    try { localStorage.removeItem(makeStorageKey(email, p)); } catch { }
  });
};

const AUTH_KEY    = "gmail_auth_status_v4";   // bumped version to clear stale v3 cache
const EMAIL_KEY   = "gmail_user_email_v4";
const SIDEBAR_KEY = "gmail_sidebar_v4";

const LABELS_LIST  = ["INBOX", "UNREAD", "STARRED", "IMPORTANT", "SENT", "SPAM", "TRASH", "DRAFTS"];
const EMPTY_CACHE  = () => Object.fromEntries(LABELS_LIST.map((l) => [l, []]));
const EMPTY_COUNTS = () => Object.fromEntries(LABELS_LIST.map((l) => [l, 0]));

// ─── axios instance — always sends cookies ────────────────────────────────────
// withCredentials=true ensures the httpOnly session cookie is attached to
// every request automatically.  No email param needed in the URL/body.
const api = axios.create({
  withCredentials: true,   // ← this is the critical setting
});

// ─── CONNECT SCREEN ──────────────────────────────────────────────────────────
const GmailConnectScreen = ({
  authUrl, authStatus, error, loading, isConnecting,
  onConnect, onFetchAuthUrl, onCheckStatus,
}) => {
  const features = [
    { icon: <MdInbox   size={28} color="#f4b400" />, title: "Smart Inbox",   desc: "Auto-organized mail" },
    { icon: <MdFlashOn size={28} color="#f4b400" />, title: "Instant Sync",  desc: "Real-time updates" },
    { icon: <MdAttachFile size={28} color="#c0c0c0" />, title: "Attachments", desc: "Full file support" },
    { icon: <MdLock    size={28} color="#f4b400" />, title: "Secure OAuth",  desc: "Google-protected" },
  ];
  return (
    <div className="min-h-screen w-full flex" style={{ fontFamily: "Roboto, Arial, sans-serif" }}>
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-3/5 flex-col relative overflow-hidden"
        style={{ background: "linear-gradient(145deg,#1a73e8 0%,#0d47a1 55%,#082966 100%)" }}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
          <div className="absolute top-1/2 -right-20 w-72 h-72 rounded-full"  style={{ background: "rgba(255,255,255,0.05)" }} />
        </div>
        <div className="relative z-10 flex flex-col h-full p-12 lg:p-16">
          <div className="mb-auto flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.18)" }}>
              <FaEnvelope size={22} color="white" />
            </div>
            <div>
              <span className="text-white text-2xl font-medium tracking-wide">Gmail</span>
              <p className="text-blue-200 text-xs">by Google</p>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center py-10">
            <h1 className="text-white text-5xl xl:text-6xl font-light leading-tight mb-5">
              Your inbox,<br /><span className="font-semibold">always in reach.</span>
            </h1>
            <p className="text-blue-100 text-xl leading-relaxed mb-12 max-w-lg">
              Connect your Gmail account to send, receive, and manage all your emails in one place.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {features.map((f, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.10)" }}>
                  <div className="flex-shrink-0 mt-0.5">{f.icon}</div>
                  <div>
                    <p className="text-white font-semibold text-sm">{f.title}</p>
                    <p className="text-blue-200 text-xs mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-blue-300 text-xs">© 2024 Google LLC · All rights reserved</p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center bg-white p-8 md:p-12 lg:p-16">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#1a73e8" }}>
              <FaEnvelope size={16} color="white" />
            </div>
            <span className="text-gray-800 text-xl font-medium">Gmail</span>
          </div>
          <h2 className="text-3xl font-normal text-gray-800 mb-1">Sign in</h2>
          <p className="text-gray-500 mb-7">to continue to Gmail</p>

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5">
              <FaExclamationCircle className="text-red-500 mt-0.5 flex-shrink-0" size={16} />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          {authStatus.message && !error && (
            <div className="mb-5 p-3.5 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-2.5">
              <FaInfoCircle className="text-blue-500 mt-0.5 flex-shrink-0" size={16} />
              <p className="text-blue-700 text-sm">{authStatus.message}</p>
            </div>
          )}

          {authUrl ? (
            <div className="space-y-3">
              <button
                onClick={onConnect} disabled={isConnecting}
                className="w-full flex items-center justify-center gap-3 py-3 px-5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 shadow-sm disabled:opacity-60"
                style={{ color: "#3c4043", fontSize: "15px", fontWeight: 500 }}
              >
                {isConnecting ? (
                  <><FaSpinner className="animate-spin" size={18} style={{ color: "#1a73e8" }} /><span>Connecting...</span></>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>
              <button
                onClick={onConnect} disabled={isConnecting}
                className="w-full py-3 px-5 rounded-xl text-white font-medium text-sm disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#1a73e8,#1557b0)" }}
              >
                {isConnecting
                  ? <span className="flex items-center justify-center gap-2"><FaSpinner className="animate-spin" size={14} />Connecting...</span>
                  : "Connect Gmail Account"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={onFetchAuthUrl} disabled={loading}
                className="w-full py-3 px-5 rounded-xl text-white font-medium text-sm disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#1a73e8,#1557b0)" }}
              >
                {loading
                  ? <span className="flex items-center justify-center gap-2"><FaSpinner className="animate-spin" size={14} />Loading...</span>
                  : "Get Connection Link"}
              </button>
              <button
                onClick={onCheckStatus}
                className="w-full py-2.5 px-5 rounded-xl border border-gray-300 text-gray-600 text-sm hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                <FaSync size={13} />Check Status
              </button>
            </div>
          )}

          <div className="mt-7 p-4 rounded-xl border border-gray-100 bg-gray-50 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <FaShieldAlt size={14} color="#16a34a" />
            </div>
            <div>
              <p className="text-gray-700 text-sm font-medium mb-0.5">Secure & Private</p>
              <p className="text-gray-400 text-xs leading-relaxed">
                We use Google's official OAuth 2.0. Your password is never shared.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── EMAIL SUGGESTION INPUT ──────────────────────────────────────────────────
const EmailInputWithSuggestions = ({
  label, field, value, onChange, suggestions, onSelectSuggestion, placeholder, required,
}) => {
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setFocused(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = suggestions.filter((s) => {
    const val = value.split(",").pop().trim().toLowerCase();
    return val.length >= 2 && s.toLowerCase().includes(val);
  });

  const handleSelect = (s) => {
    const parts = value.split(",");
    parts[parts.length - 1] = ` ${s}`;
    onSelectSuggestion(field, parts.join(",").trimStart());
    setFocused(false);
  };

  return (
    <div ref={wrapRef} className="relative flex items-center border-b border-gray-100 pb-2">
      <label className="w-16 text-sm font-medium text-gray-500 flex-shrink-0">
        {label}{required && <span className="text-red-400">*</span>}
      </label>
      <div className="flex-1 relative">
        <input
          type="email" multiple value={value}
          onChange={(e) => { onChange(field, e.target.value); setFocused(true); }}
          onFocus={() => setFocused(true)}
          className="w-full p-2 border-none focus:ring-0 focus:outline-none text-gray-800 text-sm placeholder-gray-400"
          placeholder={placeholder} autoComplete="off"
        />
        {focused && filtered.length > 0 && (
          <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg min-w-64 max-h-48 overflow-y-auto">
            {filtered.map((s, i) => (
              <button
                key={i} type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
                className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center gap-2.5 text-sm text-gray-700"
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                  style={{ background: `hsl(${(s.charCodeAt(0) || 65) * 17 % 360},50%,45%)` }}
                >
                  {s.charAt(0).toUpperCase()}
                </div>
                <span className="truncate">{s}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── SKELETON LOADERS ────────────────────────────────────────────────────────
const ThreadSkeleton = () => (
  <div className="rounded-2xl overflow-hidden bg-white border border-gray-200 animate-pulse">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="flex items-center px-4 py-3 border-b border-gray-100 last:border-0">
        <div className="w-4 h-4 bg-gray-200 rounded mr-3" />
        <div className="w-4 h-4 bg-gray-200 rounded mr-3" />
        <div className="w-8 h-8 bg-gray-200 rounded-full mr-3" />
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <div className="w-28 h-3.5 bg-gray-200 rounded" />
            <div className="flex-1 h-3.5 bg-gray-200 rounded" />
          </div>
        </div>
        <div className="w-12 h-3 bg-gray-200 rounded ml-3" />
      </div>
    ))}
  </div>
);

const MessageSkeleton = () => (
  <div className="animate-pulse p-6">
    <div className="flex items-center gap-3 mb-5">
      <div className="w-10 h-10 rounded-full bg-gray-200" />
      <div className="space-y-2">
        <div className="w-36 h-4 bg-gray-200 rounded" />
        <div className="w-52 h-3 bg-gray-100 rounded" />
      </div>
    </div>
    {[100, 90, 80, 95, 75, 85].map((w, i) => (
      <div key={i} className="h-3 bg-gray-100 rounded mb-2.5" style={{ width: `${w}%` }} />
    ))}
  </div>
);

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
const EmailChat = () => {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();

  // ── AUTH ──
  const [authStatus,   setAuthStatus]   = useState(() => load(AUTH_KEY, { authenticated: false, message: "" }));
  const [userEmail,    setUserEmail]    = useState(() => load(EMAIL_KEY, ""));
  const [authUrl,      setAuthUrl]      = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [error,        setError]        = useState("");
  const [authLoading,  setAuthLoading]  = useState(false);

  // ── DATA ──
  const [threadsCache,     setThreadsCache]     = useState(EMPTY_CACHE);
  const [nextPageTokens,   setNextPageTokens]   = useState({});
  const [actualCounts,     setActualCounts]     = useState(EMPTY_COUNTS);
  const [activeLabel,      setActiveLabel]      = useState("INBOX");
  const [lastFetchTime,    setLastFetchTime]    = useState({});
  const [selectedThread,   setSelectedThread]   = useState(null);
  const [messages,         setMessages]         = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => load(SIDEBAR_KEY, false));
  const [deletedSet,       setDeletedSet]       = useState(new Set());
  const [trashSet,         setTrashSet]         = useState(new Set());
  const [readSet,          setReadSet]          = useState(new Set());

  // ── LOADING ──
  const [listLoading,   setListLoading]   = useState(false);
  const [listLoadLabel, setListLoadLabel] = useState(null);
  const [threadLoading, setThreadLoading] = useState(false);

  // ── UI ──
  const [showCompose,      setShowCompose]      = useState(false);
  const [composeData,      setComposeData]      = useState({ to: "", cc: "", bcc: "", subject: "", message: "" });
  const [composeMode,      setComposeMode]      = useState("new");
  const [sending,          setSending]          = useState(false);
  const [savingDraft,      setSavingDraft]      = useState(false);
  const [sendProgress,     setSendProgress]     = useState(0);
  const [selectedFiles,    setSelectedFiles]    = useState([]);
  const [suggestions,      setSuggestions]      = useState({ to: [], cc: [], bcc: [] });
  const [searchQuery,      setSearchQuery]      = useState("");
  const [selectedThreads,  setSelectedThreads]  = useState(new Set());
  const [showBulkActions,  setShowBulkActions]  = useState(false);
  const [showDeleteModal,  setShowDeleteModal]  = useState(false);
  const [showDisconnModal, setShowDisconnModal] = useState(false);
  const [threadToDelete,   setThreadToDelete]   = useState(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [labels,           setLabels]           = useState([]);

  // ── REFS ──
  const deletedRef     = useRef(new Set());
  const trashRef       = useRef(new Set());
  const readRef        = useRef(new Set());
  const openingRef     = useRef(null);
  const abortListRef   = useRef(null);
  const abortThreadRef = useRef(null);
  const refreshTimer   = useRef(null);
  const suggestTimers  = useRef({});
  const didInit        = useRef(false);
  const fileInputRef   = useRef(null);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  // ─── 401 interceptor — auto-logout on session expiry ────────────────────
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (
          error.response?.status === 401 &&
          error.config?.url?.includes("/gmail/")
        ) {
          // Session expired or was destroyed server-side
          setAuthStatus({ authenticated: false, message: "Session expired. Please reconnect." });
          setUserEmail("");
          clearUserStorage(userEmail);
          fetchAuthUrl();
        }
        return Promise.reject(error);
      }
    );
    return () => api.interceptors.response.eject(interceptor);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

  // ─── Sync refs ───────────────────────────────────────────────────────────
  useEffect(() => {
    deletedRef.current = deletedSet;
    if (userEmail) save(makeStorageKey(userEmail, "deleted"), [...deletedSet]);
  }, [deletedSet, userEmail]);

  useEffect(() => {
    trashRef.current = trashSet;
    if (userEmail) save(makeStorageKey(userEmail, "trashMoved"), [...trashSet]);
  }, [trashSet, userEmail]);

  useEffect(() => { readRef.current = readSet; }, [readSet]);

  // ─── Persist ─────────────────────────────────────────────────────────────
  useEffect(() => { if (userEmail) save(makeStorageKey(userEmail, "threads"),      threadsCache);  }, [threadsCache,  userEmail]);
  useEffect(() => { if (userEmail) save(makeStorageKey(userEmail, "pageTokens"),   nextPageTokens);}, [nextPageTokens, userEmail]);
  useEffect(() => { if (userEmail) save(makeStorageKey(userEmail, "actualCounts"), actualCounts);  }, [actualCounts,  userEmail]);
  useEffect(() => { if (userEmail) save(makeStorageKey(userEmail, "activeLabel"),  activeLabel);   }, [activeLabel,   userEmail]);
  useEffect(() => { if (userEmail) save(makeStorageKey(userEmail, "lastFetch"),    lastFetchTime); }, [lastFetchTime, userEmail]);
  useEffect(() => { save(AUTH_KEY,    authStatus);       }, [authStatus]);
  useEffect(() => { save(EMAIL_KEY,   userEmail);        }, [userEmail]);
  useEffect(() => { save(SIDEBAR_KEY, sidebarCollapsed); }, [sidebarCollapsed]);

  // ─── Load cache on email change ──────────────────────────────────────────
  useEffect(() => {
    if (!userEmail) return;
    const e = userEmail;
    setThreadsCache(load(makeStorageKey(e, "threads"),      EMPTY_CACHE()));
    setNextPageTokens(load(makeStorageKey(e, "pageTokens"), {}));
    setActualCounts(load(makeStorageKey(e, "actualCounts"), EMPTY_COUNTS()));
    setActiveLabel(load(makeStorageKey(e, "activeLabel"),   "INBOX"));
    setLastFetchTime(load(makeStorageKey(e, "lastFetch"),   {}));
    setSelectedThread(null); setMessages([]);
    const del = loadSet(makeStorageKey(e, "deleted"));
    const tr  = loadSet(makeStorageKey(e, "trashMoved"));
    setDeletedSet(del); deletedRef.current = del;
    setTrashSet(tr);    trashRef.current   = tr;
    setReadSet(new Set()); readRef.current  = new Set();
  }, [userEmail]);

  // ─── Auto refresh counts ─────────────────────────────────────────────────
  useEffect(() => {
    if (authStatus.authenticated && userEmail) {
      doFetchCounts();
      refreshTimer.current = setInterval(() => doFetchCounts(), 30000);
    }
    return () => clearInterval(refreshTimer.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus.authenticated, userEmail]);

  // ═══════════════════════════════════════════════════════════════════════════
  //  API CALLS — NOTE: NO email param is sent.
  //  The server reads the email exclusively from the httpOnly session cookie.
  // ═══════════════════════════════════════════════════════════════════════════

  const doFetchCounts = useCallback(async () => {
    try {
      //  No email param — server uses session cookie
      const res = await api.get(`${API_BASE}/gmail/all-counts`, { timeout: 12000 });
      if (res.data.success) {
        setActualCounts(res.data.counts);
        setLastFetchTime((p) => ({ ...p, counts: Date.now() }));
      }
    } catch { /* silent */ }
  }, [API_BASE]);

  const fetchLabel = useCallback(async ({
    label      = "INBOX",
    loadMore   = false,
    force      = false,
    background = false,
  }) => {
    if (!background) {
      if (abortListRef.current) abortListRef.current.abort();
      abortListRef.current = new AbortController();
    }
    const signal = background ? undefined : abortListRef.current.signal;

    const del   = deletedRef.current;
    const moved = trashRef.current;

    // Cache check
    if (!force && !loadMore && label !== "UNREAD") {
      const cachedData = load(makeStorageKey(userEmail, "threads"), EMPTY_CACHE());
      const cached     = cachedData[label] || [];
      const times      = load(makeStorageKey(userEmail, "lastFetch"), {});
      const age        = times[label] ? Date.now() - times[label] : Infinity;
      if (cached.length > 0 && age < 120000) {
        const filtered = cached
          .filter((t) => !del.has(t.id))
          .filter((t) => label === "TRASH" ? true : !moved.has(t.id))
          .map((t) => ({ ...t, unread: readRef.current.has(t.id) ? false : t.unread }));
        setThreadsCache((p) => ({ ...p, [label]: filtered }));
        return;
      }
    }

    if (!background) { setListLoading(true); setListLoadLabel(label); setError(""); }

    try {
      //  No email param in query — server uses session cookie
      const params = { maxResults: 20, label };
      if (loadMore) {
        const tokens = load(makeStorageKey(userEmail, "pageTokens"), {});
        if (tokens[label]) params.pageToken = tokens[label];
      }
      const res = await api.get(`${API_BASE}/gmail/threads`, { params, signal, timeout: 15000 });

      if (res.data.success) {
        const threads = (res.data.data || [])
          .filter((t) => !del.has(t.id))
          .filter((t) => label !== "TRASH" ? !moved.has(t.id) : true)
          .map((t) => ({ ...t, unread: readRef.current.has(t.id) ? false : t.unread }))
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        setThreadsCache((p) => ({
          ...p,
          [label]: loadMore ? [...(p[label] || []), ...threads] : threads,
        }));
        setNextPageTokens((p) => ({ ...p, [label]: res.data.nextPageToken }));
        setLastFetchTime((p) => ({ ...p, [label]: Date.now() }));
        if (!loadMore) { setSelectedThreads(new Set()); setShowBulkActions(false); }
      }
    } catch (err) {
      if (err.name !== "AbortError" && err.code !== "ERR_CANCELED" && !background)
        setError(err.response?.data?.error || "Failed to fetch emails");
    } finally {
      if (!background) { setListLoading(false); setListLoadLabel(null); }
    }
  }, [API_BASE, userEmail]);

  const fetchDrafts = useCallback(async () => {
    setListLoading(true); setListLoadLabel("DRAFTS");
    try {
      //  No email param
      const res = await api.get(`${API_BASE}/gmail/drafts`, { params: { maxResults: 20 } });
      if (res.data.success) {
        const drafts = (res.data.data || [])
          .filter((d) => !deletedRef.current.has(d.id))
          .map((d) => ({ ...d, isDraft: true }));
        setThreadsCache((p) => ({ ...p, DRAFTS: drafts }));
        setActualCounts((p) => ({ ...p, DRAFTS: res.data.totalCount || drafts.length }));
        setLastFetchTime((p) => ({ ...p, DRAFTS: Date.now() }));
      }
    } catch { toast.error("Failed to fetch drafts"); }
    finally { setListLoading(false); setListLoadLabel(null); }
  }, [API_BASE]);

  const bootstrapForEmail = useCallback(async (email) => {
    if (!email) return;
    await Promise.all([
      doFetchCounts(),
      fetchLabel({ label: "INBOX", force: true, background: false }),
    ]);
    const rest = ["UNREAD", "STARRED", "IMPORTANT", "SENT", "SPAM", "TRASH", "DRAFTS"];
    rest.forEach((lbl, i) => {
      setTimeout(() => fetchLabel({ label: lbl, force: true, background: true }), 600 + i * 200);
    });
    try {
      //  No email param
      const res = await api.get(`${API_BASE}/gmail/labels`);
      if (res.data.success) setLabels(res.data.data || []);
    } catch { /* silent */ }
  }, [doFetchCounts, fetchLabel, API_BASE]);

  // ─── URL params (OAuth callback) ─────────────────────────────────────────
  useEffect(() => {
    const connected     = searchParams.get("gmail_connected");
    const gmailError    = searchParams.get("gmail_error");
    const returnedEmail = searchParams.get("email");

    if (connected === "1" || connected === "true") {
      toast.success(" Gmail connected successfully!");
      navigate("/emailchat", { replace: true });
      if (returnedEmail) {
        // Store email for display & cache-key purposes only — NOT for auth
        setUserEmail(returnedEmail);
        setAuthStatus({ authenticated: true, message: "Gmail is connected", email: returnedEmail });
        setActiveLabel("INBOX");
        bootstrapForEmail(returnedEmail);
      }
      setIsConnecting(false);
    }
    if (gmailError) {
      toast.error(` ${searchParams.get("error") || "Error connecting Gmail."}`);
      navigate("/emailchat", { replace: true });
      setIsConnecting(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ─── Initial page load ───────────────────────────────────────────────────
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const cachedAuth  = load(AUTH_KEY,  { authenticated: false });
    const cachedEmail = load(EMAIL_KEY, "");
    if (cachedAuth.authenticated && cachedEmail) {
      setAuthStatus(cachedAuth);
      setUserEmail(cachedEmail);
      bootstrapForEmail(cachedEmail);
    } else {
      checkAuthStatus();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuthStatus = async () => {
    setAuthLoading(true);
    try {
      //  No email param — server checks the session cookie
      const res = await api.get(`${API_BASE}/gmail/auth-status`);
      setAuthStatus(res.data);
      if (res.data.authenticated && res.data.email) {
        setUserEmail(res.data.email);
        bootstrapForEmail(res.data.email);
      } else {
        await fetchAuthUrl();
      }
    } catch {
      setAuthStatus({ authenticated: false, message: "Error checking authentication" });
      await fetchAuthUrl();
    } finally { setAuthLoading(false); }
  };

  const fetchAuthUrl = async () => {
    try {
      const res = await api.get(`${API_BASE}/gmail/auth-url`);
      if (res.data.success) setAuthUrl(res.data.url);
      else setError(res.data.error || "Failed to get authentication URL");
    } catch { setError("Failed to connect to server"); }
  };

  // ─── Load thread ─────────────────────────────────────────────────────────
  const loadThread = useCallback(async (threadId) => {
    if (openingRef.current === threadId || threadLoading) return;
    openingRef.current = threadId;

    if (abortThreadRef.current) abortThreadRef.current.abort();
    abortThreadRef.current = new AbortController();

    setSelectedThread(threadId);
    setMessages([]);
    setThreadLoading(true);
    setError("");

    try {
      //  No email param
      const url = activeLabel === "DRAFTS"
        ? `${API_BASE}/gmail/draft/${threadId}`
        : `${API_BASE}/gmail/thread/${threadId}`;
      const res = await api.get(url, {
        signal:  abortThreadRef.current.signal,
        timeout: 15000,
      });

      if (res.data.success) {
        const msgs = Array.isArray(res.data.data)
          ? res.data.data
          : (res.data.data?.messages || []);
        setMessages(msgs);

        if (activeLabel !== "DRAFTS") {
          setReadSet((p) => { const s = new Set(p); s.add(threadId); return s; });
          setThreadsCache((p) => {
            const u = { ...p };
            Object.keys(u).forEach((l) => {
              u[l] = u[l].map((t) => t.id === threadId ? { ...t, unread: false } : t);
            });
            return u;
          });
          setActualCounts((p) => ({ ...p, UNREAD: Math.max(0, p.UNREAD - 1) }));
          //  No email in body
          api.post(`${API_BASE}/gmail/thread/${threadId}/read`, { read: true }).catch(() => {});
        }
        doFetchCounts();
      }
    } catch (err) {
      if (err.name !== "AbortError" && err.code !== "ERR_CANCELED") {
        setError(err.response?.data?.error || "Failed to fetch email");
        setSelectedThread(null); setMessages([]);
      }
    } finally {
      setThreadLoading(false);
      openingRef.current = null;
    }
  }, [activeLabel, API_BASE, threadLoading, doFetchCounts]);

  // ─── Label navigation ────────────────────────────────────────────────────
  const handleLabelClick = useCallback(async (labelId) => {
    if (abortListRef.current) abortListRef.current.abort();
    setActiveLabel(labelId);
    setSelectedThread(null); setMessages([]);
    openingRef.current = null;
    setSearchQuery(""); setSelectedThreads(new Set()); setShowBulkActions(false);

    if (labelId === "TRASH") {
      setTrashSet(new Set()); trashRef.current = new Set();
      if (userEmail) localStorage.removeItem(makeStorageKey(userEmail, "trashMoved"));
    }

    if (labelId === "DRAFTS") {
      const cached = threadsCache.DRAFTS || [];
      const age    = lastFetchTime.DRAFTS ? Date.now() - lastFetchTime.DRAFTS : Infinity;
      if (!(cached.length > 0 && age < 120000)) await fetchDrafts();
    } else {
      const cached = threadsCache[labelId] || [];
      const age    = lastFetchTime[labelId] ? Date.now() - lastFetchTime[labelId] : Infinity;
      const force  = labelId === "UNREAD" || cached.length === 0 || age >= 120000;
      await fetchLabel({ label: labelId, force, background: false });
    }
    setShowMobileSidebar(false);
  }, [userEmail, threadsCache, lastFetchTime, fetchLabel, fetchDrafts]);

  // ─── Mark thread ─────────────────────────────────────────────────────────
  const markThreadAs = useCallback(async (threadId, action, value = true) => {
    const prevCache  = JSON.parse(JSON.stringify(threadsCache));
    const prevCounts = { ...actualCounts };
    setThreadsCache((p) => {
      const u = { ...p };
      Object.keys(u).forEach((l) => {
        u[l] = u[l].map((t) => {
          if (t.id !== threadId) return t;
          const up = { ...t };
          if (action === "star")      up.starred   = value;
          if (action === "important") up.important = value;
          if (action === "spam")      up.spam      = value;
          if (action === "trash")     up.trash     = true;
          return up;
        });
      });
      return u;
    });
    if (action === "star")
      setActualCounts((p) => ({ ...p, STARRED: value ? p.STARRED + 1 : Math.max(0, p.STARRED - 1) }));

    const endpointMap = {
      star:      `thread/${threadId}/star`,
      important: `thread/${threadId}/important`,
      spam:      `thread/${threadId}/spam`,
      trash:     `thread/${threadId}/trash`,
    };
    //  No email in body
    const bodyMap = {
      star:      { star: value },
      important: { important: value },
      spam:      { spam: value },
      trash:     {},
    };
    try {
      const res = await api.post(`${API_BASE}/gmail/${endpointMap[action]}`, bodyMap[action]);
      if (res.data.success) { toast.success(res.data.message); doFetchCounts(); }
      else throw new Error(res.data.error);
    } catch {
      setThreadsCache(prevCache); setActualCounts(prevCounts);
      toast.error(`Failed to ${action} thread`);
    }
  }, [threadsCache, actualCounts, API_BASE, doFetchCounts]);

  // ─── Bulk actions ────────────────────────────────────────────────────────
  const handleBulkAction = useCallback(async (action, value = true) => {
    if (!selectedThreads.size) { toast.error("No emails selected"); return; }
    const ids = [...selectedThreads];
    try {
      if (action === "star") {
        setThreadsCache((p) => ({
          ...p,
          [activeLabel]: (p[activeLabel] || []).map((t) =>
            selectedThreads.has(t.id) ? { ...t, starred: value } : t
          ),
        }));
        //  No email in body
        await api.post(`${API_BASE}/gmail/bulk-star`, { threadIds: ids, star: value });
        toast.success(`⭐ ${value ? "Starred" : "Unstarred"} ${ids.length} emails`);
      }
      if (action === "trash") {
        setThreadsCache((p) => ({
          ...p,
          [activeLabel]: (p[activeLabel] || []).filter((t) => !selectedThreads.has(t.id)),
        }));
        await api.post(`${API_BASE}/gmail/bulk-trash`, { threadIds: ids });
        toast.success(`Moved ${ids.length} emails to trash`);
      }
      if (action === "delete") {
        setThreadsCache((p) => ({
          ...p,
          [activeLabel]: (p[activeLabel] || []).filter((t) => !selectedThreads.has(t.id)),
        }));
        await api.post(`${API_BASE}/gmail/bulk-delete`, {
          threadIds: ids, permanent: activeLabel === "TRASH",
        });
        toast.success(`Deleted ${ids.length} emails`);
      }
      if (action === "read") {
        setReadSet((p) => {
          const s = new Set(p);
          ids.forEach((id) => value ? s.add(id) : s.delete(id));
          return s;
        });
        setThreadsCache((p) => ({
          ...p,
          [activeLabel]: (p[activeLabel] || []).map((t) =>
            selectedThreads.has(t.id) ? { ...t, unread: !value } : t
          ),
        }));
        await Promise.all(ids.map((id) =>
          api.post(`${API_BASE}/gmail/thread/${id}/read`, { read: value })
        ));
      }
      setSelectedThreads(new Set()); setShowBulkActions(false);
      doFetchCounts();
    } catch { toast.error(`Failed to ${action}`); }
  }, [selectedThreads, activeLabel, API_BASE, doFetchCounts]);

  // ─── Delete thread ───────────────────────────────────────────────────────
  const deleteThreadFn = useCallback(async (threadId, permanent = false) => {
    try {
      if (activeLabel === "DRAFTS") {
        //  No email in body (server ignores it anyway)
        await api.delete(`${API_BASE}/gmail/draft/${threadId}`);
        toast.success(" Draft deleted");
        setThreadsCache((p) => ({ ...p, DRAFTS: (p.DRAFTS || []).filter((t) => t.id !== threadId) }));
        setActualCounts((p) => ({ ...p, DRAFTS: Math.max(0, p.DRAFTS - 1) }));
        if (selectedThread === threadId) { setSelectedThread(null); setMessages([]); }
        return;
      }
      if (permanent) {
        setDeletedSet((p) => { const s = new Set(p); s.add(threadId); return s; });
        await api.delete(`${API_BASE}/gmail/thread/${threadId}`);
        toast.success(" Permanently deleted");
      } else {
        setTrashSet((p) => { const s = new Set(p); s.add(threadId); return s; });
        await api.post(`${API_BASE}/gmail/thread/${threadId}/trash`);
        toast.success(" Moved to trash");
      }
      setThreadsCache((p) => {
        const u = { ...p };
        Object.keys(u).forEach((l) => { u[l] = u[l].filter((t) => t.id !== threadId); });
        return u;
      });
      if (selectedThread === threadId) { setSelectedThread(null); setMessages([]); }
      doFetchCounts();
    } catch (err) { toast.error(err.response?.data?.error || "Failed to delete"); }
    finally { setShowDeleteModal(false); setThreadToDelete(null); }
  }, [activeLabel, API_BASE, selectedThread, doFetchCounts]);

  // ─── Disconnect ──────────────────────────────────────────────────────────
  const disconnectGmail = async () => {
    setShowDisconnModal(false);
    try {
      //  No email in body — server uses session
      await api.delete(`${API_BASE}/gmail/disconnect`);
      clearUserStorage(userEmail);
      setUserEmail(""); setAuthStatus({ authenticated: false, message: "Gmail disconnected" });
      setThreadsCache(EMPTY_CACHE()); setActualCounts(EMPTY_COUNTS());
      setMessages([]); setSelectedThread(null);
      setDeletedSet(new Set()); deletedRef.current = new Set();
      setTrashSet(new Set());   trashRef.current   = new Set();
      localStorage.removeItem(AUTH_KEY); localStorage.removeItem(EMAIL_KEY);
      await fetchAuthUrl();
      toast.success("Gmail disconnected successfully");
    } catch { toast.error("Error disconnecting Gmail"); }
  };

  // ─── Compose ─────────────────────────────────────────────────────────────
  const clearCompose = () => {
    setComposeData({ to: "", cc: "", bcc: "", subject: "", message: "" });
    setSelectedFiles([]); setComposeMode("new");
    setSuggestions({ to: [], cc: [], bcc: [] }); setSendProgress(0);
  };

  const handleSuggestionFetch = (field, query) => {
    clearTimeout(suggestTimers.current[field]);
    suggestTimers.current[field] = setTimeout(async () => {
      const token = query.split(",").pop().trim();
      if (token.length < 2) { setSuggestions((p) => ({ ...p, [field]: [] })); return; }
      try {
        //  No email param
        const res = await api.get(`${API_BASE}/gmail/suggestions`, { params: { query: token } });
        if (res.data.success) setSuggestions((p) => ({ ...p, [field]: res.data.data || [] }));
      } catch { setSuggestions((p) => ({ ...p, [field]: [] })); }
    }, 400);
  };

  const handleComposeChange = (field, value) => {
    setComposeData((p) => ({ ...p, [field]: value }));
    if (["to", "cc", "bcc"].includes(field)) handleSuggestionFetch(field, value);
  };

  const handleSelectSuggestion = (field, value) => {
    setComposeData((p) => ({ ...p, [field]: value.trimStart() }));
    setSuggestions((p) => ({ ...p, [field]: [] }));
  };

  const openReply = (msg, type = "reply") => {
    let to = "", subject = "", message = "";
    if (type === "reply") {
      to      = extractEmail(msg.from);
      subject = msg.subject?.startsWith("Re:") ? msg.subject : `Re: ${msg.subject}`;
      message = `\n\nOn ${formatDateTime(msg.date)}, ${extractName(msg.from)} wrote:\n> ${(msg.body || "").substring(0, 200)}...`;
    } else if (type === "replyAll") {
      const all = [
        extractEmail(msg.from),
        ...(msg.to  || "").split(",").map((e) => extractEmail(e.trim())).filter(Boolean),
        ...(msg.cc  || "").split(",").map((e) => extractEmail(e.trim())).filter(Boolean),
      ].filter((v, i, a) => a.indexOf(v) === i && v !== userEmail);
      to      = all.join(", ");
      subject = msg.subject?.startsWith("Re:") ? msg.subject : `Re: ${msg.subject}`;
      message = `\n\nOn ${formatDateTime(msg.date)}, ${extractName(msg.from)} wrote:\n> ${(msg.body || "").substring(0, 200)}...`;
    } else {
      subject = msg.subject?.startsWith("Fwd:") ? msg.subject : `Fwd: ${msg.subject}`;
      message = `\n\n---------- Forwarded message ----------\nFrom: ${msg.from}\nDate: ${msg.date}\nSubject: ${msg.subject}\nTo: ${msg.to}\n\n${msg.body || ""}`;
    }
    setComposeData({ to, cc: "", bcc: "", subject, message });
    setSuggestions({ to: [], cc: [], bcc: [] });
    setComposeMode(type); setShowCompose(true);
  };

  // ─── Send / Draft ────────────────────────────────────────────────────────
  const totalAttachSize = selectedFiles.reduce((s, f) => s + f.size, 0);

  const sendEmail = async () => {
    if (!composeData.to.trim()) { toast.error("Please enter recipient email address"); return; }
    if (totalAttachSize > GMAIL_ATTACH_LIMIT) { toast.error("Total attachments exceed 25 MB."); return; }
    setSending(true); setSendProgress(0);
    try {
      const fd = new FormData();
      fd.append("to",      composeData.to.trim());
      fd.append("cc",      composeData.cc?.trim()  || "");
      fd.append("bcc",     composeData.bcc?.trim() || "");
      fd.append("subject", composeData.subject?.trim() || "(No Subject)");
      fd.append("message", composeData.message?.trim() || "");
      //  No email appended to FormData
      selectedFiles.forEach((f) => fd.append("attachments", f));

      const res = await api.post(`${API_BASE}/gmail/send`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => { if (e.total) setSendProgress(Math.round((e.loaded * 100) / e.total)); },
        timeout: 300000,
      });
      if (res.data.success) {
        toast.success(" Email sent successfully!");
        clearCompose(); setShowCompose(false);
        doFetchCounts();
        setTimeout(() => fetchLabel({ label: activeLabel, force: true }), 800);
      } else throw new Error(res.data.error || "Failed to send");
    } catch (err) { toast.error(`Failed to send: ${err.response?.data?.error || err.message}`); }
    finally { setSending(false); setSendProgress(0); }
  };

  const saveAsDraft = async () => {
    if (!composeData.to.trim()) { toast.error("Please enter recipient email address"); return; }
    setSavingDraft(true);
    try {
      const fd = new FormData();
      fd.append("to",      composeData.to);
      fd.append("cc",      composeData.cc      || "");
      fd.append("bcc",     composeData.bcc     || "");
      fd.append("subject", composeData.subject || "(No Subject)");
      fd.append("message", composeData.message || "");
      //  No email appended
      selectedFiles.forEach((f) => fd.append("attachments", f));

      const res = await api.post(`${API_BASE}/gmail/draft`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data.success) {
        toast.success(" Draft saved!"); clearCompose(); setShowCompose(false);
        doFetchCounts();
        if (activeLabel === "DRAFTS") setTimeout(() => fetchDrafts(), 500);
      } else throw new Error(res.data.error || "Failed to save draft");
    } catch (err) { toast.error(`Failed to save draft: ${err.response?.data?.error || err.message}`); }
    finally { setSavingDraft(false); }
  };

  const handleFileSelect = (e) => {
    const files = [...e.target.files].filter((f) => {
      if (f.size > GMAIL_ATTACH_LIMIT) { toast.error(` "${f.name}" exceeds 25 MB limit.`); return false; }
      return true;
    });
    if (files.length) setSelectedFiles((p) => [...p, ...files]);
    if (e.target) e.target.value = "";
  };

  const downloadAttachment = async (messageId, attachment) => {
    try {
      //  No email param
      const res = await api.get(
        `${API_BASE}/gmail/attachment/${messageId}/${attachment.id}`,
        { responseType: "blob" }
      );
      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url; link.setAttribute("download", attachment.filename);
      document.body.appendChild(link); link.click(); link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(` Downloaded ${attachment.filename}`);
    } catch { toast.error("Failed to download attachment"); }
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const formatDateTime = (ds) => {
    if (!ds) return "";
    try {
      const d = new Date(ds), now = new Date(), ms = now - d;
      const mins = Math.floor(ms / 60000), hrs = Math.floor(ms / 3600000), days = Math.floor(ms / 86400000);
      if (mins < 1)  return "Just now";
      if (mins < 60) return `${mins}m ago`;
      if (hrs  < 24) return `${hrs}h ago`;
      if (days <  7) return `${days}d ago`;
      return d.toLocaleDateString("en-US", {
        month: "short", day: "numeric",
        year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    } catch { return ds; }
  };
  const extractName  = (s) => { if (!s) return "Unknown"; const m = s.match(/(.*?)</); return m ? m[1].trim() : s; };
  const extractEmail = (s) => { if (!s) return ""; const m = s.match(/<([^>]+)>/); return m ? m[1] : s; };
  const formatFileSize = (bytes) => {
    if (!bytes) return "0 Bytes";
    const k = 1024, arr = ["Bytes", "KB", "MB", "GB"],
          i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), 3);
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${arr[i]}`;
  };
  const getFileIcon = (file) => {
    const t = file.type || file.mimeType || "", ext = (file.name || file.filename || "").split(".").pop().toLowerCase();
    if (t.startsWith("image/") || ["jpg","jpeg","png","gif","svg","webp"].includes(ext)) return <FaImage className="w-5 h-5 text-blue-500" />;
    if (t.includes("pdf") || ext === "pdf")    return <FaFilePdf className="w-5 h-5 text-red-500" />;
    if (t.includes("audio") || ["mp3","wav","ogg"].includes(ext))  return <FaFileAudio  className="w-5 h-5 text-purple-500" />;
    if (t.includes("video") || ["mp4","avi","mov"].includes(ext))  return <FaFileVideo  className="w-5 h-5 text-pink-500" />;
    if (["zip","rar","7z","tar","gz"].includes(ext))                return <FaFileArchive className="w-5 h-5 text-yellow-600" />;
    if (["doc","docx","txt"].includes(ext))                         return <FaFileAlt    className="w-5 h-5 text-blue-700" />;
    if (["xls","xlsx","csv"].includes(ext))                         return <FaFileExcel  className="w-5 h-5 text-green-600" />;
    if (["js","ts","py","html","css"].includes(ext))                return <FaFileCode   className="w-5 h-5 text-green-700" />;
    return <FaFile className="w-5 h-5 text-gray-500" />;
  };

  // ─── Derived ──────────────────────────────────────────────────────────────
  const currentThreads = (threadsCache[activeLabel] || []).filter((t) =>
    !deletedRef.current.has(t.id) &&
    (activeLabel === "TRASH" ? true : !trashRef.current.has(t.id))
  );
  const filteredThreads = currentThreads.filter((t) => {
    if (activeLabel === "UNREAD" && !t.unread) return false;
    const q = searchQuery.toLowerCase();
    return !q || t.subject?.toLowerCase().includes(q) || t.from?.toLowerCase().includes(q) || t.snippet?.toLowerCase().includes(q);
  });
  const getSidebarCount = (id) => {
    if (id === "TRASH") {
      const tr = (threadsCache["TRASH"] || []).filter((t) => !deletedRef.current.has(t.id));
      return tr.length > 0 ? actualCounts.TRASH : tr.length;
    }
    return actualCounts[id] || 0;
  };
  const labelOptions = [
    { id: "INBOX",     name: "Inbox",     icon: <FaInbox            size={15} /> },
    { id: "UNREAD",    name: "Unread",    icon: <FaEnvelope          size={15} /> },
    { id: "STARRED",   name: "Starred",   icon: <FaStar              size={15} /> },
    { id: "IMPORTANT", name: "Important", icon: <FaExclamationCircle size={15} /> },
    { id: "DRAFTS",    name: "Drafts",    icon: <FaFileAlt           size={15} /> },
    { id: "SENT",      name: "Sent",      icon: <FaPaperPlane        size={15} /> },
    { id: "SPAM",      name: "Spam",      icon: <FaExclamationTriangle size={15} /> },
    { id: "TRASH",     name: "Trash",     icon: <FaTrash             size={15} /> },
  ];

  // ─── Auth loading ────────────────────────────────────────────────────────
  if (authLoading && !authStatus.authenticated && currentThreads.length === 0) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#1a73e8,#0d47a1)" }}>
            <FaSpinner className="animate-spin text-white" size={28} />
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-1">Connecting to Gmail</h3>
          <p className="text-gray-400 text-sm">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!authStatus.authenticated) {
    return (
      <>
        <ToastContainer position="top-right" autoClose={3000} />
        <GmailConnectScreen
          authUrl={authUrl} authStatus={authStatus} error={error}
          loading={authLoading} isConnecting={isConnecting}
          onConnect={() => { if (authUrl) { setIsConnecting(true); window.location.href = authUrl; } }}
          onFetchAuthUrl={fetchAuthUrl} onCheckStatus={checkAuthStatus}
        />
      </>
    );
  }

  // ─── MAIN APP ─────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* DISCONNECT MODAL */}
      <Dialog open={showDisconnModal} onOpenChange={setShowDisconnModal}>
        <DialogContent className="bg-white rounded-2xl shadow-xl max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-800 text-lg font-semibold">
              <FaSignOutAlt size={18} color="#dc2626" /> Disconnect Gmail
            </DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <FaExclamationTriangle size={30} color="#dc2626" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Disconnect {userEmail}?</h3>
            <p className="text-gray-500 text-center text-sm mb-5">You'll need to reconnect to access your emails again.</p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-yellow-800 flex items-start gap-2">
                <FaInfoCircle size={15} className="flex-shrink-0 mt-0.5" />
                <span>Your emails are stored on Google's servers and won't be deleted.</span>
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setShowDisconnModal(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-600 text-sm font-medium">
                Cancel
              </button>
              <button onClick={disconnectGmail}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 text-sm font-medium">
                <FaSignOutAlt size={13} /> Disconnect
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* COMPOSE MODAL */}
      <Dialog open={showCompose} onOpenChange={(open) => { if (!open) { setShowCompose(false); clearCompose(); } else setShowCompose(true); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl">
          <DialogHeader className="border-b border-gray-100 pb-4">
            <DialogTitle className="flex items-center gap-2 text-gray-800 text-lg font-semibold">
              {composeMode === "reply" ? <FaReply size={15} /> : composeMode === "forward" ? <FaForward size={15} /> : <FaEdit size={15} />}
              {composeMode === "reply" ? "Reply" : composeMode === "replyAll" ? "Reply All" : composeMode === "forward" ? "Forward" : "New Message"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1 mt-4">
            <EmailInputWithSuggestions label="To" field="to" required value={composeData.to}
              onChange={handleComposeChange} suggestions={suggestions.to}
              onSelectSuggestion={handleSelectSuggestion} placeholder="Recipient email (comma separated)" />
            <EmailInputWithSuggestions label="Cc"  field="cc"  value={composeData.cc}
              onChange={handleComposeChange} suggestions={suggestions.cc}
              onSelectSuggestion={handleSelectSuggestion} placeholder="Cc (optional)" />
            <EmailInputWithSuggestions label="Bcc" field="bcc" value={composeData.bcc}
              onChange={handleComposeChange} suggestions={suggestions.bcc}
              onSelectSuggestion={handleSelectSuggestion} placeholder="Bcc (optional)" />
            <div className="flex items-center border-b border-gray-100 pb-2">
              <label className="w-16 text-sm font-medium text-gray-500 flex-shrink-0">Subject</label>
              <input type="text" value={composeData.subject}
                onChange={(e) => setComposeData((p) => ({ ...p, subject: e.target.value }))}
                className="flex-1 p-2 border-none focus:ring-0 focus:outline-none text-gray-800 text-sm placeholder-gray-400"
                placeholder="Subject (optional)" />
            </div>
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 mt-2">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <FaPaperclip size={13} />Attachments
                  <span className="text-gray-400 font-normal text-xs">
                    (max 25 MB{selectedFiles.length > 0 && ` · total ${formatFileSize(totalAttachSize)}`})
                  </span>
                  {totalAttachSize > GMAIL_ATTACH_LIMIT && <span className="text-red-500 text-xs font-semibold">⚠ Over limit!</span>}
                </label>
                <button onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                  style={{ background: "#1a73e8" }}>
                  <FaPlus size={10} />Add
                </button>
                <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" accept="*/*" />
              </div>
              {selectedFiles.length > 0 ? (
                <div className="space-y-2">
                  {selectedFiles.map((f, i) => (
                    <div key={i}
                      className={`flex items-center justify-between p-2.5 bg-white rounded-lg border ${f.size > GMAIL_ATTACH_LIMIT ? "border-red-300 bg-red-50" : "border-gray-100"}`}>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getFileIcon(f)}
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate text-gray-700">{f.name}</p>
                          <p className={`text-xs ${f.size > GMAIL_ATTACH_LIMIT ? "text-red-500 font-semibold" : "text-gray-400"}`}>{formatFileSize(f.size)}</p>
                        </div>
                      </div>
                      <button onClick={() => setSelectedFiles((p) => p.filter((_, j) => j !== i))}
                        className="ml-2 text-red-400 hover:text-red-600 p-1"><FaTimes size={12} /></button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl">
                  <FaPaperclip size={28} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">Drop files here or click Add · Max 25 MB per file</p>
                </div>
              )}
            </div>
            <textarea value={composeData.message}
              onChange={(e) => setComposeData((p) => ({ ...p, message: e.target.value }))}
              rows="10"
              className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:outline-none resize-none text-sm text-gray-800 placeholder-gray-400 mt-2"
              placeholder="Write your message..." />
          </div>
          {sending && sendProgress > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Sending...</span><span>{sendProgress}%</span></div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${sendProgress}%`, background: "#1a73e8" }} />
              </div>
            </div>
          )}
          <div className="flex justify-between items-center mt-5 pt-4 border-t border-gray-100">
            <div className="flex gap-2">
              <button onClick={clearCompose}
                className="px-3 py-2 text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 text-xs">
                <FaTrash size={12} />Clear
              </button>
              <button onClick={saveAsDraft} disabled={savingDraft || !composeData.to.trim()}
                className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-200 disabled:opacity-50 flex items-center gap-1.5 text-xs">
                {savingDraft ? <><FaSpinner className="animate-spin" size={11} />Saving...</> : <><FaSave size={12} />Draft</>}
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowCompose(false); clearCompose(); }}
                className="px-4 py-2 text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
              <button onClick={sendEmail} disabled={sending || !composeData.to.trim() || totalAttachSize > GMAIL_ATTACH_LIMIT}
                className="px-4 py-2 text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5 text-sm"
                style={{ background: sending ? "#ccc" : "linear-gradient(135deg,#1a73e8,#1557b0)" }}>
                {sending ? <><FaSpinner className="animate-spin" size={13} />Sending...</> : <><FaPaperPlane size={13} />Send</>}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE MODAL */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="bg-white rounded-2xl shadow-xl max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-800 text-lg font-semibold">
              <FaTrash size={16} color={threadToDelete?.permanent ? "#dc2626" : "#f97316"} />
              {threadToDelete?.permanent ? "Permanently Delete" : "Move to Trash"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <div className="flex items-center justify-center mb-4">
              <div className={`w-16 h-16 ${threadToDelete?.permanent ? "bg-red-100" : "bg-orange-100"} rounded-full flex items-center justify-center`}>
                {threadToDelete?.permanent
                  ? <FaExclamationTriangle size={30} color="#dc2626" />
                  : <FaTrash size={28} color="#f97316" />}
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
              {threadToDelete?.permanent ? "Delete permanently?" : "Move to trash?"}
            </h3>
            <p className="text-gray-500 text-sm text-center mb-6">
              {threadToDelete?.permanent ? "This cannot be undone." : "You can restore it from trash later."}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => { setShowDeleteModal(false); setThreadToDelete(null); }}
                className="px-5 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-600 text-sm font-medium">Cancel</button>
              <button onClick={() => deleteThreadFn(threadToDelete.id, threadToDelete.permanent)}
                className={`px-5 py-2.5 rounded-xl text-white flex items-center gap-2 text-sm font-medium ${threadToDelete?.permanent ? "bg-red-600 hover:bg-red-700" : "bg-orange-500 hover:bg-orange-600"}`}>
                <FaTrash size={13} />{threadToDelete?.permanent ? "Delete" : "Move to Trash"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* LAYOUT */}
      <div className="flex h-full overflow-hidden">
        <button onClick={() => setShowMobileSidebar(!showMobileSidebar)}
          className="lg:hidden fixed top-4 left-4 z-50 bg-white p-2.5 rounded-xl shadow-lg border border-gray-200">
          <FaBars size={16} color="#5f6368" />
        </button>

        {/* SIDEBAR */}
        <div
          className={`${sidebarCollapsed ? "w-16" : "w-60"} bg-white flex flex-col transition-all duration-300 ease-in-out ${showMobileSidebar ? "fixed inset-y-0 left-0 z-40 shadow-xl" : "hidden lg:flex"}`}
          style={{ borderRight: "1px solid #e8eaed" }}
        >
          <div className="px-3 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #e8eaed" }}>
            <div className={`flex items-center ${sidebarCollapsed ? "justify-center w-full" : "gap-2.5"}`}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#1a73e8,#0d47a1)" }}
              >
                {userEmail?.charAt(0).toUpperCase()}
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{userEmail}</p>
                  <p className="text-xs" style={{ color: "#5f6368" }}>{actualCounts.UNREAD} unread</p>
                </div>
              )}
            </div>
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="hidden lg:block p-1 hover:bg-gray-100 rounded-lg">
              <FaChevronLeft size={11} className={`text-gray-400 transform transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`} />
            </button>
          </div>

          <div className="p-3" style={{ borderBottom: "1px solid #f1f3f4" }}>
            <button
              onClick={() => { setComposeMode("new"); setShowCompose(true); }}
              className={`w-full text-sm font-medium py-2.5 rounded-2xl flex items-center justify-center gap-2 transition hover:shadow-md ${sidebarCollapsed ? "px-2" : "px-4"}`}
              style={{ background: "#c2e7ff", color: "#001d35" }}
            >
              <FaEdit size={14} className="flex-shrink-0" />
              {!sidebarCollapsed && <span>Compose</span>}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {labelOptions.map((label) => {
              const count    = getSidebarCount(label.id);
              const isActive = activeLabel === label.id;
              return (
                <button
                  key={label.id} onClick={() => handleLabelClick(label.id)}
                  className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-3"} py-2 transition-all duration-100 text-sm`}
                  style={{
                    borderRadius: "0 100px 100px 0",
                    background:   isActive ? "#d3e3fd" : "transparent",
                    color:        isActive ? "#1a73e8" : "#444746",
                    fontWeight:   isActive ? 600 : 400,
                    marginRight:  "8px",
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "#f1f3f4"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = isActive ? "#d3e3fd" : "transparent"; }}
                  title={sidebarCollapsed ? label.name : ""}
                >
                  <div className={`flex items-center ${sidebarCollapsed ? "" : "gap-3"}`}>
                    <span style={{ color: isActive ? "#1a73e8" : "#444746" }}>{label.icon}</span>
                    {!sidebarCollapsed && <span>{label.name}</span>}
                  </div>
                  {!sidebarCollapsed && count > 0 && (
                    <span className="text-xs font-semibold" style={{ color: isActive ? "#1a73e8" : "#444746" }}>
                      {count > 999 ? `${Math.floor(count / 1000)}k` : count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-3" style={{ borderTop: "1px solid #e8eaed" }}>
            <button
              onClick={() => setShowDisconnModal(true)}
              className={`w-full text-xs text-red-500 hover:bg-red-50 px-3 py-2 rounded-xl transition flex items-center ${sidebarCollapsed ? "justify-center" : "gap-2"}`}
            >
              <FaSignOutAlt size={13} />
              {!sidebarCollapsed && <span>Disconnect</span>}
            </button>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#f6f8fc" }}>
          {/* HEADER */}
          <div className="bg-white px-5 py-3 flex-shrink-0" style={{ borderBottom: "1px solid #e8eaed" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedThread && (
                  <button
                    onClick={() => {
                      setSelectedThread(null); setMessages([]);
                      openingRef.current = null;
                      if (abortThreadRef.current) abortThreadRef.current.abort();
                    }}
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition"
                  >
                    <FaArrowLeft size={15} />
                  </button>
                )}
                <h1 className="text-base font-medium flex items-center gap-2" style={{ color: "#202124" }}>
                  {selectedThread ? (
                    threadLoading
                      ? <span className="text-gray-400 text-sm animate-pulse">Loading email…</span>
                      : <span className="truncate max-w-md">{messages[0]?.subject || "Email"}</span>
                  ) : (
                    <>
                      <span style={{ color: "#5f6368" }}>{labelOptions.find((l) => l.id === activeLabel)?.icon}</span>
                      <span>{labelOptions.find((l) => l.id === activeLabel)?.name}</span>
                      <span className="text-sm font-normal ml-1" style={{ color: "#5f6368" }}>
                        ({actualCounts[activeLabel] || 0})
                      </span>
                    </>
                  )}
                </h1>
              </div>
              {!selectedThread && (
                <button
                  onClick={() => fetchLabel({ label: activeLabel, force: true })}
                  disabled={listLoading && listLoadLabel === activeLabel}
                  className="p-2 rounded-full hover:bg-gray-100 transition" style={{ color: "#5f6368" }}
                >
                  {listLoading && listLoadLabel === activeLabel
                    ? <FaSpinner className="animate-spin" size={15} />
                    : <FaSync size={15} />}
                </button>
              )}
            </div>

            {showBulkActions && !selectedThread && (
              <div className="mt-3 px-3 py-2 rounded-xl flex items-center gap-3 flex-wrap" style={{ background: "#e8f0fe" }}>
                <span className="text-xs font-medium flex items-center gap-1" style={{ color: "#1a73e8" }}>
                  <FaCheckSquare size={13} />{selectedThreads.size} selected
                </span>
                <button onClick={() => handleBulkAction("read", true)}  className="text-xs bg-white px-3 py-1 rounded-full border" style={{ color: "#1a73e8", borderColor: "#c5d6f5" }}>Mark Read</button>
                <button onClick={() => handleBulkAction("star", true)}  className="text-xs bg-white px-3 py-1 rounded-full border" style={{ color: "#1a73e8", borderColor: "#c5d6f5" }}>⭐ Star</button>
                <button onClick={() => handleBulkAction("trash")}       className="text-xs bg-white px-3 py-1 rounded-full border" style={{ color: "#1a73e8", borderColor: "#c5d6f5" }}>🗑 Trash</button>
                <button onClick={() => { setSelectedThreads(new Set()); setShowBulkActions(false); }}
                  className="ml-auto text-xs" style={{ color: "#5f6368" }}>Clear</button>
              </div>
            )}

            {!selectedThread && (
              <div className="mt-3 flex gap-2">
                <div className="flex-1 relative">
                  <FaSearch size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#5f6368" }} />
                  <input
                    type="text" value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search in ${activeLabel.toLowerCase()}...`}
                    className="w-full pl-9 pr-4 py-2 rounded-2xl text-sm border-0 outline-none"
                    style={{ background: "#eaf1fb", color: "#202124" }}
                  />
                </div>
                {activeLabel === "INBOX" && (
                  <button
                    onClick={() => handleLabelClick("UNREAD")}
                    className="px-3.5 py-2 rounded-2xl text-sm flex items-center gap-2 transition"
                    style={{ background: "#fff", border: "1px solid #e8eaed", color: "#5f6368" }}
                  >
                    <FaEnvelope size={13} />
                    <span className="hidden sm:inline">Unread</span>
                    {actualCounts.UNREAD > 0 && (
                      <span className="text-white text-xs rounded-full px-1.5 py-0.5 font-semibold" style={{ background: "#1a73e8" }}>
                        {actualCounts.UNREAD}
                      </span>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2 text-sm">
              <FaExclamationCircle size={15} />{error}
            </div>
          )}

          {/* THREAD LIST / DETAIL */}
          <div className="flex-1 overflow-y-auto p-4">
            {!selectedThread ? (
              <div>
                {listLoading && listLoadLabel === activeLabel && currentThreads.length === 0 ? (
                  <ThreadSkeleton />
                ) : filteredThreads.length === 0 ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: "#f1f3f4" }}>
                        <FaEnvelope size={34} style={{ color: "#dadce0" }} />
                      </div>
                      <h3 className="text-base font-medium mb-1" style={{ color: "#5f6368" }}>No emails found</h3>
                      <p className="text-sm" style={{ color: "#80868b" }}>
                        {searchQuery ? "Try adjusting your search"
                          : activeLabel === "UNREAD" ? "You're all caught up! "
                          : `No emails in ${activeLabel.toLowerCase()}`}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl overflow-hidden bg-white" style={{ border: "1px solid #e8eaed" }}>
                    {filteredThreads.map((thread) => {
                      const isThisOpening = openingRef.current === thread.id && threadLoading;
                      return (
                        <div
                          key={thread.id}
                          className="group flex items-center px-4 py-2.5 border-b last:border-0 transition-colors duration-100"
                          style={{ borderColor: "#f1f3f4", background: thread.unread ? "#f8f9ff" : "white" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#f0f4ff"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = thread.unread ? "#f8f9ff" : "white"; }}
                        >
                          <input
                            type="checkbox" checked={selectedThreads.has(thread.id)}
                            onChange={() => {
                              const s = new Set(selectedThreads);
                              s.has(thread.id) ? s.delete(thread.id) : s.add(thread.id);
                              setSelectedThreads(s); setShowBulkActions(s.size > 0);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 rounded border-gray-300 mr-3 flex-shrink-0"
                            style={{ accentColor: "#1a73e8" }}
                          />
                          <button
                            onClick={(e) => { e.stopPropagation(); markThreadAs(thread.id, "star", !thread.starred); }}
                            className={`mr-3 flex-shrink-0 transition-opacity ${thread.starred ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                            style={{ color: thread.starred ? "#f4b400" : "#dadce0" }}
                          >
                            <FaStar size={15} />
                          </button>
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 mr-3 select-none"
                            style={{ background: `hsl(${(thread.from?.charCodeAt(0) || 65) * 17 % 360},50%,45%)` }}
                          >
                            {extractName(thread.from).charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0 cursor-pointer py-1 select-none" onClick={() => loadThread(thread.id)}>
                            <div className="flex items-center gap-2">
                              <span
                                className="text-sm truncate w-40 flex-shrink-0"
                                style={{ color: thread.unread ? "#202124" : "#5f6368", fontWeight: thread.unread ? 600 : 400 }}
                              >
                                {extractName(thread.from)}
                              </span>
                              <span className="text-sm truncate" style={{ color: thread.unread ? "#202124" : "#5f6368" }}>
                                {thread.subject || "(No Subject)"}
                                <span className="font-normal ml-1.5" style={{ color: "#80868b" }}>{thread.snippet}</span>
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                            {isThisOpening
                              ? <FaSpinner className="animate-spin" size={12} style={{ color: "#1a73e8" }} />
                              : thread.unread && <div className="w-2 h-2 rounded-full" style={{ background: "#1a73e8" }} />}
                            <span className="text-xs whitespace-nowrap" style={{ color: "#5f6368" }}>{formatDateTime(thread.date)}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); setThreadToDelete({ id: thread.id, permanent: activeLabel === "TRASH" }); setShowDeleteModal(true); }}
                              className="opacity-0 group-hover:opacity-100 transition p-1 rounded-full hover:bg-gray-100"
                              style={{ color: "#5f6368" }}
                            >
                              <FaTrash size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {nextPageTokens[activeLabel] && filteredThreads.length > 0 && (
                  <div className="mt-3 text-center">
                    <button
                      onClick={() => fetchLabel({ label: activeLabel, loadMore: true })}
                      disabled={listLoading && listLoadLabel === activeLabel}
                      className="text-sm px-5 py-2 rounded-full border transition"
                      style={{ borderColor: "#dadce0", color: "#1a73e8", background: "white" }}
                    >
                      {listLoading && listLoadLabel === activeLabel
                        ? <><FaSpinner className="animate-spin inline mr-2" size={13} />Loading...</>
                        : <><FaPlus className="inline mr-2" size={13} />Load More</>}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* DETAIL VIEW */
              <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e8eaed" }}>
                {threadLoading ? (
                  <MessageSkeleton />
                ) : messages.length === 0 ? (
                  <div className="text-center py-12">
                    <FaEnvelope size={46} className="mx-auto mb-3" style={{ color: "#dadce0" }} />
                    <p className="text-sm" style={{ color: "#5f6368" }}>No messages</p>
                  </div>
                ) : (
                  <div>
                    {messages.map((msg) => (
                      <div key={msg.id} className="p-6" style={{ borderBottom: "1px solid #f1f3f4" }}>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                              style={{ background: `hsl(${(msg.from?.charCodeAt(0) || 65) * 17 % 360},50%,45%)` }}
                            >
                              {extractName(msg.from).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-medium text-sm" style={{ color: "#202124" }}>{extractName(msg.from)}</h4>
                              <p className="text-xs" style={{ color: "#5f6368" }}>{extractEmail(msg.from)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs" style={{ color: "#5f6368" }}>{new Date(msg.date).toLocaleString()}</span>
                            <button
                              onClick={() => markThreadAs(selectedThread, "star", !msg.starred)}
                              className="p-1.5 rounded-full hover:bg-gray-100"
                              style={{ color: msg.starred ? "#f4b400" : "#dadce0" }}
                            >
                              <FaStar size={15} />
                            </button>
                            <button
                              onClick={() => markThreadAs(selectedThread, "important", !msg.important)}
                              className="p-1.5 rounded-full hover:bg-gray-100"
                              style={{ color: msg.important ? "#f29900" : "#dadce0" }}
                            >
                              <FaExclamationCircle size={15} />
                            </button>
                          </div>
                        </div>
                        {(msg.to || msg.cc) && (
                          <div className="mb-4 text-xs" style={{ color: "#5f6368" }}>
                            {msg.to && <p><span className="font-medium">To:</span> {msg.to}</p>}
                            {msg.cc && <p><span className="font-medium">Cc:</span> {msg.cc}</p>}
                          </div>
                        )}
                        {msg.hasAttachments && msg.attachments?.length > 0 && (
                          <div className="mb-4 p-3 rounded-xl" style={{ background: "#f6f8fc" }}>
                            <h5 className="text-xs font-medium mb-2 flex items-center gap-1.5" style={{ color: "#444746" }}>
                              <FaPaperclip size={11} />Attachments ({msg.attachments.length})
                            </h5>
                            <div className="space-y-1.5">
                              {msg.attachments.map((att, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg" style={{ border: "1px solid #e8eaed" }}>
                                  <div className="flex items-center gap-2">
                                    {getFileIcon({ mimeType: att.mimeType, filename: att.filename })}
                                    <div>
                                      <p className="text-xs font-medium" style={{ color: "#202124" }}>{att.filename}</p>
                                      <p className="text-xs" style={{ color: "#5f6368" }}>{formatFileSize(att.size)}</p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => downloadAttachment(msg.id, att)}
                                    className="text-xs px-2.5 py-1 rounded-full flex items-center gap-1"
                                    style={{ color: "#1a73e8", background: "#e8f0fe" }}
                                  >
                                    <FaDownload size={11} />Download
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="prose max-w-none">
                          {msg.htmlBody
                            ? <div className="text-sm leading-relaxed" style={{ color: "#202124" }} dangerouslySetInnerHTML={{ __html: msg.htmlBody }} />
                            : <pre className="text-sm whitespace-pre-wrap font-sans" style={{ color: "#202124" }}>{msg.body || "No content"}</pre>}
                        </div>
                        <div className="mt-5 flex items-center gap-2 pt-4" style={{ borderTop: "1px solid #f1f3f4" }}>
                          <button onClick={() => openReply(msg, "reply")}
                            className="text-sm px-4 py-1.5 rounded-full flex items-center gap-1.5"
                            style={{ background: "#c2e7ff", color: "#001d35" }}>
                            <FaReply size={13} />Reply
                          </button>
                          <button onClick={() => openReply(msg, "replyAll")}
                            className="text-sm px-4 py-1.5 rounded-full border flex items-center gap-1.5 hover:bg-gray-50"
                            style={{ border: "1px solid #dadce0", color: "#444746" }}>
                            <FaReplyAll size={13} />Reply All
                          </button>
                          <button onClick={() => openReply(msg, "forward")}
                            className="text-sm px-4 py-1.5 rounded-full border flex items-center gap-1.5 hover:bg-gray-50"
                            style={{ border: "1px solid #dadce0", color: "#444746" }}>
                            <FaForward size={13} />Forward
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showMobileSidebar && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-30 lg:hidden"
          onClick={() => setShowMobileSidebar(false)} />
      )}
    </div>
  );
};

export default EmailChat;

