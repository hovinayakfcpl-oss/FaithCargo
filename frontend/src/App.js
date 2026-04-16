import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// 🔹 Core Components
import Login from "./components/Login";
import UserLogin from "./components/UserLogin";
import AdminDashboard from "./components/AdminDashboard";
import UserDashboard from "./components/UserDashboard";
import ClientDashboard from "./components/ClientDashboard";
import ProtectedRoute from "./components/ProtectedRoute";

// 🔹 Feature Modules
import FcplRateCalculator from "./components/FcplRateCalculator";
import BaB2bRateCalculator from "./components/BaB2bRateCalculator";
import VendorManage from "./components/VendorManage";
import VendorRates from "./components/VendorRates";
import RateUpdate from "./components/RateUpdate";
import PickupAssign from "./components/PickupAssign";
import PincodeManagement from "./components/PincodeManagement";

// ✅ NEW MODULES
import CreateOrder from "./components/CreateOrder";
import ShipmentDetails from "./components/ShipmentDetails";
import UserManagement from "./components/UserManagement";

// 🔹 Auth Helpers
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import Signup from "./components/Signup";

// 🔹 404 Page Component
const NotFoundPage = () => {
  useEffect(() => {
    document.title = "404 - Page Not Found | Faith Cargo";
  }, []);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f5f7fa 0%, #eef2f7 100%)",
      fontFamily: "'Inter', sans-serif",
      textAlign: "center",
      padding: "20px"
    }}>
      <div style={{
        background: "white",
        borderRadius: "24px",
        padding: "60px 40px",
        maxWidth: "500px",
        width: "100%",
        boxShadow: "0 20px 40px rgba(0,0,0,0.1)"
      }}>
        <div style={{
          fontSize: "120px",
          fontWeight: "800",
          background: "linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: "20px"
        }}>404</div>
        <h2 style={{ fontSize: "28px", marginBottom: "16px", color: "#0f172a" }}>Page Not Found</h2>
        <p style={{ color: "#64748b", marginBottom: "30px" }}>
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>
        <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => window.location.href = "/"}
            style={{
              padding: "12px 24px",
              background: "linear-gradient(135deg, #d32f2f, #b71c1c)",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.3s ease"
            }}
            onMouseEnter={(e) => e.target.style.transform = "translateY(-2px)"}
            onMouseLeave={(e) => e.target.style.transform = "translateY(0)"}
          >
            Go to Login
          </button>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: "12px 24px",
              background: "#f1f5f9",
              color: "#0f172a",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.3s ease"
            }}
            onMouseEnter={(e) => e.target.style.background = "#e2e8f0"}
            onMouseLeave={(e) => e.target.style.background = "#f1f5f9"}
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [userModules, setUserModules] = useState({});
  const [userRole, setUserRole] = useState(null);
  const [loginType, setLoginType] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication status on app load
    const token = localStorage.getItem("token");
    const clientToken = localStorage.getItem("clientToken");
    const role = localStorage.getItem("userRole");
    const type = localStorage.getItem("loginType");
    const modules = localStorage.getItem("userModules");
    
    // Check if authenticated via staff token or client token
    const hasToken = (token && token !== "undefined" && token !== "null" && token !== "") || 
                     (clientToken && clientToken !== "undefined" && clientToken !== "null" && clientToken !== "");
    
    setIsAuthenticated(hasToken);
    setUserRole(role);
    setLoginType(type);
    
    if (modules) {
      try {
        const parsedModules = JSON.parse(modules);
        setUserModules(parsedModules);
        console.log("User Modules Loaded:", Object.keys(parsedModules).filter(key => parsedModules[key] === true));
      } catch (error) {
        console.error("Error parsing user modules:", error);
      }
    }
    
    setLoading(false);
  }, []);

  // Route configuration with permissions
  const routeConfig = [
    { path: "/fcpl-rate", component: FcplRateCalculator, module: "fcpl_rate", title: "FCPL Rate Calculator", icon: "📊" },
    { path: "/ba-b2b-rate", component: BaB2bRateCalculator, module: "ba_b2b", title: "BA & B2B Rate Calculator", icon: "📈" },
    { path: "/ba-b2b-rate-calculator", component: BaB2bRateCalculator, module: "ba_b2b", title: "BA & B2B Rate Calculator", icon: "📈" },
    { path: "/vendor-manage", component: VendorManage, module: "vendor_manage", title: "Vendor Management", icon: "🏢" },
    { path: "/vendor-rate", component: VendorRates, module: "vendor_rates", title: "Vendor Rates", icon: "💰" },
    { path: "/rate-update", component: RateUpdate, module: "rate_update", title: "Rate Update", icon: "📝" },
    { path: "/pickup", component: PickupAssign, module: "pickup", title: "Pickup Assignment", icon: "🚚" },
    { path: "/pincode", component: PincodeManagement, module: "pincode", title: "Pincode Management", icon: "📍" },
    { path: "/user-management", component: UserManagement, module: "user_management", title: "User Management", icon: "👥" },
    { path: "/create-order", component: CreateOrder, module: "create_order", title: "Create Order", icon: "📝" },
    { path: "/shipment-details", component: ShipmentDetails, module: "shipment_details", title: "Shipment Details", icon: "📦" },
  ];

  // 🔥 Client specific routes
  const clientRoutes = [
    { path: "/client-dashboard", component: ClientDashboard, title: "Client Dashboard", icon: "🏠" },
    { path: "/tracking", component: ShipmentDetails, title: "Track Shipment", icon: "🔍" },
  ];

  if (loading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f5f7fa 0%, #eef2f7 100%)"
      }}>
        <div style={{
          textAlign: "center"
        }}>
          <div style={{
            width: "50px",
            height: "50px",
            border: "3px solid #e2e8f0",
            borderTopColor: "#d32f2f",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            marginBottom: "16px"
          }}></div>
          <p style={{ color: "#64748b" }}>Loading Faith Cargo...</p>
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* 🔹 PUBLIC ROUTES - No authentication required */}
        <Route path="/" element={<Login />} />
        <Route path="/user-login" element={<UserLogin />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />

        {/* 🔥 ADMIN DASHBOARD - Full Access */}
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* 🔹 USER DASHBOARD (Staff) */}
        <Route
          path="/user-dashboard"
          element={
            <ProtectedRoute>
              <UserDashboard />
            </ProtectedRoute>
          }
        />

        {/* 🔥 CLIENT DASHBOARD */}
        <Route
          path="/client-dashboard"
          element={
            <ProtectedRoute>
              <ClientDashboard />
            </ProtectedRoute>
          }
        />

        {/* 🔥 CREATE ORDER - Direct route for clients */}
        <Route
          path="/create-order"
          element={
            <ProtectedRoute>
              <CreateOrder />
            </ProtectedRoute>
          }
        />

        {/* 🔹 DYNAMIC MODULE-BASED PROTECTED ROUTES */}
        {routeConfig.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={
              <ProtectedRoute requiredModule={route.module}>
                {React.createElement(route.component)}
              </ProtectedRoute>
            }
          />
        ))}

        {/* 🔥 CLIENT SPECIFIC ROUTES */}
        {clientRoutes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={
              <ProtectedRoute>
                {React.createElement(route.component)}
              </ProtectedRoute>
            }
          />
        ))}

        {/* 🔹 Redirect based on authentication and role */}
        <Route
          path="/dashboard"
          element={
            <Navigate 
              to={loginType === "client" 
                ? "/client-dashboard" 
                : (userRole === "admin" ? "/admin-dashboard" : "/user-dashboard")} 
              replace 
            />
          }
        />

        {/* 🔹 Logout Route */}
        <Route
          path="/logout"
          element={
            <Navigate
              to="/"
              replace
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
              }}
            />
          }
        />

        {/* 🔥 DEFAULT FALLBACK - 404 Page */}
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Router>
  );
}

export default App;