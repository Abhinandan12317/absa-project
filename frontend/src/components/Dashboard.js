import { useState, useEffect } from "react";
import axios from "axios";
import Plot from "react-plotly.js";
import KpiGrid from "./common/KpiGrid";
import { StatusIcon } from "./common/Icons";
import { API_URL, ASPECTS, ASPECT_ICONS, SENTIMENT_COLORS } from "../constants";

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
      .catch(() => {}); // non-critical — dropdown just stays empty
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
        setError("Failed to load dashboard statistics. Make sure the backend is running on http://localhost:8000.");
        setLoading(false);
      });
  }, [selectedDept]);

  const sentDist     = stats?.sentiment_distribution || {};
  const aspectSent   = stats?.aspect_sentiment || {};
  const totalReviews = Object.values(sentDist).reduce((a, b) => a + b, 0);

  // Donut chart
  const donutData = [{
    type: "pie",
    hole: 0.65,
    labels: ["POSITIVE", "NEGATIVE", "NEUTRAL"],
    values: [sentDist.POSITIVE || 0, sentDist.NEGATIVE || 0, sentDist.NEUTRAL || 0],
    marker: {
      colors: [SENTIMENT_COLORS.POSITIVE, SENTIMENT_COLORS.NEGATIVE, SENTIMENT_COLORS.NEUTRAL],
    },
    textinfo: "label+percent",
    textposition: "outside",
    automargin: true,
  }];

  // Aspect bar chart
  const aspectLabels = ASPECTS.filter(a => aspectSent[a] || true);
  const barData = [
    {
      type: "bar",
      name: "Positive",
      x: aspectLabels.map(a => `${ASPECT_ICONS[a] || ""} ${a}`),
      y: aspectLabels.map(a => aspectSent[a]?.POSITIVE || 0),
      marker: { color: SENTIMENT_COLORS.POSITIVE },
    },
    {
      type: "bar",
      name: "Negative",
      x: aspectLabels.map(a => `${ASPECT_ICONS[a] || ""} ${a}`),
      y: aspectLabels.map(a => aspectSent[a]?.NEGATIVE || 0),
      marker: { color: SENTIMENT_COLORS.NEGATIVE },
    },
    {
      type: "bar",
      name: "Neutral",
      x: aspectLabels.map(a => `${ASPECT_ICONS[a] || ""} ${a}`),
      y: aspectLabels.map(a => aspectSent[a]?.NEUTRAL || 0),
      marker: { color: SENTIMENT_COLORS.NEUTRAL },
    },
  ];

  const kpiItems = [
    {
      label: "Total Analyzed",
      value: totalReviews,
      theme: "brand",
      subtext: selectedDept === "ALL" ? "Entire corpus" : selectedDept,
    },
    {
      label: "Positive",
      value: sentDist.POSITIVE || 0,
      theme: "pos",
      subtext: totalReviews > 0 ? `${(((sentDist.POSITIVE || 0) / totalReviews) * 100).toFixed(1)}% favorable` : "0%",
    },
    {
      label: "Negative",
      value: sentDist.NEGATIVE || 0,
      theme: "neg",
      subtext: totalReviews > 0 ? `${(((sentDist.NEGATIVE || 0) / totalReviews) * 100).toFixed(1)}% critical` : "0%",
    },
    {
      label: "Neutral",
      value: sentDist.NEUTRAL || 0,
      theme: "neu",
      subtext: totalReviews > 0 ? `${(((sentDist.NEUTRAL || 0) / totalReviews) * 100).toFixed(1)}% neutral` : "0%",
    },
  ];

  return (
    <div>
      {/* Header row with department filter */}
      <div className="page-header-row">
        <div className="page-title-group">
          <h1>Analytics Dashboard</h1>
          <p>
            {selectedDept === "ALL"
              ? "Aggregated sentiment insights from all analyzed reviews."
              : `Showing insights for department: ${selectedDept}`}
          </p>
        </div>

        <div className="header-action-group">
          <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>
            Department:
          </label>
          <select
            className="select-control"
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
          >
            <option value="ALL">All Departments</option>
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="empty-state-panel">
          <div style={{ fontSize: "14px", color: "var(--text-muted)" }}>Loading dashboard analytics...</div>
        </div>
      )}

      {error && (
        <div className="alert-error">
          <StatusIcon type="warning" size={16} color="var(--neg-text)" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* KPI Grid */}
          <KpiGrid items={kpiItems} />

          {totalReviews === 0 ? (
            <div className="empty-state-panel">
              {selectedDept === "ALL" ? (
                <>
                  <div style={{ marginBottom: "12px", color: "var(--brand-accent)" }}>
                    <StatusIcon type="chart" size={38} color="var(--brand-accent)" />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "15px", color: "var(--text-main)", marginBottom: "6px" }}>
                    No reviews analyzed yet
                  </div>
                  <div style={{ fontSize: "13px" }}>
                    Go to <strong style={{ color: "var(--primary-900)" }}>Single Review</strong> or{" "}
                    <strong style={{ color: "var(--primary-900)" }}>Batch Analysis</strong> to process reviews and generate live statistics.
                  </div>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: "12px", color: "var(--brand-accent)" }}>
                    <StatusIcon type="folder" size={38} color="var(--brand-accent)" />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "15px", color: "var(--text-main)", marginBottom: "6px" }}>
                    No reviews found for department "{selectedDept}"
                  </div>
                  <div style={{ fontSize: "13px" }}>
                    Try selecting a different department or analyze more reviews.
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="dashboard-charts-grid">
              {/* Donut Chart */}
              <div className="surface-panel">
                <div className="panel-header">
                  <div>
                    <div className="panel-title">Sentiment Distribution</div>
                    <div className="panel-subtitle">Proportion of global sentiment classes</div>
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
                      legend: { orientation: "h", y: -0.15, x: 0.15, font: { color: "#64748b" } },
                      margin: { t: 20, b: 30, l: 20, r: 20 },
                      height: 290,
                    }}
                    style={{ width: "100%" }}
                    config={{ displayModeBar: false, responsive: true }}
                  />
                </div>
              </div>

              {/* Aspect Bar Chart */}
              <div className="surface-panel">
                <div className="panel-header">
                  <div>
                    <div className="panel-title">Aspect-wise Sentiment</div>
                    <div className="panel-subtitle">Frequency breakdown per clothing attribute</div>
                  </div>
                </div>
                <div className="panel-body">
                  <Plot
                    data={barData}
                    layout={{
                      paper_bgcolor: "transparent",
                      plot_bgcolor: "transparent",
                      font: { family: "Plus Jakarta Sans, sans-serif", color: "#475569", size: 12 },
                      barmode: "group",
                      xaxis: {
                        tickfont: { color: "#334155", size: 11 },
                        gridcolor: "#f1f5f9",
                        zerolinecolor: "#e2e8f0",
                      },
                      yaxis: {
                        tickfont: { color: "#64748b", size: 11 },
                        gridcolor: "#f1f5f9",
                        title: "Count",
                      },
                      legend: { orientation: "h", y: -0.2, x: 0.2, font: { color: "#64748b" } },
                      margin: { t: 20, b: 50, l: 45, r: 10 },
                      height: 290,
                    }}
                    style={{ width: "100%" }}
                    config={{ displayModeBar: false, responsive: true }}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}