import { useState } from "react";
import axios from "axios";
import Plot from "react-plotly.js";
import BatchAnalysis from "./components/BatchAnalysis";
import Dashboard from "./components/Dashboard";
import ModelComparison from "./components/ModelComparison";
import History from "./components/History";

const API_URL = "http://localhost:8000";

const SENTIMENT_COLORS = {
  POSITIVE: "#22c55e",
  NEGATIVE: "#ef4444",
  NEUTRAL:  "#f59e0b",
};

const ASPECT_ICONS = {
  SIZE:      "📏",
  FABRIC:    "🧵",
  STITCHING: "🪡",
  COLOR:     "🎨",
  PRICE:     "💰",
  DELIVERY:  "🚚",
};

const TABS = [
  { id: "single",     label: "📝 Single Review"   },
  { id: "batch",      label: "🗂 Batch Analysis"  },
  { id: "dashboard",  label: "📊 Dashboard"        },
  { id: "models",     label: "🤖 Model Comparison" },
  { id: "history",    label: "🕓 History"          },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("single");

  // Single review states
  const [review, setReview]   = useState("");
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const analyzeReview = async () => {
    if (!review.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await axios.post(`${API_URL}/analyze`, { review });
      setResult(res.data.data);
    } catch (err) {
      setError("Failed to connect to API. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const aspectEntries = result
    ? Object.entries(result.aspect_sentiments || {})
    : [];

  const chartData =
    aspectEntries.length > 0
      ? [{
          type: "bar",
          x: aspectEntries.map(([a]) => `${ASPECT_ICONS[a] || ""} ${a}`),
          y: aspectEntries.map(([, d]) => d.confidence * 100),
          marker: {
            color: aspectEntries.map(([, d]) =>
              d.sentiment === "POSITIVE" ? "#22c55e"
              : d.sentiment === "NEGATIVE" ? "#ef4444"
              : "#f59e0b"
            ),
          },
          text: aspectEntries.map(([, d]) => d.sentiment),
          textposition: "outside",
        }]
      : [];

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#f1f5f9", fontFamily: "Inter, sans-serif" }}>

      {/* Header */}
      <div style={{ background: "#1e293b", borderBottom: "1px solid #334155", padding: "20px 40px" }}>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 700, color: "#f1f5f9" }}>
          🛍️ ABSA — Clothing Review Analyzer
        </h1>
        <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "14px" }}>
          Aspect-Based Sentiment Analysis | ATMECE CSE Project
        </p>
      </div>

      {/* Tabs */}
      <div style={{ background: "#1e293b", borderBottom: "1px solid #334155", padding: "0 40px", display: "flex", gap: "4px" }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "14px 20px",
              background: "transparent",
              color: activeTab === tab.id ? "#6366f1" : "#94a3b8",
              border: "none",
              borderBottom: activeTab === tab.id ? "2px solid #6366f1" : "2px solid transparent",
              fontSize: "14px", fontWeight: 600,
              cursor: "pointer", transition: "all 0.2s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ maxWidth: "1100px", margin: "40px auto", padding: "0 20px" }}>

        {/* ── Single Review Tab ── */}
        {activeTab === "single" && (
          <>
            <div style={{ background: "#1e293b", borderRadius: "12px", padding: "24px", marginBottom: "24px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, color: "#cbd5e1" }}>
                Enter a clothing review:
              </label>
              <textarea
                rows={4}
                value={review}
                onChange={e => setReview(e.target.value)}
                placeholder="e.g. The fabric is super soft but the size runs really small. Color is beautiful!"
                style={{
                  width: "100%", background: "#0f172a",
                  border: "1px solid #334155", borderRadius: "8px",
                  padding: "12px", color: "#f1f5f9",
                  fontSize: "15px", resize: "vertical",
                  outline: "none", boxSizing: "border-box",
                }}
              />
              <button
                onClick={analyzeReview}
                disabled={loading || !review.trim()}
                style={{
                  marginTop: "12px", padding: "12px 32px",
                  background: loading ? "#334155" : "#6366f1",
                  color: "#fff", border: "none", borderRadius: "8px",
                  fontSize: "15px", fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Analyzing..." : "Analyze Review"}
              </button>
            </div>

            {error && (
              <div style={{ background: "#450a0a", border: "1px solid #ef4444", borderRadius: "8px", padding: "16px", marginBottom: "24px", color: "#fca5a5" }}>
                ⚠️ {error}
              </div>
            )}

            {result && (
              <>
                {/* Overall Sentiment */}
                <div style={{ background: "#1e293b", borderRadius: "12px", padding: "20px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "16px" }}>
                  <span style={{ color: "#94a3b8", fontSize: "14px", fontWeight: 600 }}>Overall Sentiment:</span>
                  <span style={{
                    background: SENTIMENT_COLORS[result.overall_sentiment] || "#334155",
                    color: "#fff", borderRadius: "8px",
                    padding: "6px 20px", fontSize: "15px", fontWeight: 700
                  }}>
                    {result.overall_sentiment || "NEUTRAL"}
                  </span>
                  <span style={{ color: "#64748b", fontSize: "13px", marginLeft: "auto" }}>
                    Model: {result.model_used}
                  </span>
                </div>

                {/* Aspect Cards */}
                <div style={{ background: "#1e293b", borderRadius: "12px", padding: "24px", marginBottom: "24px" }}>
                  <h2 style={{ margin: "0 0 16px", fontSize: "18px", color: "#f1f5f9" }}>Detected Aspects</h2>
                  {aspectEntries.length === 0 ? (
                    <p style={{ color: "#94a3b8" }}>No specific aspects detected in this review.</p>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px" }}>
                      {aspectEntries.map(([aspect, data]) => (
                        <div key={aspect} style={{
                          background: "#0f172a",
                          border: `1px solid ${SENTIMENT_COLORS[data.sentiment]}44`,
                          borderRadius: "10px", padding: "16px",
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <span style={{ fontWeight: 700, fontSize: "15px" }}>
                              {ASPECT_ICONS[aspect]} {aspect}
                            </span>
                            <span style={{
                              background: SENTIMENT_COLORS[data.sentiment],
                              color: "#fff", borderRadius: "6px",
                              padding: "2px 10px", fontSize: "12px", fontWeight: 700,
                            }}>
                              {data.sentiment}
                            </span>
                          </div>
                          <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>
                            Confidence: {(data.confidence * 100).toFixed(1)}%
                          </div>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>
                            Keywords: {data.keywords_found?.join(", ")}
                          </div>
                          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px", fontStyle: "italic" }}>
                            "{data.context?.slice(0, 80)}{data.context?.length > 80 ? "..." : ""}"
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Chart */}
                {aspectEntries.length > 0 && (
                  <div style={{ background: "#1e293b", borderRadius: "12px", padding: "24px" }}>
                    <h2 style={{ margin: "0 0 16px", fontSize: "18px", color: "#f1f5f9" }}>Sentiment Confidence Chart</h2>
                    <Plot
                      data={chartData}
                      layout={{
                        paper_bgcolor: "transparent", plot_bgcolor: "transparent",
                        font: { color: "#f1f5f9" },
                        xaxis: { tickfont: { color: "#94a3b8" }, gridcolor: "#1e293b" },
                        yaxis: { tickfont: { color: "#94a3b8" }, gridcolor: "#334155", range: [0, 120], title: "Confidence %" },
                        margin: { t: 20, b: 60, l: 60, r: 20 },
                        showlegend: false,
                      }}
                      style={{ width: "100%", height: "300px" }}
                      config={{ displayModeBar: false }}
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}

        {activeTab === "batch"     && <BatchAnalysis />}
        {activeTab === "dashboard" && <Dashboard />}
        {activeTab === "models"    && <ModelComparison />}
        {activeTab === "history"   && <History />}

      </div>
    </div>
  );  
}