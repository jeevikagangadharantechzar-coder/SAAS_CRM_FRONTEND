import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Mail,
  Paperclip,
  Tag,
  Clock,
  User,
  Building,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  ChevronRight,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

// ─── Utility ─────────────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem("token") || "";

//  Use the download endpoint
const getDownloadUrl = (filePath) =>
  `${API_URL}/files/download?filePath=${encodeURIComponent(filePath)}`;

const triggerDownload = async (file) => {
  try {
    const token = getToken();
    const fileName = file.name || file.filename || "download";
    const response = await fetch(getDownloadUrl(file.path), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error("Download failed");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Download error:", err);
    alert("Download failed. Please try again.");
  }
};

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  draft: {
    icon: FileText,
    color: "text-slate-700",
    bgColor: "bg-slate-100",
    borderColor: "border-slate-200",
    label: "Draft",
  },
  sent: {
    icon: Mail,
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    label: "Sent",
  },
  "no reply": {
    icon: AlertCircle,
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    label: "No Reply",
  },
  rejection: {
    icon: XCircle,
    color: "text-rose-700",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
    label: "Rejected",
  },
  success: {
    icon: CheckCircle,
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    label: "Accepted",
  },
};

// ─── Main ViewProposal component ──────────────────────────────────────────────
const ViewProposal = () => {
  const { id } = useParams();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");

  useEffect(() => {
    const fetchProposal = async () => {
      try {
        const token = localStorage.getItem("token"); // Get token
        const res = await axios.get(`${API_URL}/proposal/${id}`, {
          headers: { Authorization: `Bearer ${token}` } // Add token to headers
        });
        setProposal(res.data);
      } catch (err) {
        console.error("Failed to fetch proposal:", err);
      }
      setLoading(false);
    };
    fetchProposal();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4" />
          <p className="text-slate-600">Loading proposal details...</p>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg max-w-md w-full">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="text-rose-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Proposal Not Found</h2>
          <p className="text-slate-600 mb-6">
            The proposal you're looking for doesn't exist or may have been removed.
          </p>
          <Link
            to="/proposal"
            className="inline-flex items-center px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Proposals
          </Link>
        </div>
      </div>
    );
  }

  const statusStyle = STATUS_CONFIG[proposal.status] || STATUS_CONFIG.draft;
  const StatusIcon = statusStyle.icon;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Page header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center text-slate-600 mb-3">
              <Link
                to="/proposal"
                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                <ArrowLeft size={16} className="mr-1" />
                All Proposals
              </Link>
              <ChevronRight size={16} className="mx-2" />
              <span className="text-slate-500">View Proposal</span>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                {proposal.title}
              </h1>
              <div
                className={`inline-flex items-center px-4 py-2 rounded-full ${statusStyle.bgColor} ${statusStyle.color} border ${statusStyle.borderColor}`}
              >
                <StatusIcon size={16} className="mr-2" />
                <span className="capitalize font-medium text-sm">{statusStyle.label}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-6">
          {["details", "content", "attachments", "activity"].map((tab) => (
            <button
              key={tab}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "attachments" && proposal.attachments?.length > 0
                ? `Attachments (${proposal.attachments.length})`
                : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {/* ── Content Tab ── */}
            {activeTab === "content" && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-lg font-semibold text-slate-900">Proposal Content</h2>
                </div>
                <div className="p-6">
                  <div
                    className="prose max-w-none p-6 bg-slate-50 rounded-lg border border-slate-200"
                    dangerouslySetInnerHTML={{ __html: proposal.content }}
                  />
                </div>
              </div>
            )}

            {/* ── Attachments Tab ── */}
            {activeTab === "attachments" && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-lg font-semibold text-slate-900">Attachments</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Files and documents related to this proposal
                  </p>
                </div>
                <div className="p-6">
                  {proposal.attachments && proposal.attachments.length > 0 ? (
                    <ul className="space-y-3">
                      {proposal.attachments.map((file, idx) => (
                        <li
                          key={idx}
                          className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center min-w-0">
                            <div className="p-3 bg-blue-100 rounded-lg mr-4 flex-shrink-0">
                              <FileText size={20} className="text-blue-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {file.name || file.filename}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                {file.size
                                  ? `${(file.size / 1024).toFixed(1)} KB`
                                  : "Size unknown"}{" "}
                                • Uploaded{" "}
                                {new Date(
                                  file.uploadedAt || proposal.createdAt
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => triggerDownload(file)}
                              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Download"
                            >
                              <Download size={18} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500">No attachments uploaded.</p>
                  )}
                </div>
              </div>
            )}

            {/* Details Tab */}
            {activeTab === "details" && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-lg font-semibold text-slate-900">Proposal Details</h2>
                  <p className="text-sm text-slate-600 mt-1">Comprehensive information about this proposal</p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-sm font-medium text-slate-700 mb-3 uppercase tracking-wide">Client Information</h3>
                        <div className="space-y-4">
                          <div className="flex items-center text-slate-700">
                            <User size={18} className="mr-3 text-slate-500" />
                            <div>
                              <p className="text-sm font-medium">Client Name</p>
                              <p className="text-slate-900">{proposal.dealTitle || "Not specified"}</p>
                            </div>
                          </div>
                          <div className="flex items-center text-slate-700">
                            <Building size={18} className="mr-3 text-slate-500" />
                            <div>
                              <p className="text-sm font-medium">Company</p>
                              <p className="text-slate-900">{proposal.companyName || "Not specified"}</p>
                            </div>
                          </div>
                          <div className="flex items-center text-slate-700">
                            <Mail size={18} className="mr-3 text-slate-500" />
                            <div>
                              <p className="text-sm font-medium">Email Address</p>
                              <a href={`mailto:${proposal.email}`} className="text-blue-600 hover:underline">{proposal.email}</a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-sm font-medium text-slate-700 mb-3 uppercase tracking-wide">Proposal Information</h3>
                        <div className="space-y-4">
                          <div className="flex items-center text-slate-700">
                            <DollarSign size={18} className="mr-3 text-slate-500" />
                            <div>
                              <p className="text-sm font-medium">Proposed Value</p>
                              <p className="text-slate-900">{proposal.value ? `$${proposal.value.toLocaleString()}` : "Not specified"}</p>
                            </div>
                          </div>
                          <div className="flex items-center text-slate-700">
                            <Calendar size={18} className="mr-3 text-slate-500" />
                            <div>
                              <p className="text-sm font-medium">Created Date</p>
                              <p className="text-slate-900">{new Date(proposal.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center text-slate-700">
                            <Clock size={18} className="mr-3 text-slate-500" />
                            <div>
                              <p className="text-sm font-medium">Follow-up Date</p>
                              <p className="text-slate-900">{proposal.followUpDate ? new Date(proposal.followUpDate).toLocaleDateString() : "Not scheduled"}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Activity Tab */}
            {activeTab === "activity" && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-lg font-semibold text-slate-900">Activity Timeline</h2>
                  <p className="text-sm text-slate-600 mt-1">Recent activities and updates for this proposal</p>
                </div>
                <div className="p-6">
                  <div className="relative">
                    <div className="flex items-start mb-8">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <FileText size={16} className="text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-sm font-medium text-slate-900">Proposal created</h3>
                        <p className="text-sm text-slate-500 mt-1">{new Date(proposal.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    {proposal.followUpDate && (
                      <div className="flex items-start mb-8">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                            <Clock size={16} className="text-amber-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <h3 className="text-sm font-medium text-slate-900">Follow-up scheduled</h3>
                          <p className="text-sm text-slate-500 mt-1">{new Date(proposal.followUpDate).toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                          <StatusIcon size={16} className="text-emerald-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-sm font-medium text-slate-900">Status changed to {statusStyle.label}</h3>
                        <p className="text-sm text-slate-500 mt-1">{new Date(proposal.updatedAt || proposal.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200 p-5">
              <h3 className="text-sm font-medium text-slate-700 mb-3 uppercase tracking-wide">Proposal Status</h3>
              <div className={`inline-flex items-center px-4 py-2 rounded-full ${statusStyle.bgColor} ${statusStyle.color} border ${statusStyle.borderColor} mb-4`}>
                <StatusIcon size={16} className="mr-2" />
                <span className="capitalize font-medium text-sm">{statusStyle.label}</span>
              </div>
              <p className="text-sm text-slate-600 mt-2">Last updated {new Date(proposal.updatedAt || proposal.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200 p-5">
              <h3 className="text-sm font-medium text-slate-700 mb-4 uppercase tracking-wide">Client</h3>
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mr-3">
                  <User size={20} className="text-slate-600" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">{proposal.dealTitle || "Unknown Client"}</h4>
                  <p className="text-sm text-slate-600">{proposal.companyName || "No company"}</p>
                </div>
              </div>
              <a href={`mailto:${proposal.email}`} className="flex items-center text-sm text-slate-600 hover:text-blue-600 transition-colors">
                <Mail size={14} className="mr-2" />
                {proposal.email}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewProposal;