import { useState } from "react";
import axios from "axios";
import Plot from "react-plotly.js";

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

// ── CSV export helper ────────────────────────────────────────────────────────
function exportToCSV(results) {
  const ASPECTS = ["SIZE", "FABRIC", "STITCHING", "COLOR", "PRICE", "DELIVERY"];

  const headers = [
    "#", "Review", "Overall Sentiment",
    ...ASPECTS.map(a => `${a} Sentiment`),
    ...ASPECTS.map(a => `${a} Confidence`),
    "Model Used"
  ];

  const rows = results.map((r, i) => {
    const aspects = r.aspect_sentiments || {};
    const aspectSentiments  = ASPECTS.map(a => aspects[a]?.sentiment  || "");
    const aspectConfidences = ASPECTS.map(a =>
      aspects[a]?.confidence != null ? aspects[a].confidence : ""
    );
    // Escape double quotes in review text
    const reviewText = `"${(r.review || "").replace(/"/g, '""')}"`;
    return [
      i + 1,
      reviewText,
      r.overall_sentiment || "NEUTRAL",
      ...aspectSentiments,
      ...aspectConfidences,
      r.model_used || ""
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href     = url;
  link.download = `batch_results_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function BatchAnalysis() {
  const [reviews, setReviews]     = useState("");
  const [results, setResults]     = useState(null);
  const [summary, setSummary]     = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [activeTab, setActiveTab] = useState("results");

  const parseReviews = () =>
    reviews.split("\n").map(r => r.trim()).filter(r => r.length > 0);

  const handleAnalyze = async () => {
    const reviewList = parseReviews();
    if (reviewList.length === 0) return;
    if (reviewList.length > 30000) {
      setError("Maximum 30,000 reviews per batch.");
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);
    setSummary(null);

    try {
      const res = await axios.post(`${API_URL}/analyze-batch`, { reviews: reviewList });
      setResults(res.data.data);
      setSummary(res.data.summary);
    } catch (err) {
      setError("Batch analysis failed. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const lines = evt.target.result.split("\n");
      const header = lines[0].toLowerCase();
      const colIndex = header.includes("review text") ? 0
        : header.includes("review") ? header.split(",").findIndex(h => h.includes("review"))
        : 0;
      const extracted = lines.slice(1)
        .map(line => {
          const cols = line.split(",");
          return cols[colIndex]?.replace(/^"|"$/g, "").trim();
        })
        .filter(r => r && r.length > 5)
        .slice(0, 30000);
      setReviews(extracted.join("\n"));
    };
    reader.readAsText(file);
  };

  const getSentimentCounts = () => {
    if (!results) return {};
    const counts = { POSITIVE: 0, NEGATIVE: 0, NEUTRAL: 0 };
    results.forEach(r => {
      const s = r.overall_sentiment || "NEUTRAL";
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  };

  const sentCounts = getSentimentCounts();

  const donutData = results ? [{
    type: "pie",
    hole: 0.55,
    labels: Object.keys(sentCounts),
    values: Object.values(sentCounts),
    marker: {
      colors: Object.keys(sentCounts).map(s =>
        s === "POSITIVE" ? "#22c55e" : s === "NEGATIVE" ? "#ef4444" : "#f59e0b"
      ),
    },
    textinfo: "label+percent",
    textfont: { color: "#f1f5f9", size: 13 },
  }] : [];

  return (
    <div>
      <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px", color: "#f1f5f9" }}>
        Batch Analysis
      </h2>
      <p style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "24px" }}>
        Analyze multiple reviews at once. Paste reviews (one per line) or upload a CSV file.
      </p>

      {/* Input Section */}
      <div style={{ background: "#1e293b", borderRadius: "12px", padding: "24px", marginBottom: "24px" }}>
        <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
          <label style={{
            padding: "8px 20px", background: "#334155", color: "#f1f5f9",
            borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 600
          }}>
            📂 Upload CSV
            <input type="file" accept=".csv" onChange={handleCSV} style={{ display: "none" }} />
          </label>
          <span style={{ color: "#64748b", fontSize: "13px" }}>or paste reviews below</span>
        </div>

        <textarea
          rows={6}
          value={reviews}
          onChange={e => setReviews(e.target.value)}
          placeholder={"Paste one review per line:\nThe fabric is great but runs small.\nLove the color, fast delivery!\nPoor stitching quality."}
          style={{
            width: "100%", background: "#0f172a", border: "1px solid #334155",
            borderRadius: "8px", padding: "12px", color: "#f1f5f9",
            fontSize: "14px", resize: "vertical", outline: "none", boxSizing: "border-box",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "12px" }}>
          <span style={{ color: "#64748b", fontSize: "13px" }}>
            {parseReviews().length} review{parseReviews().length !== 1 ? "s" : ""} ready
          </span>
          <button
            onClick={handleAnalyze}
            disabled={loading || parseReviews().length === 0}
            style={{
              padding: "12px 32px",
              background: loading ? "#334155" : "#6366f1",
              color: "#fff", border: "none", borderRadius: "8px",
              fontSize: "15px", fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Analyzing..." : "Analyze Batch"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: "#450a0a", border: "1px solid #ef4444", borderRadius: "8px", padding: "16px", marginBottom: "24px", color: "#fca5a5" }}>
          ⚠️ {error}
        </div>
      )}

      {results && (
        <>
          {/* Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            {[
              { label: "Total Reviews", value: results.length,           color: "#6366f1" },
              { label: "Positive",      value: sentCounts.POSITIVE || 0, color: "#22c55e" },
              { label: "Negative",      value: sentCounts.NEGATIVE || 0, color: "#ef4444" },
              { label: "Neutral",       value: sentCounts.NEUTRAL  || 0, color: "#f59e0b" },
            ].map(s => (
              <div key={s.label} style={{
                background: "#1e293b", border: `1px solid ${s.color}44`,
                borderRadius: "12px", padding: "16px", textAlign: "center"
              }}>
                <div style={{ fontSize: "28px", fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs + Export button */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              {["results", "chart"].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  padding: "8px 20px",
                  background: activeTab === tab ? "#6366f1" : "#1e293b",
                  color: activeTab === tab ? "#fff" : "#94a3b8",
                  border: "none", borderRadius: "8px",
                  fontSize: "14px", fontWeight: 600, cursor: "pointer",
                }}>
                  {tab === "results" ? "📋 Results" : "📊 Chart"}
                </button>
              ))}
            </div>

            {/* Export CSV button */}
            <button
              onClick={() => exportToCSV(results)}
              style={{
                padding: "8px 20px",
                background: "#0f4c2a",
                color: "#22c55e",
                border: "1px solid #22c55e44",
                borderRadius: "8px",
                fontSize: "14px", fontWeight: 600, cursor: "pointer",
              }}
            >
              ⬇️ Export CSV
            </button>
          </div>

          {/* Results Table */}
          {activeTab === "results" && (
            <div style={{ background: "#1e293b", borderRadius: "12px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#0f172a" }}>
                    <th style={{ padding: "12px 16px", textAlign: "left",   color: "#94a3b8", fontSize: "13px" }}>#</th>
                    <th style={{ padding: "12px 16px", textAlign: "left",   color: "#94a3b8", fontSize: "13px" }}>Review</th>
                    <th style={{ padding: "12px 16px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>Sentiment</th>
                    <th style={{ padding: "12px 16px", textAlign: "left",   color: "#94a3b8", fontSize: "13px" }}>Aspects</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => {
                    const aspects = r.aspect_sentiments || {};
                    return (
                      <tr key={i} style={{ borderTop: "1px solid #334155" }}>
                        <td style={{ padding: "12px 16px", color: "#64748b", fontSize: "13px" }}>{i + 1}</td>
                        <td style={{ padding: "12px 16px", color: "#cbd5e1", fontSize: "13px", maxWidth: "300px" }}>
                          {r.review?.slice(0, 80)}{r.review?.length > 80 ? "..." : ""}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          <span style={{
                            background: SENTIMENT_COLORS[r.overall_sentiment] || "#334155",
                            color: "#fff", borderRadius: "6px",
                            padding: "3px 10px", fontSize: "12px", fontWeight: 700
                          }}>
                            {r.overall_sentiment || "NEUTRAL"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                            {Object.keys(aspects).length === 0 ? (
                              <span style={{ color: "#64748b", fontSize: "12px" }}>None detected</span>
                            ) : (
                              Object.entries(aspects).map(([asp, data]) => (
                                <span key={asp} style={{
                                  background: `${SENTIMENT_COLORS[data.sentiment]}22`,
                                  border: `1px solid ${SENTIMENT_COLORS[data.sentiment]}44`,
                                  color: SENTIMENT_COLORS[data.sentiment],
                                  borderRadius: "4px", padding: "2px 6px", fontSize: "11px", fontWeight: 600
                                }}>
                                  {ASPECT_ICONS[asp]} {asp}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "chart" && (
            <div style={{ background: "#1e293b", borderRadius: "12px", padding: "24px" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "16px", color: "#f1f5f9" }}>
                Sentiment Distribution
              </h3>
              <Plot
                data={donutData}
                layout={{
                  paper_bgcolor: "transparent",
                  plot_bgcolor: "transparent",
                  font: { color: "#f1f5f9" },
                  margin: { t: 10, b: 10, l: 10, r: 10 },
                  showlegend: true,
                  legend: { font: { color: "#94a3b8" } },
                }}
                style={{ width: "100%", height: "300px" }}
                config={{ displayModeBar: false }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}