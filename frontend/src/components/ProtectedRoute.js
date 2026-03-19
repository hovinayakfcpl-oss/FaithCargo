import React from "react";
import { Navigate, useLocation } from "react-router-dom";

function ProtectedRoute({ children }) {
  const location = useLocation();

  const token = localStorage.getItem("token");

  const isSuperuser =
    localStorage.getItem("is_superuser") === "true" ||
    localStorage.getItem("is_superuser") === "True";

  // 🔥 USER MODULES (from login)
  const userModules = JSON.parse(localStorage.getItem("userModules") || "{}");

  // 🔹 No token → login
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // 🔹 ADMIN → full access
  if (isSuperuser) {
    return children;
  }

  // 🔥 ROUTE → MODULE MAP
  const routePermissions = {
    "/fcpl-rate": "fcpl_rate",
    "/pickup": "pickup",
    "/vendor-manage": "vendor_manage",
    "/vendor-rate": "vendor_rates",
    "/rate-update": "rate_update",
    "/pincode": "pincode",
    "/user-add": "user_management",
    "/ba-b2b-rate": "ba_b2b",
  };

  const currentPath = location.pathname;

  // 🔹 Dashboard always allowed
  if (currentPath === "/user-dashboard") {
    return children;
  }

  // 🔹 Check module access
  const requiredPermission = routePermissions[currentPath];

  if (requiredPermission && !userModules[requiredPermission]) {
    alert("Access Denied ❌");
    return <Navigate to="/user-dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;