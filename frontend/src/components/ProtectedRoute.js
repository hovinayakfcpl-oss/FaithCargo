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

  // Check if user is Client
  const isClient = hasClientToken || loginType === "client" || userRole === "client";
  
  if (isClient) {
    // All routes that clients can access
    const clientRoutes = [
      "/",
      "/client-dashboard",
      "/create-order",
      "/ba-b2b-rate-calculator",
      "/ba-b2b-rate",
      "/shipment-details",
      "/shipments",
      "/tracking",
    ];
    
    // Check if current route is allowed for client
    if (clientRoutes.includes(location.pathname)) {
      console.log(`✅ Client access granted for: ${location.pathname}`);
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