import React, { useEffect, useMemo, useState } from "react";

/**
 * Transactions.jsx
 * FINAL VERSION
 * - Date fixed (actionTime → createdAt)
 * - Filters fixed
 * - Loose item name resolved
 * - CSS & DOM untouched
 */

const BASE_URL = "http://localhost:8080";

function getToken() {
  return localStorage.getItem("token");
}

export default function Transactions() {
  const [boxes, setBoxes] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [looseItemMap, setLooseItemMap] = useState({}); // 🔴 NEW
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [actionFilter, setActionFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  function buildHeaders() {
    const token = getToken();
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  /* ================= FETCH ================= */
  useEffect(() => {
    let mounted = true;

    async function loadAll() {
      setLoading(true);
      setError(null);

      try {
        /* 1️⃣ Boxes */
        const boxesRes = await fetch(`${BASE_URL}/api/box/getAll`, {
          headers: buildHeaders(),
        });
        const boxesJson = await boxesRes.json();
        if (!mounted) return;
        setBoxes(boxesJson || []);

        const boxMap = {};
        boxesJson.forEach((b) => (boxMap[b.id] = b));

        /* 2️⃣ Loose items (ID → NAME MAP) */
        const looseRes = await fetch(`${BASE_URL}/api/loose/getAll`, {
          headers: buildHeaders(),
        });
        const looseJson = await looseRes.json();
        const looseMap = {};
        looseJson.forEach((l) => {
          looseMap[l.id] = l.name;
        });
        setLooseItemMap(looseMap);

        /* 3️⃣ Statements */
        const statementsByBox = await Promise.all(
          boxesJson.map((b) =>
            fetch(
              `${BASE_URL}/api/statements/byBox?boxId=${encodeURIComponent(
                b.id
              )}`,
              { headers: buildHeaders() }
            )
              .then((r) => r.json())
              .then((arr) => ({
                boxId: b.id,
                statements: Array.isArray(arr) ? arr : [],
              }))
          )
        );

        /* 4️⃣ Flatten + Enrich */
        const flattened = statementsByBox.flatMap(({ boxId, statements }) =>
          statements.map((t) => {
            const action = (t.action || "").toUpperCase();

            const primaryBox = boxMap[boxId];
            const fromBox = t.fromBoxId ? boxMap[t.fromBoxId] : null;
            const toBox = t.toBoxId ? boxMap[t.toBoxId] : null;

            // ✅ DATE FIX
            const createdAt = t.actionTime || t.createdAt || null;

            // ✅ BARCODE / LOOSE NAME FIX
            let displayValue = "-";
            if (t.entityType === "PIECE") {
              displayValue = t.barcode || String(t.entityId);
            }
            if (t.entityType === "LOOSE_ITEM") {
              displayValue = looseMap[t.entityId] || `Loose #${t.entityId}`;
            }

            return {
              ...t,
              createdAt,
              action,
              boxId,
              entityType: t.entityType,
              boxName:
                primaryBox?.name || primaryBox?.boxNumber || `Box #${boxId}`,
              fromBoxName:
                fromBox?.name ||
                fromBox?.boxNumber ||
                (t.fromBoxId ? `Box #${t.fromBoxId}` : null),
              toBoxName:
                toBox?.name ||
                toBox?.boxNumber ||
                (t.toBoxId ? `Box #${t.toBoxId}` : null),
              barcode: displayValue, // 🔴 FIXED
            };
          })
        );

        flattened.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (mounted) setTransactions(flattened);
      } catch (e) {
        console.error(e);
        if (mounted) setError("Failed to load transactions");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadAll();
    return () => (mounted = false);
  }, []);

  /* ================= FILTER ================= */
  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return transactions.filter((t) => {
      if (actionFilter && t.action !== actionFilter) return false;
      if (!term) return true;

      return (
        t.barcode?.toLowerCase().includes(term) ||
        t.boxName?.toLowerCase().includes(term) ||
        t.remark?.toLowerCase().includes(term)
      );
    });
  }, [transactions, actionFilter, searchTerm]);

  function formatDateTime(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    if (isNaN(d)) return "-";

    return d.toLocaleString("en-IN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }

  function handleClearHistory() {
    setTransactions([]);
  }

  /* ================= UI (UNCHANGED) ================= */
  return (
    <div id="transactionsTab" className="tab">
      <div className="section-header">
        <h2>Transaction History</h2>

        <div className="transaction-filters">
          <select
            id="actionFilter"
            className="filter-select"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">All Actions</option>
            <option value="ADD">ADD</option>
            <option value="TRANSFER_IN">TRANSFER IN</option>
            <option value="TRANSFER_OUT">TRANSFER OUT</option>
            <option value="SELL">SELL</option>
            <option value="PARTIAL_SELL">PARTIAL SELL</option>
          </select>

          <button
            id="clearTransactionsBtn"
            className="btn btn-secondary"
            onClick={handleClearHistory}
            type="button"
          >
            <i data-lucide="trash-2"></i>
            Clear History
          </button>
        </div>
      </div>

      <div className="search-container">
        <div className="search-box">
          <i data-lucide="search"></i>
          <input
            id="transactionSearch"
            className="search-input"
            placeholder="Search by barcode, box name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Date & Time</th>
              <th>Barcode / Name</th>
              <th>Action</th>
              <th>Box Name</th>
              <th>From Box</th>
              <th>To Box</th>
              <th>Performed By</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={`${t.id}-${t.createdAt}`}>
                <td>
                  <span
                    className={`type-badge type-${t.entityType
                      .toLowerCase()
                      .replace(/\s+/g, "-")}`}
                  >
                    {t.entityType}
                  </span>
                </td>
                <td>
                  <div className="transaction-date">
                    <div className="date-primary">
                      {formatDateTime(t.createdAt)}
                    </div>
                  </div>
                </td>
                <td>
                  <span className="barcode-text">{t.barcode}</span>
                </td>
                <td>
                  <span
                    className={`action-badge action-${t.action.toLowerCase()}`}
                  >
                    {t.action}
                  </span>
                </td>
                <td>
                  <strong>{t.boxName}</strong>
                </td>
                <td>{t.fromBoxName || "-"}</td>
                <td>{t.toBoxName || "-"}</td>
                <td>
                  <span className="role-badge">
                    {t.performedByRole.replace("ROLE_", "")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
