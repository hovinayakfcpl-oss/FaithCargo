import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./UserLogin.css";
import logo from "../assets/logo.png";

function UserLogin() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      alert("Please enter username & password");
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
        // 1. पुराने डेटा को साफ़ करें ताकि नया डेटा ही काम करे
        localStorage.clear();

        // 2. नए टोकन और मॉड्यूल परमिशन सेव करें
        localStorage.setItem("token", "user-login-token");
        localStorage.setItem("is_superuser", "false"); // स्टाफ लॉगिन के लिए false
        
        // 🔥 यह लाइन आपके नए मॉड्यूल्स (Create Order, Shipment) को Sidebar में दिखाएगी
        localStorage.setItem("userModules", JSON.stringify(data.modules));
        
        // यूजर का नाम सेव करें
        localStorage.setItem("username", data.username);

        alert(`Welcome ${data.username} 🚀`);

        // 3. डैशबोर्ड पर भेजें
        navigate("/user-dashboard");
        
        // 4. 🔥 सिस्‍टम को रिफ्रेश करें ताकि Sidebar डेटाबेस से आई नई Permissions को तुरंत पढ़ सके
        window.location.reload();

      } else {
        alert(data.error || "Invalid credentials ❌");
      }
    } catch (err) {
      console.error("Login Error:", err);
      alert("Server error ❌. Please check your internet or backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-login-container">
      {/* LEFT DECORATION */}
      <div className="user-login-left">
        <div className="overlay-content">
          <h2>Faith Cargo Logistics 🔐</h2>
          <p>Login with your staff credentials to access assigned modules.</p>
        </div>
      </div>

      {/* RIGHT LOGIN FORM */}
      <div className="user-login-right">
        <div className="login-form-wrapper">
          <img src={logo} alt="Faith Cargo Logo" className="login-logo" />
          <h2>Staff Portal Login</h2>
          <p className="subtitle">Enter your details below</p>

          <form onSubmit={handleLogin} className="login-form">
            <div className="input-field">
              <i className="fas fa-user"></i>
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="input-field">
              <i className="fas fa-lock"></i>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <span><i className="fas fa-spinner fa-spin"></i> Verifying...</span>
              ) : (
                "Login to Dashboard"
              )}
            </button>
          </form>

          <div className="form-footer">
            <p className="back-link" onClick={() => navigate("/")}>
              <i className="fas fa-arrow-left"></i> Back to Admin Login
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserLogin;