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
  X,
  statement,
} from "lucide-react";
import "../css/styles.css";
import "../css/components.css";
import { toast, ToastContainer } from "react-toastify";
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

export default function PieceManagement({ container, boxId, onBack }) {
  const [pieces, setPieces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [box, setBox] = useState(container || null);

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

  // Lookup options for dropdowns
  const [purityOptions, setPurityOptions] = useState([]);
  const [typeOptions, setTypeOptions] = useState([]);

  // Form state for Add
  const [formData, setFormData] = useState({
    barcode: "",
    type: "",
    purity: "",
    netWeight: "",
    variableWeight: "",
  });

  // ✅ Safely compute activeBoxId even if container is undefined
  const activeBoxId = container?.id || boxId || box?.id || null;

  /* 🔹 Fetch box details (GET /api/box/getById?id=) */
  async function fetchBoxDetails() {
    if (!activeBoxId) return;
    try {
      const res = await axios.get("http://localhost:8080/api/box/getById", {
        headers: { Authorization: `Bearer ${getToken()}` },
        params: { id: activeBoxId },
      });
      setBox(res.data);
    } catch (err) {
      console.error("Error fetching box details:", err);
    }
  }

  /* 🔹 Fetch Pieces (GET /api/pieces/getByBoxId?boxId=) */
  useEffect(() => {
    fetchPieces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBoxId]); // ✅ no direct container.id

  async function fetchPieces() {
    console.log("[PieceManagement] activeBoxId =", activeBoxId, {
      container,
      boxId,
      box,
    });

    if (!activeBoxId) {
      console.warn("[PieceManagement] No activeBoxId — not calling API");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.get(
        "http://localhost:8080/api/pieces/getByBoxId",
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
          params: {
            boxId: Number(activeBoxId), // 🔹 ensure it's a number
          },
        }
      );
      console.log(
        "[PieceManagement] Response for boxId",
        activeBoxId,
        res.data
      );
      setPieces(res.data || []);
      fetchBoxDetails();
    } catch (err) {
      console.error("Error fetching pieces:", err);
    } finally {
      setLoading(false);
    }
  }

  /* 🔹 Fetch purity & type options once */
  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const token = getToken();
        if (!token) return;
        const [purityRes, typeRes] = await Promise.all([
          axios.get("http://localhost:8080/purity/getAll", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get("http://localhost:8080/type/getAll", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setPurityOptions(purityRes.data || []);
        setTypeOptions(typeRes.data || []);
      } catch (err) {
        console.error("Error fetching purity/type options:", err);
        toast.error("Failed to load purity/type options");
      }
    };

    fetchLookups();
  }, []);

  /* 🔹 Handle form changes */
  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  /* 🔹 Add Piece Submit (POST /api/pieces) */
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!activeBoxId) {
      toast.error("Missing box id. Please reopen this box and try again.");
      return;
    }

    try {
      await axios.post(
        "http://localhost:8080/api/pieces",
        {
          barcode: formData.barcode || null,
          type: formData.type,
          purity: formData.purity || null,
          netWeight: parseFloat(formData.netWeight || 0),
          variableWeight: parseFloat(formData.variableWeight || 0),
          boxId: activeBoxId,
        },
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );
      toast.success("Piece added successfully");

      // ✅ keep modal open, keep last selected type & purity
      setFormData((prev) => ({
        ...prev,
        barcode: "",
        netWeight: "",
        variableWeight: "",
      }));

      fetchPieces();
      fetchBoxDetails();
    } catch (err) {
      console.error("Error adding piece:", err);
      toast.error("Failed to add piece");
    }
  };

  /* 🔹 Edit Piece Submit (PUT /api/pieces?id=…) */
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!showEdit) return;

    try {
      await axios.put(
        "http://localhost:8080/api/pieces",
        {
          barcode: showEdit.barcode || null,
          type: showEdit.type,
          purity: showEdit.purity || null,
          netWeight: parseFloat(showEdit.netWeight || 0),
          variableWeight: parseFloat(showEdit.variableWeight || 0),
          boxId: activeBoxId,
        },
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
          params: {
            id: showEdit.id, // backend expects @RequestParam Long id
          },
        }
      );
      toast.success("Piece updated successfully");

      setShowEdit(null);
      fetchPieces();
      fetchBoxDetails();
    } catch (err) {
      console.error("Error updating piece:", err);
      toast.error("Failed to update piece");
    }
  };

  /* 🔹 Open Transfer modal + fetch counters (GET /api/counter/getAll) */
  const handleTransfer = async (piece) => {
    setShowTransfer(piece);
    setSelectedCounter("");
    setSelectedContainer("");
    setContainers([]);

    try {
      const res = await axios.get("http://localhost:8080/api/counter/getAll", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setCounters(res.data || []);
    } catch (err) {
      console.error("Error fetching counters:", err);
      toast.error("Failed to load counters");
    }
  };

  /* 🔹 When counter changes, fetch boxes for that counter
     GET /api/box/getByCounterId?counterId=
  */
  const handleCounterChange = async (counterId) => {
    setSelectedCounter(counterId);
    setSelectedContainer("");
    if (!counterId) {
      setContainers([]);
      return;
    }

    try {
      const res = await axios.get(
        "http://localhost:8080/api/box/getByCounterId",
        {
          headers: { Authorization: `Bearer ${getToken()}` },
          params: { counterId },
        }
      );
      setContainers(res.data || []);
    } catch (err) {
      console.error("Error fetching containers:", err);
      toast.error("Failed to load containers");
    }
  };

  /* 🔹 Submit Transfer (POST /api/pieces/transfer?pieceId=&boxId=) */
  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCounter || !selectedContainer) {
      toast.warning("Please select both counter and container.");
      return;
    }

    try {
      await axios.post("http://localhost:8080/api/pieces/transfer", null, {
        headers: { Authorization: `Bearer ${getToken()}` },
        params: {
          pieceId: showTransfer.id,
          boxId: selectedContainer,
        },
      });
      toast.success("Transferred successfully!");

      setShowTransfer(null);
      fetchPieces();
      fetchBoxDetails();
    } catch (err) {
      console.error("Error transferring piece:", err);
      toast.error("Failed to transfer piece.");
    }
  };

  /* 🔹 Delete Piece (DELETE /api/pieces/{id}) */
  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:8080/api/pieces/${id}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      setDeleteModal(null);
      fetchPieces();
      fetchBoxDetails();
      toast.success("Piece deleted successfully");
    } catch (err) {
      console.error("Error deleting piece:", err);
      toast.error("Failed to delete piece");
    }
  };

  const handleSell = (piece) => setShowSoldOut(piece);

  // Helpers for display
  const displayBoxIdentity =
    box?.identity || container?.identity || activeBoxId || "-";
  const displayCounter =
    container?.counterId != null ? container.counterId : "-";

  return (
    <div id="pieceManagement">
      {/* Header */}
      <div className="section-header">
        <div className="piece-management-header">
          <h2>Piece Management</h2>
          <h3 id="pieceTitle">Box #{displayBoxIdentity} - Piece Management</h3>
        </div>

        <button
          onClick={onBack}
          id="backToContainers"
          className="btn btn-secondary flex items-center gap-1"
        >
          <statement size={16} /> Transactions
        </button>

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
              <div className="weight-value">{box?.fixedWeight ?? 0}g</div>
            </div>
          </div>
          <div className="weight-card">
            <div className="weight-icon">
              <Scale size={20} />
            </div>
            <div className="weight-content">
              <div className="weight-label">Net Weight</div>
              <div className="weight-value">{box?.netWeight ?? 0}g</div>
            </div>
          </div>
          <div className="weight-card">
            <div className="weight-icon">
              <Package2 size={20} />
            </div>
            <div className="weight-content">
              <div className="weight-label">Variable Weight</div>
              <div className="weight-value">{box?.variableWeight ?? 0}g</div>
            </div>
          </div>
          <div className="weight-card">
            <div className="weight-icon">
              <Calculator size={20} />
            </div>
            <div className="weight-content">
              <div className="weight-label">Gross Weight</div>
              <div className="weight-value">{box?.grossWeight ?? 0}g</div>
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
              <th>Purity</th>
              <th>Net Weight (g)</th>
              <th>Variable Weight (g)</th>
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
                    <p>Add pieces to this container to get started</p>
                  </div>
                </td>
              </tr>
            ) : (
              pieces.map((piece) => {
                const statusLabel = piece.sold ? "SOLD" : "AVAILABLE";
                const statusClass = piece.sold
                  ? "status-sold"
                  : "status-available";

                return (
                  <tr key={piece.id}>
                    <td>
                      {piece.createdAt
                        ? new Date(piece.createdAt).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="font-semibold">{piece.barcode || "-"}</td>
                    <td>{piece.type}</td>
                    <td>{piece.purity}</td>
                    <td>{piece.netWeight}g</td>
                    <td>{piece.variableWeight}g</td>
                    <td>
                      <span className={`status-badge ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-small btn-success"
                          onClick={() => handleSell(piece)}
                          disabled={piece.sold}
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
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <Modal title="Add New Piece" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleAddSubmit} className="piece-form">
            <div className="form-group">
              <label>Barcode</label>
              <input
                type="text"
                id="barcode"
                value={formData.barcode}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Type</label>
              <select
                id="type"
                value={formData.type}
                onChange={handleChange}
                required
              >
                <option value="">Select Type</option>
                {typeOptions.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Purity</label>
              <select
                id="purity"
                value={formData.purity}
                onChange={handleChange}
              >
                <option value="">Select Purity</option>
                {purityOptions.map((p) => (
                  <option key={p.id} value={p.purity}>
                    {p.purity}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Net Weight (g)</label>
                <input
                  type="number"
                  id="netWeight"
                  step="0.01"
                  value={formData.netWeight}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Variable Weight (g)</label>
                <input
                  type="number"
                  id="variableWeight"
                  step="0.01"
                  value={formData.variableWeight}
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
              <label>Barcode</label>
              <input
                type="text"
                value={showEdit.barcode || ""}
                onChange={(e) =>
                  setShowEdit({ ...showEdit, barcode: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select
                value={showEdit.type || ""}
                onChange={(e) =>
                  setShowEdit({ ...showEdit, type: e.target.value })
                }
                required
              >
                <option value="">Select Type</option>
                {typeOptions.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Purity</label>
              <select
                value={showEdit.purity || ""}
                onChange={(e) =>
                  setShowEdit({ ...showEdit, purity: e.target.value })
                }
              >
                <option value="">Select Purity</option>
                {purityOptions.map((p) => (
                  <option key={p.id} value={p.purity}>
                    {p.purity}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Net Weight (g)</label>
                <input
                  type="number"
                  step="0.01"
                  value={showEdit.netWeight}
                  onChange={(e) =>
                    setShowEdit({
                      ...showEdit,
                      netWeight: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Variable Weight (g)</label>
                <input
                  type="number"
                  step="0.01"
                  value={showEdit.variableWeight}
                  onChange={(e) =>
                    setShowEdit({
                      ...showEdit,
                      variableWeight: e.target.value,
                    })
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
                {`Counter ${displayCounter} → Box #${displayBoxIdentity}`}
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
                  "http://localhost:8080/api/pieces/sold",
                  null,
                  {
                    headers: { Authorization: `Bearer ${getToken()}` },
                    params: { id: showSoldOut.id },
                  }
                );
                setShowSoldOut(null);
                await fetchPieces();
                await fetchBoxDetails();
                toast.success(
                  `Piece "${
                    showSoldOut.barcode || showSoldOut.id
                  }" marked as sold`
                );
              } catch (err) {
                console.error("Error selling piece:", err);
                toast.error("Failed to mark as sold");
              }
            }}
            className="piece-form"
          >
            <div className="form-group">
              <p>
                Are you sure you want to mark piece{" "}
                <strong>{showSoldOut.barcode || showSoldOut.id}</strong> as
                sold?
              </p>
              <p>
                <small style={{ color: "#dc2626" }}>
                  This will change the status to sold.
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
                Mark as Sold
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
              <strong>{deleteModal.barcode || deleteModal.id}</strong>?
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
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
    </div>
  );
}
