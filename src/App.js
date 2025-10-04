import React, { useState, useEffect } from "react";
import LoginScreen from "./components/LoginScreen";
import Header from "./components/Header";
import DashboardStats from "./components/DashboardStats";
import Navigation from "./components/Navigation";
import CountersTab from "./components/CountersTab";
import BoxManagement from "./components/BoxManagement";
import TrayManagement from "./components/TrayManagement";
import GetAllPieces from "./components/GetAllPieces";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState("counters"); // ✅ default tab
  const [fade, setFade] = useState(false);

  // Check login state
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  // Handle fade animation when tab changes
  useEffect(() => {
    setFade(false); // reset
    const timer = setTimeout(() => setFade(true), 50); // trigger after small delay
    return () => clearTimeout(timer);
  }, [activeTab]);

  return (
    <>
      {!isLoggedIn ? (
        <LoginScreen onLoginSuccess={() => setIsLoggedIn(true)} />
      ) : (
        <div id="mainApp" className="main-app">
          <Header />
          <DashboardStats />

          {/* Navigation */}
          <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* Content with fade transition */}
          <div className={`content ${fade ? "fade" : ""}`}>
            {activeTab === "counters" && <CountersTab />}
            {activeTab === "boxes" && <BoxManagement />}
            {activeTab === "trays" && <TrayManagement />}
            {activeTab === "reports" && <GetAllPieces />}
          </div>
        </div>
      )}
    </>
  );
}

export default App;
