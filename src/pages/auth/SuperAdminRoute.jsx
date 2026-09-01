import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

const SuperAdminRoute = ({ permission }) => {
  const superAdminToken = useSelector((state) => state.auth.superAdminToken);
  const superAdmin = useSelector((state) => state.auth.superAdmin);

  if (!superAdminToken) {
    return <Navigate to="/superadmin/login" replace />;
  }

  // Profile is always reachable regardless of role, so redirecting a
  // permission failure there can never loop — unlike redirecting to
  // dashboard, which may itself be gated for this account.
  if (permission && !superAdmin?.role?.permissions?.[permission]) {
    return <Navigate to="/superadmin/profile" replace />;
  }

  return <Outlet />;
};

export default SuperAdminRoute;
