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
          username,
          password,
        }),
      });

      const data = await res.json();

if (res.status === 200 && data.status === "success") {

  // 🔥 ADD THIS LINE (MOST IMPORTANT)
  localStorage.setItem("token", "user-login-token");

  localStorage.setItem("userModules", JSON.stringify(data.modules));
  localStorage.setItem("userName", data.username);

  alert(`Welcome ${data.username} 🚀`);

  navigate("/user-dashboard");
} else {
        alert(data.error || "Invalid credentials ❌");
      }
    } catch (err) {
      console.error(err);
      alert("Server error ❌");
    }

    setLoading(false);
  };

  return (
    <div className="user-login-container">
      {/* LEFT */}
      <div className="user-login-left">
        <h2>User Access Panel 🔐</h2>
        <p>Login to access your assigned modules</p>
      </div>

      {/* RIGHT */}
      <div className="user-login-right">
        <img src={logo} alt="logo" className="login-logo" />

        <h2>User Login</h2>

        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Username"
            className="input-box"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="input-box"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="back-link" onClick={() => navigate("/")}>
          ← Back to Admin Login
        </p>
      </div>
    </div>
  );
}

export default UserLogin;