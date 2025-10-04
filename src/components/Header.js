import React from "react";
import "../css/styles.css";
import "../css/components.css";

function Header() {
  const handleLogout = () => {
    // Remove token from localStorage
    localStorage.removeItem("token");

    // Optionally clear other user info
    localStorage.removeItem("user");

    // Redirect to login page (adjust path as per your app)
    window.location.href = "/login";
  };

  return (
    <header className="header">
      <div className="header-content">
        <h1>Inventory Management</h1>
        <div className="header-controls">
          {/* <select id="typeSelector" className="type-selector">
            <option value="Gold">Gold</option>
            <option value="Silver">Silver</option>
            <option value="Diamond">Diamond</option>
          </select> */}
          <div className="user-info">
            <span id="currentUser">admin</span>
            <button
              id="logoutBtn"
              className="btn btn-secondary"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
