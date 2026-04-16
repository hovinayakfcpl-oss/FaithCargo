import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Eye, EyeOff, User, Lock, LogIn, ArrowRight, 
  AlertCircle, CheckCircle, Shield, Zap, Users,
  Crown, Building, Phone, Mail, Building2, UserCircle,
  Code, Heart, Star, Globe, Clock, TrendingUp,
  Award, Target, Headphones, Truck, Package, Calculator
} from "lucide-react";
import "./Login.css";
import logo from "../assets/logo.png";

function Login() {
  const navigate = useNavigate();
  const [loginType, setLoginType] = useState("admin");
  const [username, setUsername] = useState("");
  const [clientId, setClientId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentTime, setCurrentTime] = useState("");

  // Current time for header
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Load saved credentials
  useEffect(() => {
    const savedLoginType = localStorage.getItem("savedLoginType");
    
    if (savedLoginType === "admin") {
      const savedUsername = localStorage.getItem("rememberedAdminUsername");
      const savedRemember = localStorage.getItem("rememberAdmin") === "true";
      if (savedUsername && savedRemember) {
        setUsername(savedUsername);
        setRememberMe(true);
        setLoginType("admin");
      }
    } else if (savedLoginType === "staff") {
      const savedUsername = localStorage.getItem("rememberedStaffUsername");
      const savedRemember = localStorage.getItem("rememberStaff") === "true";
      if (savedUsername && savedRemember) {
        setUsername(savedUsername);
        setRememberMe(true);
        setLoginType("staff");
      }
    } else if (savedLoginType === "client") {
      const savedClientId = localStorage.getItem("rememberedClientId");
      const savedRemember = localStorage.getItem("rememberClient") === "true";
      if (savedClientId && savedRemember) {
        setClientId(savedClientId);
        setRememberMe(true);
        setLoginType("client");
      }
    }
  }, []);

  // ========== ADMIN LOGIN ==========
  const handleAdminLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch("https://faithcargo.onrender.com/api/user/admin-login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (response.status === 200 && data.status === "success") {
        localStorage.clear();
        
        localStorage.setItem("token", "admin-token");
        localStorage.setItem("userRole", "admin");
        localStorage.setItem("is_superuser", "true");
        localStorage.setItem("username", data.username);
        localStorage.setItem("userId", data.id || "1");
        localStorage.setItem("loginType", "admin");
        
        const allModules = {
          fcpl_rate: true, pickup: true, vendor_manage: true, vendor_rates: true,
          rate_update: true, pincode: true, user_management: true,
          ba_b2b: true, create_order: true, shipment_details: true,
        };
        localStorage.setItem("userModules", JSON.stringify(allModules));
        
        if (rememberMe) {
          localStorage.setItem("rememberedAdminUsername", username.trim());
          localStorage.setItem("rememberAdmin", "true");
          localStorage.setItem("savedLoginType", "admin");
        }
        
        setSuccess(`Welcome Admin ${data.username}! Redirecting...`);
        
        setTimeout(() => {
          navigate("/admin-dashboard");
        }, 1500);
      } else {
        setError(data.error || "Invalid admin credentials");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ========== STAFF LOGIN ==========
  const handleStaffLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch("https://faithcargo.onrender.com/api/user/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (response.status === 200 && data.status === "success") {
        localStorage.clear();
        
        localStorage.setItem("token", "user-token");
        localStorage.setItem("userRole", "staff");
        localStorage.setItem("is_superuser", "false");
        localStorage.setItem("username", data.username);
        localStorage.setItem("userId", data.id || "1");
        localStorage.setItem("loginType", "staff");
        
        if (data.email) localStorage.setItem("userEmail", data.email);
        if (data.company) localStorage.setItem("userCompany", data.company);
        if (data.phone) localStorage.setItem("userPhone", data.phone);
        
        const modules = data.modules || {};
        localStorage.setItem("userModules", JSON.stringify(modules));
        
        if (rememberMe) {
          localStorage.setItem("rememberedStaffUsername", username.trim());
          localStorage.setItem("rememberStaff", "true");
          localStorage.setItem("savedLoginType", "staff");
        }
        
        setSuccess(`Welcome ${data.username}! Redirecting...`);
        
        setTimeout(() => {
          navigate("/user-dashboard");
        }, 1500);
      } else {
        if (data.use_client_login || (data.error && data.error.includes("Client"))) {
          setError("❌ This is a Client account. Please use 'Client' tab to login.");
          setLoginType("client");
        } else {
          setError(data.error || "Invalid staff credentials");
        }
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ========== CLIENT LOGIN - PROFESSIONAL VERSION ==========
  const handleClientLogin = async () => {
    const clientIdValue = clientId.trim().toUpperCase();
    const passwordValue = password.trim();
    
    if (!clientIdValue || !passwordValue) {
      setError("Please enter Client ID and Password");
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    // Primary endpoint
    const primaryEndpoint = "https://faithcargo.onrender.com/api/accounts/client-login/";
    
    try {
      const response = await fetch(primaryEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientIdValue,
          password: passwordValue,
        }),
      });
      
      const contentType = response.headers.get("content-type");
      
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        
        if (data.success) {
          // Successful login
          localStorage.clear();
          
          localStorage.setItem("clientToken", data.token);
          localStorage.setItem("clientId", clientIdValue);
          localStorage.setItem("userRole", "client");
          localStorage.setItem("loginType", "client");
          
          if (data.user) {
            localStorage.setItem("username", data.user.companyName || data.user.username);
            localStorage.setItem("clientName", data.user.companyName || data.user.username);
            localStorage.setItem("clientEmail", data.user.email || "");
            localStorage.setItem("clientPhone", data.user.phone || "");
            localStorage.setItem("clientCompany", data.user.companyName || "");
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
            localStorage.setItem("rememberedClientId", clientIdValue);
            localStorage.setItem("rememberClient", "true");
            localStorage.setItem("savedLoginType", "client");
          }
          
          setSuccess(`Welcome ${data.user?.companyName || clientIdValue}! Redirecting to Dashboard...`);
          
          setTimeout(() => {
            navigate("/client-dashboard");
          }, 1500);
          return;
        } else {
          setError(data.error || "Invalid Client ID or Password");
        }
      } else {
        setError("Server error. Please contact support.");
      }
    } catch (err) {
      console.error("Client login error:", err);
      setError("Unable to connect to server. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (loginType === "admin") {
      if (!username || !password) {
        setError("Please enter username & password");
        return;
      }
      await handleAdminLogin();
    } else if (loginType === "staff") {
      if (!username || !password) {
        setError("Please enter username & password");
        return;
      }
      await handleStaffLogin();
    } else if (loginType === "client") {
      if (!clientId || !password) {
        setError("Please enter Client ID & password");
        return;
      }
      await handleClientLogin();
    }
  };

  const getLoginTypeIcon = () => {
    switch(loginType) {
      case 'admin': return <Crown size={24} />;
      case 'staff': return <Users size={24} />;
      case 'client': return <Building2 size={24} />;
      default: return <User size={24} />;
    }
  };

  return (
    <div className="login-container">
      {/* Left Side - Brand Section */}
      <div className="login-left">
        <div className="animated-bg"></div>
        <div className="brand-content">
          <div className="trust-badge">
            <Shield size={32} />
            <span>ISO 9001:2015 Certified</span>
          </div>
          <h1>Faith Cargo</h1>
          <p className="tagline">Legacy of Trust Delivery</p>
          
          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-icon"><Truck size={20} /></div>
              <div className="feature-text">
                <h4>Real-time Tracking</h4>
                <p>Track your shipment live</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon"><Calculator size={20} /></div>
              <div className="feature-text">
                <h4>Rate Calculator</h4>
                <p>Instant freight calculation</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon"><Package size={20} /></div>
              <div className="feature-text">
                <h4>Easy Booking</h4>
                <p>Create orders in minutes</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon"><Headphones size={20} /></div>
              <div className="feature-text">
                <h4>24/7 Support</h4>
                <p>Dedicated customer care</p>
              </div>
            </div>
          </div>
          
          <div className="stats-container">
            <div className="stat-item">
              <strong>10K+</strong>
              <span>Shipments</span>
            </div>
            <div className="stat-item">
              <strong>500+</strong>
              <span>Clients</span>
            </div>
            <div className="stat-item">
              <strong>98%</strong>
              <span>On-Time Delivery</span>
            </div>
          </div>
        </div>
        
        {/* Developer Credit */}
        <div className="developer-credit">
          <Code size={14} />
          <span>Developed by <strong>Devora</strong> | Logistics Software Solutions</span>
          <Heart size={12} className="heart-icon" />
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="login-right">
        <div className="login-form-wrapper">
          <div className="logo-container">
            <img src={logo} alt="Faith Cargo" className="login-logo" />
            <div className="online-status"></div>
          </div>
          
          {/* Login Type Toggle */}
          <div className="login-tabs three-tabs">
            <button 
              className={`tab-btn ${loginType === 'admin' ? 'active' : ''}`}
              onClick={() => {
                setLoginType('admin');
                setError("");
                setUsername("");
                setClientId("");
                setPassword("");
              }}
            >
              <Crown size={16} />
              <span>Admin</span>
            </button>
            <button 
              className={`tab-btn ${loginType === 'staff' ? 'active' : ''}`}
              onClick={() => {
                setLoginType('staff');
                setError("");
                setUsername("");
                setClientId("");
                setPassword("");
              }}
            >
              <Users size={16} />
              <span>Staff</span>
            </button>
            <button 
              className={`tab-btn ${loginType === 'client' ? 'active' : ''}`}
              onClick={() => {
                setLoginType('client');
                setError("");
                setUsername("");
                setClientId("");
                setPassword("");
              }}
            >
              <Building2 size={16} />
              <span>Client</span>
            </button>
          </div>
          
          <div className="login-header">
            {getLoginTypeIcon()}
            <h2>
              {loginType === 'admin' && "Admin Portal"}
              {loginType === 'staff' && "Staff Portal"}
              {loginType === 'client' && "Client Portal"}
            </h2>
          </div>
          
          <p className="subtitle">
            {loginType === 'admin' && "Enter your superuser credentials to access admin dashboard"}
            {loginType === 'staff' && "Enter your credentials to access your assigned modules"}
            {loginType === 'client' && "Enter your Client ID and password to access your dashboard"}
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
          
          <form onSubmit={handleSubmit} className="login-form">
            {loginType === 'client' ? (
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
                    autoComplete="off"
                  />
                </div>
                <div className="input-hint">
                  <UserCircle size={12} />
                  <span>Example: FCPL001, CLIENT002, 002</span>
                </div>
              </div>
            ) : (
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
                    autoComplete="username"
                  />
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
                  autoComplete="current-password"
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
                <span className="loading-spinner">
                  <div className="spinner"></div>
                  Verifying...
                </span>
              ) : (
                <>
                  <LogIn size={18} />
                  {loginType === 'admin' && "Login as Admin"}
                  {loginType === 'staff' && "Login to Staff Dashboard"}
                  {loginType === 'client' && "Access Client Portal"}
                </>
              )}
            </button>
          </form>
          
          <div className="form-footer">
            <div className="divider">
              <span></span>
              <span>New to Faith Cargo?</span>
              <span></span>
            </div>
            <button className="signup-link" onClick={() => navigate("/signup")}>
              <ArrowRight size={16} />
              Create New Account
            </button>
          </div>
          
          <div className="security-note">
            <Shield size={14} />
            <span>Secure login with 256-bit encryption</span>
            <Clock size={12} />
            <span>{currentTime}</span>
          </div>
          
          <div className="dev-credit-inline">
            <Star size={12} />
            <span>Built with <span style={{color: '#ef4444'}}>❤️</span> by <strong>Devora Technologies</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;