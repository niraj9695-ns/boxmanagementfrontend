import React, { useState, useEffect } from "react";
import LoginScreen from "./components/LoginScreen";
import Header from "./components/Header";
import DashboardStats from "./components/DashboardStats";
import Navigation from "./components/Navigation";
import CountersTab from "./components/CountersTab";
import BoxManagement from "./components/BoxManagement";
import TrayManagement from "./components/TrayManagement";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState("counters"); // ✅ default tab

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  return (
    <>
      {!isLoggedIn ? (
        <LoginScreen onLoginSuccess={() => setIsLoggedIn(true)} />
      ) : (
        <div id="mainApp" className="main-app">
          <Header />
          <DashboardStats />

          {/* Pass activeTab & setActiveTab into Navigation */}
          <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

          <div className="content">
            {activeTab === "counters" && <CountersTab />}
            {activeTab === "boxes" && <BoxManagement />}
            {activeTab === "trays" && <TrayManagement />}
            {/* Add trays, reports later if needed */}
          </div>
        </div>
      )}
    </>
  );
}

export default App;
