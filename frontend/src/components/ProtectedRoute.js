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
  
  // 🔥 IMPROVED TOKEN VALIDATION
  const isValidToken = (tokenValue) => {
    return tokenValue && tokenValue !== "undefined" && tokenValue !== "null" && tokenValue !== "";
  };
  
  const hasToken = isValidToken(token);
  const hasClientToken = isValidToken(clientToken);
  const isAuthenticated = hasToken || hasClientToken;
  
  // 🔥 DEBUG LOGS - Check browser console for debugging
  console.log("=== PROTECTED ROUTE DEBUG ===");
  console.log("Path:", location.pathname);
  console.log("hasToken:", hasToken);
  console.log("hasClientToken:", hasClientToken);
  console.log("isAuthenticated:", isAuthenticated);
  console.log("userRole:", userRole);
  console.log("loginType:", loginType);
  
  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    console.log("❌ Not authenticated, redirecting to login");
    localStorage.clear();
    return <Navigate to="/" replace />;
  }

  // Admin/Superuser - Allow ALL routes
  const isAdmin = userRole === "admin" || 
                  userRole === "Admin" || 
                  username === "admin" || 
                  username === "vinayak" ||
                  localStorage.getItem("is_superuser") === "true";
                  
  if (isAdmin) {
    console.log("✅ Admin access granted for:", location.pathname);
    return children;
  }

  const currentPath = location.pathname;
  
  // 🔥 COMPLETE LIST - All routes that clients can access (NO PERMISSION CHECK NEEDED)
  const clientAllowedRoutes = [
    "/",
    "/client-dashboard",
    "/create-order",
    "/ba-b2b-rate-calculator",
    "/ba-b2b-rate",
    "/shipment-details",
    "/shipments",
    "/tracking",
    "/user-dashboard",
    "/dashboard",
    "/fcpl-rate",
    "/pickup",
    "/vendor-manage",
    "/vendor-rate",
    "/rate-update",
    "/pincode",
    "/user-management",
  ];
  
  // 🔥 If client and route is allowed, grant access immediately
  if ((hasClientToken || loginType === "client" || userRole === "client") && clientAllowedRoutes.includes(currentPath)) {
    console.log(`✅ Client access granted for: ${currentPath}`);
    return children;
  }
  
  // 🔥 If client trying to access non-allowed route
  if (hasClientToken || loginType === "client" || userRole === "client") {
    console.log(`❌ Client access denied for: ${currentPath}, redirecting to dashboard`);
    return <Navigate to="/client-dashboard" replace />;
  }

  // For staff/users with token, check module permissions
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
    "/client-dashboard": "shipment_details",
    "/tracking": "shipment_details",
  };

  let requiredPermission = requiredModule || routePermissions[currentPath];

  if (!requiredPermission) {
    console.warn(`No permission defined for route: ${currentPath} - allowing access`);
    return children;
  }

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

  const hasPermission = userModules[requiredPermission] === true;

  if (!hasPermission) {
    console.log(`Access Denied: Missing "${requiredPermission}" permission for path: ${currentPath}`);
    return <Navigate to="/user-dashboard" replace />;
  }

  console.log(`✅ Access Granted for: ${currentPath}`);
  return children;
}

export default ProtectedRoute;