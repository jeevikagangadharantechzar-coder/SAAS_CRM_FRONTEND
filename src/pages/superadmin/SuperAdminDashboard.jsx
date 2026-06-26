import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Building2, Users, CheckCircle, TrendingUp, RefreshCw, AlertCircle, ArrowUpCircle } from "lucide-react";
import { superApi } from "../../services/api";
import { Skeleton } from "../../components/ui/skeleton";
import { toast } from "react-toastify";

const COLORS = ["#008ecc", "#10B981", "#EF4444", "#F59E0B"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const SuperAdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    tenantsCount: 0,
    activeTenantsCount: 0,
    totalUsers: 0,
    totalRevenue: 0,
  });
  const [tenants, setTenants] = useState([]);
  const [upgradeRequests, setUpgradeRequests] = useState([]);
  const [processingId, setProcessingId] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch stats, tenants list, and upgrade requests in parallel
      const [statsRes, tenantsRes, upgradesRes] = await Promise.all([
        superApi.get("/dashboard/stats"),
        superApi.get("/tenants"),
        superApi.get("/tenants/upgrade-requests"),
      ]);

      // Parse stats
      if (statsRes.data && statsRes.data.success) {
        const data = statsRes.data.data || statsRes.data;
        setStats({
          tenantsCount: data.totalTenants ?? data.tenantsCount ?? 0,
          activeTenantsCount: data.activeTenants ?? data.activeTenantsCount ?? 0,
          totalUsers: data.totalUsers ?? 0,
          totalRevenue: data.totalRevenue ?? 0,
        });
      } else if (statsRes.data) {
        setStats({
          tenantsCount: statsRes.data.totalTenants || 0,
          activeTenantsCount: statsRes.data.activeTenants || 0,
          totalUsers: statsRes.data.totalUsers || 0,
          totalRevenue: statsRes.data.totalRevenue || 0,
        });
      }

      // Parse tenants for chart data
      if (tenantsRes.data && Array.isArray(tenantsRes.data.tenants)) {
        setTenants(tenantsRes.data.tenants);
      } else if (tenantsRes.data && Array.isArray(tenantsRes.data.data)) {
        setTenants(tenantsRes.data.data);
      } else if (tenantsRes.data && Array.isArray(tenantsRes.data)) {
        setTenants(tenantsRes.data);
      } else {
        setTenants([]);
      }

      // Parse upgrades
      if (upgradesRes.data?.success) {
        setUpgradeRequests(upgradesRes.data.requests || []);
      }
    } catch (err) {
      console.error("Failed to fetch superadmin stats:", err);
      setError("Failed to load platform metrics. Please check your backend connection.");
      setStats({ tenantsCount: 0, activeTenantsCount: 0, totalUsers: 0, totalRevenue: 0 });
      setTenants([]);
      setUpgradeRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleApproveUpgrade = async (id) => {
    setProcessingId(id);
    try {
      const res = await superApi.post(`/tenants/upgrade-approve/${id}`);
      if (res.data?.success) {
        toast.success("Upgrade approved, database refreshed, and activation email dispatched!");
        fetchStats();
      } else {
        toast.error("Failed to process approval request.");
      }
    } catch (err) {
      console.error("Failed to approve upgrade request:", err);
      toast.error(err.response?.data?.error || "Error approving upgrade request.");
    } finally {
      setProcessingId(null);
    }
  };

  const cardData = [
    {
      title: "Total Tenants",
      value: stats.tenantsCount,
      description: "Registered organizations",
      icon: <Building2 className="text-[#008ecc]" size={24} />,
      bg: "bg-[#f2fbff] border border-blue-100",
    },
    {
      title: "Active Tenants",
      value: stats.activeTenantsCount,
      description: `${Math.max(0, stats.tenantsCount - stats.activeTenantsCount)} inactive`,
      icon: <CheckCircle className="text-green-500" size={24} />,
      bg: "bg-green-50/50 border border-green-100",
    },
    {
      title: "Platform Users",
      value: stats.totalUsers,
      description: "Total across all tenants",
      icon: <Users className="text-purple-500" size={24} />,
      bg: "bg-purple-50/50 border border-purple-100",
    },
    {
      title: "Platform Revenue",
      value: stats.totalRevenue ? `$${Number(stats.totalRevenue).toLocaleString()}` : "$0",
      description: "Aggregated subscriptions",
      icon: <TrendingUp className="text-amber-500" size={24} />,
      bg: "bg-amber-50/50 border border-amber-100",
    },
  ];

  // Build registration trend chart dynamically from actual tenant createdAt dates
  const currentYear = new Date().getFullYear();
  const registrationTrend = MONTHS.map((month, idx) => {
    const count = tenants.filter((t) => {
      if (!t.createdAt) return false;
      const d = new Date(t.createdAt);
      return d.getFullYear() === currentYear && d.getMonth() === idx;
    }).length;
    return { month, tenants: count };
  });

  // Build distribution pie from actual active/inactive counts
  const activeCount = tenants.filter((t) => t.isActive === true).length;
  const inactiveCount = tenants.filter((t) => t.isActive === false).length;
  const distributionData = [
    { name: "Active", value: activeCount },
    { name: "Inactive", value: inactiveCount },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">System Overview</h2>
          <p className="text-slate-500 text-sm">Real-time status of your multi-tenant CRM deployment.</p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 font-medium hover:border-[#008ecc]/40 hover:text-[#008ecc] transition-all cursor-pointer shadow-sm text-sm active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm flex items-center space-x-2">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cardData.map((card, i) => (
          <Card key={i} className="border border-slate-100 shadow-sm bg-white overflow-hidden hover:shadow-md transition-all duration-200 rounded-2xl">
            <CardContent className="p-6">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ) : (
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{card.title}</p>
                    <h3 className="text-3xl font-extrabold text-slate-900 mt-2">{card.value}</h3>
                    <p className="text-xs text-slate-400 mt-2 font-medium">{card.description}</p>
                  </div>
                  <div className={`p-3 rounded-2xl ${card.bg}`}>{card.icon}</div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Registration Trend */}
        <Card className="lg:col-span-2 border border-slate-100 shadow-sm bg-white rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-slate-800">Tenant Registrations</CardTitle>
            <CardDescription>Monthly tenant sign-ups for {currentYear} (from database).</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? (
              <Skeleton className="h-64 w-full rounded-lg" />
            ) : tenants.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                <Building2 size={40} className="mb-3 opacity-30" />
                <p className="font-medium">No tenant registration data available</p>
                <p className="text-xs mt-1">Tenants will appear here once provisioned.</p>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={registrationTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="month" stroke="#94A3B8" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis stroke="#94A3B8" tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0" }} />
                    <Bar dataKey="tenants" name="Tenants Registered" fill="#008ecc" radius={[6, 6, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tenant Status Distribution */}
        <Card className="border border-slate-100 shadow-sm bg-white rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-slate-800">Tenant Distribution</CardTitle>
            <CardDescription>Active vs inactive status (from database).</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col items-center">
            {loading ? (
              <Skeleton className="h-48 w-48 rounded-full" />
            ) : distributionData.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-slate-400">
                <CheckCircle size={40} className="mb-3 opacity-30" />
                <p className="font-medium text-sm">No tenant data</p>
              </div>
            ) : (
              <>
                <div className="h-48 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                         data={distributionData}
                         cx="50%"
                         cy="50%"
                         innerRadius={50}
                         outerRadius={70}
                         dataKey="value"
                         paddingAngle={4}
                      >
                        {distributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: "12px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-extrabold text-slate-800">{tenants.length}</span>
                    <span className="text-xs text-slate-400 font-semibold uppercase">Total</span>
                  </div>
                </div>

                <div className="flex gap-6 mt-4 text-sm font-semibold">
                  <div className="flex items-center space-x-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#008ecc]" />
                    <span className="text-slate-600">Active ({activeCount})</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#10B981]" />
                    <span className="text-slate-600">Inactive ({inactiveCount})</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
