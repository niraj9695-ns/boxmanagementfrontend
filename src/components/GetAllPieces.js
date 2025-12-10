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
  X,
} from "lucide-react";
import "../css/styles.css";
import "../css/components.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";

/* 🔹 Utility: Get JWT token */
function getToken() {
  return localStorage.getItem("token");
}

/* 🔹 Try to decode JWT payload (returns object or null) */
function decodeJwtPayload(token) {
  try {
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1];
    // Compatibility with URL-safe base64
    const json = decodeURIComponent(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
    return JSON.parse(json);
  } catch (err) {
    console.warn("Failed to decode JWT payload:", err);
    return null;
  }
}

/* 🔹 Check if decoded payload contains ADMIN role */
function hasAdminRole(decodedPayload) {
  if (!decodedPayload) return false;

  const possibleClaims = ["authorities", "roles", "role", "scope", "scp"];

  for (const name of possibleClaims) {
    const claim = decodedPayload[name];
    if (!claim) continue;

    if (Array.isArray(claim)) {
      if (claim.find((r) => String(r).toUpperCase().includes("ADMIN"))) {
        return true;
      }
    } else if (typeof claim === "string") {
      if (claim.toUpperCase().includes("ADMIN")) return true;
      const parts = claim.split(/[\s,;]+/);
      if (parts.find((p) => p.toUpperCase().includes("ADMIN"))) return true;
    } else if (typeof claim === "object") {
      const str = JSON.stringify(claim).toUpperCase();
      if (str.includes("ADMIN")) return true;
    }
  }

  const stringified = JSON.stringify(decodedPayload).toUpperCase();
  if (stringified.includes("ROLE_ADMIN") || stringified.includes("ADMIN"))
    return true;

  return false;
}

