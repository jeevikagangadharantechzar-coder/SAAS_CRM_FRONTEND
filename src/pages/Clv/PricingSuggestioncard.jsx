import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { TrendingUp, AlertTriangle, DollarSign, Percent, X, CheckCircle } from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";

const API_URL = import.meta.env.VITE_API_URL;

const PricingSuggestionCard = ({ dealValue, onClose }) => {
  const { companyName } = useParams();
  const [pricingData, setPricingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clientData, setClientData] = useState(null);

  useEffect(() => {
    if (companyName) {
      fetchClientData();
    } else {
      setError("No company name provided");
      setLoading(false);
    }
  }, [companyName]);

/* ── Fetch Client Data Function ─────────────────────── */
  const fetchClientData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const decodedName = decodeURIComponent(companyName);
      
      console.log("Fetching client data for:", decodedName);

      // Fetch client data first
      const clientResponse = await axios.get(
        `${API_URL}/cltv/client/${encodeURIComponent(decodedName)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (clientResponse.data.success) {
        setClientData(clientResponse.data.data.client);
        // Try to fetch pricing recommendation
        await fetchPricingRecommendation(decodedName, token);
      } else {
        // Client not found - use fallback
        calculateFallbackPricing();
      }
    } catch (err) {
      console.error("Error fetching client data:", err);
      
      if (err.response?.status === 404) {
        // Client not in CLV yet - use fallback
        calculateFallbackPricing();
      } else {
        // Other error - still use fallback but show a note
        calculateFallbackPricing();
        setError("Using value-based pricing (client data unavailable)");
      }
    }
  };

/* ── Fetch Pricing Recommendation Function ─────────────────────── */
  const fetchPricingRecommendation = async (name, token) => {
    try {
      const response = await axios.get(
        `${API_URL}/cltv/pricing-recommendation/${encodeURIComponent(name)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setPricingData(response.data.data);
      } else {
        // If pricing endpoint returns error but client exists, calculate locally
        calculateSmartPricing();
      }
    } catch (err) {
      console.error("Pricing endpoint error:", err);
      // If pricing endpoint fails, calculate locally
      calculateSmartPricing();
    } finally {
      setLoading(false);
    }
  };


  // Simple fallback based only on deal value
  const calculateFallbackPricing = () => {
    const numericValue = parseDealValue(dealValue);
    
    let baseDiscount = 10;
    let confidenceScore = 60;
    let pricingStrategy = "Standard pricing based on deal value";
    
    if (numericValue > 500000) {
      baseDiscount = 8;
      confidenceScore = 70;
      pricingStrategy = "High-value deal - moderate discount";
    } else if (numericValue > 100000) {
      baseDiscount = 12;
      confidenceScore = 65;
      pricingStrategy = "Medium-value deal - standard discount";
    } else {
      baseDiscount = 15;
      confidenceScore = 60;
      pricingStrategy = "Low-value deal - higher discount to close";
    }
    
    const minPrice = Math.round(numericValue * (1 - baseDiscount / 100));
    const maxPrice = Math.round(numericValue * 1.1);
    
    setPricingData({
      suggestedMinPrice: minPrice,
      suggestedMaxPrice: maxPrice,
      recommendedDiscount: baseDiscount,
      confidenceScore,
      deliveryBonus: 0,
      strategy: pricingStrategy,
      classification: "Not yet classified"
    });
    setLoading(false);
  };

  // Smart pricing based on classification and metrics
  const calculateSmartPricing = () => {
    const numericValue = parseDealValue(dealValue);
    
    const classification = clientData?.classification;
    const healthScore = clientData?.clientHealthScore || 50;
    const daysInactive = clientData?.daysSinceFollowUp || 0;
    const supportTickets = clientData?.totalSupportTickets || 0;
    const progress = clientData?.progress || "Average";
    
    let baseDiscount = 10;
    let confidenceScore = 70;
    let pricingStrategy = "";
    
    if (classification === "Upsell") {
      baseDiscount = 5;
      confidenceScore = 90;
      pricingStrategy = "Upsell opportunity - minimal discount to preserve value";
    } else if (classification === "Top Value") {
      baseDiscount = 8;
      confidenceScore = 85;
      pricingStrategy = "Top value client - moderate discount to maintain relationship";
    } else if (classification === "At Risk") {
      baseDiscount = 15;
      confidenceScore = 75;
      pricingStrategy = "At risk - aggressive discount to prevent churn";
    } else if (classification === "Dormant") {
      baseDiscount = 20;
      confidenceScore = 70;
      pricingStrategy = "Dormant - strategic reactivation pricing";
    } else {
      // Value-based fallback
      if (numericValue > 500000) {
        baseDiscount = 8;
        pricingStrategy = "High-value deal - moderate discount";
      } else if (numericValue > 100000) {
        baseDiscount = 12;
        pricingStrategy = "Medium-value deal - standard discount";
      } else {
        baseDiscount = 15;
        pricingStrategy = "Low-value deal - higher discount to close";
      }
      confidenceScore = 65;
    }
    
    // Adjust based on metrics
    if (healthScore > 80) baseDiscount -= 2;
    else if (healthScore < 50) baseDiscount += 3;
    
    if (daysInactive > 90) baseDiscount += 5;
    else if (daysInactive > 60) baseDiscount += 3;
    else if (daysInactive > 30) baseDiscount += 1;
    
    if (supportTickets > 10) baseDiscount += 5;
    else if (supportTickets > 5) baseDiscount += 2;
    
    if (progress === "Excellent") baseDiscount -= 3;
    else if (progress === "Poor") baseDiscount += 5;
    
    baseDiscount = Math.min(Math.max(baseDiscount, 0), 30);
    
    const minPrice = Math.round(numericValue * (1 - baseDiscount / 100));
    const maxPrice = Math.round(numericValue * 1.1);
    
    setPricingData({
      suggestedMinPrice: minPrice,
      suggestedMaxPrice: maxPrice,
      recommendedDiscount: baseDiscount,
      confidenceScore,
      deliveryBonus: 0,
      strategy: pricingStrategy,
      classification: classification || "Not classified"
    });
    setLoading(false);
  };

