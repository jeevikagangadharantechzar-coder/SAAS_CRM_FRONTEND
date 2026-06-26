import React, { useState, useEffect, useRef } from "react";
import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { useSelector } from "react-redux";

/* ── Global Session Guard Component ─────────────────────── */
const SessionGuard = ({ children, tenantSlug, user }) => {
  const [isDuplicate, setIsDuplicate] = useState(false);
  const tabIdRef = useRef(Math.random().toString(36).substring(2));
  const channelRef = useRef(null);

  useEffect(() => {
    if (!user || !user._id) {
      setIsDuplicate(false);
      return;
    }

    // Use a global channel (not scoped by tenant or user) to guard the entire browser profile
    const channelName = "crm_global_session_guard";
    const channel = new BroadcastChannel(channelName);
    channelRef.current = channel;

    // Broadcast a PING to check if any other tab is already active
    channel.postMessage({
      type: "PING",
      tabId: tabIdRef.current,
    });

    const handleMessage = (event) => {
      const { type, tabId } = event.data;
      if (tabId === tabIdRef.current) return; // Ignore own messages

      if (type === "PING") {
        // Reply PONG to let the new tab know we are active
        channel.postMessage({
          type: "PONG",
          tabId: tabIdRef.current,
        });
      } else if (type === "PONG") {
        // Another tab responded PONG, meaning there is an active tab
        setIsDuplicate(true);
      } else if (type === "CLAIM") {
        // Another tab claimed the active status, so we become the duplicate
        setIsDuplicate(true);
      } else if (type === "QUERY_ACTIVE_SESSION") {
        // Broadcast active session details for login page checks
        if (!isDuplicate) {
          channel.postMessage({
            type: "ACTIVE_SESSION_REPORT",
            tenantSlug: tenantSlug,
            tabId: tabIdRef.current,
          });
        }
      }
    };

    channel.addEventListener("message", handleMessage);

    // Periodically heartbeat/ping to maintain sync
    const interval = setInterval(() => {
      channel.postMessage({
        type: "PING",
        tabId: tabIdRef.current,
      });
    }, 3000);

    return () => {
      clearInterval(interval);
      channel.removeEventListener("message", handleMessage);
      channel.close();
    };
  }, [user, tenantSlug, isDuplicate]);

  const handleClaim = () => {
    if (channelRef.current) {
      channelRef.current.postMessage({
        type: "CLAIM",
        tabId: tabIdRef.current,
      });
      setIsDuplicate(false);
    }
  };

  if (isDuplicate) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/90 backdrop-blur-md">
        <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-2xl border border-slate-150 text-center animate-in fade-in zoom-in duration-200">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Session Active in Another Tab
          </h2>
          <p className="text-slate-600 mb-6 leading-relaxed text-sm">
            Another tenant portal or user session is already active in a different tab of this browser. 
            To prevent data conflicts, you can only work in one active tab at a time.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleClaim}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-200"
            >
              Use Here Instead
            </button>
            <p className="text-xs text-slate-400 mt-2">
              Tip: You can open different tenant portals in separate windows or incognito tabs.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

/* ── Private Route Component ─────────────────────── */
const PrivateRoute = ({ permission }) => {
  const location = useLocation();
  const { tenantSlug } = useParams();
  const { token, slug: userSlug, user } = useSelector((state) => state.auth);

  // If not logged in, redirect to login page
  if (!token || !user) {
    const loginPath = tenantSlug ? `/${tenantSlug}/login` : "/";
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }

  // If tenantSlug exists in URL and doesn't match user slug, redirect to correct workspace
  if (tenantSlug && tenantSlug !== userSlug) {
    return <Navigate to={`/${userSlug}/dashboard`} replace />;
  }

  // If there is no tenant slug in the URL (e.g. legacy absolute links) redirect to the tenant-scoped URL
  if (!tenantSlug && location.pathname !== "/" && !location.pathname.startsWith("/login") && !location.pathname.startsWith("/superadmin")) {
    return <Navigate to={`/${userSlug}${location.pathname}${location.search}`} replace state={location.state} />;
  }

  try {
    // Admin role has full access
    if (user.role && user.role.name?.toLowerCase() === "admin") {
      return permission ? (
        <Outlet />
      ) : (
        <SessionGuard tenantSlug={tenantSlug} user={user}>
          <Outlet />
        </SessionGuard>
      );
    }

    // RBAC Permission check
    if (permission && !user.role?.permissions?.[permission]) {
      return <Navigate to={`/${userSlug}/dashboard`} replace />;
    }

    return permission ? (
      <Outlet />
    ) : (
      <SessionGuard tenantSlug={tenantSlug} user={user}>
        <Outlet />
      </SessionGuard>
    );
  } catch (err) {
    return <Navigate to="/" replace />;
  }
};

export default PrivateRoute;