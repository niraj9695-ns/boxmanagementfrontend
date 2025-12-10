import React, { useEffect, useState } from "react";
import axios from "axios";
import "../css/styles.css";
import "../css/components.css";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const PURITY_BASE_URL = "http://localhost:8080/purity";
const TYPE_BASE_URL = "http://localhost:8080/type";

function getToken() {
  return localStorage.getItem("token");
}

/* Simple Modal component just for this tab */
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
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export default function SettingsTab() {
  // --- Purity state ---
  const [purities, setPurities] = useState([]);
  const [purityLoading, setPurityLoading] = useState(true);
  const [purityModalOpen, setPurityModalOpen] = useState(false);
  const [purityMode, setPurityMode] = useState("add"); // "add" | "edit"
  const [currentPurity, setCurrentPurity] = useState({ id: null, purity: "" });

  // --- Types state ---
  const [types, setTypes] = useState([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [typeMode, setTypeMode] = useState("add"); // "add" | "edit"
  const [currentType, setCurrentType] = useState({ id: null, name: "" });

  // --- Fetch purity list from backend ---
  const fetchPurities = async () => {
    try {
      setPurityLoading(true);
      const res = await axios.get(`${PURITY_BASE_URL}/getAll`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      setPurities(res.data || []);
    } catch (err) {
      console.error("Error fetching purities:", err);
      toast.error("Failed to load purity list");
    } finally {
      setPurityLoading(false);
    }
  };

  // --- Fetch types list from backend ---
  const fetchTypes = async () => {
    try {
      setTypesLoading(true);
      const res = await axios.get(`${TYPE_BASE_URL}/getAll`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      setTypes(res.data || []);
    } catch (err) {
      console.error("Error fetching types:", err);
      toast.error("Failed to load types list");
    } finally {
      setTypesLoading(false);
    }
  };

  useEffect(() => {
    fetchPurities();
    fetchTypes();
  }, []);

  // --- Open Add / Edit purity modal ---
  const openAddPurity = () => {
    setPurityMode("add");
    setCurrentPurity({ id: null, purity: "" });
    setPurityModalOpen(true);
  };

  const openEditPurity = (purity) => {
    setPurityMode("edit");
    setCurrentPurity({ id: purity.id, purity: purity.purity });
    setPurityModalOpen(true);
  };

  // --- Submit Add / Edit purity ---
  const handlePuritySubmit = async (e) => {
    e.preventDefault();
    const value = (currentPurity.purity || "").trim();
    if (!value) {
      toast.warning("Purity is required");
      return;
    }

    try {
      if (purityMode === "add") {
        // POST /purity/add
        await axios.post(
          `${PURITY_BASE_URL}/add`,
          { purity: value },
          {
            headers: {
              Authorization: `Bearer ${getToken()}`,
            },
          }
        );
        toast.success("Purity added successfully");
      } else {
        // PUT /purity/update?id=1
        await axios.put(
          `${PURITY_BASE_URL}/update`,
          { purity: value },
          {
            headers: {
              Authorization: `Bearer ${getToken()}`,
            },
            params: {
              id: currentPurity.id,
            },
          }
        );
        toast.success("Purity updated successfully");
      }

      setPurityModalOpen(false);
      setCurrentPurity({ id: null, purity: "" });
      fetchPurities();
    } catch (err) {
      console.error("Error saving purity:", err);
      toast.error("Failed to save purity");
    }
  };

  // --- Delete purity ---
  const handleDeletePurity = async (purity) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete purity "${purity.purity}"?`
    );
    if (!confirmDelete) return;

    try {
      await axios.delete(`${PURITY_BASE_URL}/delete`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        params: {
          id: purity.id,
        },
      });
      toast.success("Purity deleted successfully");
      fetchPurities();
    } catch (err) {
      console.error("Error deleting purity:", err);
      toast.error("Failed to delete purity");
    }
  };

  // --- Open Add / Edit type modal ---
  const openAddType = () => {
    setTypeMode("add");
    setCurrentType({ id: null, name: "" });
    setTypeModalOpen(true);
  };

  const openEditType = (type) => {
    setTypeMode("edit");
    setCurrentType({ id: type.id, name: type.name });
    setTypeModalOpen(true);
  };

  // --- Submit Add / Edit type ---
  const handleTypeSubmit = async (e) => {
    e.preventDefault();
    const value = (currentType.name || "").trim();
    if (!value) {
      toast.warning("Type name is required");
      return;
    }

    try {
      if (typeMode === "add") {
        // POST /type/add
        await axios.post(
          `${TYPE_BASE_URL}/add`,
          { name: value },
          {
            headers: {
              Authorization: `Bearer ${getToken()}`,
            },
          }
        );
        toast.success("Type added successfully");
      } else {
        // PUT /type/update?id=1
        await axios.put(
          `${TYPE_BASE_URL}/update`,
          { name: value },
          {
            headers: {
              Authorization: `Bearer ${getToken()}`,
            },
            params: {
              id: currentType.id,
            },
          }
        );
        toast.success("Type updated successfully");
      }

      setTypeModalOpen(false);
      setCurrentType({ id: null, name: "" });
      fetchTypes();
    } catch (err) {
      console.error("Error saving type:", err);
      toast.error("Failed to save type");
    }
  };

  // --- Delete type ---
  const handleDeleteType = async (type) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete type "${type.name}"?`
    );
    if (!confirmDelete) return;

    try {
      await axios.delete(`${TYPE_BASE_URL}/delete`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        params: {
          id: type.id,
        },
      });
      toast.success("Type deleted successfully");
      fetchTypes();
    } catch (err) {
      console.error("Error deleting type:", err);
      toast.error("Failed to delete type");
    }
  };

  return (
    <div id="settingsTab" className="tab">
      <div className="section-header">
        <h2>Settings</h2>
      </div>

      <div className="settings-container">
        {/* --- Purity Management --- */}
        <div className="settings-section">
          <div className="settings-section-header">
            <h3>Purity Management</h3>
            <button
              id="addPurityBtn"
              className="btn btn-success"
              onClick={openAddPurity}
            >
              <i data-lucide="plus"></i>
              Add Purity
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  {/* Description removed as requested earlier */}
                  <th>Purity</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="purityTableBody">
                {purityLoading ? (
                  <tr>
                    <td colSpan={2} className="text-center py-4">
                      Loading...
                    </td>
                  </tr>
                ) : purities.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="empty-state text-center py-4">
                      <div className="empty-state-icon">
                        <i data-lucide="star"></i>
                      </div>
                      <h3>No purity levels found</h3>
                      <p>Add purity levels to get started</p>
                    </td>
                  </tr>
                ) : (
                  purities.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.purity}</strong>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-small btn-warning"
                            onClick={() => openEditPurity(p)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-small btn-danger"
                            onClick={() => handleDeletePurity(p)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- Types Management --- */}
        <div className="settings-section">
          <div className="settings-section-header">
            <h3>Jewelry Types Management</h3>
            <button
              id="addTypeBtn"
              className="btn btn-success"
              onClick={openAddType}
            >
              <i data-lucide="plus"></i>
              Add Type
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type Name</th>
                  {/* <th>Category</th> */}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="typesTableBody">
                {typesLoading ? (
                  <tr>
                    <td colSpan={3} className="text-center py-4">
                      Loading...
                    </td>
                  </tr>
                ) : types.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="empty-state text-center py-4">
                      <div className="empty-state-icon">
                        <i data-lucide="tag"></i>
                      </div>
                      <h3>No jewelry types found</h3>
                      <p>Add jewelry types to get started</p>
                    </td>
                  </tr>
                ) : (
                  types.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <strong>{t.name}</strong>
                      </td>
                      {/* Backend does not have category, so show "-" */}
                      {/* <td>-</td> */}
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-small btn-warning"
                            onClick={() => openEditType(t)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-small btn-danger"
                            onClick={() => handleDeleteType(t)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Purity Modal */}
      {purityModalOpen && (
        <Modal
          title={purityMode === "add" ? "Add New Purity" : "Edit Purity"}
          onClose={() => setPurityModalOpen(false)}
        >
          <form onSubmit={handlePuritySubmit} className="piece-form">
            <div className="form-group">
              <label>Purity</label>
              <input
                type="text"
                value={currentPurity.purity}
                onChange={(e) =>
                  setCurrentPurity((prev) => ({
                    ...prev,
                    purity: e.target.value,
                  }))
                }
                placeholder="e.g. 24K, 22K"
                required
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPurityModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={
                  purityMode === "add" ? "btn btn-success" : "btn btn-warning"
                }
              >
                {purityMode === "add" ? "Add Purity" : "Update Purity"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Type Modal */}
      {typeModalOpen && (
        <Modal
          title={typeMode === "add" ? "Add New Type" : "Edit Type"}
          onClose={() => setTypeModalOpen(false)}
        >
          <form onSubmit={handleTypeSubmit} className="piece-form">
            <div className="form-group">
              <label>Type Name</label>
              <input
                type="text"
                value={currentType.name}
                onChange={(e) =>
                  setCurrentType((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder="e.g. Ring, Chain"
                required
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setTypeModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={
                  typeMode === "add" ? "btn btn-success" : "btn btn-warning"
                }
              >
                {typeMode === "add" ? "Add Type" : "Update Type"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Toasts */}
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
    </div>
  );
}
