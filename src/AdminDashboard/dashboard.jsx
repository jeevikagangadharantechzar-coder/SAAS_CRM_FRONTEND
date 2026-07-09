import React, { useEffect, useState, useCallback } from "react";
import { useSocket } from "../context/SocketContext";
import { useTranslation } from "react-i18next";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "../components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import { Skeleton } from "../components/ui/skeleton";
import { Badge } from "../components/ui/badge";
import {
  Users, Trophy, FileText, TrendingUp, Globe,
  Receipt, BarChart3, Target, ArrowUpRight, ArrowDownRight, X,
} from "lucide-react";
import axios from "axios";
import { cn } from "../lib/utils";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import StreakLeaderboard from "../pages/StreakLeaderboard";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";


const API_URL = import.meta.env.VITE_API_URL;

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

/* ── Date helpers ─────────────────────────────────────────────────────────── */
const formatDate = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};
const getMonthRange = (month, year) => ({ start: formatDate(new Date(year, month, 1)), end: formatDate(new Date(year, month + 1, 0)) });
const getYearRange = (year) => ({ start: formatDate(new Date(year, 0, 1)), end: formatDate(new Date(year, 11, 31)) });
const getTodayRange = () => { const t = new Date(); return { start: formatDate(t), end: formatDate(t) }; };
const getLast7Range = () => { const e = new Date(); const s = new Date(); s.setDate(e.getDate() - 6); return { start: formatDate(s), end: formatDate(e) }; };

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const BASE_COLORS = ["#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#6366F1", "#EC4899", "#06B6D4"];

/* ── Deal stage helpers (FIX: exact matches to prevent false positives) ────── */
const isOpenDeal = (s = "") => {
  const l = s.toLowerCase().trim();
  return (
    l === "open" ||
    l === "qualification" ||
    l === "proposal sent-negotiation" ||
    l === "negotiation" ||
    l === "invoice sent" ||
    l === "new" ||
    l === "in progress"
  );
};

const isWonDeal = (s = "") => {
  const l = s.toLowerCase().trim();
  return l === "closed won" || l === "won";
};

const isLostDeal = (s = "") => {
  const l = s.toLowerCase().trim();
  return l === "closed lost" || l === "lost";
};

/* ── Currency display ─────────────────────────────────────────────────────── */
const CurrencyDisplay = ({ value, currency = "USD", className }) => {
  const info = allowedCurrencies.find((c) => c.code === currency) || allowedCurrencies[0];
  return (
    <div className={cn("flex items-baseline gap-1", className)}>
      <span className="text-lg font-semibold text-gray-600">{info.symbol}</span>
      <span className="text-2xl font-bold text-gray-900">{Number(value).toLocaleString()}</span>
      <span className="text-sm font-medium text-gray-500 ml-1">{info.code}</span>
    </div>
  );
};

