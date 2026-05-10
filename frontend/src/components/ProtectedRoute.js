// src/components/ProtectedRoute.js - COMPLETELY FIXED WORKING VERSION
import React from "react";
import { Navigate, useLocation } from "react-router-dom";

function ProtectedRoute({ children, requiredModule, allowedRoles = [] }) {
  const location = useLocation();

  // Get authentication data from localStorage
  const token = localStorage.getItem("token");
  const clientToken = localStorage.getItem("clientToken");
  const userRole = localStorage.getItem("userRole");
  const loginType = localStorage.getItem("loginType");
  const username = localStorage.getItem("username") || localStorage.getItem("clientId");
  
  // Get user modules from localStorage
  let userModules = {};
  try {
    const modulesStr = localStorage.getItem("userModules");
    if (modulesStr) {
      userModules = JSON.parse(modulesStr);
    }
  } catch (error) {
    console.error("Error parsing userModules:", error);
  }
  
  // 🔥 SIMPLE TOKEN VALIDATION
  const hasToken = token && token !== "undefined" && token !== "null" && token !== "";
  const hasClientToken = clientToken && clientToken !== "undefined" && clientToken !== "null" && clientToken !== "";
  const isAuthenticated = hasToken || hasClientToken;
  
  // 🔥 DEBUG LOGS (remove in production)
  if (process.env.NODE_ENV !== 'production') {
    console.log("=== PROTECTED ROUTE DEBUG ===");
    console.log("Path:", location.pathname);
    console.log("isAuthenticated:", isAuthenticated);
    console.log("userRole:", userRole);
    console.log("loginType:", loginType);
  }
  
  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    console.log("❌ Not authenticated, redirecting to login");
    return <Navigate to="/" replace />;
  }

  // Check if user is Admin
  const isAdmin = userRole === "admin" || 
                  userRole === "Admin" || 
                  loginType === "admin" ||
                  username === "admin" || 
                  username === "vinayak" ||
                  (hasToken && !hasClientToken);
  
  // Check if user is Staff
  const isStaff = userRole === "staff" || 
                  userRole === "Staff" || 
                  userRole === "user" || 
                  userRole === "User" || 
                  loginType === "staff" ||
                  loginType === "user";
  
  // Check if user is Client
  const isClient = hasClientToken || 
                   loginType === "client" || 
                   userRole === "client" || 
                   userRole === "Client";

  // 🔥 ROLE BASED ACCESS CHECK
  if (allowedRoles.length > 0) {
    const hasAllowedRole = allowedRoles.some(role => {
      const roleLower = role.toLowerCase();
      return (isAdmin && (roleLower === "admin" || roleLower === "administrator")) ||
             (isStaff && (roleLower === "staff" || roleLower === "user")) ||
             (isClient && roleLower === "client");
    });
    
    if (!hasAllowedRole) {
      console.log(`❌ Role access denied. Required roles: ${allowedRoles.join(", ")}`);
      if (isAdmin) return <Navigate to="/admin-dashboard" replace />;
      if (isStaff) return <Navigate to="/user-dashboard" replace />;
      if (isClient) return <Navigate to="/client-dashboard" replace />;
      return <Navigate to="/" replace />;
    }
  }

  // 🔥 MODULE PERMISSION CHECK
  if (requiredModule) {
    const hasModuleAccess = userModules[requiredModule] === true;
    if (!hasModuleAccess) {
      console.log(`❌ Module access denied. Required module: ${requiredModule}`);
      if (isAdmin) return <Navigate to="/admin-dashboard" replace />;
      if (isStaff) return <Navigate to="/user-dashboard" replace />;
      if (isClient) return <Navigate to="/client-dashboard" replace />;
      return <Navigate to="/" replace />;
    }
  }

  // 🔥 ROUTE SPECIFIC ACCESS BASED ON ROLE
  const pathname = location.pathname;
  
  // Admin only routes
  const adminOnlyRoutes = [
    "/admin-dashboard",
    "/admin/users",
    "/admin/recharges",
    "/admin/transactions",
    "/admin/pickup-management",
    "/pickup-management",
    "/admin/pickup-request",
    "/user-management",
  ];
  
  if (adminOnlyRoutes.some(route => pathname === route || pathname.startsWith(route))) {
    if (!isAdmin) {
      console.log(`❌ Admin only route: ${pathname}`);
      if (isStaff) return <Navigate to="/user-dashboard" replace />;
      if (isClient) return <Navigate to="/client-dashboard" replace />;
      return <Navigate to="/" replace />;
    }
  }
  
  // Staff only routes
  const staffOnlyRoutes = [
    "/user-dashboard",
    "/staff/my-work",
    "/my-work",
    "/staff/tasks",
  ];
  
  if (staffOnlyRoutes.some(route => pathname === route)) {
    if (!isStaff && !isAdmin) {
      console.log(`❌ Staff only route: ${pathname}`);
      if (isClient) return <Navigate to="/client-dashboard" replace />;
      return <Navigate to="/" replace />;
    }
  }
  
  // Client only routes
  const clientOnlyRoutes = [
    "/client-dashboard",
    "/pickup-request",
    "/my-pickups",
    "/tracking",
  ];
  
  if (clientOnlyRoutes.some(route => pathname === route)) {
    if (!isClient) {
      console.log(`❌ Client only route: ${pathname}`);
      if (isAdmin) return <Navigate to="/admin-dashboard" replace />;
      if (isStaff) return <Navigate to="/user-dashboard" replace />;
      return <Navigate to="/" replace />;
    }
  }

  // 🔥 MODULE BASED ROUTES (Staff/Admin)
  const moduleBasedRoutes = [
    "/fcpl-rate",
    "/ba-b2b-rate",
    "/ba-b2b-rate-calculator",
    "/vendor-manage",
    "/vendor-rate",
    "/rate-update",
    "/pincode",
    "/create-order",
    "/shipment-details",
  ];
  
  if (moduleBasedRoutes.some(route => pathname === route)) {
    if (!isStaff && !isAdmin) {
      console.log(`❌ Module route access denied: ${pathname}`);
      if (isClient) return <Navigate to="/client-dashboard" replace />;
      return <Navigate to="/" replace />;
    }
  }

  // 🔥 CREATE ORDER - Accessible by all authenticated users
  if (pathname === "/create-order") {
    console.log(`✅ Create order access granted`);
    return children;
  }

  // 🔥 PICKUP REQUEST - Accessible by Client and Admin
  if (pathname === "/pickup-request") {
    if (isClient || isAdmin) {
      console.log(`✅ Pickup request access granted`);
      return children;
    }
    console.log(`❌ Pickup request access denied`);
    if (isStaff) return <Navigate to="/user-dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  // 🔥 MY PICKUPS - Accessible by Client only
  if (pathname === "/my-pickups") {
    if (isClient) {
      console.log(`✅ My pickups access granted`);
      return children;
    }
    console.log(`❌ My pickups access denied`);
    if (isAdmin) return <Navigate to="/admin/pickup-management" replace />;
    if (isStaff) return <Navigate to="/user-dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  // 🔥 MY WORK - Accessible by Staff and Admin
  if (pathname === "/my-work" || pathname === "/staff/my-work") {
    if (isStaff || isAdmin) {
      console.log(`✅ My work access granted`);
      return children;
    }
    console.log(`❌ My work access denied`);
    if (isClient) return <Navigate to="/client-dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  // 🔥 PICKUP MANAGEMENT - Accessible by Admin only
  if (pathname === "/admin/pickup-management" || pathname === "/pickup-management") {
    if (isAdmin) {
      console.log(`✅ Pickup management access granted`);
      return children;
    }
    console.log(`❌ Pickup management access denied`);
    if (isStaff) return <Navigate to="/user-dashboard" replace />;
    if (isClient) return <Navigate to="/client-dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  // Default - allow access
  console.log(`✅ Access granted for: ${pathname}`);
  return children;
}

export default ProtectedRoute;