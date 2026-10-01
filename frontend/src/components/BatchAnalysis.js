import { useState } from "react";
import axios from "axios";
import Plot from "react-plotly.js";
import SentimentBadge from "./common/SentimentBadge";
import AspectChip from "./common/AspectChip";
import KpiGrid from "./common/KpiGrid";
import { StatusIcon } from "./common/Icons";
import { API_URL, SENTIMENT_COLORS } from "../constants";

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
  link.download = `batch_results_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function BatchAnalysis() {
  const [reviews, setReviews]     = useState("");
  const [results, setResults]     = useState(null);
  // eslint-disable-next-line no-unused-vars
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
      setError("Batch analysis failed. Make sure the backend is running on http://localhost:8000.");
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
      if (lines.length === 0) return;
      const header = lines[0].toLowerCase();
      const colIndex = header.includes("review text")
        ? 0
        : header.includes("review")
        ? header.split(",").findIndex(h => h.includes("review"))
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
    if (!results) return { POSITIVE: 0, NEGATIVE: 0, NEUTRAL: 0 };
    const counts = { POSITIVE: 0, NEGATIVE: 0, NEUTRAL: 0 };
    results.forEach(r => {
      const s = r.overall_sentiment || "NEUTRAL";
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  };

  const sentCounts = getSentimentCounts();
  const totalCount = results ? results.length : 0;

  const donutData = results
    ? [{
        type: "pie",
        hole: 0.65,
        labels: ["POSITIVE", "NEGATIVE", "NEUTRAL"],
        values: [sentCounts.POSITIVE || 0, sentCounts.NEGATIVE || 0, sentCounts.NEUTRAL || 0],
        marker: {
          colors: [SENTIMENT_COLORS.POSITIVE, SENTIMENT_COLORS.NEGATIVE, SENTIMENT_COLORS.NEUTRAL],
        },
        textinfo: "label+percent",
        textposition: "outside",
        automargin: true,
      }]
    : [];

  const kpiItems = results ? [
    {
      label: "Total Reviews",
      value: totalCount,
      theme: "brand",
      subtext: "Batch queue size",
    },
    {
      label: "Positive",
      value: sentCounts.POSITIVE || 0,
      theme: "pos",
      subtext: totalCount > 0 ? `${(((sentCounts.POSITIVE || 0) / totalCount) * 100).toFixed(0)}% favorable` : "0%",
    },
    {
      label: "Negative",
      value: sentCounts.NEGATIVE || 0,
      theme: "neg",
      subtext: totalCount > 0 ? `${(((sentCounts.NEGATIVE || 0) / totalCount) * 100).toFixed(0)}% flagged` : "0%",
    },
    {
      label: "Neutral",
      value: sentCounts.NEUTRAL || 0,
      theme: "neu",
      subtext: totalCount > 0 ? `${(((sentCounts.NEUTRAL || 0) / totalCount) * 100).toFixed(0)}% balanced` : "0%",
    },
  ] : [];

  return (
    <div>
      <div className="page-header-row">
        <div className="page-title-group">
          <h1>Batch Analysis</h1>
          <p>Analyze multiple reviews at once. Paste reviews (one per line) or upload a CSV file.</p>
        </div>
      </div>

      {/* Bulk Data Input Surface */}
      <div className="surface-panel" style={{ marginBottom: "28px" }}>
        <div className="panel-header">
          <div>
            <div className="panel-title">Bulk Data Input</div>
            <div className="panel-subtitle">Upload dataset or enter raw feedback entries below</div>
          </div>
        </div>
        <div className="panel-body">
          <div className="batch-upload-box">
            <div className="batch-upload-left">
              <div className="upload-icon-bubble">
                <StatusIcon type="folder" size={20} color="var(--brand-accent)" />
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)" }}>Upload CSV</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Standard CSV formatted review corpus</div>
              </div>
            </div>
            <label className="btn-secondary" style={{ margin: 0, cursor: "pointer" }}>
              Browse File
              <input type="file" accept=".csv" onChange={handleCSV} style={{ display: "none" }} />
            </label>
          </div>

          <textarea
            rows={5}
            value={reviews}
            onChange={e => setReviews(e.target.value)}
            placeholder={"Paste one review per line:\nThe fabric is great but runs small.\nLove the color, fast delivery!\nPoor stitching quality."}
            className="textarea-clean"
            style={{ marginBottom: "14px" }}
          />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: 500 }}>
              <strong style={{ color: "var(--text-main)" }}>{parseReviews().length}</strong> review{parseReviews().length !== 1 ? "s" : ""} ready
            </span>
            <button
              className="btn-primary"
              onClick={handleAnalyze}
              disabled={loading || parseReviews().length === 0}
            >
              {loading ? (
                "Analyzing..."
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Analyze Batch
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert-error">
          <StatusIcon type="warning" size={16} color="var(--neg-text)" />
          <span>{error}</span>
        </div>
      )}

      {results && (
        <>
          {/* KPI Tiles */}
          <KpiGrid items={kpiItems} />

          {/* Segmented Control Bar + Export */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px", gap: "12px", flexWrap: "wrap" }}>
            <div className="segmented-control">
              <button
                className={`segmented-btn ${activeTab === "results" ? "active" : ""}`}
                onClick={() => setActiveTab("results")}
              >
                Results
              </button>
              <button
                className={`segmented-btn ${activeTab === "chart" ? "active" : ""}`}
                onClick={() => setActiveTab("chart")}
              >
                Chart
              </button>
            </div>

            <button className="btn-export" onClick={() => exportToCSV(results)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </button>
          </div>

          {/* Content: Results Table or Chart */}
          {activeTab === "results" && (
            <div className="modern-table-container">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th style={{ width: "50px" }}>#</th>
                    <th>Review</th>
                    <th style={{ width: "140px", textAlign: "center" }}>Sentiment</th>
                    <th style={{ width: "320px" }}>Aspects</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => {
                    const aspects = r.aspect_sentiments || {};
                    const aspectKeys = Object.keys(aspects);
                    return (
                      <tr key={i}>
                        <td style={{ color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: "12.5px" }}>
                          {i + 1}
                        </td>
                        <td style={{ fontWeight: 500, color: "var(--text-main)", maxWidth: "420px" }}>
                          {r.review}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <SentimentBadge sentiment={r.overall_sentiment} />
                        </td>
                        <td>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {aspectKeys.length === 0 ? (
                              <span style={{ color: "var(--text-dim)", fontSize: "12px" }}>None detected</span>
                            ) : (
                              Object.entries(aspects).map(([asp, data]) => (
                                <AspectChip key={asp} aspect={asp} sentiment={data.sentiment} />
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
            <div className="surface-panel">
              <div className="panel-header">
                <div>
                  <div className="panel-title">Sentiment Distribution</div>
                  <div className="panel-subtitle">Proportional breakdown of batch reviews</div>
                </div>
              </div>
              <div className="panel-body">
                <Plot
                  data={donutData}
                  layout={{
                    paper_bgcolor: "transparent",
                    plot_bgcolor: "transparent",
                    font: { family: "Plus Jakarta Sans, sans-serif", color: "#475569", size: 12 },
                    showlegend: true,
                    legend: { orientation: "h", y: -0.15, x: 0.2, font: { color: "#64748b" } },
                    margin: { t: 20, b: 40, l: 20, r: 20 },
                    height: 300,
                  }}
                  style={{ width: "100%" }}
                  config={{ displayModeBar: false, responsive: true }}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}