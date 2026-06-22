import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import PricingSuggestionCard from "./PricingSuggestioncard";
import {
  ArrowLeft,
  TrendingUp,
  AlertTriangle,
  Users,
  MessageSquare,
  RefreshCw,
  Star,
  Shield,
  Zap,
  Activity,
  Calendar,
  DollarSign,
  User,
  Building,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Info,
  RefreshCwOff
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

const ClientCLVDetails = () => {
  const { companyName } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState(null);
  const [showPricingCard, setShowPricingCard] = useState(true);
  const [ticketForm, setTicketForm] = useState({
    subject: "",
    description: "",
    priority: "Medium",
    category: "General",
  });
  const [isReversed, setIsReversed] = useState(false);

  const decodedCompanyName = companyName ? decodeURIComponent(companyName) : "";

  useEffect(() => {
    if (!decodedCompanyName) {
      toast.error("No company name provided");
      navigate("/cltv/dashboard");
      return;
    }
    fetchClientDetails();
  }, [decodedCompanyName]);

/* ── Fetch Client Details ─────────────────────── */
  const fetchClientDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication required");
        navigate("/login");
        return;
      }

      console.log("Fetching details for company:", decodedCompanyName);

      const response = await axios.get(
        `${API_URL}/cltv/client/${encodeURIComponent(decodedCompanyName)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("Client details response:", response.data);

      if (response.data.success) {
        setClientData(response.data.data);
        // Check if this is a reversed deal (has review but stage not Closed Won)
        const hasReview = response.data.data.reviews?.length > 0;
        const isWon = response.data.data.deals?.some(d => d.stage === "Closed Won");
        setIsReversed(hasReview && !isWon);
      } else {
        throw new Error(response.data.message || "Failed to load client data");
      }
    } catch (error) {
      console.error("Error fetching client details:", error);
      setError(error.response?.data?.message || error.message);
      if (error.response?.status === 404) {
        toast.error(`Client "${decodedCompanyName}" not found`);
        setClientData(null);
      } else if (error.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        navigate("/login");
      } else {
        toast.error("Failed to load client details");
      }
    } finally {
      setLoading(false);
    }
  };

/* ── Handle CLV Calculation Function ─────────────────────── */
  const handleCalculateCLV = async () => {
    try {
      setCalculating(true);
      const token = localStorage.getItem("token");
      toast.info(`Recalculating CLV for ${decodedCompanyName}...`);
      const response = await axios.post(
        `${API_URL}/cltv/calculate/${encodeURIComponent(decodedCompanyName)}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        toast.success("CLV recalculated successfully");
        await fetchClientDetails();
      }
    } catch (error) {
      console.error("Error calculating CLV:", error);
      toast.error(error.response?.data?.message || "Failed to recalculate CLV");
    } finally {
      setCalculating(false);
    }
  };

/* ── Create Support Ticket Function ─────────────────────── */
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      if (!ticketForm.subject || !ticketForm.description) {
        toast.error("Subject and description are required");
        return;
      }

      const response = await axios.post(
        `${API_URL}/cltv/tickets`,
        {
          companyName: decodedCompanyName,
          companyId: clientData?.client?.companyId || clientData?.deals[0]?._id,
          subject: ticketForm.subject,
          description: ticketForm.description,
          priority: ticketForm.priority,
          category: ticketForm.category,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success("Support ticket created successfully");
        setShowTicketModal(false);
        setTicketForm({ subject: "", description: "", priority: "Medium", category: "General" });
        fetchClientDetails();
      }
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast.error(error.response?.data?.message || "Failed to create ticket");
    }
  };

/* ── Get Classification Badge ─────────────────────── */
  const getClassificationBadge = (classification) => {
    switch (classification) {
      case "Top Value":
        return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">⭐ Top Value</span>;
      case "Upsell":
        return <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">⚡ Upsell</span>;
      case "At Risk":
        return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">⚠ At Risk</span>;
      case "Dormant":
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">💀 Dormant</span>;
      default:
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">🆕 {classification || "New"}</span>;
    }
  };

/* ── Get Risk Level Badge ─────────────────────── */
  const getRiskLevelBadge = (riskLevel) => {
    switch (riskLevel) {
      case "High":
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">High Risk</span>;
      case "Medium":
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">Medium Risk</span>;
      case "Low":
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Low Risk</span>;
      case "Dormant":
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">Dormant</span>;
      default:
        return null;
    }
  };

/* ── Format Currency Function ─────────────────────── */
  const formatCurrency = (value) => {
    if (!value && value !== 0) return "₹0";
    if (typeof value === "string") {
      const match = value.match(/[\d,]+/);
      if (match) {
        const num = parseInt(match[0].replace(/,/g, ""));
        return `₹${num.toLocaleString()}`;
      }
    }
    return `₹${Number(value).toLocaleString()}`;
  };

