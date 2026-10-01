import { useState, useEffect } from "react";
import axios from "axios";
import SentimentBadge from "./common/SentimentBadge";
import AspectChip from "./common/AspectChip";
import { StatusIcon } from "./common/Icons";
import { API_URL } from "../constants";

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
    setError(null);
    axios.get(`${API_URL}/results/history?limit=100`)
      .then(res => {
        setHistory(res.data.results || []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load history records. Make sure the backend is running on http://localhost:8000.");
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
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div>
      <div className="page-header-row">
        <div className="page-title-group">
          <h1>Analysis History</h1>
          <p>Recent 100 reviews shown. Export CSV downloads all records.</p>
        </div>

        <div className="header-action-group">
          <button className="btn-secondary" onClick={fetchHistory}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19" />
            </svg>
            Refresh
          </button>
          <button className="btn-export" onClick={() => exportCSV(filter, department)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters Strip */}
      <div className="history-filters-bar">
        <div className="sentiment-filter-pills">
          {["ALL", "POSITIVE", "NEGATIVE", "NEUTRAL"].map(f => {
            const count = f === "ALL" ? history.length : history.filter(r => r.overall_sentiment === f).length;
            return (
              <button
                key={f}
                className={`filter-pill-btn ${filter === f ? "active" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f} ({count})
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <select
            className="select-control"
            value={department}
            onChange={e => setDepartment(e.target.value)}
          >
            <option value="ALL">All Departments</option>
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <span style={{ fontSize: "12.5px", color: "var(--text-muted)", fontWeight: 500 }}>
            Showing <strong style={{ color: "var(--text-main)" }}>{filtered.length}</strong> of <strong style={{ color: "var(--text-main)" }}>{history.length}</strong>
          </span>
        </div>
      </div>

      {loading && (
        <div className="empty-state-panel">
          <div style={{ fontSize: "14px", color: "var(--text-muted)" }}>Loading history records...</div>
        </div>
      )}

      {error && (
        <div className="alert-error">
          <StatusIcon type="warning" size={16} color="var(--neg-text)" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="empty-state-panel">
          <div style={{ marginBottom: "12px", color: "var(--brand-accent)" }}>
            <StatusIcon type="folder" size={38} color="var(--brand-accent)" />
          </div>
          <div style={{ fontWeight: 600, fontSize: "15px", color: "var(--text-main)", marginBottom: "4px" }}>
            No history records match the selected filters
          </div>
          <div style={{ fontSize: "13px" }}>
            Try changing the sentiment or department filter above.
          </div>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="history-records-stack">
          {filtered.map((item, i) => {
            const aspects = item.aspects || {};
            const isOpen = expanded === i;
            const aspectEntries = Object.entries(aspects);

            return (
              <div key={item._id || i} className="history-item-row">
                <div
                  className="history-item-header"
                  onClick={() => setExpanded(isOpen ? null : i)}
                >
                  <SentimentBadge sentiment={item.overall_sentiment} />

                  <div className="history-review-preview">
                    {item.review_text}
                  </div>

                  <div className="history-meta-right">
                    <div className="history-type-chip">
                      {item.department && (
                        <span className="keyword-pill" style={{ fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <StatusIcon type="target" size={10} color="var(--text-secondary)" />
                          {item.department}
                        </span>
                      )}
                      <span>{item.is_batch ? "Batch" : "Single"}</span>
                    </div>

                    <div className="history-timestamp">
                      {formatDate(item.analyzed_at)}
                    </div>

                    <svg
                      className="chevron-icon"
                      style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>

                {isOpen && (
                  <div className="history-expanded-body">
                    <div className="history-full-text">
                      "{item.review_text}"
                    </div>

                    <div className="history-aspects-strip">
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)" }}>
                        Detected Aspects:
                      </span>
                      {aspectEntries.length === 0 ? (
                        <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>
                          No aspects detected.
                        </span>
                      ) : (
                        aspectEntries.map(([asp, val]) => {
                          const sent = typeof val === "object" ? val.sentiment : val;
                          return (
                            <AspectChip
                              key={asp}
                              aspect={asp}
                              sentiment={sent}
                              showSentiment={true}
                            />
                          );
                        })
                      )}
                    </div>

                    <div className="history-footer-specs">
                      <span>Model: <strong style={{ color: "var(--text-main)" }}>{item.model_used || "Unknown"}</strong></span>
                      <span>ID: <strong style={{ color: "var(--text-main)" }}>{item._id}</strong></span>
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