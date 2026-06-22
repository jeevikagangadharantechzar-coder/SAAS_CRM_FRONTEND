import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Crown, Flame } from "lucide-react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

// ── Won deal helper ───────────────────────────────────────────────────────────
const isWonDeal = (s = "") => {
  const l = s.toLowerCase();
  return l.includes("won") || l.includes("closed won") || l.includes("win");
};

// ── Animated background bubbles ───────────────────────────────────────────────
const CardBubbles = ({ seed = 0, count = 12, colorPalette = ["#F59E0B", "#FBBF24", "#FCD34D"] }) => {
  const arr = Array.from({ length: count });
  return (
    <div className="absolute inset-0 pointer-events-none -z-0 overflow-hidden">
      {arr.map((_, i) => {
        const size     = 6 + ((i + seed) % 8) * 8;
        const top      = `${(i * 19 + seed * 13) % 100}%`;
        const left     = `${(i * 23 + seed * 7)  % 100}%`;
        const delay    = (i % 4) * 0.4;
        const duration = 6 + (i % 5);
        const opacity  = 0.05 + (i % 3) * 0.08;
        const color    = colorPalette[(i + seed) % colorPalette.length] + "44";
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              y:       [-10, 10, -10],
              opacity: [0, opacity, 0],
              x:       [0, i % 2 === 0 ? 8 : -8, 0],
              scale:   [0.8, 1.2, 0.8],
              rotate:  [0, 180, 360],
            }}
            transition={{ repeat: Infinity, duration, delay, ease: "easeInOut" }}
            style={{
              position: "absolute",
              width: size, height: size,
              top, left,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${color}, transparent)`,
              filter: "blur(3px)",
            }}
          />
        );
      })}
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────
// Props:
//   loading      – boolean passed from AdminDashboard while it is fetching
//   deals        – deal array from dashboard (used as fallback)
//   leads        – lead array from dashboard (used as fallback)
//   startDate    – ISO date string from dashboard's active filter  e.g. "2026-04-01"
//   endDate      – ISO date string from dashboard's active filter  e.g. "2026-04-30"
const StreakLeaderboard = ({ loading: externalLoading, deals = [], leads = [], startDate, endDate }) => {
  const [topPerformer, setTopPerformer] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [isAdmin, setIsAdmin]           = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;
  const token   = localStorage.getItem("token");
  const navigate = useNavigate();

  // ── Bootstrap user role ───────────────────────────────────────────────────
  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const role = userData?.role?.name || userData?.role || "User";
      setIsAdmin(role === "Admin");
    } catch (e) {
      console.error("Error getting user data:", e);
    }
  }, []);

  // ── Compute top performer from dashboard deals + leads (fallback) ─────────
  const computeFallback = useCallback(() => {
    if (deals.length === 0 && leads.length === 0) return null;

    const perfMap = {};

    leads.forEach((lead) => {
      const p = lead.assignTo;
      if (!p) return;
      const id   = p._id?.toString() || p.toString();
      const name = p.firstName ? `${p.firstName} ${p.lastName || ""}`.trim() : id;
      if (!perfMap[id]) {
        perfMap[id] = { id, name, email: p.email || "", totalLeads: 0, convertedLeads: 0, streak: 0, productiveDays: 0, workHours: "—" };
      }
      perfMap[id].totalLeads += 1;
    });

    deals.forEach((deal) => {
      const p = deal.assignedTo;
      if (!p) return;
      const id   = p._id?.toString() || p.toString();
      const name = p.firstName ? `${p.firstName} ${p.lastName || ""}`.trim() : id;
      if (!perfMap[id]) {
        perfMap[id] = { id, name, email: p.email || "", totalLeads: 0, convertedLeads: 0, streak: 0, productiveDays: 0, workHours: "—" };
      }
      if (isWonDeal(deal.stage)) perfMap[id].convertedLeads += 1;
      perfMap[id].totalLeads += 1;
    });

    const sorted = Object.values(perfMap)
      .filter((p) => p.totalLeads > 0)
      .map((p) => ({
        ...p,
        conversionRate:    p.totalLeads > 0 ? (p.convertedLeads / p.totalLeads) * 100 : 0,
        conversionDisplay: `${p.totalLeads > 0 ? ((p.convertedLeads / p.totalLeads) * 100).toFixed(1) : 0}%`,
      }))
      .sort((a, b) => b.convertedLeads - a.convertedLeads || b.conversionRate - a.conversionRate);

    return sorted[0] || null;
  }, [deals, leads]);

  // ── Step 1: Show fallback immediately when dashboard data arrives ──────────
  useEffect(() => {
    if (deals.length > 0 || leads.length > 0) {
      const fallback = computeFallback();
      if (fallback) {
        setTopPerformer(fallback);
        setLoading(false);
      }
    }
  }, [deals, leads, computeFallback]);

  // ── Step 2: Fetch real data from backend using dashboard's date range ──────
  //    Re-runs whenever startDate or endDate changes (i.e. dashboard filter changes)
  const fetchTopPerformer = useCallback(async () => {
    if (!token) return;
    try {
      // Use the dates passed from AdminDashboard — these already reflect the
      // active preset (today / 7days / month / year) so no internal date
      // calculation is needed here.
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate)   params.endDate   = endDate;

      const { data } = await axios.get(`${API_URL}/streak/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      const rows = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
      const top  = rows[0] || null;
      if (top) setTopPerformer(top);
    } catch {
      // backend unavailable — fallback already showing from deals/leads props
    } finally {
      setLoading(false);
    }
  }, [API_URL, token, startDate, endDate]);   // ← re-runs when dashboard filter changes

  // Re-fetch whenever the dashboard's resolved date range changes
  useEffect(() => {
    if (startDate || endDate) {
      fetchTopPerformer();
    }
  }, [startDate, endDate, fetchTopPerformer]);

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading || externalLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm h-full">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onClick={() => navigate("/leaderboard")}
      className="h-full cursor-pointer transition-all duration-300"
    >
      <Card className="shadow-lg border-0 overflow-hidden relative bg-gradient-to-br from-yellow-50/60 to-amber-50/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300 h-full">
        <CardBubbles seed={7} count={6} colorPalette={["#F59E0B", "#FBBF24", "#FCD34D"]} />

        {/* Header */}
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-md">
                <Crown className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-gray-800">
                {isAdmin ? "Top Performer" : "📊 My Performance"}
              </span>
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {topPerformer ? (
            <div className="relative">
              {/* Crown badge */}
              <div className="absolute -top-2 -right-2 z-10">
                <div className="relative">
                  <div className="absolute inset-0 animate-ping">
                    <div className="w-10 h-10 bg-yellow-400 rounded-full opacity-30"></div>
                  </div>
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                    <span className="text-lg">👑</span>
                  </div>
                </div>
              </div>

              {/* Performer info */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                    <span className="text-xl font-bold text-white">#1</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-gray-900 truncate">
                    {topPerformer.name}
                  </h3>
                  <p className="text-xs text-gray-500 truncate">{topPerformer.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1 text-yellow-600 text-xs">
                      <Zap className="w-3 h-3" />
                      {topPerformer.conversionRate?.toFixed(1)}%
                    </div>
                    <div className="flex items-center gap-1 text-gray-500 text-xs">
                      <Flame className="w-3 h-3" />
                      {topPerformer.streak ?? 0}d
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-2 border border-orange-100">
                  <p className="text-xs text-gray-600 mb-1">Conversion</p>
                  <p className="text-lg font-bold text-orange-600">
                    {topPerformer.conversionDisplay ?? `${topPerformer.conversionRate?.toFixed(1)}%`}
                  </p>
                  {/* <p className="text-xs text-gray-500">
                    {topPerformer.convertedLeads ?? 0}/{topPerformer.totalLeads ?? 0}
                  </p> */}
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-2 border border-blue-100">
                  <p className="text-xs text-gray-600 mb-1">Active Days</p>
                  <p className="text-lg font-bold text-blue-600">
                    {topPerformer.productiveDays ?? 0}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {topPerformer.workHours && topPerformer.workHours !== "—"
                      ? topPerformer.workHours.split(" - ")[0]
                      : "—"}
                  </p>
                </div>
              </div>

              {/* Performance bar */}
              <div>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Performance</span>
                  <span className="font-bold text-orange-600">
                    {topPerformer.conversionRate?.toFixed(1)}%
                  </span>
                </div>
                <div className="h-1.5 bg-orange-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-400 via-orange-500 to-amber-500 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(topPerformer.conversionRate ?? 0, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* No data state */
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Crown className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-2">No Top Performer</p>
              <button
                onClick={e => { e.stopPropagation(); fetchTopPerformer(); }}
                className="px-3 py-1.5 text-xs bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
              >
                Refresh
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default StreakLeaderboard;