import React from "react";
import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { useSelector } from "react-redux";

const PrivateRoute = ({ permission, planFeature }) => {
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

  // Subscription-plan feature gate — applies regardless of role (including admins),
  // since it reflects what the tenant's plan includes, not what the user is allowed to do.
  // Missing/undefined defaults to allowed, so plans saved before a feature key existed
  // keep working.
  if (planFeature && user.planFeatures?.[planFeature] === false) {
    return <Navigate to={`/${userSlug}/dashboard`} replace />;
  }

  try {
    // Admin role has full access
    if (user.role && user.role.name?.toLowerCase() === "admin") {
      return <Outlet />;
    }

    // RBAC Permission check
    if (permission && !user.role?.permissions?.[permission]) {
      // Show "Access Denied" or redirect to user's dashboard
      return <Navigate to={`/${userSlug}/dashboard`} replace />;
    }

    return <Outlet />;
  } catch (err) {
    return <Navigate to="/" replace />;
  }
};

export default PrivateRoute;