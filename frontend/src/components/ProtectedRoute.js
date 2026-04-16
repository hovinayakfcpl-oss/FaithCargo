import React from "react";
import { Navigate, useLocation } from "react-router-dom";

function ProtectedRoute({ children, requiredModule }) {
  const location = useLocation();

  // Get authentication data from localStorage
  const token = localStorage.getItem("token");
  const clientToken = localStorage.getItem("clientToken");
  const userRole = localStorage.getItem("userRole");
  const loginType = localStorage.getItem("loginType");
  const username = localStorage.getItem("username") || localStorage.getItem("clientId");
  
  // Check if authenticated
  const isAuthenticated = 
    (token && token !== "undefined" && token !== "null" && token !== "") ||
    (clientToken && clientToken !== "undefined" && clientToken !== "null" && clientToken !== "");
  
  // Superuser check
  const isSuperuser = 
    localStorage.getItem("is_superuser") === "true" || 
    localStorage.getItem("is_superuser") === "True" ||
    userRole === "admin";

  // Admin username check
  const isAdminUser = username === "admin" || username === "vinayak" || username === "superuser" || userRole === "Admin";

  // Get user modules
  let userModules = {};
  try {
    const modulesStr = localStorage.getItem("userModules");
    if (modulesStr) {
      userModules = JSON.parse(modulesStr);
    }
  } catch (error) {
    console.error("Error parsing userModules:", error);
  }

  // Not authenticated - redirect
  if (!isAuthenticated) {
    localStorage.clear();
    return <Navigate to="/" replace />;
  }

  // Admin/Superuser - Allow ALL routes
  if (isSuperuser || isAdminUser) {
    console.log("✅ Admin access granted for:", location.pathname);
    return children;
  }

  // Route to module mapping
  const routePermissions = {
    "/fcpl-rate": "fcpl_rate",
    "/pickup": "pickup",
    "/vendor-manage": "vendor_manage",
    "/vendor-rate": "vendor_rates",
    "/rate-update": "rate_update",
    "/pincode": "pincode",
    "/user-management": "user_management",
    "/ba-b2b-rate": "ba_b2b",
    "/ba-b2b-rate-calculator": "ba_b2b",
    "/create-order": "create_order",
    "/shipment-details": "shipment_details",
    "/shipments": "shipment_details",
  };

  const currentPath = location.pathname;

  // Public routes (accessible to all authenticated users)
  const publicRoutes = [
    "/user-dashboard", 
    "/admin-dashboard", 
    "/dashboard",
    "/ba-b2b-rate-calculator",
    "/shipment-details",  // 🔥 Add this for clients
    "/shipments"
  ];
  
  if (publicRoutes.includes(currentPath)) {
    return children;
  }

  // Check permission
  let requiredPermission = requiredModule || routePermissions[currentPath];

  if (!requiredPermission) {
    console.warn(`No permission defined for route: ${currentPath}`);
    return children;
  }

  const hasPermission = userModules[requiredPermission] === true;

  if (!hasPermission) {
    console.log(`Access Denied: Missing "${requiredPermission}" permission`);
    if (loginType === "client") {
      return <Navigate to="/ba-b2b-rate-calculator" replace />;
    }
    return <Navigate to="/user-dashboard" replace />;
  }

  console.log(`Access Granted for: ${currentPath}`);
  return children;
}

export default ProtectedRoute;