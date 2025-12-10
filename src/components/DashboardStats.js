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
  const [loading, setLoading] = useState(true);

  // Get token from localStorage and normalize it (strip "Bearer " if present)
  let rawToken = localStorage.getItem("token");
  if (rawToken?.startsWith("Bearer ")) rawToken = rawToken.slice(7);
  const token = rawToken || null;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const headers = token
          ? {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            }
          : { "Content-Type": "application/json" };

        // Fetch Counters
        const countersRes = await fetch(
          "http://localhost:8080/api/counter/getAll",
          { headers }
        );
        let countersData = [];
        if (countersRes.ok) {
          countersData = await countersRes.json();
        } else {
          console.warn(
            "Failed to fetch counters:",
            countersRes.status,
            countersRes.statusText
          );
        }

        // Fetch Boxes + Trays (single endpoint returns both types)
        const boxesRes = await fetch("http://localhost:8080/api/box/getAll", {
          headers,
        });
        let boxesData = [];
        if (boxesRes.ok) {
          boxesData = await boxesRes.json();
        } else {
          console.warn(
            "Failed to fetch boxes:",
            boxesRes.status,
            boxesRes.statusText
          );
        }

        // Bifurcate boxes and trays based on type
        const totalBoxes = Array.isArray(boxesData)
          ? boxesData.filter((item) => item.type === "BOX").length
          : 0;
        const totalTrays = Array.isArray(boxesData)
          ? boxesData.filter((item) => item.type === "TRAY").length
          : 0;

        // Fetch Total Pieces (assuming endpoint: /api/piece/getAll)
        const piecesRes = await fetch(
          "http://localhost:8080/api/pieces/getAll",
          {
            headers,
          }
        );
        let piecesData = [];
        if (piecesRes.ok) {
          piecesData = await piecesRes.json();
        } else {
          console.warn(
            "Failed to fetch pieces:",
            piecesRes.status,
            piecesRes.statusText
          );
        }
        const totalPieces = Array.isArray(piecesData) ? piecesData.length : 0;

        // Update stats state
        setStats({
          counters: Array.isArray(countersData) ? countersData.length : 0,
          boxes: totalBoxes,
          trays: totalTrays,
          stock: totalPieces,
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
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
          <div className="stat-value">{loading ? "…" : stats.counters}</div>
        </div>
      </div>

      <div className="stat-card green">
        <div className="stat-icon">
          <Package size={32} />
        </div>
        <div className="stat-content">
          <div className="stat-label">Total Boxes</div>
          <div className="stat-value">{loading ? "…" : stats.boxes}</div>
        </div>
      </div>

      <div className="stat-card orange">
        <div className="stat-icon">
          <Layers size={32} />
        </div>
        <div className="stat-content">
          <div className="stat-label">Total Trays</div>
          <div className="stat-value">{loading ? "…" : stats.trays}</div>
        </div>
      </div>

      <div className="stat-card purple">
        <div className="stat-icon">
          <Gem size={32} />
        </div>
        <div className="stat-content">
          <div className="stat-label">Total Pieces</div>
          <div className="stat-value">{loading ? "…" : stats.stock}</div>
        </div>
      </div>
    </div>
  );
}

export default DashboardStats;
