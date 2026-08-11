import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useSocket } from "../../context/SocketContext";
import { useTargetSocket } from "../../context/TargetSocketContext";
import { useNotifications } from "../../context/NotificationContext";

import { validateTargetDates, todayISO, tomorrowISO, toLocalDateString, isDateOverdue } from "../../utils/dateValidation";
import ReportCallModal from "./components/ReportCallModal";
import ReportMeetingModal from "./components/ReportMeetingModal";
import ViewReportsModal from "./components/ViewReportsModal";
import {
  Plus, Target, Trash2, X, Users, Phone, TrendingUp,
  Calendar, CheckCircle, Briefcase, Mail,
  Clock, Award, ChevronDown, ChevronUp, Building2, Check, MessageSquare, Pencil,
  LayoutGrid, List, Bell, Flag, ArrowRightLeft, AlertCircle, UserCheck,
  ChevronLeft, ChevronRight, Trophy, XCircle, Activity, Info, CheckCheck, Search
} from "lucide-react";

import TargetPipelineView from "./TargetPipelineView";

const SI_URI = import.meta.env.VITE_SI_URI || "http://localhost:5000";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/* ── Helpers ─────────────────────── */
// Animates from 0 up to the real value on every mount/update instead of
// snapping straight to it — a CSS transition only plays on a style change
// *after* the browser has painted the previous value, so a single rAF isn't
// reliable (it can still land in the same paint as the initial 0 render);
// nesting two rAFs guarantees a 0%-width frame is actually painted first,
// so the next style change to the real value is a genuine transition.
function ProgressBar({ value, color = "bg-[#008ecc]" }) {
  const target = Math.min(100, value);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    setWidth(0);
    let raf2;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setWidth(target));
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [target]);
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div className={`h-2 rounded-full transition-all duration-500 ease-out ${color}`}
        style={{ width: `${width}%` }} />
    </div>
  );
}
function StatCard({ label, value, icon, color, bg }) {
  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <div className={`mb-1 ${color}`}>{icon}</div>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
function getProgressColor(pct) {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 50) return "bg-amber-400";
  return "bg-red-400";
}
function getTextColor(pct) {
  if (pct >= 80) return "text-emerald-600";
  if (pct >= 50) return "text-amber-600";
  return "text-red-500";
}
function fmt(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtTime(date) {
  if (!date) return "";
  return new Date(date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

const STAGE_DOT = {
  Qualification: "bg-blue-400",
  "Proposal Sent-Negotiation": "bg-yellow-400",
  "Invoice Sent": "bg-orange-400",
  "Closed Won": "bg-emerald-500",
  "Closed Lost": "bg-red-400",
};

// Who actually converted/worked this deal — shown to Admin regardless of
// whether it was the sales person themselves or Admin who did it, so the
// attribution is always visible, never silent. Converting and moving stages
// later are different actions and get distinct, specific wording. Rendered on
// its own line (never inline with the name) so a long name never squeezes the
// deal/lead name down to nothing.
function getAdminActionBadge(d) {
  if (d.convertedByName) {
    const text = d.salesPersonConverted
      ? `${d.convertedByName} converted lead to deal`
      : `Admin ${d.convertedByName} converted lead to deal`;
    return { text, title: text };
  }
  if (d.takenByAdminName) {
    return { text: `Admin ${d.takenByAdminName} took this deal`, title: `This deal has been worked on by Admin ${d.takenByAdminName}` };
  }
  return null;
}

const LEAD_STATUS_COLOR = {
  New: "bg-blue-100 text-blue-700 border-blue-200",
  Contacted: "bg-cyan-100 text-cyan-700 border-cyan-200",
  Interested: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Qualified: "bg-green-100 text-green-700 border-green-200",
  Converted: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Cold: "bg-gray-100 text-gray-600 border-gray-200",
  "Not Interested": "bg-red-100 text-red-600 border-red-200",
  Lost: "bg-gray-100 text-gray-500 border-gray-200",
};
const STAGE_COLOR = {
  Qualification: "bg-blue-100 text-blue-700 border-blue-200",
  "Proposal Sent-Negotiation": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Invoice Sent": "bg-orange-100 text-orange-700 border-orange-200",
  "Closed Won": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Closed Lost": "bg-red-100 text-red-600 border-red-200",
};

/* ── Checkbox component ─────────────────────── */
function Checkbox({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onChange(e); }}
      className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
        checked ? "bg-[#008ecc] border-[#008ecc]" : "border-gray-300 bg-white hover:border-[#008ecc]"
      }`}
    >
      {checked && <Check size={10} className="text-white" strokeWidth={3} />}
    </button>
  );
}

/* ── Sales Person Preview Panel (inside modal) ─────────────────────── */
function SalesPersonPreview({ userId, baseUrl, headers, selectedLeads, selectedDeals, onToggleLead, onToggleDeal, onSelectAllLeads, onSelectAllDeals, inUseLeadIds = [], inUseDealIds = [], inTaskLeadIds = [], inTaskDealIds = [] }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("leads");
  const [searchQuery, setSearchQuery] = useState("");
  const [leadStatusFilter, setLeadStatusFilter] = useState("");
  const [dealStageFilter, setDealStageFilter] = useState("");

  useEffect(() => {
    if (!userId) { setData(null); return; }
    setLoading(true);
    axios.get(`${baseUrl}/targets/sales-summary/${userId}`, { headers })
      .then(r => setData(r.data))
      .catch(() => toast.error("Failed to load person data"))
      .finally(() => setLoading(false));
  }, [userId]);

  if (!userId) return (
    <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-3 py-12">
      <Users size={40} />
      <p className="text-xs text-center text-gray-400 leading-relaxed">
        Select a sales person to preview<br />their leads & deals
      </p>
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Loading...</div>
  );

  if (!data) return null;

  let leadsList = (data.leads.list || []).filter((l) => !["Converted", "Rejected"].includes(l.status) || selectedLeads.has(l._id));
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    leadsList = leadsList.filter((l) => l.leadName?.toLowerCase().includes(q) || l.companyName?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q));
  }
  if (leadStatusFilter) {
    leadsList = leadsList.filter((l) => l.status === leadStatusFilter);
  }
  const leads = { ...data.leads, list: leadsList, total: leadsList.length };

  let dealsList = (data.deals.list || []).filter((d) => !["Closed Won", "Closed Lost"].includes(d.stage) || selectedDeals.has(d._id));
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    dealsList = dealsList.filter((d) => d.dealName?.toLowerCase().includes(q) || d.companyName?.toLowerCase().includes(q));
  }
  if (dealStageFilter) {
    dealsList = dealsList.filter((d) => d.stage === dealStageFilter);
  }
  const deals = { ...data.deals, list: dealsList, total: dealsList.length };

  const allLeadsSelected = leads.list.length > 0 && leads.list.every(l => selectedLeads.has(l._id));
  const allDealsSelected = deals.list.length > 0 && deals.list.every(d => selectedDeals.has(d._id));

  return (
    <div className="space-y-3 h-full flex flex-col">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-blue-600">{leads.total}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Leads</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-indigo-600">{deals.total}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Deals</p>
        </div>
      </div>

      {/* Selection summary */}
      {(selectedLeads.size > 0 || selectedDeals.size > 0) && (
        <div className="bg-[#008ecc]/10 border border-[#008ecc]/20 rounded-xl px-3 py-2 flex items-center gap-2">
          <Check size={13} className="text-[#008ecc]" />
          <p className="text-xs text-[#008ecc] font-semibold">
            {selectedLeads.size} lead{selectedLeads.size !== 1 ? "s" : ""} + {selectedDeals.size} deal{selectedDeals.size !== 1 ? "s" : ""} linked to this target
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 shrink-0">
        <button type="button" onClick={() => setTab("leads")}
          className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all ${tab === "leads" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"}`}>
          Leads ({leads.total})
        </button>
        <button type="button" onClick={() => setTab("deals")}
          className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all ${tab === "deals" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500"}`}>
          Deals ({deals.total})
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2 shrink-0">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder={tab === "leads" ? "Search leads..." : "Search deals..."} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-[#008ecc] focus:ring-1 focus:ring-[#008ecc]/30"
          />
        </div>
        {tab === "leads" && (
          <select 
            value={leadStatusFilter} 
            onChange={(e) => setLeadStatusFilter(e.target.value)}
            className="w-24 text-xs border border-gray-200 rounded-md px-2 focus:outline-none focus:border-[#008ecc] focus:ring-1 focus:ring-[#008ecc]/30 text-gray-600"
          >
            <option value="">All Status</option>
            <option value="Hot">Hot</option>
            <option value="Warm">Warm</option>
            <option value="Cold">Cold</option>
            <option value="Junk">Junk</option>
          </select>
        )}
        {tab === "deals" && (
          <select 
            value={dealStageFilter} 
            onChange={(e) => setDealStageFilter(e.target.value)}
            className="w-28 text-xs border border-gray-200 rounded-md px-2 focus:outline-none focus:border-[#008ecc] focus:ring-1 focus:ring-[#008ecc]/30 text-gray-600"
          >
            <option value="">All Stages</option>
            <option value="Qualification">Qualification</option>
            <option value="Proposal Sent-Negotiation">Proposal Sent-Negotiation</option>
            <option value="Invoice Sent">Invoice Sent</option>
            <option value="Closed Won">Deal Closed</option>
            <option value="Closed Lost">Deal Lost</option>
          </select>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {/* Select All row */}
        {tab === "leads" && leads.list.length > 0 && (
          <div className="flex items-center justify-between px-1 py-1 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-500">Select to link with target</span>
            <button type="button" onClick={() => onSelectAllLeads(leads.list, allLeadsSelected)}
              className="text-xs font-bold text-[#008ecc] hover:underline">
              {allLeadsSelected ? "Deselect All" : "Select All"}
            </button>
          </div>
        )}
        {tab === "deals" && deals.list.length > 0 && (
          <div className="flex items-center justify-between px-1 py-1 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-500">Select to link with target</span>
            <button type="button" onClick={() => onSelectAllDeals(deals.list, allDealsSelected)}
              className="text-xs font-bold text-[#008ecc] hover:underline">
              {allDealsSelected ? "Deselect All" : "Select All"}
            </button>
          </div>
        )}

        {tab === "leads" && (
          leads.list.length === 0
            ? <p className="text-xs text-gray-400 text-center py-6">No leads assigned</p>
            : leads.list.map(l => {
              const inUse = inUseLeadIds.includes(l._id);
              const isLocked = l.status === "Converted";
              return (
              <div key={l._id}
                onClick={() => {
                  if (isLocked) {
                    toast.info("Already this lead is converted");
                    return;
                  }
                  if (!inUse) onToggleLead(l._id);
                }}
                className={`flex items-start gap-2.5 border rounded-xl p-2.5 transition-all ${(inUse || isLocked) ? "opacity-50 cursor-not-allowed bg-gray-50 border-gray-100" : selectedLeads.has(l._id) ? "border-[#008ecc] bg-blue-50/30 shadow-sm cursor-pointer" : "bg-white border-gray-100 hover:border-gray-200 cursor-pointer"}`}>
                <Checkbox checked={selectedLeads.has(l._id)} onChange={() => { if (!inUse && !isLocked) onToggleLead(l._id); }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <p className="text-xs font-semibold text-gray-800 truncate">{l.leadName}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      {(inTaskLeadIds.includes(l._id) || l.inActiveTask) && <span className="text-xs px-1.5 py-0.5 rounded border border-purple-200 bg-purple-50 text-purple-600 font-bold shrink-0">Already in task</span>}
                      {(inUse || l.inActiveTarget) && <span className="text-xs px-1.5 py-0.5 rounded border border-red-200 bg-red-50 text-red-600 font-bold shrink-0">Already in target</span>}
                      <span className={`text-xs px-1.5 py-0.5 rounded border font-medium shrink-0 ${LEAD_STATUS_COLOR[l.status] || "bg-gray-100 text-gray-500 border-gray-200"}`}>{l.status}</span>
                    </div>
                  </div>
                  {l.companyName && <p className="text-xs text-gray-400 flex items-center gap-1 truncate mb-0.5"><Building2 size={9} />{l.companyName}</p>}
                  {l.phoneNumber && <p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={9} className="text-gray-400" />{l.phoneNumber}</p>}
                  {l.email && <p className="text-xs text-gray-500 flex items-center gap-1 truncate"><Mail size={9} className="text-gray-400" />{l.email}</p>}
                  <p className="text-xs text-gray-300 mt-1 flex items-center gap-1"><Calendar size={9} />Added {fmt(l.createdAt)}</p>
                </div>
              </div>
              );
            })
        )}

        {tab === "deals" && (
          deals.list.length === 0
            ? <p className="text-xs text-gray-400 text-center py-6">No deals assigned</p>
            : deals.list.map(d => {
              const adminBadge = getAdminActionBadge(d);
              const inUse = inUseDealIds.includes(d._id);
              const isLocked = d.stage === "Closed Won";
              return (
              <div key={d._id}
                onClick={() => {
                  if (isLocked) {
                    toast.info("Already this deal is won");
                    return;
                  }
                  if (!inUse) onToggleDeal(d._id);
                }}
                className={`flex items-start gap-2.5 border rounded-xl p-2.5 transition-all ${(inUse || isLocked) ? "opacity-50 cursor-not-allowed bg-gray-50 border-gray-100" : selectedDeals.has(d._id) ? "border-[#008ecc] bg-blue-50/30 shadow-sm cursor-pointer" : "bg-white border-gray-100 hover:border-gray-200 cursor-pointer"}`}>
                <Checkbox checked={selectedDeals.has(d._id)} onChange={() => { if (!inUse && !isLocked) onToggleDeal(d._id); }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <p className="text-xs font-semibold text-gray-800 truncate">{d.dealName}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      {(inTaskDealIds.includes(d._id) || d.inActiveTask) && <span className="text-xs px-1.5 py-0.5 rounded border border-purple-200 bg-purple-50 text-purple-600 font-bold shrink-0">Already in task</span>}
                      {(inUse || d.inActiveTarget) && <span className="text-xs px-1.5 py-0.5 rounded border border-red-200 bg-red-50 text-red-600 font-bold shrink-0">Already in target</span>}
                      <span className={`text-xs px-1.5 py-0.5 rounded border font-medium shrink-0 ${STAGE_COLOR[d.stage] || "bg-gray-100 text-gray-500 border-gray-200"}`}>{d.stage}</span>
                    </div>
                  </div>
                  {adminBadge && (
                    <span className="inline-block text-xs bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded border border-orange-200 mb-1" title={adminBadge.title}>{adminBadge.text}</span>
                  )}
                  {d.companyName && <p className="text-xs text-gray-400 flex items-center gap-1 truncate mb-0.5"><Building2 size={9} />{d.companyName}</p>}
                  <div className="flex flex-wrap gap-2 mb-0.5">
                    {d.value && <p className="text-xs font-bold text-gray-700">{d.currency} {d.value}</p>}
                    {d.phoneNumber && <p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={9} className="text-gray-400" />{d.phoneNumber}</p>}
                  </div>
                  {d.email && <p className="text-xs text-gray-500 flex items-center gap-1 truncate"><Mail size={9} className="text-gray-400" />{d.email}</p>}
                  <p className="text-xs text-gray-300 mt-1 flex items-center gap-1"><Calendar size={9} />Created {fmt(d.createdAt)}</p>
                </div>
              </div>
              );
            })
        )}
      </div>
    </div>
  );
}

/* ── Table View with expandable detail rows ─────────────────────── */
function TableView({ targets, onEdit, onDelete, onUnlinkItem, onApproveRejection, onApproveHold, onOpenReport, onViewReports }) {
  const [expandedId, setExpandedId] = useState(null);
  const [expandedDealIdx, setExpandedDealIdx] = useState({});

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-[2fr_1fr_1fr_1.4fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] bg-gray-50 border-b border-gray-200 px-4 py-3">
        {["Sales Person","Period","Status","Dates","Overall","Leads Conv.","Deals Won","Lead→Deal Won","Deals Lost","Calls","Meetings","Actions"].map((h,i) => (
          <div key={i} className={`text-xs font-bold text-gray-600 uppercase tracking-wide ${i >= 3 && i <= 10 ? "text-center" : i === 11 ? "text-center" : ""}`}>{h}</div>
        ))}
      </div>

      {targets.map((t) => {
        const overall = t.percentages?.overall || 0;
        const actuals = t.actuals || {};
        const progressColor = getProgressColor(overall);
        const textColor = getTextColor(overall);
        const isExpanded = expandedId === t._id;

        // Converted leads are already shown as their resulting deal via
        // convertedLeadDeals below — excluding them here stops the same
        // conversion from rendering as two separate cards.
        const linkedLeads = (t.linkedLeads || []).filter(Boolean).filter(l => l.status !== "Converted");
        const convertedLeadDeals = (t.convertedLeadDeals || []);
        const linkedDeals = (t.linkedDeals || []).filter(Boolean);
        const wonDeals  = linkedDeals.filter(d => d.stage === "Closed Won");
        const liveDeals = linkedDeals.filter(d => d.stage !== "Closed Won" && d.stage !== "Closed Lost");

        return (
          <div key={t._id} className="border-b border-gray-100 last:border-0">
            {/* Summary row */}
            <div
              className={`grid grid-cols-[2fr_1fr_1fr_1.4fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] px-4 py-3.5 cursor-pointer transition-colors ${isExpanded ? "bg-blue-50/50" : "hover:bg-gray-50/70"}`}
              onClick={() => { setExpandedId(isExpanded ? null : t._id); setExpandedDealIdx({}); }}
            >
              {/* Sales Person */}
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-8 rounded-full ${progressColor} shrink-0`} />
                <div>
                  <p className="font-bold text-gray-900 text-sm">{t.salesPerson?.firstName} {t.salesPerson?.lastName}</p>
                  {t.salesPerson?.email && <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Mail size={9} />{t.salesPerson.email}</p>}
                </div>
                <div className="ml-1">{isExpanded ? <ChevronUp size={14} className="text-[#008ecc]" /> : <ChevronDown size={14} className="text-gray-400" />}</div>
              </div>
              {/* Period */}
              <div className="flex items-center">
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold capitalize ${t.period === "weekly" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>{t.period}</span>
              </div>
              {/* Status */}
              <div className="flex items-center">
                <span className={`text-xs px-2 py-0.5 rounded-md font-medium border ${t.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : t.status === 'In Progress' ? 'bg-amber-50 text-amber-600 border-amber-200' : t.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>{t.status || "New"}</span>
              </div>
              {/* Dates */}
              <div className="flex flex-col justify-center gap-0.5">
                <div className="flex items-center gap-1 text-xs text-gray-700 font-semibold"><Calendar size={9} className="text-gray-400" />{fmt(t.startDate)}</div>
                <div className="flex items-center gap-1 text-xs text-gray-700 font-semibold"><Calendar size={9} className="text-gray-400" />{fmt(t.endDate)}</div>
              </div>
              {/* Overall */}
              <div className="flex flex-col items-center justify-center">
                <span className={`text-base font-bold ${textColor}`}>{overall}%</span>
                <div className="w-14 bg-gray-200 rounded-full h-1.5 mt-1">
                  <div className={`h-1.5 rounded-full ${progressColor}`} style={{width:`${Math.min(100,overall)}%`}} />
                </div>
              </div>
              {/* Leads Conv */}
              <div className="flex items-center justify-center gap-0.5">
                <span className="font-bold text-gray-900 text-sm">{actuals.leadsConverted ?? 0}</span>
                <span className="text-gray-400 text-xs font-medium"> / {t.targetLeads ?? 0}</span>
              </div>
              {/* Deals Won */}
              <div className="flex items-center justify-center gap-0.5">
                <span className="font-bold text-gray-900 text-sm">{actuals.dealsWon ?? 0}</span>
                <span className="text-gray-400 text-xs font-medium"> / {t.targetDeals ?? 0}</span>
              </div>
              {/* Lead → Deal Won */}
              <div className="flex items-center justify-center">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200">
                  <Trophy size={10} className="text-amber-500" />
                  <span className="font-bold text-amber-700 text-sm">{actuals.leadDealWon ?? 0}</span>
                </span>
              </div>
              {/* Deals Lost */}
              <div className="flex items-center justify-center">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 border border-red-200">
                  <XCircle size={10} className="text-red-500" />
                  <span className="font-bold text-red-600 text-sm">{actuals.dealsLost ?? 0}</span>
                </span>
              </div>
              {/* Calls */}
              <div 
                className="flex items-center justify-center gap-0.5 cursor-pointer hover:bg-gray-100 p-1 rounded transition-colors" 
                onClick={(e) => { e.stopPropagation(); onOpenReport(t._id, "call"); }}
              >
                <span className="font-bold text-gray-900 text-sm">{actuals.calls ?? 0}</span>
                <span className="text-gray-400 text-xs font-medium"> / {t.targetCalls ?? 0}</span>
              </div>
              {/* Meetings */}
              <div 
                className="flex items-center justify-center gap-0.5 cursor-pointer hover:bg-gray-100 p-1 rounded transition-colors"
                onClick={(e) => { e.stopPropagation(); onOpenReport(t._id, "meeting"); }}
              >
                <span className="font-bold text-gray-900 text-sm">{actuals.meetings ?? 0}</span>
                <span className="text-gray-400 text-xs font-medium"> / {t.targetMeetings ?? 0}</span>
              </div>
              {/* Actions */}
              <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(t); }} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600" title="Edit"><Pencil size={13} /></button>
                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(t._id); }} className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500" title="Delete"><Trash2 size={13} /></button>
              </div>
            </div>

            {/* ── Expanded full-detail panel ── */}
            {isExpanded && (
              <div className="bg-gray-50/80 border-t border-gray-100 px-6 py-5 space-y-5">

                {/* Rejection Requested */}
                {t.rejectionRequested && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-red-700">Rejection Requested</p>
                        <p className="text-xs text-red-600 mt-0.5 break-words">Reason: {t.rejectionReason}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => onApproveRejection(t, "approve")} className="px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded hover:bg-red-600">Approve Rejection</button>
                      <button onClick={() => onApproveRejection(t, "deny")} className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded hover:bg-gray-300">Deny</button>
                    </div>
                  </div>
                )}

                {/* Hold Pending */}
                {t.holdRequested && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-start gap-2">
                      <Info size={14} className="text-purple-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-purple-700">Hold Pending</p>
                        <p className="text-xs text-purple-600 mt-0.5 break-words">Reason: {t.holdReason}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => onApproveHold(t, "approve")} className="px-3 py-1.5 bg-purple-500 text-white text-xs font-semibold rounded hover:bg-purple-600">Approve Hold</button>
                      <button onClick={() => onApproveHold(t, "deny")} className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded hover:bg-gray-300">Deny</button>
                    </div>
                  </div>
                )}

                {/* Description */}
                {t.description && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
                    <MessageSquare size={14} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-0.5">Admin Note</p>
                      <p className="text-sm text-amber-800 font-medium leading-relaxed">{t.description}</p>
                    </div>
                  </div>
                )}

                {/* Won Deals accordion */}
                {wonDeals.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-emerald-700 mb-2 flex items-center gap-1.5"><Award size={13} className="text-emerald-500" /> Deal Closed ({wonDeals.length})</p>
                    <div className="space-y-2">
                      {wonDeals.map((d, i) => {
                        const createdDate   = d.createdAt   ? new Date(d.createdAt)   : null;
                        const convertedDate = d.convertedAt ? new Date(d.convertedAt) : createdDate;
                        const wonDate       = d.wonAt ? new Date(d.wonAt) : (d.updatedAt ? new Date(d.updatedAt) : null);
                        const totalDays     = wonDate && createdDate ? Math.max(0, Math.round((wonDate - createdDate) / 86400000)) : null;
                        const stageHistory  = (d.stageHistory || []).sort((a, b) => new Date(a.movedAt) - new Date(b.movedAt));
                        const dealKey = `${t._id}-${i}`;
                        const isOpen = expandedDealIdx[dealKey];
                        const adminBadge = getAdminActionBadge(d);
                        return (
                          <div key={d._id} className="bg-emerald-50 border border-emerald-200 rounded-2xl overflow-hidden">
                            <div className="flex items-start gap-1 px-3 pt-3 pb-0">
                              <button type="button" onClick={() => setExpandedDealIdx(prev => ({...prev, [dealKey]: !isOpen}))} className="flex-1 text-left pb-2.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs bg-emerald-200 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full shrink-0">#{i+1}</span>
                                  <p className="text-sm font-bold text-gray-800 truncate flex-1">{d.dealName || d.dealTitle}</p>
                                  <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                                  {isOpen ? <ChevronUp size={13} className="text-emerald-600" /> : <ChevronDown size={13} className="text-gray-400" />}
                                </div>
                                {adminBadge && (
                                  <span className="inline-block text-xs bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded-full border border-orange-200 mt-1 mr-1" title={adminBadge.title}>
                                    {adminBadge.text}
                                  </span>
                                )}
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                                  {d.companyName && <span className="text-xs text-gray-600 font-medium flex items-center gap-1"><Building2 size={8} />{d.companyName}</span>}
                                  {d.value && <span className="text-xs font-bold text-emerald-700">{d.currency || "INR"} {d.value}</span>}
                                  {totalDays !== null && <span className="text-xs text-emerald-600 flex items-center gap-0.5"><Clock size={8} />{totalDays === 0 ? "Same day" : `${totalDays}d to close`}</span>}
                                </div>
                              </button>
                              <button onClick={e => { e.stopPropagation(); onUnlinkItem?.({ targetId: t._id, type: "deal", itemId: d._id, itemName: d.dealName || d.dealTitle }); }} className="p-1 mt-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors shrink-0" title="Remove from target"><Trash2 size={12} /></button>
                            </div>
                            {isOpen && (
                              <div className="border-t border-emerald-100">
                                <div className="px-3 py-2 bg-white/70 flex flex-wrap gap-x-4 gap-y-1">
                                  {d.phoneNumber && <span className="text-xs text-gray-700 font-medium flex items-center gap-1"><Phone size={9} className="text-emerald-400" />{d.phoneNumber}</span>}
                                  {d.email && <span className="text-xs text-gray-700 font-medium flex items-center gap-1 truncate max-w-[220px]"><Mail size={9} className="text-emerald-400" />{d.email}</span>}
                                  {wonDate && <span className="text-xs text-emerald-700 flex items-center gap-1 font-bold"><Calendar size={9} className="text-emerald-500" />Won: {fmt(wonDate)} {fmtTime(wonDate)}</span>}
                                </div>
                                <div className="border-t border-emerald-100 px-3 py-2.5 bg-white/60 space-y-1.5">
                                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Stage Journey</p>
                                  {createdDate && (
                                    <div className="flex items-start gap-2">
                                      <div className="w-2 h-2 rounded-full bg-gray-500 mt-0.5 shrink-0" />
                                      <div><span className="text-xs font-semibold text-gray-700">Lead Created</span><p className="text-xs text-gray-700 font-medium">{fmt(createdDate)} {fmtTime(createdDate)}</p></div>
                                    </div>
                                  )}
                                  {createdDate && (
                                    <div className="flex items-start gap-2 pl-1">
                                      <div className="flex flex-col items-center gap-0.5"><div className="w-px h-2 bg-gray-300" /><div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" /></div>
                                      <div><span className="text-xs font-semibold text-gray-700">Qualification <span className="text-gray-500 font-normal">(Deal Start)</span></span><p className="text-xs text-gray-700 font-medium">{fmt(convertedDate || createdDate)} {fmtTime(convertedDate || createdDate)}</p></div>
                                    </div>
                                  )}
                                  {stageHistory.map((h, hi) => {
                                    const prev = hi === 0 ? createdDate : new Date(stageHistory[hi - 1].movedAt);
                                    const diff = prev ? Math.max(0, Math.round((new Date(h.movedAt) - prev) / 86400000)) : null;
                                    return (
                                      <div key={hi} className="flex items-start gap-2 pl-1">
                                        <div className="flex flex-col items-center gap-0.5"><div className="w-px h-2 bg-gray-300" /><div className={`w-2 h-2 rounded-full ${STAGE_DOT[h.stage] || "bg-gray-400"} shrink-0`} /></div>
                                        <div>
                                          <span className="text-xs font-semibold text-gray-800">{h.stage}</span>
                                          {diff !== null && <span className="text-xs text-gray-500 ml-1">({diff === 0 ? "same day" : `+${diff}d`})</span>}
                                          <p className="text-xs text-gray-700 font-medium">{fmt(h.movedAt)} {fmtTime(h.movedAt)}</p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {wonDate && !stageHistory.some(h => h.stage === "Closed Won") && (
                                    <div className="flex items-start gap-2 pl-1">
                                      <div className="flex flex-col items-center gap-0.5"><div className="w-px h-2 bg-gray-300" /><div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" /></div>
                                      <div><span className="text-xs font-semibold text-emerald-700">Closed Won</span><p className="text-xs text-gray-700 font-medium">{fmt(wonDate)} {fmtTime(wonDate)}</p></div>
                                    </div>
                                  )}
                                </div>
                                {totalDays !== null && (
                                  <div className="px-3 py-2 bg-emerald-100/70 flex items-center gap-1.5">
                                    <Clock size={11} className="text-emerald-600 shrink-0" />
                                    <p className="text-xs font-bold text-emerald-700">{totalDays === 0 ? "Closed same day" : `Total: ${totalDays} day${totalDays !== 1 ? "s" : ""} from deal creation to won`}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Active Deals pipeline */}
                {liveDeals.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5"><Briefcase size={13} /> Active Deals ({liveDeals.length})</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                      {liveDeals.map(d => {
                        const daysInPipeline = d.createdAt ? Math.max(0, Math.round((Date.now() - new Date(d.createdAt)) / 86400000)) : null;
                        const adminBadge = getAdminActionBadge(d);
                        return (
                          <div key={d._id} className="bg-white border border-gray-200 rounded-xl p-3 space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-bold text-gray-900 truncate flex-1">{d.dealName || d.dealTitle}</p>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className={`text-xs px-1.5 py-0.5 rounded border font-semibold ${STAGE_COLOR[d.stage] || "bg-gray-100 text-gray-600 border-gray-200"}`}>{d.stage}</span>
                                <button onClick={() => onUnlinkItem?.({ targetId: t._id, type: "deal", itemId: d._id, itemName: d.dealName || d.dealTitle })} className="p-0.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors" title="Remove from target"><Trash2 size={11} /></button>
                              </div>
                            </div>
                            {adminBadge && (
                              <span className="inline-block text-xs bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded border border-orange-200 w-fit" title={adminBadge.title}>{adminBadge.text}</span>
                            )}
                            {d.companyName && <p className="text-xs text-gray-600 font-medium flex items-center gap-1 truncate"><Building2 size={9} />{d.companyName}</p>}
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                              {d.value && <span className="text-xs font-bold text-gray-800">{d.currency || "INR"} {d.value}</span>}
                              {d.phoneNumber && <span className="text-xs text-gray-700 font-medium flex items-center gap-1"><Phone size={9} className="text-gray-500" />{d.phoneNumber}</span>}
                            </div>
                            {d.stageHistory?.length > 0 && (
                              <div className="pt-1.5 border-t border-gray-100 space-y-0.5">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Stage Trail</p>
                                {[...d.stageHistory].sort((a,b) => new Date(a.movedAt)-new Date(b.movedAt)).map((h, hi) => (
                                  <div key={hi} className="flex items-center gap-1.5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${STAGE_DOT[h.stage] || "bg-gray-400"} shrink-0`} />
                                    <span className="text-xs text-gray-800 font-semibold">{h.stage}</span>
                                    <span className="text-xs text-gray-600 font-medium">— {fmt(h.movedAt)} {fmtTime(h.movedAt)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {daysInPipeline !== null && (
                              <p className="text-xs text-gray-600 font-medium flex items-center gap-1">
                                <Clock size={9} className="text-gray-400" />
                                {daysInPipeline === 0 ? "Created today" : `${daysInPipeline}d in pipeline`} · since {fmt(d.createdAt)}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Linked Leads */}
                {(linkedLeads.length > 0 || convertedLeadDeals.length > 0) && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5"><Users size={13} /> Linked Leads ({linkedLeads.length + convertedLeadDeals.length})</p>
                      {convertedLeadDeals.filter(d => d.salesPersonConverted !== false).length > 0 && (
                        <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                          <Check size={9} /> {convertedLeadDeals.filter(d => d.salesPersonConverted !== false).length} Converted to Deal
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                      {/* Active leads */}
                      {linkedLeads.map(l => {
                        const history = (l.statusHistory || []).sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt));
                        return (
                          <div key={l._id} className="bg-white border border-gray-200 rounded-xl p-3 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-bold text-gray-900 truncate flex-1">{l.leadName}</p>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className={`text-xs px-1.5 py-0.5 rounded border font-semibold ${LEAD_STATUS_COLOR[l.status] || "bg-gray-100 text-gray-600 border-gray-200"}`}>{l.status}</span>
                                <button onClick={() => onUnlinkItem?.({ targetId: t._id, type: "lead", itemId: l._id, itemName: l.leadName })} className="p-0.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors" title="Remove from target"><Trash2 size={11} /></button>
                              </div>
                            </div>
                            {l.companyName && <p className="text-xs text-gray-600 font-medium flex items-center gap-1 truncate mt-1"><Building2 size={9} />{l.companyName}</p>}
                            {(history.length > 0 || l.createdAt) && (
                              <div className="pt-1.5 border-t border-gray-100 space-y-0.5">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Status Journey</p>
                                <div className="flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                  <span className="text-xs text-gray-800 font-semibold ml-1">Cold</span>
                                  <span className="text-xs text-gray-600 font-medium ml-1">{fmt(l.createdAt)}</span>
                                </div>
                                {history.map((h, hi) => (
                                  <div key={hi} className="flex items-center gap-1 pl-1">
                                    <div className="w-px h-2 bg-gray-300 mr-0.5" />
                                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{backgroundColor: h.status==="Hot"?"#ef4444":h.status==="Warm"?"#f97316":h.status==="Cold"?"#6b7280":h.status==="Junk"?"#a855f7":"#10b981"}} />
                                    <span className="text-xs text-gray-800 font-semibold ml-1">{h.status}</span>
                                    <span className="text-xs text-gray-600 font-medium ml-1">{fmt(h.changedAt)} {fmtTime(h.changedAt)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {/* Converted leads */}
                      {convertedLeadDeals.map((d) => {
                        const history = (d.leadStatusHistory || []).sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt));
                        return (
                          <div key={d._id} className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-bold text-gray-900 truncate flex-1">{d.dealName}</p>
                              <div className="flex items-center gap-1 shrink-0">
                                {d.convertedByName ? (
                                  <span className="text-xs bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded border border-orange-200">
                                    {d.salesPersonConverted ? `Converted Lead to Deal by ${d.convertedByName}` : `Converted Lead to Deal by Admin ${d.convertedByName}`}
                                  </span>
                                ) : (
                                  <span className="text-xs bg-emerald-200 text-emerald-800 font-bold px-1.5 py-0.5 rounded">Converted → Deal</span>
                                )}
                                <button onClick={() => onUnlinkItem?.({ targetId: t._id, type: "lead", itemId: d.leadId, itemName: d.dealName })} className="p-0.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors" title="Remove from target"><Trash2 size={11} /></button>
                              </div>
                            </div>
                            {d.value && <p className="text-xs text-emerald-700 font-bold">{d.currency} {d.value}</p>}
                            <div className="pt-1.5 border-t border-emerald-100 space-y-0.5">
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Lead Status Journey</p>
                              <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                <span className="text-xs text-gray-800 font-semibold ml-1">Cold</span>
                                <span className="text-xs text-gray-600 font-medium ml-1">{fmt(d.leadCreatedAt || d.createdAt)}</span>
                              </div>
                              {history.map((h, hi) => (
                                <div key={hi} className="flex items-center gap-1 pl-1">
                                  <div className="w-px h-2 bg-gray-300 mr-0.5" />
                                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{backgroundColor: h.status==="Hot"?"#ef4444":h.status==="Warm"?"#f97316":h.status==="Cold"?"#6b7280":h.status==="Junk"?"#a855f7":"#10b981"}} />
                                  <span className="text-xs text-gray-800 font-semibold ml-1">{h.status}</span>
                                  <span className="text-xs text-gray-600 font-medium ml-1">{fmt(h.changedAt)} {fmtTime(h.changedAt)}</span>
                                </div>
                              ))}
                              <div className="flex items-center gap-1 pl-1 flex-wrap">
                                <div className="w-px h-2 bg-gray-300 mr-0.5" />
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span className="text-xs text-emerald-700 font-bold ml-1">Converted to Deal</span>
                                <span className="text-xs text-gray-700 font-semibold ml-1">{fmt(d.convertedAt || d.createdAt)} {fmtTime(d.convertedAt || d.createdAt)}</span>
                                {!d.salesPersonConverted && (
                                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200 ml-1">
                                    Taken by Admin{d.convertedByName ? ` ${d.convertedByName}` : ""}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 pl-1">
                                <div className="w-px h-2 bg-gray-300 mr-0.5" />
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                <span className="text-xs text-blue-700 font-bold ml-1">Qualification (Deal Start)</span>
                                <span className="text-xs text-gray-700 font-semibold ml-1">{fmt(d.convertedAt || d.createdAt)} {fmtTime(d.convertedAt || d.createdAt)}</span>
                              </div>
                              {/* Subsequent deal stage moves */}
                              {(d.stageHistory || []).sort((a,b) => new Date(a.movedAt)-new Date(b.movedAt)).map((h, hi) => (
                                <div key={hi} className="flex items-center gap-1 pl-1">
                                  <div className="w-px h-2 bg-gray-300 mr-0.5" />
                                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${STAGE_DOT[h.stage] || "bg-gray-400"}`} />
                                  <span className={`text-xs font-bold ml-1 ${h.stage === "Closed Won" ? "text-emerald-700" : h.stage === "Closed Lost" ? "text-red-600" : "text-gray-800"}`}>{h.stage}</span>
                                  <span className="text-xs text-gray-700 font-semibold ml-1">{fmt(h.movedAt)} {fmtTime(h.movedAt)}</span>
                                </div>
                              ))}
                              {/* Fallback: show current stage when it's not already in stageHistory */}
                              {d.stage && d.stage !== "Qualification" && !(d.stageHistory || []).some(h => h.stage === d.stage) && (
                                <div className="flex items-center gap-1 pl-1">
                                  <div className="w-px h-2 bg-gray-300 mr-0.5" />
                                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${d.stage === "Closed Won" ? "bg-emerald-500" : d.stage === "Closed Lost" ? "bg-red-400" : STAGE_DOT[d.stage] || "bg-gray-400"}`} />
                                  <span className={`text-xs font-bold ml-1 ${d.stage === "Closed Won" ? "text-emerald-700" : d.stage === "Closed Lost" ? "text-red-600" : "text-gray-800"}`}>{d.stage}</span>
                                  {d.stage !== "Closed Won" && d.stage !== "Closed Lost" && <span className="text-xs text-orange-500 font-bold ml-1">● Live</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Reported Calls */}
                {t.reportedCalls?.length > 0 && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <button 
                      onClick={() => onViewReports(t._id, "call")}
                      className="w-full flex items-center justify-between p-3 bg-orange-50 hover:bg-orange-100/70 border border-orange-100 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-white rounded-lg shadow-sm">
                          <Phone size={14} className="text-orange-500" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-bold text-gray-800">Reported Calls</p>
                          <p className="text-xs text-gray-500 font-medium">{t.reportedCalls.length} call{t.reportedCalls.length !== 1 ? "s" : ""} logged</p>
                        </div>
                      </div>
                      <div className="text-xs font-bold text-orange-600 bg-white px-2.5 py-1 rounded-full shadow-sm">View History</div>
                    </button>
                  </div>
                )}

                {/* Reported Meetings */}
                {t.reportedMeetings?.length > 0 && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <button 
                      onClick={() => onViewReports(t._id, "meeting")}
                      className="w-full flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100/70 border border-purple-100 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-white rounded-lg shadow-sm">
                          <Activity size={14} className="text-purple-500" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-bold text-gray-800">Reported Meetings</p>
                          <p className="text-xs text-gray-500 font-medium">{t.reportedMeetings.length} meeting{t.reportedMeetings.length !== 1 ? "s" : ""} logged</p>
                        </div>
                      </div>
                      <div className="text-xs font-bold text-purple-600 bg-white px-2.5 py-1 rounded-full shadow-sm">View History</div>
                    </button>
                  </div>
                )}

                {/* Notes */}
                {t.notes?.length > 0 && (
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-xs font-bold text-[#008ecc] mb-2 flex items-center gap-1.5"><MessageSquare size={13} /> Notes from Sales Person ({t.notes.length})</p>
                    <div className="space-y-2">
                      {[...t.notes].reverse().map((n, i) => (
                        <div key={i} className="bg-blue-50 border border-blue-100 rounded-xl p-2.5">
                          <p className="text-xs text-gray-800 font-medium leading-relaxed">{n.text}</p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-gray-600 font-semibold flex items-center gap-1"><Clock size={8} /> {fmt(n.addedAt)} {fmtTime(n.addedAt)}</p>
                            {n.addedBy && <p className="text-xs text-blue-600 font-semibold">{n.addedBy.firstName} {n.addedBy.lastName}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {wonDeals.length === 0 && liveDeals.length === 0 && linkedLeads.length === 0 && convertedLeadDeals.length === 0 && (
                  <p className="text-xs text-gray-500 text-center py-3">No linked leads or deals yet.</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Compact Target Card (Admin) ─────────────────────── */
function CompactTargetCard({ target: t, onClick }) {
  const overall = t.percentages?.overall || 0;
  const isCompleted = t.status === "Completed";
  const isOverdue = isDateOverdue(t.endDate) && !isCompleted;
  
  return (
    <div 
      onClick={() => onClick(t)}
      className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md cursor-pointer transition-shadow p-4 relative overflow-hidden group flex flex-col justify-between h-full min-h-[140px]"
    >
      <div className={`absolute top-0 left-0 h-1 w-full ${getProgressColor(overall)}`} />
      
      <div>
        <div className="flex justify-between items-start mb-2 mt-1 gap-2">
          <div className="min-w-0">
            <h4 className="font-semibold text-gray-800 text-sm truncate" title={t.title}>
              {t.title || "Untitled Target"}
            </h4>
            <p className="text-[12px] text-gray-600 truncate mt-0.5" title={`${t.salesPerson?.firstName} ${t.salesPerson?.lastName}`}>
              {t.salesPerson?.firstName} {t.salesPerson?.lastName}
            </p>
            {t.salesPerson?.email && (
              <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1 truncate" title={t.salesPerson.email}>
                <Mail size={11} className="shrink-0" />
                <span className="truncate">{t.salesPerson.email}</span>
              </p>
            )}
          </div>
          <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded border font-semibold ${isCompleted ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : t.status === 'In Progress' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
            {t.status || "In Progress"}
          </span>
        </div>
      </div>

      <div className="flex justify-between items-center text-[11px] text-gray-500 pt-3 border-t border-gray-50 mt-auto">
        <div className="flex items-center gap-1.5">
          <Calendar size={11} className={isOverdue ? "text-red-500" : "text-gray-400"} />
          <span className={isOverdue ? "text-red-500 font-medium" : ""}>
            {t.period === "monthly" ? "Monthly" : "Weekly"} • {new Date(t.endDate).toLocaleDateString()}
          </span>
        </div>
        <div className="text-[10px] font-bold text-[#008ecc] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          View Details <ArrowRightLeft size={9} />
        </div>
      </div>
    </div>
  );
}

/* ── Target Card (Admin) ─────────────────────── */
function TargetCard({ target: t, onDelete, onEdit, salesData, onUnlinkItem, onApproveRejection, onApproveHold, onViewReports }) {
  const [expanded, setExpanded] = useState(false);
  // Each item's expand/collapse is fully independent — a Set of open keys,
  // not a single shared value, so opening one item never affects any other.
  const [expandedItems, setExpandedItems] = useState(() => new Set());
  const toggleExpand = (key) => setExpandedItems(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });
  const { percentages = {}, actuals = {} } = t;
  const overall = percentages.overall || 0;

  // Converted leads are already shown as their resulting deal via
  // convertedLeadDeals below — excluding them here stops the same
  // conversion from rendering as two separate cards.
  const linkedLeads = (t.linkedLeads || []).filter(Boolean).filter(l => l.status !== "Converted");
  const convertedLeadDeals = (t.convertedLeadDeals || []);
  const allLinkedLeadsCount = linkedLeads.length + convertedLeadDeals.length;
  const convertedLeadsCount = convertedLeadDeals.length;
  // Only count conversions the sales person actually did themselves for the
  // success badge — admin-driven conversions get their own "Converted by Admin" tag instead.
  const selfConvertedCount = convertedLeadDeals.filter(d => d.salesPersonConverted !== false).length;
  // Only fall back to the unscoped sales-person deal list when linkedDeals is
  // genuinely missing (not yet loaded) — an empty array means "nothing linked"
  // and must stay empty, otherwise an unlinked/removed deal reappears via the
  // fallback since that list isn't scoped to this target at all.
  const linkedDeals = (Array.isArray(t.linkedDeals) ? t.linkedDeals : (salesData?.deals?.list || [])).filter(Boolean);

  // convertedLeadDeals always carries conversion attribution reliably (it's looked
  // up by leadId); borrow it here in case the same deal shows up in linkedDeals
  // via a path that didn't already have convertedByName/salesPersonConverted set.
  const convertedInfoById = new Map(convertedLeadDeals.map(cd => [String(cd._id), cd]));
  const withConversionInfo = (d) => {
    const match = convertedInfoById.get(String(d._id));
    if (!match) return d;
    return {
      ...d,
      convertedByName: d.convertedByName ?? match.convertedByName ?? null,
      salesPersonConverted: d.salesPersonConverted ?? match.salesPersonConverted ?? null,
    };
  };

  const wonDealsRaw = linkedDeals.filter(d => d.stage === "Closed Won");
  const liveDealsRaw = linkedDeals.filter(d => d.stage !== "Closed Won" && d.stage !== "Closed Lost");
  
  const wonDeals = [...new Map(wonDealsRaw.map(d => [d._id, d])).values()].map(withConversionInfo);
  const liveDeals = [...new Map(liveDealsRaw.map(d => [d._id, d])).values()].map(withConversionInfo);

  const metrics = [
    { label: "Leads to Deals Converted", target: percentages.effTargetLeads ?? t.targetLeads, actual: actuals.leadsConverted || 0, pct: percentages.leadsPercent || 0, icon: <Users size={13} className="text-blue-500" />, bg: "bg-blue-50", border: "border-blue-100", countOnly: false },
    { label: "Deal Closed", target: percentages.effTargetDeals ?? t.targetDeals, actual: actuals.dealsWon || 0, pct: percentages.dealsPercent || 0, icon: <TrendingUp size={13} className="text-green-500" />, bg: "bg-green-50", border: "border-green-100", countOnly: false },
    { label: "Leads to Deal Closed", target: percentages.effTargetLeads ?? t.targetLeads, actual: actuals.leadDealWon || 0, pct: percentages.leadDealWonPercent || 0, icon: <Trophy size={13} className="text-amber-500" />, bg: "bg-amber-50", border: "border-amber-100", countOnly: false, badgeText: "leads closed", badgeClass: "text-amber-600 bg-amber-100", specialZeroMessage: "No converted lead is moved to closed deal" },
    { label: "Deal Lost", target: null, actual: actuals.dealsLost || 0, pct: null, icon: <XCircle size={13} className="text-red-500" />, bg: "bg-red-50", border: "border-red-100", countOnly: true, badgeText: "deal lost", badgeClass: "text-red-600 bg-red-100" },
    { label: "Calls Made", target: t.targetCalls, actual: actuals.calls || 0, pct: percentages.callsPercent || 0, icon: <Phone size={13} className="text-orange-500" />, bg: "bg-orange-50", border: "border-orange-100", countOnly: false },
    { label: "Meetings Done", target: t.targetMeetings, actual: actuals.meetings || 0, pct: percentages.meetingsPercent || 0, icon: <Activity size={13} className="text-purple-500" />, bg: "bg-purple-50", border: "border-purple-100", countOnly: false },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className={`h-1.5 w-full ${getProgressColor(overall)}`} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="text-slate-700 font-bold text-sm truncate pr-2">{t.title || "Untitled Target"}</h3>
            <p className="text-xs font-medium text-slate-600 mt-0.5">{t.salesPerson?.firstName} {t.salesPerson?.lastName}</p>
            {t.salesPerson?.email && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Mail size={9} />{t.salesPerson.email}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-md font-medium border ${t.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : t.status === 'In Progress' ? 'bg-amber-50 text-amber-600 border-amber-200' : t.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>{t.status || "New"}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold capitalize ${t.period === "weekly" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>{t.period}</span>
            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(t); }} className="p-1 hover:bg-blue-50 rounded-full text-gray-400 hover:text-[#008ecc] transition-colors" title="Edit target"><Pencil size={14} /></button>
            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(t._id); }} className="p-1 hover:bg-red-50 rounded-full text-gray-400 hover:text-red-500 transition-colors" title="Delete target"><Trash2 size={14} /></button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2 mt-1">
          <Calendar size={11} /><span>{fmt(t.startDate)} — {fmt(t.endDate)}</span>
        </div>

        {/* Description */}
        {t.description && (
          <div className="mb-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 flex items-start gap-2">
            <MessageSquare size={12} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-0.5">Note from Admin</p>
              <p className="text-xs text-amber-800 font-medium leading-relaxed">{t.description}</p>
            </div>
          </div>
        )}

        {t.rejectionRequested && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-2 mb-2">
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-red-700">Rejection Requested</p>
                <p className="text-xs text-red-600 mt-0.5 break-words">Reason: {t.rejectionReason}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onApproveRejection(t, "approve")} className="flex-1 py-1.5 bg-red-500 text-white text-xs font-semibold rounded hover:bg-red-600">Approve</button>
              <button onClick={() => onApproveRejection(t, "deny")} className="flex-1 py-1.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded hover:bg-gray-300">Deny</button>
            </div>
          </div>
        )}

        {t.holdRequested && (
          <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-xl">
            <div className="flex items-start gap-2 mb-2">
              <Info size={14} className="text-purple-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-purple-700">Hold Pending</p>
                <p className="text-xs text-purple-600 mt-0.5 break-words">Reason: {t.holdReason}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onApproveHold(t, "approve")} className="flex-1 py-1.5 bg-purple-500 text-white text-xs font-semibold rounded hover:bg-purple-600">Approve</button>
              <button onClick={() => onApproveHold(t, "deny")} className="flex-1 py-1.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded hover:bg-gray-300">Deny</button>
            </div>
          </div>
        )}

        {/* Overall hero */}
        <div className={`rounded-xl p-4 mb-4 ${overall >= 80 ? "bg-emerald-50 border border-emerald-100" : overall >= 50 ? "bg-amber-50 border border-amber-100" : "bg-red-50 border border-red-100"}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-700"><Trophy size={15} className={getTextColor(overall)} /> {overall >= 100 ? "Target Completed" : "Overall Progress"}</span>
            <span className={`text-2xl font-bold ${getTextColor(overall)}`}>{overall}%</span>
          </div>
          <ProgressBar value={overall} color={getProgressColor(overall)} />
          <p className="text-xs text-gray-400 mt-1.5">
            {overall >= 100 ? "🎉 Target achieved!" : overall >= 80 ? "Almost there — keep going!" : overall >= 50 ? "Good progress — stay focused!" : "Keep pushing — you can do it!"}
          </p>
        </div>

        {/* Metric mini-cards */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          {metrics.map(m => (
            <div key={m.label} className={`rounded-xl border p-3 ${m.bg} ${m.border}`}>
              <div className="flex items-center gap-1.5 mb-1.5">{m.icon}<span className="text-xs font-medium text-gray-600">{m.label}</span></div>
              {m.countOnly ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold text-gray-800">{m.actual}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${m.badgeClass}`}>{m.badgeText}</span>
                </div>
              ) : (
                <>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-lg font-bold text-gray-800">{m.actual}</span>
                    <span className="text-xs text-gray-400">/ {m.target}</span>
                  </div>
                  {m.specialZeroMessage && m.actual === 0 ? (
                    <div className="mt-2 text-center text-xs font-semibold text-amber-600 bg-amber-100/50 py-1.5 rounded border border-amber-200">
                      {m.specialZeroMessage}
                    </div>
                  ) : (
                    <>
                      <ProgressBar value={m.pct} color={getProgressColor(m.pct)} />
                      <p className={`text-xs font-bold mt-1 ${getTextColor(m.pct)}`}>{m.pct}%</p>
                    </>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Toggle */}
        <button onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center justify-center gap-1.5 text-sm font-bold text-gray-700 hover:text-[#008ecc] py-2 border-t border-gray-100 transition-colors">
          {expanded ? <><ChevronUp size={15} /> Hide Details</> : <><ChevronDown size={15} /> Show Details</>}
        </button>

        {expanded && (
          <div className="mt-4 space-y-4">

            {/* ── Won Deals — accordion style ── */}
            {wonDeals.length > 0 && (
              <div>
                <p className="text-xs font-bold text-emerald-700 mb-2 flex items-center gap-1.5">
                  <Award size={13} className="text-emerald-500" /> Deal Closed ({wonDeals.length})
                </p>
                <div className={`space-y-2 ${wonDeals.length > 3 ? "max-h-80 overflow-y-auto pr-1" : ""}`}>
                  {wonDeals.map((d, i) => {
                    const createdDate   = d.createdAt   ? new Date(d.createdAt)   : null;
                    const convertedDate = d.convertedAt ? new Date(d.convertedAt) : createdDate;
                    const wonDate       = d.wonAt       ? new Date(d.wonAt)       : null;
                    const totalDays     = wonDate && createdDate ? Math.max(0, Math.round((wonDate - createdDate) / 86400000)) : null;
                    const stageHistory  = (d.stageHistory || []).sort((a, b) => new Date(a.movedAt) - new Date(b.movedAt));
                    const isOpen = expandedItems.has(`won-${i}`);
                    const adminBadge = getAdminActionBadge(d);
                    return (
                      <div key={d._id} className="bg-emerald-50 border border-emerald-200 rounded-2xl overflow-hidden">
                        {/* Accordion header — always visible */}
                        <div className="flex items-center gap-1 px-3 pt-3 pb-0">
                          <button type="button" onClick={() => toggleExpand(`won-${i}`)} className="flex-1 text-left pb-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs bg-emerald-200 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full shrink-0">#{i+1}</span>
                              <p className="text-sm font-bold text-gray-800 truncate flex-1">{d.dealName || d.dealTitle}</p>
                              <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                              {isOpen ? <ChevronUp size={13} className="text-emerald-600 shrink-0" /> : <ChevronDown size={13} className="text-gray-400 shrink-0" />}
                            </div>
                            {adminBadge && (
                              <span className="inline-block text-xs bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded-full border border-orange-200 mt-1" title={adminBadge.title}>
                                {adminBadge.text}
                              </span>
                            )}
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                            {d.companyName && <span className="text-xs text-gray-500 flex items-center gap-1"><Building2 size={8} />{d.companyName}</span>}
                            {d.value && <span className="text-xs font-bold text-emerald-700">{d.currency || "INR"} {d.value}</span>}
                            {totalDays !== null && <span className="text-xs text-emerald-600 flex items-center gap-0.5"><Clock size={8} />{totalDays === 0 ? "Same day" : `${totalDays}d to close`}</span>}
                          </div>
                          </button>
                          <button onClick={e => { e.stopPropagation(); onUnlinkItem?.({ targetId: t._id, type: "deal", itemId: d._id, itemName: d.dealName || d.dealTitle }); }} className="p-1 mb-auto mt-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors shrink-0" title="Remove from target"><Trash2 size={12} /></button>
                        </div>

                        {/* Accordion body */}
                        {isOpen && (
                          <div className="border-t border-emerald-100">
                            <div className="px-3 py-2 bg-white/70 flex flex-wrap gap-x-4 gap-y-1">
                              {d.phoneNumber && <span className="text-xs text-gray-600 flex items-center gap-1"><Phone size={9} className="text-emerald-400" />{d.phoneNumber}</span>}
                              {d.email && <span className="text-xs text-gray-600 flex items-center gap-1 truncate max-w-[180px]"><Mail size={9} className="text-emerald-400" />{d.email}</span>}
                              {wonDate && <span className="text-xs text-emerald-700 flex items-center gap-1 font-medium"><Calendar size={9} className="text-emerald-500" />Won: {fmt(wonDate)}</span>}
                            </div>

                            <div className="border-t border-emerald-100 px-3 py-2.5 bg-white/60 space-y-1.5">
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Stage Journey</p>
                              {createdDate && (
                                <div className="flex items-start gap-2">
                                  <div className="w-2 h-2 rounded-full bg-gray-400 mt-0.5 shrink-0" />
                                  <div>
                                    <span className="text-xs font-semibold text-gray-600">Lead Created</span>
                                    <p className="text-xs text-gray-700 font-semibold">{fmt(createdDate)} {fmtTime(createdDate)}</p>
                                  </div>
                                </div>
                              )}
                              {convertedDate && createdDate && Math.abs(convertedDate - createdDate) > 60000 && (
                                <div className="flex items-start gap-2 pl-1">
                                  <div className="flex flex-col items-center gap-0.5">
                                    <div className="w-px h-2 bg-gray-200" />
                                    <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                                  </div>
                                  <div>
                                    <span className="text-xs font-semibold text-indigo-700">Lead → Deal Converted</span>
                                    <span className="text-xs text-indigo-400 ml-1">(+{Math.max(0, Math.round((convertedDate - createdDate) / 86400000))}d)</span>
                                    <p className="text-xs text-gray-700 font-semibold">{fmt(convertedDate)} {fmtTime(convertedDate)}</p>
                                  </div>
                                </div>
                              )}
                              {createdDate && (
                                <div className="flex items-start gap-2 pl-1">
                                  <div className="flex flex-col items-center gap-0.5">
                                    <div className="w-px h-2 bg-gray-200" />
                                    <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                                  </div>
                                  <div>
                                    <span className="text-xs font-semibold text-gray-700">Qualification</span>
                                    <span className="text-xs text-gray-400 ml-1">(deal start)</span>
                                    <p className="text-xs text-gray-400">{fmt(convertedDate || createdDate)} {fmtTime(convertedDate || createdDate)}</p>
                                  </div>
                                </div>
                              )}
                              {stageHistory.map((h, hi) => {
                                const prev = hi === 0 ? createdDate : new Date(stageHistory[hi - 1].movedAt);
                                const diff = prev ? Math.max(0, Math.round((new Date(h.movedAt) - prev) / 86400000)) : null;
                                return (
                                  <div key={hi} className="flex items-start gap-2 pl-1">
                                    <div className="flex flex-col items-center gap-0.5">
                                      <div className="w-px h-2 bg-gray-200" />
                                      <div className={`w-2 h-2 rounded-full ${STAGE_DOT[h.stage] || "bg-gray-300"} shrink-0`} />
                                    </div>
                                    <div>
                                      <span className="text-xs font-semibold text-gray-700">{h.stage}</span>
                                      {diff !== null && <span className="text-xs text-gray-400 ml-1">({diff === 0 ? "same day" : `+${diff}d`})</span>}
                                      <p className="text-xs text-gray-700 font-semibold">{fmt(h.movedAt)} {fmtTime(h.movedAt)}</p>
                                    </div>
                                  </div>
                                );
                              })}
                              {/* Always show Closed Won as final step — stageHistory may not include it if recorded before fix */}
                              {wonDate && !stageHistory.some(h => h.stage === "Closed Won") && (
                                <div className="flex items-start gap-2 pl-1">
                                  <div className="flex flex-col items-center gap-0.5">
                                    <div className="w-px h-2 bg-gray-200" />
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                  </div>
                                  <div>
                                    <span className="text-xs font-semibold text-emerald-700">Closed Won</span>
                                    <p className="text-xs text-gray-700 font-semibold">{fmt(wonDate)} {fmtTime(wonDate)}</p>
                                  </div>
                                </div>
                              )}
                            </div>

                            {totalDays !== null && (
                              <div className="px-3 py-2 bg-emerald-100/70 flex items-center gap-1.5">
                                <Clock size={11} className="text-emerald-600 shrink-0" />
                                <p className="text-xs font-bold text-emerald-700">
                                  {totalDays === 0 ? "Closed same day" : `Total: ${totalDays} day${totalDays !== 1 ? "s" : ""} from deal creation to won`}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Lost Deals — accordion style ── */}
            {(() => {
              const lostDeals = [...linkedDeals.filter(d => d.stage === "Closed Lost"), ...convertedLeadDeals.filter(d => d.stage === "Closed Lost")];
              return lostDeals.length > 0 ? (
                <div>
                  <p className="text-xs font-bold text-red-700 mb-2 flex items-center gap-1.5">
                    <XCircle size={13} className="text-red-500" /> Deal Lost ({lostDeals.length})
                  </p>
                  <div className={`space-y-2 ${lostDeals.length > 3 ? "max-h-80 overflow-y-auto pr-1" : ""}`}>
                    {lostDeals.map((d, i) => {
                      const createdDate  = d.createdAt ? new Date(d.createdAt) : null;
                      const lostDate     = d.stageLostAt ? new Date(d.stageLostAt) : (d.updatedAt ? new Date(d.updatedAt) : null);
                      const totalDays    = lostDate && createdDate ? Math.max(0, Math.round((lostDate - createdDate) / 86400000)) : null;
                      const stageHistory = (d.stageHistory || []).sort((a, b) => new Date(a.movedAt) - new Date(b.movedAt));
                      const isOpen = expandedItems.has(`lost-${i}`);
                      return (
                        <div key={d._id} className="bg-red-50 border border-red-200 rounded-2xl overflow-hidden">
                          <button type="button" onClick={() => toggleExpand(`lost-${i}`)} className="w-full px-3 pt-3 pb-2.5 text-left">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs bg-red-200 text-red-800 font-bold px-1.5 py-0.5 rounded-full shrink-0">#{i+1}</span>
                              <p className="text-sm font-bold text-gray-800 truncate flex-1">{d.dealName || d.dealTitle}</p>
                              <XCircle size={13} className="text-red-500 shrink-0" />
                              {isOpen ? <ChevronUp size={13} className="text-red-600 shrink-0" /> : <ChevronDown size={13} className="text-gray-400 shrink-0" />}
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                              {d.companyName && <span className="text-xs text-gray-500 flex items-center gap-1"><Building2 size={8} />{d.companyName}</span>}
                              {d.value && <span className="text-xs font-bold text-red-700">{d.currency || "INR"} {d.value}</span>}
                              {totalDays !== null && <span className="text-xs text-red-600 flex items-center gap-0.5"><Clock size={8} />{totalDays === 0 ? "Same day" : `${totalDays}d in pipeline`}</span>}
                              {d.lossReason && <span className="text-xs text-red-600 font-medium">Reason: {d.lossReason}</span>}
                            </div>
                          </button>
                          {isOpen && (
                            <div className="border-t border-red-100">
                              <div className="px-3 py-2 bg-white/70 flex flex-wrap gap-x-4 gap-y-1">
                                {d.phoneNumber && <span className="text-xs text-gray-600 flex items-center gap-1"><Phone size={9} className="text-red-400" />{d.phoneNumber}</span>}
                                {d.email && <span className="text-xs text-gray-600 flex items-center gap-1 truncate max-w-[180px]"><Mail size={9} className="text-red-400" />{d.email}</span>}
                              </div>
                              <div className="border-t border-red-100 px-3 py-2.5 bg-white/60 space-y-1.5">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Stage Journey</p>
                                {createdDate && (
                                  <div className="flex items-start gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-0.5 shrink-0" />
                                    <div>
                                      <span className="text-xs font-semibold text-gray-700">Qualification</span>
                                      <span className="text-xs text-gray-400 ml-1">(created)</span>
                                      <p className="text-xs text-gray-700 font-semibold">{fmt(createdDate)} {fmtTime(createdDate)}</p>
                                    </div>
                                  </div>
                                )}
                                {stageHistory.map((h, hi) => {
                                  const prev = hi === 0 ? createdDate : new Date(stageHistory[hi - 1].movedAt);
                                  const diff = prev ? Math.max(0, Math.round((new Date(h.movedAt) - prev) / 86400000)) : null;
                                  return (
                                    <div key={hi} className="flex items-start gap-2 pl-1">
                                      <div className="flex flex-col items-center gap-0.5">
                                        <div className="w-px h-2 bg-gray-200" />
                                        <div className={`w-2 h-2 rounded-full ${STAGE_DOT[h.stage] || "bg-gray-300"} shrink-0`} />
                                      </div>
                                      <div>
                                        <span className="text-xs font-semibold text-gray-700">{h.stage}</span>
                                        {diff !== null && <span className="text-xs text-gray-400 ml-1">({diff === 0 ? "same day" : `+${diff}d`})</span>}
                                        <p className="text-xs text-gray-700 font-semibold">{fmt(h.movedAt)} {fmtTime(h.movedAt)}</p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              {totalDays !== null && (
                                <div className="px-3 py-2 bg-red-100/70 flex items-center gap-1.5">
                                  <Clock size={11} className="text-red-600 shrink-0" />
                                  <p className="text-xs font-bold text-red-700">
                                    {totalDays === 0 ? "Lost same day" : `Total: ${totalDays} day${totalDays !== 1 ? "s" : ""} in pipeline before lost`}
                                  </p>
                                </div>
                              )}
                              {d.lossNotes && (
                                <div className="px-3 py-2 bg-red-50/80 border-t border-red-100">
                                  <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-0.5">Loss Notes</p>
                                  <p className="text-xs text-gray-600">{d.lossNotes}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null;
            })()}

            {/* ── Active Deals — accordion style ── */}
            {liveDeals.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1.5"><Briefcase size={13} /> Active Deals ({liveDeals.length})</p>
                <div className={`space-y-2 ${liveDeals.length > 3 ? "max-h-80 overflow-y-auto pr-1" : ""}`}>
                  {liveDeals.map((d, i) => {
                    const daysInPipeline = d.createdAt
                      ? Math.max(0, Math.round((Date.now() - new Date(d.createdAt)) / 86400000))
                      : null;
                    const isOpen = expandedItems.has(`active-${i}`);
                    const adminBadge = getAdminActionBadge(d);
                    return (
                      <div key={d._id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div className="flex items-start gap-1 px-2.5 pt-2.5 pb-1">
                          <button type="button" onClick={() => toggleExpand(`active-${i}`)} className="flex-1 min-w-0 text-left">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-semibold text-gray-800 truncate flex-1">{d.dealName || d.dealTitle}</p>
                              <span className={`text-xs px-1.5 py-0.5 rounded border font-medium shrink-0 ${STAGE_COLOR[d.stage] || "bg-gray-100 text-gray-500 border-gray-200"}`}>{d.stage}</span>
                              {isOpen ? <ChevronUp size={12} className="text-gray-500 shrink-0" /> : <ChevronDown size={12} className="text-gray-400 shrink-0" />}
                            </div>
                            {adminBadge && (
                              <span className="inline-block text-xs bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded border border-orange-200 mt-1" title={adminBadge.title}>{adminBadge.text}</span>
                            )}
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                              {d.companyName && <span className="text-xs text-gray-500 flex items-center gap-1"><Building2 size={8} />{d.companyName}</span>}
                              {d.value && <span className="text-xs font-bold text-gray-700">{d.currency || "INR"} {d.value}</span>}
                            </div>
                          </button>
                          <button onClick={() => onUnlinkItem?.({ targetId: t._id, type: "deal", itemId: d._id, itemName: d.dealName || d.dealTitle })} className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors shrink-0" title="Remove from target"><Trash2 size={12} /></button>
                        </div>
                        {isOpen && (
                          <div className="px-2.5 pb-2.5 space-y-1.5 border-t border-gray-100 pt-2">
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                              {d.phoneNumber && <span className="text-xs text-gray-500 flex items-center gap-1"><Phone size={9} className="text-gray-400" />{d.phoneNumber}</span>}
                              {d.email && <span className="text-xs text-gray-500 flex items-center gap-1 truncate max-w-[160px]"><Mail size={9} className="text-gray-400" />{d.email}</span>}
                            </div>
                            {/* Stage history mini trail */}
                            {(d.stageHistory?.length > 0) && (
                              <div className="pt-1.5 border-t border-gray-100">
                                <p className="text-xs text-gray-400 font-semibold mb-1">Stage trail:</p>
                                <div className="space-y-0.5">
                                  {[...d.stageHistory].sort((a,b) => new Date(a.movedAt)-new Date(b.movedAt)).map((h, hi) => (
                                    <div key={hi} className="flex items-center gap-1.5">
                                      <div className={`w-1.5 h-1.5 rounded-full ${STAGE_DOT[h.stage] || "bg-gray-300"} shrink-0`} />
                                      <span className="text-xs text-gray-600 font-medium">{h.stage}</span>
                                      <span className="text-xs text-gray-400">— {fmt(h.movedAt)} {fmtTime(h.movedAt)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {daysInPipeline !== null && (
                              <p className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock size={9} className="text-gray-300" />
                                {daysInPipeline === 0 ? "Created today" : `${daysInPipeline} day${daysInPipeline !== 1 ? "s" : ""} in pipeline`}
                                {d.createdAt && <span className="ml-1">· since {fmt(d.createdAt)}</span>}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Linked Leads ── */}
            {(linkedLeads.length > 0 || convertedLeadsCount > 0) && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-bold text-gray-600 flex items-center gap-1.5"><Users size={13} /> Linked Leads ({allLinkedLeadsCount})</p>
                  {selfConvertedCount > 0 && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                      <Check size={9} className="text-emerald-500" /> {selfConvertedCount} Converted to Deal
                    </span>
                  )}
                </div>
                <div className={`space-y-2 ${allLinkedLeadsCount > 3 ? "max-h-80 overflow-y-auto pr-1" : ""}`}>
                  {/* Active leads with status journey — accordion */}
                  {linkedLeads.map((l, i) => {
                    const history = (l.statusHistory || []).sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt));
                    const isOpen = expandedItems.has(`lead-${i}`);
                    return (
                      <div key={l._id} className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden">
                        <div className="flex items-start gap-1 px-2.5 pt-2.5 pb-1">
                          <button type="button" onClick={() => toggleExpand(`lead-${i}`)} className="flex-1 min-w-0 text-left">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-semibold text-gray-800 truncate flex-1">{l.leadName}</p>
                              <span className={`text-xs px-1.5 py-0.5 rounded border font-semibold shrink-0 ${LEAD_STATUS_COLOR[l.status] || "bg-gray-100 text-gray-500 border-gray-200"}`}>{l.status}</span>
                              {isOpen ? <ChevronUp size={12} className="text-gray-500 shrink-0" /> : <ChevronDown size={12} className="text-gray-400 shrink-0" />}
                            </div>
                            {l.companyName && <p className="text-xs text-gray-400 flex items-center gap-1 truncate mt-1"><Building2 size={9} />{l.companyName}</p>}
                          </button>
                          <button onClick={() => onUnlinkItem?.({ targetId: t._id, type: "lead", itemId: l._id, itemName: l.leadName })} className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors shrink-0" title="Remove from target"><Trash2 size={12} /></button>
                        </div>
                        {isOpen && (
                          <div className="px-2.5 pb-2.5 space-y-1 border-t border-gray-100 pt-2">
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                              {l.phoneNumber && <span className="text-xs text-gray-500 flex items-center gap-1"><Phone size={9} className="text-gray-400" />{l.phoneNumber}</span>}
                              {l.email && <span className="text-xs text-gray-500 flex items-center gap-1 truncate max-w-[160px]"><Mail size={9} className="text-gray-400" />{l.email}</span>}
                            </div>
                            {(history.length > 0 || l.createdAt) && (
                              <div className="pt-1.5 border-t border-gray-100 space-y-1">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Status Journey</p>
                                <div className="flex items-center gap-0.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                                  <span className="text-xs text-gray-600 font-medium ml-1">Cold</span>
                                  <span className="text-xs text-gray-700 font-semibold ml-1">{fmt(l.createdAt)}</span>
                                </div>
                                {history.map((h, hi) => (
                                  <div key={hi} className="flex items-center gap-0.5 pl-1">
                                    <div className="w-px h-2 bg-gray-200 mr-0.5" />
                                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{backgroundColor: h.status==="Hot"?"#ef4444":h.status==="Warm"?"#f97316":h.status==="Cold"?"#6b7280":h.status==="Junk"?"#a855f7":"#10b981"}} />
                                    <span className="text-xs text-gray-600 font-medium ml-1">{h.status}</span>
                                    <span className="text-xs text-gray-700 font-semibold ml-1">{fmt(h.changedAt)} {fmtTime(h.changedAt)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {/* Converted leads — shown as their resulting deal — accordion */}
                  {convertedLeadDeals.map((d, i) => {
                    const history = (d.leadStatusHistory || []).sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt));
                    const isOpen = expandedItems.has(`convlead-${i}`);
                    return (
                      <div key={d._id} className="bg-emerald-50 border border-emerald-200 rounded-xl overflow-hidden">
                        <div className="flex items-start gap-1 px-2.5 pt-2.5 pb-1">
                          <button type="button" onClick={() => toggleExpand(`convlead-${i}`)} className="flex-1 min-w-0 text-left">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-semibold text-gray-800 truncate flex-1">{d.dealName}</p>
                              {!d.convertedByName && (
                                <span className="text-xs bg-emerald-200 text-emerald-800 font-bold px-1.5 py-0.5 rounded shrink-0">Converted → Deal</span>
                              )}
                              {isOpen ? <ChevronUp size={12} className="text-emerald-600 shrink-0" /> : <ChevronDown size={12} className="text-gray-400 shrink-0" />}
                            </div>
                            {d.convertedByName && (
                              <span className="inline-block text-xs bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded border border-orange-200 mt-1">
                                {d.salesPersonConverted ? `Converted Lead to Deal by ${d.convertedByName}` : `Converted Lead to Deal by Admin ${d.convertedByName}`}
                              </span>
                            )}
                            {d.value && <p className="text-xs text-emerald-700 font-bold mt-1">{d.currency} {d.value}</p>}
                          </button>
                          <button onClick={() => onUnlinkItem?.({ targetId: t._id, type: "lead", itemId: d.leadId, itemName: d.dealName })} className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors shrink-0" title="Remove from target"><Trash2 size={12} /></button>
                        </div>
                        {isOpen && (
                        <div className="px-2.5 pb-2.5 border-t border-emerald-100 pt-2 space-y-1">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Lead Status Journey</p>
                          <div className="flex items-center gap-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                            <span className="text-xs text-gray-600 font-medium ml-1">Cold</span>
                            <span className="text-xs text-gray-700 font-semibold ml-1">{fmt(d.leadCreatedAt || d.createdAt)}</span>
                          </div>
                          {history.map((h, hi) => (
                            <div key={hi} className="flex items-center gap-0.5 pl-1">
                              <div className="w-px h-2 bg-gray-200 mr-0.5" />
                              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{backgroundColor: h.status==="Hot"?"#ef4444":h.status==="Warm"?"#f97316":h.status==="Cold"?"#6b7280":h.status==="Junk"?"#a855f7":"#10b981"}} />
                              <span className="text-xs text-gray-600 font-medium ml-1">{h.status}</span>
                              <span className="text-xs text-gray-700 font-semibold ml-1">{fmt(h.changedAt)} {fmtTime(h.changedAt)}</span>
                            </div>
                          ))}
                          <div className="flex items-center gap-0.5 pl-1 flex-wrap">
                            <div className="w-px h-2 bg-gray-200 mr-0.5" />
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span className="text-xs text-emerald-700 font-bold ml-1">Converted to Deal</span>
                            <span className="text-xs text-gray-700 font-semibold ml-1">{fmt(d.convertedAt || d.createdAt)} {fmtTime(d.convertedAt || d.createdAt)}</span>
                            {!d.salesPersonConverted && (
                              <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200 ml-1">
                                Taken by Admin{d.convertedByName ? ` ${d.convertedByName}` : ""}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5 pl-1">
                            <div className="w-px h-2 bg-gray-200 mr-0.5" />
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                            <span className="text-xs text-blue-700 font-semibold ml-1">Qualification (Deal Start)</span>
                            <span className="text-xs text-gray-700 font-semibold ml-1">{fmt(d.convertedAt || d.createdAt)} {fmtTime(d.convertedAt || d.createdAt)}</span>
                          </div>
                          {/* Subsequent deal stage moves */}
                          {(d.stageHistory || []).sort((a,b) => new Date(a.movedAt)-new Date(b.movedAt)).map((h, hi) => (
                            <div key={hi} className="flex items-center gap-0.5 pl-1">
                              <div className="w-px h-2 bg-gray-200 mr-0.5" />
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${STAGE_DOT[h.stage] || "bg-gray-400"}`} />
                              <span className={`text-xs font-bold ml-1 ${h.stage === "Closed Won" ? "text-emerald-700" : h.stage === "Closed Lost" ? "text-red-600" : "text-gray-800"}`}>{h.stage}</span>
                              <span className="text-xs text-gray-700 font-semibold ml-1">{fmt(h.movedAt)} {fmtTime(h.movedAt)}</span>
                            </div>
                          ))}
                          {/* Fallback: show current stage when not yet in stageHistory */}
                          {d.stage && d.stage !== "Qualification" && !(d.stageHistory || []).some(h => h.stage === d.stage) && (
                            <div className="flex items-center gap-0.5 pl-1">
                              <div className="w-px h-2 bg-gray-200 mr-0.5" />
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${d.stage === "Closed Won" ? "bg-emerald-500" : d.stage === "Closed Lost" ? "bg-red-400" : STAGE_DOT[d.stage] || "bg-gray-400"}`} />
                              <span className={`text-xs font-bold ml-1 ${d.stage === "Closed Won" ? "text-emerald-700" : d.stage === "Closed Lost" ? "text-red-600" : "text-gray-800"}`}>{d.stage}</span>
                              {d.stage !== "Closed Won" && d.stage !== "Closed Lost" && <span className="text-xs text-orange-500 font-bold ml-1">● Live</span>}
                            </div>
                          )}
                        </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {wonDeals.length === 0 && liveDeals.length === 0 && linkedLeads.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-3">No linked leads or deals yet.</p>
            )}

            {/* Reported Calls */}
            {t.reportedCalls?.length > 0 && (
              <div className="border-t border-gray-100 pt-4 mt-2">
                <button 
                  onClick={() => onViewReports(t._id, "call")}
                  className="w-full flex items-center justify-between p-3 bg-orange-50 hover:bg-orange-100/70 border border-orange-100 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white rounded-lg shadow-sm">
                      <Phone size={14} className="text-orange-500" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-gray-800">Reported Calls</p>
                      <p className="text-xs text-gray-500 font-medium">{t.reportedCalls.length} call{t.reportedCalls.length !== 1 ? "s" : ""} logged</p>
                    </div>
                  </div>
                  <div className="text-xs font-bold text-orange-600 bg-white px-2.5 py-1 rounded-full shadow-sm">View History</div>
                </button>
              </div>
            )}

            {/* Reported Meetings */}
            {t.reportedMeetings?.length > 0 && (
              <div className="border-t border-gray-100 pt-4 mt-2">
                <button 
                  onClick={() => onViewReports(t._id, "meeting")}
                  className="w-full flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100/70 border border-purple-100 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white rounded-lg shadow-sm">
                      <Activity size={14} className="text-purple-500" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-gray-800">Reported Meetings</p>
                      <p className="text-xs text-gray-500 font-medium">{t.reportedMeetings.length} meeting{t.reportedMeetings.length !== 1 ? "s" : ""} logged</p>
                    </div>
                  </div>
                  <div className="text-xs font-bold text-purple-600 bg-white px-2.5 py-1 rounded-full shadow-sm">View History</div>
                </button>
              </div>
            )}

            {/* ── Notes from Sales Person ── */}
            {t.notes?.length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-bold text-[#008ecc] mb-2 flex items-center gap-1.5">
                  <MessageSquare size={13} /> Notes from Sales Person ({t.notes.length})
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {[...t.notes].reverse().map((n, i) => (
                    <div key={i} className="bg-blue-50 border border-blue-100 rounded-xl p-2.5">
                      <p className="text-xs text-gray-700 leading-relaxed">{n.text}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock size={8} /> {fmt(n.addedAt)} {fmtTime(n.addedAt)}
                        </p>
                        {n.addedBy && <p className="text-xs text-blue-500 font-medium">{n.addedBy.firstName} {n.addedBy.lastName}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {t.createdBy && <p className="text-xs text-gray-300 mt-3">Set by {t.createdBy.firstName} {t.createdBy.lastName}</p>}
      </div>
    </div>
  );
}

/* ── Create Target Modal ─────────────────────── */
function CreateTargetModal({ open, onClose, onSaved, salesUsers, baseUrl, headers, inUseLeadIds = [], inUseDealIds = [], inTaskLeadIds = [], inTaskDealIds = [] }) {
  const [form, setForm] = useState({ title: "", salesPerson: "", period: "monthly", startDate: "", endDate: "", targetLeads: "", targetDeals: "", targetCalls: "", targetMeetings: "", description: "" });
  const [selectedLeads, setSelectedLeads] = useState(new Set());
  const [selectedDeals, setSelectedDeals] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [dateError, setDateError] = useState(null);

  const handlePeriodChange = (period) => {
    // Anchor on today — Start Date must never default into the past.
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + (period === "weekly" ? 6 : 29));
    setForm(f => ({ ...f, period, startDate: toLocalDateString(start), endDate: toLocalDateString(end) }));
    setDateError(null);
  };

  useEffect(() => {
    if (open) {
      handlePeriodChange("monthly");
      setForm(f => ({ ...f, title: "", salesPerson: "", targetLeads: "0", targetDeals: "0", targetCalls: "", targetMeetings: "", description: "" }));
      setSelectedLeads(new Set());
      setSelectedDeals(new Set());
      setDateError(null);
    }
  }, [open]);

  const handleDateChange = (key, value) => {
    setForm(f => {
      const next = { ...f, [key]: value };
      setDateError(validateTargetDates(next.startDate, next.endDate, { isCreate: true }));
      return next;
    });
  };

  // Target Leads/Deals numbers only ever reflect ticked checkboxes — never pre-fetched totals.
  useEffect(() => {
    setForm(f => ({ ...f, targetLeads: String(selectedLeads.size) }));
  }, [selectedLeads]);
  useEffect(() => {
    setForm(f => ({ ...f, targetDeals: String(selectedDeals.size) }));
  }, [selectedDeals]);

  const toggleLead = (id) => setSelectedLeads(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleDeal = (id) => setSelectedDeals(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const selectAllLeads = (list, allSelected) => {
    if (allSelected) { setSelectedLeads(new Set()); }
    else { setSelectedLeads(new Set(list.filter(l => !inUseLeadIds.includes(l._id)).map(l => l._id))); }
  };
  const selectAllDeals = (list, allSelected) => {
    if (allSelected) { setSelectedDeals(new Set()); }
    else { setSelectedDeals(new Set(list.filter(d => !inUseDealIds.includes(d._id)).map(d => d._id))); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedLeads.size === 0 && selectedDeals.size === 0) {
      toast.error("Please select at least one Lead or Deal to link to this target.");
      return;
    }
    const err = validateTargetDates(form.startDate, form.endDate, { isCreate: true });
    if (err) { setDateError(err); toast.error(err); return; }
    setSaving(true);
    try {
      await axios.post(`${baseUrl}/targets`, {
        ...form,
        linkedLeads: [...selectedLeads],
        linkedDeals: [...selectedDeals],
      }, { headers });
      toast.success("Target set — sales person notified");
      onSaved(); onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create target");
    } finally { setSaving(false); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="text-slate-900 flex items-center gap-2">
            <Target size={20} className="text-[#008ecc]" /> Set Sales Target
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full"><X size={18} className="text-gray-500" /></button>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* LEFT — form */}
          <form onSubmit={handleSubmit} className="w-[460px] shrink-0 p-5 space-y-4 overflow-y-auto border-r border-gray-100">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Name *</label>
              <input type="text" required placeholder="e.g. Q3 Sales Push" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]/30 focus:border-[#008ecc]"
                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sales Person *</label>
              <select required className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]/30 focus:border-[#008ecc]"
                value={form.salesPerson} onChange={e => { setForm({ ...form, salesPerson: e.target.value, targetLeads: "0", targetDeals: "0" }); setSelectedLeads(new Set()); setSelectedDeals(new Set()); }}>
                <option value="">Select sales person</option>
                {salesUsers.map(u => <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Period Type</label>
              <div className="flex gap-2">
                {["weekly", "monthly"].map(p => (
                  <button key={p} type="button" onClick={() => handlePeriodChange(p)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium capitalize transition-all ${form.period === p ? "bg-[#008ecc] text-white border-[#008ecc]" : "bg-white text-gray-600 border-gray-200 hover:border-[#008ecc]"}`}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[["startDate", "Start Date", todayISO()], ["endDate", "End Date", tomorrowISO()]].map(([key, label, min]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type="date" min={min}
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]/30 focus:border-[#008ecc] ${dateError ? "border-red-300" : "border-gray-200"}`}
                    value={form[key]} onChange={e => handleDateChange(key, e.target.value)} />
                </div>
              ))}
            </div>
            {dateError && (
              <p className="text-xs text-red-600 font-medium -mt-2">{dateError}</p>
            )}

            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Target Numbers</p>
              <p className="text-xs text-blue-500 mb-2">Leads &amp; Deals counts reflect what you tick in the preview panel.</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "targetLeads",    label: "Leads",        icon: <Users size={12} className="text-blue-500" />,      auto: true },
                  { key: "targetDeals",    label: "Deals",        icon: <TrendingUp size={12} className="text-green-500" />, auto: true },
                  { key: "targetCalls",    label: "Calls",        icon: <Phone size={12} className="text-orange-500" />,     auto: false },
                  { key: "targetMeetings", label: "Meetings",     icon: <Activity size={12} className="text-purple-500" />,  auto: false },
                ].map(({ key, label, icon, auto }) => (
                  <div key={key}>
                    <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1">{icon} {label}{auto && <span className="text-xs text-blue-400 font-semibold ml-1">from ticks</span>}</label>
                    <input type="number" min="0" placeholder="0"
                      disabled={auto}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]/30 focus:border-[#008ecc] ${auto ? "bg-blue-50 border-blue-200 text-blue-700 cursor-not-allowed" : "border-gray-200"}`}
                      value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} />
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400 font-normal text-xs">(optional — sent to sales person)</span></label>
              <textarea
                rows={3}
                placeholder="e.g. Focus on converting warm leads this week, push for Invoice Sent stage..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]/30 focus:border-[#008ecc] resize-none"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>

            {/* Linked summary chips */}
            {(selectedLeads.size > 0 || selectedDeals.size > 0) && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-1">
                <p className="text-xs font-bold text-blue-700">Linked to this target:</p>
                {selectedLeads.size > 0 && <p className="text-xs text-blue-600">✓ {selectedLeads.size} lead{selectedLeads.size > 1 ? "s" : ""} selected</p>}
                {selectedDeals.size > 0 && <p className="text-xs text-blue-600">✓ {selectedDeals.size} deal{selectedDeals.size > 1 ? "s" : ""} selected</p>}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium">Cancel</button>
              <button type="submit" disabled={saving || !!dateError} className="px-5 py-2 rounded-lg bg-[#008ecc] text-white hover:bg-[#0077aa] text-sm font-semibold disabled:opacity-60">
                {saving ? "Setting..." : "Set Target"}
              </button>
            </div>
          </form>

          {/* RIGHT — preview with checkboxes */}
          <div className="flex-1 min-w-0 p-5 bg-gray-50/50 flex flex-col overflow-hidden">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 shrink-0">
              {form.salesPerson ? "Performance Preview — Check to link leads/deals" : "Sales Person Details"}
            </p>
            <div className="flex-1 min-h-0 overflow-hidden">
              <SalesPersonPreview
                userId={form.salesPerson}
                baseUrl={baseUrl}
                headers={headers}
                selectedLeads={selectedLeads}
                selectedDeals={selectedDeals}
                onToggleLead={toggleLead}
                onToggleDeal={toggleDeal}
                onSelectAllLeads={selectAllLeads}
                onSelectAllDeals={selectAllDeals}
                inUseLeadIds={inUseLeadIds}
                inUseDealIds={inUseDealIds}
                inTaskLeadIds={inTaskLeadIds}
                inTaskDealIds={inTaskDealIds}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Edit Target Modal ─────────────────────── */
function EditTargetModal({ open, onClose, onSaved, target, salesUsers, baseUrl, headers, inUseLeadIds = [], inUseDealIds = [], inTaskLeadIds = [], inTaskDealIds = [] }) {
  const [form, setForm] = useState({ title: "", salesPerson: "", period: "monthly", startDate: "", endDate: "", targetLeads: "", targetDeals: "", targetCalls: "", targetMeetings: "", description: "" });
  const [selectedLeads, setSelectedLeads] = useState(new Set());
  const [selectedDeals, setSelectedDeals] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [dateError, setDateError] = useState(null);

  useEffect(() => {
    if (open && target) {
      setForm({
        title: target.title || "",
        salesPerson: target.salesPerson?._id || target.salesPerson || "",
        period: target.period || "monthly",
        startDate: target.startDate ? (() => { const d = new Date(target.startDate); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })() : "",
        endDate: target.endDate ? (() => { const d = new Date(target.endDate); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })() : "",
        // targetLeads/targetDeals get recomputed from the ticked checkboxes below —
        // these are just placeholders until that effect runs.
        targetLeads:    "0",
        targetDeals:    "0",
        targetCalls:    String(target.targetCalls    ?? ""),
        targetMeetings: String(target.targetMeetings ?? ""),
        description: target.description || "",
      });
      // Pre-select already-linked leads/deals; also include converted lead IDs so they're preserved
      const preLeads = new Set([
        ...(target.linkedLeads || []).map(l => String(l._id || l)),
        ...(target.convertedLeadDeals || []).map(d => String(d.leadId)).filter(Boolean),
      ]);
      const preDeals = new Set((target.linkedDeals || []).map(d => String(d._id || d)));
      setSelectedLeads(preLeads);
      setSelectedDeals(preDeals);
      setDateError(null);
    }
  }, [open, target]);

  const handleDateChange = (key, value) => {
    setForm(f => {
      const next = { ...f, [key]: value };
      setDateError(validateTargetDates(next.startDate, next.endDate, { isCreate: false }));
      return next;
    });
  };

  // Target Leads/Deals numbers only ever reflect ticked checkboxes — never a stale stored total.
  useEffect(() => {
    setForm(f => ({ ...f, targetLeads: String(selectedLeads.size) }));
  }, [selectedLeads]);
  useEffect(() => {
    setForm(f => ({ ...f, targetDeals: String(selectedDeals.size) }));
  }, [selectedDeals]);

  const toggleLead = (id) => setSelectedLeads(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleDeal = (id) => setSelectedDeals(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAllLeads = (list, allSelected) => {
    if (allSelected) setSelectedLeads(new Set());
    else setSelectedLeads(new Set(list.map(l => l._id)));
  };
  const selectAllDeals = (list, allSelected) => {
    if (allSelected) setSelectedDeals(new Set());
    else setSelectedDeals(new Set(list.map(d => d._id)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedLeads.size === 0 && selectedDeals.size === 0) {
      toast.error("Please select at least one Lead or Deal to link to this target.");
      return;
    }
    const err0 = validateTargetDates(form.startDate, form.endDate, { isCreate: false });
    if (err0) { setDateError(err0); toast.error(err0); return; }
    setSaving(true);
    try {
      await axios.put(`${baseUrl}/targets/${target._id}`, {
        ...form,
        linkedLeads: [...selectedLeads],
        linkedDeals: [...selectedDeals],
      }, { headers });
      toast.success("Target updated — sales person notified");
      onSaved(); onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update target");
    } finally { setSaving(false); }
  };

  if (!open || !target) return null;

  const salesPersonName = target.salesPerson?.firstName
    ? `${target.salesPerson.firstName} ${target.salesPerson.lastName}`
    : (() => { const u = salesUsers.find(u => u._id === form.salesPerson); return u ? `${u.firstName} ${u.lastName}` : "—"; })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="text-slate-900 flex items-center gap-2">
            <Pencil size={18} className="text-[#008ecc]" /> Edit Target
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full"><X size={18} className="text-gray-500" /></button>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* LEFT — form */}
          <form onSubmit={handleSubmit} className="w-[460px] shrink-0 p-5 space-y-4 overflow-y-auto border-r border-gray-100">

            {/* Target Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Name *</label>
              <input type="text" required placeholder="e.g. Q3 Sales Push" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]/30 focus:border-[#008ecc]"
                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>

            {/* Sales person — read-only */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sales Person</label>
              <div className="w-full border border-gray-100 bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-600 font-medium">
                {salesPersonName}
              </div>
            </div>

            {/* Period */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Period Type</label>
              <div className="flex gap-2">
                {["weekly", "monthly"].map(p => (
                  <button key={p} type="button" onClick={() => setForm(f => ({ ...f, period: p }))}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium capitalize transition-all ${form.period === p ? "bg-[#008ecc] text-white border-[#008ecc]" : "bg-white text-gray-600 border-gray-200 hover:border-[#008ecc]"}`}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              {[["startDate", "Start Date", undefined], ["endDate", "End Date", tomorrowISO()]].map(([key, label, min]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type="date" min={min}
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]/30 focus:border-[#008ecc] ${dateError ? "border-red-300" : "border-gray-200"}`}
                    value={form[key]} onChange={e => handleDateChange(key, e.target.value)} />
                </div>
              ))}
            </div>
            {dateError && (
              <p className="text-xs text-red-600 font-medium -mt-2">{dateError}</p>
            )}

            {/* Target Numbers */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Target Numbers</p>
              <p className="text-xs text-blue-500 mb-2">Leads &amp; Deals counts reflect what you tick in the preview panel.</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "targetLeads",    label: "Leads",        icon: <Users size={12} className="text-blue-500" />,      auto: true },
                  { key: "targetDeals",    label: "Deals",        icon: <TrendingUp size={12} className="text-green-500" />, auto: true },
                  { key: "targetCalls",    label: "Calls",        icon: <Phone size={12} className="text-orange-500" />,     auto: false },
                  { key: "targetMeetings", label: "Meetings",     icon: <Activity size={12} className="text-purple-500" />,  auto: false },
                ].map(({ key, label, icon, auto }) => (
                  <div key={key}>
                    <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1">{icon} {label}{auto && <span className="text-xs text-blue-400 font-semibold ml-1">from ticks</span>}</label>
                    <input type="number" min="0" placeholder="0"
                      disabled={auto}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]/30 focus:border-[#008ecc] ${auto ? "bg-blue-50 border-blue-200 text-blue-700 cursor-not-allowed" : "border-gray-200"}`}
                      value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} />
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400 font-normal text-xs">(optional — sent to sales person)</span></label>
              <textarea
                rows={3}
                placeholder="e.g. Focus on converting warm leads this week, push for Invoice Sent stage..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]/30 focus:border-[#008ecc] resize-none"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>

            {/* Linked summary chips */}
            {(selectedLeads.size > 0 || selectedDeals.size > 0) && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-1">
                <p className="text-xs font-bold text-blue-700">Linked to this target:</p>
                {selectedLeads.size > 0 && <p className="text-xs text-blue-600">✓ {selectedLeads.size} lead{selectedLeads.size > 1 ? "s" : ""} selected</p>}
                {selectedDeals.size > 0 && <p className="text-xs text-blue-600">✓ {selectedDeals.size} deal{selectedDeals.size > 1 ? "s" : ""} selected</p>}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium">Cancel</button>
              <button type="submit" disabled={saving || !!dateError} className="px-5 py-2 rounded-lg bg-[#008ecc] text-white hover:bg-[#0077aa] text-sm font-semibold disabled:opacity-60">
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>

          {/* RIGHT — preview with checkboxes (pre-selected) */}
          <div className="flex-1 min-w-0 p-5 bg-gray-50/50 flex flex-col overflow-hidden">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 shrink-0">
              Performance Preview — Tick to link / unlink leads & deals
            </p>
            <div className="flex-1 min-h-0 overflow-hidden">
              <SalesPersonPreview
                userId={form.salesPerson}
                baseUrl={baseUrl}
                headers={headers}
                selectedLeads={selectedLeads}
                selectedDeals={selectedDeals}
                onToggleLead={toggleLead}
                onToggleDeal={toggleDeal}
                onSelectAllLeads={selectAllLeads}
                onSelectAllDeals={selectAllDeals}
                inUseLeadIds={inUseLeadIds}
                inUseDealIds={inUseDealIds}
                inTaskLeadIds={inTaskLeadIds}
                inTaskDealIds={inTaskDealIds}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────── */
export default function TargetManagement() {
  const [targets, setTargets] = useState([]);
  const [dashStats, setDashStats] = useState(null);
  const [dashFilter, setDashFilter] = useState("all");
  const [dashStartDate, setDashStartDate] = useState("");
  const [dashEndDate, setDashEndDate] = useState("");
  const [tasks, setTasks] = useState([]);
  const [salesUsers, setSalesUsers] = useState([]);
  const [salesDataMap, setSalesDataMap] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState("all");
  const [viewMode, setViewMode] = useState("card");
  const [showWorkflowExplanation, setShowWorkflowExplanation] = useState(false);
  const [mainView, setMainView] = useState("targets"); // "targets" | "notifications" | "reasonNotes" | "adminActivity"
  const { notifications: allNotifications, setNotifications: setGlobalNotifications, fetchNotifications } = useNotifications();
  const [reasonNotes, setReasonNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [unlinkConfirm, setUnlinkConfirm] = useState(null); // { targetId, type: "lead"|"deal", itemId, itemName }
  const [unlinking, setUnlinking] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, name } — target to delete
  const [noteDeleteConfirm, setNoteDeleteConfirm] = useState(null); // { targetId, noteIdx, isBulk, count }
  const [approveHoldTarget, setApproveHoldTarget] = useState(null);
  
  const [rejectNoteModal, setRejectNoteModal] = useState({ open: false, note: null });
  const [rejectNoteReason, setRejectNoteReason] = useState("");
  const [rejectingNote, setRejectingNote] = useState(false);
  
  const [reassignNoteModal, setReassignNoteModal] = useState({ open: false, note: null });
  const [reassigningNote, setReassigningNote] = useState(false);
  
  const [adminActivity, setAdminActivity] = useState(null); // { leadsConvertedByAdmin, dealsWonByAdmin, counts }
  const [loadingAdminActivity, setLoadingAdminActivity] = useState(false);
  const [selectedTargetDetails, setSelectedTargetDetails] = useState(null);
  const [dismissConfirm, setDismissConfirm] = useState(null); // { itemType, itemId, itemName }
  const [reportModal, setReportModal] = useState({ open: false, type: null, targetId: null });
  const [viewReportsModal, setViewReportsModal] = useState({ open: false, type: null, targetId: null });
  const [selectedNotes, setSelectedNotes] = useState(new Set()); // "targetId__noteIdx"
  const [notesPage, setNotesPage] = useState(1);
  const NOTES_PER_PAGE = 8;
  const socket = useSocket();
  const targetSocket = useTargetSocket();
  const location = useLocation();

  const inUseLeadIds = useMemo(() => Array.from(new Set(
    targets.filter(t => !t.archived && (!editTarget || t._id !== editTarget._id))
           .flatMap(t => (t.linkedLeads || []).map(r => String(r._id || r)))
  )), [targets, editTarget]);

  const inUseDealIds = useMemo(() => Array.from(new Set(
    targets.filter(t => !t.archived && (!editTarget || t._id !== editTarget._id))
           .flatMap(t => (t.linkedDeals || []).map(r => String(r._id || r)))
  )), [targets, editTarget]);

  const inTaskLeadIds = useMemo(() => Array.from(new Set(
    tasks.filter(t => !["Completed", "Rejected", "Closed"].includes(t.status))
         .flatMap(t => (t.leadRefs || []).map(r => String(r._id || r)).concat(t.leadRef ? [String(t.leadRef._id || t.leadRef)] : []))
  )), [tasks]);

  const inTaskDealIds = useMemo(() => Array.from(new Set(
    tasks.filter(t => !["Completed", "Rejected", "Closed"].includes(t.status))
         .flatMap(t => (t.dealRefs || []).map(r => String(r._id || r)).concat(t.dealRef ? [String(t.dealRef._id || t.dealRef)] : []))
  )), [tasks]);

  // Deep-link from a notification click (e.g. Admin's "Reassign" action)
  useEffect(() => {
    if (location.state?.mainView) setMainView(location.state.mainView);
  }, [location.state]);

  const token = localStorage.getItem("token");
  const tenantSlug = localStorage.getItem("tenantSlug");
  const baseUrl = `${SI_URI}/${tenantSlug}/api`;
  const headers = { Authorization: `Bearer ${token}` };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [targetsRes, usersRes, tasksRes] = await Promise.all([
        axios.get(`${baseUrl}/targets`, { headers }),
        axios.get(`${API_URL}/users`, { headers }),
        axios.get(`${baseUrl}/tasks`, { headers }),
      ]);
      const targetsData = targetsRes.data;
      setTargets(targetsData);
      setTasks(tasksRes.data);
      const sales = (usersRes.data.users || usersRes.data).filter(u => u.role?.name !== "Admin");
      setSalesUsers(sales);

      const uniqueIds = [...new Set(targetsData.map(t => t.salesPerson?._id).filter(Boolean))];
      const entries = await Promise.all(
        uniqueIds.map(id =>
          axios.get(`${baseUrl}/targets/sales-summary/${id}`, { headers })
            .then(r => [id, r.data])
            .catch(() => [id, null])
        )
      );
      setSalesDataMap(Object.fromEntries(entries));
    } catch {
      toast.error("Failed to load data");
    } finally { setLoading(false); }
  }, [baseUrl]);

  const fetchDashStats = useCallback(async () => {
    try {
      const params = new URLSearchParams({ period: dashFilter });
      if (dashFilter === "custom") {
        if (dashStartDate) params.append("startDate", dashStartDate);
        if (dashEndDate) params.append("endDate", dashEndDate);
      }
      const statsRes = await axios.get(`${baseUrl}/targets/dashboard-stats?${params.toString()}`, { headers });
      setDashStats(statsRes.data);
    } catch (error) {
      console.error("Failed to fetch dash stats", error);
    }
  }, [baseUrl, dashFilter, dashStartDate, dashEndDate]);

  useEffect(() => {
    if (token) fetchDashStats();
  }, [fetchDashStats, token]);

  // "reason_note" is deliberately excluded — it has its own dedicated Reason
  // Notes tab (see mainView === "reasonNotes" below); including it here too
  // would show the same reported issue twice.
  const TARGET_NOTIF_TYPES = ["target_reminder", "target_due_today", "target_expired", "target_reassign"];

  const notifications = allNotifications
    .filter(n => TARGET_NOTIF_TYPES.includes(n.type))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const handleMarkNotifRead = (n) => {
    if (n.read || n.isRead || !n._id || String(n._id).includes("-")) return;
    setGlobalNotifications(prev => prev.map(x => x._id === n._id ? { ...x, read: true, isRead: true } : x));
    axios.patch(`${baseUrl}/notifications/read/${n._id}`, {}, { headers }).catch(() => {});
  };

  const handleDismissNotif = (e, n) => {
    e.stopPropagation();
    setGlobalNotifications(prev => prev.filter(x => x._id !== n._id));
    if (n._id && !String(n._id).includes("-")) {
      axios.delete(`${baseUrl}/notifications/${n._id}`, { headers }).catch(() => {});
    }
  };

  const handleAcceptReasonNote = async (reassignToUserId, extendEndDate, adminNote) => {
    setReassigningNote(true);
    try {
      const note = reassignNoteModal.note;
      const { data } = await axios.post(`${baseUrl}/targets/${note.targetId}/reason-notes/${note.noteIdx}/reassign`, {
        reassignToUserId,
        extendEndDate,
        adminNote
      }, { headers });
      
      toast.success(data.message);
      setReasonNotes((prev) => prev.filter(n => !(n.targetId === note.targetId && n.noteIdx === note.noteIdx)));
      setReassignNoteModal({ open: false, note: null });
      fetchAll(); // Refresh targets to show new dates/assignee
    } catch (e) {
      console.error(e); // Added to debug errors
      toast.error(e.response?.data?.message || "Failed to reassign target/item");
    } finally {
      setReassigningNote(false);
    }
  };

  const handleRejectReasonNote = async () => {
    if (!rejectNoteReason.trim()) return;
    setRejectingNote(true);
    try {
      const note = rejectNoteModal.note;
      await axios.post(`${baseUrl}/targets/${note.targetId}/reason-notes/${note.noteIdx}/reject`, { rejectReason: rejectNoteReason }, { headers });
      toast.success("Reason rejected");
      setReasonNotes((prev) => prev.map((n) => (n.targetId === note.targetId && n.noteIdx === note.noteIdx ? { ...n, status: "rejected", rejectReason: rejectNoteReason } : n)));
      setRejectNoteModal({ open: false, note: null });
      setRejectNoteReason("");
    } catch {
      toast.error("Failed to reject reason");
    } finally {
      setRejectingNote(false);
    }
  };

  const fetchReasonNotes = useCallback(async () => {
    setLoadingNotes(true);
    try {
      const res = await axios.get(`${baseUrl}/targets/reason-notes/all`, { headers });
      setReasonNotes(res.data || []);
    } catch { /* silently fail */ }
    finally { setLoadingNotes(false); }
  }, [baseUrl]);

  // Target Management's own "Admin Completed" feed — leads/deals Admin
  // personally converted/won that are linked to a Target. Independent
  // endpoint and dismiss flag from Task Management's equivalent tab, so the
  // two never share data or state.
  const fetchAdminActivity = useCallback(async () => {
    setLoadingAdminActivity(true);
    try {
      const { data } = await axios.get(`${baseUrl}/targets/admin-activity`, { headers });
      setAdminActivity(data);
    } catch {
      toast.error("Failed to load admin activity");
    } finally {
      setLoadingAdminActivity(false);
    }
  }, [baseUrl]);

  const handleDismissAdminActivity = async () => {
    if (!dismissConfirm) return;
    const { itemType, itemId } = dismissConfirm;
    setDismissConfirm(null);
    setAdminActivity((prev) => prev && {
      ...prev,
      leadsConvertedByAdmin: itemType === "lead" ? prev.leadsConvertedByAdmin.filter((l) => l._id !== itemId) : prev.leadsConvertedByAdmin,
      dealsWonByAdmin: itemType === "deal" ? prev.dealsWonByAdmin.filter((d) => d._id !== itemId) : prev.dealsWonByAdmin,
    });
    try {
      await axios.post(`${baseUrl}/targets/admin-activity/dismiss`, { itemType, itemId }, { headers });
      toast.success("Removed from Admin Completed");
    } catch {
      toast.error("Failed to remove");
      fetchAdminActivity();
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // Live refresh on deal stage change OR lead conversion (generic socket)
  useEffect(() => {
    if (!socket) return;
    const handler = () => { fetchAll(); };
    socket.on("deal_stage_updated", handler);
    socket.on("lead_converted", handler);
    socket.on("task_completed", handler);
    return () => {
      socket.off("deal_stage_updated", handler);
      socket.off("lead_converted", handler);
      socket.off("task_completed", handler);
    };
  }, [socket, fetchAll]);

  // Target-management-specific real-time events (dedicated socket namespace)
  useEffect(() => {
    if (!targetSocket) return;
    const handler = () => { fetchAll(); };
    const reasonNoteHandler = () => { fetchReasonNotes(); fetchNotifications(); };
    const deadlineHandler = () => { fetchNotifications(); fetchAll(); };
    targetSocket.on("targets_refresh", handler);
    targetSocket.on("reason_note_received", reasonNoteHandler);
    targetSocket.on("target_reminder", deadlineHandler);
    targetSocket.on("target_due_today", deadlineHandler);
    targetSocket.on("target_expired", deadlineHandler);
    return () => {
      targetSocket.off("targets_refresh", handler);
      targetSocket.off("reason_note_received", reasonNoteHandler);
      targetSocket.off("target_reminder", deadlineHandler);
      targetSocket.off("target_due_today", deadlineHandler);
      targetSocket.off("target_expired", deadlineHandler);
    };
  }, [targetSocket, fetchAll, fetchReasonNotes, fetchNotifications]);

  const handleMarkAllRead = () => {
    setGlobalNotifications(prev => {
      const unread = prev.filter(n => TARGET_NOTIF_TYPES.includes(n.type) && !n.read && !n.isRead && n._id && !String(n._id).includes("-"));
      if (unread.length > 0) {
        unread.forEach(n => axios.patch(`${baseUrl}/notifications/read/${n._id}`, {}, { headers }).catch(() => {}));
      }
      return prev.map(n => TARGET_NOTIF_TYPES.includes(n.type) ? { ...n, read: true, isRead: true } : n);
    });
  };

  useEffect(() => {
    if (mainView === "notifications") {
      fetchNotifications();
    }
    if (mainView === "reasonNotes") { fetchReasonNotes(); setNotesPage(1); setSelectedNotes(new Set()); }
    if (mainView === "adminActivity") { fetchAdminActivity(); }
  }, [mainView]);

  const handleUnlinkItem = async () => {
    if (!unlinkConfirm) return;
    const { targetId, type, itemId } = unlinkConfirm;
    setUnlinkConfirm(null);
    setUnlinking(true);
    try {
      await axios.post(`${baseUrl}/targets/${targetId}/unlink-item`, { type, itemId }, { headers });
      toast.success(`${type === "lead" ? "Lead" : "Deal"} removed from target`);
      fetchAll();
    } catch { toast.error("Failed to remove item"); }
    finally { setUnlinking(false); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const { id } = deleteConfirm;
    setDeleteConfirm(null);
    setTargets(prev => prev.filter(t => t._id !== id)); // optimistic removal
    try {
      await axios.delete(`${baseUrl}/targets/${id}`, { headers });
      toast.success("Target deleted");
    } catch { toast.error("Failed to delete"); fetchAll(); }
  };

  const handleDeleteNote = async () => {
    if (!noteDeleteConfirm || noteDeleteConfirm.isBulk) return;
    const { targetId, noteIdx } = noteDeleteConfirm;
    setNoteDeleteConfirm(null);
    try {
      await axios.delete(`${baseUrl}/targets/${targetId}/reason-notes/${noteIdx}`, { headers });
      toast.success("Note deleted");
      fetchReasonNotes();
      setSelectedNotes(prev => { const n = new Set(prev); n.delete(`${targetId}__${noteIdx}`); return n; });
    } catch { toast.error("Failed to delete note"); }
  };

  const handleApproveRejection = async (targetId, action) => {
    try {
      await axios.patch(`${baseUrl}/targets/${targetId}/rejection`, { action }, { headers });
      toast.success(`Rejection ${action}d successfully`);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} rejection`);
    }
  };

  const handleApproveHoldAction = (target, action) => {
    if (action === "approve") {
      setApproveHoldTarget(target);
    } else {
      submitApproveHold(target._id, action);
    }
  };

  const submitApproveHold = async (targetId, action, extendDueDate = null) => {
    try {
      const payload = { action };
      if (extendDueDate) payload.extendDueDate = extendDueDate;
      await axios.patch(`${baseUrl}/targets/${targetId}/hold`, payload, { headers });
      toast.success(`Hold request ${action}d successfully`);
      fetchAll();
      setApproveHoldTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} hold request`);
    }
  };

  const handleBulkDelete = async () => {
    if (!noteDeleteConfirm?.isBulk) return;
    const items = [...selectedNotes].map(key => {
      const [targetId, noteIdx] = key.split("__");
      return { targetId, noteIdx: parseInt(noteIdx, 10) };
    });
    setNoteDeleteConfirm(null);
    try {
      await axios.post(`${baseUrl}/targets/reason-notes/bulk-delete`, { items }, { headers });
      toast.success(`${items.length} note(s) deleted`);
      setSelectedNotes(new Set());
      fetchReasonNotes();
    } catch { toast.error("Failed to bulk delete"); }
  };



  const toggleNoteSelect = (key) => {
    setSelectedNotes(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  const filtered = periodFilter === "all" ? targets : targets.filter(t => t.period === periodFilter);

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-gray-900  flex items-center gap-3"><Target />Target Management</h1>
          <p className="text-base text-slate-600 mt-1">Set and track sales targets — weekly & monthly</p>
        </div>
        <button onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#008ecc] text-white rounded-lg hover:bg-[#0077aa] text-sm font-semibold">
          <Plus size={16} /> Set Target
        </button>
      </div>

      {dashStats && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-slate-900">Dashboard Overview</h2>
            <div className="flex items-center gap-2">
              <select 
                value={dashFilter}
                onChange={(e) => setDashFilter(e.target.value)}
                className="text-xs border-gray-300 rounded-md py-1 px-2 focus:ring-[#008ecc] focus:border-[#008ecc]"
              >
                <option value="all">All Time</option>
                <option value="this_month">This Month</option>
                <option value="custom">Custom Date</option>
              </select>
              {dashFilter === "custom" && (
                <div className="flex items-center gap-1">
                  <input 
                    type="date" 
                    value={dashStartDate}
                    onChange={(e) => setDashStartDate(e.target.value)}
                    className="text-xs border-gray-300 rounded-md py-1 px-2 focus:ring-[#008ecc] focus:border-[#008ecc]"
                  />
                  <span className="text-xs text-gray-500">to</span>
                  <input 
                    type="date" 
                    value={dashEndDate}
                    onChange={(e) => setDashEndDate(e.target.value)}
                    className="text-xs border-gray-300 rounded-md py-1 px-2 focus:ring-[#008ecc] focus:border-[#008ecc]"
                  />
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Leads" value={dashStats.monthly.totalLeads} icon={<Users size={16} />}     color="text-blue-600"   bg="bg-blue-50 border border-blue-100" />
            <StatCard label="Total Deals" value={dashStats.monthly.totalDeals} icon={<Briefcase size={16} />} color="text-sky-600"    bg="bg-sky-50 border border-sky-100" />
            <StatCard label="Deals Won"   value={dashStats.monthly.wonDeals}   icon={<Award size={16} />}     color="text-indigo-600" bg="bg-indigo-50 border border-indigo-100" />
            <StatCard label="Deals Lost"  value={dashStats.monthly.lostDeals}  icon={<XCircle size={16} />}   color="text-red-600"    bg="bg-red-50 border border-red-100" />
          </div>
        </div>
      )}

      {/* Filter + Tabs + Card/Table toggle — all always visible */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {/* Period filter — always visible, affects targets view */}
        {[{ key: "all", label: "All" }, { key: "weekly", label: "Weekly" }, { key: "monthly", label: "Monthly" }].map(f => (
          <button key={f.key} onClick={() => { setPeriodFilter(f.key); setMainView("targets"); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${periodFilter === f.key && mainView === "targets" ? "bg-[#008ecc] text-white shadow-sm" : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"}`}>
            {f.label}
          </button>
        ))}

        {/* Notifications & Reminders tab */}
        <button onClick={() => setMainView(mainView === "notifications" ? "targets" : "notifications")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${mainView === "notifications" ? "bg-amber-500 text-white border-amber-500 shadow-sm" : "bg-white text-amber-600 border-amber-300 hover:bg-amber-50"}`}>
          <Bell size={13} /> Notifications & Reminders
          {notifications.filter(n => !n.read && !n.isRead).length > 0 && (
            <span className="ml-1 bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[16px] text-center leading-none">
              {notifications.filter(n => !n.read && !n.isRead).length}
            </span>
          )}
        </button>

        {/* Reason Notes tab */}
        <button onClick={() => setMainView(mainView === "reasonNotes" ? "targets" : "reasonNotes")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${mainView === "reasonNotes" ? "bg-rose-500 text-white border-rose-500 shadow-sm" : "bg-white text-rose-600 border-rose-300 hover:bg-rose-50"}`}>
          <Flag size={13} /> Reason Notes
          {reasonNotes.filter(n => n.status === "pending").length > 0 && (
            <span className="ml-1 bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[16px] text-center leading-none">
              {reasonNotes.filter(n => n.status === "pending").length}
            </span>
          )}
        </button>

        {/* Admin Completed tab and Info */}
        <div className="flex items-center gap-2">
          <button onClick={() => setMainView(mainView === "adminActivity" ? "targets" : "adminActivity")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${mainView === "adminActivity" ? "bg-indigo-500 text-white border-indigo-500 shadow-sm" : "bg-white text-indigo-600 border-indigo-300 hover:bg-indigo-50"}`}>
            <Trophy size={13} /> Admin Completed
          </button>
          <button 
            onClick={() => setShowWorkflowExplanation(true)}
            className="p-1.5 rounded-full text-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors bg-white border border-indigo-300"
            title="How Targets Work"
          >
            <Info size={16} />
          </button>
        </div>

        {/* Count + Card/Table toggle — always visible */}
        <span className="ml-auto text-xs text-gray-400 mr-2">{filtered.length} target{filtered.length !== 1 ? "s" : ""}</span>
        <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
          <button onClick={() => { setViewMode("card"); setMainView("targets"); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-all ${viewMode === "card" && mainView === "targets" ? "bg-[#008ecc] text-white" : "text-gray-500 hover:bg-gray-50"}`}>
            <LayoutGrid size={14} /> Card
          </button>
          <button onClick={() => { setViewMode("table"); setMainView("targets"); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-all ${viewMode === "table" && mainView === "targets" ? "bg-[#008ecc] text-white" : "text-gray-500 hover:bg-gray-50"}`}>
            <List size={14} /> Table
          </button>
          <button onClick={() => { setViewMode("pipeline"); setMainView("targets"); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-all ${viewMode === "pipeline" && mainView === "targets" ? "bg-[#008ecc] text-white" : "text-gray-500 hover:bg-gray-50"}`}>
            <Activity size={14} /> Pipeline
          </button>
        </div>
      </div>

      {/* ── NOTIFICATIONS & REMINDERS VIEW ── */}
      {mainView === "notifications" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-slate-900 flex items-center gap-2"><Bell size={16} className="text-amber-500" /> Notifications & Reminders</h2>
            <div className="flex items-center gap-3">
              {notifications.filter(n => !n.read && !n.isRead).length > 0 && (
                <button onClick={handleMarkAllRead} className="text-xs text-[#008ecc] hover:underline font-medium">Mark all as read</button>
              )}
              <button onClick={fetchNotifications} className="text-xs text-gray-500 hover:text-gray-800 font-medium">Refresh</button>
            </div>
          </div>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Bell size={36} className="mb-3 opacity-20" />
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="text-xs mt-1">Reminders appear here 1 day before & on the due date</p>
            </div>
          ) : (
            notifications.map((n, i) => {
              const typeStyle = n.type === "target_expired" ? "border-red-200 bg-red-50" : n.type === "target_due_today" ? "border-orange-200 bg-orange-50" : n.type === "target_reminder" ? "border-amber-200 bg-amber-50" : n.type === "reason_note" ? "border-rose-200 bg-rose-50" : "border-blue-200 bg-blue-50";
              const icon = n.type === "target_expired" ? <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" /> : n.type === "target_due_today" ? <Clock size={15} className="text-orange-500 shrink-0 mt-0.5" /> : n.type === "target_reminder" ? <Bell size={15} className="text-amber-500 shrink-0 mt-0.5" /> : n.type === "reason_note" ? <Flag size={15} className="text-rose-500 shrink-0 mt-0.5" /> : <Bell size={15} className="text-blue-500 shrink-0 mt-0.5" />;
              const isUnread = !n.read && !n.isRead;
              return (
                <div key={n._id || i} onClick={() => handleMarkNotifRead(n)}
                  className={`border rounded-2xl px-4 py-3.5 flex items-start gap-3 cursor-pointer ${typeStyle} ${isUnread ? "shadow-sm" : "opacity-80"}`}>
                  {icon}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800">{n.title}</p>
                    <p className="text-xs text-gray-700 font-medium mt-0.5 leading-relaxed whitespace-pre-line">{n.message}</p>
                    <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1"><Clock size={9} />{fmt(n.createdAt)} {fmtTime(n.createdAt)}</p>
                  </div>
                  <div className="flex flex-col gap-1 ml-2 shrink-0 items-end">
                    {isUnread && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkNotifRead(n);
                        }}
                        className="px-2 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold flex items-center gap-1 transition-colors border border-blue-200 shadow-sm"
                        title="Mark as read"
                      >
                        <CheckCheck size={11} /> Mark as read
                      </button>
                    )}
                    <button onClick={(e) => handleDismissNotif(e, n)}
                      className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors shrink-0" title="Remove notification">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── REASON NOTES VIEW ── */}
      {mainView === "reasonNotes" && (() => {
        const totalPages = Math.max(1, Math.ceil(reasonNotes.length / NOTES_PER_PAGE));
        const pagedNotes = reasonNotes.slice((notesPage - 1) * NOTES_PER_PAGE, notesPage * NOTES_PER_PAGE);
        const allPageKeys = new Set(pagedNotes.map(n => `${n.targetId}__${n.noteIdx}`));
        const allSelected = allPageKeys.size > 0 && [...allPageKeys].every(k => selectedNotes.has(k));
        return (
          <div className="space-y-3">
            {/* Header row */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-slate-900 flex items-center gap-2">
                <Flag size={16} className="text-rose-500" /> Reason Notes from Sales Team
                <span className="text-xs font-normal text-gray-400 ml-1">({reasonNotes.length} total)</span>
              </h2>
              <div className="flex items-center gap-2">
                {selectedNotes.size > 0 && (
                  <button onClick={() => setNoteDeleteConfirm({ isBulk: true, count: selectedNotes.size })}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600">
                    <Trash2 size={12} /> Delete Selected ({selectedNotes.size})
                  </button>
                )}
                <button onClick={fetchReasonNotes} className="text-xs text-[#008ecc] hover:underline font-medium">Refresh</button>
              </div>
            </div>

            {loadingNotes ? (
              <div className="text-center text-gray-400 py-10 text-sm">Loading...</div>
            ) : reasonNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Flag size={36} className="mb-3 opacity-20" />
                <p className="text-sm font-medium">No reason notes yet</p>
                <p className="text-xs mt-1">Sales persons can flag delayed leads/deals with a note</p>
              </div>
            ) : (
              <>
                {/* Select all bar */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-200">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input type="checkbox" checked={allSelected}
                      onChange={() => {
                        setSelectedNotes(prev => {
                          const n = new Set(prev);
                          if (allSelected) allPageKeys.forEach(k => n.delete(k));
                          else allPageKeys.forEach(k => n.add(k));
                          return n;
                        });
                      }} className="w-3.5 h-3.5 accent-rose-500" />
                    <span className="text-xs text-gray-500 font-medium">Select all on this page</span>
                  </label>
                  <span className="text-xs text-gray-400 ml-auto">Page {notesPage} of {totalPages} · {NOTES_PER_PAGE} per page</span>
                </div>

                {pagedNotes.map((n, i) => {
                  const selKey = `${n.targetId}__${n.noteIdx}`;
                  const isPending = n.status === "pending";
                  const isReactivated = n.status === "reactivated";
                  return (
                    <div key={i} className={`border rounded-2xl overflow-hidden ${isPending ? "bg-rose-50 border-rose-200" : isReactivated ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"}`}>
                      {/* Card header row */}
                      <div className="flex items-start gap-3 px-4 pt-3 pb-2">
                        <input type="checkbox" checked={selectedNotes.has(selKey)} onChange={() => toggleNoteSelect(selKey)}
                          className="w-3.5 h-3.5 accent-rose-500 mt-1 shrink-0" />
                        <div className={`p-1.5 rounded-full shrink-0 ${isPending ? "bg-rose-100" : "bg-gray-100"}`}>
                          <Flag size={13} className={isPending ? "text-rose-500" : "text-gray-400"} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${n.itemType === "lead" ? "bg-blue-100 text-blue-700" : "bg-indigo-100 text-indigo-700"}`}>{n.itemType}</span>
                            <p className="text-sm font-bold text-gray-900">{n.itemName}</p>
                            {isPending && <span className="text-xs bg-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded-full">Pending</span>}
                            {!isPending && !isReactivated && <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Check size={8} /> Resolved</span>}
                            {isReactivated && <span className="text-xs bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Check size={8} /> Kept with same person</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isPending && (
                            <>
                              <button onClick={() => setReassignNoteModal({ open: true, note: n })}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-semibold hover:bg-emerald-600">
                                <Check size={12} /> Accept
                              </button>
                              <button onClick={() => setRejectNoteModal({ open: true, note: n })}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600">
                                <X size={12} /> Reject
                              </button>
                            </>
                          )}
                          <button onClick={() => setNoteDeleteConfirm({ targetId: n.targetId, noteIdx: n.noteIdx, isBulk: false, count: 1 })}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete note">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Details grid */}
                      <div className="mx-4 mb-3 bg-white rounded-xl border border-gray-100 px-3 py-2.5 space-y-2">
                        {/* Note text */}
                        <p className="text-xs text-gray-800 font-medium leading-relaxed border-l-2 border-rose-300 pl-2.5">"{n.note}"</p>

                        {/* Snapshot detail chips */}
                        {(n.companyName || n.phoneNumber || n.email || n.value || n.stageOrStatus) && (
                          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t border-gray-100">
                            {n.companyName && <span className="text-xs text-gray-500 flex items-center gap-0.5"><Building2 size={9} />{n.companyName}</span>}
                            {n.value && <span className="text-xs font-bold text-gray-700">{n.currency || ""} {n.value}</span>}
                            {n.phoneNumber && <span className="text-xs text-gray-500 flex items-center gap-0.5"><Phone size={9} />{n.phoneNumber}</span>}
                            {n.email && <span className="text-xs text-gray-500 flex items-center gap-0.5 truncate max-w-[200px]"><Mail size={9} />{n.email}</span>}
                            {n.stageOrStatus && <span className="text-xs bg-gray-100 text-gray-600 font-semibold px-1.5 py-0.5 rounded">{n.stageOrStatus}</span>}
                          </div>
                        )}

                        {/* Reporter + time */}
                        <div className="flex items-center gap-3 flex-wrap pt-1 border-t border-gray-100">
                          <p className="text-xs text-gray-600 font-medium flex items-center gap-1">
                            <Users size={10} className="text-gray-400" />
                            {n.salesPerson?.firstName} {n.salesPerson?.lastName}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1"><Clock size={9} />{fmt(n.addedAt)} {fmtTime(n.addedAt)}</p>
                        </div>
                        {(n.status === "resolved" || isReactivated) && n.reassignedTo && (
                          <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                            <ArrowRightLeft size={10} />
                            {isReactivated ? "Kept with" : "Reassigned to"} {n.reassignedTo?.firstName} {n.reassignedTo?.lastName}
                            {n.reassignNote && <span className="text-gray-500 font-normal ml-1">· "{n.reassignNote}"</span>}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button onClick={() => setNotesPage(p => Math.max(1, p - 1))} disabled={notesPage === 1}
                      className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                      <ChevronLeft size={14} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
                      <button key={pg} onClick={() => setNotesPage(pg)}
                        className={`w-8 h-8 rounded-lg text-sm font-semibold border transition-all ${notesPage === pg ? "bg-rose-500 text-white border-rose-500" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}>
                        {pg}
                      </button>
                    ))}
                    <button onClick={() => setNotesPage(p => Math.min(totalPages, p + 1))} disabled={notesPage === totalPages}
                      className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })()}

      {/* ── ADMIN COMPLETED VIEW ── */}
      {/* Strictly Target-scoped — only leads/deals actually linked to a
          Target (see target.controller.js's getAdminActivity). Same visual
          design as Task Management's own Admin Completed tab (list format),
          but an independent endpoint/dismiss-flag/component — no shared
          state with Task Management at all. */}
      {mainView === "adminActivity" && (() => {
        const leads = adminActivity?.leadsConvertedByAdmin || [];
        const deals = adminActivity?.dealsWonByAdmin || [];
        const rows = [
          ...leads.map((l) => ({
            key: `lead-${l._id}`, itemType: "lead", itemId: l._id,
            typeLabel: "Lead → Deal Converted", typeClass: "bg-purple-100 text-purple-700 border-purple-200",
            name: l.leadName, company: l.companyName, salesperson: l.assignTo ? `${l.assignTo.firstName} ${l.assignTo.lastName}` : "—",
            date: l.updatedAt, value: null,
          })),
          ...deals.map((d) => ({
            key: `deal-${d._id}`, itemType: "deal", itemId: d._id,
            typeLabel: "Deal Closed", typeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
            name: d.dealName || d.dealTitle, company: d.companyName, salesperson: d.assignedTo ? `${d.assignedTo.firstName} ${d.assignedTo.lastName}` : "—",
            date: d.wonAt, value: d.value ? `${d.currency || "INR"} ${d.value}` : null,
          })),
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        return (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-slate-900 flex items-center gap-2">
                <Trophy size={16} className="text-indigo-500" /> Admin Completed Leads &amp; Deals
              </h2>
              <button onClick={fetchAdminActivity} className="text-xs text-[#008ecc] hover:underline font-medium">Refresh</button>
            </div>

            {/* Summary counts — display only, never fed back into any
                target's own progress bar/percentages. */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
                <p className="text-xs text-purple-600 font-semibold">Leads Converted by Admin</p>
                <p className="text-xl font-bold text-purple-700">{leads.length}</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                <p className="text-xs text-emerald-600 font-semibold">Deal Closed by Admin</p>
                <p className="text-xl font-bold text-emerald-700">{deals.length}</p>
              </div>
            </div>

            {loadingAdminActivity ? (
              <div className="text-center text-gray-400 py-10 text-sm">Loading...</div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Trophy size={36} className="mb-3 opacity-20" />
                <p className="text-sm font-medium">No admin-completed leads or deals yet</p>
                <p className="text-xs mt-1">When Admin personally converts a Target-linked lead or closes a Target-linked deal Won, it shows up here</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="grid grid-cols-[1.6fr_1.6fr_1.4fr_1.4fr_1.6fr_0.8fr] bg-gray-50 border-b border-gray-200 px-4 py-3">
                  {["Type", "Name", "Company", "Salesperson", "Date & Time", "Actions"].map((h, i) => (
                    <div key={i} className={`text-xs font-bold text-gray-600 uppercase tracking-wide ${i === 5 ? "text-right" : ""}`}>{h}</div>
                  ))}
                </div>
                {rows.map((r) => (
                  <div key={r.key} className="grid grid-cols-[1.6fr_1.6fr_1.4fr_1.4fr_1.6fr_0.8fr] px-4 py-3 border-b border-gray-100 last:border-0 items-center hover:bg-gray-50/70">
                    <div><span className={`text-xs px-2 py-0.5 rounded-md font-medium border ${r.typeClass}`}>{r.typeLabel}</span></div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{r.name}</p>
                      {r.value && <p className="text-xs font-bold text-emerald-600">{r.value}</p>}
                    </div>
                    <div className="text-xs text-gray-600 truncate">{r.company || "—"}</div>
                    <div className="text-xs text-gray-600 truncate">{r.salesperson}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={9} />{fmt(r.date)} {fmtTime(r.date)}</div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => setDismissConfirm({ itemType: r.itemType, itemId: r.itemId, itemName: r.name })}
                        className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500"
                        title="Remove from this list"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── TARGETS VIEW ── */}
      {mainView === "targets" && (
        loading ? (
          <div className="flex justify-center items-center h-40 text-gray-400 text-sm">Loading targets...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-52 text-gray-400">
            <Target size={40} className="mb-3 opacity-20" />
            <p className="text-sm font-medium">No targets set</p>
            <p className="text-xs mt-1">Click "Set Target" to get started</p>
          </div>
        ) : viewMode === "card" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 items-start">
            {filtered.map(t => (
              <CompactTargetCard key={t._id} target={t} onClick={setSelectedTargetDetails} />
            ))}
          </div>
        ) : viewMode === "pipeline" ? (
          <TargetPipelineView
            targets={filtered}
            baseUrl={baseUrl}
            headers={headers}
            onRefresh={fetchAll}
            onEdit={setEditTarget}
            onApproveRejection={(t, action) => handleApproveRejection(t._id, action)}
            onApproveHold={handleApproveHoldAction}
            onOpenReport={(id, type) => setReportModal({ open: true, type, targetId: id })}
          />
        ) : (
          <TableView targets={filtered} onEdit={setEditTarget} onDelete={(id) => { const t = filtered.find(x => x._id === id); setDeleteConfirm({ id, name: `${t?.salesPerson?.firstName} ${t?.salesPerson?.lastName}'s target` }); }} onUnlinkItem={setUnlinkConfirm} onApproveRejection={(t, action) => handleApproveRejection(t._id, action)} onApproveHold={handleApproveHoldAction} onOpenReport={(id, type) => setReportModal({ open: true, type, targetId: id })} onViewReports={(id, type) => setViewReportsModal({ open: true, type, targetId: id })} />
        )
      )}

      {reportModal.open && reportModal.type === "call" && (
        <ReportCallModal
          isOpen={true}
          onClose={() => setReportModal({ open: false, type: null, targetId: null })}
          targetId={reportModal.targetId}
          baseUrl={baseUrl}
          headers={headers}
          onSuccess={fetchAll}
        />
      )}
      {reportModal.open && reportModal.type === "meeting" && (
        <ReportMeetingModal
          isOpen={true}
          onClose={() => setReportModal({ open: false, type: null, targetId: null })}
          targetId={reportModal.targetId}
          baseUrl={baseUrl}
          headers={headers}
          onSuccess={fetchAll}
        />
      )}
      {viewReportsModal.open && (
        <ViewReportsModal
          isOpen={true}
          onClose={() => setViewReportsModal({ open: false, type: null, targetId: null })}
          type={viewReportsModal.type}
          reports={viewReportsModal.type === "call" 
            ? targets.find(t => t._id === viewReportsModal.targetId)?.reportedCalls 
            : targets.find(t => t._id === viewReportsModal.targetId)?.reportedMeetings}
          isAdmin={true}
        />
      )}


      {/* ── NOTE DELETE CONFIRMATION MODAL ── */}
      {noteDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-slate-700">
                  {noteDeleteConfirm.isBulk ? `Delete ${noteDeleteConfirm.count} Note(s)?` : "Delete Reason Note?"}
                </h3>
                <p className="text-base text-slate-600 mt-1">
                  {noteDeleteConfirm.isBulk
                    ? `${noteDeleteConfirm.count} selected reason note(s) will be permanently removed.`
                    : "This reason note will be permanently removed."}
                </p>
              </div>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              <p className="text-xs text-red-600">This action cannot be undone.</p>
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setNoteDeleteConfirm(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={noteDeleteConfirm.isBulk ? handleBulkDelete : handleDeleteNote}
                className="px-5 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600">
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-slate-700">Delete Target?</h3>
                <p className="text-base text-slate-600 mt-1">This will permanently remove <span className="font-semibold text-gray-700">{deleteConfirm.name}</span> and all its progress data.</p>
              </div>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              <p className="text-xs text-red-600">This action cannot be undone. The sales person will also see this removed immediately.</p>
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setDeleteConfirm(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={handleDelete} className="px-5 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADMIN COMPLETED DISMISS CONFIRMATION MODAL ── */}
      {dismissConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-slate-700">Remove from Admin Completed?</h3>
                <p className="text-base text-slate-600 mt-1">Remove <span className="font-semibold text-gray-700">"{dismissConfirm.itemName}"</span> from this list? It won't be deleted — just hidden from Admin Completed.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setDismissConfirm(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={handleDismissAdminActivity} className="px-5 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600">Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* ── UNLINK CONFIRMATION MODAL ── */}
      {unlinkConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-orange-500" />
              </div>
              <div>
                <h3 className="text-slate-700">Remove from Target?</h3>
                <p className="text-base text-slate-600 mt-1">Remove <span className="font-semibold text-gray-700">"{unlinkConfirm.itemName}"</span> from this target?</p>
              </div>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
              <p className="text-xs text-orange-700">The {unlinkConfirm.type} will remain in the system — only removed from this target's tracking.</p>
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setUnlinkConfirm(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={handleUnlinkItem} disabled={unlinking} className="px-5 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-60">
                {unlinking ? "Removing..." : "Yes, Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      <CreateTargetModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={fetchAll} salesUsers={salesUsers} baseUrl={baseUrl} headers={headers} inUseLeadIds={inUseLeadIds} inUseDealIds={inUseDealIds} inTaskLeadIds={inTaskLeadIds} inTaskDealIds={inTaskDealIds} />
      <EditTargetModal open={!!editTarget} onClose={() => setEditTarget(null)} onSaved={fetchAll} target={editTarget} salesUsers={salesUsers} baseUrl={baseUrl} headers={headers} inUseLeadIds={inUseLeadIds} inUseDealIds={inUseDealIds} inTaskLeadIds={inTaskLeadIds} inTaskDealIds={inTaskDealIds} />

      <ApproveHoldModal
        open={!!approveHoldTarget}
        target={approveHoldTarget}
        onClose={() => setApproveHoldTarget(null)}
        onConfirm={submitApproveHold}
      />
      {/* ── Reject Reason Note Modal ── */}
      {rejectNoteModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <XCircle size={20} className="text-red-500" />
              Reject Reason
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Provide a reason for rejecting this note. The sales person will be notified to submit a new reason.
            </p>
            <textarea
              autoFocus
              className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none mb-4"
              rows={4}
              placeholder="Why is this reason invalid?"
              value={rejectNoteReason}
              onChange={(e) => setRejectNoteReason(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setRejectNoteModal({ open: false, note: null }); setRejectNoteReason(""); }}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectReasonNote}
                disabled={rejectingNote || !rejectNoteReason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {rejectingNote ? "Rejecting..." : "Reject Reason"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reassign Reason Note Modal ── */}
      <ReassignReasonNoteModal
        open={reassignNoteModal.open}
        note={reassignNoteModal.note}
        salesUsers={salesUsers}
        loading={reassigningNote}
        onClose={() => setReassignNoteModal({ open: false, note: null })}
        onConfirm={handleAcceptReasonNote}
      />

      <WorkflowExplanationModal open={showWorkflowExplanation} onClose={() => setShowWorkflowExplanation(false)} />

      {/* Full Target Details Modal */}
      {selectedTargetDetails && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 sm:p-6" onClick={() => setSelectedTargetDetails(null)}>
          <div className="bg-transparent w-full max-w-4xl max-h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white rounded-t-xl px-4 py-3 border-b flex justify-between items-center sticky top-0 z-10">
              <h3 className="font-bold text-gray-800">Target Details</h3>
              <button onClick={() => setSelectedTargetDetails(null)} className="text-gray-500 hover:text-gray-800 bg-gray-100 p-1.5 rounded-full">
                <X size={16} />
              </button>
            </div>
            <div className="bg-gray-50 p-4 sm:p-6 rounded-b-xl border border-t-0 border-gray-100 shadow-xl">
              <TargetCard 
                target={selectedTargetDetails} 
                onDelete={(id) => { setDeleteConfirm({ id, name: `${selectedTargetDetails.salesPerson?.firstName} ${selectedTargetDetails.salesPerson?.lastName}'s target` }); setSelectedTargetDetails(null); }} 
                onEdit={(t) => { setEditTarget(t); setSelectedTargetDetails(null); }} 
                salesData={salesDataMap[selectedTargetDetails.salesPerson?._id] || null} 
                onUnlinkItem={(info) => { setUnlinkConfirm(info); setSelectedTargetDetails(null); }} 
                tasks={tasks} 
                onApproveRejection={(t, action) => { handleApproveRejection(t._id, action); setSelectedTargetDetails(null); }} 
                onApproveHold={(t, action) => { handleApproveHoldAction(t, action); setSelectedTargetDetails(null); }} 
                onOpenReport={(id, type) => { setReportModal({ open: true, type, targetId: id }); setSelectedTargetDetails(null); }} 
                onViewReports={(id, type) => { setViewReportsModal({ open: true, type, targetId: id }); setSelectedTargetDetails(null); }} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ApproveHoldModal({ open, target, onClose, onConfirm }) {
  const [newDueDate, setNewDueDate] = useState("");

  useEffect(() => {
    if (open && target) {
      setNewDueDate(target.endDate ? (() => { const d = new Date(target.endDate); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })() : "");
    }
  }, [open, target]);

  if (!open || !target) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-slate-700 mb-4">Approve Hold Request</h3>
        <p className="text-base text-slate-600 mb-4">
          Are you sure you want to approve the hold request for "{target.period} Target"?
          Please provide a new end date to extend the target timeline.
        </p>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-1">New End Date <span className="text-red-500">*</span></label>
          <input
            type="date"
            className="w-full border border-gray-300 rounded p-2"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded">Cancel</button>
          <button onClick={() => {
            if (!newDueDate) {
              toast.error("Please provide a new end date");
              return;
            }
            onConfirm(target._id, "approve", newDueDate);
          }} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">Approve Hold</button>
        </div>
      </div>
    </div>
  );
}


function ReassignReasonNoteModal({ open, note, salesUsers, onClose, onConfirm, loading }) {
  const [reassignTo, setReassignTo] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (open && note) {
      setReassignTo(note.salesPerson?._id || "");
      setNewEndDate("");
      setAdminNote("");
      setShowConfirm(false);
    }
  }, [open, note]);

  if (!open || !note) return null;

  if (showConfirm) {
    const leadsCount = note.remainingLeadsCount !== undefined ? note.remainingLeadsCount : 0;
    const dealsCount = note.remainingDealsCount !== undefined ? note.remainingDealsCount : 0;
    const callsCount = note.remainingCallsCount !== undefined ? note.remainingCallsCount : 0;
    const meetingsCount = note.remainingMeetingsCount !== undefined ? note.remainingMeetingsCount : 0;

    let msgParts = [];
    if (leadsCount > 0) msgParts.push(`${leadsCount} lead(s)`);
    if (dealsCount > 0) msgParts.push(`${dealsCount} deal(s)`);
    if (callsCount > 0) msgParts.push(`${callsCount} call(s)`);
    if (meetingsCount > 0) msgParts.push(`${meetingsCount} meeting(s)`);
    
    const isTarget = note.itemType === "target";
    const messageDetails = isTarget && msgParts.length > 0 
      ? `The underlying ${msgParts.join(" and ")} will also be completely reassigned to the new salesperson.`
      : `This ${note.itemType} will be completely reassigned.`;

    // Calculate overlaps for UI
    const overlapLeads = note.overlappingTaskLeads || [];
    const overlapDeals = note.overlappingTaskDeals || [];
    const hasAnyOverlap = overlapLeads.length > 0 || overlapDeals.length > 0;

    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] flex flex-col">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Reassignment</h3>
          <p className="text-sm text-gray-600 mb-4 shrink-0">
            Are you sure you want to reassign this {note.itemType}? {messageDetails}
          </p>
          
          {(note.remainingLeads?.length > 0 || note.remainingDeals?.length > 0) && isTarget && (
            <div className="mb-4 overflow-y-auto flex-1 min-h-0 border border-gray-100 rounded-lg bg-gray-50/50 p-2 space-y-1.5">
              {note.remainingLeads?.map(l => {
                const overlap = overlapLeads.find(ol => String(ol._id) === String(l._id));
                return (
                  <div key={l._id} className={`p-2 rounded-md border text-sm flex flex-col gap-1 ${overlap ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200"}`}>
                    <div className="flex items-center gap-2 font-medium text-gray-800">
                      <span className="text-xs uppercase tracking-wider text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded">Lead</span>
                      {l.leadName}
                    </div>
                    {overlap && (
                      <div className="text-xs text-amber-700 flex items-center gap-1 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        Also linked to Task: "{overlap.taskTitle}" ({l.leadName} will also be reassigned)
                      </div>
                    )}
                  </div>
                );
              })}
              {note.remainingDeals?.map(d => {
                const overlap = overlapDeals.find(od => String(od._id) === String(d._id));
                return (
                  <div key={d._id} className={`p-2 rounded-md border text-sm flex flex-col gap-1 ${overlap ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200"}`}>
                    <div className="flex items-center gap-2 font-medium text-gray-800">
                      <span className="text-xs uppercase tracking-wider text-purple-600 font-bold bg-purple-50 px-1.5 py-0.5 rounded">Deal</span>
                      {d.dealName || d.dealTitle}
                    </div>
                    {overlap && (
                      <div className="text-xs text-amber-700 flex items-center gap-1 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        Also linked to Task: "{overlap.taskTitle}" ({d.dealName || d.dealTitle} will also be reassigned)
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!isTarget && (note.itemType === "lead" || note.itemType === "deal") && hasAnyOverlap && (() => {
             const overlap = note.itemType === "lead" 
               ? overlapLeads.find(ol => String(ol._id) === String(note.itemId))
               : overlapDeals.find(od => String(od._id) === String(note.itemId));
             
             if (!overlap) return null;
             return (
               <div className="mb-4 p-3 rounded-md bg-amber-50 border border-amber-200">
                 <div className="text-sm text-amber-800 font-semibold mb-1">Warning: Cross-linked Item</div>
                 <div className="text-xs text-amber-700">
                   This {note.itemType} is also linked to the active Task <strong>"{overlap.taskTitle}"</strong>.
                   Reassigning it will automatically cascade and split that Task for the new salesperson.
                 </div>
               </div>
             );
          })()}

          {hasAnyOverlap && isTarget && (
            <div className="mb-4 text-xs text-amber-700 bg-amber-50 p-2.5 rounded border border-amber-200 font-medium">
              Items highlighted in yellow are shared with active Tasks. Proceeding will automatically split those Tasks to reassign the shared items to the new salesperson.
            </div>
          )}

          <div className="flex justify-end gap-3 shrink-0 pt-2">
            <button onClick={() => setShowConfirm(false)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg">Cancel</button>
            <button onClick={() => {
              setShowConfirm(false);
              onConfirm(reassignTo, newEndDate, adminNote);
            }} disabled={loading} className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50">
              {loading ? "Confirming..." : "Yes, Reassign"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Accept Reason & Reassign</h3>
        <p className="text-sm text-gray-600 mb-2">
          You are accepting the reason note for the <span className="font-semibold uppercase">{note.itemType}</span>: <span className="font-bold text-gray-900">{note.itemName}</span>.
        </p>
        <p className="text-sm text-gray-600 mb-4">
          Please select the assignee (you can keep the same person) and assign a new end date.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Assign To <span className="text-red-500">*</span></label>
            <select
              value={reassignTo}
              onChange={(e) => setReassignTo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Select Sales Person</option>
              {salesUsers.map((u) => (
                <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">New End Date <span className="text-red-500">*</span></label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={newEndDate}
              onChange={(e) => setNewEndDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Admin Note (Optional)</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              rows={2}
              placeholder="Add a note to the assignee..."
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg">Cancel</button>
          <button onClick={() => {
            if (!reassignTo) return toast.error("Please select a sales person");
            if (!newEndDate) return toast.error("Please select a new end date");
            setShowConfirm(true);
          }} disabled={loading} className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50">
            {loading ? "Reassigning..." : "Accept & Reassign"}
          </button>
        </div>
      </div>
    </div>
  );
}

function WorkflowExplanationModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
          <X size={20} />
        </button>
        <h3 className="text-slate-700 mb-4 flex items-center gap-2">
          <Info className="text-indigo-500" />
          How Tasks & Targets Work
        </h3>
        
        <div className="space-y-6 text-sm text-gray-700">
          <section>
            <h3 className="text-slate-700 mb-2 border-b pb-1">🏢 Company Viewpoint</h3>
            <p className="mb-2">
              Our workflow is fully automated to ensure complete transparency between what the <strong>Admin assigns</strong> and what the <strong>Salesperson achieves</strong>. The system automatically tracks real progress, eliminating manual status updates.
            </p>
          </section>

          <section>
            <h3 className="text-slate-700 mb-2">👤 Salesperson Workflow</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Auto-Progress:</strong> You cannot manually change a status to "In Progress" or "Completed". As soon as you convert a linked Lead, win a Deal, or log a Call/Meeting, the system automatically moves your task/target to <strong>In Progress</strong>.</li>
              <li><strong>Hold Requests:</strong> If you are blocked, you can request a "Hold". If the Admin approves, the task pauses. As soon as you make further progress, it automatically resumes to <strong>In Progress</strong>.</li>
              <li><strong>Auto-Completion:</strong> Once you complete 100% of the assigned linked items (e.g., all linked leads converted), the system automatically marks it <strong>Completed</strong> and notifies the Admin.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-slate-700 mb-2">👑 Admin Workflow</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Verification:</strong> When a salesperson achieves their goal, it moves to the Admin's feed. The Admin verifies the actual Deals/Leads.</li>
              <li><strong>Admin Completed:</strong> Once the Admin is satisfied, they click <strong>"Admin Completed"</strong>. This finalizes the item and moves it to the permanent <em>Admin Completed</em> list.</li>
              <li><strong>Hold/Reject Approvals:</strong> Admins review requests from salespeople to put tasks on Hold (optionally extending the due date) or Rejecting them entirely if they are invalid.</li>
            </ul>
          </section>
          
          <div className="bg-indigo-50 p-4 rounded-lg mt-4 border border-indigo-100">
            <p className="font-semibold text-indigo-800 mb-1">Key Takeaway:</p>
            <p className="text-indigo-700">
              The entire pipeline is driven by <strong>actual sales actions</strong> (converting leads, winning deals) rather than manual status dropdowns. This guarantees accurate reporting for the company.
            </p>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
