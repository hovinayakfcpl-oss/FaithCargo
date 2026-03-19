import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("https://faithcargo.onrender.com/auth/forgot-password/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("Password reset link sent to your email.");
      } else {
        setMessage(data.error || "Something went wrong.");
      }
    } catch (err) {
      console.error("Forgot password error:", err);
      setMessage("Server error. Please try again.");
    }
  };

  return (
    <div className="login-container">
      <div className="login-right">
        <h1 className="logo-text">Faith Cargo Pvt Ltd</h1>
        <h2>Forgot Password</h2>
        <p>Enter your registered email to reset password</p>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            className="input-box"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div className="buttons">
            <button type="submit" className="login-btn">Send Reset Link</button>
            <button type="button" className="reset-btn" onClick={() => navigate("/")}>Back to Login</button>
          </div>
        </form>

        {message && <p className="result-box">{message}</p>}
      </div>
    </div>
  );
}

export default ForgotPassword;
