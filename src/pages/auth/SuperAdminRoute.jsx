import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

const SuperAdminRoute = () => {
  const superAdminToken = useSelector((state) => state.auth.superAdminToken);

  if (!superAdminToken) {
    return <Navigate to="/superadmin/login" replace />;
  }

  return <Outlet />;
};

export default SuperAdminRoute;
