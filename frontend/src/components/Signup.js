import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Eye, EyeOff, User, Lock, LogIn, ArrowRight, 
  AlertCircle, CheckCircle, Shield, Zap, Users,
  Crown, Building, Phone, Mail
} from "lucide-react";
import "./Login.css";
import logo from "../assets/logo.png";

function Login() {
  const navigate = useNavigate();
  const [isAdminLogin, setIsAdminLogin] = useState(true); // Toggle between Admin and User login
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load saved credentials
  React.useEffect(() => {
    const savedUsername = localStorage.getItem("rememberedAdminUsername");
    const savedRemember = localStorage.getItem("rememberAdmin") === "true";
    if (savedUsername && savedRemember) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!username || !password) {
      setError("Please enter username & password");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("https://faithcargo.onrender.com/api/admin-login/", {
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
        
        // Admin has all modules access
        const allModules = {
          fcpl_rate: true,
          pickup: true,
          vendor_manage: true,
          vendor_rates: true,
          rate_update: true,
          pincode: true,
          user_management: true,
          ba_b2b: true,
          create_order: true,
          shipment_details: true,
        };
        localStorage.setItem("userModules", JSON.stringify(allModules));
        
        if (rememberMe) {
          localStorage.setItem("rememberedAdminUsername", username.trim());
          localStorage.setItem("rememberAdmin", "true");
        } else {
          localStorage.removeItem("rememberedAdminUsername");
          localStorage.removeItem("rememberAdmin");
        }

        setSuccess(`Welcome Admin ${data.username}! Redirecting...`);
        
        setTimeout(() => {
          navigate("/admin-dashboard");
        }, 1500);
      } else {
        setError(data.error || "Invalid admin credentials");
      }
    } catch (err) {
      console.error("Login Error:", err);
      setError("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUserLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!username || !password) {
      setError("Please enter username & password");
      return;
    }

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
        localStorage.setItem("userRole", "user");
        localStorage.setItem("is_superuser", "false");
        localStorage.setItem("username", data.username);
        localStorage.setItem("userId", data.id || "1");
        
        if (data.email) localStorage.setItem("userEmail", data.email);
        if (data.company) localStorage.setItem("userCompany", data.company);
        if (data.phone) localStorage.setItem("userPhone", data.phone);
        
        const modules = data.modules || {};
        localStorage.setItem("userModules", JSON.stringify(modules));
        
        if (rememberMe) {
          localStorage.setItem("rememberedUserUsername", username.trim());
          localStorage.setItem("rememberUser", "true");
        } else {
          localStorage.removeItem("rememberedUserUsername");
          localStorage.removeItem("rememberUser");
        }

        const enabledModules = Object.keys(modules).filter(key => modules[key] === true);
        setSuccess(`Welcome ${data.username}! You have access to ${enabledModules.length} modules. Redirecting...`);
        
        setTimeout(() => {
          navigate("/user-dashboard");
        }, 1500);
      } else {
        setError(data.error || "Invalid user credentials");
      }
    } catch (err) {
      console.error("Login Error:", err);
      setError("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = isAdminLogin ? handleAdminLogin : handleUserLogin;

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
          <p className="tagline">Your Trusted Logistics Partner</p>
          
          <div className="features">
            <div className="feature">
              <Zap size={20} />
              <span>Real-time Shipment Tracking</span>
            </div>
            <div className="feature">
              <Building size={20} />
              <span>Warehouse Management</span>
            </div>
            <div className="feature">
              <Phone size={20} />
              <span>24/7 Customer Support</span>
            </div>
            <div className="feature">
              <Mail size={20} />
              <span>Instant Rate Calculator</span>
            </div>
          </div>
          
          <div className="stats">
            <div className="stat">
              <strong>10K+</strong>
              <span>Shipments</span>
            </div>
            <div className="stat">
              <strong>500+</strong>
              <span>Clients</span>
            </div>
            <div className="stat">
              <strong>98%</strong>
              <span>On-Time Delivery</span>
            </div>
          </div>
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
          <div className="login-tabs">
            <button 
              className={`tab-btn ${isAdminLogin ? 'active' : ''}`}
              onClick={() => {
                setIsAdminLogin(true);
                setError("");
                setUsername("");
                setPassword("");
              }}
            >
              <Crown size={18} />
              Admin Login
            </button>
            <button 
              className={`tab-btn ${!isAdminLogin ? 'active' : ''}`}
              onClick={() => {
                setIsAdminLogin(false);
                setError("");
                setUsername("");
                setPassword("");
              }}
            >
              <Users size={18} />
              User Login
            </button>
          </div>
          
          <h2>{isAdminLogin ? "Admin Portal" : "Staff Portal"}</h2>
          <p className="subtitle">
            {isAdminLogin 
              ? "Enter your superuser credentials to access admin dashboard" 
              : "Enter your credentials to access your assigned modules"}
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
          
          <form onSubmit={handleSubmit} className="login-form">
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
                  {isAdminLogin ? "Login as Admin" : "Login to Dashboard"}
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;