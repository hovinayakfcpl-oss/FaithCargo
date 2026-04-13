import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  User, Lock, Phone, Mail, Building, Eye, EyeOff, 
  AlertCircle, CheckCircle, Shield, ArrowLeft, 
  UserPlus, Zap, Award, Crown, Truck, Package
} from "lucide-react";
import "./Signup.css";
import logo from "../assets/logo.png";

function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    rePassword: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    gstin: ""
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showRePassword, setShowRePassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateForm = () => {
    if (!formData.username || !formData.password || !formData.rePassword || !formData.phone) {
      setError("Please fill all required fields");
      return false;
    }
    
    if (formData.password !== formData.rePassword) {
      setError("Passwords do not match");
      return false;
    }
    
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    
    if (formData.phone.length < 10) {
      setError("Please enter a valid 10-digit phone number");
      return false;
    }
    
    if (!agreeTerms) {
      setError("Please agree to the Terms & Conditions");
      return false;
    }
    
    return true;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const response = await fetch("https://faithcargo.onrender.com/api/user/add-user/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
          address: formData.address,
          gstin: formData.gstin.toUpperCase(),
          // Default permissions for new signups (limited access)
          fcpl_rate: true,
          pickup: true,
          vendor_manage: false,
          vendor_rates: false,
          rate_update: false,
          pincode: false,
          user_management: false,
          ba_b2b: false,
          create_order: true,
          shipment_details: true,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.status === "User created successfully") {
        setSuccess(`Welcome ${formData.username}! Your account has been created successfully. Redirecting to login...`);
        
        setTimeout(() => {
          navigate("/user-login");
        }, 2000);
      } else {
        setError(data.error || "Signup failed. Please try again.");
      }
    } catch (error) {
      console.error("Error during signup:", error);
      setError("Something went wrong. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      {/* Left Side - Brand Section */}
      <div className="signup-left">
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
              <Truck size={20} />
              <span>Real-time Shipment Tracking</span>
            </div>
            <div className="feature">
              <Package size={20} />
              <span>Instant Rate Calculator</span>
            </div>
            <div className="feature">
              <Zap size={20} />
              <span>Fast & Reliable Delivery</span>
            </div>
            <div className="feature">
              <Award size={20} />
              <span>24/7 Customer Support</span>
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

      {/* Right Side - Signup Form */}
      <div className="signup-right">
        <div className="signup-form-wrapper">
          <div className="logo-container">
            <img src={logo} alt="Faith Cargo" className="signup-logo" />
            <div className="online-status"></div>
          </div>
          
          <h2>Create Account</h2>
          <p className="subtitle">Join Faith Cargo Logistics Platform</p>
          
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
          
          <form onSubmit={handleSignup} className="signup-form">
            <div className="form-row">
              <div className="input-group">
                <label>Username *</label>
                <div className="input-field">
                  <User size={18} className="input-icon" />
                  <input
                    type="text"
                    name="username"
                    placeholder="Enter username"
                    value={formData.username}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </div>
              
              <div className="input-group">
                <label>Email (Optional)</label>
                <div className="input-field">
                  <Mail size={18} className="input-icon" />
                  <input
                    type="email"
                    name="email"
                    placeholder="Enter email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
            
            <div className="form-row">
              <div className="input-group">
                <label>Password *</label>
                <div className="input-field">
                  <Lock size={18} className="input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Enter password"
                    value={formData.password}
                    onChange={handleChange}
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
              
              <div className="input-group">
                <label>Confirm Password *</label>
                <div className="input-field">
                  <Lock size={18} className="input-icon" />
                  <input
                    type={showRePassword ? "text" : "password"}
                    name="rePassword"
                    placeholder="Confirm password"
                    value={formData.rePassword}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowRePassword(!showRePassword)}
                  >
                    {showRePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="form-row">
              <div className="input-group">
                <label>Phone Number *</label>
                <div className="input-field">
                  <Phone size={18} className="input-icon" />
                  <input
                    type="tel"
                    name="phone"
                    placeholder="10-digit mobile number"
                    value={formData.phone}
                    onChange={handleChange}
                    maxLength="10"
                    disabled={loading}
                  />
                </div>
              </div>
              
              <div className="input-group">
                <label>Company Name</label>
                <div className="input-field">
                  <Building size={18} className="input-icon" />
                  <input
                    type="text"
                    name="company"
                    placeholder="Your company name"
                    value={formData.company}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
            
            <div className="form-row">
              <div className="input-group full-width">
                <label>Address</label>
                <div className="input-field">
                  <input
                    type="text"
                    name="address"
                    placeholder="Your full address"
                    value={formData.address}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
            
            <div className="form-row">
              <div className="input-group">
                <label>GSTIN (Optional)</label>
                <div className="input-field">
                  <input
                    type="text"
                    name="gstin"
                    placeholder="15-digit GST number"
                    value={formData.gstin}
                    onChange={handleChange}
                    maxLength="15"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
            
            <div className="terms-checkbox">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  disabled={loading}
                />
                <span>
                  I agree to the <a href="#">Terms & Conditions</a> and 
                  <a href="#"> Privacy Policy</a>
                </span>
              </label>
            </div>
            
            <button type="submit" className="signup-btn" disabled={loading}>
              {loading ? (
                <span>
                  <i className="fas fa-spinner fa-spin"></i> Creating Account...
                </span>
              ) : (
                <>
                  <UserPlus size={18} />
                  Create Account
                </>
              )}
            </button>
          </form>
          
          <div className="form-footer">
            <div className="divider">
              <span></span>
              <span>Already have an account?</span>
              <span></span>
            </div>
            <button className="back-link" onClick={() => navigate("/user-login")}>
              <ArrowLeft size={16} />
              Back to Login
            </button>
          </div>
          
          <div className="security-note">
            <Shield size={14} />
            <span>Secure registration with 256-bit encryption</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup;