import React, { useEffect, useState } from "react";
import axios from "axios";
import { Archive, Package, Edit, Trash2, BarChart } from "lucide-react";
import "../css/styles.css";
import "../css/components.css";

// ✅ React-Toastify
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Import child views
import ContainerDetails from "./ContainerDetails"; // (B)
import PieceManagement from "./PieceManagement"; // (C)

// Token handling
const TOKEN_KEYS = [
  "token",
  "authToken",
  "access_token",
  "jwt",
  "Authorization",
  "bearer_token",
];

function getStoredToken() {
  for (const k of TOKEN_KEYS) {
    const v = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (v) return v.startsWith("Bearer ") ? v.slice(7) : v;
  }
  try {
    const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.token) return parsed.token;
      if (parsed?.accessToken) return parsed.accessToken;
      if (parsed?.authToken) return parsed.authToken;
    }
  } catch {}
  return null;
}

function maskTokenHeader(authHeader) {
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (token.length <= 10) return "***";
  return `****${token.slice(-8)}`;
}

// Axios instance
const api = axios.create({
  baseURL: "http://localhost:8080/api",
  headers: { Accept: "application/json" },
});

api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
      if (
        ["post", "put", "patch"].includes(
          (config.method || "").toLowerCase()
        ) &&
        !config.headers["Content-Type"]
      ) {
        config.headers["Content-Type"] = "application/json";
      }
    } else {
      console.warn("[API] No auth token found.");
    }
    console.debug(
      `[API] ${(config.method || "").toUpperCase()} ${config.baseURL}${
        config.url
      }`,
      { Authorization: maskTokenHeader(config.headers?.Authorization) }
    );
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response) {
      const { status, data } = err.response;
      console.error("[API] Response error", status, data);
      if (status === 401)
        return Promise.reject(new Error("Unauthorized — please login."));
      if (status === 403)
        return Promise.reject(
          new Error("Forbidden — check token, permissions, or CORS.")
        );
    }
    return Promise.reject(err);
  }
);

// Modal
function Modal({ title, children, onClose }) {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div id="modalOverlay" className="modal-backdrop">
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h3 id="modalTitle">{title}</h3>
          <button id="closeModal" className="btn btn-close" onClick={onClose}>
            ✖
          </button>
        </div>
        <div id="modalBody" className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}

