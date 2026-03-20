import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

function Login() {
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
      const res = await fetch("https://faithcargo.onrender.com/accounts/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch (err) {
        console.error("JSON error:", err);
      }

      console.log("LOGIN RESPONSE:", data);

      if (res.ok && data.access) {
        // ✅ Save tokens and user info
        localStorage.setItem("token", data.access);
        localStorage.setItem("refresh", data.refresh || "");
        localStorage.setItem("username", data.username || "");
        localStorage.setItem("is_superuser", data.is_superuser ? "true" : "false");

        alert(`Welcome ${data.username} 🚀`);

        // ✅ Correct routes
        if (data.is_superuser) {
          navigate("/admin-dashboard");
        } else {
          navigate("/user-dashboard");   // 🔥 FIXED
        }
      } else {
        alert(data.message || "Invalid credentials ❌");
      }
    } catch (err) {
      console.error("Network error:", err);
      alert("Server / Network error ❌");
    }

    setLoading(false);
  };

  return (
    <div className="login-container">
      {/* LEFT */}
      <div className="login-left">
        <h2>Manage your logistics easily 🚚</h2>
      </div>

      {/* RIGHT */}
      <div className="login-right">
        <h2>Login</h2>

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

        <div style={{ marginTop: "15px", textAlign: "center" }}>
          <button
            onClick={() => navigate("/user-login")}
            style={{
              background: "#333",
              color: "#fff",
              padding: "10px 15px",
              border: "none",
              cursor: "pointer",
              borderRadius: "5px"
            }}
          >
            User Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
