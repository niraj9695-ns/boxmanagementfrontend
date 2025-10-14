// PieceManagementBox.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  ArrowLeft,
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
} from "lucide-react";
import "../css/styles.css";
import "../css/components.css";

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

export default function PieceManagementBox({ container, boxId, onBack }) {
  const [box, setBox] = useState(container || null);
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

  // Form state for Add
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    barcode: "",
    type: "",
    weight: "",
    vweight: "",
  });

  const activeBoxId = box?.id || boxId;

  /* 🔹 Fetch box details if only boxId is passed */
  useEffect(() => {
    if (!box && boxId) {
      axios
        .get(`http://localhost:8080/api/boxes/${boxId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        })
        .then((res) => setBox(res.data))
        .catch((err) => console.error("Error fetching box details:", err));
    }
  }, [boxId, box]);

  async function fetchBoxDetails() {
    if (!activeBoxId) return;
    try {
      const res = await axios.get(
        `http://localhost:8080/api/boxes/${activeBoxId}`,
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );
      setBox(res.data);
    } catch (err) {
      console.error("Error fetching box details:", err);
    }
  }

  /* 🔹 Fetch Pieces */
  useEffect(() => {
    if (!activeBoxId) return;
    fetchPieces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBoxId]);

  async function fetchPieces() {
    if (!activeBoxId) return;
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:8080/api/pieces/by-box", {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        params: { boxId: activeBoxId },
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
    if (!box) {
      alert("Box details not loaded yet!");
      return;
    }
    try {
      await axios.post(
        "http://localhost:8080/api/pieces",
        {
          date: formData.date,
          counterId: box.counterId,
          boxId: box.id,
          barcode: formData.barcode,
          type: formData.type,
          weight: parseFloat(formData.weight),
          vweight: parseFloat(formData.vweight),
        },
        {
          headers: { Authorization: `Bearer ${getToken()}` },
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
      fetchBoxDetails();
    } catch (err) {
      console.error("Error adding piece:", err);
      alert("Failed to add piece.");
    }
  };

  /* 🔹 Edit Piece Submit */
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!box) return;
    try {
      await axios.put(
        `http://localhost:8080/api/pieces/${showEdit.id}`,
        {
          date: showEdit.date,
          counterId: box.counterId,
          boxId: box.id,
          barcode: showEdit.barcode,
          type: showEdit.type,
          weight: parseFloat(showEdit.weight),
          vweight: parseFloat(showEdit.vweight),
        },
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );

      setShowEdit(null);
      fetchBoxDetails();
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
      fetchBoxDetails();
      fetchPieces();
    } catch (err) {
      console.error("Error transferring piece:", err);
      alert("Failed to transfer piece.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:8080/api/pieces/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setDeleteModal(null);
      fetchBoxDetails();
      fetchPieces();
      alert("Piece deleted successfully ✅");
    } catch (err) {
      console.error("Error deleting piece:", err);
      alert("Failed to delete piece ❌");
    }
  };

  const handleSell = (piece) => setShowSoldOut(piece);

  return (
    <div id="pieceManagement">
      {/* Header */}
      <div className="section-header">
        <div className="piece-management-header">
          <h2>Piece Management</h2>
          <h3 id="pieceTitle">
            Box #{box?.identity || boxId} - Piece Management
          </h3>
        </div>

        {/* <button
          onClick={onBack}
          id="backToContainers"
          className="btn btn-secondary flex items-center gap-1"
        >
          <ArrowLeft size={16} /> Back to Containers
        </button> */}

        <button
          id="addPieceBtn"
          className="btn btn-success flex items-center gap-1"
          onClick={() => setShowCreate(true)}
        >
          <Plus size={16} /> Add Piece
        </button>
      </div>

      {/* Weight Cards */}
      <div className="piece-management-content">
        <div className="weight-cards">
          <div className="weight-card">
            <div className="weight-icon">
              <Weight size={20} />
            </div>
            <div className="weight-content">
              <div className="weight-label">Fixed Weight</div>
              <div className="weight-value">{box?.fixedWeight ?? "-"}g</div>
            </div>
          </div>
          <div className="weight-card">
            <div className="weight-icon">
              <Scale size={20} />
            </div>
            <div className="weight-content">
              <div className="weight-label">Net Weight</div>
              <div className="weight-value">{box?.netWeight ?? "-"}g</div>
            </div>
          </div>
          <div className="weight-card">
            <div className="weight-icon">
              <Package2 size={20} />
            </div>
            <div className="weight-content">
              <div className="weight-label">Variable Weight</div>
              <div className="weight-value">{box?.variableWeight ?? "-"}g</div>
            </div>
          </div>
          <div className="weight-card">
            <div className="weight-icon">
              <Calculator size={20} />
            </div>
            <div className="weight-content">
              <div className="weight-label">Gross Weight</div>
              <div className="weight-value">{box?.grossWeight ?? "-"}g</div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
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
                <td colSpan={7} className="text-center py-6">
                  Loading...
                </td>
              </tr>
            ) : pieces.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-state text-center py-6">
                  <div className="flex flex-col items-center">
                    <Gem size={32} />
                    <h3 className="font-semibold">No pieces found</h3>
                    <p>Add pieces to this container to get started</p>
                  </div>
                </td>
              </tr>
            ) : (
              pieces.map((piece) => (
                <tr key={piece.id}>
                  <td>{new Date(piece.date).toLocaleDateString()}</td>
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
                        onClick={() => handleSell(piece)} // ✅ pass whole object
                      >
                        <ShoppingCart size={14} /> Sell
                      </button>

                      <button
                        className="btn btn-small btn-primary"
                        onClick={() => handleTransfer(piece)} // ✅ pass whole object
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
                        onClick={() => setDeleteModal(piece)} // ✅ open confirmation modal
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

      {/* ✅ Modals (same as before, updated to use `box`) */}
      {/* Create Modal */}
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
                // required
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

      {/* Edit Modal */}
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

      {/* Transfer Modal */}
      {showTransfer && (
        <Modal title="Transfer Piece" onClose={() => setShowTransfer(null)}>
          <form onSubmit={handleTransferSubmit} className="piece-form">
            {/* Current Location */}
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
                {box
                  ? `Counter ${box.counterId} → Box #${box.identity}`
                  : `Box #${boxId}`}
              </div>
            </div>

            <div className="transfer-options form-row">
              {/* Counter Dropdown */}
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

              {/* Container Dropdown */}
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

      {/* Sold Out Modal */}
      {showSoldOut && (
        <Modal title="Mark as Sold Out" onClose={() => setShowSoldOut(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await axios.post(
                  `http://localhost:8080/api/pieces/sell?pieceId=${showSoldOut.id}`,
                  {},
                  { headers: { Authorization: `Bearer ${getToken()}` } }
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
                <strong>{showSoldOut.barcode}</strong> as sold out?
              </p>
              <p>
                <small style={{ color: "#dc2626" }}>
                  This will change the status to sold out.
                </small>
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
                Mark as Sold Out
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <Modal title="Delete Piece" onClose={() => setDeleteModal(null)}>
          <div className="form-group">
            <p>
              Are you sure you want to delete piece{" "}
              <strong>{deleteModal.barcode}</strong>?
            </p>
          </div>

          <div className="form-actions flex justify-end gap-3 mt-6">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setDeleteModal(null)}
            >
              Cancel
            </button>
            <button
              className="btn btn-danger"
              onClick={() => handleDelete(deleteModal.id)}
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