/* ── Format Date Function ─────────────────────── */
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

/* ── Format Number Function ─────────────────────── */
  const formatNumber = (value, decimals = 1) => {
    const num = Number(value);
    return isNaN(num) ? "0" : num.toFixed(decimals);
  };

/* ── Get Health Color ─────────────────────── */
  const getHealthColor = (riskScore) => {
    if (riskScore > 60) return "text-red-600";
    if (riskScore > 40) return "text-yellow-600";
    return "text-green-600";
  };

/* ── Get Classification Color ─────────────────────── */
  const getStageColor = (stage) => {
    switch (stage) {
      case "Closed Won":
        return "bg-green-100 text-green-700";
      case "Closed Lost":
        return "bg-red-100 text-red-700";
      case "Qualification":
        return "bg-blue-100 text-blue-700";
      case "Proposal Sent-Negotiation":
        return "bg-yellow-100 text-yellow-700";
      case "Invoice Sent":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error && !clientData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate("/cltv/dashboard")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Error Loading Client</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={fetchClientDetails}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mr-3"
            >
              Retry
            </button>
            <button
              onClick={() => navigate("/cltv/dashboard")}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!clientData || !clientData.client) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate("/cltv/dashboard")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Users size={48} className="text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Client Not Found</h2>
            <p className="text-gray-600 mb-6">
              The client "{decodedCompanyName}" doesn't exist or you don't have access.
            </p>
            <button
              onClick={() => navigate("/cltv/dashboard")}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If this is a reversed deal (was won but no longer), show a message
  if (isReversed) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate("/cltv/dashboard")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>
          <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-12 text-center">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <RefreshCwOff size={32} className="text-orange-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Deal Reversed</h2>
            <p className="text-gray-600 mb-2">
              This deal was previously "Closed Won" but has been moved to another stage.
            </p>
            <p className="text-sm text-orange-600 mb-6">
              It has been removed from all CLV calculations and client health metrics.
            </p>
            <div className="bg-orange-50 rounded-lg p-4 mb-6 max-w-md mx-auto">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Current Stage:</span> {clientData.deals[0]?.stage || "Unknown"}
              </p>
              <p className="text-sm text-gray-700 mt-1">
                <span className="font-medium">Last Updated:</span> {formatDate(clientData.deals[0]?.updatedAt)}
              </p>
            </div>
            <button
              onClick={() => navigate(`/Pipelineview/${clientData.deals[0]?._id}`)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              View in Pipeline
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { client, deals = [], tickets = [], renewals = [], supportAnalysis = {} } = clientData;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <ToastContainer position="top-right" autoClose={5000} />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{client.companyName}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {getClassificationBadge(client.classification)}
                {client.riskLevel && getRiskLevelBadge(client.riskLevel)}
                <span className="text-sm text-gray-500">
                  Client since {client.firstDealDate ? formatDate(client.firstDealDate) : "N/A"}
                </span>
              </div>
              {/* Show classification reason prominently */}
              {client.classificationReason && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold text-blue-700">Why this classification:</span> {client.classificationReason}
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <button
              onClick={handleCalculateCLV}
              disabled={calculating}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition disabled:bg-indigo-400"
            >
              <RefreshCw size={18} className={calculating ? "animate-spin" : ""} />
              {calculating ? "Calculating..." : "Recalculate CLV"}
            </button>
            <button
              onClick={() => setShowTicketModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
            >
              <MessageSquare size={18} />
              Create Ticket
            </button>
          </div>
        </div>

        {/* Pricing Suggestion Card */}
        {showPricingCard && (
          <div className="mb-6">
            <PricingSuggestionCard 
              companyId={client.companyId || deals[0]?._id}
              dealValue={client.customerLifetimeValue}
              onClose={() => setShowPricingCard(false)}
            />
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Total Deals</p>
            <p className="text-2xl font-bold">{deals.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Support Tickets</p>
            <p className="text-2xl font-bold">{tickets.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Renewals</p>
            <p className="text-2xl font-bold">{renewals.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Risk Score</p>
            <p className={`text-2xl font-bold ${getHealthColor(client.riskScore)}`}>
              {client.riskScore || 0}%
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Classification</p>
            <p className="text-lg font-semibold">{client.classification || "N/A"}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6 bg-white rounded-t-lg px-6 pt-4">
          <nav className="flex gap-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab("overview")}
              className={`pb-3 px-1 whitespace-nowrap ${
                activeTab === "overview"
                  ? "border-b-2 border-blue-600 text-blue-600 font-medium"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("deals")}
              className={`pb-3 px-1 whitespace-nowrap ${
                activeTab === "deals"
                  ? "border-b-2 border-blue-600 text-blue-600 font-medium"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Deals ({deals.length})
            </button>
            <button
              onClick={() => setActiveTab("support")}
              className={`pb-3 px-1 whitespace-nowrap ${
                activeTab === "support"
                  ? "border-b-2 border-blue-600 text-blue-600 font-medium"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Support Tickets ({tickets.length})
            </button>
            <button
              onClick={() => setActiveTab("renewals")}
              className={`pb-3 px-1 whitespace-nowrap ${
                activeTab === "renewals"
                  ? "border-b-2 border-blue-600 text-blue-600 font-medium"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Renewals ({renewals.length})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Support Analysis */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Support Analysis</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Total Tickets</p>
                  <p className="text-xl font-semibold">{supportAnalysis.totalTickets || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Open Tickets</p>
                  <p className="text-xl font-semibold">{supportAnalysis.openTickets || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Support</p>
                  <p className="text-xl font-semibold">
                    {supportAnalysis.lastSupportDate ? formatDate(supportAnalysis.lastSupportDate) : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Support Points</p>
                  <p className="text-xl font-semibold">{client.supportPoints || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Health Score</p>
                  <p className="text-xl font-semibold">{client.clientHealthScore || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Days Inactive</p>
                  <p className="text-xl font-semibold">{client.daysSinceFollowUp || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Progress</p>
                  <p className="text-xl font-semibold">{client.progress || "N/A"}</p>
                </div>
              </div>
            </div>

            {/* Risk Factors */}
            {client.riskFactors && client.riskFactors.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Risk Factors</h3>
                <ul className="list-disc list-inside space-y-1">
                  {client.riskFactors.map((factor, idx) => (
                    <li key={idx} className="text-sm text-red-600">{factor}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === "deals" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Deal History</h3>
            {deals.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Deal Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Stage</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Value</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Created</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Won Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Assigned To</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deals.map((deal, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">
                          {deal.dealName || "Unnamed Deal"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${getStageColor(deal.stage)}`}>
                            {deal.stage}
                          </span>
                          {deal.stage !== "Closed Won" && deal.clientReviewId && (
                            <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                              Reversed
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {formatCurrency(deal.value)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDate(deal.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {deal.wonAt ? formatDate(deal.wonAt) : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {deal.assignedTo ? (
                            <div className="flex items-center gap-1">
                              <User size={14} className="text-gray-400" />
                              {deal.assignedTo.firstName} {deal.assignedTo.lastName}
                            </div>
                          ) : "Unassigned"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => navigate(`/Pipelineview/${deal._id}`)}
                            className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                          >
                            <Eye size={14} />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No deals found for this client</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "support" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Support Tickets</h3>
              <button
                onClick={() => setShowTicketModal(true)}
                className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Create New Ticket
              </button>
            </div>
            
            {tickets.length > 0 ? (
              <div className="space-y-4">
                {tickets.map((ticket, idx) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          ticket.status === "Open" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                        }`}>
                          {ticket.status}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          ticket.priority === "High" || ticket.priority === "Critical" ? "bg-red-100 text-red-700" :
                          ticket.priority === "Medium" ? "bg-yellow-100 text-yellow-700" :
                          "bg-blue-100 text-blue-700"
                        }`}>
                          {ticket.priority}
                        </span>
                        <span className="text-sm font-medium text-gray-800">{ticket.ticketNumber}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDate(ticket.openedAt)}
                      </span>
                    </div>
                    <h4 className="font-medium text-gray-800 mb-1">{ticket.subject}</h4>
                    <p className="text-sm text-gray-600">{ticket.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No support tickets found</p>
            )}
          </div>
        )}

        {activeTab === "renewals" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Renewals</h3>
            {renewals.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Renewal Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Value</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Probability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renewals.map((renewal, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{formatDate(renewal.renewalDate)}</td>
                        <td className="px-4 py-3 text-sm font-medium">{formatCurrency(renewal.renewalValue)}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            renewal.status === "Completed" ? "bg-green-100 text-green-700" :
                            renewal.status === "Pending" ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {renewal.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{renewal.renewalProbability}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No renewals found</p>
            )}
          </div>
        )}

        {/* Create Ticket Modal */}
        {showTicketModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg">
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Create Support Ticket</h3>
                <form onSubmit={handleCreateTicket}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                      <input
                        type="text"
                        value={ticketForm.subject}
                        onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                      <textarea
                        rows={4}
                        value={ticketForm.description}
                        onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                        <select
                          value={ticketForm.priority}
                          onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                          className="w-full border rounded-lg px-3 py-2"
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                          <option value="Critical">Critical</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select
                          value={ticketForm.category}
                          onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                          className="w-full border rounded-lg px-3 py-2"
                        >
                          <option value="Technical">Technical</option>
                          <option value="Billing">Billing</option>
                          <option value="General">General</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowTicketModal(false)}
                      className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Create Ticket
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientCLVDetails;