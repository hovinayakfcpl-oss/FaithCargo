import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import logo from "../assets/logo.png";

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
      let res = await fetch("http://127.0.0.1:8000/accounts/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      let data = await res.json();

      if (res.status !== 200) {
        res = await fetch("http://127.0.0.1:8000/accounts/simple-login/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username.trim(),
            password: password.trim(),
          }),
        });

        data = await res.json();
      }

      if (res.status === 200 && data.access) {
        localStorage.setItem("token", data.access);
        localStorage.setItem("refresh", data.refresh);
        localStorage.setItem("username", data.username);
        localStorage.setItem("is_superuser", data.is_superuser);
        localStorage.setItem("is_staff", data.is_staff);

        alert(`Welcome ${data.username} 🚀`);

        if (data.is_superuser) {
          navigate("/admin-dashboard");
        } else {
          navigate("/user");
        }
      } else {
        alert(data.message || "Invalid credentials ❌");
      }
    } catch (err) {
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
        <img src={logo} alt="logo" className="login-logo" />
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

        {/* 🔥 NEW USER LOGIN BUTTON */}
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