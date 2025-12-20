// BarcodeScanner.js
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import "../css/styles.css";
import "../css/components.css";
import "../css/BarcodeScanner.css";
import {
  Play,
  Plus,
  Move,
  ShoppingCart,
  Trash2,
  Scan,
  StopCircle,
  X,
  Info,
  Search,
} from "lucide-react";

/* ---------------------------
   Helpers
   --------------------------- */

function getToken() {
  return localStorage.getItem("token");
}

const LocalStorage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  },
};

const genId = () => Math.random().toString(36).slice(2, 9);

/* ---------------------------
   Modal & Toast UI
   --------------------------- */

function ModalView({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div
      className="modal-backdrop"
      onMouseDown={onClose}
      role="dialog"
      aria-modal
    >
      <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button
            className="btn-icon"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function Toast({ toast, onClose }) {
  return (
    <div className={`toast ${toast.type} ${toast.show ? "show" : ""}`}>
      <div className="toast-content">
        <div className="toast-message">{toast.message}</div>
      </div>
      <div className="toast-actions">
        {toast.undoCallback && (
          <button
            className="toast-btn"
            onClick={() => {
              toast.undoCallback();
              onClose(toast.id);
            }}
          >
            Undo
          </button>
        )}
        <button
          className="toast-close"
          title="Close"
          onClick={() => onClose(toast.id)}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

/* ---------------------------
   Main Component
   --------------------------- */

export default function BarcodeScannerIntegrated() {
  // scanner state
  const [listening, setListening] = useState(false);
  const [currentOperation, setCurrentOperation] = useState("add"); // add | transfer | soldout | delete
  const [scanBuffer, setScanBuffer] = useState("");
  const [scanHistory, setScanHistory] = useState(() =>
    LocalStorage.get("scanHistory", [])
  );
  const [lastScanTime, setLastScanTime] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // destination for transfer
  const [destinationCounterId, setDestinationCounterId] = useState("");
  const [destinationContainerId, setDestinationContainerId] = useState("");

  // backend data
  const [pieces, setPieces] = useState([]);
  const [counters, setCounters] = useState([]);
  const [boxesByCounter, setBoxesByCounter] = useState({}); // counterId -> boxes[]

  // modal / toast UI
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalContent, setModalContent] = useState(null);
  const [toasts, setToasts] = useState([]);
  const scannerInputRef = useRef(null);
  const announcementsRef = useRef(null);

  //display pieces list
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // quick-add modal selection memory
  const [lastQuickAddSelection, setLastQuickAddSelection] = useState({
    counterId: "",
    boxId: "",
    type: "",
    purity: "",
  });
  const [pendingAddHistoryId, setPendingAddHistoryId] = useState(null);

  /* ---------------------------
     Initial Data
     --------------------------- */

  /// display list
  /* 🔹 Fetch All Pieces */
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
      // You can add toast here if you want
      // toast.error("Failed to fetch pieces from server");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPieces();
  }, []);

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

  ///display list end
  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    const token = getToken();
    if (!token) return;
    try {
      const [piecesRes, countersRes] = await Promise.all([
        axios.get("http://localhost:8080/api/pieces/getAll", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get("http://localhost:8080/api/counter/getAll", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setPieces(piecesRes.data || []);
      setCounters(countersRes.data || []);
    } catch (err) {
      console.error("Error fetching initial data:", err);
    }
  }

  async function fetchBoxesForCounter(counterId) {
    if (!counterId) return;
    if (boxesByCounter[counterId]) return; // cached
    const token = getToken();
    if (!token) return;
    try {
      const res = await axios.get(
        "http://localhost:8080/api/box/getByCounterId",
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { counterId },
        }
      );
      setBoxesByCounter((prev) => ({
        ...prev,
        [counterId]: res.data || [],
      }));
    } catch (err) {
      console.error("Error fetching boxes for counter:", err);
    }
  }

  // when transfer destination counter changes, fetch boxes
  useEffect(() => {
    if (destinationCounterId) {
      fetchBoxesForCounter(destinationCounterId);
    }
  }, [destinationCounterId]);

  /* ---------------------------
     Scan history persistence
     --------------------------- */

  useEffect(() => {
    LocalStorage.set("scanHistory", scanHistory);
  }, [scanHistory]);

  useEffect(() => {
    if (scannerInputRef.current) {
      scannerInputRef.current.value = scanBuffer;
    }
  }, [scanBuffer]);

  /* ---------------------------
     Global key handler
     --------------------------- */

  useEffect(() => {
    function onKeyDown(e) {
      if (listening) {
        if (e.key === "Enter") {
          e.preventDefault();
        }
        handleKeyInput(e);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    listening,
    scanBuffer,
    currentOperation,
    destinationCounterId,
    destinationContainerId,
    lastScanTime,
  ]);

  /* ---------------------------
     Small helpers
     --------------------------- */

  function announce(text) {
    if (announcementsRef.current) {
      announcementsRef.current.textContent = text;
    }
  }

  function pushToast(message, type = "success", undoCallback = null) {
    const id = genId();
    const newToast = { id, message, type, undoCallback, show: true };
    setToasts((t) => [newToast, ...t]);

    setTimeout(() => {
      setToasts((t) => t.map((x) => (x.id === id ? { ...x, show: false } : x)));
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 400);
    }, 6000);
  }

  function removeToast(id) {
    setToasts((t) => t.filter((x) => x.id !== id));
  }

  function playSuccessSound() {
    if (!audioEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.setValueAtTime(800, ctx.currentTime);
      g.gain.setValueAtTime(0.1, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      o.start(ctx.currentTime);
      o.stop(ctx.currentTime + 0.2);
    } catch {}
  }

  function playErrorSound() {
    if (!audioEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.setValueAtTime(400, ctx.currentTime);
      g.gain.setValueAtTime(0.1, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      o.start(ctx.currentTime);
      o.stop(ctx.currentTime + 0.3);
    } catch {}
  }

  /* ---------------------------
     Listening / keyboard
     --------------------------- */

  function toggleListening() {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  }

  function startListening() {
    if (
      currentOperation === "transfer" &&
      (!destinationCounterId || !destinationContainerId)
    ) {
      pushToast(
        "Please select destination counter and container for transfer operation",
        "error"
      );
      return;
    }

    // refresh pieces when starting a session
    fetchInitialData();

    setScanBuffer("");
    setListening(true);
    setTimeout(() => {
      if (scannerInputRef.current) scannerInputRef.current.focus();
    }, 0);
    announce("Ready to scan");
  }

  function stopListening() {
    setListening(false);
    setScanBuffer("");
    announce("Stopped listening");
  }

  function handleKeyInput(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (scanBuffer.trim()) {
        processScan(scanBuffer.trim());
        setScanBuffer("");
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setScanBuffer("");
      announce("Scan cancelled");
      return;
    }

    if (e.key.length === 1) {
      setScanBuffer((s) => s + e.key);
    }
  }

  /* ---------------------------
     Scan processing
     --------------------------- */

  function updateHistoryStatus(id, status, message = "") {
    setScanHistory((h) => {
      const nh = h.map((it) =>
        it.id === id ? { ...it, status, message } : it
      );
      LocalStorage.set("scanHistory", nh);
      return nh;
    });
  }

  function processScan(barcode) {
    const now = Date.now();
    if (now - lastScanTime < 200) return; // dedupe within 200ms
    setLastScanTime(now);

    announce(`Scanned: ${barcode}`);

    const historyItem = {
      id: genId(),
      barcode,
      operation: currentOperation,
      timestamp: new Date().toISOString(),
      status: "pending",
      message: "",
    };

    setScanHistory((h) => {
      const nh = [historyItem, ...h].slice(0, 10);
      LocalStorage.set("scanHistory", nh);
      return nh;
    });

    switch (currentOperation) {
      case "add":
        handleAddPiece(barcode, historyItem);
        break;
      case "transfer":
        handleTransferPiece(barcode, historyItem);
        break;
      case "soldout":
        handleMarkSoldOut(barcode, historyItem);
        break;
      case "delete":
        handleDeletePiece(barcode, historyItem);
        break;
      default:
        break;
    }
  }

  /* ---------------------------
     Backend operations
     --------------------------- */

  // ADD: open modal, then confirm from QuickAddForm
  function handleAddPiece(barcode, historyItem) {
    const existing = pieces.find(
      (p) => (p.barcode || "").toLowerCase() === barcode.toLowerCase()
    );
    if (existing) {
      updateHistoryStatus(historyItem.id, "error", "Piece already exists");
      pushToast(`Piece ${barcode} already exists`, "error");
      playErrorSound();
      return;
    }

    setPendingAddHistoryId(historyItem.id);
    setModalTitle("Quick Add Piece");
    setModalContent(
      <QuickAddForm
        barcode={barcode}
        lastSelection={lastQuickAddSelection}
        onCancel={() => {
          updateHistoryStatus(historyItem.id, "error", "Cancelled");
          setModalOpen(false);
        }}
        onSubmit={confirmAddPiece}
      />
    );
    setModalOpen(true);
  }

  async function confirmAddPiece(formValues) {
    const historyId = pendingAddHistoryId;
    const token = getToken();
    if (!token) {
      pushToast("Missing auth token — please login", "error");
      updateHistoryStatus(historyId, "error", "No auth");
      playErrorSound();
      return false;
    }

    try {
      const body = {
        barcode: formValues.barcode,
        type: formValues.type,
        purity: formValues.purity,
        netWeight: parseFloat(formValues.netWeight || 0),
        variableWeight: parseFloat(formValues.variableWeight || 0),
        boxId: Number(formValues.boxId),
      };

      const res = await axios.post("http://localhost:8080/api/pieces", body, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const newPiece = res.data;
      setPieces((prev) => [...prev, newPiece]);

      setLastQuickAddSelection({
        counterId: formValues.counterId,
        boxId: formValues.boxId,
        type: formValues.type,
        purity: formValues.purity,
      });

      updateHistoryStatus(historyId, "success", "Added successfully");

      pushToast(
        `Added piece ${newPiece.barcode || formValues.barcode}`,
        "success",
        () => undoAddPiece(newPiece)
      );
      playSuccessSound();
      return true;
    } catch (err) {
      console.error("Error adding piece via scanner:", err);
      updateHistoryStatus(historyId, "error", "Failed to add");
      const serverMsg =
        err?.response?.data?.message || err?.response?.data || err.message;
      pushToast(`Failed to add piece: ${serverMsg}`, "error");
      playErrorSound();
      return false;
    }
  }

  async function undoAddPiece(piece) {
    const token = getToken();
    if (!token) {
      pushToast("Missing auth token — please login", "error");
      return;
    }

    try {
      await axios.delete("http://localhost:8080/api/pieces/delete", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          id: piece.id, // ✅ sent as request param
        },
      });

      // update UI
      setPieces((prev) => prev.filter((p) => p.id !== piece.id));

      pushToast("Add operation undone", "success");
    } catch (err) {
      console.error("Failed to undo add:", err?.response || err);

      if (err?.response?.status === 403) {
        pushToast("You are not authorized to delete this piece", "error");
      } else {
        pushToast(
          err?.response?.data || "Failed to undo add operation",
          "error"
        );
      }
    }
  }

  // TRANSFER
  async function handleTransferPiece(barcode, historyItem) {
    if (!destinationCounterId || !destinationContainerId) {
      updateHistoryStatus(historyItem.id, "error", "Destination not selected");
      pushToast(
        "Please select destination counter and container for transfer",
        "error"
      );
      playErrorSound();
      return;
    }

    const piece = pieces.find(
      (p) => (p.barcode || "").toLowerCase() === barcode.toLowerCase()
    );
    if (!piece) {
      updateHistoryStatus(historyItem.id, "error", "Piece not found");
      pushToast(`Piece ${barcode} not found`, "error");
      playErrorSound();
      return;
    }

    const prevBoxId = piece.boxId;
    const token = getToken();
    if (!token) {
      pushToast("Missing auth token — please login", "error");
      updateHistoryStatus(historyItem.id, "error", "No auth");
      playErrorSound();
      return;
    }

    try {
      await axios.post("http://localhost:8080/api/pieces/transfer", null, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          pieceId: piece.id,
          boxId: Number(destinationContainerId),
        },
      });

      setPieces((prev) =>
        prev.map((p) =>
          p.id === piece.id
            ? { ...p, boxId: Number(destinationContainerId) }
            : p
        )
      );

      updateHistoryStatus(
        historyItem.id,
        "success",
        "Transferred successfully"
      );

      const destBoxes = boxesByCounter[destinationCounterId] || [];
      const destBox = destBoxes.find(
        (b) => b.id === Number(destinationContainerId)
      );
      const destLabel = destBox
        ? destBox.identity
          ? `Box ${destBox.identity}`
          : `Box #${destBox.id}`
        : `Box #${destinationContainerId}`;

      pushToast(`Transferred piece ${barcode} to ${destLabel}`, "success", () =>
        undoTransfer(piece.id, prevBoxId)
      );
      playSuccessSound();
    } catch (err) {
      console.error("Error transferring piece:", err);
      updateHistoryStatus(historyItem.id, "error", "Transfer failed");
      const msg =
        err?.response?.data?.message || err?.response?.data || err.message;
      pushToast(`Failed to transfer piece: ${msg}`, "error");
      playErrorSound();
    }
  }

  async function undoTransfer(pieceId, originalBoxId) {
    const token = getToken();
    if (!token) {
      pushToast("Cannot undo transfer: missing auth token", "error");
      return;
    }
    try {
      await axios.post("http://localhost:8080/api/pieces/transfer", null, {
        headers: { Authorization: `Bearer ${token}` },
        params: { pieceId, boxId: originalBoxId },
      });
      setPieces((prev) =>
        prev.map((p) => (p.id === pieceId ? { ...p, boxId: originalBoxId } : p))
      );
      pushToast("Transfer operation undone", "success");
    } catch (err) {
      console.error("Failed to undo transfer:", err);
      pushToast("Failed to undo transfer operation", "error");
    }
  }

  // SOLD OUT
  async function handleMarkSoldOut(barcode, historyItem) {
    const piece = pieces.find(
      (p) => (p.barcode || "").toLowerCase() === barcode.toLowerCase()
    );
    if (!piece) {
      updateHistoryStatus(historyItem.id, "error", "Piece not found");
      pushToast(`Piece ${barcode} not found`, "error");
      playErrorSound();
      return;
    }

    if (piece.sold) {
      updateHistoryStatus(historyItem.id, "success", "Already sold");
      pushToast(`Piece ${barcode} is already marked as sold`, "success");
      return;
    }

    const token = getToken();
    if (!token) {
      pushToast("Missing auth token — please login", "error");
      updateHistoryStatus(historyItem.id, "error", "No auth");
      playErrorSound();
      return;
    }

    try {
      await axios.post("http://localhost:8080/api/pieces/sold", null, {
        headers: { Authorization: `Bearer ${token}` },
        params: { id: piece.id },
      });

      setPieces((prev) =>
        prev.map((p) => (p.id === piece.id ? { ...p, sold: true } : p))
      );

      updateHistoryStatus(historyItem.id, "success", "Marked as sold");

      pushToast(`Marked piece ${barcode} as sold`, "success", () =>
        undoSoldOut(piece.id)
      );
      playSuccessSound();
    } catch (err) {
      console.error("Error marking sold:", err);
      updateHistoryStatus(historyItem.id, "error", "Failed to mark sold");
      const msg =
        err?.response?.data?.message || err?.response?.data || err.message;
      pushToast(`Failed to mark as sold: ${msg}`, "error");
      playErrorSound();
    }
  }

  async function undoSoldOut(pieceId) {
    const token = getToken();
    if (!token) {
      pushToast("Cannot undo sold status: missing auth token", "error");
      return;
    }
    const piece = pieces.find((p) => p.id === pieceId);
    if (!piece) {
      pushToast("Cannot undo sold status: piece not in cache", "error");
      return;
    }

    try {
      await axios.put(
        "http://localhost:8080/api/pieces",
        {
          barcode: piece.barcode,
          type: piece.type,
          purity: piece.purity,
          netWeight: piece.netWeight,
          variableWeight: piece.variableWeight,
          boxId: piece.boxId,
          sold: false,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { id: pieceId },
        }
      );

      setPieces((prev) =>
        prev.map((p) => (p.id === pieceId ? { ...p, sold: false } : p))
      );

      pushToast("Sold status undone", "success");
    } catch (err) {
      console.error("Failed to undo sold status:", err);
      pushToast("Failed to undo sold status", "error");
    }
  }

  // DELETE
  async function handleDeletePiece(barcode, historyItem) {
    const piece = pieces.find(
      (p) => (p.barcode || "").toLowerCase() === barcode.toLowerCase()
    );

    if (!piece) {
      updateHistoryStatus(historyItem.id, "error", "Piece not found");
      pushToast(`Piece ${barcode} not found`, "error");
      playErrorSound();
      return;
    }

    const token = getToken();
    if (!token) {
      pushToast("Missing auth token — please login", "error");
      updateHistoryStatus(historyItem.id, "error", "No auth");
      playErrorSound();
      return;
    }

    const pieceCopy = { ...piece };

    try {
      // ✅ CORRECT DELETE API CALL (REQUEST PARAM)
      await axios.delete("http://localhost:8080/api/pieces/delete", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          id: piece.id,
        },
      });

      // ✅ update UI
      setPieces((prev) => prev.filter((p) => p.id !== piece.id));

      updateHistoryStatus(historyItem.id, "success", "Deleted successfully");

      pushToast(`Deleted piece ${barcode}`, "success", () =>
        undoDelete(pieceCopy)
      );

      playSuccessSound();
    } catch (err) {
      console.error("Error deleting piece:", err?.response || err);

      updateHistoryStatus(historyItem.id, "error", "Delete failed");

      if (err?.response?.status === 403) {
        pushToast("You are not authorized to delete this piece", "error");
      } else {
        const msg =
          err?.response?.data?.message || err?.response?.data || err.message;
        pushToast(`Failed to delete piece: ${msg}`, "error");
      }

      playErrorSound();
    }
  }

  async function undoDelete(pieceData) {
    const token = getToken();
    if (!token) {
      pushToast("Cannot undo delete: missing auth token", "error");
      return;
    }

    try {
      const body = {
        barcode: pieceData.barcode,
        type: pieceData.type,
        purity: pieceData.purity,
        netWeight: pieceData.netWeight,
        variableWeight: pieceData.variableWeight,
        boxId: pieceData.boxId,
      };

      const res = await axios.post("http://localhost:8080/api/pieces", body, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const newPiece = res.data;
      setPieces((prev) => [...prev, newPiece]);
      pushToast("Delete undone (piece re-added)", "success");
    } catch (err) {
      console.error("Failed to undo delete:", err);
      pushToast("Failed to undo delete", "error");
    }
  }

  /* ---------------------------
     History & Info helpers
     --------------------------- */

  function clearHistory() {
    setScanHistory([]);
    LocalStorage.set("scanHistory", []);
    pushToast("Scan history cleared", "success");
  }

  function undoLast() {
    setScanHistory((h) => {
      const [, ...rest] = h;
      LocalStorage.set("scanHistory", rest);
      return rest;
    });
    announce("Last scan removed from history");
  }

  function showPieceInfo(barcode) {
    const piece = pieces.find(
      (p) => (p.barcode || "").toLowerCase() === barcode.toLowerCase()
    );
    if (!piece) {
      pushToast("Piece not found", "error");
      return;
    }

    setModalTitle("Piece Information");
    setModalContent(
      <div className="piece-info">
        <h3>{piece.barcode}</h3>
        <div className="info-grid">
          <div className="info-item">
            <label>Type:</label>
            <span>{piece.type}</span>
          </div>
          <div className="info-item">
            <label>Purity:</label>
            <span>{piece.purity}</span>
          </div>
          <div className="info-item">
            <label>Net Weight:</label>
            <span>{piece.netWeight}g</span>
          </div>
          <div className="info-item">
            <label>VWeight:</label>
            <span>{piece.variableWeight}g</span>
          </div>
          <div className="info-item">
            <label>Status:</label>
            <span
              className={`status-badge ${
                piece.sold ? "status-sold" : "status-available"
              }`}
            >
              {piece.sold ? "SOLD" : "AVAILABLE"}
            </span>
          </div>
          <div className="info-item">
            <label>Box:</label>
            <span>{piece.boxId ? `Box #${piece.boxId}` : "-"}</span>
          </div>
        </div>
      </div>
    );
    setModalOpen(true);
  }

  /* ---------------------------
     Render
     --------------------------- */

  const transferBoxes =
    destinationCounterId && boxesByCounter[destinationCounterId]
      ? boxesByCounter[destinationCounterId]
      : [];

  return (
    <div>
      <div id="scannerTab" className="ta">
        <div className="section-header">
          <h2>Barcode Scanner</h2>
          <div className="scanner-controls">
            <button
              id="toggleScannerBtn"
              className={`btn btn-primary scanner-toggle ${
                listening ? "listening" : ""
              }`}
              onClick={toggleListening}
              type="button"
              aria-pressed={listening}
            >
              {listening ? <StopCircle size={16} /> : <Play size={16} />}
              {listening ? " Stop Listening" : " Start Listening"}
            </button>
            <label style={{ marginLeft: 12 }}>
              <input
                type="checkbox"
                checked={audioEnabled}
                onChange={(e) => setAudioEnabled(e.target.checked)}
              />{" "}
              Audio
            </label>
          </div>
        </div>
        {/* Operation Selection */}
        <div className="operation-selection">
          <h3>Select Operation</h3>
          <div className="operation-buttons">
            <button
              className={`operation-btn ${
                currentOperation === "add" ? "active" : ""
              }`}
              onClick={() => {
                setCurrentOperation("add");
                setDestinationCounterId("");
                setDestinationContainerId("");
                announce("Selected operation: Add Piece");
              }}
              type="button"
            >
              <Plus size={16} aria-hidden="true" />
              <span>Add Piece</span>
              <div className="operation-badge">
                {currentOperation === "add" ? "Active" : ""}
              </div>
            </button>

            <button
              className={`operation-btn ${
                currentOperation === "transfer" ? "active" : ""
              }`}
              onClick={() => {
                setCurrentOperation("transfer");
                announce("Selected operation: Transfer");
              }}
              type="button"
            >
              <Move size={16} aria-hidden="true" />
              <span>Transfer</span>
              <div className="operation-badge">
                {currentOperation === "transfer" ? "Active" : ""}
              </div>
            </button>

            <button
              className={`operation-btn ${
                currentOperation === "soldout" ? "active" : ""
              }`}
              onClick={() => {
                setCurrentOperation("soldout");
                setDestinationCounterId("");
                setDestinationContainerId("");
                announce("Selected operation: Mark Sold Out");
              }}
              type="button"
            >
              <ShoppingCart size={16} aria-hidden="true" />
              <span>Mark Sold Out</span>
              <div className="operation-badge">
                {currentOperation === "soldout" ? "Active" : ""}
              </div>
            </button>

            <button
              className={`operation-btn ${
                currentOperation === "delete" ? "active" : ""
              }`}
              onClick={() => {
                setCurrentOperation("delete");
                setDestinationCounterId("");
                setDestinationContainerId("");
                announce("Selected operation: Delete");
              }}
              type="button"
            >
              <Trash2 size={16} aria-hidden="true" />
              <span>Delete</span>
              <div className="operation-badge">
                {currentOperation === "delete" ? "Active" : ""}
              </div>
            </button>
          </div>
        </div>
        {/* Transfer Destination Selection */}
        <div
          id="transferDestination"
          className={`transfer-destination ${
            currentOperation === "transfer" ? "" : "hidden"
          }`}
        >
          <h3>Select Destination</h3>
          <div className="destination-selection">
            <select
              id="destinationCounter"
              className="destination-select"
              value={destinationCounterId}
              onChange={(e) => {
                setDestinationCounterId(e.target.value);
                setDestinationContainerId("");
              }}
            >
              <option value="">Select Counter</option>
              {counters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              id="destinationContainer"
              className="destination-select"
              value={destinationContainerId}
              onChange={(e) => setDestinationContainerId(e.target.value)}
              disabled={!destinationCounterId}
            >
              <option value="">Select Container</option>
              {transferBoxes.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.identity ? `Box ${b.identity}` : `Box #${b.id}`}
                </option>
              ))}
            </select>
          </div>
        </div>
        {/* Scanner Status */}
        <div className="scanner-status">
          <div
            id="scannerIndicator"
            className={`scanner-indicator ${listening ? "listening" : ""}`}
          >
            <div className="indicator-icon">
              <Scan size={20} aria-hidden="true" />
            </div>
            <div className="indicator-text">
              <div className="status-title">
                {listening ? "Listening for Scan" : "Scanner Ready"}
              </div>
              <div className="status-subtitle">
                {listening
                  ? `Ready to ${currentOperation}`
                  : 'Click "Start Listening" to begin scanning'}
              </div>
            </div>
          </div>

          <input
            type="text"
            id="scannerInput"
            className="scanner-input"
            placeholder="Scan barcode here..."
            readOnly
            ref={scannerInputRef}
          />
        </div>
        {/* pieces list */}

        <div id="getAllPieces">
          {/* Header + Search */}
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
                  id="piecesSearch"
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
                  {/* <th>Actions</th> */}
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
                      {/* <td>
                       
                        <div className="action-buttons">
                          <button className="btn btn-small btn-success">
                            Sell
                          </button>
                          <button className="btn btn-small btn-primary">
                            Transfer
                          </button>
                          <button className="btn btn-small btn-warning">
                            Edit
                          </button>
                          <button className="btn btn-small btn-danger">
                            Delete
                          </button>
                        </div>
                      </td> */}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {/* piece table end */}

        {/* ARIA Live Region */}
        <div
          id="scannerAnnouncements"
          className="sr-only"
          aria-live="polite"
          aria-atomic="true"
          ref={announcementsRef}
        ></div>
      </div>

      {/* Modal */}
      <ModalView
        open={modalOpen}
        title={modalTitle}
        onClose={() => setModalOpen(false)}
      >
        {modalContent}
      </ModalView>

      {/* Toast container */}
      <div className="toast-wrap" aria-live="polite">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={removeToast} />
        ))}
      </div>
    </div>
  );
}