/* ── Summary card ─────────────────────────────────────────────────────────── */
const SummaryCard = ({ title, value, prefix, change, color, icon, loading, onClick }) => {
  const { t } = useTranslation();

  if (loading) return (
    <Card className="border-0 shadow-lg bg-white/80">
      <CardContent className="p-5">
        <Skeleton className="h-5 w-20 mb-3" /><Skeleton className="h-8 w-16 mb-2" /><Skeleton className="h-4 w-24" />
      </CardContent>
    </Card>
  );
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 100 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <Card className={cn("border-0 shadow-lg bg-white/80 backdrop-blur-sm overflow-hidden transition-all duration-200 hover:shadow-xl",
        color === "blue" && "bg-blue-50/50",
        color === "green" && "bg-green-50/50",
        color === "purple" && "bg-purple-50/50",
        color === "orange" && "bg-orange-50/50"
      )}>
        <CardContent className="p-5">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
              <div className="text-2xl font-bold text-gray-900">{prefix ? `${prefix} ` : ""}{value?.toLocaleString() ?? 0}</div>
            </div>
            <div className={cn("p-2 rounded-xl",
              color === "blue" && "bg-blue-100 text-blue-600",
              color === "green" && "bg-green-100 text-green-600",
              color === "purple" && "bg-purple-100 text-purple-600",
              color === "orange" && "bg-orange-100 text-orange-600"
            )}>{icon}</div>
          </div>
          <div className="flex items-center">
            {change >= 0
              ? <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
              : <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />}
            <span className={cn("text-sm font-medium", change >= 0 ? "text-green-500" : "text-red-500")}>
              {change >= 0 ? `+${change}%` : `${change}%`}
            </span>
            <span className="text-xs text-gray-500 ml-2">{t("dashboard.cards.vsPrevious")}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

/* ── Currency Breakdown (FIX: scrollable CardContent) ─────────────────────── */
const CurrencyBreakdownCard = ({ revenueData, loading }) => {
  const { t } = useTranslation();

  if (loading) return <Skeleton className="h-64 w-full rounded-lg" />;

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userCurrency = storedUser?.currency || "USD";
  const userSymbol = allowedCurrencies.find((c) => c.code === userCurrency)?.symbol || userCurrency;

  const currencies = Object.entries(revenueData || {})
    .filter(([, d]) => d.amount > 0)
    .map(([currency, d]) => ({
      currency,
      amount: Number(d.amount),
      preferred: Number(d.preferredCurrencyValue || 0),
      count: d.count
    }))
    .sort((a, b) => b.amount - a.amount);

  const totalRevenuePreferred = currencies.reduce((s, c) => s + (c.preferred || 0), 0);

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm flex flex-col">
      <CardHeader className="pb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5 text-purple-600" />
            {t("dashboard.revenueCurrency.title")}
          </CardTitle>
          <Badge variant="secondary">{t("dashboard.revenueCurrency.currenciesBadge", { count: currencies.length })}</Badge>
        </div>
        <div className="mt-4 p-4 bg-white/60 rounded-lg border">
          <div className="text-sm font-medium text-gray-600 mb-1">{t("dashboard.revenueCurrency.totalRevenuePreferred", { currency: userCurrency })}</div>
          <div className="text-2xl font-bold text-gray-900">{userSymbol} {totalRevenuePreferred.toLocaleString()}</div>
        </div>
      </CardHeader>


      <CardContent className="space-y-3 max-h-56 overflow-y-auto pr-2 flex-1">
        {currencies.length > 0 ? currencies.map(({ currency, amount, count, preferred }, idx) => {
          const info = allowedCurrencies.find((c) => c.code === currency);
          return (
            <div key={currency} className="flex items-center justify-between p-3 bg-white/60 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: BASE_COLORS[idx % BASE_COLORS.length] }} />
                <div>
                  <div className="font-semibold text-gray-800 text-sm">{info?.name ?? currency}</div>
                  <div className="text-xs text-gray-500">{info?.code ?? currency}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-gray-900 text-sm">
                  {info?.symbol ?? ""}{amount.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  {userSymbol} {Number(preferred || 0).toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">{count} {t("dashboard.revenueCurrency.invoices")}</div>
              </div>
            </div>
          );
        }) : <div className="text-center py-6 text-gray-500">{t("dashboard.revenueCurrency.noData")}</div>}
      </CardContent>
    </Card>
  );
};

/* ── Pending Invoices (FIX: scrollable CardContent) ───────────────────────── */
const PendingInvoicesCard = ({ invoices, loading }) => {
  const { t } = useTranslation();
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userCurrency = storedUser?.currency || "USD";
  const userSymbol = allowedCurrencies.find((c) => c.code === userCurrency)?.symbol || userCurrency;
  const [currenciesWithPreferred, setCurrenciesWithPreferred] = useState([]);
  const [totalPendingPreferred, setTotalPendingPreferred] = useState(0);

  useEffect(() => {
    const calculatePreferredValues = async () => {
      const pending = (invoices ?? []).filter((inv) => ["pending", "unpaid", "Pending", "Unpaid"].includes(inv.status));
      const byCurrency = {};

      pending.forEach((inv) => {
        const curr = inv.currency || "USD";
        const amt = Number(inv.total ?? inv.amount ?? inv.grandTotal ?? 0);
        if (amt > 0) {
          byCurrency[curr] = byCurrency[curr] || { amount: 0, count: 0 };
          byCurrency[curr].amount += amt;
          byCurrency[curr].count += 1;
        }
      });

      const currencies = Object.entries(byCurrency)
        .filter(([, d]) => d.amount > 0)
        .map(([currency, d]) => ({ currency, amount: d.amount, count: d.count }));

      if (currencies.length === 0) {
        setCurrenciesWithPreferred([]);
        setTotalPendingPreferred(0);
        return;
      }

      const updatedCurrencies = await Promise.all(
        currencies.map(async ({ currency, amount, count }) => {
          let preferredValue = amount;
          if (currency !== userCurrency) {
            try {
              const response = await axios.get(`https://open.er-api.com/v6/latest/${currency}`);
              const rate = response.data?.rates?.[userCurrency] || 1;
              preferredValue = amount * rate;
            } catch (err) {
              console.error(`Error fetching rate for ${currency}:`, err);
              preferredValue = amount;
            }
          }
          return { currency, amount, count, preferred: preferredValue };
        })
      );

      updatedCurrencies.sort((a, b) => b.amount - a.amount);
      setCurrenciesWithPreferred(updatedCurrencies);
      setTotalPendingPreferred(updatedCurrencies.reduce((sum, c) => sum + c.preferred, 0));
    };

    calculatePreferredValues();
  }, [invoices, userCurrency]);

  if (loading) return <Skeleton className="h-64 w-full rounded-lg" />;

  const totalInvoices = currenciesWithPreferred.reduce((s, c) => s + c.count, 0);

  return (
    <Card className="shadow-lg border-0 bg-blue-50/50 backdrop-blur-sm flex flex-col">
      <CardHeader className="pb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5 text-blue-600" />
            {t("dashboard.pendingInvoices.title")}
          </CardTitle>
          <Badge variant="secondary">{t("dashboard.pendingInvoices.invoicesBadge", { count: totalInvoices })}</Badge>
        </div>
        <div className="mt-4 p-4 bg-white/50 rounded-lg border border-blue-200">
          <div className="text-sm font-medium text-gray-600 mb-1">{t("dashboard.pendingInvoices.totalPendingPreferred", { currency: userCurrency })}</div>
          <div className="text-2xl font-bold text-gray-900">{userSymbol} {totalPendingPreferred.toLocaleString()}</div>
        </div>
      </CardHeader>


      <CardContent className="space-y-3 max-h-56 overflow-y-auto pr-2 flex-1">
        {currenciesWithPreferred.length > 0 ? currenciesWithPreferred.map(({ currency, amount, count, preferred }) => {
          const info = allowedCurrencies.find((c) => c.code === currency);
          return (
            <div key={currency} className="flex items-center justify-between p-3 bg-white/50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-gray-800 text-sm">{info?.name ?? currency}</div>
                  <div className="text-xs text-gray-500">{info?.code ?? currency}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-gray-900 text-sm">
                  {info?.symbol ?? ""}{amount.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  {userSymbol} {Number(preferred || 0).toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">{count} {t("dashboard.pendingInvoices.pending")}</div>
              </div>
            </div>
          );
        }) : <div className="text-center py-6 text-gray-500">{t("dashboard.pendingInvoices.noData")}</div>}
      </CardContent>
    </Card>
  );
};

/* ── Revenue Trend ────────────────────────────────────────────────────────── */
const RevenueTrendChart = ({ revenueData, loading, invoices }) => {
  const { t } = useTranslation();
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userCurrency = storedUser?.currency || "USD";
  const userSymbol = allowedCurrencies.find((c) => c.code === userCurrency)?.symbol || userCurrency;

  const chartData = months.map((month, monthIndex) => {
    const entry = { month };

    const monthInvoices = (invoices ?? []).filter(inv => {
      if (!["paid", "Paid", "partially_paid"].includes(inv.status)) return false;
      const date = new Date(inv.paidAt || inv.createdAt);
      return !isNaN(date) && date.getMonth() === monthIndex;
    });

    let total = 0;
    monthInvoices.forEach(inv => {
      // Partially paid invoices only count the amount actually collected so far
      const value = inv.preferredCurrency === userCurrency && inv.preferredCurrencyValue != null
        ? inv.preferredCurrencyValue
        : Number(inv.amountPaid) || Number(inv.total);
      total += value;
    });

    entry.total = total;

    return entry;
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white p-4 rounded-lg shadow-xl border text-sm">
        <p className="font-semibold mb-2">{label}</p>
        {payload.filter((p) => p.value > 0).map((p, i) => (
          <div key={i} className="flex justify-between gap-4">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
              {p.name}
            </span>
            <strong>{userSymbol} {p.value?.toLocaleString()}</strong>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm h-full">
      <CardHeader className="pb-4 border-b">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <CardTitle className="text-xl flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            {t("dashboard.revenueTrend.title")}
          </CardTitle>
        </div>
        <div className="mt-2">
          <p className="text-2xl font-semibold">
            {userSymbol} {chartData.reduce((sum, d) => sum + d.total, 0).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">{t("dashboard.revenueTrend.totalRevenuePreferred", { currency: userCurrency })}</p>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {loading ? <Skeleton className="h-64 w-full" /> : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fill: "#6B7280", fontSize: 12 }} />
                <YAxis
                  tick={{ fill: "#6B7280", fontSize: 12 }}
                  tickFormatter={(v) => `${userSymbol}${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="total"
                  name={t("dashboard.revenueTrend.revenueLabel")}
                  stroke="#8B5CF6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#8B5CF6" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/* ── Sales Pipeline ───────────────────────────────────────────────────────── */
const SalesPipelineChart = ({ pipelineBarData, loading, totalPipelineLeads }) => {
  const { t } = useTranslation();
  // Pinned via tap/click — Recharts' built-in hover tooltip vanishes the
  // instant a touch ends (mobile browsers fire a synthetic mouseleave on
  // release), so touch users need something that stays open until dismissed.
  const [activePoint, setActivePoint] = useState(null); // { label, payload } | null

  const PipelineTooltipBody = ({ label, payload, onClose }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-4 rounded-lg shadow-xl border border-gray-200/80 backdrop-blur-sm min-w-48"
    >
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="text-sm font-semibold text-gray-800">{label}</div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 -m-1 shrink-0">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {payload.map((p, i) => (
        <div key={i} className="text-sm text-gray-600 mt-2 flex items-center justify-between">
          <div className="flex items-center">
            <span style={{ display: "inline-block", width: 10, height: 10, background: p.color, marginRight: 8, borderRadius: "50%" }} />
            {p.name}
          </div>
          <strong className="ml-2">{p.value} {t("dashboard.salesPipeline.deals")}</strong>
        </div>
      ))}
      <div className="mt-3 pt-2 border-t border-gray-200">
        <div className="text-sm font-medium text-gray-700">
          {t("dashboard.salesPipeline.total")}: {payload.reduce((sum, p) => sum + p.value, 0)} {t("dashboard.salesPipeline.deals")}
        </div>
      </div>
    </motion.div>
  );

  const CustomPipelineTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    return <PipelineTooltipBody label={label} payload={payload} />;
  };

  const handleBarTap = (data) => {
    if (!data || !data.activePayload || data.activePayload.length === 0) return;
    setActivePoint((prev) =>
      prev && prev.label === data.activeLabel ? null : { label: data.activeLabel, payload: data.activePayload }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45 }}
      whileHover={{ y: -2 }}
    >
      <Card className="shadow-lg border-0 rounded-xl relative bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
        <CardHeader className="pb-4 border-b border-gray-200/50">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl text-gray-800 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              {t("dashboard.salesPipeline.title")}
            </CardTitle>
            <Badge variant="secondary" className="bg-white/80 backdrop-blur-sm">
              {t("dashboard.salesPipeline.totalDealsBadge", { count: totalPipelineLeads })}
            </Badge>
          </div>
          <CardDescription>
            {t("dashboard.salesPipeline.description")}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 relative">
          {loading ? (
            <div className="h-64">
              <Skeleton className="h-64 w-full rounded-lg" />
            </div>
          ) : (
            <motion.div layout initial={{ opacity: 0.6 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
              {activePoint && (
                <div className="absolute top-4 right-4 sm:right-6 z-20 max-w-[calc(100%-2rem)]">
                  <PipelineTooltipBody
                    label={activePoint.label}
                    payload={activePoint.payload}
                    onClose={() => setActivePoint(null)}
                  />
                </div>
              )}
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={pipelineBarData}
                    margin={{ top: 20, right: 12, left: 0, bottom: 20 }}
                    onClick={handleBarTap}
                  >
                    <defs>
                      <linearGradient id="gOpen" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.2} />
                      </linearGradient>
                      <linearGradient id="gWon" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: "#E5E7EB", strokeWidth: 1 }} tick={{ fill: "#6B7280", fontSize: 10 }} minTickGap={10} interval="preserveStartEnd" />
                    <YAxis tickLine={false} axisLine={{ stroke: "#E5E7EB", strokeWidth: 1 }} tick={{ fill: "#6B7280", fontSize: 12 }} />
                    <Tooltip content={<CustomPipelineTooltip />} />
                    <Bar dataKey="Open" name={t("dashboard.salesPipeline.openOpportunities")} fill="url(#gOpen)" barSize={24} radius={[4, 4, 0, 0]} isAnimationActive animationBegin={400} animationDuration={1500} />
                    <Bar dataKey="Won" name={t("dashboard.salesPipeline.wonDeals")} fill="url(#gWon)" barSize={24} radius={[4, 4, 0, 0]} isAnimationActive animationBegin={800} animationDuration={1500} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-center">
                  <motion.div whileHover={{ scale: 1.05 }} className="flex items-center justify-between gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200 flex-1 min-w-[140px]">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-[#3B82F6]" />
                      <span className="text-xs sm:text-sm font-medium text-gray-700">{t("dashboard.salesPipeline.openOpportunities")}</span>
                    </div>
                    <Badge variant="secondary" className="bg-white ml-2">
                      {pipelineBarData.reduce((sum, d) => sum + d.Open, 0)}
                    </Badge>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} className="flex items-center justify-between gap-2 px-3 py-2 bg-green-50 rounded-lg border border-green-200 flex-1 min-w-[140px]">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-[#10B981]" />
                      <span className="text-xs sm:text-sm font-medium text-gray-700">{t("dashboard.salesPipeline.wonDeals")}</span>
                    </div>
                    <Badge variant="secondary" className="bg-white ml-2">
                      {pipelineBarData.reduce((sum, d) => sum + d.Won, 0)}
                    </Badge>
                  </motion.div>
                </div>

                <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs text-gray-500">
                  <div className="text-center">
                    <div className="font-semibold text-gray-700">
                      {(
                        (pipelineBarData.reduce((sum, d) => sum + d.Won, 0) /
                          pipelineBarData.reduce((sum, d) => sum + (d.Open + d.Won), 0)) * 100 || 0
                      ).toFixed(1)}%
                    </div>
                    <div>{t("dashboard.salesPipeline.winRate")}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-gray-700">
                      {pipelineBarData.reduce((sum, d) => sum + d.Open, 0)}
                    </div>
                    <div>{t("dashboard.salesPipeline.activePipeline")}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

/* ── Deal Distribution ( totalDeals = open+won+lost, not deals.length) ── */
const DealDistributionChart = ({ data, loading, totalDeals }) => {
  const { t } = useTranslation();

  if (loading) return <Skeleton className="h-80 w-full rounded-lg" />;
  const pieData = [
    { name: t("dashboard.dealDistribution.open"), value: data.open, color: "#3B82F6" },
    { name: t("dashboard.dealDistribution.won"), value: data.won, color: "#10B981" },
    { name: t("dashboard.dealDistribution.lost"), value: data.lost, color: "#F59E0B" },
  ].filter((d) => d.value > 0);

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="pb-4 border-b">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            {t("dashboard.dealDistribution.title")}
          </CardTitle>
          <Badge variant="secondary">{t("dashboard.dealDistribution.totalBadge", { count: totalDeals })}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {totalDeals === 0 ? (
          <div className="h-56 flex flex-col items-center justify-center text-gray-400">
            <Target className="h-12 w-12 mb-2 opacity-30" />
            <p>{t("dashboard.dealDistribution.noDeals")}</p>
          </div>
        ) : (
          <>
            <div className="h-64 sm:h-72 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 24, right: 8, bottom: 24, left: 8 }}>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} stroke="#fff" strokeWidth={2} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <div className="text-2xl font-bold">{totalDeals}</div>
                  <div className="text-xs text-gray-500">{t("dashboard.dealDistribution.totalLabel")}</div>
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-4 mt-2 text-sm flex-wrap">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                  {d.name}: <strong>{d.value}</strong>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   Main Dashboard
══════════════════════════════════════════════════════════════════════════ */
const AdminDashboard = () => {
  const { t } = useTranslation();
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userCurrency = storedUser?.currency || "USD";
  const userCurrencySymbol = allowedCurrencies.find((c) => c.code === userCurrency)?.symbol || userCurrency;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activePreset, setActivePreset] = useState("7days");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [leads, setLeads] = useState([]);
  const [deals, setDeals] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [revenueByCurrency, setRevenueByCurrency] = useState({});
  const [summaryCards, setSummaryCards] = useState([]);
  const [pipelineLeads, setPipelineLeads] = useState(0);
  const [pipelineBarData, setPipelineBarData] = useState([]);
  const [dealCounts, setDealCounts] = useState({ open: 0, won: 0, lost: 0 });
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [resolvedRange, setResolvedRange] = useState({ start: "", end: "" });

  const navigate = useNavigate();
  const socket = useSocket();

  const getDateRange = useCallback((preset = activePreset, month = selectedMonth, year = selectedYear) => {
    if (preset === "today") return getTodayRange();
    if (preset === "7days") return getLast7Range();
    if (preset === "month") return getMonthRange(month, year);
    if (preset === "year") return getYearRange(year);
    return getLast7Range();
  }, [activePreset, selectedMonth, selectedYear]);

  const getPreviousRange = useCallback(() => {
    if (activePreset === "today") { const d = new Date(); d.setDate(d.getDate() - 1); return { start: formatDate(d), end: formatDate(d) }; }
    if (activePreset === "7days") { const e = new Date(); e.setDate(e.getDate() - 7); const s = new Date(); s.setDate(s.getDate() - 13); return { start: formatDate(s), end: formatDate(e) }; }
    if (activePreset === "month") { const d = new Date(selectedYear, selectedMonth, 1); d.setMonth(d.getMonth() - 1); return getMonthRange(d.getMonth(), d.getFullYear()); }
    if (activePreset === "year") return getYearRange(selectedYear - 1);
    return getLast7Range();
  }, [activePreset, selectedMonth, selectedYear]);

  const handleCardClick = (card) => {
    switch (card.id) {
      case "totalLeads":
        navigate("/leads");
        break;
      case "dealsWon":
        navigate("/deals?status=won");
        break;
      case "totalRevenue":
        navigate("/invoices");
        break;
      case "pendingInvoices":
        navigate("/invoices?status=pending");
        break;
      default:
        break;
    }
  };



  // Dashboard needs ALL records, not paginated 10.
  // Pass limit=9999 so the backend returns everything in one shot.
  // This only applies to the dashboard — LeadTable still uses limit=10.
  const fetchAll = useCallback(async (range) => {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    const [leadsRes, dealsRes, summaryRes, invoicesRes] = await Promise.all([
      axios.get(`${API_URL}/leads/getAllLead`, { params: { start: range.start, end: range.end, limit: 9999, page: 1 }, headers }),
      axios.get(`${API_URL}/deals/getAll`, { params: { start: range.start, end: range.end }, headers }),
      axios.get(`${API_URL}/dashboard/summary`, { params: { start: range.start, end: range.end }, headers }),
      axios.get(`${API_URL}/invoices/getInvoice`, { params: { start: range.start, end: range.end }, headers }),
    ]);

    const normaliseLeads = (res) => {
      const d = res.data;
      if (Array.isArray(d)) return d;
      if (d && Array.isArray(d.leads)) return d.leads;
      if (d && Array.isArray(d.data)) return d.data;
      return [];
    };
    const normalise = (res) => {
      const d = res.data;
      if (Array.isArray(d)) return d;
      if (d && Array.isArray(d.data)) return d.data;
      if (d && Array.isArray(d.deals)) return d.deals;
      if (d && Array.isArray(d.invoices)) return d.invoices;
      return [];
    };

    return {
      leads: normaliseLeads(leadsRes),
      deals: normalise(dealsRes),
      invoices: normalise(invoicesRes),
      summary: summaryRes.data,
    };
  }, []);

  const computeChange = (cur, prev) => {
    if (prev === 0) return cur === 0 ? 0 : 100;
    return Number((((cur - prev) / Math.abs(prev)) * 100).toFixed(1));
  };
/* ── To Fetch Dashboard Data ─────────────────────── */
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const range = getDateRange();
      setResolvedRange({ start: range.start, end: range.end });

      const [current, previous] = await Promise.all([
        fetchAll(getDateRange()),
        fetchAll(getPreviousRange()),
      ]);

      setLeads(current.leads);
      setDeals(current.deals);
      setInvoices(current.invoices);
      setRecentInvoices(current.invoices);

      const summary = current.summary;
      setRevenueByCurrency(summary.revenueByCurrency || {});

      const totalLeads = current.leads.length;

      const dealsWon = current.deals.filter((d) => {
        if (!isWonDeal(d.stage)) return false;
        const wonDate = new Date(d.wonAt || d.updatedAt || d.createdAt);
        const startDate = new Date(range.start);
        const endDate = new Date(range.end);
        endDate.setHours(23, 59, 59, 999);
        return wonDate >= startDate && wonDate <= endDate;
      }).length;

      const totalRevenue = Object.values(summary.revenueByCurrency || {}).reduce((s, d) => s + (d.preferredCurrencyValue || 0), 0);
      const pendingCount = current.invoices.filter((inv) => ["pending", "unpaid"].includes(inv.status?.toLowerCase())).length;

      const prevRevenue = {};
      previous.invoices.forEach((inv) => {
        const curr = inv.currency || "USD";
        const amt = Number(inv.total ?? inv.amount ?? inv.grandTotal ?? inv.totalAmount ?? 0);
        if (amt > 0) {
          prevRevenue[curr] = prevRevenue[curr] || { amount: 0 };
          prevRevenue[curr].amount += amt;
        }
      });
      const prevTotalRevenue = Object.values(prevRevenue).reduce((s, d) => s + d.amount, 0);

      setSummaryCards([
        { id: "totalLeads", value: totalLeads, change: computeChange(totalLeads, previous.leads.length), color: "blue", icon: <Users className="h-5 w-5" /> },
        { id: "dealsWon", value: dealsWon, change: computeChange(dealsWon, previous.deals.filter((d) => isWonDeal(d.stage)).length), color: "green", icon: <Trophy className="h-5 w-5" /> },
        { id: "totalRevenue", value: totalRevenue, prefix: userCurrencySymbol, change: computeChange(totalRevenue, prevTotalRevenue), color: "purple", icon: <span className="h-5 w-5 flex items-center justify-center font-bold text-base leading-none">{userCurrencySymbol}</span> },
        { id: "pendingInvoices", value: pendingCount, change: computeChange(pendingCount, previous.invoices.filter((inv) => ["pending", "unpaid"].includes(inv.status?.toLowerCase())).length), color: "orange", icon: <FileText className="h-5 w-5" /> },
      ]);

      setPipelineLeads(totalLeads);

      const barData = months.map((month, mIdx) => {
        const monthDeals = current.deals.filter((d) => {
          const date = new Date(d.createdAt ?? d.date ?? d.updatedAt);
          return !isNaN(date) && date.getMonth() === mIdx;
        });
        return {
          month,
          Open: monthDeals.filter((d) => isOpenDeal(d.stage)).length,
          Won: monthDeals.filter((d) => isWonDeal(d.stage)).length,
        };
      });
      setPipelineBarData(barData);

      // FIX: compute each count separately using the corrected helpers
      const openCount = current.deals.filter((d) => isOpenDeal(d.stage)).length;
      const lostCount = current.deals.filter((d) => isLostDeal(d.stage)).length;

      setDealCounts({
        open: openCount,
        won: dealsWon,
        lost: lostCount,
      });

      if (dealsWon > 5 && dealsWon > previous.deals.filter((d) => isWonDeal(d.stage)).length) {
        confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 } });
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(t("dashboard.error.fetchFailed"));
    } finally {
      setLoading(false);
    }
  }, [getDateRange, getPreviousRange, fetchAll, t, userCurrencySymbol]);

  useEffect(() => {
    fetchDashboardData();

    if (localStorage.getItem("db_refreshed_toast") === "true") {
      toast.success("Your plan has been upgraded successfully! All existing data has been preserved.");
      localStorage.removeItem("db_refreshed_toast");
    }
  }, [fetchDashboardData]);

  // Re-fetch only when something actually changes on the backend — no polling
  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchDashboardData();
    socket.on("lead_created",       refresh);
    socket.on("deal_stage_updated", refresh);
    socket.on("invoice_updated",    refresh);
    return () => {
      socket.off("lead_created",       refresh);
      socket.off("deal_stage_updated", refresh);
      socket.off("invoice_updated",    refresh);
    };
  }, [socket, fetchDashboardData]);

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="p-6 space-y-6 min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-purple-600" />{t("dashboard.title")}
          </h1>
          <p className="text-gray-600 mt-1">{t("dashboard.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={activePreset} onValueChange={setActivePreset}>
            <SelectTrigger className="w-[160px] bg-white border"><SelectValue placeholder={t("dashboard.period.label")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">{t("dashboard.period.today")}</SelectItem>
              <SelectItem value="7days">{t("dashboard.period.last7days")}</SelectItem>
              <SelectItem value="month">{t("dashboard.period.thisMonth")}</SelectItem>
              <SelectItem value="year">{t("dashboard.period.thisYear")}</SelectItem>
            </SelectContent>
          </Select>
          {(activePreset === "month" || activePreset === "year") && (
            <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder={t("dashboard.period.month")} /></SelectTrigger>
              <SelectContent>
                {months.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {activePreset === "year" && (
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[100px]"><SelectValue placeholder={t("dashboard.period.year")} /></SelectTrigger>
              <SelectContent>
                {[2023, 2024, 2025, 2026].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
           {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {loading
          ? Array(4).fill(0).map((_, i) => <SummaryCard key={i} loading />)
          : summaryCards.map((card) => (
            <SummaryCard
              key={card.id}
              {...card}
              title={t(`dashboard.cards.${card.id}`)}
              loading={false}
              onClick={() => handleCardClick(card)}
            />
          ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-5 relative z-10">
        {/* Currency Breakdown + Pending + Leaderboard */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-5">
          <CurrencyBreakdownCard revenueData={revenueByCurrency} loading={loading} />
          <PendingInvoicesCard invoices={recentInvoices} loading={loading} />
          <StreakLeaderboard
            loading={loading}
            deals={deals}
            leads={leads}
            startDate={resolvedRange.start}
            endDate={resolvedRange.end}
          />
        </div>

        {/* Revenue Trend */}
        <div className="lg:col-span-2">
          <RevenueTrendChart
            revenueData={revenueByCurrency}
            loading={loading}
            activePreset={activePreset}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            invoices={recentInvoices}
          />
        </div>
      </div>

      {/* Pipeline + Deal Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 relative z-10">
        <SalesPipelineChart
          pipelineBarData={pipelineBarData}
          loading={loading}
          totalPipelineLeads={pipelineLeads}
        />

        {/*  totalDeals = open + won + lost (not deals.length) */}
        <DealDistributionChart
          data={dealCounts}
          loading={loading}
          totalDeals={dealCounts.open + dealCounts.won + dealCounts.lost}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;
