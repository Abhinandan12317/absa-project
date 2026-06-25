import { useState, useEffect } from "react";
import axios from "axios";
import Plot from "react-plotly.js";

const API_URL = "http://localhost:8000";

const ASPECTS = ["SIZE", "FABRIC", "STITCHING", "COLOR", "PRICE", "DELIVERY"];
const ASPECT_ICONS = {
  SIZE: "📏", FABRIC: "🧵", STITCHING: "🪡",
  COLOR: "🎨", PRICE: "💰", DELIVERY: "🚚",
};

export default function Dashboard() {
  const [stats, setStats]               = useState(null);
  const [departments, setDepartments]   = useState([]);
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  // Fetch available departments once on mount
  useEffect(() => {
    axios.get(`${API_URL}/results/departments`)
      .then(res => setDepartments(res.data.departments || []))
      .catch(() => {});   // non-critical — dropdown just stays empty
  }, []);

  // Fetch stats whenever selected department changes
  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = selectedDept !== "ALL" ? { department: selectedDept } : {};
    axios.get(`${API_URL}/results/stats`, { params })
      .then(res => {
        setStats(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load stats");
        setLoading(false);
      });
  }, [selectedDept]);

  const sentDist   = stats?.sentiment_distribution || {};
  const aspectSent = stats?.aspect_sentiment || {};
  const totalReviews = Object.values(sentDist).reduce((a, b) => a + b, 0);

  // Donut chart
  const donutData = [{
    type: "pie",
    hole: 0.55,
    labels: Object.keys(sentDist),
    values: Object.values(sentDist),
    marker: {
      colors: Object.keys(sentDist).map(s =>
        s === "POSITIVE" ? "#22c55e" : s === "NEGATIVE" ? "#ef4444" : "#f59e0b"
      ),
    },
    textinfo: "label+percent",
    textfont: { color: "#f1f5f9", size: 13 },
  }];

  // Aspect bar chart
  const aspectLabels = ASPECTS.filter(a => aspectSent[a]);
  const barData = [
    { type: "bar", name: "Positive", x: aspectLabels.map(a => `${ASPECT_ICONS[a]} ${a}`), y: aspectLabels.map(a => aspectSent[a]?.POSITIVE || 0), marker: { color: "#22c55e" } },
    { type: "bar", name: "Negative", x: aspectLabels.map(a => `${ASPECT_ICONS[a]} ${a}`), y: aspectLabels.map(a => aspectSent[a]?.NEGATIVE || 0), marker: { color: "#ef4444" } },
    { type: "bar", name: "Neutral",  x: aspectLabels.map(a => `${ASPECT_ICONS[a]} ${a}`), y: aspectLabels.map(a => aspectSent[a]?.NEUTRAL  || 0), marker: { color: "#f59e0b" } },
  ];

  return (
    <div>
      {/* Header row with department filter */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#f1f5f9", margin: 0 }}>
          Analytics Dashboard
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <label style={{ fontSize: "13px", color: "#94a3b8" }}>Department:</label>
          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            style={{
              background: "#1e293b",
              color: "#f1f5f9",
              border: "1px solid #334155",
              borderRadius: "8px",
              padding: "6px 12px",
              fontSize: "13px",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="ALL">All Departments</option>
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      <p style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "24px" }}>
        {selectedDept === "ALL"
          ? "Aggregated sentiment insights from all analyzed reviews."
          : `Showing insights for department: ${selectedDept}`}
      </p>

      {loading ? (
        <p style={{ color: "#94a3b8" }}>Loading dashboard...</p>
      ) : error ? (
        <p style={{ color: "#ef4444" }}>{error}</p>
      ) : (
        <>
          {/* Stats Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            {[
              { label: "Total Analyzed", value: totalReviews,          color: "#6366f1" },
              { label: "Positive",       value: sentDist.POSITIVE || 0, color: "#22c55e" },
              { label: "Negative",       value: sentDist.NEGATIVE || 0, color: "#ef4444" },
              { label: "Neutral",        value: sentDist.NEUTRAL  || 0, color: "#f59e0b" },
            ].map(stat => (
              <div key={stat.label} style={{
                background: "#0f172a",
                border: `1px solid ${stat.color}44`,
                borderRadius: "12px",
                padding: "20px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "32px", fontWeight: 800, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px" }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {totalReviews === 0 ? (
            <div style={{ background: "#1e293b", borderRadius: "12px", padding: "40px", textAlign: "center", color: "#94a3b8" }}>
              {selectedDept === "ALL"
                ? <>No reviews analyzed yet. Go to <strong style={{ color: "#6366f1" }}>Single Review</strong> or <strong style={{ color: "#6366f1" }}>Batch Analysis</strong> to get started.</>
                : <>No reviews found for department <strong style={{ color: "#6366f1" }}>{selectedDept}</strong>. Try a different department or analyze more reviews.</>
              }
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              {/* Donut Chart */}
              <div style={{ background: "#1e293b", borderRadius: "12px", padding: "24px" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: "16px", color: "#f1f5f9" }}>Sentiment Distribution</h3>
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
                  style={{ width: "100%", height: "280px" }}
                  config={{ displayModeBar: false }}
                />
              </div>

              {/* Aspect Bar Chart */}
              <div style={{ background: "#1e293b", borderRadius: "12px", padding: "24px" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: "16px", color: "#f1f5f9" }}>Aspect-wise Sentiment</h3>
                {aspectLabels.length === 0 ? (
                  <p style={{ color: "#94a3b8", fontSize: "14px" }}>No aspect data yet.</p>
                ) : (
                  <Plot
                    data={barData}
                    layout={{
                      paper_bgcolor: "transparent",
                      plot_bgcolor: "transparent",
                      font: { color: "#f1f5f9" },
                      barmode: "group",
                      xaxis: { tickfont: { color: "#94a3b8", size: 11 }, gridcolor: "#334155" },
                      yaxis: { tickfont: { color: "#94a3b8" }, gridcolor: "#334155", title: "Count" },
                      margin: { t: 10, b: 60, l: 50, r: 10 },
                      legend: { font: { color: "#94a3b8" } },
                    }}
                    style={{ width: "100%", height: "280px" }}
                    config={{ displayModeBar: false }}
                  />
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}