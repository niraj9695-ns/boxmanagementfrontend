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
  const [box, setBox] = useState(container);

  // 🔹 Loose items
  const [looseItems, setLooseItems] = useState([]);
  const [showLooseCreate, setShowLooseCreate] = useState(false);
  const [looseForm, setLooseForm] = useState({
    name: "",
    netWeight: "",
    variableWeight: "",
  });

  const [showLooseEdit, setShowLooseEdit] = useState(null);
  const [showLooseTransfer, setShowLooseTransfer] = useState(null);
  const [showLooseSell, setShowLooseSell] = useState(null);
  const [looseSellWeight, setLooseSellWeight] = useState("");
  const [looseDeleteModal, setLooseDeleteModal] = useState(null);

  // Modal states for pieces
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [showTransfer, setShowTransfer] = useState(null); // piece object
  const [counters, setCounters] = useState([]);
  const [containers, setContainers] = useState([]);
  const [selectedCounter, setSelectedCounter] = useState("");
  const [selectedContainer, setSelectedContainer] = useState("");
  const [showSoldOut, setShowSoldOut] = useState(null); // piece object
  const [deleteModal, setDeleteModal] = useState(null);

  // Lookup options
  const [purityOptions, setPurityOptions] = useState([]);
  const [typeOptions, setTypeOptions] = useState([]);

  // Form state for Add Piece
  const [formData, setFormData] = useState({
    barcode: "",
    type: "",
    purity: "",
    netWeight: "",
    variableWeight: "",
  });

  const activeBoxId = container?.id || boxId;

  /* 🔹 Fetch box details (GET /api/box/getById?id=) */
  async function fetchBoxDetails() {
    const id = activeBoxId;
    if (!id) return;
    try {
      const res = await axios.get("http://localhost:8080/api/box/getById", {
        headers: { Authorization: `Bearer ${getToken()}` },
        params: { id },
      });
      setBox(res.data);
    } catch (err) {
      console.error("Error fetching box details:", err);
    }
  }

  /* 🔹 Fetch Pieces (GET /api/pieces/getByBoxId?boxId=) */
  useEffect(() => {
    fetchPieces();
    fetchLooseItems(); // also load loose items when box/container changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container.id]);

  async function fetchPieces() {
    if (!activeBoxId) return;
    try {
      setLoading(true);
      const res = await axios.get(
        "http://localhost:8080/api/pieces/getByBoxId",
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
          params: {
            boxId: activeBoxId,
          },
        }
      );
      setPieces(res.data);
      fetchBoxDetails();
    } catch (err) {
      console.error("Error fetching pieces:", err);
    } finally {
      setLoading(false);
    }
  }

  /* 🔹 Fetch Loose Items (GET /api/loose/getAll) */
  async function fetchLooseItems() {
    if (!activeBoxId) return;

    try {
      const res = await axios.get(
        "http://localhost:8080/api/loose/getByBoxId",
        {
          headers: { Authorization: `Bearer ${getToken()}` },
          params: { boxId: activeBoxId },
        }
      );

      setLooseItems(res.data || []);
    } catch (err) {
      console.error("Error fetching loose items:", err);
      toast.error("Failed to load loose items");
    }
  }

  /* 🔹 Fetch purity & type options (GET /purity/getAll, /type/getAll) */
  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [purityRes, typeRes] = await Promise.all([
          axios.get("http://localhost:8080/purity/getAll", {
            headers: { Authorization: `Bearer ${getToken()}` },
          }),
          axios.get("http://localhost:8080/type/getAll", {
            headers: { Authorization: `Bearer ${getToken()}` },
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

  /* 🔹 Handle form changes (Add Piece) */
  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  /* 🔹 Handle form changes (Add Loose Item) */
  const handleLooseChange = (e) => {
    const { id, value } = e.target;
    setLooseForm((prev) => ({ ...prev, [id]: value }));
  };

  /* 🔹 Add Piece Submit */
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        "http://localhost:8080/api/pieces",
        {
          barcode: formData.barcode || null,
          type: formData.type,
          purity: formData.purity,
          netWeight: parseFloat(formData.netWeight),
          variableWeight: parseFloat(formData.variableWeight),
          boxId: activeBoxId,
        },
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );
      toast.success("Piece added successfully");

      // Keep modal open, but clear barcode & weights
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

  /* 🔹 Add Loose Item Submit (POST /api/loose) */
  const handleLooseSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        "http://localhost:8080/api/loose",
        {
          name: looseForm.name,
          netWeight: parseFloat(looseForm.netWeight),
          variableWeight: parseFloat(looseForm.variableWeight),
          boxId: activeBoxId,
        },
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );

      toast.success("Loose item added successfully");

      // Close modal & clear form
      setShowLooseCreate(false);
      setLooseForm({
        name: "",
        netWeight: "",
        variableWeight: "",
      });

      fetchLooseItems();
      fetchBoxDetails();
    } catch (err) {
      console.error("Error adding loose item:", err);
      toast.error("Failed to add loose item");
    }
  };

  /* 🔹 Edit Piece Submit (PUT /api/pieces?id=…) */
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(
        "http://localhost:8080/api/pieces",
        {
          barcode: showEdit.barcode || null,
          type: showEdit.type,
          purity: showEdit.purity,
          netWeight: parseFloat(showEdit.netWeight),
          variableWeight: parseFloat(showEdit.variableWeight),
          boxId: activeBoxId,
        },
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
          params: {
            id: showEdit.id,
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

  /* 🔹 Edit Loose Item Submit (PUT /api/loose?id=…) */
  const handleLooseEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(
        "http://localhost:8080/api/loose",
        {
          name: showLooseEdit.name,
          netWeight: parseFloat(showLooseEdit.netWeight),
          variableWeight: parseFloat(showLooseEdit.variableWeight),
        },
        {
          headers: { Authorization: `Bearer ${getToken()}` },
          params: { id: showLooseEdit.id },
        }
      );
      toast.success("Loose item updated successfully");
      setShowLooseEdit(null);
      fetchLooseItems();
      fetchBoxDetails();
    } catch (err) {
      console.error("Error updating loose item:", err);
      toast.error("Failed to update loose item");
    }
  };

  /* 🔹 Open Transfer modal + fetch counters (GET /api/counter/getAll) for pieces */
  const handleTransfer = async (piece) => {
    setShowTransfer(piece); // keep whole object
    setSelectedCounter("");
    setSelectedContainer("");
    setContainers([]);

    try {
      const res = await axios.get("http://localhost:8080/api/counter/getAll", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setCounters(res.data); // fills Counter dropdown
    } catch (err) {
      console.error("Error fetching counters:", err);
      toast.error("Failed to load counters");
    }
  };

  /* 🔹 Open Transfer modal for loose items */
  const handleLooseTransferOpen = async (item) => {
    setShowLooseTransfer(item);
    setSelectedCounter("");
    setSelectedContainer("");
    setContainers([]);

    try {
      const res = await axios.get("http://localhost:8080/api/counter/getAll", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setCounters(res.data);
    } catch (err) {
      console.error("Error fetching counters:", err);
      toast.error("Failed to load counters");
    }
  };

  /* 🔹 When counter changes, fetch boxes for that counter */
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
      setContainers(res.data); // fills Box dropdown
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

  /* 🔹 Submit Loose Transfer (POST /api/loose/transfer?itemId=&boxId=) */
  const handleLooseTransferSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCounter || !selectedContainer) {
      toast.warning("Please select both counter and container.");
      return;
    }

    try {
      await axios.post("http://localhost:8080/api/loose/transfer", null, {
        headers: { Authorization: `Bearer ${getToken()}` },
        params: {
          itemId: showLooseTransfer.id,
          boxId: selectedContainer,
        },
      });
      toast.success("Loose item transferred successfully!");

      setShowLooseTransfer(null);
      fetchLooseItems();
      fetchBoxDetails();
    } catch (err) {
      console.error("Error transferring loose item:", err);
      toast.error("Failed to transfer loose item.");
    }
  };

  /* 🔹 Delete Piece */
  const handleDelete = async (id) => {
    try {
      const token = getToken();
      if (!token) {
        toast.error("Missing auth token — please login");
        return;
      }

      await axios.delete("http://localhost:8080/api/pieces/delete", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          id: id, // ✅ request param as backend expects
        },
      });

      setDeleteModal(null);
      fetchPieces();
      fetchBoxDetails();
      toast.success("Piece deleted successfully");
    } catch (err) {
      console.error("Error deleting piece:", err?.response || err);

      if (err?.response?.status === 403) {
        toast.error("You are not authorized to delete this piece");
      } else {
        toast.error(err?.response?.data || "Failed to delete piece");
      }
    }
  };

  /* 🔹 Delete Loose Item */
  const handleLooseDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:8080/api/loose/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setLooseDeleteModal(null);
      fetchLooseItems();
      fetchBoxDetails();
      toast.success("Loose item deleted successfully");
    } catch (err) {
      console.error("Error deleting loose item:", err);
      toast.error("Failed to delete loose item");
    }
  };

  const handleSell = (piece) => setShowSoldOut(piece);
  const handleLooseSellOpen = (item) => {
    setShowLooseSell(item);
    setLooseSellWeight("");
  };

  /* 🔹 Submit Loose Sell (POST /api/loose/sell?id=&weight=) */
  const handleLooseSellSubmit = async (e) => {
    e.preventDefault();
    if (!looseSellWeight || parseFloat(looseSellWeight) <= 0) {
      toast.warning("Please enter a valid weight.");
      return;
    }

    try {
      await axios.post("http://localhost:8080/api/loose/sell", null, {
        headers: { Authorization: `Bearer ${getToken()}` },
        params: {
          id: showLooseSell.id,
          weight: parseFloat(looseSellWeight),
        },
      });
      toast.success("Loose item sold successfully!");
      setShowLooseSell(null);
      setLooseSellWeight("");
      fetchLooseItems();
      fetchBoxDetails();
    } catch (err) {
      console.error("Error selling loose item:", err);
      toast.error("Failed to sell loose item");
    }
  };

  return (
    <div id="pieceManagement">
      {/* Header */}
      <div className="section-header">
        <div className="piece-management-header">
          <h2>Piece Management</h2>
          <h3 id="pieceTitle">Box #{container.identity} - Piece Management</h3>
        </div>

        <button
          onClick={onBack}
          id="backToContainers"
          className="btn btn-secondary flex items-center gap-1"
        >
          <ArrowLeft size={16} /> Back to Containers
        </button>

        {/* Add Loose Item Button */}
        <button
          id="addLooseItemBtn"
          className="btn btn-warning flex items-center gap-1"
          onClick={() => setShowLooseCreate(true)}
          style={{ marginLeft: "0.75rem" }}
        >
          <Package2 size={16} /> Add Loose Item
        </button>

        <button
          id="addPieceBtn"
          className="btn btn-success flex items-center gap-1"
          onClick={() => setShowCreate(true)}
          style={{ marginLeft: "0.75rem" }}
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

      {/* Pieces Table */}
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

      {/* Loose Items Table */}
      <div className="table-container" style={{ marginTop: "2rem" }}>
        <h3 className="mb-3">Loose Items</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Name</th>
              <th>Net Weight (g)</th>
              <th>Variable Weight (g)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {looseItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-4">
                  No loose items found for this box.
                </td>
              </tr>
            ) : (
              looseItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="font-semibold">{item.name}</td>
                  <td>{item.netWeight}g</td>
                  <td>{item.variableWeight}g</td>
                  <td>{item.sold ? "SOLD" : "AVAILABLE"}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn btn-small btn-success"
                        onClick={() => handleLooseSellOpen(item)}
                        disabled={item.sold}
                      >
                        <ShoppingCart size={14} /> Sell
                      </button>

                      <button
                        className="btn btn-small btn-primary"
                        onClick={() => handleLooseTransferOpen(item)}
                      >
                        <Move size={14} /> Transfer
                      </button>

                      <button
                        className="btn btn-small btn-warning flex items-center gap-1"
                        onClick={() => setShowLooseEdit(item)}
                      >
                        <Edit2 size={14} /> Edit
                      </button>

                      <button
                        className="btn btn-small btn-danger flex items-center gap-1"
                        onClick={() => setLooseDeleteModal(item)}
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

      {/* Create Piece Modal */}
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
                required
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

      {/* Add Loose Item Modal */}
      {showLooseCreate && (
        <Modal
          title="Add New Loose Item"
          onClose={() => setShowLooseCreate(false)}
        >
          <form onSubmit={handleLooseSubmit} className="piece-form">
            <div className="form-group">
              <label>Item Name</label>
              <input
                type="text"
                id="name"
                placeholder="Enter item name"
                value={looseForm.name}
                onChange={handleLooseChange}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Net Weight (grams)</label>
                <input
                  type="number"
                  id="netWeight"
                  placeholder="Net weight"
                  step="0.01"
                  value={looseForm.netWeight}
                  onChange={handleLooseChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Variable Weight (grams)</label>
                <input
                  type="number"
                  id="variableWeight"
                  placeholder="Variable weight"
                  step="0.01"
                  value={looseForm.variableWeight}
                  onChange={handleLooseChange}
                  required
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => setShowLooseCreate(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-warning">
                Add Loose Item
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Piece Modal */}
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
                value={showEdit.type}
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
                required
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

      {/* Edit Loose Item Modal */}
      {showLooseEdit && (
        <Modal title="Edit Loose Item" onClose={() => setShowLooseEdit(null)}>
          <form onSubmit={handleLooseEditSubmit} className="piece-form">
            <div className="form-group">
              <label>Item Name</label>
              <input
                type="text"
                value={showLooseEdit.name || ""}
                onChange={(e) =>
                  setShowLooseEdit({ ...showLooseEdit, name: e.target.value })
                }
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Net Weight (g)</label>
                <input
                  type="number"
                  step="0.01"
                  value={showLooseEdit.netWeight}
                  onChange={(e) =>
                    setShowLooseEdit({
                      ...showLooseEdit,
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
                  value={showLooseEdit.variableWeight}
                  onChange={(e) =>
                    setShowLooseEdit({
                      ...showLooseEdit,
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
                onClick={() => setShowLooseEdit(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-warning">
                Update Loose Item
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Transfer Piece Modal */}
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
                {`Counter ${container.counterId} → Box #${container.identity}`}
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

      {/* Transfer Loose Item Modal */}
      {showLooseTransfer && (
        <Modal
          title="Transfer Loose Item"
          onClose={() => setShowLooseTransfer(null)}
        >
          <form onSubmit={handleLooseTransferSubmit} className="piece-form">
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
                {`Counter ${container.counterId} → Box #${container.identity}`}
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
                onClick={() => setShowLooseTransfer(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Transfer Loose Item
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Sold Out Piece Modal */}
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

      {/* Sell Loose Item Modal */}
      {showLooseSell && (
        <Modal title="Sell Loose Item" onClose={() => setShowLooseSell(null)}>
          <form onSubmit={handleLooseSellSubmit} className="piece-form">
            <div className="form-group">
              <p>
                Selling from loose item <strong>{showLooseSell.name}</strong>
              </p>
              <p>
                Current net weight: <strong>{showLooseSell.netWeight}g</strong>
              </p>
            </div>

            <div className="form-group">
              <label>Sell Weight (g)</label>
              <input
                type="number"
                step="0.01"
                value={looseSellWeight}
                onChange={(e) => setLooseSellWeight(e.target.value)}
                required
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => setShowLooseSell(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-success">
                Sell
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Piece Confirmation Modal */}
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

      {/* Delete Loose Item Confirmation Modal */}
      {looseDeleteModal && (
        <Modal
          title="Delete Loose Item"
          onClose={() => setLooseDeleteModal(null)}
        >
          <div className="form-group">
            <p>
              Are you sure you want to delete loose item{" "}
              <strong>{looseDeleteModal.name || looseDeleteModal.id}</strong>?
            </p>
          </div>

          <div className="form-actions flex justify-end gap-3 mt-6">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setLooseDeleteModal(null)}
            >
              Cancel
            </button>
            <button
              className="btn btn-danger"
              onClick={() => handleLooseDelete(looseDeleteModal.id)}
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
