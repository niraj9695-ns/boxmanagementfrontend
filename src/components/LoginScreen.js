import React, { useState } from "react";
import axios from "axios";
import "../css/styles.css";
import "../css/components.css";

function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); // reset error before new login attempt

    try {
      const response = await axios.post(
        "http://localhost:8080/api/auth/login",
        {
          username,
          password,
        }
      );

      // If backend returns token, save it
      if (response.data && response.data.token) {
        localStorage.setItem("token", response.data.token);
      }

      console.log("Login success:", response.data);

      // Notify parent (App.js or Router) that login was successful
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err) {
      console.error("Login failed:", err);
      setError("Invalid username or password. Please try again.");
    }
  };

  return (
    <div id="loginScreen" className="login-screen">
      <div className="login-container">
        <h1>Jewelry Management System</h1>
        <form id="loginForm" className="login-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Login
          </button>
        </form>

        {/* Show error message if login fails */}
        {error && <p className="error-message">{error}</p>}
      </div>
    </div>
  );
}

export default LoginScreen;
