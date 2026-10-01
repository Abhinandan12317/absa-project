import { useState } from "react";
import axios from "axios";
import Plot from "react-plotly.js";
import BatchAnalysis from "./components/BatchAnalysis";
import Dashboard from "./components/Dashboard";
import ModelComparison from "./components/ModelComparison";
import History from "./components/History";
import SentimentBadge from "./components/common/SentimentBadge";
import LandingPage from "./components/LandingPage";
import { StatusIcon } from "./components/common/Icons";
import { API_URL, ASPECT_ICONS, SENTIMENT_COLORS } from "./constants";
import "./App.css";

const TABS = [
  { id: "single",    label: "Single Review"   },
  { id: "batch",     label: "Batch Analysis"  },
  { id: "dashboard", label: "Dashboard"        },
  { id: "models",    label: "Model Comparison" },
  { id: "history",   label: "History"          },
];

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [activeTab, setActiveTab]     = useState("single");

  // Single review states
  const [review, setReview]           = useState("");
  const [result, setResult]           = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);

  // Show landing page until user clicks Launch
  if (showLanding) {
    return <LandingPage onLaunch={() => setShowLanding(false)} />;
  }

  const analyzeReview = async () => {
    if (!review.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await axios.post(`${API_URL}/analyze`, { review });
      setResult(res.data.data);
    } catch (err) {
      setError("Failed to connect to API. Make sure the backend is running on http://localhost:8000.");
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
          orientation: "h",
          y: aspectEntries.map(([a]) => `${ASPECT_ICONS[a] || ""} ${a}`),
          x: aspectEntries.map(([, d]) => d.confidence * 100),
          marker: {
            color: aspectEntries.map(([, d]) =>
              d.sentiment === "POSITIVE" ? SENTIMENT_COLORS.POSITIVE
              : d.sentiment === "NEGATIVE" ? SENTIMENT_COLORS.NEGATIVE
              : SENTIMENT_COLORS.NEUTRAL
            ),
            opacity: 0.9,
          },
          text: aspectEntries.map(([, d]) => `${(d.confidence * 100).toFixed(1)}% (${d.sentiment})`),
          textposition: "inside",
          insidetextfont: { color: "#ffffff", family: "Plus Jakarta Sans, sans-serif", weight: 600, size: 11 },
        }]
      : [];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top SaaS Shell Navigation */}
      <header className="navbar">
        <div className="navbar-container">
          <div className="nav-brand" onClick={() => setShowLanding(true)} style={{ cursor: "pointer" }} title="Return to Landing Page">
            <img
              src="/logo.png"
              alt="ABSA Clothing Review Analyzer Logo"
              className="brand-logo-img"
              onError={(e) => {
                // Fallback if image path has issue
                e.currentTarget.style.display = "none";
              }}
            />
            <div className="brand-text">
              <div className="brand-title">
                ABSA <span className="brand-tag">v2.4</span>
              </div>
              <div className="brand-subtitle">Clothing Review Analyzer</div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="nav-tabs" aria-label="Main Navigation">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`nav-tab-btn ${activeTab === tab.id ? "active" : ""}`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Project Context Badge */}
          <div className="nav-meta-badge">
            <span className="status-dot"></span>
            <span>ATMECE CSE Project</span>
          </div>
        </div>
      </header>

      {/* Main Content Root */}
      <main className="main-wrapper">
        {/* ── Single Review View ── */}
        {activeTab === "single" && (
          <div>
            <div className="page-header-row">
              <div className="page-title-group">
                <h1>Single Review</h1>
                <p>Real-time Aspect-Based Sentiment Analysis on individual customer feedback</p>
              </div>
            </div>

            <div className="single-workspace-layout">
              {/* Left Column: Input Surface */}
              <div className="surface-panel input-workspace-card">
                <div className="panel-header">
                  <div>
                    <div className="panel-title">Review Input</div>
                    <div className="panel-subtitle">Enter a clothing review for instant aspect extraction</div>
                  </div>
                </div>
                <div className="panel-body">
                  <textarea
                    rows={5}
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    placeholder="e.g. The fabric is super soft but the size runs really small. Color is beautiful!"
                    className="textarea-clean"
                  />

                  <div className="review-input-footer">
                    <span style={{ fontSize: "12.5px", color: "var(--text-muted)", fontWeight: 500 }}>
                      Active model:{" "}
                      <strong style={{ color: "var(--text-main)", fontFamily: "var(--font-mono)" }}>
                        {result?.model_used || "DistilBERT / LR"}
                      </strong>
                    </span>
                    <button
                      className="btn-primary"
                      onClick={analyzeReview}
                      disabled={loading || !review.trim()}
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                          </svg>
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m5 12 7-7 7 7" />
                            <path d="M12 19V5" />
                          </svg>
                          Analyze Review
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Analysis Results */}
              <div className="surface-panel">
                <div className="panel-header">
                  <div>
                    <div className="panel-title">Analysis Results</div>
                    <div className="panel-subtitle">Synthesized sentiment breakdown & aspect mapping</div>
                  </div>
                </div>
                <div className="panel-body">
                  {error && (
                    <div className="alert-error">
                      <StatusIcon type="warning" size={16} color="var(--neg-text)" />
                      <span>{error}</span>
                    </div>
                  )}

                  {!result && !error && (
                    <div style={{ textAlign: "center", padding: "48px 16px", color: "var(--text-muted)" }}>
                      <div style={{ marginBottom: "12px", color: "var(--brand-accent)" }}>
                        <StatusIcon type="search" size={38} color="var(--brand-accent)" />
                      </div>
                      <div style={{ fontWeight: 600, fontSize: "15px", color: "var(--text-main)", marginBottom: "4px" }}>
                        Ready for analysis
                      </div>
                      <div style={{ fontSize: "13px" }}>
                        Type or paste a customer review in the input panel and click "Analyze Review".
                      </div>
                    </div>
                  )}

                  {result && (
                    <>
                      {/* Overall Summary Banner */}
                      <div className="overview-banner">
                        <div className="overview-banner-left">
                          <span className="overview-banner-label">Overall Sentiment</span>
                          <SentimentBadge sentiment={result.overall_sentiment} />
                        </div>
                        <span className="overview-banner-model">
                          Model: {result.model_used || "DistilBERT"}
                        </span>
                      </div>

                      {/* Detected Aspects */}
                      <div style={{ marginBottom: "24px" }}>
                        <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text-main)", marginBottom: "12px" }}>
                          Detected Aspects ({aspectEntries.length})
                        </div>
                        {aspectEntries.length === 0 ? (
                          <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                            No specific aspects detected in this review.
                          </p>
                        ) : (
                          <div className="aspect-cards-stack">
                            {aspectEntries.map(([aspect, data]) => {
                              const confPct = (data.confidence * 100).toFixed(1);
                              const sentColor =
                                data.sentiment === "POSITIVE"
                                  ? SENTIMENT_COLORS.POSITIVE
                                  : data.sentiment === "NEGATIVE"
                                  ? SENTIMENT_COLORS.NEGATIVE
                                  : SENTIMENT_COLORS.NEUTRAL;

                              return (
                                <div key={aspect} className="aspect-structured-row">
                                  <div className="aspect-row-header">
                                    <span className="aspect-name-badge">
                                      {ASPECT_ICONS[aspect] || ""} {aspect}
                                    </span>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                      <div className="aspect-metric-bar-group">
                                        <span className="confidence-val">{confPct}%</span>
                                        <div className="confidence-progress-bg">
                                          <div
                                            className="confidence-progress-fill"
                                            style={{
                                              width: `${confPct}%`,
                                              backgroundColor: sentColor,
                                            }}
                                          />
                                        </div>
                                      </div>
                                      <SentimentBadge sentiment={data.sentiment} />
                                    </div>
                                  </div>

                                  {data.context && (
                                    <div className="aspect-context-box">
                                      "{data.context}"
                                    </div>
                                  )}

                                  {data.keywords_found && data.keywords_found.length > 0 && (
                                    <div className="aspect-keywords-line">
                                      <span>Keywords:</span>
                                      {data.keywords_found.map((kw, i) => (
                                        <span key={i} className="keyword-pill">
                                          {kw}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Confidence Chart */}
                      {aspectEntries.length > 0 && (
                        <div>
                          <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--text-main)", marginBottom: "8px" }}>
                            Sentiment Confidence Chart
                          </div>
                          <Plot
                            data={chartData}
                            layout={{
                              paper_bgcolor: "transparent",
                              plot_bgcolor: "transparent",
                              font: { family: "Plus Jakarta Sans, sans-serif", color: "#475569", size: 12 },
                              xaxis: {
                                tickfont: { color: "#64748b", size: 11 },
                                gridcolor: "#f1f5f9",
                                zerolinecolor: "#e2e8f0",
                                range: [0, 105],
                                title: "Confidence %",
                              },
                              yaxis: {
                                tickfont: { color: "#0f172a", size: 12, weight: 600 },
                                autorange: "reversed",
                              },
                              margin: { t: 10, b: 40, l: 110, r: 20 },
                              showlegend: false,
                              height: Math.max(200, aspectEntries.length * 48 + 60),
                            }}
                            style={{ width: "100%" }}
                            config={{ displayModeBar: false, responsive: true }}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Other Views ── */}
        {activeTab === "batch"     && <BatchAnalysis />}
        {activeTab === "dashboard" && <Dashboard />}
        {activeTab === "models"    && <ModelComparison />}
        {activeTab === "history"   && <History />}
      </main>

      {/* Clean SaaS Application Footer */}
      <footer className="app-footer">
        <div className="footer-inner">
          <span>Aspect-Based Sentiment Analysis | ATMECE CSE Project</span>
          <span>Connected to backend API (localhost:8000)</span>
        </div>
      </footer>
    </div>
  );
}