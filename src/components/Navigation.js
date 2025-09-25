import React from "react";
import "../css/styles.css";
import "../css/components.css";

// Import lucide-react icons
import { Archive, Package, Layers, BarChart3 } from "lucide-react";

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
        <BarChart3 size={20} style={{ marginRight: "8px" }} /> Reports
      </button>
    </nav>
  );
}

export default Navigation;