function CountersTab() {
  const [counters, setCounters] = useState([]);
  const [counterStats, setCounterStats] = useState({}); // { counterId: { boxes: n, trays: n } }
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  // NEW: navigation state
  const [activeView, setActiveView] = useState("counters");
  const [selectedCounter, setSelectedCounter] = useState(null);
  const [selectedContainer, setSelectedContainer] = useState(null);

  useEffect(() => {
    fetchCounters();
  }, []);

  const fetchCounters = async () => {
    try {
      setLoading(true);
      const res = await api.get("/counters");
      const countersList = res.data || [];
      setCounters(countersList);

      // Fetch box/tray stats for each counter
      countersList.forEach((counter) => {
        fetchBoxesForCounter(counter.id);
      });
    } catch (err) {
      console.error("Error fetching counters:", err?.message || err);
      toast.error("Failed to load counters. " + (err?.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const fetchBoxesForCounter = async (counterId) => {
    try {
      const res = await api.get("/boxes/by-counter", {
        params: { counterId },
      });
      const data = res.data || [];
      const boxes = data.filter((item) => item.type === "BOX").length;
      const trays = data.filter((item) => item.type === "TRAY").length;
      setCounterStats((prev) => ({
        ...prev,
        [counterId]: { boxes, trays },
      }));
    } catch (err) {
      console.error("Error fetching boxes for counter:", err?.message || err);
      toast.error("Failed to load boxes for counter.");
    }
  };

  const handleAddClick = () => {
    setFormData({ name: "", description: "" });
    setEditingId(null);
    setShowForm(true);
  };

  const handleEditClick = (counter) => {
    setFormData({
      name: counter.name || "",
      description: counter.description || "",
    });
    setEditingId(counter.id);
    setShowForm(true);
  };

  const handleDeleteClick = async (id) => {
    if (!window.confirm("Are you sure you want to delete this counter?"))
      return;
    try {
      await api.delete(`/counters/${id}`);
      setCounters((prev) => prev.filter((c) => c.id !== id));
      setCounterStats((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      toast.success("Counter deleted successfully ✅");
    } catch (err) {
      console.error("Delete failed:", err?.message || err);
      toast.error("Failed to delete counter. " + (err?.message || ""));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.warning("Name is required");
      return;
    }

    try {
      if (editingId) {
        const payload = {
          name: formData.name.trim(),
          description: formData.description?.trim(),
        };
        const res = await api.put(`/counters/${editingId}`, payload);
        const updated = res.data || { id: editingId, ...payload };
        setCounters((prev) =>
          prev.map((c) => (c.id === editingId ? updated : c))
        );
        toast.success("Counter updated successfully ✅");
      } else {
        const payload = {
          name: formData.name.trim(),
          description: formData.description?.trim(),
        };
        const res = await api.post("/counters", payload);
        const created = res.data || payload;
        setCounters((prev) => [...prev, created]);
        fetchBoxesForCounter(created.id);
        toast.success("Counter created successfully 🎉");
      }
      setShowForm(false);
    } catch (err) {
      console.error("Save failed:", err?.message || err);
      toast.error("Failed to save counter. " + (err?.message || ""));
    }
  };

  // ✅ Switch view to ContainerDetails (B)
  if (activeView === "containers" && selectedCounter) {
    return (
      <>
        <ContainerDetails
          counter={selectedCounter}
          onBack={() => {
            setSelectedCounter(null);
            setActiveView("counters");
          }}
          onManage={(container) => {
            setSelectedContainer(container);
            setActiveView("pieces");
          }}
        />
        <ToastContainer position="top-right" autoClose={2500} />
      </>
    );
  }

  // ✅ Switch view to PieceManagement (C)
  if (activeView === "pieces" && selectedContainer) {
    return (
      <>
        <PieceManagement
          container={selectedContainer}
          onBack={() => {
            setSelectedContainer(null);
            setActiveView("containers");
          }}
        />
        <ToastContainer position="top-right" autoClose={2500} />
      </>
    );
  }

  // Default view → counters list
  return (
    <div id="countersTab" className="tab-content active">
      <div className="section-header">
        <h2>Counter List</h2>
        <span id="counterCount" className="counter-count">
          {counters.length} counters created
        </span>
        <button
          id="addCounterBtn"
          className="btn btn-success"
          onClick={handleAddClick}
        >
          + Add Counter
        </button>
      </div>

      {showForm && (
        <Modal
          title={editingId ? "Edit Counter" : "Add New Counter"}
          onClose={() => setShowForm(false)}
        >
          <form id="counterForm" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="counterName">Counter Name</label>
              <input
                type="text"
                id="counterName"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="counterDescription">Description (Optional)</label>
              <textarea
                id="counterDescription"
                rows="3"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`btn ${editingId ? "btn-warning" : "btn-success"}`}
              >
                {editingId ? "Update Counter" : "Create Counter"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <div className="table-container">
        {loading ? (
          <p>Loading counters...</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Counter Name</th>
                <th>Boxes</th>
                <th>Trays</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="countersTableBody">
              {counters.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty-state">
                    <div className="empty-state-icon">
                      <Archive />
                    </div>
                    <h3>No counters found</h3>
                    <p>Create your first counter to get started</p>
                  </td>
                </tr>
              ) : (
                counters.map((counter) => {
                  const stats = counterStats[counter.id] || {
                    boxes: 0,
                    trays: 0,
                  };
                  return (
                    <tr key={counter.id}>
                      <td>
                        <strong>{counter.name}</strong>
                        {counter.description && (
                          <>
                            <br />
                            <small style={{ color: "#64748b" }}>
                              {counter.description}
                            </small>
                          </>
                        )}
                      </td>
                      <td>{stats.boxes}</td>
                      <td>{stats.trays}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-small btn-primary"
                            onClick={() => {
                              setSelectedCounter(counter);
                              setActiveView("containers");
                            }}
                          >
                            <Package /> Containers
                          </button>
                          <button
                            className="btn btn-small btn-warning"
                            onClick={() => handleEditClick(counter)}
                          >
                            <Edit />
                          </button>
                          <button
                            className="btn btn-small btn-danger"
                            onClick={() => handleDeleteClick(counter.id)}
                          >
                            <Trash2 />
                          </button>
                          <button className="btn btn-small btn-secondary">
                            <BarChart />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ✅ Toast container (always visible) */}
      <ToastContainer position="top-right" autoClose={2500} />
    </div>
  );
}

export default CountersTab;
