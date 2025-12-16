import React from "react";
import "../css/styles.css";
import "../css/components.css";

// Import lucide-react icons
import {
  Archive,
  Package,
  Layers,
  BarChart3,
  Gem,
  ScanLine,
  ScanBarcode,
  Settings,
} from "lucide-react";

function Navigation({ activeTab, setActiveTab }) {
  return (
    <nav className="navigation">
      <button
        className={`nav-btn ${activeTab === "counters" ? "active" : ""}`}
        onClick={() => setActiveTab("counters")}
      >
        <Archive size={20} style={{ marginRight: "8px" }} /> Counters
      </button>

      <button
        className={`nav-btn ${activeTab === "boxes" ? "active" : ""}`}
        onClick={() => setActiveTab("boxes")}
      >
        <Package size={20} style={{ marginRight: "8px" }} /> Boxes
      </button>

      <button
        className={`nav-btn ${activeTab === "trays" ? "active" : ""}`}
        onClick={() => setActiveTab("trays")}
      >
        <Layers size={20} style={{ marginRight: "8px" }} /> Trays
      </button>

      <button
        className={`nav-btn ${activeTab === "reports" ? "active" : ""}`}
        onClick={() => setActiveTab("reports")}
      >
        <Gem size={20} style={{ marginRight: "8px" }} /> Pieces
      </button>

      <button
        className={`nav-btn ${activeTab === "scanner" ? "active" : ""}`}
        onClick={() => setActiveTab("scanner")}
      >
        <ScanLine size={20} style={{ marginRight: "8px" }} /> Scanner
      </button>

      <button
        className={`nav-btn ${activeTab === "settings" ? "active" : ""}`}
        onClick={() => setActiveTab("settings")}
      >
        <Settings size={20} style={{ marginRight: "8px" }} /> Settings
      </button>

      <button
        className={`nav-btn ${activeTab === "transactions" ? "active" : ""}`}
        onClick={() => setActiveTab("transactions")}
      >
        <Settings size={20} style={{ marginRight: "8px" }} /> Transactions
      </button>
    </nav>
  );
}

export default Navigation;
