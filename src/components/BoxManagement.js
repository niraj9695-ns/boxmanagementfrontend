import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Plus,
  Search,
  Gem,
  Settings,
  Edit2,
  Trash2,
  ArrowLeft,
  X,
  ArrowLeftRight,
} from "lucide-react";
import "../css/styles.css";
import "../css/components.css";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";

import PieceManagementBox from "./PieceManagementBox";

/* 🔹 Toastify */
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/* 🔹 Utility: Get JWT token (tolerant: strips 'Bearer ' if present) */
function getToken() {
  let t = localStorage.getItem("token");
  if (!t) return null;
  if (t.startsWith("Bearer ")) return t.slice(7);
  return t;
}

/* 🔹 Modal Component */
function Modal({ title, children, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button
            className="close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

/* 🔹 API Wrapper (updated endpoints) */
class BoxClass {
  static async getAll() {
    const res = await axios.get("http://localhost:8080/api/box/getAll", {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return res.data;
  }

  static async create(data) {
    const res = await axios.post("http://localhost:8080/api/box/add", data, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return res.data;
  }

  static async getById(id) {
    const res = await axios.get("http://localhost:8080/api/box/getById", {
      params: { id: id },
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return res.data;
  }

  static async update(id, data) {
    const res = await axios.put("http://localhost:8080/api/box/update", data, {
      params: { Id: id },
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return res.data;
  }

  // delete endpoint not included in your list — assuming pattern /api/box/delete?Id=...
  static async delete(id) {
    const res = await axios.delete("http://localhost:8080/api/box/delete", {
      params: { Id: id },
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return res.data;
  }
}

/* 🔹 Counter API helpers (use provided endpoints) */
const CounterAPI = {
  async getAll() {
    const res = await axios.get("http://localhost:8080/api/counter/getAll", {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return res.data;
  },

  async getById(id) {
    const res = await axios.get("http://localhost:8080/api/counter/getById", {
      params: { Id: id },
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return res.data;
  },
};

const BoxesTab = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("boxes"); // "boxes" | "pieces"
  const [selectedBoxId, setSelectedBoxId] = useState(null);

  // Modal states
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [showDelete, setShowDelete] = useState(null);
  // Transfer modal states
  const [showTransfer, setShowTransfer] = useState(null); // box object
  const [transferCounterId, setTransferCounterId] = useState("");
  const [allCounters, setAllCounters] = useState([]);

  /* 🔹 Fetch Boxes + Counters and merge counterName into boxes */
  useEffect(() => {
    refreshBoxes();
  }, []);

  const refreshBoxes = async () => {
    try {
      setLoading(true);

      // fetch boxes and counters in parallel
      const [boxesData, countersData] = await Promise.all([
        BoxClass.getAll(),
        CounterAPI.getAll(),
      ]);

      const countersMap = {};
      if (Array.isArray(countersData)) {
        countersData.forEach((c) => {
          countersMap[c.id] = c.name || `Counter ${c.id}`;
        });
      }

      const allBoxes = Array.isArray(boxesData) ? boxesData : [];

      // Filter to only BOX type for BoxesTab and enrich with counterName
      const filtered = allBoxes
        .filter((item) => (item.type || "").toUpperCase() === "BOX")
        .map((b) => ({
          ...b,
          counterName: b.counterId
            ? countersMap[b.counterId] ?? `Counter ${b.counterId}`
            : "",
        }));

      setBoxes(filtered);
    } catch (err) {
      console.error("Error fetching boxes or counters:", err);
      toast.error("Failed to fetch boxes or counters");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function loadCounters() {
      try {
        const data = await CounterAPI.getAll();
        setAllCounters(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load counters:", err);
      }
    }
    loadCounters();
  }, []);

  const handleTransferBox = async () => {
    if (!transferCounterId) {
      toast.error("Please select a destination counter");
      return;
    }

    try {
      await axios.post("http://localhost:8080/api/box/transfer", null, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        params: {
          boxId: showTransfer.id,
          counterId: transferCounterId,
        },
      });

      toast.success(`Box #${showTransfer.identity} transferred successfully`);

      setShowTransfer(null);
      setTransferCounterId("");
      refreshBoxes();
    } catch (err) {
      console.error("Transfer failed:", err?.response || err);
      toast.error(err?.response?.data || "Failed to transfer box");
    }
  };

  /* 🔹 Handlers */
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleManagePieces = (id) => {
    setSelectedBoxId(id);
    setView("pieces");
  };

  /* 🔹 Filtered boxes */
  const filteredBoxes = boxes.filter(
    (box) =>
      (box.identity || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (box.counterName || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  /* 🔹 Conditional Rendering */
  if (view === "pieces") {
    return (
      <div>
        <button
          className="btn btn-secondary flex items-center gap-2 mb-4"
          onClick={() => {
            setView("boxes");
            refreshBoxes(); // 🔹 Refresh boxes when returning
          }}
        >
          <ArrowLeft size={18} /> Back to Boxes
        </button>

        {/* 🔹 Pass only boxId (PieceManagement will fetch details itself) */}
        <PieceManagementBox boxId={selectedBoxId} />
      </div>
    );
  }

  return (
    <div id="boxesTab">
      <ToastContainer />

      {/* Section Header */}
      <div className="section-header flex items-center justify-between">
        <h2 className="text-xl font-semibold">All Boxes</h2>

        {/* 🔍 Search */}
        <div style={{ margin: "1rem 0" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              border: "1px solid #d1d5db", // light gray border
              borderRadius: "6px",
              padding: "6px 8px",
              backgroundColor: "#fff",
              maxWidth: "320px",
            }}
          >
            <Search size={18} style={{ color: "#6b7280" }} />
            <input
              type="text"
              id="boxesSearch"
              placeholder="Search boxes..."
              value={searchQuery}
              onChange={handleSearch}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                padding: "4px 8px",
                fontSize: "14px",
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            id="addBoxBtn"
            className="btn btn-success flex items-center gap-2"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={18} />
            Add New Box
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => refreshBoxes()}
            title="Refresh"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Boxes List */}
      <div className="boxes-container grid gap-4" id="boxesContainer">
        {loading ? (
          <p>Loading boxes...</p>
        ) : filteredBoxes.length > 0 ? (
          filteredBoxes.map((box) => (
            <div
              key={box.id}
              className="box-list-item border rounded p-4 shadow-sm bg-white"
            >
              {/* Box Header */}
              <div className="box-header">
                <div>
                  <h3 className="box-title">Box #{box.identity}</h3>
                  <div className="box-meta flex items-center gap-4 text-sm text-gray-600">
                    <span className="box-type-badge">{box.type}</span>
                    <div className="box-pieces flex items-center gap-1">
                      <Gem size={14} />
                      <span>
                        {box.totalPiece ?? box.totalPieces ?? 0} pieces
                      </span>
                    </div>
                    <span className="counter-name">
                      {box.counterName ?? `Counter ${box.counterId ?? "-"}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Box Weights */}
              <div className="box-weights grid grid-cols-2 md:grid-cols-4 gap-4 my-3">
                <div className="weight-item">
                  <div className="weight-column-label">Fixed Weight</div>
                  <div className="weight-column-value">
                    {box.fixedWeight ?? 0}g
                  </div>
                </div>
                <div className="weight-item">
                  <div className="weight-column-label">Net Weight</div>
                  <div className="weight-column-value">
                    {box.netWeight ?? 0}g
                  </div>
                </div>
                <div className="weight-item">
                  <div className="weight-column-label">Variable Weight</div>
                  <div className="weight-column-value">
                    {box.variableWeight ?? 0}g
                  </div>
                </div>
                <div className="weight-item">
                  <div className="weight-column-label">Gross Weight</div>
                  <div className="weight-column-value">
                    {box.grossWeight ?? 0}g
                  </div>
                </div>
              </div>

              {/* Box Actions */}
              <div className="box-actions flex items-center justify-between mt-3">
                {/* <div className="box-total font-semibold">
                  Total:{" "}
                  {(box.totalAll ?? 0).toFixed
                    ? (box.totalAll ?? 0).toFixed(3)
                    : "0.000"}
                  g
                </div> */}
                <div className="action-buttons flex gap-2">
                  <button
                    className="btn-manage flex items-center gap-1"
                    onClick={() => handleManagePieces(box.id)}
                  >
                    <Settings size={16} /> Manage
                  </button>
                  <button
                    className="btn btn-warning btn-small flex items-center gap-1"
                    onClick={async () => {
                      // fetch latest from server before editing to ensure fresh data
                      try {
                        const fresh = await BoxClass.getById(box.id);
                        // enrich fresh with counterName from counters API (fallback)
                        try {
                          const counter = await CounterAPI.getById(
                            fresh.counterId
                          );
                          fresh.counterName =
                            counter?.name ?? `Counter ${fresh.counterId}`;
                        } catch {
                          // ignore counter fetch failure; UI will fallback
                        }
                        setShowEdit(fresh);
                      } catch (err) {
                        console.error("Failed to fetch box details:", err);
                        toast.error("Failed to fetch box details for edit");
                      }
                    }}
                  >
                    <Edit2 size={16} /> Edit
                  </button>

                  <button
                    className="btn btn-danger btn-small flex items-center gap-1"
                    onClick={() => setShowDelete(box)}
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                  <button
                    className="btn btn-success btn-small flex items-center gap-1"
                    onClick={() => {
                      setShowTransfer(box);
                      setTransferCounterId("");
                    }}
                  >
                    <ArrowLeftRight size={16} /> Transfer
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No boxes found.</p>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <Modal title="Create New Box" onClose={() => setShowCreate(false)}>
          <CreateBoxForm
            onClose={() => setShowCreate(false)}
            onSaved={refreshBoxes}
          />
        </Modal>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <Modal title="Edit Box" onClose={() => setShowEdit(null)}>
          <EditBoxForm
            box={showEdit}
            onClose={() => setShowEdit(null)}
            onSaved={refreshBoxes}
          />
        </Modal>
      )}

      {/* Delete Modal */}
      {showDelete && (
        <Modal title="Delete Box" onClose={() => setShowDelete(null)}>
          <div className="confirmation-dialog">
            <p>
              Are you sure you want to delete{" "}
              <strong>Box #{showDelete.identity}</strong>?
            </p>
            <div className="confirmation-actions flex gap-2">
              <button
                onClick={() => setShowDelete(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await BoxClass.delete(showDelete.id);
                    toast.success("Box deleted successfully");
                    refreshBoxes();
                    setShowDelete(null);
                  } catch (err) {
                    console.error("Delete failed:", err);
                    toast.error("Failed to delete box");
                  }
                }}
                className="btn btn-danger"
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Transfer Modal */}
      {showTransfer && (
        <Modal
          title={`Transfer Box #${showTransfer.identity}`}
          onClose={() => setShowTransfer(null)}
        >
          <div className="form-group">
            <label>Destination Counter</label>
            <select
              value={transferCounterId}
              onChange={(e) => setTransferCounterId(e.target.value)}
              required
            >
              <option value="">Select Counter</option>
              {allCounters
                .filter((c) => c.id !== showTransfer.counterId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="form-actions flex gap-2 mt-4">
            <button
              className="btn btn-secondary"
              onClick={() => setShowTransfer(null)}
            >
              Cancel
            </button>
            <button className="btn btn-success" onClick={handleTransferBox}>
              Transfer
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

/* 🔹 Create Box Form */
function CreateBoxForm({ onClose, onSaved }) {
  const [identity, setIdentity] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [fixedWeight, setFixedWeight] = useState();
  const [counters, setCounters] = useState([]);
  const [counterId, setCounterId] = useState("");

  /* Fetch counters when modal opens (uses provided GET /api/counter/getAll) */
  useEffect(() => {
    async function fetchCounters() {
      try {
        const res = await axios.get(
          "http://localhost:8080/api/counter/getAll",
          {
            headers: { Authorization: `Bearer ${getToken()}` },
          }
        );
        setCounters(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error fetching counters:", err);
        toast.error("Failed to fetch counters");
      }
    }
    fetchCounters();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!counterId) {
      toast.error("Please select a counter");
      return;
    }
    try {
      const payload = {
        counterId: parseInt(counterId),
        type: "BOX",
        identity,
        fixedWeight: parseFloat(fixedWeight),
        // date included if backend accepts it
        date,
      };
      await BoxClass.create(payload); // POST /api/box/add
      toast.success("Box created successfully");
      onSaved();
      onClose();
    } catch (err) {
      console.error("Error creating box:", err);
      toast.error("Failed to create box");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      <div className="form-group">
        <label>Identity</label>
        <input
          type="text"
          value={identity}
          onChange={(e) => setIdentity(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label>Counter</label>
        <select
          value={counterId}
          onChange={(e) => setCounterId(e.target.value)}
          required
        >
          <option value="">Select Counter</option>
          {counters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>Date</label>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            format="YYYY-MM-DD" // keep backend format
            value={dayjs(date)} // convert stored string → dayjs
            onChange={(newValue) => {
              if (newValue) setDate(newValue.format("YYYY-MM-DD")); // store as string
            }}
            slotProps={{ textField: { fullWidth: true, required: true } }}
          />
        </LocalizationProvider>
      </div>

      <div className="form-group">
        <label>Fixed Weight (g)</label>
        <input
          type="number"
          step="0.01"
          value={fixedWeight}
          onChange={(e) => setFixedWeight(parseFloat(e.target.value))}
          required
        />
      </div>
      <div className="form-actions flex gap-2">
        <button type="button" onClick={onClose} className="btn btn-secondary">
          Cancel
        </button>
        <button type="submit" className="btn btn-success">
          Create
        </button>
      </div>
    </form>
  );
}

/* 🔹 Edit Box Form */
function EditBoxForm({ box, onClose, onSaved }) {
  const [identity, setIdentity] = useState(box.identity || "");
  const [date, setDate] = useState(
    box.createdAt
      ? box.createdAt.split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [fixedWeight, setFixedWeight] = useState(box.fixedWeight ?? 0);
  const [type, setType] = useState(box.type ?? "BOX");
  const [counterName, setCounterName] = useState(box.counterName ?? "");

  // If counterName not provided on box, fetch via counter/getById
  useEffect(() => {
    async function ensureCounterName() {
      if (!counterName && box.counterId) {
        try {
          const c = await axios.get(
            "http://localhost:8080/api/counter/getById",
            {
              params: { Id: box.counterId },
              headers: { Authorization: `Bearer ${getToken()}` },
            }
          );
          setCounterName(c.data?.name ?? `Counter ${box.counterId}`);
        } catch {
          // ignore - we'll fallback to id
          setCounterName(`Counter ${box.counterId}`);
        }
      }
    }
    ensureCounterName();
  }, [box.counterId, counterName]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        type,
        identity,
        fixedWeight: parseFloat(fixedWeight),
        // include date if backend accepts it
        date,
      };
      await BoxClass.update(box.id, payload); // PUT /api/box/update?Id=...
      toast.success("Box updated successfully");
      onSaved();
      onClose();
    } catch (err) {
      console.error("Error updating box:", err);
      toast.error("Failed to update box");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      <div className="form-group">
        <label>Identity</label>
        <input
          type="text"
          value={identity}
          onChange={(e) => setIdentity(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label>Counter</label>
        <input type="text" value={counterName} readOnly />
      </div>

      <div className="form-group">
        <label>Type</label>
        <select value={type} onChange={(e) => setType(e.target.value)} required>
          <option value="BOX">BOX</option>
          <option value="TRAY">TRAY</option>
        </select>
      </div>

      <div className="form-group">
        <label>Date</label>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            format="YYYY-MM-DD"
            value={dayjs(date)}
            onChange={(newValue) => {
              if (newValue) setDate(newValue.format("YYYY-MM-DD"));
            }}
            slotProps={{ textField: { fullWidth: true, required: true } }}
          />
        </LocalizationProvider>
      </div>

      <div className="form-group">
        <label>Fixed Weight (g)</label>
        <input
          type="number"
          step="0.01"
          value={fixedWeight}
          onChange={(e) => setFixedWeight(parseFloat(e.target.value))}
          required
        />
      </div>
      <div className="form-actions flex gap-2">
        <button type="button" onClick={onClose} className="btn btn-secondary">
          Cancel
        </button>
        <button type="submit" className="btn btn-warning">
          Update
        </button>
      </div>
    </form>
  );
}

export default BoxesTab;
