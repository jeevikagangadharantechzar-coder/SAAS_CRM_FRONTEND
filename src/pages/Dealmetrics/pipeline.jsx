import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate, useParams } from "react-router-dom";
import { 
  Clock, AlertCircle, Zap, User, DollarSign, Filter, RefreshCw,
  BarChart3, AlertTriangle, Target, Eye, EyeOff, SortAsc, SortDesc,
  Sparkles, FileText, Download, ChevronRight, Brain, X, Plus, TrendingUp,
  Building, Send, CheckCircle, XCircle, HelpCircle, Calendar, Edit,
  Phone, Mail, MessageSquare, TrendingDown, Award, Bell, Activity,
  PieChart, LineChart, Copy, Trash2, Settings, Users, BarChart,
  Eye as ViewIcon, ChevronLeft, ChevronRight as ChevronRightIcon
} from "lucide-react";
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement
);

// ==================== UTILITY FUNCTIONS ====================

// Optimized numeric extraction with caching
const valueCache = new Map();
const extractNumericValue = (value) => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  
  const cacheKey = String(value);
  if (valueCache.has(cacheKey)) {
    return valueCache.get(cacheKey);
  }
  
  const cleaned = String(value).replace(/[₹$,]/g, '').trim();
  const num = parseFloat(cleaned);
  const result = isNaN(num) ? 0 : num;
  valueCache.set(cacheKey, result);
  return result;
};

/* ── Format Currency Value Function ─────────────────────── */
const formatCurrencyValue = (val) => {
  if (!val) return "-";
  if (typeof val === 'number') {
    return `₹${val.toLocaleString("en-IN")}`;
  }
  const match = val.match(/^([\d,]+)\s*([A-Z]+)$/i);
  if (!match) return val;
  const number = match[1].replace(/,/g, "");
  const currency = match[2].toUpperCase();
  const formattedNumber = Number(number).toLocaleString("en-IN");
  return `${formattedNumber} ${currency}`;
};

/* ── Format Date Function ─────────────────────── */
const formatDate = (dateString) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

/* ── Get Days Since Update Function ─────────────────────── */
const getDaysSinceUpdate = (updatedAt) => {
  if (!updatedAt) return null;
  const lastUpdate = new Date(updatedAt);
  const today = new Date();
  return Math.floor((today - lastUpdate) / (1000 * 60 * 60 * 24));
};

/* ── Get Days Since Creation Function ─────────────────────── */
const getDaysSinceCreation = (createdAt) => {
  if (!createdAt) return null;
  const creationDate = new Date(createdAt);
  const today = new Date();
  return Math.floor((today - creationDate) / (1000 * 60 * 60 * 24));
};

// ==================== SCORING UTILITY ====================

const STAGE_BASE_SCORES = {
  "Qualification": 0,
  "Proposal Sent-Negotiation": 15,
  "Invoice Sent": 40,
  "Closed Won": 100,
  "Closed Lost": 0
};

const STAGE_ACTIONS = {
  "Qualification": {
    actions: ["Manage Follow-ups & History", "Send Proposal"],
    icon: HelpCircle,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    nextStep: "Move to Proposal Sent",
    label: "Need Attention",
    actionIcons: {
      "Manage Follow-ups & History": Clock,
      "Send Proposal": Send
    }
  },
  "Proposal Sent-Negotiation": {
    actions: ["Manage Follow-ups & History", "Send Invoice"],
    icon: Send,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    nextStep: "Move to Invoice Sent",
    label: "Follow-up Needed",
    actionIcons: {
      "Manage Follow-ups & History": Clock,
      "Send Invoice": FileText
    }
  },
  "Invoice Sent": {
    actions: ["Manage Follow-ups & History", "Convert to Won"],
    icon: FileText,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    nextStep: "Mark as Won",
    label: "Payment Pending",
    actionIcons: {
      "Manage Follow-ups & History": Clock,
      "Convert to Won": CheckCircle
    }
  },
  "Closed Won": {
    actions: ["View in CLV Dashboard"],
    icon: CheckCircle,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    nextStep: "Track in CLV",
    label: "Deal Closed",
    actionIcons: {
      "View in CLV Dashboard": BarChart
    }
  },
  "Closed Lost": {
    actions: ["Review Loss Reasons"],
    icon: XCircle,
    color: "text-rose-600",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
    nextStep: "Analyze Loss",
    label: "Deal Lost",
    actionIcons: {
      "Review Loss Reasons": AlertTriangle
    }
  }
};

const calculateFollowUpScore = (deal) => {
  if (!deal.followUpDate) return 0;

  const daysUntilFollowUp =
    Math.ceil((new Date(deal.followUpDate) - new Date()) / (1000 * 60 * 60 * 24));

  if (daysUntilFollowUp < -365) return -50;
  if (daysUntilFollowUp < -90) return -40;
  if (daysUntilFollowUp < -30) return -35;
  if (daysUntilFollowUp < -14) return -30;
  if (daysUntilFollowUp < -7) return -20;
  if (daysUntilFollowUp < 0) return -10;
  if (daysUntilFollowUp <= 3) return 20;
  if (daysUntilFollowUp <= 7) return 15;
  if (daysUntilFollowUp <= 14) return 10;

  return 0;
};

const calculateActivityScore = (deal) => {
  const daysSinceUpdate = getDaysSinceUpdate(deal.updatedAt) || 0;
  if (daysSinceUpdate > 14) return -30;
  if (daysSinceUpdate > 7) return -15;
  return 0;
};

const calculateValueScore = (deal) => {
  const numericValue = extractNumericValue(deal.value);
  if (numericValue >= 500000) return 10;
  if (numericValue >= 100000) return 5;
  return 0;
};

const calculateStageScore = (deal) => STAGE_BASE_SCORES[deal.stage] || 0;

const calculateFinalScore = (deal, weights = {
  followUpWeight: 25,
  activityWeight: 25,
  valueWeight: 20,
  stageWeight: 30
}) => {
  if (deal.stage === "Closed Won") return 100;
  if (deal.stage === "Closed Lost") return 0;

  const baseScore = 50;
  const followUpScore = calculateFollowUpScore(deal);
  const activityScore = calculateActivityScore(deal);
  const valueScore = calculateValueScore(deal);
  const stageScore = calculateStageScore(deal);

  const weightedScore = 
    (followUpScore * (weights.followUpWeight / 100)) +
    (valueScore * (weights.valueWeight / 100)) +
    (stageScore * (weights.stageWeight / 100)) +
    (activityScore * (weights.activityWeight / 100));

  const finalScore = baseScore + weightedScore;
  return Math.max(0, Math.min(100, Math.round(finalScore)));
};

const getScoringFactors = (deal) => {
  const factors = [];

  const followUpScore = calculateFollowUpScore(deal);
  if (followUpScore !== 0)
    factors.push({ factor: "Follow-up Recency", impact: followUpScore });

  const activityScore = calculateActivityScore(deal);
  if (activityScore !== 0)
    factors.push({ factor: "Activity Gap", impact: activityScore });

  const valueScore = calculateValueScore(deal);
  if (valueScore !== 0)
    factors.push({ factor: "Deal Value", impact: valueScore });

  const stageScore = calculateStageScore(deal);
  if (stageScore !== 0)
    factors.push({ factor: "Stage Bonus", impact: stageScore });

  return factors;
};

// ==================== NOTIFICATION MODAL ====================

