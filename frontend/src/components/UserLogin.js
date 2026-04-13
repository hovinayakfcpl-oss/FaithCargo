import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, User, Lock, LogIn, ArrowLeft, AlertCircle, CheckCircle, Shield, Zap } from "lucide-react";
import "./UserLogin.css";
import logo from "../assets/logo.png";

function UserLogin() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load saved credentials if remember me was checked
  useEffect(() => {
    const savedUsername = localStorage.getItem("rememberedUsername");
    const savedRemember = localStorage.getItem("rememberMe") === "true";
    if (savedUsername && savedRemember) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!username || !password) {
      setError("Please enter username & password");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("https://faithcargo.onrender.com/api/user/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        localStorage.setItem("userRole", "user");
        
        // Store user modules - ONLY SELECTED MODULES FROM USERMANAGEMENT
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
        } else {
          localStorage.removeItem("rememberedUsername");
          localStorage.removeItem("rememberMe");
        }

        // Get list of enabled modules for success message
        const enabledModules = Object.keys(modules).filter(key => modules[key] === true);
        
        setSuccess(`Welcome ${data.username}! Redirecting... 🚀\n\nAvailable Modules: ${enabledModules.length}`);
        
        // Debug logs
        console.log("=== User Login Successful ===");
        console.log("Username:", data.username);
        console.log("User ID:", data.id);
        console.log("Company:", data.company);
        console.log("Modules Received:", modules);
        console.log("Enabled Modules:", enabledModules);
        
        setTimeout(() => {
          navigate("/user-dashboard");
          window.location.reload();
        }, 1500);
        
      } else {
        setError(data.error || "Invalid credentials ❌\nPlease check your username and password");
      }
    } catch (err) {
      console.error("Login Error:", err);
      setError("Server error ❌. Please check your internet or backend.");
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

      {/* RIGHT LOGIN FORM - Enhanced */}
      <div className="user-login-right">
        <div className="login-form-wrapper">
          <div className="logo-container">
            <img src={logo} alt="Faith Cargo Logo" className="login-logo" />
            <div className="online-status"></div>
          </div>
          <h2>Staff Portal Login</h2>
          <p className="subtitle">Enter your credentials to access your dashboard</p>

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
                  Login to Dashboard
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