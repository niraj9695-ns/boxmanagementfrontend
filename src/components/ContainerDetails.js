// ContainerDetails.js
import React, { useEffect, useState } from "react";
import "../css/styles.css";
import "../css/components.css";
import { Package, Gem, Edit2, Trash2, ArrowLeft, Plus } from "lucide-react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import { X } from "lucide-react";

/* 🔹 Toastify */
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/* ===== Modal Component ===== */
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

/* ===== Token resolver (mirrors CountersTab) ===== */
const TOKEN_KEYS = [
  "token",
  "authToken",
  "access_token",
  "jwt",
  "Authorization",
  "bearer_token",
];

function resolveTokenFromStorage() {
  // try localStorage keys first
  for (const k of TOKEN_KEYS) {
    let v = localStorage.getItem(k);
    if (!v) v = sessionStorage.getItem(k);
    if (v) return v.startsWith("Bearer ") ? v.slice(7) : v;
  }
  // try user object
  try {
    const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.token) return parsed.token;
      if (parsed?.accessToken) return parsed.accessToken;
      if (parsed?.authToken) return parsed.authToken;
    }
  } catch (err) {
    console.debug("[ContainerDetails] user parse error", err);
  }
  // fallback to 'token' key
  return localStorage.getItem("token") || null;
}

function maskToken(t) {
  if (!t) return null;
  if (t.length <= 10) return "***";
  return `****${t.slice(-8)}`;
}

