import { useState, useEffect } from "react";
import axios from "axios";
import { StatusIcon } from "./common/Icons";
import { API_URL, MODEL_COLORS } from "../constants";

const CLASS_LABELS = ["NEGATIVE", "NEUTRAL", "POSITIVE"];
const METRICS = ["accuracy", "precision", "recall", "f1"];

function ConfusionMatrix({ cm }) {
  if (!cm || cm.length === 0) return null;

  const maxVal = Math.max(...cm.flat());

  return (
    <div className="cm-container">
      <div className="cm-header-label">Confusion Matrix</div>
      <div className="cm-subtitle">Rows = Actual, Columns = Predicted</div>
      <table className="cm-grid-table">
        <thead>
          <tr>
            <th></th>
            {CLASS_LABELS.map(label => (
              <th key={label}>{label.slice(0, 3)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cm.map((row, i) => (
            <tr key={i}>
              <td style={{ fontWeight: 700, color: "var(--text-muted)", fontSize: "10.5px" }}>
                {CLASS_LABELS[i].slice(0, 3)}
              </td>
              {row.map((val, j) => {
                const isDiag = i === j;
                const intensity = maxVal > 0 ? val / maxVal : 0;
                const bg = isDiag
                  ? `rgba(16, 185, 129, ${0.12 + intensity * 0.45})`
                  : `rgba(244, 63, 94, ${0.06 + intensity * 0.2})`;
                const fg = isDiag ? "#065f46" : "#9f1239";

                return (
                  <td key={j} style={{ background: bg, color: fg }}>
                    {val.toLocaleString()}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ModelComparison() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get(`${API_URL}/models/metrics`)
      .then(res => {
        setModels(res.data.models || []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load model metrics. Make sure the backend is running on http://localhost:8000.");
        setLoading(false);
      });
  }, []);

  const getBestValue = (key) =>
    models.length > 0 ? Math.max(...models.map(m => m[key] || 0)) : 0;

  return (
    <div>
      <div className="page-header-row">
        <div className="page-title-group">
          <h1>Model Comparison</h1>
          <p>Performance metrics for all 4 trained models on the test set.</p>
        </div>
      </div>

      {loading && (
        <div className="empty-state-panel">
          <div style={{ fontSize: "14px", color: "var(--text-muted)" }}>Loading model metrics...</div>
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
          {/* Models Evaluation Grid */}
          <div className="models-card-grid">
            {models.map(model => {
              const brandCol = MODEL_COLORS[model.model_name] || "#6366f1";
              const isOverallLeader = model.accuracy === getBestValue("accuracy");

              return (
                <div key={model.model_name} className="model-card">
                  <div className="model-card-header">
                    <div className="model-indicator">
                      <span className="model-color-pip" style={{ background: brandCol }} />
                      <span className="model-card-title">{model.model_name}</span>
                    </div>
                    {isOverallLeader && (
                      <span
                        className="brand-tag"
                        style={{
                          background: "#ecfdf5",
                          color: "#065f46",
                          border: "1px solid #a7f3d0",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <StatusIcon type="check" size={11} color="#059669" />
                        Leader
                      </span>
                    )}
                  </div>

                  <div className="model-metrics-list">
                    {METRICS.map(metric => {
                      const isBest = model[metric] === getBestValue(metric);
                      return (
                        <div key={metric} className="metric-bar-item">
                          <div className="metric-bar-header">
                            <span className="metric-name">{metric}</span>
                            <span className={`metric-val ${isBest ? "best" : ""}`} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              {model[metric].toFixed(2)}% {isBest && <StatusIcon type="star" size={12} color="#10b981" />}
                            </span>
                          </div>
                          <div className="metric-track">
                            <div
                              className="metric-bar-fill"
                              style={{
                                width: `${Math.min(100, model[metric])}%`,
                                background: isBest ? "#10b981" : brandCol,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Confusion Matrix */}
                  <ConfusionMatrix cm={model.confusion_matrix} />
                </div>
              );
            })}
          </div>

          {/* Consolidated Benchmark Table */}
          <div className="surface-panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">Model Benchmark Matrix</div>
                <div className="panel-subtitle">Comprehensive cross-architecture comparison</div>
              </div>
            </div>
            <div className="modern-table-container" style={{ border: "none", borderRadius: 0 }}>
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Model</th>
                    {METRICS.map(k => (
                      <th key={k} style={{ textAlign: "right" }}>
                        {k.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {models.map(model => {
                    const brandCol = MODEL_COLORS[model.model_name] || "#6366f1";
                    return (
                      <tr key={model.model_name}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span
                              style={{
                                width: "8px",
                                height: "8px",
                                borderRadius: "50%",
                                background: brandCol,
                              }}
                            />
                            <span style={{ fontWeight: 700, color: "var(--text-main)" }}>
                              {model.model_name}
                            </span>
                          </div>
                        </td>
                        {METRICS.map(metric => {
                          const isBest = model[metric] === getBestValue(metric);
                          return (
                            <td
                              key={metric}
                              style={{
                                textAlign: "right",
                                fontFamily: "var(--font-mono)",
                                fontSize: "13.5px",
                                fontWeight: isBest ? 700 : 500,
                                color: isBest ? "#065f46" : "var(--text-secondary)",
                              }}
                            >
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", justifyContent: "flex-end" }}>
                                {model[metric].toFixed(2)}% {isBest ? <StatusIcon type="trophy" size={13} color="#059669" /> : ""}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}