/* 🔹 Reusable Modal Component */
function Modal({ title, children, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="close-btn" onClick={onClose}>
            <X
              size={20}
              className="text-gray-600 hover:text-red-500 transition"
            />
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

  // Lookup options for dropdowns
  const [purityOptions, setPurityOptions] = useState([]);
  const [typeOptions, setTypeOptions] = useState([]);

  // Form state for Add (match backend names)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    barcode: "",
    type: "",
    purity: "",
    netWeight: "",
    variableWeight: "",
  });

  /* 🔹 Fetch All Pieces */
  useEffect(() => {
    fetchPieces();
  }, []);

  async function fetchPieces() {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:8080/api/pieces/getAll", {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      setPieces(res.data || []);
    } catch (err) {
      console.error("Error fetching pieces:", err);
      toast.error(
        err?.response?.data?.message || "Failed to fetch pieces from server"
      );
    } finally {
      setLoading(false);
    }
  }

  /* 🔹 Fetch purity & type options for dropdowns */
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

  /* 🔹 Handle form changes (works for inputs/selects with id matching keys) */
  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  /* 🔹 Add Piece Submit
     - Use dropdown values for type/purity
     - Keep modal open after add
     - Preserve last used type & purity
     - Clear barcode, netWeight, variableWeight
  */
  const handleAddSubmit = async (e) => {
    e.preventDefault();

    const token = getToken();
    if (!token) {
      toast.error("Missing auth token — please login");
      return;
    }

    const payload = decodeJwtPayload(token);
    const isAdmin = hasAdminRole(payload);
    if (!isAdmin) {
      toast.error(
        "You are not authorized to add pieces. ADMIN role is required. Please login with an admin account."
      );
      console.warn("Token payload (decoded):", payload);
      return;
    }

    if (!selectedContainer) {
      toast.warn("Please select a Box before adding piece");
      return;
    }

    try {
      const body = {
        barcode: formData.barcode || null,
        type: formData.type,
        purity: formData.purity || null,
        netWeight: parseFloat(formData.netWeight || 0),
        variableWeight: parseFloat(formData.variableWeight || 0),
        boxId: Number(selectedContainer),
        // createdAt: formData.date,
      };

      await axios.post("http://localhost:8080/api/pieces", body, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      toast.success("Piece added successfully");

      // ✅ Keep modal open & preserve date/type/purity/box selection
      setFormData((prev) => ({
        ...prev,
        barcode: "",
        netWeight: "",
        variableWeight: "",
      }));

      // Do NOT reset selectedCounter/Container so user can keep adding to same box
      fetchPieces();
    } catch (err) {
      console.error("Error adding piece:", err);
      if (err?.response?.status === 403) {
        toast.error(
          "Forbidden (403). Your account does not have permission to add pieces (ADMIN role required)."
        );
      } else {
        toast.error(
          err?.response?.data?.message ||
            err?.response?.data ||
            "Failed to add piece — check server logs"
        );
      }
    }
  };

  /* 🔹 Edit Piece Submit */
  const handleEditSubmit = async (e) => {
    e.preventDefault();

    const token = getToken();
    if (!token) {
      toast.error("Missing auth token — please login");
      return;
    }

    const payload = decodeJwtPayload(token);
    const isAdmin = hasAdminRole(payload);
    if (!isAdmin) {
      toast.error("You need ADMIN role to update pieces.");
      return;
    }

    try {
      await axios.put(
        `http://localhost:8080/api/pieces?id=${showEdit.id}`,
        {
          barcode: showEdit.barcode || null,
          type: showEdit.type,
          purity: showEdit.purity || null,
          netWeight: parseFloat(showEdit.netWeight || 0),
          variableWeight: parseFloat(showEdit.variableWeight || 0),
          boxId: showEdit.boxId ?? null,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success("Piece updated successfully");
      setShowEdit(null);
      fetchPieces();
    } catch (err) {
      console.error("Error updating piece:", err);
      if (err?.response?.status === 403) {
        toast.error("Forbidden (403). ADMIN role required to update pieces.");
      } else {
        toast.error(
          err?.response?.data?.message ||
            "Failed to update piece — check server"
        );
      }
    }
  };

  // open transfer modal
  const handleTransfer = async (piece) => {
    setShowTransfer(piece);
    setSelectedCounter("");
    setSelectedContainer("");
    setContainers([]);

    try {
      const token = getToken();
      if (!token) {
        toast.error("Missing auth token — please login");
        return;
      }
      const res = await axios.get("http://localhost:8080/api/counter/getAll", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCounters(res.data || []);
    } catch (err) {
      console.error(
        "Error fetching counters for transfer:",
        err,
        err?.response
      );
      toast.error("Failed to fetch counters");
    }
  };

  /* 🔹 Fetch boxes for a given counter id. */
  const handleCounterChange = async (counterId) => {
    setSelectedCounter(counterId);
    setSelectedContainer("");
    setContainers([]);

    if (!counterId) {
      return;
    }

    const numericId = Number(counterId);
    if (Number.isNaN(numericId)) {
      toast.error("Invalid counter selected");
      console.error("handleCounterChange - invalid counterId:", counterId);
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        toast.error("Missing auth token — please login");
        return;
      }

      const res = await axios.get(
        "http://localhost:8080/api/box/getByCounterId",
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { counterId: numericId },
        }
      );

      if (Array.isArray(res.data)) {
        setContainers(res.data);
        if (res.data.length === 1) {
          setSelectedContainer(String(res.data[0].id));
        }
      } else {
        console.warn("Unexpected boxes response:", res.data);
        setContainers([]);
        toast.warn("No boxes returned for this counter");
      }
    } catch (err) {
      console.error(
        "Error fetching containers (boxes):",
        err,
        err?.response?.data
      );
      const serverMsg =
        err?.response?.data?.message || err?.response?.data || err.message;
      toast.error(`Failed to fetch boxes: ${serverMsg}`);
    }
  };

  /* 🔹 Search handler */
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  /* 🔹 Filtered pieces */
  const filteredPieces = pieces.filter((piece) => {
    const q = searchQuery.toLowerCase();
    return (
      String(piece.barcode || "")
        .toLowerCase()
        .includes(q) ||
      String(piece.type || "")
        .toLowerCase()
        .includes(q) ||
      String(piece.purity || "")
        .toLowerCase()
        .includes(q) ||
      String(piece.boxId || "")
        .toLowerCase()
        .includes(q)
    );
  });

  // submit transfer
  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCounter || !selectedContainer) {
      toast.warn("Please select both counter and container ⚠️");
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        toast.error("Missing auth token — please login");
        return;
      }

      await axios.post(
        `http://localhost:8080/api/pieces/transfer?pieceId=${
          showTransfer.id
        }&boxId=${Number(selectedContainer)}`,
        null,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success("Piece transferred successfully");
      setShowTransfer(null);
      setSelectedContainer("");
      setSelectedCounter("");
      setContainers([]);
      fetchPieces();
    } catch (err) {
      console.error("Error transferring piece:", err, err?.response?.data);
      toast.error(err?.response?.data?.message || "Failed to transfer piece");
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = getToken();
      if (!token) {
        toast.error("Missing auth token — please login");
        return;
      }
      await axios.delete(`http://localhost:8080/api/pieces/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setDeleteModal(null);
      fetchPieces();
      toast.success("Piece deleted successfully");
    } catch (err) {
      console.error("Error deleting piece:", err, err?.response?.data);
      toast.error("Failed to delete piece");
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
      const token = getToken();
      if (!token) {
        toast.error("Missing auth token — please login");
        return;
      }
      const res = await axios.get("http://localhost:8080/api/counter/getAll", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCounters(res.data || []);
    } catch (err) {
      console.error("Error fetching counters:", err, err?.response?.data);
      toast.error("Failed to fetch counters");
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
              border: "1px solid #d1d5db",
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
              <th>Box ID</th>
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
                    <p>Add pieces to get started</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredPieces.map((piece) => (
                <tr key={piece.id}>
                  <td>{piece.boxId ? `Box #${piece.boxId}` : "-"}</td>
                  <td className="font-semibold">{piece.barcode || "-"}</td>
                  <td>{piece.type || "-"}</td>
                  <td>{piece.purity || "-"}</td>
                  <td>
                    {piece.netWeight ?? "-"}
                    {piece.netWeight ? "g" : ""}
                  </td>
                  <td>
                    {piece.variableWeight ?? "-"}
                    {piece.variableWeight ? "g" : ""}
                  </td>
                  <td>
                    <span
                      className={`status-badge ${
                        piece.sold ? "status-sold" : "status-available"
                      }`}
                    >
                      {piece.sold ? "SOLD" : "AVAILABLE"}
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

      {/* Create Modal */}
      {showCreate && (
        <Modal title="Add New Piece" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleAddSubmit} className="piece-form">
            <div className="form-group">
              <label>Date</label>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  value={dayjs(formData.date)}
                  onChange={(newValue) => {
                    setFormData((prev) => ({
                      ...prev,
                      date: newValue ? newValue.format("YYYY-MM-DD") : "",
                    }));
                  }}
                  slotProps={{
                    textField: {
                      size: "small",
                      required: true,
                      fullWidth: true,
                    },
                  }}
                />
              </LocalizationProvider>
            </div>

            <div className="form-group">
              <label>Barcode</label>
              <input
                type="text"
                id="barcode"
                value={formData.barcode}
                onChange={handleChange}
                required={false}
                placeholder="e.g. JWL-4456 (optional)"
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
                required={false}
              >
                <option value="">Select Purity</option>
                {purityOptions.map((p) => (
                  <option key={p.id} value={p.purity}>
                    {p.purity}
                  </option>
                ))}
              </select>
            </div>

            {/* Counter + Box selection */}
            <div className="form-row">
              <div className="form-group">
                <label>Counter</label>
                <select
                  value={selectedCounter}
                  onChange={(e) => handleCounterChange(e.target.value)}
                >
                  <option value="">Select Counter (optional)</option>
                  {counters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Box / Tray</label>
                <select
                  value={selectedContainer}
                  onChange={(e) => setSelectedContainer(e.target.value)}
                  disabled={!containers.length}
                  required
                >
                  <option value="">Select Box</option>
                  {containers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.identity ? `${b.identity}` : `Box #${b.id}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Weight (Net, g)</label>
                <input
                  type="number"
                  id="netWeight"
                  step="0.01"
                  value={formData.netWeight}
                  onChange={handleChange}
                  required
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>VWeight (g)</label>
                <input
                  type="number"
                  id="variableWeight"
                  step="0.01"
                  value={formData.variableWeight}
                  onChange={handleChange}
                  required
                  min="0"
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
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  value={dayjs(
                    showEdit.createdAt || showEdit.date || new Date()
                  )}
                  onChange={(newValue) =>
                    setShowEdit((prev) => ({
                      ...prev,
                      createdAt: newValue
                        ? newValue.format("YYYY-MM-DD")
                        : prev.createdAt,
                    }))
                  }
                  slotProps={{
                    textField: {
                      size: "small",
                      required: false,
                      fullWidth: true,
                    },
                  }}
                />
              </LocalizationProvider>
            </div>

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
                <label>Weight (Net, g)</label>
                <input
                  type="number"
                  step="0.01"
                  value={showEdit.netWeight ?? ""}
                  onChange={(e) =>
                    setShowEdit({ ...showEdit, netWeight: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>VWeight (g)</label>
                <input
                  type="number"
                  step="0.01"
                  value={showEdit.variableWeight ?? ""}
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
                {`Box #${showTransfer.boxId || "-"}`}
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
                      {b.identity ? `${b.identity}` : `Box #${b.id}`}
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
                const token = getToken();
                if (!token) {
                  toast.error("Missing auth token — please login");
                  return;
                }
                await axios.post(
                  `http://localhost:8080/api/pieces/sold?id=${showSoldOut.id}`,
                  null,
                  {
                    headers: { Authorization: `Bearer ${token}` },
                  }
                );
                setShowSoldOut(null);
                fetchPieces();
                toast.success(
                  `Piece "${
                    showSoldOut.barcode || showSoldOut.id
                  }" marked as sold`
                );
              } catch (err) {
                console.error("Error selling piece:", err, err?.response?.data);
                toast.error(
                  err?.response?.data?.message || "Failed to mark as sold"
                );
              }
            }}
            className="piece-form"
          >
            <div className="form-group">
              <p>
                Are you sure you want to mark piece{" "}
                <strong>{showSoldOut.barcode || showSoldOut.id}</strong> as
                Sold?
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

      {/* Delete Modal */}
      {deleteModal && (
        <Modal title="Delete Piece" onClose={() => setDeleteModal(null)}>
          <p>
            Are you sure you want to delete piece{" "}
            <strong>{deleteModal.barcode || deleteModal.id}</strong>?
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

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}
