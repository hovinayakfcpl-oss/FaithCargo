import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Eye, EyeOff, Lock, LogIn, ArrowLeft, AlertCircle, 
  CheckCircle, Shield, Zap, Building, 
  Truck, Package, DollarSign, Clock, MapPin, Phone, Mail,
  Building2, CreditCard, FileText, Info, User, ArrowRight,
  Star, Award, Users, Headphones, Globe, Wallet, Box
} from "lucide-react";
import "./UserLogin.css";
import logo from "../assets/logo.png";

function UserLogin() {
  const navigate = useNavigate();

  // ========== LOGIN TYPE STATE ==========
  const [loginType, setLoginType] = useState("client"); // Default to client
  
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
    } else if (savedLoginType === "staff") {
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
    try {
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
        localStorage.clear();

        localStorage.setItem("token", "user-login-token");
        localStorage.setItem("is_superuser", data.is_superuser || "false");
        localStorage.setItem("username", data.username);
        localStorage.setItem("userId", data.user_id || "1");
        localStorage.setItem("userRole", data.role === "admin" ? "admin" : "staff");
        localStorage.setItem("loginType", "staff");
        
        const modules = data.modules || {};
        localStorage.setItem("userModules", JSON.stringify(modules));
        
        if (data.email) localStorage.setItem("userEmail", data.email);
        if (data.company) localStorage.setItem("userCompany", data.company);
        if (data.phone) localStorage.setItem("userPhone", data.phone);
        
        if (rememberMe) {
          localStorage.setItem("rememberedUsername", username.trim());
          localStorage.setItem("rememberMe", "true");
          localStorage.setItem("savedLoginType", "staff");
        } else {
          localStorage.removeItem("rememberedUsername");
          localStorage.removeItem("rememberMe");
        }

        setSuccess(`Welcome ${data.username}! Redirecting... 🚀`);
        
        setTimeout(() => {
          if (data.role === "admin") {
            navigate("/admin-dashboard");
          } else {
            navigate("/user-dashboard");
          }
          window.location.reload();
        }, 1500);
      } else {
        setError(data.error || "Invalid staff credentials ❌");
      }
    } catch (err) {
      setError("Server error ❌. Please try again.");
    }
  };

  // ========== CLIENT LOGIN ==========
  const handleClientLogin = async () => {
    try {
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
        localStorage.clear();

        localStorage.setItem("clientToken", data.token);
        localStorage.setItem("clientId", clientId.trim().toUpperCase());
        localStorage.setItem("userRole", "client");
        localStorage.setItem("loginType", "client");
        
        if (data.user) {
          localStorage.setItem("clientName", data.user.companyName || data.user.username);
          localStorage.setItem("clientEmail", data.user.email || "");
          localStorage.setItem("clientPhone", data.user.phone || "");
          localStorage.setItem("clientCompany", data.user.companyName || "");
          localStorage.setItem("clientGstin", data.user.gstin || "");
          localStorage.setItem("clientAddress", data.user.address || "");
        }
        
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
        
        if (rememberMe) {
          localStorage.setItem("rememberedClientId", clientId.trim().toUpperCase());
          localStorage.setItem("rememberClient", "true");
          localStorage.setItem("savedLoginType", "client");
        } else {
          localStorage.removeItem("rememberedClientId");
          localStorage.removeItem("rememberClient");
        }

        setSuccess(`Welcome ${data.user?.companyName || clientId}! Redirecting... 🚀`);
        
        setTimeout(() => {
          navigate("/ba-b2b-rate-calculator");
          window.location.reload();
        }, 1500);
      } else {
        setError(data.error || "Invalid Client ID or Password ❌");
      }
    } catch (err) {
      setError("Server error ❌. Please try again.");
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
      setLoading(true);
      await handleStaffLogin();
      setLoading(false);
    } else {
      if (!clientId || !password) {
        setError("Please enter Client ID & password");
        return;
      }
      setLoading(true);
      await handleClientLogin();
      setLoading(false);
    }
  };

  return (
    <div className="user-login-container">
      {/* LEFT DECORATION */}
      <div className="user-login-left">
        <div className="animated-bg"></div>
        <div className="overlay-content">
          <div className="trust-badge">
            <Award size={28} />
            <span>ISO 9001:2015 Certified</span>
          </div>
          <h2>Faith Cargo Logistics</h2>
          <p className="tagline">Your Trusted Logistics Partner</p>
          <div className="features-list">
            <div className="feature-item"><Zap size={18} /><span>Real-time Tracking</span></div>
            <div className="feature-item"><Calculator size={18} /><span>Instant Rate Calculator</span></div>
            <div className="feature-item"><FileText size={18} /><span>Digital Documentation</span></div>
            <div className="feature-item"><Headphones size={18} /><span>24/7 Support</span></div>
            <div className="feature-item"><Shield size={18} /><span>Secure Shipping</span></div>
            <div className="feature-item"><Globe size={18} /><span>Pan India Service</span></div>
          </div>
          <div className="support-info">
            <Phone size={16} />
            <span>Need help? Call us: <strong>+91 9818641504</strong></span>
          </div>
        </div>
      </div>

      {/* RIGHT LOGIN FORM */}
      <div className="user-login-right">
        <div className="login-form-wrapper">
          <div className="logo-container">
            <img src={logo} alt="Faith Cargo" className="login-logo" />
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

          <h2>{loginType === 'staff' ? 'Staff Portal' : 'Client Portal'}</h2>
          <p className="subtitle">
            {loginType === 'staff' 
              ? 'Enter your credentials to access staff dashboard' 
              : 'Login to access rate calculator & create orders'}
          </p>

          {error && (
            <div className="alert alert-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

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
                    placeholder="Enter your Client ID"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value.toUpperCase())}
                    disabled={loading}
                  />
                </div>
                <div className="input-hint">
                  <Info size={12} />
                  <span>Enter the Client ID provided by your account manager</span>
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
                <span>Verifying...</span>
              ) : (
                <>
                  <LogIn size={18} />
                  {loginType === 'staff' ? 'Login to Staff Dashboard' : 'Access Client Portal'}
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
              Back to Home
            </button>
          </div>

          {loginType === 'client' && (
            <div className="client-info-note">
              <div className="note-header">
                <Info size={14} />
                <span>New to Faith Cargo?</span>
              </div>
              <p>Contact your account manager to get your Client ID and credentials.</p>
              <div className="contact-details">
                <Phone size={12} /> <span>+91 9818641504</span>
                <Mail size={12} /> <span>care@faithcargo.com</span>
              </div>
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