import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Scale,
  Weight,
  Package2,
  Calculator,
  Plus,
  Gem,
  ShoppingCart,
  Move,
  Edit2,
  Trash2,
  Search,
} from "lucide-react";
import "../css/styles.css";
import "../css/components.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/* 🔹 Utility: Get JWT token */
function getToken() {
  return localStorage.getItem("token");
}

/* 🔹 Reusable Modal Component */
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

export default function GetAllPieces() {
  const [pieces, setPieces] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [showTransfer, setShowTransfer] = useState(null); // piece object
  const [counters, setCounters] = useState([]);
  const [containers, setContainers] = useState([]);
  const [selectedCounter, setSelectedCounter] = useState("");
  const [selectedContainer, setSelectedContainer] = useState("");
  const [showSoldOut, setShowSoldOut] = useState(null); // piece object
  const [deleteModal, setDeleteModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Form state for Add
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    barcode: "",
    type: "",
    weight: "",
    vweight: "",
  });

  /* 🔹 Fetch All Pieces */
  useEffect(() => {
    fetchPieces();
  }, []);

  async function fetchPieces() {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:8080/api/pieces", {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      setPieces(res.data);
    } catch (err) {
      console.error("Error fetching pieces:", err);
    } finally {
      setLoading(false);
    }
  }

  /* 🔹 Handle form changes */
  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  /* 🔹 Add Piece Submit */
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        "http://localhost:8080/api/pieces",
        {
          date: formData.date,
          counterId: selectedCounter,
          boxId: selectedContainer,
          barcode: formData.barcode,
          type: formData.type,
          weight: parseFloat(formData.weight),
          vweight: parseFloat(formData.vweight),
        },
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      setShowCreate(false);
      setFormData({
        date: new Date().toISOString().split("T")[0],
        barcode: "",
        type: "",
        weight: "",
        vweight: "",
      });
      fetchPieces();
    } catch (err) {
      console.error("Error adding piece:", err);
      alert("Failed to add piece.");
    }
  };

  /* 🔹 Edit Piece Submit */
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(
        `http://localhost:8080/api/pieces/${showEdit.id}`,
        {
          date: showEdit.date,
          counterId: showEdit.counterId,
          boxId: showEdit.boxId,
          barcode: showEdit.barcode,
          type: showEdit.type,
          weight: parseFloat(showEdit.weight),
          vweight: parseFloat(showEdit.vweight),
        },
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      setShowEdit(null);
      fetchPieces();
    } catch (err) {
      console.error("Error updating piece:", err);
      alert("Failed to update piece.");
    }
  };

  // open transfer modal
  const handleTransfer = async (piece) => {
    setShowTransfer(piece);
    setSelectedCounter("");
    setSelectedContainer("");
    setContainers([]);

    try {
      const res = await axios.get("http://localhost:8080/api/counters", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setCounters(res.data);
    } catch (err) {
      console.error("Error fetching counters:", err);
    }
  };

  // fetch containers when counter changes
  const handleCounterChange = async (counterId) => {
    setSelectedCounter(counterId);
    setSelectedContainer("");
    if (!counterId) {
      setContainers([]);
      return;
    }

    try {
      const res = await axios.get(
        "http://localhost:8080/api/boxes/by-counter",
        {
          headers: { Authorization: `Bearer ${getToken()}` },
          params: { counterId },
        }
      );
      setContainers(res.data);
    } catch (err) {
      console.error("Error fetching containers:", err);
    }
  };

  /* 🔹 Handlers */
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  /* 🔹 Filtered boxes */
  const filteredPieces = pieces.filter(
    (piece) =>
      piece.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      piece.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      piece.counterName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      piece.box?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  // submit transfer
  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCounter || !selectedContainer) {
      alert("Please select both counter and container.");
      return;
    }

    try {
      await axios.post(
        `http://localhost:8080/api/pieces/transfer?pieceId=${showTransfer.id}&targetBoxId=${selectedContainer}`,
        null,
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );

      setShowTransfer(null);
      fetchPieces();
    } catch (err) {
      console.error("Error transferring piece:", err);
      alert("Failed to transfer piece.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:8080/api/pieces/${id}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      setDeleteModal(null);
      fetchPieces();
      alert("Piece deleted successfully ✅");
    } catch (err) {
      console.error("Error deleting piece:", err);
      alert("Failed to delete piece ❌");
    }
  };

  const handleSell = (piece) => setShowSoldOut(piece);

  /* 🔹 Fetch counters when Add Modal opens */
  useEffect(() => {
    if (showCreate) {
      fetchCounters();
    }
  }, [showCreate]);

  async function fetchCounters() {
    try {
      const res = await axios.get("http://localhost:8080/api/counters", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setCounters(res.data);
    } catch (err) {
      console.error("Error fetching counters:", err);
    }
  }

  return (
    <div id="getAllPieces">
      {/* Header */}
      <div className="section-header">
        <div className="piece-management-header">
          <h2>All Pieces</h2>
        </div>

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
              placeholder="Search pieces..."
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

        <button
          id="addPieceBtn"
          className="btn btn-success flex items-center gap-1"
          onClick={() => setShowCreate(true)}
        >
          <Plus size={16} /> Add Piece
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Counter Name</th>
              <th>Box</th>
              <th>Barcode</th>
              <th>Type</th>
              <th>Weight (g)</th>
              <th>VWeight (g)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="piecesTableBody">
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-6">
                  Loading...
                </td>
              </tr>
            ) : pieces.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-state text-center py-6">
                  <div className="flex flex-col items-center">
                    <Gem size={32} />
                    <h3 className="font-semibold">No pieces found</h3>
                    <p>Add pieces to get started</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredPieces.map((piece) => (
                <tr key={piece.id}>
                  <td>{piece.counterName}</td>
                  <td>Box #{piece.boxIdentity}</td>
                  <td className="font-semibold">{piece.barcode}</td>
                  <td>{piece.type}</td>
                  <td>{piece.weight}g</td>
                  <td>{piece.vweight}g</td>
                  <td>
                    <span
                      className={`status-badge ${
                        piece.status === "AVAILABLE"
                          ? "status-available"
                          : "status-sold"
                      }`}
                    >
                      {piece.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn btn-small btn-success"
                        onClick={() => handleSell(piece)}
                      >
                        <ShoppingCart size={14} /> Sell
                      </button>

                      <button
                        className="btn btn-small btn-primary"
                        onClick={() => handleTransfer(piece)}
                      >
                        <Move size={14} /> Transfer
                      </button>
                      <button
                        className="btn btn-small btn-warning flex items-center gap-1"
                        onClick={() => setShowEdit(piece)}
                      >
                        <Edit2 size={14} /> Edit
                      </button>
                      <button
                        className="btn btn-small btn-danger flex items-center gap-1"
                        onClick={() => setDeleteModal(piece)}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ✅ Create Modal */}
      {showCreate && (
        <Modal title="Add New Piece" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleAddSubmit} className="piece-form">
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                id="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Barcode</label>
              <input
                type="text"
                id="barcode"
                value={formData.barcode}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Type</label>
              <input
                type="text"
                id="type"
                value={formData.type}
                onChange={handleChange}
                required
              />
            </div>

            {/* Counter + Box selection */}
            <div className="form-row">
              <div className="form-group">
                <label>Counter</label>
                <select
                  value={selectedCounter}
                  onChange={(e) => handleCounterChange(e.target.value)}
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
                <label>Box</label>
                <select
                  value={selectedContainer}
                  onChange={(e) => setSelectedContainer(e.target.value)}
                  required
                  disabled={!containers.length}
                >
                  <option value="">Select Box</option>
                  {containers.map((b) => (
                    <option key={b.id} value={b.id}>
                      Box #{b.identity}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Weight (g)</label>
                <input
                  type="number"
                  id="weight"
                  step="0.01"
                  value={formData.weight}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>VWeight (g)</label>
                <input
                  type="number"
                  id="vweight"
                  step="0.01"
                  value={formData.vweight}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="form-actions">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-success">
                Add Piece
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ✅ Edit Modal */}
      {showEdit && (
        <Modal title="Edit Piece" onClose={() => setShowEdit(null)}>
          <form onSubmit={handleEditSubmit} className="piece-form">
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={showEdit.date.split("T")[0]}
                onChange={(e) =>
                  setShowEdit({ ...showEdit, date: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label>Barcode</label>
              <input
                type="text"
                value={showEdit.barcode}
                onChange={(e) =>
                  setShowEdit({ ...showEdit, barcode: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label>Type</label>
              <input
                type="text"
                value={showEdit.type}
                onChange={(e) =>
                  setShowEdit({ ...showEdit, type: e.target.value })
                }
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Weight (g)</label>
                <input
                  type="number"
                  step="0.01"
                  value={showEdit.weight}
                  onChange={(e) =>
                    setShowEdit({ ...showEdit, weight: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>VWeight (g)</label>
                <input
                  type="number"
                  step="0.01"
                  value={showEdit.vweight}
                  onChange={(e) =>
                    setShowEdit({ ...showEdit, vweight: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div className="form-actions">
              <button
                type="button"
                onClick={() => setShowEdit(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-warning">
                Update Piece
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ✅ Transfer Modal */}
      {showTransfer && (
        <Modal title="Transfer Piece" onClose={() => setShowTransfer(null)}>
          <form onSubmit={handleTransferSubmit} className="piece-form">
            <div className="form-group">
              <label>Current Location</label>
              <div
                style={{
                  padding: "0.75rem",
                  background: "#f8fafc",
                  borderRadius: "6px",
                  color: "#64748b",
                }}
              >
                {`Counter ${showTransfer.counterName} → Box #${showTransfer.boxIdentity}`}
              </div>
            </div>

            <div className="transfer-options form-row">
              <div className="form-group">
                <label>Target Counter</label>
                <select
                  value={selectedCounter}
                  onChange={(e) => handleCounterChange(e.target.value)}
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
                <label>Target Container</label>
                <select
                  value={selectedContainer}
                  onChange={(e) => setSelectedContainer(e.target.value)}
                  required
                  disabled={!containers.length}
                >
                  <option value="">Select Container</option>
                  {containers.map((b) => (
                    <option key={b.id} value={b.id}>
                      Box #{b.identity}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => setShowTransfer(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Transfer Piece
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ✅ Sold Out Modal */}
      {showSoldOut && (
        <Modal title="Mark as Sold Out" onClose={() => setShowSoldOut(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await axios.post(
                  `http://localhost:8080/api/pieces/sell?pieceId=${showSoldOut.id}`,
                  {},
                  {
                    headers: {
                      Authorization: `Bearer ${getToken()}`,
                    },
                  }
                );
                setShowSoldOut(null);
                fetchPieces();
                alert(`Piece "${showSoldOut.barcode}" marked as sold out ✅`);
              } catch (err) {
                console.error("Error selling piece:", err);
                alert("Failed to mark as sold out ❌");
              }
            }}
            className="piece-form"
          >
            <div className="form-group">
              <p>
                Are you sure you want to mark piece{" "}
                <strong>{showSoldOut.barcode}</strong> as Sold Out?
              </p>
            </div>
            <div className="form-actions">
              <button
                type="button"
                onClick={() => setShowSoldOut(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-success">
                Yes, Mark as Sold
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ✅ Delete Modal */}
      {deleteModal && (
        <Modal title="Delete Piece" onClose={() => setDeleteModal(null)}>
          <p>
            Are you sure you want to delete piece{" "}
            <strong>{deleteModal.barcode}</strong>?
          </p>
          <div className="form-actions">
            <button
              onClick={() => setDeleteModal(null)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDelete(deleteModal.id)}
              className="btn btn-danger"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
