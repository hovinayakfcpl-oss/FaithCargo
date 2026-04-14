import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Eye, EyeOff, User, Lock, LogIn, ArrowLeft, AlertCircle, 
  CheckCircle, Shield, Zap, Briefcase, Building, Users, 
  Truck, Package, DollarSign, Clock, MapPin, Phone, Mail,
  UserCircle, Store, Building2, CreditCard, FileText,
  Info
} from "lucide-react";
import "./UserLogin.css";
import logo from "../assets/logo.png";

function UserLogin() {
  const navigate = useNavigate();

  // ========== LOGIN TYPE STATE ==========
  const [loginType, setLoginType] = useState("staff"); // "staff" or "client"
  
  const [username, setUsername] = useState("");
  const [clientId, setClientId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load saved credentials if remember me was checked
  useEffect(() => {
    const savedLoginType = localStorage.getItem("savedLoginType");
    if (savedLoginType === "client") {
      const savedClientId = localStorage.getItem("rememberedClientId");
      const savedRemember = localStorage.getItem("rememberClient") === "true";
      if (savedClientId && savedRemember) {
        setClientId(savedClientId);
        setRememberMe(true);
        setLoginType("client");
      }
    } else {
      const savedUsername = localStorage.getItem("rememberedUsername");
      const savedRemember = localStorage.getItem("rememberMe") === "true";
      if (savedUsername && savedRemember) {
        setUsername(savedUsername);
        setRememberMe(true);
        setLoginType("staff");
      }
    }
  }, []);

  // ========== STAFF LOGIN ==========
  const handleStaffLogin = async () => {
    const res = await fetch("https://faithcargo.onrender.com/api/user/login/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username.trim(),
        password: password.trim(),
      }),
    });

    const data = await res.json();

    if (res.status === 200 && data.status === "success") {
      // Clear old data
      localStorage.clear();

      // Store authentication data
      localStorage.setItem("token", "user-login-token");
      localStorage.setItem("is_superuser", "false");
      localStorage.setItem("username", data.username);
      localStorage.setItem("userId", data.id || "1");
      localStorage.setItem("userRole", "staff");
      localStorage.setItem("loginType", "staff");
      
      // Store user modules
      const modules = data.modules || {};
      localStorage.setItem("userModules", JSON.stringify(modules));
      
      // Store user details
      if (data.email) localStorage.setItem("userEmail", data.email);
      if (data.company) localStorage.setItem("userCompany", data.company);
      if (data.phone) localStorage.setItem("userPhone", data.phone);
      if (data.address) localStorage.setItem("userAddress", data.address);
      if (data.gstin) localStorage.setItem("userGstin", data.gstin);
      
      // Handle remember me
      if (rememberMe) {
        localStorage.setItem("rememberedUsername", username.trim());
        localStorage.setItem("rememberMe", "true");
        localStorage.setItem("savedLoginType", "staff");
      } else {
        localStorage.removeItem("rememberedUsername");
        localStorage.removeItem("rememberMe");
      }

      const enabledModules = Object.keys(modules).filter(key => modules[key] === true);
      setSuccess(`Welcome ${data.username}! Redirecting to Staff Dashboard... 🚀`);
      
      console.log("=== Staff Login Successful ===");
      console.log("Username:", data.username);
      console.log("Modules:", enabledModules);
      
      setTimeout(() => {
        navigate("/user-dashboard");
        window.location.reload();
      }, 1500);
    } else {
      setError(data.error || "Invalid staff credentials ❌");
    }
  };

  // ========== CLIENT LOGIN ==========
  const handleClientLogin = async () => {
    const res = await fetch("https://faithcargo.onrender.com/api/auth/client-login/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: clientId.trim().toUpperCase(),
        password: password.trim(),
      }),
    });

    const data = await res.json();

    if (data.success) {
      // Clear old data
      localStorage.clear();

      // Store client authentication data
      localStorage.setItem("clientToken", data.token);
      localStorage.setItem("clientId", clientId.trim().toUpperCase());
      localStorage.setItem("userRole", "client");
      localStorage.setItem("loginType", "client");
      
      // Store client details
      if (data.user) {
        localStorage.setItem("clientName", data.user.companyName || data.user.username);
        localStorage.setItem("clientEmail", data.user.email || "");
        localStorage.setItem("clientPhone", data.user.phone || "");
        localStorage.setItem("clientCompany", data.user.companyName || "");
        localStorage.setItem("clientGstin", data.user.gstin || "");
      }
      
      // Store client-specific modules/permissions
      const clientModules = {
        ba_b2b: true,
        create_order: true,
        shipment_details: true,
        fcpl_rate: false,
        pickup: false,
        vendor_manage: false,
        vendor_rates: false,
        rate_update: false,
        pincode: false,
        user_management: false
      };
      localStorage.setItem("userModules", JSON.stringify(clientModules));
      
      // Handle remember me
      if (rememberMe) {
        localStorage.setItem("rememberedClientId", clientId.trim().toUpperCase());
        localStorage.setItem("rememberClient", "true");
        localStorage.setItem("savedLoginType", "client");
      } else {
        localStorage.removeItem("rememberedClientId");
        localStorage.removeItem("rememberClient");
      }

      setSuccess(`Welcome ${data.user?.companyName || clientId}! Redirecting to Rate Calculator... 🚀`);
      
      console.log("=== Client Login Successful ===");
      console.log("Client ID:", clientId);
      console.log("Client Name:", data.user?.companyName);
      
      setTimeout(() => {
        navigate("/ba-b2b-rate-calculator");
        window.location.reload();
      }, 1500);
    } else {
      setError(data.error || "Invalid client credentials ❌\nPlease check your Client ID and Password");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (loginType === "staff") {
      if (!username || !password) {
        setError("Please enter username & password");
        return;
      }
    } else {
      if (!clientId || !password) {
        setError("Please enter Client ID & password");
        return;
      }
    }

    setLoading(true);

    try {
      if (loginType === "staff") {
        await handleStaffLogin();
      } else {
        await handleClientLogin();
      }
    } catch (err) {
      console.error("Login Error:", err);
      setError("Server error ❌. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-login-container">
      {/* LEFT DECORATION - Enhanced */}
      <div className="user-login-left">
        <div className="animated-bg"></div>
        <div className="overlay-content">
          <div className="trust-badge">
            <Shield size={32} />
            <span>ISO 9001:2015 Certified</span>
          </div>
          <h2>Faith Cargo Logistics</h2>
          <p className="tagline">Your Trusted Logistics Partner</p>
          <div className="features-list">
            <div className="feature-item">
              <Zap size={18} />
              <span>Real-time Shipment Tracking</span>
            </div>
            <div className="feature-item">
              <Zap size={18} />
              <span>Instant Rate Calculator</span>
            </div>
            <div className="feature-item">
              <Zap size={18} />
              <span>Digital Documentation</span>
            </div>
            <div className="feature-item">
              <Zap size={18} />
              <span>24/7 Customer Support</span>
            </div>
          </div>
          <div className="support-info">
            <p>Need help? Call us: <strong>+91 9311801079</strong></p>
          </div>
        </div>
      </div>

      {/* RIGHT LOGIN FORM - Enhanced with Login Type Toggle */}
      <div className="user-login-right">
        <div className="login-form-wrapper">
          <div className="logo-container">
            <img src={logo} alt="Faith Cargo Logo" className="login-logo" />
            <div className="online-status"></div>
          </div>
          
          {/* Login Type Toggle */}
          <div className="login-type-toggle">
            <button 
              className={`toggle-btn ${loginType === 'staff' ? 'active' : ''}`}
              onClick={() => {
                setLoginType('staff');
                setError('');
                setSuccess('');
              }}
            >
              <Users size={16} />
              Staff Login
            </button>
            <button 
              className={`toggle-btn ${loginType === 'client' ? 'active' : ''}`}
              onClick={() => {
                setLoginType('client');
                setError('');
                setSuccess('');
              }}
            >
              <Building2 size={16} />
              Client Login
            </button>
          </div>

          <h2>{loginType === 'staff' ? 'Staff Portal Login' : 'Client Portal Login'}</h2>
          <p className="subtitle">
            {loginType === 'staff' 
              ? 'Enter your credentials to access staff dashboard' 
              : 'Enter your Client ID and password to access rate calculator'}
          </p>

          {/* Error Alert */}
          {error && (
            <div className="alert alert-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="alert alert-success">
              <CheckCircle size={18} />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="login-form">
            {loginType === 'staff' ? (
              <div className="input-group">
                <label>Username</label>
                <div className="input-field">
                  <User size={18} className="input-icon" />
                  <input
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    disabled={loading}
                  />
                </div>
              </div>
            ) : (
              <div className="input-group">
                <label>Client ID</label>
                <div className="input-field">
                  <Building2 size={18} className="input-icon" />
                  <input
                    type="text"
                    placeholder="Enter your Client ID (e.g., CLIENT001)"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value.toUpperCase())}
                    autoComplete="off"
                    disabled={loading}
                  />
                </div>
                <div className="input-hint">
                  <Package size={12} />
                  <span>Enter the Client ID provided by admin</span>
                </div>
              </div>
            )}

            <div className="input-group">
              <label>Password</label>
              <div className="input-field">
                <Lock size={18} className="input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <button type="button" className="forgot-link" onClick={() => navigate("/forgot-password")}>
                Forgot Password?
              </button>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <span>
                  <i className="fas fa-spinner fa-spin"></i> Verifying...
                </span>
              ) : (
                <>
                  <LogIn size={18} />
                  {loginType === 'staff' ? 'Login to Staff Dashboard' : 'Access Rate Calculator'}
                </>
              )}
            </button>
          </form>

          <div className="form-footer">
            <div className="divider">
              <span></span>
              <span>or</span>
              <span></span>
            </div>
            <button className="back-link" onClick={() => navigate("/")}>
              <ArrowLeft size={16} />
              Back to Admin Login
            </button>
          </div>

          {loginType === 'client' && (
            <div className="client-info-note">
              <div className="note-header">
                <Info size={14} />
                <span>New to Faith Cargo?</span>
              </div>
              <p>Contact your account manager to get your Client ID and credentials.</p>
            </div>
          )}

          <div className="security-note">
            <Shield size={14} />
            <span>Secure login with 256-bit encryption</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserLogin;