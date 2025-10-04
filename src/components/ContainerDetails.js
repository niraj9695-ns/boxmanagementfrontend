import React, { useEffect, useState } from "react";
import "../css/styles.css";
import "../css/components.css";
import { Package, Gem, Edit2, Trash2, ArrowLeft, Plus } from "lucide-react";

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

function ContainerDetails({ counter, onBack, onManage }) {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [showDelete, setShowDelete] = useState(null);

  // Fetch containers when counter changes
  useEffect(() => {
    if (counter?.id) {
      ContainerClass.getByCounterId(counter.id).then((data) => {
        setContainers(data);
        setLoading(false);
      });
    }
  }, [counter]);

  if (!counter) return <p>No counter selected.</p>;

  return (
    <div id="containerDetails" className="tab-content active">
      {/* Header */}
      <div className="section-header flex items-center justify-between">
        <button
          className="btn btn-secondary flex items-center gap-1"
          onClick={onBack}
        >
          <ArrowLeft size={16} />
          Back to Counters
        </button>
        <h2 id="containerTitle">
          Containers for <strong>{counter.name}</strong>
        </h2>
        <button
          className="btn btn-success flex items-center gap-1"
          onClick={() => setShowCreate(true)}
        >
          <Plus size={16} />
          Add Container
        </button>
      </div>

      {/* Table / Empty State */}
      <div className="table-container">
        {loading ? (
          <p>Loading containers...</p>
        ) : containers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Package size={32} />
            </div>
            <h3>No containers found</h3>
            <p>Create your first container to get started</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Container</th>
                <th>Type</th>
                <th>Fixed Weight</th>
                <th>Net Weight</th>
                <th>Variable Weight</th>
                <th>Gross Weight</th>
                <th>Pieces</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {containers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>
                      {c.type} #{c.identity}
                    </strong>
                  </td>
                  <td>
                    <span className="container-type">{c.type}</span>
                  </td>
                  <td>{c.fixedWeight}g</td>
                  <td>{c.netWeight ?? 0}g</td>
                  <td>{c.variableWeight ?? 0}g</td>
                  <td>{c.grossWeight ?? c.fixedWeight}g</td>
                  <td>{c.totalPieces ?? 0}</td>

                  <td>{new Date(c.date).toLocaleDateString()}</td>
                  <td>
                    <div className="action-buttons flex gap-2">
                      <button
                        className="btn btn-primary btn-small flex items-center gap-1"
                        onClick={() => onManage(c)} // 🔹 tell A to go to C
                      >
                        <Gem size={16} />
                        Manage
                      </button>
                      <button
                        className="btn btn-warning btn-small flex items-center gap-1"
                        onClick={() => setShowEdit(c)}
                      >
                        <Edit2 size={16} />
                        Edit
                      </button>
                      {/* <button
                        className="btn btn-danger btn-small flex items-center gap-1"
                        onClick={() => setShowDelete(c)}
                      >
                        <Trash2 size={16} />
                        Delete
                      </button> */}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <Modal
          title="Create New Container"
          onClose={() => setShowCreate(false)}
        >
          <CreateContainerForm
            counterId={counter.id}
            onClose={() => setShowCreate(false)}
            onSaved={() =>
              ContainerClass.getByCounterId(counter.id).then(setContainers)
            }
          />
        </Modal>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <Modal title="Edit Container" onClose={() => setShowEdit(null)}>
          <EditContainerForm
            container={showEdit}
            onClose={() => setShowEdit(null)}
            onSaved={() =>
              ContainerClass.getByCounterId(counter.id).then(setContainers)
            }
          />
        </Modal>
      )}

      {/* Delete Modal */}
      {showDelete && (
        <Modal title="Delete Container" onClose={() => setShowDelete(null)}>
          <div className="confirmation-dialog">
            <p>
              Are you sure you want to delete{" "}
              <strong>
                {showDelete.type} #{showDelete.identity}
              </strong>
              ?
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
                  ContainerClass.delete(showDelete.id).then(() => {
                    ContainerClass.getByCounterId(counter.id).then(
                      setContainers
                    );
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
}

/* 🔹 Create Container Form */
function CreateContainerForm({ counterId, onClose, onSaved }) {
  const [type, setType] = useState("BOX");
  const [identity, setIdentity] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [fixedWeight, setFixedWeight] = useState(100);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await ContainerClass.create({
      type,
      identity,
      counterId,
      date,
      fixedWeight,
    });
    onSaved();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      <div className="form-group">
        <label>Type</label>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="BOX">Box</option>
          <option value="TRAY">Tray</option>
        </select>
      </div>
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

/* 🔹 Edit Container Form */
function EditContainerForm({ container, onClose, onSaved }) {
  const [type, setType] = useState(container.type);
  const [identity, setIdentity] = useState(container.identity);
  const [date, setDate] = useState(container.date.split("T")[0]);
  const [fixedWeight, setFixedWeight] = useState(container.fixedWeight);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await ContainerClass.update(container.id, {
      type,
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
        <label>Type</label>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="BOX">Box</option>
          <option value="TRAY">Tray</option>
        </select>
      </div>
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

/* 🔹 Safe JSON parser */
async function safeJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : [];
  } catch {
    return [];
  }
}

/* 🔹 API Wrapper for Containers */
function getToken() {
  return localStorage.getItem("token");
}

class ContainerClass {
  static async getAll() {
    const res = await fetch("http://localhost:8080/api/boxes", {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return safeJson(res);
  }

  static async getByCounterId(counterId) {
    const res = await fetch(
      `http://localhost:8080/api/boxes/by-counter?counterId=${counterId}`,
      {
        headers: { Authorization: `Bearer ${getToken()}` },
      }
    );
    return safeJson(res);
  }

  static async create(data) {
    const res = await fetch("http://localhost:8080/api/boxes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(data),
    });
    return safeJson(res);
  }

  static async update(id, data) {
    const res = await fetch(`http://localhost:8080/api/boxes/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(data),
    });
    return safeJson(res);
  }

  static async delete(id) {
    const res = await fetch(`http://localhost:8080/api/boxes/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return res.ok;
  }
}

export default ContainerDetails;