/* ===== Main component ===== */
function ContainerDetails({ counter, onBack, onManage }) {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [showDelete, setShowDelete] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    // Resolve token: prefer localStorage.token explicitly
    const directToken = localStorage.getItem("token");
    const token = directToken || resolveTokenFromStorage();
    console.debug(
      "[ContainerDetails] resolved token for fetch (masked):",
      maskToken(token),
      directToken ? "(from localStorage.token)" : "(from resolver)"
    );

    if (counter?.id) {
      // make sure ContainerClass uses the same override token
      ContainerClass.setOverrideToken(token);

      ContainerClass.getByCounterId(counter.id)
        .then((data) => {
          if (!mounted) return;
          setContainers(Array.isArray(data) ? data : []);
        })
        .catch((err) => {
          console.error("Failed to fetch boxes:", err);
          if (mounted) {
            setContainers([]);
            toast.error(
              "Failed to load containers — check console/network (403 = forbidden)."
            );
          }
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    } else {
      // no counter selected
      setContainers([]);
      setLoading(false);
    }

    return () => {
      mounted = false;
    };
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
                  <td>{c.fixedWeight ?? 0}g</td>
                  <td>{c.netWeight ?? 0}g</td>
                  <td>{c.variableWeight ?? 0}g</td>
                  <td>{c.grossWeight ?? c.fixedWeight ?? 0}g</td>
                  <td>{c.totalPiece ?? 0}</td>
                  <td>
                    {new Date(
                      c.createdAt ?? c.date ?? Date.now()
                    ).toLocaleDateString()}
                  </td>
                  <td>
                    <div className="action-buttons flex gap-2">
                      <button
                        className="btn btn-primary btn-small flex items-center gap-1"
                        onClick={() => onManage(c)}
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
                      <button
                        className="btn btn-danger btn-small flex items-center gap-1"
                        onClick={() => setShowDelete(c)}
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
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
              ContainerClass.getByCounterId(counter.id).then((d) =>
                setContainers(Array.isArray(d) ? d : [])
              )
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
              ContainerClass.getByCounterId(counter.id).then((d) =>
                setContainers(Array.isArray(d) ? d : [])
              )
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
                  ContainerClass.delete(showDelete.id)
                    .then(() => ContainerClass.getByCounterId(counter.id))
                    .then((d) => {
                      setContainers(Array.isArray(d) ? d : []);
                      setShowDelete(null);
                      toast.success("Container deleted");
                    })
                    .catch((err) => {
                      console.error("Delete failed", err);
                      toast.error("Failed to delete container");
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

      <ToastContainer position="bottom-right" autoClose={2500} />
    </div>
  );
}

/* ===== CreateContainerForm ===== */
function CreateContainerForm({ counterId, onClose, onSaved }) {
  const [type, setType] = useState("BOX");
  const [identity, setIdentity] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [fixedWeight, setFixedWeight] = useState(100);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await ContainerClass.create({
        counterId,
        type,
        identity,
        fixedWeight: parseFloat(fixedWeight) || 0,
      });
      toast.success("Container created");
      onSaved();
      onClose();
    } catch (err) {
      console.error("Create error", err);
      toast.error("Failed to create container");
    }
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
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            value={dayjs(date)}
            onChange={(newValue) => {
              setDate(newValue ? newValue.format("YYYY-MM-DD") : "");
            }}
            slotProps={{
              textField: {
                required: true,
                fullWidth: true,
              },
            }}
          />
        </LocalizationProvider>
        <small className="muted">Server will set the official createdAt.</small>
      </div>
      <div className="form-group">
        <label>Fixed Weight (g)</label>
        <input
          type="number"
          step="0.01"
          value={fixedWeight}
          onChange={(e) => setFixedWeight(e.target.value)}
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

/* ===== EditContainerForm ===== */
function EditContainerForm({ container, onClose, onSaved }) {
  const [type, setType] = useState(container.type);
  const [identity, setIdentity] = useState(container.identity);
  const [date, setDate] = useState(
    (container.createdAt || container.date || "").split("T")[0]
  );
  const [fixedWeight, setFixedWeight] = useState(container.fixedWeight ?? 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await ContainerClass.update(container.id, {
        type,
        identity,
        fixedWeight: parseFloat(fixedWeight) || 0,
      });
      toast.success("Container updated");
      onSaved();
      onClose();
    } catch (err) {
      console.error("Update error", err);
      toast.error("Failed to update container");
    }
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
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            value={dayjs(date)}
            onChange={(newValue) => {
              setDate(newValue ? newValue.format("YYYY-MM-DD") : "");
            }}
            slotProps={{
              textField: {
                required: true,
                fullWidth: true,
              },
            }}
          />
        </LocalizationProvider>
        <small className="muted">
          Date is for display only; server manages timestamps.
        </small>
      </div>
      <div className="form-group">
        <label>Fixed Weight (g)</label>
        <input
          type="number"
          step="0.01"
          value={fixedWeight}
          onChange={(e) => setFixedWeight(e.target.value)}
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

/* ===== safeJson helper ===== */
async function safeJson(res) {
  const text = await res.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (err) {
    console.warn("[safeJson] parse failed", err, text);
    return null;
  }
}

/* ===== ContainerClass (uses correct endpoints and explicit localStorage token) ===== */
class ContainerClass {
  static _overrideToken = null;

  static setOverrideToken(t) {
    this._overrideToken = t;
  }

  // Build auth header: prefer localStorage.token explicitly, then override token, then resolver
  static getAuthHeader() {
    // explicit localStorage token first
    const direct = localStorage.getItem("token");
    const token = direct || this._overrideToken || resolveTokenFromStorage();
    if (!token) {
      console.warn("[ContainerClass] No auth token available.");
      return {};
    }
    return { Authorization: `Bearer ${token}` };
  }

  static async getByCounterId(counterId) {
    const url = `http://localhost:8080/api/box/getByCounterId?counterId=${encodeURIComponent(
      counterId
    )}`;
    const headers = this.getAuthHeader();
    console.debug(
      "[ContainerClass] GET",
      url,
      "auth:",
      maskToken(headers.Authorization?.replace(/^Bearer\s+/i, "") || "")
    );
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[ContainerClass] GET failed ${res.status}`, url, text);
      throw new Error(`Failed to fetch boxes: ${res.status}`);
    }
    return safeJson(res);
  }

  static async getAll() {
    const url = "http://localhost:8080/api/box/getAll";
    const headers = this.getAuthHeader();
    console.debug(
      "[ContainerClass] GET",
      url,
      "auth:",
      maskToken(headers.Authorization?.replace(/^Bearer\s+/i, "") || "")
    );
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[ContainerClass] GET all failed ${res.status}`, url, text);
      throw new Error(`Failed to fetch all boxes: ${res.status}`);
    }
    return safeJson(res);
  }

  static async getById(id) {
    const url = `http://localhost:8080/api/box/getById?Id=${encodeURIComponent(
      id
    )}`;
    const headers = this.getAuthHeader();
    console.debug(
      "[ContainerClass] GET",
      url,
      "auth:",
      maskToken(headers.Authorization?.replace(/^Bearer\s+/i, "") || "")
    );
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(
        `[ContainerClass] GET by id failed ${res.status}`,
        url,
        text
      );
      throw new Error(`Failed to fetch box: ${res.status}`);
    }
    return safeJson(res);
  }

  static async create(data) {
    const url = "http://localhost:8080/api/box/add";
    const headers = {
      "Content-Type": "application/json",
      ...this.getAuthHeader(),
    };
    console.debug(
      "[ContainerClass] POST",
      url,
      "payload:",
      data,
      "auth:",
      maskToken(headers.Authorization?.replace(/^Bearer\s+/i, "") || "")
    );
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        counterId: data.counterId,
        type: data.type,
        identity: data.identity,
        fixedWeight: data.fixedWeight,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[ContainerClass] POST failed ${res.status}`, url, text);
      throw new Error(`Failed to create box: ${res.status}`);
    }
    return safeJson(res);
  }

  static async update(id, data) {
    const url = `http://localhost:8080/api/box/update?id=${encodeURIComponent(
      id
    )}`;
    const headers = {
      "Content-Type": "application/json",
      ...this.getAuthHeader(),
    };
    console.debug(
      "[ContainerClass] PUT",
      url,
      "payload:",
      data,
      "auth:",
      maskToken(headers.Authorization?.replace(/^Bearer\s+/i, "") || "")
    );
    const res = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        type: data.type,
        identity: data.identity,
        fixedWeight: data.fixedWeight,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[ContainerClass] PUT failed ${res.status}`, url, text);
      throw new Error(`Failed to update box: ${res.status}`);
    }
    return safeJson(res);
  }

  static async transfer(boxId, counterId) {
    const url = "http://localhost:8080/api/box/transfer";
    const headers = {
      "Content-Type": "application/json",
      ...this.getAuthHeader(),
    };
    console.debug(
      "[ContainerClass] POST",
      url,
      "payload:",
      { boxId, counterId },
      "auth:",
      maskToken(headers.Authorization?.replace(/^Bearer\s+/i, "") || "")
    );
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ boxId, counterId }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(
        `[ContainerClass] transfer failed ${res.status}`,
        url,
        text
      );
      throw new Error(`Failed to transfer box: ${res.status}`);
    }
    return safeJson(res);
  }

  static async getPiecesByBoxId(boxId) {
    const url = `http://localhost:8080/api/pieces/getByBoxId?boxId=${encodeURIComponent(
      boxId
    )}`;
    const headers = this.getAuthHeader();
    console.debug(
      "[ContainerClass] GET",
      url,
      "auth:",
      maskToken(headers.Authorization?.replace(/^Bearer\s+/i, "") || "")
    );
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(
        `[ContainerClass] getPieces failed ${res.status}`,
        url,
        text
      );
      throw new Error(`Failed to fetch pieces: ${res.status}`);
    }
    return safeJson(res);
  }

  static async delete(id) {
    const url = `http://localhost:8080/api/box/delete?Id=${encodeURIComponent(
      id
    )}`;
    const headers = this.getAuthHeader();
    console.debug(
      "[ContainerClass] DELETE",
      url,
      "auth:",
      maskToken(headers.Authorization?.replace(/^Bearer\s+/i, "") || "")
    );
    const res = await fetch(url, { method: "DELETE", headers });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[ContainerClass] DELETE failed ${res.status}`, url, text);
      throw new Error(`Failed to delete box: ${res.status}`);
    }
    if (res.headers.get("content-type")?.includes("application/json"))
      return safeJson(res);
    return res.ok;
  }
}

export default ContainerDetails;
