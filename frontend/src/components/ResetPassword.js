import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./Login.css";

function ResetPassword() {
  const { uid, token } = useParams();   // 🔹 URL params from reset link
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    try {
      const res = await fetch(`http://127.0.0.1:8000/auth/reset-password/${uid}/${token}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Password reset successful! Redirecting to login...");
        setTimeout(() => navigate("/"), 2000);
      } else {
        setMessage(data.error || "Reset failed. Try again.");
      }
    } catch (err) {
      console.error("Reset error:", err);
      setMessage("Server error. Please try again.");
    }
  };

  return (
    <div className="login-container">
      <div className="login-right">
        <h1 className="logo-text">Faith Cargo Pvt Ltd</h1>
        <h2>Reset Password</h2>
        <p>Enter your new password below</p>

        <form onSubmit={handleReset}>
          <input
            type="password"
            placeholder="New Password"
            className="input-box"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Confirm Password"
            className="input-box"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <div className="buttons">
            <button type="submit" className="login-btn">Reset Password</button>
            <button type="button" className="reset-btn" onClick={() => navigate("/")}>Back to Login</button>
          </div>
        </form>

        {message && <p className="result-box">{message}</p>}
      </div>
    </div>
  );
}

export default ResetPassword;
