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

import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
class TrayClass {
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

const TrayManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [trays, setTrays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("trays");
  const [selectedTrayId, setSelectedTrayId] = useState(null);

  // Modal states
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [showDelete, setShowDelete] = useState(null);

  /* 🔹 Fetch Trays */
  useEffect(() => {
    refreshTrays();
  }, []);

  const refreshTrays = async () => {
    try {
      setLoading(true);
      const data = await TrayClass.getAll();
      const filtered = data.filter((item) => item.type === "TRAY");
      setTrays(filtered);
    } catch (err) {
      toast.error("Error fetching trays");
      console.error("Error fetching trays:", err);
    } finally {
      setLoading(false);
    }
  };

  /* 🔹 Handlers */
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleManagePieces = (id) => {
    setSelectedTrayId(id);
    setView("pieces");
  };

  /* 🔹 Filtered trays */
  const filteredTrays = trays.filter(
    (tray) =>
      tray.identity?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tray.counterName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /* 🔹 Conditional Rendering */
  if (view === "pieces") {
    return (
      <div>
        <button
          className="btn btn-secondary flex items-center gap-2 mb-4"
          onClick={() => setView("trays")}
        >
          <ArrowLeft size={18} /> Back to Trays
        </button>
        <PieceManagementBox boxId={selectedTrayId} />
      </div>
    );
  }

  return (
    <div id="boxesTab">
      {/* Section Header */}
      <div className="section-header flex items-center justify-between">
        <h2 className="text-xl font-semibold">All Trays</h2>
        <button
          id="addBoxBtn"
          className="btn btn-success flex items-center gap-2"
          onClick={() => setShowCreate(true)}
        >
          <Plus size={18} />
          Add New Tray
        </button>
      </div>

      {/* Search */}
      <div className="search-container my-4">
        <div className="search-box flex items-center border rounded px-2 py-1">
          <Search size={18} className="text-gray-500" />
          <input
            type="text"
            id="boxesSearch"
            placeholder="Search trays..."
            className="search-input flex-1 outline-none px-2"
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>
      </div>

      {/* Trays List */}
      <div className="boxes-container grid gap-4" id="boxesContainer">
        {loading ? (
          <p>Loading trays...</p>
        ) : filteredTrays.length > 0 ? (
          filteredTrays.map((tray) => (
            <div
              key={tray.id}
              className="box-list-item border rounded p-4 shadow-sm bg-white"
            >
              {/* Tray Header */}
              <div className="box-header">
                <div>
                  <h3 className="box-title">Tray #{tray.identity}</h3>
                  <div className="box-meta flex items-center gap-4 text-sm text-gray-600">
                    <span className="box-type-badge">TRAY</span>
                    <div className="box-pieces flex items-center gap-1">
                      <Gem size={14} />
                      <span>{tray.totalPieces || 0} pieces</span>
                    </div>
                    <span className="counter-name">{tray.counterName}</span>
                  </div>
                </div>
              </div>

              {/* Tray Weights */}
              <div className="box-weights grid grid-cols-2 md:grid-cols-4 gap-4 my-3">
                <div className="weight-item">
                  <div className="weight-column-label">Fixed Weight</div>
                  <div className="weight-column-value">
                    {tray.fixedWeight || 0}g
                  </div>
                </div>
                <div className="weight-item">
                  <div className="weight-column-label">Net Weight</div>
                  <div className="weight-column-value">
                    {tray.netWeight || 0}g
                  </div>
                </div>
                <div className="weight-item">
                  <div className="weight-column-label">Variable Weight</div>
                  <div className="weight-column-value">
                    {tray.variableWeight || 0}g
                  </div>
                </div>
                <div className="weight-item">
                  <div className="weight-column-label">Gross Weight</div>
                  <div className="weight-column-value">
                    {tray.grossWeight || 0}g
                  </div>
                </div>
              </div>

              {/* Tray Actions */}
              <div className="box-actions flex items-center justify-between mt-3">
                <div className="box-total font-semibold">
                  Total: {tray.totalAll?.toFixed(3) || "0.000"}g
                </div>
                <div className="action-buttons flex gap-2">
                  <button
                    className="btn-manage flex items-center gap-1"
                    onClick={() => handleManagePieces(tray.id)}
                  >
                    <Settings size={16} /> Manage
                  </button>
                  <button
                    className="btn btn-warning btn-small flex items-center gap-1"
                    onClick={() => setShowEdit(tray)}
                  >
                    <Edit2 size={16} /> Edit
                  </button>
                  <button
                    className="btn btn-danger btn-small flex items-center gap-1"
                    onClick={() => setShowDelete(tray)}
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No trays found.</p>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <Modal title="Create New Tray" onClose={() => setShowCreate(false)}>
          <CreateTrayForm
            onClose={() => setShowCreate(false)}
            onSaved={refreshTrays}
          />
        </Modal>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <Modal title="Edit Tray" onClose={() => setShowEdit(null)}>
          <EditTrayForm
            tray={showEdit}
            onClose={() => setShowEdit(null)}
            onSaved={refreshTrays}
          />
        </Modal>
      )}

      {/* Delete Modal */}
      {showDelete && (
        <Modal title="Delete Tray" onClose={() => setShowDelete(null)}>
          <div className="confirmation-dialog">
            <p>
              Are you sure you want to delete{" "}
              <strong>Tray #{showDelete.identity}</strong>?
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
                    await TrayClass.delete(showDelete.id);
                    toast.success("Tray deleted successfully");
                    refreshTrays();
                  } catch (err) {
                    toast.error("Failed to delete tray");
                  } finally {
                    setShowDelete(null);
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
    </div>
  );
};

/* 🔹 Create Tray Form */
function CreateTrayForm({ onClose, onSaved }) {
  const [identity, setIdentity] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [fixedWeight, setFixedWeight] = useState(100);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await TrayClass.create({
        type: "TRAY",
        identity,
        date,
        fixedWeight,
      });
      toast.success("Tray created successfully");
      onSaved();
      onClose();
    } catch (err) {
      toast.error("Failed to create tray");
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

/* 🔹 Edit Tray Form */
function EditTrayForm({ tray, onClose, onSaved }) {
  const [identity, setIdentity] = useState(tray.identity);
  const [date, setDate] = useState(tray.date.split("T")[0]);
  const [fixedWeight, setFixedWeight] = useState(tray.fixedWeight);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await TrayClass.update(tray.id, {
        identity,
        date,
        fixedWeight,
      });
      toast.success("Tray updated successfully");
      onSaved();
      onClose();
    } catch (err) {
      toast.error("Failed to update tray");
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

export default TrayManagement;