/* ── Parse Deal Value Function ─────────────────────── */
  const parseDealValue = (value) => {
    if (typeof value === "number") return value;
    if (!value) return 0;
    
    try {
      const cleaned = String(value).replace(/[₹,\s]/g, "");
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    } catch {
      return 0;
    }
  };


/* ── Get Confidence Color Function ─────────────────────── */
  const getConfidenceColor = (score) => {
    if (score >= 80) return "text-green-600 bg-green-100 border-green-200";
    if (score >= 60) return "text-yellow-600 bg-yellow-100 border-yellow-200";
    return "text-red-600 bg-red-100 border-red-200";
  };

/* ── Get Classification Badge Function ─────────────────────── */
  const getClassificationBadge = (classification) => {
    const colors = {
      "Upsell": "bg-purple-100 text-purple-700 border-purple-200",
      "Top Value": "bg-green-100 text-green-700 border-green-200",
      "At Risk": "bg-red-100 text-red-700 border-red-200",
      "Dormant": "bg-gray-100 text-gray-700 border-gray-200"
    };
    return colors[classification] || "bg-blue-100 text-blue-700 border-blue-200";
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!pricingData) return null;

  const numericValue = parseDealValue(dealValue);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl shadow-sm border border-blue-200 p-4 relative">
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
        title="Close"
      >
        <X size={16} />
      </button>

      <div className="flex items-center justify-between mb-3 pr-6">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-blue-500" />
          <h3 className="font-semibold text-gray-800">Smart Pricing Recommendation</h3>
        </div>
        <div className="flex items-center gap-2">
          {pricingData.classification && (
            <span className={`text-xs px-2 py-1 rounded-full border ${getClassificationBadge(pricingData.classification)}`}>
              {pricingData.classification}
            </span>
          )}
          <span className={`text-xs px-2 py-1 rounded-full border ${getConfidenceColor(pricingData.confidenceScore)}`}>
            {pricingData.confidenceScore >= 80 ? 'High' : 
             pricingData.confidenceScore >= 60 ? 'Medium' : 'Low'} Confidence
          </span>
        </div>
      </div>

      {!clientData && (
        <div className="mb-3 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
          <span className="font-medium">Note:</span> Complete a review to see personalized pricing based on client health
        </div>
      )}

      {error && (
        <div className="mb-3 text-xs text-orange-600 bg-orange-50 p-2 rounded-lg">
          <span className="font-medium">Note:</span> {error}
        </div>
      )}

      {pricingData.strategy && (
        <div className="mb-3 text-xs text-gray-600 bg-white/50 p-2 rounded-lg">
          <span className="font-medium">Strategy:</span> {pricingData.strategy}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white/50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-2">Suggested Price Range</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign size={14} className="text-green-500" />
              <div>
                <span className="text-xs text-gray-500">Min:</span>
                <span className="ml-1 text-sm font-semibold">
                  ₹{pricingData.suggestedMinPrice?.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign size={14} className="text-blue-500" />
              <div>
                <span className="text-xs text-gray-500">Max:</span>
                <span className="ml-1 text-sm font-semibold">
                  ₹{pricingData.suggestedMaxPrice?.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Original: ₹{numericValue.toLocaleString()}
          </p>
        </div>

        <div className="bg-white/50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-2">Discount Recommendation</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Percent size={14} className="text-purple-500" />
              <div>
                <span className="text-xs text-gray-500">Max Discount:</span>
                <span className="ml-1 text-sm font-semibold">
                  {pricingData.recommendedDiscount}%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-orange-500" />
              <div>
                <span className="text-xs text-gray-500">Confidence:</span>
                <span className={`ml-1 text-sm font-semibold ${
                  pricingData.confidenceScore >= 80 ? 'text-green-600' :
                  pricingData.confidenceScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {pricingData.confidenceScore}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-200">
        <div className="text-xs text-gray-500">
          Based on {clientData ? "client health metrics" : "deal value"}
        </div>
      </div>
    </div>
  );
};

export default PricingSuggestionCard;