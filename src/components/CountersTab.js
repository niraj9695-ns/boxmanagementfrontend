import React, { useEffect, useRef, useState } from "react";

import axios from "axios";
import { Archive, Package, Edit, Trash2, BarChart } from "lucide-react";
import "../css/styles.css";
import "../css/components.css";

import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import ContainerDetails from "./ContainerDetails";
import PieceManagement from "./PieceManagement";

// Token handling (unchanged)
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

/* centralized axios instance (used across requests) */
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
    // Diagnostic: log request with masked token
    console.debug(
      `[API] REQUEST ${(config.method || "").toUpperCase()} ${config.baseURL}${
        config.url
      }`,
      {
        Authorization: maskTokenHeader(config.headers?.Authorization),
        params: config.params,
        data: config.data,
      }
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

/* Modal component (unchanged) */
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
  const [counterStats, setCounterStats] = useState({}); // { counterId: { boxes, trays } }
  const [allBoxes, setAllBoxes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "" });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // navigation state
  const [activeView, setActiveView] = useState("counters");
  const [selectedCounter, setSelectedCounter] = useState(null);
  const [selectedContainer, setSelectedContainer] = useState(null);

  const inputRef = useRef(null);

  useEffect(() => {
    if (showForm && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [showForm]);

  useEffect(() => {
    fetchCountersAndBoxes();
  }, []);

  // Debug: log navigation and selectedCounter changes
  useEffect(() => {
    console.debug("[CountersTab] activeView changed:", activeView);
  }, [activeView]);

  useEffect(() => {
    console.debug("[CountersTab] selectedCounter changed:", selectedCounter);
  }, [selectedCounter]);

  // Fetch counters + all boxes -> build stats map
  const fetchCountersAndBoxes = async () => {
    try {
      setLoading(true);
      const [cRes, bRes] = await Promise.all([
        api.get("/counter/getAll"),
        api.get("/box/getAll"),
      ]);
      const countersList = cRes.data || [];
      const boxesList = Array.isArray(bRes.data) ? bRes.data : [];

      setCounters(countersList);
      setAllBoxes(boxesList);

      const stats = {};
      boxesList.forEach((b) => {
        const cid = b.counterId ?? null;
        if (cid == null) return;
        if (!stats[cid]) stats[cid] = { boxes: 0, trays: 0 };
        const t = (b.type || "").toUpperCase();
        if (t === "BOX") stats[cid].boxes += 1;
        else if (t === "TRAY") stats[cid].trays += 1;
      });

      countersList.forEach((c) => {
        if (!stats[c.id]) stats[c.id] = { boxes: 0, trays: 0 };
      });

      setCounterStats(stats);
    } catch (err) {
      console.error("Error fetching counters/boxes", err?.response ?? err);
      const message =
        err?.response?.data?.message || err?.message || "Unknown error";
      toast.error("Failed to load counters/boxes: " + message);
    } finally {
      setLoading(false);
    }
  };

  // refresh only boxes & recompute stats
  const refreshBoxesAndStats = async () => {
    try {
      const boxesRes = await api.get("/box/getAll");
      const boxesList = Array.isArray(boxesRes.data) ? boxesRes.data : [];
      setAllBoxes(boxesList);

      const stats = {};
      boxesList.forEach((b) => {
        const cid = b.counterId ?? null;
        if (cid == null) return;
        if (!stats[cid]) stats[cid] = { boxes: 0, trays: 0 };
        const t = (b.type || "").toUpperCase();
        if (t === "BOX") stats[cid].boxes += 1;
        else if (t === "TRAY") stats[cid].trays += 1;
      });

      counters.forEach((c) => {
        if (!stats[c.id]) stats[c.id] = { boxes: 0, trays: 0 };
      });

      setCounterStats(stats);
    } catch (err) {
      console.error("Error refreshing boxes", err?.response ?? err);
      toast.error("Failed to refresh boxes: " + (err?.message || ""));
    }
  };

  // Open add modal
  const handleAddClick = () => {
    setFormData({ name: "" });
    setEditingId(null);
    setShowForm(true);
  };

  // Open edit modal: fetch latest single counter from server to populate form
  const handleEditClick = async (counter) => {
    try {
      // fetch fresh copy from server (GET /counter/getById?Id=...)
      const res = await api.get("/counter/getById", {
        params: { Id: counter.id },
      });
      const serverCounter = res.data || counter;
      setFormData({ name: serverCounter.name || "" });
      setEditingId(serverCounter.id);
      setShowForm(true);
    } catch (err) {
      console.error("Failed to fetch counter for edit", err?.response ?? err);
      setFormData({ name: counter.name || "" });
      setEditingId(counter.id);
      setShowForm(true);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Could not fetch latest counter";
      toast.warn("Editing using cached value. " + msg);
    }
  };

  // Delete counter
  const handleDeleteClick = async (id) => {
    if (!window.confirm("Are you sure you want to delete this counter?"))
      return;
    try {
      const res = await api.delete("/counter/delete", { params: { Id: id } });
      const msg =
        (res && typeof res.data === "string"
          ? res.data
          : "Counter deleted successfully") || "Counter deleted successfully";
      setCounters((prev) => prev.filter((c) => c.id !== id));
      setCounterStats((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      toast.success(msg + " ✅");
    } catch (err) {
      console.error("Delete failed", err?.response ?? err);
      const message =
        err?.response?.data?.message || err?.message || "Delete failed";
      toast.error("Failed to delete counter: " + message);
    }
  };

  // Submit add/edit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      toast.warning("Name is required");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const payload = { name: formData.name.trim() };

        // Clear, explicit URL format (with query param)
        const url = `/counter/update?id=${editingId}`;

        // Diagnostic: log outgoing URL + payload
        console.info("[CountersTab] PUT ->", url, "payload:", payload);
        const res = await api.put(url, payload);
        const updated = res.data || { id: editingId, ...payload };

        setCounters((prev) =>
          prev.map((c) => (c.id === editingId ? updated : c))
        );
        toast.success("Counter updated successfully ✅");

        // optionally refresh boxes/stats in case associated things changed
        await refreshBoxesAndStats();
      } else {
        const payload = { name: formData.name.trim() };
        const res = await api.post("/counter/add", payload);
        const created = res.data || payload;
        setCounters((prev) => [...prev, created]);
        setCounterStats((prev) => {
          const copy = { ...prev };
          if (created?.id)
            copy[created.id] = copy[created.id] || { boxes: 0, trays: 0 };
          return copy;
        });
        toast.success("Counter created successfully 🎉");
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({ name: "" });
    } catch (err) {
      console.error("Save failed:", err?.response ?? err);

      // If server provides structured error, show it
      const response = err?.response;
      if (response) {
        console.group("[CountersTab] Server error details");
        console.log("status:", response.status);
        console.log("headers:", response.headers);
        console.log("data:", response.data);
        console.groupEnd();
        const serverMessage =
          (response.data &&
            (response.data.message ||
              response.data.error ||
              JSON.stringify(response.data))) ||
          response.statusText ||
          "Server returned an error";

        if (response.status === 403) {
          // Useful hint to user
          toast.error(
            `Forbidden (403): ${serverMessage} — Check that your token includes required role(s) for this operation.`
          );
        } else {
          toast.error("Failed to save counter: " + serverMessage);
        }
      } else {
        toast.error("Failed to save counter: " + (err?.message || "Unknown"));
      }
    } finally {
      setSaving(false);
    }
  };

  // Navigation views
  if (activeView === "containers" && selectedCounter) {
    console.debug(
      "[CountersTab] Rendering ContainerDetails - selectedCounter:",
      selectedCounter
    );
    return (
      <>
        <ContainerDetails
          counter={selectedCounter}
          onBack={() => {
            console.debug(
              "[CountersTab] ContainerDetails onBack clicked - returning to counters view"
            );
            setSelectedCounter(null);
            setActiveView("counters");
          }}
          onManage={(container) => {
            console.debug(
              "[CountersTab] ContainerDetails onManage -> selected container:",
              container
            );
            setSelectedContainer(container);
            setActiveView("pieces");
          }}
        />
        <ToastContainer position="top-right" autoClose={2500} />
      </>
    );
  }

  if (activeView === "pieces" && selectedContainer) {
    console.debug(
      "[CountersTab] Rendering PieceManagement - selectedContainer:",
      selectedContainer
    );
    return (
      <>
        <PieceManagement
          container={selectedContainer}
          onBack={() => {
            console.debug(
              "[CountersTab] PieceManagement onBack clicked - returning to containers view"
            );
            setSelectedContainer(null);
            setActiveView("containers");
          }}
        />
        <ToastContainer position="top-right" autoClose={2500} />
      </>
    );
  }

  // Default: counters list
  return (
    <div id="countersTab" className="tab-content active">
      <div className="section-header">
        <h2>Counter List</h2>
        <span id="counterCount" className="counter-count">
          {counters.length} counters created
        </span>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            id="addCounterBtn"
            className="btn btn-success"
            onClick={handleAddClick}
          >
            + Add Counter
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => refreshBoxesAndStats()}
            title="Refresh boxes/trays stats"
          >
            Refresh Stats
          </button>
        </div>
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
                ref={inputRef}
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                disabled={saving}
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`btn ${editingId ? "btn-warning" : "btn-success"}`}
                disabled={saving}
              >
                {saving
                  ? editingId
                    ? "Saving..."
                    : "Creating..."
                  : editingId
                  ? "Update Counter"
                  : "Create Counter"}
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
                              console.debug(
                                "[CountersTab] Containers button clicked for counter:",
                                counter
                              );
                              if (!counter || !counter.id) {
                                console.warn(
                                  "[CountersTab] Counter is missing id or falsy:",
                                  counter
                                );
                                toast.error(
                                  "Counter not available. Cannot open containers view."
                                );
                                return;
                              }
                              // set the selectedCounter then navigate
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

      <ToastContainer position="top-right" autoClose={2500} />
    </div>
  );
}

export default CountersTab;
