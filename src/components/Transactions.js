import React, { useEffect, useMemo, useState } from "react";

/**
 * Transactions.jsx
 * - Preserves original IDs and class names so existing CSS works.
 * - Fetches boxes from: GET http://localhost:8080/api/box/getAll
 * - For each box, fetches statements from: GET http://localhost:8080/api/statements/byBox?boxId=<id>
 * - Sends Authorization: Bearer <token> using token from localStorage (getToken()).
 * - Combines and sorts transactions (newest first).
 * - Implements filters and search using the same DOM ids:
 *    #actionFilter (select), #transactionSearch (input), #clearTransactionsBtn (button)
 * - Keeps <i data-lucide="..."> icons and calls lucide.createIcons() if available.
 *
 * Fixes applied:
 * 1. Normalizes `action` to uppercase when enriching transactions so filtering by action
 *    (which uses uppercase options like "TRANSFER") works reliably regardless of API casing.
 * 2. Resolves `fromBoxName` / `toBoxName` using the fetched boxes; if the API returns
 *    `fromBoxId` / `toBoxId` as null, the code will attempt reasonable fallbacks:
 *      - If only one side is present, that side shows the resolved name and the other shows '-'
 *      - If both are null but the transaction is a TRANSFER, the code shows the involved box
 *        (the box for which statements were requested) as an "Involved Box" in the From/To columns
 *        so the user can see where the transfer entry was recorded.
 *
 * Note: We can't invent missing authoritative from/to ids — this just provides sensible UI fallbacks
 * and fixes a common bug where action casing prevents TRANSFER rows from appearing.
 */

const BASE_URL = "http://localhost:8080";

function getToken() {
  return localStorage.getItem("token");
}