/* ---------------------------
   Quick Add Form
   --------------------------- */
function QuickAddForm({ barcode, lastSelection, onCancel, onSubmit }) {
  const [counters, setCounters] = useState([]);
  const [boxes, setBoxes] = useState([]);

  // ✅ local barcode state (important)
  const [localBarcode, setLocalBarcode] = useState(barcode);

  const [counterId, setCounterId] = useState(lastSelection.counterId || "");
  const [boxId, setBoxId] = useState(lastSelection.boxId || "");
  const [type, setType] = useState(lastSelection.type || "");
  const [purity, setPurity] = useState(lastSelection.purity || "");
  const [netWeight, setNetWeight] = useState("");
  const [variableWeight, setVariableWeight] = useState("");

  const [types, setTypes] = useState([]);
  const [purities, setPurities] = useState([]);

  /* 🔹 Update local barcode when new scan comes */
  useEffect(() => {
    setLocalBarcode(barcode);
  }, [barcode]);

  /* 🔹 Load dropdown data */
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    async function loadData() {
      try {
        const [cRes, tRes, pRes] = await Promise.all([
          axios.get("http://localhost:8080/api/counter/getAll", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get("http://localhost:8080/type/getAll", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get("http://localhost:8080/purity/getAll", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setCounters(cRes.data || []);
        setTypes(tRes.data || []);
        setPurities(pRes.data || []);

        if (lastSelection.counterId) {
          setCounterId(lastSelection.counterId);
          fetchBoxes(lastSelection.counterId, token, lastSelection.boxId);
        }
      } catch (err) {
        console.error("Error loading quick-add data:", err);
      }
    }

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchBoxes(counterIdValue, token, preselectBoxId = "") {
    if (!counterIdValue) {
      setBoxes([]);
      setBoxId("");
      return;
    }

    try {
      const res = await axios.get(
        "http://localhost:8080/api/box/getByCounterId",
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { counterId: counterIdValue },
        }
      );

      const arr = res.data || [];
      setBoxes(arr);

      if (
        preselectBoxId &&
        arr.some((b) => String(b.id) === String(preselectBoxId))
      ) {
        setBoxId(preselectBoxId);
      } else if (arr.length === 1) {
        setBoxId(String(arr[0].id));
      }
    } catch (err) {
      console.error("Error fetching boxes:", err);
    }
  }

  const handleCounterChange = async (e) => {
    const value = e.target.value;
    setCounterId(value);
    setBoxId("");

    const token = getToken();
    if (!token) return;

    await fetchBoxes(value, token);
  };

  /* 🔹 Submit handler */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!counterId || !boxId || !type || !netWeight || !variableWeight) return;

    const success = await onSubmit({
      barcode: localBarcode,
      counterId,
      boxId,
      type,
      purity,
      netWeight,
      variableWeight,
    });

    if (success) {
      // ✅ reset ONLY these fields
      setLocalBarcode("");
      setNetWeight("");
      setVariableWeight("");
    }
  };

  return (
    <form id="quickAddForm" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Barcode</label>
        <input
          type="text"
          value={localBarcode}
          readOnly
          className="readonly-input"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Counter</label>
          <select value={counterId} onChange={handleCounterChange} required>
            <option value="">Select Counter</option>
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
            value={boxId}
            onChange={(e) => setBoxId(e.target.value)}
            required
            disabled={!boxes.length}
          >
            <option value="">Select Box</option>
            {boxes.map((b) => (
              <option key={b.id} value={b.id}>
                {b.identity ? `Box ${b.identity}` : `Box #${b.id}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Jewelry Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            required
          >
            <option value="">Select type</option>
            {types.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Purity</label>
          <select value={purity} onChange={(e) => setPurity(e.target.value)}>
            <option value="">Select purity (optional)</option>
            {purities.map((p) => (
              <option key={p.id} value={p.purity}>
                {p.purity}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Net Weight (g)</label>
          <input
            type="number"
            step="0.01"
            value={netWeight}
            onChange={(e) => setNetWeight(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Variable Weight (g)</label>
          <input
            type="number"
            step="0.01"
            value={variableWeight}
            onChange={(e) => setVariableWeight(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Close
        </button>
        <button type="submit" className="btn btn-success">
          Add Piece
        </button>
      </div>
    </form>
  );
}