const NotificationsPanel = ({ deals, onClose, isOpen }) => {
  const notifications = useMemo(() => {
    const newAlerts = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const deal of deals) {
      if (deal.followUpDate) {
        const followUp = new Date(deal.followUpDate);
        followUp.setHours(0, 0, 0, 0);
        const daysUntil = Math.ceil((followUp - today) / (1000 * 60 * 60 * 24));

        if (daysUntil === 0) {
          newAlerts.push({
            id: `followup-${deal._id}`,
            type: "followup",
            message: `Follow-up today: ${deal.dealName}`,
            dealId: deal._id,
            time: deal.followUpDate
          });
        } else if (daysUntil === 1) {
          newAlerts.push({
            id: `followup-${deal._id}`,
            type: "followup",
            message: `Follow-up tomorrow: ${deal.dealName}`,
            dealId: deal._id,
            time: deal.followUpDate
          });
        }
      }

      if (deal.daysSinceUpdate > 7 &&
          deal.stage !== "Closed Won" &&
          deal.stage !== "Closed Lost") {
        newAlerts.push({
          id: `stale-${deal._id}`,
          type: "stale",
          message: `No activity for 7+ days: ${deal.dealName}`,
          dealId: deal._id,
          time: new Date().toISOString()
        });
      }
    }

    return newAlerts.slice(0, 10);
  }, [deals]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 transform transition-all duration-200 scale-100 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h4 className="font-semibold text-gray-900 text-lg">Notifications</h4>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.map((notif) => (
                <div key={notif.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors">
                  <div className="flex items-start gap-3">
                    {notif.type === "followup" ? (
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Calendar size={16} className="text-blue-600" />
                      </div>
                    ) : (
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <AlertTriangle size={16} className="text-amber-600" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{notif.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(notif.time).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="p-3 bg-gray-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <Bell size={24} className="text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm">No new notifications</p>
              <p className="text-gray-400 text-xs mt-1">You're all caught up!</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 text-right">
          <button onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== METRICS MODAL ====================

const MetricsModal = ({ deals = [], onClose, isOpen }) => {
  const [winRateData, setWinRateData] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);
  const [distributionData, setDistributionData] = useState(null);

  useEffect(() => {
    if (!isOpen || !deals.length) return;

    const stages = [
      "Qualification",
      "Proposal Sent-Negotiation",
      "Invoice Sent",
      "Closed Won",
      "Closed Lost",
    ];

    const totalWon = deals.filter(d => d.stage === "Closed Won").length;
    const stageCounts = {};
    stages.forEach(stage => { stageCounts[stage] = 0; });
    
    const monthlyMap = {};
    const stageDistribution = [];

    for (const deal of deals) {
      stageCounts[deal.stage] = (stageCounts[deal.stage] || 0) + 1;
      
      if (deal.createdAt) {
        const date = new Date(deal.createdAt);
        const monthKey = date.toLocaleString("default", { month: "short", year: "numeric" });
        
        if (!monthlyMap[monthKey]) {
          monthlyMap[monthKey] = { created: 0, won: 0 };
        }
        monthlyMap[monthKey].created += 1;
        
        if (deal.stage === "Closed Won") {
          monthlyMap[monthKey].won += 1;
        }
      }
    }

    const winRates = stages.map(stage => {
      const stageCount = stageCounts[stage] || 0;
      if (stage === "Closed Won") return 100;
      if (stage === "Closed Lost") return 0;
      return stageCount ? ((totalWon / stageCount) * 100).toFixed(1) : 0;
    });

    setWinRateData({
      labels: stages,
      datasets: [{
        label: "Win Rate %",
        data: winRates,
        backgroundColor: "#6366f1",
        borderRadius: 8,
      }],
    });

    const sortedMonths = Object.keys(monthlyMap).sort(
      (a, b) => new Date(a) - new Date(b)
    );

    setMonthlyData({
      labels: sortedMonths,
      datasets: [
        {
          label: "Deals Created",
          data: sortedMonths.map(m => monthlyMap[m].created),
          borderColor: "#6366f1",
          backgroundColor: "rgba(99,102,241,0.15)",
          tension: 0.5,
          fill: true,
          pointRadius: 4,
        },
        {
          label: "Deal Closed",
          data: sortedMonths.map(m => monthlyMap[m].won),
          borderColor: "#10b981",
          backgroundColor: "rgba(16,185,129,0.15)",
          tension: 0.5,
          fill: true,
          pointRadius: 4,
        },
      ],
    });

    const distData = stages.map(stage => stageCounts[stage] || 0);
    setDistributionData({
      labels: stages,
      datasets: [{
        data: distData,
        backgroundColor: ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ef4444"],
        borderWidth: 0,
      }],
    });

  }, [isOpen, deals]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white w-[95%] max-w-6xl h-[95vh] rounded-2xl shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Performance Metrics</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X size={22} />
          </button>
        </div>

        <div className="p-8 space-y-12">
          <div className="border rounded-xl p-6 w-full">
            <h3 className="font-semibold mb-6 flex items-center gap-2 w-100">
              <Target size={18} className="text-indigo-600" />
              Win Rate by Stage
            </h3>
            <div className="h-80 relative">
              {winRateData && <Bar data={winRateData} options={{ maintainAspectRatio: false }} />}
            </div>
          </div>

          <div className="border rounded-xl p-6">
            <h3 className="font-semibold mb-6 flex items-center gap-2">
              <TrendingUp size={18} className="text-indigo-600" />
              Monthly Deals Trend
            </h3>
            <div className="h-96 relative">
              {monthlyData && <Line data={monthlyData} options={{ maintainAspectRatio: false }} />}
            </div>
          </div>

          <div className="border rounded-xl p-6">
            <h3 className="font-semibold mb-6 flex items-center gap-2">
              <PieChart size={18} className="text-indigo-600" />
              Stage Distribution
            </h3>
            <div className="h-96 flex items-center justify-center relative">
              {distributionData && <Doughnut data={distributionData} options={{ maintainAspectRatio: false }} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== STAGE CARD POPUP ====================

const StageCardPopup = ({ stage, deals, onClose, onFilterClick }) => {
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!stage) return null;

  const stageDeals = useMemo(() => {
    const stageMap = {
      'Qualification': 'Qualification',
      'Proposal': 'Proposal Sent-Negotiation',
      'Invoice': 'Invoice Sent',
      'Won': 'Closed Won',
      'Lost': 'Closed Lost'
    };
    const filterStage = stageMap[stage];
    return deals.filter(d => d.stage === filterStage);
  }, [stage, deals]);

  const totalValue = useMemo(() => 
    stageDeals.reduce((sum, deal) => sum + extractNumericValue(deal.value), 0),
  [stageDeals]);

  return (
    <div className="absolute z-50 w-60 bg-white rounded-lg shadow-lg border border-gray-200 p-3 mt-2">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-semibold text-sm text-gray-800 truncate">{stage === 'Won' ? 'Deal Closed' : stage === 'Lost' ? 'Deal Lost' : `${stage} Stage`}</h4>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
          <X size={14} className="text-gray-400" />
        </button>
      </div>

      <div className="flex justify-between text-xs mb-2">
        <div>
          <span className="text-gray-500">Deals</span>
          <div className="font-semibold text-gray-900">{stageDeals.length}</div>
        </div>
        <div className="text-right">
          <span className="text-gray-500">Value</span>
          <div className="font-semibold text-gray-900">₹{(totalValue / 100000).toFixed(1)}L</div>
        </div>
      </div>

      <div className="max-h-40 overflow-y-auto space-y-1">
        {stageDeals.slice(0, 4).map((deal) => (
          <div key={deal._id} className="p-2 hover:bg-gray-50 rounded-md transition-colors">
            <div className="text-sm font-medium text-gray-800 truncate">{deal.dealName}</div>
            <div className="flex justify-between text-xs text-gray-500 mt-0.5">
              <span>{formatCurrencyValue(deal.value)}</span>
              <span>{deal.assignedTo?.firstName || "—"}</span>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => {
          onFilterClick(stage);
          onClose();
        }}
        className="w-full mt-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
      >
        View All ({stageDeals.length})
      </button>
    </div>
  );
};

// ==================== AI PREDICTIONS ====================

const AIPredictions = ({ deals }) => {
  const predictions = useMemo(() => {
    const atRisk = [];
    const highProbability = [];
    let predictedRevenue = 0;

    for (const deal of deals) {
      const daysSinceUpdate = getDaysSinceUpdate(deal.updatedAt) || 0;
      
      if (deal.stage !== "Closed Won" && deal.stage !== "Closed Lost") {
        if (daysSinceUpdate > 7 ||
            (deal.stage === "Proposal Sent-Negotiation" && daysSinceUpdate > 5) ||
            (deal.stage === "Invoice Sent" && daysSinceUpdate > 3)) {
          atRisk.push(deal);
        }
      }
      
      if (deal.stage === "Invoice Sent" ||
          (deal.stage === "Proposal Sent-Negotiation" && deal.followUpDate)) {
        highProbability.push(deal);
        predictedRevenue += extractNumericValue(deal.value) * 0.7;
      }
    }

    return { atRisk, highProbability, predictedRevenue };
  }, [deals]);

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-200 p-6 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Brain size={18} className="text-indigo-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">AI Predictions</h3>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-emerald-50 rounded-lg">
            <div className="text-xs text-gray-600">High Probability</div>
            <div className="text-xl font-bold text-emerald-700">
              {predictions.highProbability.length}
            </div>
          </div>
        </div>

        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="text-xs text-gray-600">Predicted Revenue (Next 30 days)</div>
          <div className="text-lg font-bold text-blue-700">
            ₹{(predictions.predictedRevenue / 100000).toFixed(1)}L
          </div>
        </div>

        {predictions.atRisk.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-gray-700 mb-2">At Risk Deals:</p>
            {predictions.atRisk.slice(0, 3).map((deal) => (
              <div key={deal._id} className="text-xs text-gray-600 flex items-center gap-2 mb-1">
                <AlertTriangle size={10} className="text-rose-500" />
                <span className="truncate">{deal.dealName}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== SCORE CONFIGURATION ====================

const ScoreConfiguration = ({ onSave }) => {
  const [weights, setWeights] = useState(() => {
    const saved = localStorage.getItem('scoreWeights');
    return saved ? JSON.parse(saved) : { followUpWeight: 25, activityWeight: 25, valueWeight: 20, stageWeight: 30 };
  });
  const [showModal, setShowModal] = useState(false);

  const handleSave = () => {
    localStorage.setItem('scoreWeights', JSON.stringify(weights));
    onSave(weights);
    setShowModal(false);
    toast.success('Score weights updated');
  };

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape' && showModal) setShowModal(false); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showModal]);

  const handleBackdropClick = (e) => { if (e.target === e.currentTarget) setShowModal(false); };

  return (
    <>
      <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
        <Settings size={16} /> Customize Scoring
      </button>
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={handleBackdropClick}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 transform transition-all duration-300 scale-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Customize Scoring Weights</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">Follow-up Recency</span>
                  <span className="font-medium text-gray-900">{weights.followUpWeight}%</span>
                </div>
                <input type="range" min="0" max="50" value={weights.followUpWeight} 
                  onChange={(e) => setWeights({...weights, followUpWeight: parseInt(e.target.value)})} 
                  className="w-full" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">Activity Gap</span>
                  <span className="font-medium text-gray-900">{weights.activityWeight}%</span>
                </div>
                <input type="range" min="0" max="50" value={weights.activityWeight} 
                  onChange={(e) => setWeights({...weights, activityWeight: parseInt(e.target.value)})} 
                  className="w-full" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">Deal Value</span>
                  <span className="font-medium text-gray-900">{weights.valueWeight}%</span>
                </div>
                <input type="range" min="0" max="50" value={weights.valueWeight} 
                  onChange={(e) => setWeights({...weights, valueWeight: parseInt(e.target.value)})} 
                  className="w-full" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">Stage Bonus</span>
                  <span className="font-medium text-gray-900">{weights.stageWeight}%</span>
                </div>
                <input type="range" min="0" max="50" value={weights.stageWeight} 
                  onChange={(e) => setWeights({...weights, stageWeight: parseInt(e.target.value)})} 
                  className="w-full" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Total: {weights.followUpWeight + weights.activityWeight + weights.valueWeight + weights.stageWeight}%
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowModal(false)} 
                className="flex-1 px-4 py-3 text-gray-700 font-medium rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} 
                className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ==================== FOLLOW-UP MODAL ====================

const FollowUpModal = ({ isOpen, onClose, deal, onSave }) => {
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("");
  const [followUpComment, setFollowUpComment] = useState("");
  const [followUpType, setFollowUpType] = useState("call");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && deal) {
      if (deal.followUpDate) {
        const date = new Date(deal.followUpDate);
        setFollowUpDate(date.toISOString().split('T')[0]);
        setFollowUpTime(date.toTimeString().slice(0, 5));
        setFollowUpComment(deal.followUpComment || "");
        setFollowUpType(deal.followUpType || "call");
      } else {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setFollowUpDate(tomorrow.toISOString().split('T')[0]);
        setFollowUpTime("10:00");
        setFollowUpComment("");
        setFollowUpType("call");
      }
    }
  }, [isOpen, deal]);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape' && isOpen) onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleBackdropClick = (e) => { if (e.target === e.currentTarget) onClose(); };

  const handleSubmit = async () => {
    if (!followUpDate || !followUpTime) { 
      toast.error("Please select date and time"); 
      return; 
    }
    setLoading(true);
    try {
      const dateTime = new Date(followUpDate);
      dateTime.setHours(
        parseInt(followUpTime.split(":")[0]),
        parseInt(followUpTime.split(":")[1])
      );
      await onSave({ followUpDate: dateTime.toISOString(), followUpComment, followUpType });
    } catch (error) {
      console.error("Error saving follow-up:", error);
      toast.error("Failed to save follow-up");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !deal) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-lg flex items-center justify-center z-50 p-4 transition-opacity duration-300"
      onClick={handleBackdropClick}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6 transform transition-all duration-300 scale-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar size={20} className="text-purple-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Schedule Follow-up</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Deal: <span className="font-medium text-gray-900">{deal.dealName}</span></p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Follow-up Type</label>
            <div className="grid grid-cols-3 gap-2">
              {['call', 'email', 'meeting'].map(type => (
                <button key={type} type="button" onClick={() => setFollowUpType(type)} 
                  className={`flex flex-col items-center p-3 rounded-lg border transition-colors ${
                    followUpType === type ? "bg-purple-50 border-purple-300 text-purple-700" : "border-gray-200 hover:bg-gray-50"
                  }`}>
                  {type === 'call' && <Phone size={20} />}
                  {type === 'email' && <Mail size={20} />}
                  {type === 'meeting' && <Users size={20} />}
                  <span className="text-xs mt-1 capitalize">{type}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} 
              min={new Date().toISOString().split('T')[0]} 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-200 focus:border-purple-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
            <input type="time" value={followUpTime} onChange={(e) => setFollowUpTime(e.target.value)} 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-200 focus:border-purple-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
            <textarea value={followUpComment} onChange={(e) => setFollowUpComment(e.target.value)} 
              rows={3} placeholder="Add any notes for this follow-up..." 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-200 focus:border-purple-400" />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button onClick={onClose} className="px-4 py-3 text-gray-700 font-medium rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading} 
            className="px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all disabled:opacity-50">
            {loading ? "Saving..." : "Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== STAGE ACTION MODAL ====================

const StageActionModal = ({ isOpen, onClose, deal, onAction, navigate }) => {
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape' && isOpen) onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleBackdropClick = (e) => { if (e.target === e.currentTarget) onClose(); };

  const handleAction = (action) => {
    if (action === "View in CLV Dashboard") {
      if (deal.companyName) {
        navigate(`/cltv/client/${encodeURIComponent(deal.companyName)}`);
      } else {
        navigate("/cltv/dashboard");
      }
      onClose();
    } else {
      onAction(action);
    }
  };

  if (!isOpen || !deal) return null;

  const stageConfig = STAGE_ACTIONS[deal.stage] || STAGE_ACTIONS["Qualification"];
  const ActionIcon = stageConfig.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md transition-all duration-200"
      onClick={handleBackdropClick}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6 transform transition-all duration-300 scale-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 ${stageConfig.bgColor} rounded-lg`}>
              <ActionIcon size={20} className={stageConfig.color} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Next Best Actions</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Deal: <span className="font-medium text-gray-900">{deal.dealName}</span></p>
          <p className="text-sm text-gray-600 mt-1">Current Stage: <span className={`font-medium ${stageConfig.color}`}>{deal.stage}</span></p>
        </div>
        <div className="space-y-3">
          {stageConfig.actions.map((action, index) => {
            const ActionIconComponent = stageConfig.actionIcons?.[action] || Target;
            return (
              <button key={index} onClick={() => handleAction(action)} 
                className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <ActionIconComponent size={16} className="text-indigo-600" />
                  </div>
                  <span className="font-medium text-gray-900">{action}</span>
                </div>
                <ChevronRight size={16} className="text-gray-400" />
              </button>
            );
          })}
        </div>
        {stageConfig.nextStep && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2">Suggested next step:</p>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <TrendingUp size={14} className="text-green-600" />
              <span>{stageConfig.nextStep}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== LOSS ANALYSIS MODAL ====================

const LossAnalysisModal = ({ isOpen, onClose, deal, onSubmit }) => {
  const [lossReason, setLossReason] = useState("");
  const [notes, setNotes] = useState("");
  const [competitor, setCompetitor] = useState("");
  const [loading, setLoading] = useState(false);

  const lossReasons = ["Price too high", "Competitor won", "Budget constraints", "Timeline issues", "Product fit", "Decision maker change", "No response", "Other"];

  useEffect(() => {
    if (isOpen && deal) {
      setLossReason(deal.lossReason || "");
      setNotes(deal.lossNotes || "");
      setCompetitor(deal.competitor || "");
    }
  }, [isOpen, deal]);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape' && isOpen) onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleBackdropClick = (e) => { if (e.target === e.currentTarget) onClose(); };

  const handleSubmit = async () => {
    if (!lossReason) { 
      toast.error("Please select a loss reason"); 
      return; 
    }
    setLoading(true);
    try {
      await onSubmit({ dealId: deal._id, lossReason, notes, competitor: competitor || null });
      toast.success("Loss analysis recorded");
      onClose();
    } catch (error) {
      console.error("Error submitting loss analysis:", error);
      toast.error("Failed to submit analysis");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !deal) return null;

  const isSubmitted = !!deal.lossReason;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md transition-all duration-200"
      onClick={handleBackdropClick}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6 transform transition-all duration-300 scale-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 rounded-lg">
              <AlertTriangle size={20} className="text-rose-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              {isSubmitted ? "Loss Analysis Details" : "Deal Loss Analysis"}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Deal: <span className="font-medium text-gray-900">{deal.dealName}</span></p>
        </div>
        {isSubmitted ? (
          <div className="space-y-4">
            <div className="p-4 bg-rose-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Loss Reason</p>
              <p className="text-lg font-semibold text-rose-700">{deal.lossReason}</p>
            </div>
            {deal.competitor && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Competitor</p>
                <p className="text-base text-gray-900">{deal.competitor}</p>
              </div>
            )}
            {deal.lossNotes && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Notes</p>
                <p className="text-base text-gray-900">{deal.lossNotes}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loss Reason <span className="text-rose-500">*</span>
              </label>
              <select value={lossReason} onChange={(e) => setLossReason(e.target.value)} 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-200 focus:border-rose-400">
                <option value="">Select a reason</option>
                {lossReasons.map(reason => <option key={reason} value={reason}>{reason}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Competitor (Optional)</label>
              <input type="text" value={competitor} onChange={(e) => setCompetitor(e.target.value)} 
                placeholder="e.g., Competitor name" 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-200 focus:border-rose-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} 
                rows={3} placeholder="Add any additional context..." 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-200 focus:border-rose-400" />
            </div>
          </div>
        )}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button onClick={onClose} className="px-4 py-3 text-gray-700 font-medium rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors">
            Close
          </button>
          {!isSubmitted && (
            <button onClick={handleSubmit} disabled={loading} 
              className="px-4 py-3 bg-gradient-to-r from-rose-600 to-rose-700 text-white font-medium rounded-xl hover:from-rose-700 hover:to-rose-800 transition-all disabled:opacity-50">
              {loading ? "Submitting..." : "Submit Analysis"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== EXPORT FUNCTION ====================

const exportData = (deals) => {
  try {
    const headers = ["Deal Name", "Company", "Value", "Stage", "Score", "Assignee", "Last Updated", "Days Since Update", "Follow-up Date"];
    const csvRows = deals.map(deal => [
      `"${deal.dealName || ''}"`,
      `"${deal.companyName || ''}"`,
      `"${deal.value || ''}"`,
      `"${deal.stage || ''}"`,
      deal.stageScore || 0,
      `"${deal.assignedTo ? `${deal.assignedTo.firstName || ''} ${deal.assignedTo.lastName || ''}`.trim() : 'Unassigned'}"`,
      formatDate(deal.updatedAt),
      getDaysSinceUpdate(deal.updatedAt) || '',
      deal.followUpDate ? new Date(deal.followUpDate).toLocaleDateString() : ''
    ]);
    const csvContent = [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `deals-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success(`${deals.length} deals exported successfully!`);
  } catch (error) {
    console.error('Export error:', error);
    toast.error('Failed to export data');
  }
};

// ==================== MOBILE DEAL VIEW ====================

const MobileDealView = ({ deal, onAction, navigate }) => {
  const [expanded, setExpanded] = useState(false);
  const stageConfig = STAGE_ACTIONS[deal.stage] || STAGE_ACTIONS["Qualification"];

  const handleCLVNavigation = () => {
    if (deal.stage === "Closed Won" && deal.companyName) {
      navigate(`/cltv/client/${encodeURIComponent(deal.companyName)}`);
    }
  };

  return (
    <div className="block lg:hidden border border-gray-200 rounded-xl p-4 mb-3 bg-white hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 truncate">{deal.dealName}</h4>
          <p className="text-sm text-gray-600 truncate">{deal.companyName || 'No company'}</p>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ml-2 ${
          deal.stage === 'Qualification' ? 'bg-amber-100 text-amber-800' :
          deal.stage === 'Proposal Sent-Negotiation' ? 'bg-blue-100 text-blue-800' :
          deal.stage === 'Invoice Sent' ? 'bg-purple-100 text-purple-800' :
          deal.stage === 'Closed Won' ? 'bg-emerald-100 text-emerald-800' :
          'bg-rose-100 text-rose-800'
        }`}>{deal.stage?.replace('-', ' ')}</span>
      </div>
      <div className="mt-2 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1 text-gray-600">
          <DollarSign size={12} />{formatCurrencyValue(deal.value) || 'No value'}
        </div>
        <div className="flex items-center gap-1 text-gray-600">
          <User size={12} />{deal.assignedTo ? `${deal.assignedTo.firstName || ''}`.trim() : 'Unassigned'}
        </div>
        <div className="flex items-center gap-1 text-gray-600">
          <Target size={12} />{deal.stageScore || 0}
        </div>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Last Updated:</span>
              <span className="text-gray-900">{deal.daysSinceUpdate === 0 ? 'Today' : `${deal.daysSinceUpdate} days ago`}</span>
            </div>
            {deal.followUpDate && (
              <div className="flex justify-between">
                <span className="text-gray-600">Follow-up:</span>
                <span className="text-purple-600">{new Date(deal.followUpDate).toLocaleDateString()}</span>
              </div>
            )}
            <div className="flex gap-2 mt-3">
              {deal.stage === "Closed Won" ? (
                <button onClick={handleCLVNavigation} 
                  className="flex-1 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors">
                  View in CLV
                </button>
              ) : (
                <button onClick={() => onAction(deal, 'stage')} 
                  className="flex-1 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors">
                  Take Action
                </button>
              )}
              {deal.stage !== "Closed Won" && deal.stage !== "Closed Lost" && (
                <button onClick={() => onAction(deal, 'followUp')} 
                  className="flex-1 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
                  Schedule
                </button>
              )}
              {deal.stage === "Closed Lost" && (
                <button onClick={() => onAction(deal, 'loss')} 
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    deal.hasLossAnalysis ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                  }`}>
                  {deal.hasLossAnalysis ? "View Analysis" : "Analyze"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <button onClick={() => setExpanded(!expanded)} 
        className="mt-2 text-xs text-indigo-600 flex items-center gap-1 hover:text-indigo-800 transition-colors">
        {expanded ? 'Show Less' : 'Show More'} 
        <ChevronRight size={12} className={expanded ? 'rotate-90 transition-transform' : 'transition-transform'} />
      </button>
    </div>
  );
};

// ==================== PAGINATION COMPONENT ====================

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const getPageNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      }
    }

    range.forEach((i) => {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    });

    return rangeWithDots;
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`p-2 rounded-lg transition-colors ${
          currentPage === 1 
            ? 'text-gray-400 cursor-not-allowed' 
            : 'text-gray-700 hover:bg-gray-200'
        }`}
      >
        <ChevronLeft size={18} />
      </button>

      {getPageNumbers().map((page, index) => (
        <React.Fragment key={index}>
          {page === '...' ? (
            <span className="w-8 h-8 flex items-center justify-center text-gray-400">...</span>
          ) : (
            <button
              onClick={() => onPageChange(page)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                currentPage === page
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              {page}
            </button>
          )}
        </React.Fragment>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`p-2 rounded-lg transition-colors ${
          currentPage === totalPages 
            ? 'text-gray-400 cursor-not-allowed' 
            : 'text-gray-700 hover:bg-gray-200'
        }`}
      >
        <ChevronRightIcon size={18} />
      </button>
    </div>
  );
};

// ==================== MAIN DASHBOARD ====================

const CURRENCY_SYMBOLS = {
  USD: "$", EUR: "€", INR: "₹", GBP: "£", JPY: "¥",
  AUD: "A$", CAD: "C$", CHF: "CHF", MYR: "RM", AED: "د.إ",
  SGD: "S$", ZAR: "R", SAR: "﷼",
};

function DealIntelligenceDashboard() {
  const API_URL = import.meta.env.VITE_API_URL;
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userCurrency = storedUser?.currency || "USD";
  const userCurrencySymbol = CURRENCY_SYMBOLS[userCurrency] || userCurrency;
  const [deals, setDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState("");
  const [userId, setUserId] = useState("");
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [sortByScore, setSortByScore] = useState("desc");
  const [showStageIntelligence, setShowStageIntelligence] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [modalState, setModalState] = useState({ stage: false, followUp: false, loss: false, email: false });
  const [showMetrics, setShowMetrics] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hoveredStage, setHoveredStage] = useState(null);
  const [showStagePopup, setShowStagePopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scoreWeights, setScoreWeights] = useState(() => {
    const saved = localStorage.getItem('scoreWeights');
    return saved ? JSON.parse(saved) : { followUpWeight: 25, activityWeight: 25, valueWeight: 20, stageWeight: 30 };
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const navigate = useNavigate();
  const { tenantSlug } = useParams();

  // Get user info
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user"));
    if (userData) {
      setUserRole(userData.role?.name || "");
      setUserId(userData._id || "");
    }
  }, []);

  // Optimized fetch data with caching
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      
      const dealsRes = await axios.get(`${API_URL}/deals/getAll`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let filteredDeals = dealsRes.data || [];
      if (userRole === "Sales") {
        filteredDeals = filteredDeals.filter(deal => deal.assignedTo?._id === userId);
      }

      // Process deals in chunks for better performance
      const dealsWithScores = [];
      const chunkSize = 50;
      
      for (let i = 0; i < filteredDeals.length; i += chunkSize) {
        const chunk = filteredDeals.slice(i, i + chunkSize);
        const processedChunk = chunk.map(deal => {
          const finalScore = calculateFinalScore(deal, scoreWeights);
          const scoringFactors = getScoringFactors(deal);
          const daysSinceUpdate = getDaysSinceUpdate(deal.updatedAt);
          const daysSinceCreation = getDaysSinceCreation(deal.createdAt);
          
          return {
            ...deal,
            stageScore: finalScore,
            scoringFactors,
            daysSinceUpdate,
            daysSinceCreation,
            stageConfig: STAGE_ACTIONS[deal.stage] || STAGE_ACTIONS["Qualification"],
            hasLossAnalysis: !!(deal.lossReason || deal.lossNotes)
          };
        });
        dealsWithScores.push(...processedChunk);
      }

      setDeals(dealsWithScores);
    } catch (err) {
      console.error(err);
      setDeals([]);
      toast.error("Failed to fetch deals");
    } finally {
      setIsLoading(false);
    }
  }, [API_URL, userRole, userId, scoreWeights]);

  useEffect(() => {
    if (userRole) fetchData();
  }, [userRole, fetchData]);

  // Clear selectedDeal when modals are closed
  useEffect(() => {
    if (!modalState.stage && !modalState.followUp && !modalState.loss && !modalState.email) {
      const timer = setTimeout(() => setSelectedDeal(null), 300);
      return () => clearTimeout(timer);
    }
  }, [modalState]);

  // Optimized pipeline insights
  const pipelineInsights = useMemo(() => {
    const insights = {
      totalDeals: deals.length,
      qualificationDeals: 0,
      proposalDeals: 0,
      invoiceDeals: 0,
      wonDeals: 0,
      lostDeals: 0,
      totalValue: 0,
      avgStageScore: 0,
      unassignedDeals: 0,
      activeDeals: 0
    };

    if (deals.length === 0) return insights;

    let totalScore = 0;

    for (const deal of deals) {
      switch(deal.stage) {
        case "Qualification": insights.qualificationDeals++; break;
        case "Proposal Sent-Negotiation": insights.proposalDeals++; break;
        case "Invoice Sent": insights.invoiceDeals++; break;
        case "Closed Won": insights.wonDeals++; break;
        case "Closed Lost": insights.lostDeals++; break;
      }

      if (deal.stage !== "Closed Won" && deal.stage !== "Closed Lost") {
        insights.activeDeals++;
      }
      if (!deal.assignedTo) insights.unassignedDeals++;
      
      insights.totalValue += extractNumericValue(deal.value);
      totalScore += deal.stageScore || 0;
    }

    insights.avgStageScore = deals.length > 0 
      ? Math.round((totalScore / deals.length) * 10) / 10 
      : 0;

    return insights;
  }, [deals]);

  // Optimized filtering and sorting
  const processedDeals = useMemo(() => {
    if (deals.length === 0) return [];

    let filtered = deals;

    if (stageFilter !== "all") {
      filtered = filtered.filter(deal => deal.stage === stageFilter);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      filtered = filtered.filter(deal => 
        (deal.dealName?.toLowerCase().includes(q)) ||
        (deal.companyName?.toLowerCase().includes(q)) ||
        (deal.assignedTo?.firstName?.toLowerCase().includes(q)) ||
        (deal.assignedTo?.lastName?.toLowerCase().includes(q))
      );
    }

    if (filtered.length > 0) {
      filtered.sort((a, b) => 
        sortByScore === "asc" 
          ? (a.stageScore || 0) - (b.stageScore || 0)
          : (b.stageScore || 0) - (a.stageScore || 0)
      );
    }

    return filtered;
  }, [deals, stageFilter, query, sortByScore]);

  // Pagination
  const totalPages = Math.ceil(processedDeals.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentDeals = processedDeals.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = useCallback((pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  }, [totalPages]);

  const handleStageFilter = useCallback((stage) => {
    const map = { 
      'Qualification': 'Qualification', 
      'Proposal': 'Proposal Sent-Negotiation', 
      'Invoice': 'Invoice Sent', 
      'Won': 'Closed Won', 
      'Lost': 'Closed Lost' 
    };
    setStageFilter(map[stage] || 'all');
    setCurrentPage(1);
  }, []);

  const handleStageAction = useCallback(async (action) => {
    if (!selectedDeal) return;

    try {
      if (action === "Send Proposal") {
        navigate(`/${tenantSlug}/proposal`, { 
          state: { 
            proposal: { 
              dealTitle: selectedDeal.dealName, 
              email: selectedDeal.email || "", 
              dealId: selectedDeal._id 
            }, 
            isEditing: false, 
            autoFill: true 
          } 
        });
        setTimeout(() => setSelectedDeal(null), 100);
      } 
      else if (action === "Send Invoice") {
        navigate(`/${tenantSlug}/invoices`);
        setTimeout(() => setSelectedDeal(null), 100);
      } 
      else if (action === "Manage Follow-ups & History") {
        navigate(`/${tenantSlug}/Pipelineview/${selectedDeal._id}`);
        setTimeout(() => setSelectedDeal(null), 100);
      } 
      else if (action === "Convert to Won") {
        setLoading(true);
        try {
          const token = localStorage.getItem("token");
          
          const response = await axios.patch(
            `${API_URL}/deals/update-deal/${selectedDeal._id}`, 
            { stage: "Closed Won" }, 
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          if (response.status === 200 || response.status === 201) {
            toast.success("Deal marked as Won successfully!");
            await fetchData();
            setModalState(prev => ({ ...prev, stage: false }));
          }
        } catch (error) {
          console.error("Error converting deal to Won:", error);
          toast.warning("Deal may have been updated. Refreshing data...");
          await fetchData();
          
          const updatedDeal = deals.find(d => d._id === selectedDeal._id);
          if (updatedDeal?.stage === "Closed Won") {
            toast.success("Deal was successfully marked as Won!");
            setModalState(prev => ({ ...prev, stage: false }));
          } else {
            toast.error("Failed to mark deal as Won");
          }
        } finally {
          setLoading(false);
        }
      } 
      else if (action === "View in CLV Dashboard") {
        if (selectedDeal.companyName) {
          navigate(`/${tenantSlug}/cltv/client/${encodeURIComponent(selectedDeal.companyName)}`);
        } else {
          navigate(`/${tenantSlug}/cltv/dashboard`);
        }
        setModalState(prev => ({ ...prev, stage: false }));
      }
    } catch (error) {
      console.error("Error handling stage action:", error);
      toast.error("Failed to process action");
    } finally {
      setLoading(false);
    }
  }, [selectedDeal, navigate, tenantSlug, API_URL, fetchData, deals]);

  const handleFollowUpSave = useCallback(async (followUpData) => {
    if (!selectedDeal) { 
      toast.error("No deal selected"); 
      return; 
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const followUpHistory = [
        ...(selectedDeal.followUpHistory || []),
        { 
          date: new Date().toISOString(), 
          followUpDate: followUpData.followUpDate, 
          followUpComment: followUpData.followUpComment, 
          followUpType: followUpData.followUpType, 
          outcome: "Scheduled", 
          changedBy: { _id: userId } 
        }
      ];
      await axios.patch(`${API_URL}/deals/update-deal/${selectedDeal._id}`, {
        followUpDate: followUpData.followUpDate,
        followUpComment: followUpData.followUpComment,
        followUpType: followUpData.followUpType,
        followUpHistory
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Follow-up scheduled successfully!");
      setModalState(prev => ({ ...prev, followUp: false }));
      fetchData();
    } catch (error) {
      console.error("Error saving follow-up:", error);
      toast.error("Failed to save follow-up");
    } finally {
      setLoading(false);
    }
  }, [selectedDeal, userId, API_URL, fetchData]);

  const handleLossAnalysis = useCallback(async (analysis) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`${API_URL}/deals/update-deal/${analysis.dealId}`, {
        lossReason: analysis.lossReason,
        lossNotes: analysis.notes,
        competitor: analysis.competitor
      }, { headers: { Authorization: `Bearer ${token}` } });
      setModalState(prev => ({ ...prev, loss: false }));
      fetchData();
    } catch (error) {
      console.error("Error saving loss analysis:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [API_URL, fetchData]);

  const handleOpenModal = useCallback((deal, modalType) => {
    setSelectedDeal(deal);
    setTimeout(() => setModalState(prev => ({ ...prev, [modalType]: true })), 50);
  }, []);

  const handleMobileAction = useCallback((deal, actionType) => {
    handleOpenModal(deal, actionType);
  }, [handleOpenModal]);

  const canExport = userRole === "Admin" || userRole === "Manager";
  const canCreateDeal = userRole === "Admin";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Brain className="text-indigo-600 animate-pulse" size={24} />
            </div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">Loading Deal Intelligence...</p>
          <p className="text-sm text-gray-500 mt-1">Analyzing pipeline stages</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <ToastContainer position="top-right" autoClose={3000} />

      <NotificationsPanel deals={deals} isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
      <MetricsModal deals={deals} isOpen={showMetrics} onClose={() => setShowMetrics(false)} />
      <StageActionModal 
        isOpen={modalState.stage} 
        onClose={() => setModalState(prev => ({ ...prev, stage: false }))} 
        deal={selectedDeal} 
        onAction={handleStageAction}
        navigate={navigate}
      />
      <FollowUpModal 
        isOpen={modalState.followUp} 
        onClose={() => setModalState(prev => ({ ...prev, followUp: false }))} 
        deal={selectedDeal} 
        onSave={handleFollowUpSave} 
      />
      <LossAnalysisModal 
        isOpen={modalState.loss} 
        onClose={() => setModalState(prev => ({ ...prev, loss: false }))} 
        deal={selectedDeal} 
        onSubmit={handleLossAnalysis} 
      />

      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg flex-shrink-0">
                <Brain size={24} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 break-words">Deal Analysis & Intelligence</h1>
                <p className="text-sm text-gray-600 mt-1 break-words">AI-powered pipeline management with stage-based actions</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
            <button onClick={() => setShowNotifications(true)} 
              className="relative p-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors">
              <Bell size={20} />
              {deals.filter(d => d.daysSinceUpdate > 7 && d.stage !== 'Closed Won' && d.stage !== 'Closed Lost').length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white"></span>
              )}
            </button>
            <button onClick={() => setShowMetrics(true)} 
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
              <PieChart size={16} /> Show Metrics
            </button>
            <ScoreConfiguration onSave={setScoreWeights} />
            {canExport && (
              <button onClick={() => exportData(processedDeals)} 
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-sm">
                <Download size={16} /> Export All
              </button>
            )}
          </div>
        </div>

        
       {/* Pipeline Stage Dashboard */}
{showStageIntelligence && (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8 pb-4">
    {[
      { stage: 'Qualification', label: 'Need Attention', sub: 'Qualification', count: pipelineInsights.qualificationDeals, color: 'amber', icon: HelpCircle },
      { stage: 'Proposal', label: 'Follow-up Needed', sub: 'Proposal', count: pipelineInsights.proposalDeals, color: 'blue', icon: Send },
      { stage: 'Invoice', label: 'Payment Pending', sub: 'Invoice', count: pipelineInsights.invoiceDeals, color: 'purple', icon: FileText },
      { stage: 'Won', label: 'Converted', sub: 'Deal Closed', count: pipelineInsights.wonDeals, color: 'emerald', icon: CheckCircle },
      { stage: 'Lost', label: 'Analysis needed', sub: 'Deal Lost', count: pipelineInsights.lostDeals, color: 'rose', icon: XCircle }
    ].map(({ stage, label, sub, count, color, icon: Icon }) => (
      <div
        key={stage}
        className={`relative bg-gradient-to-br from-${color}-50 to-white rounded-2xl border border-${color}-200 p-5 shadow-lg hover:shadow-xl transition-all cursor-pointer`}
        onClick={() => handleStageFilter(stage)}
        onMouseEnter={() => {
          setHoveredStage(stage);
          setShowStagePopup(true);
        }}
        onMouseLeave={() => {
          setHoveredStage(null);
          setShowStagePopup(false);
        }}
      >
        {/* Card Content */}
        <div className="flex items-start justify-between flex-wrap gap-2">
          
          {/* Left Section */}
          <div className="flex items-start gap-3 min-w-0">
            <div className={`p-2.5 bg-${color}-100 rounded-xl flex-shrink-0`}>
              <Icon size={18} className={`text-${color}-600`} />
            </div>

            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 break-words leading-tight">
                {label}
              </h3>
              <p className={`text-xs text-${color}-600`}>{sub}</p>
            </div>
          </div>

          {/* Count */}
          <div className={`text-xl sm:text-2xl font-bold text-${color}-700`}>
            {count}
          </div>
        </div>

        {/* Popup */}
        {showStagePopup && hoveredStage === stage && (
          <StageCardPopup
            stage={stage}
            deals={deals}
            onClose={() => setShowStagePopup(false)}
            onFilterClick={handleStageFilter}
          />
        )}
      </div>
    ))}
  </div>
)}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Deal Details Table */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              {/* Table Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Deal Details</h2>
                    <p className="text-sm text-gray-600 mt-1">{processedDeals.length} deals • AI-powered scoring</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
                      <Filter size={16} className="text-gray-500" />
                      <select value={stageFilter} 
                        onChange={(e) => { setStageFilter(e.target.value); setCurrentPage(1); }} 
                        className="bg-transparent border-none outline-none text-sm font-medium text-gray-700">
                        <option value="all">All Stages</option>
                        <option value="Qualification"> Qualification ({pipelineInsights.qualificationDeals})</option>
                        <option value="Proposal Sent-Negotiation"> Proposal ({pipelineInsights.proposalDeals})</option>
                        <option value="Invoice Sent"> Invoice ({pipelineInsights.invoiceDeals})</option>
                        <option value="Closed Won"> Deal Closed ({pipelineInsights.wonDeals})</option>
                        <option value="Closed Lost"> Deal Lost ({pipelineInsights.lostDeals})</option>
                      </select>
                    </div>
                    <button onClick={() => { setSortByScore(sortByScore === "desc" ? "asc" : "desc"); setCurrentPage(1); }} 
                      className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
                      {sortByScore === "desc" ? <SortDesc size={16} /> : <SortAsc size={16} />} 
                      Score: {sortByScore === "desc" ? "High to Low" : "Low to High"}
                    </button>
                  </div>
                </div>
                {/* Search Bar */}
                <div className="mt-4 relative">
                  <input 
                    className="w-full border border-gray-300 bg-white pl-10 pr-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all" 
                    placeholder="Search deals by name, company, or assignee…" 
                    value={query} 
                    onChange={(e) => { setQuery(e.target.value); setCurrentPage(1); }} 
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Mobile Deal View */}
              <div className="block lg:hidden p-4">
                {currentDeals.length > 0 ? (
                  currentDeals.map(deal => (
                    <MobileDealView key={deal._id} deal={deal} onAction={handleMobileAction} navigate={navigate} />
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500">No deals found matching your criteria</div>
                )}
              </div>

              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Deal Details</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Stage & Activity</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Score</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {currentDeals.length > 0 ? (
                      currentDeals.map((deal) => {
                        const stageConfig = STAGE_ACTIONS[deal.stage] || STAGE_ACTIONS["Qualification"];
                        const StageIcon = stageConfig.icon;
                        return (
                          <tr key={deal._id} className="hover:bg-gray-50 transition-colors cursor-pointer group" 
                            onClick={() => navigate(`/Pipelineview/${deal._id}`)}>
                            <td className="px-6 py-4">
                              <div>
                                <div className="font-semibold text-gray-900">{deal.dealName}</div>
                                <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                                  <Building size={12} className="text-gray-400" />
                                  <span>{deal.companyName || "No company"}</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                  <DollarSign size={10} />
                                  {formatCurrencyValue(deal.value) || "No value"}
                                </div>
                                {deal.preferredCurrency === userCurrency && deal.preferredCurrencyValue != null && (
                                  <div className="text-xs text-gray-400 mt-1">
                                    {userCurrencySymbol} {Number(deal.preferredCurrencyValue).toLocaleString("en-IN")}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <div className="font-medium text-gray-900">
                                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                                    deal.stage === "Closed Won" ? "bg-emerald-100 text-emerald-800" :
                                    deal.stage === "Closed Lost" ? "bg-rose-100 text-rose-800" :
                                    deal.stage === "Qualification" ? "bg-amber-100 text-amber-800" :
                                    deal.stage === "Proposal Sent-Negotiation" ? "bg-blue-100 text-blue-800" :
                                    deal.stage === "Invoice Sent" ? "bg-purple-100 text-purple-800" :
                                    "bg-gray-100 text-gray-800"
                                  }`}>{deal.stage === "Closed Won" ? "Deal Closed" : deal.stage === "Closed Lost" ? "Deal Lost" : deal.stage?.replace('-', ' ') || "No stage"}</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                  <Clock size={10} />
                                  Updated {deal.daysSinceUpdate === 0 ? "today" : deal.daysSinceUpdate === 1 ? "1 day ago" : `${deal.daysSinceUpdate} days ago`}
                                </div>
                                <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                  <User size={10} />
                                  {deal.assignedTo ? `${deal.assignedTo.firstName || ''} ${deal.assignedTo.lastName || ''}`.trim() : "Unassigned"}
                                </div>
                                {deal.followUpDate && (
                                  <div className="text-xs text-purple-600 flex items-center gap-1 mt-1">
                                    <Calendar size={10} />
                                    Follow-up: {new Date(deal.followUpDate).toLocaleDateString()}
                                  </div>
                                )}
                                {deal.scoringFactors?.length > 0 && (
                                  <div className="mt-2">
                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                      <Award size={10} />
                                      {deal.scoringFactors.length} factor{deal.scoringFactors.length > 1 ? 's' : ''}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-2xl font-bold text-gray-900">{deal.stageScore || 0}</div>
                              <div className="text-xs text-gray-500">/100</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-2">
                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${stageConfig.bgColor} border ${stageConfig.borderColor}`}>
                                  <StageIcon size={14} className={stageConfig.color} />
                                  <span className={`text-sm font-bold ${stageConfig.color}`}>{stageConfig.label}</span>
                                </div>
                                {deal.stage === "Closed Won" ? (
                                  <button onClick={(e) => { e.stopPropagation(); handleOpenModal(deal, 'stage'); }} 
                                    className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 font-medium mt-2">
                                    <BarChart size={12} /> View in CLV
                                  </button>
                                ) : deal.stage !== "Closed Won" && deal.stage !== "Closed Lost" ? (
                                  <button onClick={(e) => { e.stopPropagation(); handleOpenModal(deal, 'stage'); }} 
                                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium mt-2">
                                    <Target size={12} /> Next Best Action
                                  </button>
                                ) : null}
                                {deal.stage === "Closed Lost" && (
                                  <button onClick={(e) => { e.stopPropagation(); handleOpenModal(deal, 'loss'); }} 
                                    className={`flex items-center gap-1 text-xs font-medium mt-2 ${
                                      deal.hasLossAnalysis ? "text-green-600 hover:text-green-800" : "text-rose-600 hover:text-rose-800"
                                    }`}>
                                    {deal.hasLossAnalysis ? (
                                      <><CheckCircle size={12} /> View Analysis</>
                                    ) : (
                                      <><AlertTriangle size={12} /> Enter Analysis</>
                                    )}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="4" className="px-6 py-12 text-center">
                          <div className="text-gray-500">No deals found matching your criteria</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {processedDeals.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-gray-600">
                      Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, processedDeals.length)} of {processedDeals.length} deals
                    </div>
                    <Pagination 
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={paginate}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Pipeline Stats Card */}
            <div className="mt-8 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 p-6 shadow-lg space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <BarChart3 size={18} className="text-indigo-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Pipeline Statistics</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Average Score</span>
                    <span className="font-bold text-gray-900">{pipelineInsights.avgStageScore}/100</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full">
                    <div className="h-full rounded-full bg-indigo-500 transition-all duration-500" 
                      style={{ width: `${pipelineInsights.avgStageScore}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-amber-50 rounded-lg">
                    <div className="text-xl font-bold text-amber-700">{pipelineInsights.qualificationDeals}</div>
                    <div className="text-xs text-gray-600">Qualification</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-xl font-bold text-blue-700">{pipelineInsights.proposalDeals}</div>
                    <div className="text-xs text-gray-600">Proposal</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-xl font-bold text-purple-700">{pipelineInsights.invoiceDeals}</div>
                    <div className="text-xs text-gray-600">Invoice</div>
                  </div>
                  <div className="text-center p-3 bg-emerald-50 rounded-lg">
                    <div className="text-xl font-bold text-emerald-700">{pipelineInsights.wonDeals}</div>
                    <div className="text-xs text-gray-600">Won</div>
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Active Deals</span>
                    <span className="font-bold text-gray-900">{pipelineInsights.activeDeals}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-600">Unassigned</span>
                    <span className="font-bold text-rose-600">{pipelineInsights.unassignedDeals}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-600">Total Pipeline Value</span>
                    <span className="font-bold text-gray-900">₹{(pipelineInsights.totalValue / 100000).toFixed(1)}L</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Cards */}
          <div className="space-y-6">

            {/* Quick Actions Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Sparkles size={18} className="text-indigo-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Quick Actions</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {canCreateDeal && (
                  <button onClick={() => navigate(`/${tenantSlug}/createDeal`)} 
                    className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-xl hover:border-indigo-300 transition-colors">
                    <div className="flex flex-col items-center text-center">
                      <Plus size={20} className="text-indigo-600 mb-2" />
                      <span className="text-sm font-medium text-gray-900">New Deal</span>
                    </div>
                  </button>
                )}
                <button onClick={() => { setStageFilter("Qualification"); setCurrentPage(1); }} 
                  className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl hover:border-amber-300 transition-colors">
                  <div className="flex flex-col items-center text-center">
                    <HelpCircle size={20} className="text-amber-600 mb-2" />
                    <span className="text-sm font-medium text-gray-900">Qualification</span>
                  </div>
                </button>
                <button onClick={() => { setStageFilter("Proposal Sent-Negotiation"); setCurrentPage(1); }} 
                  className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl hover:border-blue-300 transition-colors">
                  <div className="flex flex-col items-center text-center">
                    <Send size={20} className="text-blue-600 mb-2" />
                    <span className="text-sm font-medium text-gray-900">Proposals</span>
                  </div>
                </button>
                <button onClick={() => { setStageFilter("Invoice Sent"); setCurrentPage(1); }} 
                  className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl hover:border-purple-300 transition-colors">
                  <div className="flex flex-col items-center text-center">
                    <FileText size={20} className="text-purple-600 mb-2" />
                    <span className="text-sm font-medium text-gray-900">Invoices</span>
                  </div>
                </button>
                {canExport && (
                  <button onClick={() => exportData(processedDeals)} 
                    className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
                    <div className="flex flex-col items-center text-center">
                      <Download size={20} className="text-gray-600 mb-2" />
                      <span className="text-sm font-medium text-gray-900">Export</span>
                    </div>
                  </button>
                )}
              </div>
            </div>
            

            {/* Lost Deals Card */}
            <div className="bg-gradient-to-br from-rose-50 to-white rounded-2xl border border-rose-200 p-6 shadow-lg">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-3 bg-rose-100 rounded-xl">
                  <XCircle size={20} className="text-rose-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Deal Lost</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {pipelineInsights.lostDeals} {pipelineInsights.lostDeals === 1 ? 'deal lost' : 'deals lost'}
                  </p>
                </div>
              </div>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {deals.filter(deal => deal.stage === "Closed Lost").slice(0, 5).map(deal => (
                  <div key={deal._id} className="p-3 bg-white rounded-lg border border-rose-100 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-rose-700 font-medium truncate">{deal.dealName}</span>
                          {deal.hasLossAnalysis && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full whitespace-nowrap">Analyzed</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <User size={10} className="text-rose-500" />
                          <span className="text-xs text-rose-600 truncate">
                            {deal.assignedTo ? `${deal.assignedTo.firstName || ''} ${deal.assignedTo.lastName || ''}`.trim() : 'Unassigned'}
                          </span>
                        </div>
                        {deal.lossReason && (
                          <div className="text-xs text-gray-500 mt-1">Reason: {deal.lossReason}</div>
                        )}
                      </div>
                      <button onClick={() => handleOpenModal(deal, 'loss')} 
                        className={`ml-2 px-2 py-1 text-xs font-medium rounded-lg ${
                          deal.hasLossAnalysis ? "text-green-600 hover:bg-green-50" : "text-rose-600 hover:bg-rose-50"
                        }`}>
                        {deal.hasLossAnalysis ? "View" : "Analyze"}
                      </button>
                    </div>
                  </div>
                ))}
                {pipelineInsights.lostDeals === 0 && (
                  <p className="text-sm text-rose-500 italic">No deal lost found</p>
                )}
              </div>
              <button onClick={() => { setStageFilter("Closed Lost"); setCurrentPage(1); }} 
                className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-rose-600 to-rose-700 text-white font-medium rounded-xl hover:from-rose-700 hover:to-rose-800 transition-all">
                View All Deal Lost ({pipelineInsights.lostDeals})
              </button>
            </div>

            {/* Won Deals Card */}
            <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl border border-emerald-200 p-6 shadow-lg">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <CheckCircle size={20} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Deal Closed</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {pipelineInsights.wonDeals} {pipelineInsights.wonDeals === 1 ? 'deal closed' : 'deals closed'}
                  </p>
                </div>
              </div>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {deals.filter(deal => deal.stage === "Closed Won").slice(0, 5).map(deal => (
                  <div key={deal._id} className="p-3 bg-white rounded-lg border border-emerald-100 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-700 font-medium truncate">{deal.dealName}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <User size={10} className="text-emerald-500" />
                          <span className="text-xs text-emerald-600 truncate">
                            {deal.assignedTo ? `${deal.assignedTo.firstName || ''} ${deal.assignedTo.lastName || ''}`.trim() : 'Unassigned'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Value: {formatCurrencyValue(deal.value)}</div>
                        {deal.preferredCurrency === userCurrency && deal.preferredCurrencyValue != null && (
                          <div className="text-xs text-gray-400 mt-1">
                            {userCurrencySymbol} {Number(deal.preferredCurrencyValue).toLocaleString("en-IN")}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          if (deal.companyName && deal.stage === "Closed Won") {
                            navigate(`/${tenantSlug}/cltv/client/${encodeURIComponent(deal.companyName)}`);
                          } else {
                            navigate(`/${tenantSlug}/cltv/dashboard`, { replace: true });
                          }
                        }} 
                        className="ml-2 px-3 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                      >
                        View in CLV
                      </button>
                    </div>
                  </div>
                ))}
                {pipelineInsights.wonDeals === 0 && (
                  <p className="text-sm text-emerald-500 italic">No deal closed found</p>
                )}
              </div>
              <button onClick={() => { setStageFilter("Closed Won"); setCurrentPage(1); }} 
                className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-medium rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all">
                View All Deal Closed ({pipelineInsights.wonDeals})
              </button>
            </div>

            <AIPredictions deals={deals} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default DealIntelligenceDashboard;