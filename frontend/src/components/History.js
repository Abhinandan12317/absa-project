import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "http://localhost:8000";

const SENTIMENT_COLORS = {
  POSITIVE: "#22c55e",
  NEGATIVE: "#ef4444",
  NEUTRAL:  "#f59e0b",
};

const ASPECT_ICONS = {
  SIZE: "📏", FABRIC: "🧵", STITCHING: "🪡",
  COLOR: "🎨", PRICE: "💰", DELIVERY: "🚚",
};

function exportCSV(filter, department) {
  const params = new URLSearchParams();
  if (filter && filter !== "ALL")         params.append("sentiment",  filter);
  if (department && department !== "ALL") params.append("department", department);
  const url = `${API_URL}/results/export-csv?${params.toString()}`;
  window.open(url, "_blank");
}

export default function History() {
  const [history, setHistory]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [filter, setFilter]         = useState("ALL");
  const [department, setDepartment] = useState("ALL");
  const [departments, setDepartments] = useState([]);
  const [expanded, setExpanded]     = useState(null);

  const fetchHistory = () => {
    setLoading(true);
    axios.get(`${API_URL}/results/history?limit=100`)
      .then(res => {
        setHistory(res.data.results);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load history");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchHistory();
    axios.get(`${API_URL}/results/departments`)
      .then(res => setDepartments(res.data.departments || []))
      .catch(() => {});
  }, []);

  const filtered = history.filter(r => {
    const sentMatch = filter === "ALL" || r.overall_sentiment === filter;
    const deptMatch = department === "ALL" || r.department === department;
    return sentMatch && deptMatch;
  });

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "4px", color: "#f1f5f9" }}>
            Analysis History
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "14px", margin: 0 }}>
            Recent 100 reviews shown. Export CSV downloads all records.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={fetchHistory}
            style={{
              padding: "8px 20px", background: "#1e293b", color: "#94a3b8",
              border: "1px solid #334155", borderRadius: "8px",
              fontSize: "13px", cursor: "pointer", fontWeight: 600
            }}
          >
            🔄 Refresh
          </button>
          <button
            onClick={() => exportCSV(filter, department)}
            style={{
              padding: "8px 20px",
              background: "#0f4c2a",
              color: "#22c55e",
              border: "1px solid #22c55e44",
              borderRadius: "8px",
              fontSize: "13px", fontWeight: 600, cursor: "pointer",
            }}
          >
            ⬇️ Export CSV
          </button>
        </div>
      </div>

      {/* Filters row */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
        {/* Sentiment filter */}
        <div style={{ display: "flex", gap: "8px" }}>
          {["ALL", "POSITIVE", "NEGATIVE", "NEUTRAL"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "6px 16px",
              background: filter === f
                ? f === "ALL" ? "#6366f1"
                  : f === "POSITIVE" ? "#22c55e"
                  : f === "NEGATIVE" ? "#ef4444"
                  : "#f59e0b"
                : "#1e293b",
              color: filter === f ? "#fff" : "#94a3b8",
              border: "none", borderRadius: "8px",
              fontSize: "13px", fontWeight: 600, cursor: "pointer"
            }}>
              {f} {f !== "ALL" && `(${history.filter(r => r.overall_sentiment === f).length})`}
            </button>
          ))}
        </div>

        {/* Department filter */}
        <select
          value={department}
          onChange={e => setDepartment(e.target.value)}
          style={{
            background: "#1e293b", color: "#f1f5f9",
            border: "1px solid #334155", borderRadius: "8px",
            padding: "6px 12px", fontSize: "13px", cursor: "pointer", outline: "none"
          }}
        >
          <option value="ALL">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <span style={{ color: "#475569", fontSize: "13px" }}>
          Showing {filtered.length} of {history.length}
        </span>
      </div>

      {loading && <p style={{ color: "#94a3b8" }}>Loading history...</p>}
      {error   && <p style={{ color: "#ef4444" }}>{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <div style={{ background: "#1e293b", borderRadius: "12px", padding: "40px", textAlign: "center", color: "#94a3b8" }}>
          No results found.
        </div>
      )}

      {!loading && !error && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filtered.map((item, i) => {
            const aspects = item.aspects || {};
            const isOpen  = expanded === i;
            return (
              <div
                key={item._id}
                style={{
                  background: "#1e293b",
                  border: `1px solid ${SENTIMENT_COLORS[item.overall_sentiment] || "#334155"}33`,
                  borderRadius: "12px", overflow: "hidden", cursor: "pointer",
                }}
                onClick={() => setExpanded(isOpen ? null : i)}
              >
                <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: "16px" }}>
                  <span style={{
                    background: SENTIMENT_COLORS[item.overall_sentiment] || "#334155",
                    color: "#fff", borderRadius: "6px",
                    padding: "4px 12px", fontSize: "12px", fontWeight: 700,
                    minWidth: "80px", textAlign: "center", flexShrink: 0
                  }}>
                    {item.overall_sentiment || "NEUTRAL"}
                  </span>

                  <span style={{ flex: 1, color: "#cbd5e1", fontSize: "14px" }}>
                    {item.review_text?.slice(0, 100)}{item.review_text?.length > 100 ? "..." : ""}
                  </span>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      {item.department ? `🏷 ${item.department}` : ""} {item.is_batch ? "🗂 Batch" : "📝 Single"}
                    </div>
                    <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                      {formatDate(item.analyzed_at)}
                    </div>
                  </div>

                  <span style={{ color: "#64748b", fontSize: "16px", flexShrink: 0 }}>
                    {isOpen ? "▲" : "▼"}
                  </span>
                </div>

                {isOpen && (
                  <div style={{ borderTop: "1px solid #334155", padding: "16px 20px", background: "#0f172a" }}>
                    <p style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "12px", lineHeight: 1.6 }}>
                      {item.review_text}
                    </p>

                    {Object.keys(aspects).length === 0 ? (
                      <p style={{ color: "#64748b", fontSize: "13px" }}>No aspects detected.</p>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {Object.entries(aspects).map(([asp, value]) => {
                          const sentiment = typeof value === "object" ? value.sentiment : value;
                          return (
                            <span key={asp} style={{
                              background: `${SENTIMENT_COLORS[sentiment] || "#334155"}22`,
                              border: `1px solid ${SENTIMENT_COLORS[sentiment] || "#334155"}44`,
                              color: SENTIMENT_COLORS[sentiment] || "#94a3b8",
                              borderRadius: "6px", padding: "4px 12px",
                              fontSize: "12px", fontWeight: 600
                            }}>
                              {ASPECT_ICONS[asp] || ""} {asp}: {sentiment}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    <div style={{ marginTop: "12px", fontSize: "12px", color: "#475569" }}>
                      Model: {item.model_used} &nbsp;|&nbsp; ID: {item._id}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}