export default function Transactions() {
  const [boxes, setBoxes] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI state — keep in sync with the DOM ids so CSS/JS can still query them if necessary
  const [actionFilter, setActionFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // helper to build headers with auth when token present
  function buildHeaders() {
    const token = getToken();
    const headers = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  // Fetch boxes and statements
  useEffect(() => {
    let mounted = true;

    async function loadAll() {
      setLoading(true);
      setError(null);

      try {
        // fetch boxes with auth header
        const boxesRes = await fetch(`${BASE_URL}/api/box/getAll`, {
          headers: buildHeaders(),
        });

        if (!boxesRes.ok) {
          if (boxesRes.status === 403) {
            throw new Error(
              "Forbidden (403) when fetching boxes. Token may be missing/expired or you lack permissions."
            );
          }
          throw new Error(`Failed to fetch boxes: ${boxesRes.status}`);
        }

        const boxesJson = await boxesRes.json();
        if (!mounted) return;
        setBoxes(boxesJson || []);

        // fetch statements for each box in parallel (with auth header)
        const statementsPromises = (boxesJson || []).map((b) =>
          fetch(
            `${BASE_URL}/api/statements/byBox?boxId=${encodeURIComponent(
              b.id
            )}`,
            {
              headers: buildHeaders(),
            }
          )
            .then((r) => {
              if (!r.ok) {
                if (r.status === 403) {
                  // bubble up a clear error for the specific box
                  throw new Error(
                    `Forbidden (403) when fetching statements for box ${b.id}. Check token/roles.`
                  );
                }
                throw new Error(
                  `Failed to fetch statements for box ${b.id}: ${r.status}`
                );
              }
              return r.json();
            })
            .then((arr) => ({
              boxId: b.id,
              statements: Array.isArray(arr) ? arr : [],
            }))
            .catch((err) => {
              // If a single box fails, log and return empty for that box (don't stop whole UI)
              // eslint-disable-next-line no-console
              console.error(err);
              return { boxId: b.id, statements: [] };
            })
        );

        const statementsByBox = await Promise.all(statementsPromises);
        if (!mounted) return;

        // Flatten and attach boxId (the box for which the statement was fetched)
        const flattened = statementsByBox.flatMap(({ boxId, statements }) =>
          statements.map((s) => ({ ...s, boxId }))
        );

        // Map box id -> box object for lookup
        const boxMap = (boxesJson || []).reduce((acc, b) => {
          acc[b.id] = b;
          return acc;
        }, {});

        // Enrich and default fields
        const enriched = flattened.map((t) => {
          // Normalize action to uppercase so filtering (which uses uppercase values) works.
          const normalizedAction = (t.action || "").toString().toUpperCase();

          // resolve readable names for the primary box, fromBox and toBox
          const primaryBox = boxMap[t.boxId];
          const fromBox = t.fromBoxId ? boxMap[t.fromBoxId] : null;
          const toBox = t.toBoxId ? boxMap[t.toBoxId] : null;

          const primaryBoxName =
            (primaryBox && (primaryBox.name || primaryBox.boxNumber)) ||
            (t.boxId ? `Box #${t.boxId}` : "-");
          const fromBoxName =
            (fromBox && (fromBox.name || fromBox.boxNumber)) ||
            (t.fromBoxId ? `Box #${t.fromBoxId}` : null);
          const toBoxName =
            (toBox && (toBox.name || toBox.boxNumber)) ||
            (t.toBoxId ? `Box #${t.toBoxId}` : null);

          return {
            ...t,
            // normalized action is stored back so UI/filtering is consistent
            action: normalizedAction,
            entityType: (t.entityType || "Piece").toString(),
            boxName: primaryBoxName,
            fromBoxName,
            toBoxName,
            barcode: t.barcode || (t.entityId ? String(t.entityId) : "-"),
          };
        });

        // Sort newest first by createdAt
        enriched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        setTransactions(enriched);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        if (mounted) setError(err.message || String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadAll();
    return () => {
      mounted = false;
    };
  }, []); // run once on mount

  // Keep lucide icons fresh whenever transactions or DOM-affecting state changes
  useEffect(() => {
    try {
      if (
        window &&
        window.lucide &&
        typeof window.lucide.createIcons === "function"
      ) {
        setTimeout(() => window.lucide.createIcons(), 50);
      }
    } catch (e) {
      // ignore
    }
  }, [transactions, actionFilter, searchTerm, loading]);

  // Derived filtered list
  const filtered = useMemo(() => {
    const term = (searchTerm || "").trim().toLowerCase();
    return transactions.filter((t) => {
      // t.action is normalized to uppercase in enrichment
      if (actionFilter && t.action !== actionFilter) return false;
      if (!term) return true;

      return (
        (t.barcode && String(t.barcode).toLowerCase().includes(term)) ||
        (t.boxName && String(t.boxName).toLowerCase().includes(term)) ||
        (t.fromBoxId && String(t.fromBoxId).toLowerCase().includes(term)) ||
        (t.toBoxId && String(t.toBoxId).toLowerCase().includes(term)) ||
        (t.remark && String(t.remark).toLowerCase().includes(term))
      );
    });
  }, [transactions, actionFilter, searchTerm]);

  // Clear history (client-side only)
  function handleClearHistory() {
    setTransactions([]);
  }

  // Handlers attached to the original IDs (keeps same ids in the DOM)
  function onActionFilterChange(e) {
    setActionFilter(e.target.value);
  }
  function onSearchChange(e) {
    setSearchTerm(e.target.value);
  }

  // Helper to format date/time like original code
  function formatDateTime(iso) {
    try {
      if (!iso) return "-";
      const d = new Date(iso);
      return d.toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    } catch {
      return iso;
    }
  }

  return (
    <div id="transactionsTab" className="tab">
      <div className="section-header">
        <h2>Transaction History</h2>
        <div className="transaction-filters">
          <select
            id="actionFilter"
            className="filter-select"
            value={actionFilter}
            onChange={onActionFilterChange}
          >
            <option value="">All Actions</option>
            <option value="ADD">Add</option>
            <option value="TRANSFER">Transfer</option>
            <option value="SOLD_OUT">Sold Out</option>
            <option value="DELETE">Delete</option>
            <option value="EDIT">Edit</option>
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
            type="text"
            id="transactionSearch"
            placeholder="Search by barcode, box name..."
            className="search-input"
            value={searchTerm}
            onChange={onSearchChange}
          />
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Date &amp; Time</th>
              <th>Barcode</th>
              <th>Action</th>
              <th>Box Name</th>
              <th>From Box</th>
              <th>To Box</th>
              <th>Performed By</th>
            </tr>
          </thead>
          <tbody id="transactionsTableBody">
            {loading && (
              <tr>
                <td colSpan="8" className="empty-state">
                  Loading transactions...
                </td>
              </tr>
            )}

            {!loading && error && (
              <tr>
                <td colSpan="8" className="empty-state">
                  <div style={{ color: "red" }}>
                    {error}
                    <div style={{ marginTop: 6, fontSize: 12 }}>
                      Tip: If the message mentions token/permissions, make sure
                      a valid JWT is stored in localStorage under{" "}
                      <code>token</code>, and that the token's roles include
                      <strong> ROLE_ADMIN</strong> or{" "}
                      <strong> ROLE_ACCOUNT</strong>.
                    </div>
                  </div>
                </td>
              </tr>
            )}

            {!loading && !error && filtered.length === 0 && (
              <tr>
                <td colSpan="8" className="empty-state">
                  <div className="empty-state-icon">
                    <i data-lucide="file-text"></i>
                  </div>
                  <h3>No transactions found</h3>
                  <p>
                    Transaction history will appear here as actions are
                    performed
                  </p>
                </td>
              </tr>
            )}

            {!loading &&
              !error &&
              filtered.map((transaction) => {
                // preserve similar structure and classes as your original HTML
                const typeBadgeClass =
                  "type-badge type-" +
                  (transaction.entityType || "Piece")
                    .toString()
                    .toLowerCase()
                    .replace(/\s+/g, "-");
                const actionClass =
                  "action-badge action-" +
                  (transaction.action || "").toString().toLowerCase();

                // Determine what to display for from/to
                // Prefer explicit fromBoxName / toBoxName from API; fall back to ids;
                // If both are null for a TRANSFER, show the involved primary box so the user can see where the entry was recorded.
                let fromDisplay = transaction.fromBoxName || null;
                let toDisplay = transaction.toBoxName || null;

                if (!fromDisplay && transaction.fromBoxId) {
                  fromDisplay = String(transaction.fromBoxId);
                }
                if (!toDisplay && transaction.toBoxId) {
                  toDisplay = String(transaction.toBoxId);
                }

                // If this is a TRANSFER entry and both from/to are missing, show the involved primary box (where the API returned the statement)
                if (
                  transaction.action === "TRANSFER" &&
                  !fromDisplay &&
                  !toDisplay
                ) {
                  // show the involved box name in both columns but mark as involved
                  const involved =
                    transaction.boxName ||
                    (transaction.boxId ? `Box #${transaction.boxId}` : "-");
                  fromDisplay = `${involved} (involved)`;
                  toDisplay = `${involved} (involved)`;
                }

                // final guard: replace any null/empty with dash
                fromDisplay = fromDisplay || "-";
                toDisplay = toDisplay || "-";

                return (
                  <tr key={`${transaction.id}-${transaction.createdAt}`}>
                    <td>
                      <span className={typeBadgeClass}>
                        {transaction.entityType || "Piece"}
                      </span>
                    </td>
                    <td>
                      <div className="transaction-date">
                        <div className="date-primary">
                          {formatDateTime(transaction.createdAt)}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="barcode-text">
                        {transaction.barcode}
                      </span>
                    </td>
                    <td>
                      <span className={actionClass}>{transaction.action}</span>
                    </td>
                    <td>
                      <strong>{transaction.boxName}</strong>
                    </td>
                    <td>
                      {fromDisplay ? (
                        <span className="box-reference">{fromDisplay}</span>
                      ) : (
                        <span className="null-value">-</span>
                      )}
                    </td>
                    <td>
                      {toDisplay ? (
                        <span className="box-reference">{toDisplay}</span>
                      ) : (
                        <span className="null-value">-</span>
                      )}
                    </td>
                    <td>
                      <span className="role-badge">
                        {(transaction.performedByRole || "ROLE_ADMIN").replace(
                          /^ROLE_/,
                          ""
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
