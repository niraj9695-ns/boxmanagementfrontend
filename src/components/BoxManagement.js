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
} from "lucide-react";
import "../css/styles.css";
import "../css/components.css";

import PieceManagementBox from "./PieceManagementBox";

/* 🔹 Utility: Get JWT token */
function getToken() {
  return localStorage.getItem("token");
}

/* 🔹 Modal Component */
function Modal({ title, children, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

/* 🔹 API Wrapper */
class BoxClass {
  static async getAll() {
    const res = await axios.get("http://localhost:8080/api/boxes", {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return res.data;
  }

  static async create(data) {
    const res = await axios.post("http://localhost:8080/api/boxes", data, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return res.data;
  }

  static async update(id, data) {
    const res = await axios.put(`http://localhost:8080/api/boxes/${id}`, data, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return res.data;
  }

  static async delete(id) {
    await axios.delete(`http://localhost:8080/api/boxes/${id}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return true;
  }
}

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

  /* 🔹 Fetch Boxes */
  useEffect(() => {
    refreshBoxes();
  }, []);

  const refreshBoxes = async () => {
    try {
      setLoading(true);
      const data = await BoxClass.getAll();
      const filtered = data.filter((item) => item.type === "BOX");
      setBoxes(filtered);
    } catch (err) {
      console.error("Error fetching boxes:", err);
    } finally {
      setLoading(false);
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
      box.identity?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      box.counterName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /* 🔹 Conditional Rendering */
  if (view === "pieces") {
    return (
      <div>
        <button
          className="btn btn-secondary flex items-center gap-2 mb-4"
          onClick={() => setView("boxes")}
        >
          <ArrowLeft size={18} /> Back to Boxes
        </button>
        {/* 🔹 Now using only boxId (PieceManagement will fetch details itself) */}
        <PieceManagementBox boxId={selectedBoxId} />
      </div>
    );
  }

  return (
    <div id="boxesTab">
      {/* Section Header */}
      <div className="section-header flex items-center justify-between">
        <h2 className="text-xl font-semibold">All Boxes</h2>
        <button
          id="addBoxBtn"
          className="btn btn-success flex items-center gap-2"
          onClick={() => setShowCreate(true)}
        >
          <Plus size={18} />
          Add New Box
        </button>
      </div>

      {/* Search */}
      <div className="search-container my-4">
        <div className="search-box flex items-center border rounded px-2 py-1">
          <Search size={18} className="text-gray-500" />
          <input
            type="text"
            id="boxesSearch"
            placeholder="Search boxes..."
            className="search-input flex-1 outline-none px-2"
            value={searchQuery}
            onChange={handleSearch}
          />
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
                    <span className="box-type-badge">BOX</span>
                    <div className="box-pieces flex items-center gap-1">
                      <Gem size={14} />
                      <span>{box.totalPieces || 0} pieces</span>
                    </div>
                    <span className="counter-name">{box.counterName}</span>
                  </div>
                </div>
              </div>

              {/* Box Weights */}
              <div className="box-weights grid grid-cols-2 md:grid-cols-4 gap-4 my-3">
                <div className="weight-item">
                  <div className="weight-column-label">Fixed Weight</div>
                  <div className="weight-column-value">
                    {box.fixedWeight || 0}g
                  </div>
                </div>
                <div className="weight-item">
                  <div className="weight-column-label">Net Weight</div>
                  <div className="weight-column-value">
                    {box.netWeight || 0}g
                  </div>
                </div>
                <div className="weight-item">
                  <div className="weight-column-label">Variable Weight</div>
                  <div className="weight-column-value">
                    {box.variableWeight || 0}g
                  </div>
                </div>
                <div className="weight-item">
                  <div className="weight-column-label">Gross Weight</div>
                  <div className="weight-column-value">
                    {box.grossWeight || 0}g
                  </div>
                </div>
              </div>

              {/* Box Actions */}
              <div className="box-actions flex items-center justify-between mt-3">
                <div className="box-total font-semibold">
                  Total: {box.totalAll?.toFixed(3) || "0.000"}g
                </div>
                <div className="action-buttons flex gap-2">
                  <button
                    className="btn-manage flex items-center gap-1"
                    onClick={() => handleManagePieces(box.id)}
                  >
                    <Settings size={16} /> Manage
                  </button>
                  <button
                    className="btn btn-warning btn-small flex items-center gap-1"
                    onClick={() => setShowEdit(box)}
                  >
                    <Edit2 size={16} /> Edit
                  </button>
                  <button
                    className="btn btn-danger btn-small flex items-center gap-1"
                    onClick={() => setShowDelete(box)}
                  >
                    <Trash2 size={16} /> Delete
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
                onClick={() =>
                  BoxClass.delete(showDelete.id).then(() => {
                    refreshBoxes();
                    setShowDelete(null);
                  })
                }
                className="btn btn-danger"
              >
                Delete
              </button>
            </div>
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
  const [fixedWeight, setFixedWeight] = useState(100);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await BoxClass.create({
      type: "BOX",
      identity,
      date,
      fixedWeight,
    });
    onSaved();
    onClose();
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
        <label>Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
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
  const [identity, setIdentity] = useState(box.identity);
  const [date, setDate] = useState(box.date.split("T")[0]);
  const [fixedWeight, setFixedWeight] = useState(box.fixedWeight);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await BoxClass.update(box.id, {
      identity,
      date,
      fixedWeight,
    });
    onSaved();
    onClose();
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
        <label>Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
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
