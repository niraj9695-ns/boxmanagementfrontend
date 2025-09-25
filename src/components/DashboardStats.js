import React, { useEffect, useState } from "react";
import "../css/styles.css";
import "../css/components.css";

// Import Lucide React icons
import { Archive, Package, Layers, Gem } from "lucide-react";

function DashboardStats() {
  const [stats, setStats] = useState({
    counters: 0,
    boxes: 0,
    trays: 0,
    stock: 0,
  });

  // Replace this with your actual token (or get from localStorage/context)
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Counters
        const countersRes = await fetch("http://localhost:8080/api/counters", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const countersData = await countersRes.json();

        // Fetch Boxes + Trays
        const boxesRes = await fetch("http://localhost:8080/api/boxes", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const boxesData = await boxesRes.json();

        // Bifurcate boxes and trays based on type
        const totalBoxes = boxesData.filter(
          (item) => item.type === "BOX"
        ).length;
        const totalTrays = boxesData.filter(
          (item) => item.type === "TRAY"
        ).length;

        setStats({
          counters: countersData.length || 0,
          boxes: totalBoxes,
          trays: totalTrays,
          stock: boxesData.length || 0, // assuming stock entries = total from /api/boxes
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      }
    };

    fetchData();
  }, [token]);

  return (
    <div className="dashboard-stats">
      <div className="stat-card blue">
        <div className="stat-icon">
          <Archive size={32} />
        </div>
        <div className="stat-content">
          <div className="stat-label">Total Counters</div>
          <div className="stat-value">{stats.counters}</div>
        </div>
      </div>

      <div className="stat-card green">
        <div className="stat-icon">
          <Package size={32} />
        </div>
        <div className="stat-content">
          <div className="stat-label">Total Boxes</div>
          <div className="stat-value">{stats.boxes}</div>
        </div>
      </div>

      <div className="stat-card orange">
        <div className="stat-icon">
          <Layers size={32} />
        </div>
        <div className="stat-content">
          <div className="stat-label">Total Trays</div>
          <div className="stat-value">{stats.trays}</div>
        </div>
      </div>

      <div className="stat-card purple">
        <div className="stat-icon">
          <Gem size={32} />
        </div>
        <div className="stat-content">
          <div className="stat-label">Total Stock Entries</div>
          <div className="stat-value">{stats.stock}</div>
        </div>
      </div>
    </div>
  );
}

export default DashboardStats;
