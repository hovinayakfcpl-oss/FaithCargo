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
  
  // 🔥 SIMPLE TOKEN VALIDATION
  const hasToken = token && token !== "undefined" && token !== "null" && token !== "";
  const hasClientToken = clientToken && clientToken !== "undefined" && clientToken !== "null" && clientToken !== "";
  const isAuthenticated = hasToken || hasClientToken;
  
  // 🔥 DEBUG LOGS
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

  // Check if user is Admin
  const isAdmin = userRole === "admin" || 
                  userRole === "Admin" || 
                  username === "admin" || 
                  username === "vinayak" ||
                  hasToken;
                  
  if (isAdmin) {
    console.log("✅ Admin access granted for:", location.pathname);
    return children;
  }

  // Check if user is Staff
  const isStaff = userRole === "staff" || userRole === "User" || loginType === "staff";
  
  if (isStaff) {
    // Staff accessible routes
    const staffRoutes = [
      "/",
      "/user-dashboard",
      "/staff/my-work",
      "/staff/tasks",
      "/fcpl-rate",
      "/pickup",
      "/ba-b2b-rate",
      "/rate-update",
      "/pincode",
      "/vendor-manage",
      "/vendor-rate",
      "/user-management",
    ];
    
    // Special routes that need module permission
    if (requiredModule) {
      const userModules = JSON.parse(localStorage.getItem("userModules") || "{}");
      if (!userModules[requiredModule]) {
        console.log(`❌ Staff missing module permission: ${requiredModule}`);
        return <Navigate to="/user-dashboard" replace />;
      }
    }
    
    if (staffRoutes.includes(location.pathname)) {
      console.log(`✅ Staff access granted for: ${location.pathname}`);
      return children;
    } else if (location.pathname === "/staff/my-work") {
      return children;
    } else {
      console.log(`❌ Staff access denied for: ${location.pathname}, redirecting to dashboard`);
      return <Navigate to="/user-dashboard" replace />;
    }
  }

  // Check if user is Client
  const isClient = hasClientToken || loginType === "client" || userRole === "client";
  
  if (isClient) {
    // Client accessible routes
    const clientRoutes = [
      "/",
      "/client-dashboard",
      "/create-order",
      "/ba-b2b-rate-calculator",
      "/ba-b2b-rate",
      "/shipment-details",
      "/shipments",
      "/tracking",
      "/pickup-request",
      "/my-pickups",
    ];
    
    // Special routes that need module permission
    if (requiredModule) {
      const userModules = JSON.parse(localStorage.getItem("userModules") || "{}");
      if (!userModules[requiredModule]) {
        console.log(`❌ Client missing module permission: ${requiredModule}`);
        return <Navigate to="/client-dashboard" replace />;
      }
    }
    
    // Check if current route is allowed for client
    if (clientRoutes.includes(location.pathname)) {
      console.log(`✅ Client access granted for: ${location.pathname}`);
      return children;
    } else if (location.pathname === "/pickup-request") {
      return children;
    } else if (location.pathname === "/my-pickups") {
      return children;
    } else {
      console.log(`❌ Client access denied for: ${location.pathname}, redirecting to dashboard`);
      return <Navigate to="/client-dashboard" replace />;
    }
  }

  // Default - allow access
  console.log(`✅ Default access granted for: ${location.pathname}`);
  return children;
}

export default ProtectedRoute;