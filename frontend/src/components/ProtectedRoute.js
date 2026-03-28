import React from "react";
import { Navigate, useLocation } from "react-router-dom";

function ProtectedRoute({ children }) {
  const location = useLocation();

  const token = localStorage.getItem("token");
  const isSuperuser =
    localStorage.getItem("is_superuser") === "true" ||
    localStorage.getItem("is_superuser") === "True";

  // ✅ permissions object from localStorage
  const userModules = JSON.parse(localStorage.getItem("permissions") || "{}");

  // 🔹 Token check
  if (!token || token === "undefined" || token === "null") {
    return <Navigate to="/" replace />;
  }

  // 🔹 Admin always allowed
  if (isSuperuser) {
    return children;
  }

  // 🔥 ROUTE → MODULE MAP (✅ UPDATED)
  const routePermissions = {
    "/fcpl-rate": "fcpl_rate",
    "/pickup": "pickup",
    "/vendor-manage": "vendor_manage",
    "/vendor-rate": "vendor_rates",
    "/rate-update": "rate_update",
    "/pincode": "pincode",
    "/user-add": "user_management",
    "/ba-b2b-rate": "ba_b2b",

    // ✅ NEW MODULES
    "/create-order": "create_order",
    "/shipment-details": "shipment_details",
  };

  const currentPath = location.pathname;

  // 🔹 Dashboard always allowed
  if (currentPath === "/user-dashboard" || currentPath === "/admin-dashboard") {
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