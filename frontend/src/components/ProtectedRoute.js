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
  
  // ✅ Check if authenticated via staff token OR client token
  const isAuthenticated = 
    (token && token !== "undefined" && token !== "null" && token !== "") ||
    (clientToken && clientToken !== "undefined" && clientToken !== "null" && clientToken !== "");
  
  // ✅ Superuser check (String or Boolean both handled)
  const isSuperuser = 
    localStorage.getItem("is_superuser") === "true" || 
    localStorage.getItem("is_superuser") === "True" ||
    userRole === "admin";

  // 🔥 Get user modules from localStorage
  let userModules = {};
  try {
    const modulesStr = localStorage.getItem("userModules");
    if (modulesStr) {
      userModules = JSON.parse(modulesStr);
    }
  } catch (error) {
    console.error("Error parsing userModules:", error);
  }

  // 🔹 Token check: अगर लॉगिन नहीं है तो बाहर भेजें
  if (!isAuthenticated) {
    localStorage.clear();
    return <Navigate to="/user-login" replace />;
  }

  // 🔹 Admin/Superuser को हमेशा हर जगह जाने की अनुमति है
  if (isSuperuser) {
    return children;
  }

  // 🔥 ROUTE → MODULE MAP (Only these modules)
  const routePermissions = {
    "/fcpl-rate": "fcpl_rate",
    "/pickup": "pickup",
    "/vendor-manage": "vendor_manage",
    "/vendor-rate": "vendor_rates",
    "/rate-update": "rate_update",
    "/pincode": "pincode",
    "/user-management": "user_management",
    "/ba-b2b-rate": "ba_b2b",
    "/ba-b2b-rate-calculator": "ba_b2b",  // ✅ Added for client
    "/create-order": "create_order",
    "/shipment-details": "shipment_details",
  };

  const currentPath = location.pathname;

  // 🔹 Dashboard और Rate Calculator हमेशा एक्सेसिबल (for clients)
  const publicRoutes = [
    "/user-dashboard", 
    "/admin-dashboard", 
    "/dashboard",
    "/ba-b2b-rate-calculator"  // ✅ Clients can access without module check
  ];
  
  if (publicRoutes.includes(currentPath)) {
    return children;
  }

  // 🔹 Check if requiredModule is passed as prop (priority)
  let requiredPermission = requiredModule;
  
  // If no requiredModule prop, check from route mapping
  if (!requiredPermission) {
    requiredPermission = routePermissions[currentPath];
  }

  // 🔹 If no permission required for this route, allow access
  if (!requiredPermission) {
    console.warn(`No permission defined for route: ${currentPath}`);
    return children;
  }

  // 🔹 Permission check
  const hasPermission = userModules[requiredPermission] === true;

  if (!hasPermission) {
    console.log(`🔒 Access Denied: User "${username}" doesn't have "${requiredPermission}" permission`);
    console.log("Available modules:", Object.keys(userModules).filter(key => userModules[key] === true));
    
    // Redirect based on login type
    if (loginType === "client") {
      return <Navigate to="/ba-b2b-rate-calculator" replace />;
    }
    return <Navigate to="/user-dashboard" replace />;
  }

  console.log(`✅ Access Granted: User "${username}" has "${requiredPermission}" permission`);
  return children;
}

export default ProtectedRoute;