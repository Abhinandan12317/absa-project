import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "http://localhost:8000";

const MODEL_COLORS = {
  "DistilBERT":          "#6366f1",
  "CNN-BiLSTM":          "#22c55e",
  "SVM":                 "#f59e0b",
  "Logistic Regression": "#94a3b8",
};

const CLASS_LABELS = ["NEGATIVE", "NEUTRAL", "POSITIVE"];

const ConfusionMatrix = ({ cm, modelColor }) => {
  if (!cm || cm.length === 0) return null;

  const maxVal = Math.max(...cm.flat());

  return (
    <div style={{ marginTop: "16px" }}>
      <div style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "8px", fontWeight: 600 }}>
        Confusion Matrix
      </div>
      <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>
        Rows = Actual, Columns = Predicted
      </div>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th style={{ padding: "6px 8px", color: "#64748b", fontSize: "11px", textAlign: "left" }}></th>
            {CLASS_LABELS.map(label => (
              <th key={label} style={{ padding: "6px 8px", color: "#94a3b8", fontSize: "11px", textAlign: "center" }}>
                {label.slice(0, 3)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cm.map((row, i) => (
            <tr key={i}>
              <td style={{ padding: "4px 8px", color: "#94a3b8", fontSize: "11px", fontWeight: 600 }}>
                {CLASS_LABELS[i].slice(0, 3)}
              </td>
              {row.map((val, j) => {
                const intensity = maxVal > 0 ? val / maxVal : 0;
                const isDiagonal = i === j;
                return (
                  <td key={j} style={{
                    padding: "6px 8px", textAlign: "center",
                    fontSize: "12px", fontWeight: isDiagonal ? 700 : 400,
                    background: isDiagonal
                      ? `${modelColor}${Math.round(intensity * 80 + 20).toString(16).padStart(2, "0")}`
                      : `#ef444420`,
                    color: isDiagonal ? "#f1f5f9" : "#f87171",
                    borderRadius: "4px",
                    border: isDiagonal ? `1px solid ${modelColor}44` : "1px solid #ef444422",
                    minWidth: "48px"
                  }}>
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
};

export default function ModelComparison() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get(`${API_URL}/models/metrics`)
      .then(res => {
        setModels(res.data.models);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load model metrics");
        setLoading(false);
      });
  }, []);

  const getBestValue = (key) => Math.max(...models.map(m => m[key]));

  const metrics = ["accuracy", "precision", "recall", "f1"];

  return (
    <div>
      <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px", color: "#f1f5f9" }}>
        Model Comparison
      </h2>
      <p style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "24px" }}>
        Performance metrics for all 4 trained models on the test set.
      </p>

      {loading && <p style={{ color: "#94a3b8" }}>Loading metrics...</p>}
      {error   && <p style={{ color: "#ef4444" }}>{error}</p>}

      {!loading && !error && (
        <>
          {/* Metric Cards with Confusion Matrix */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px", marginBottom: "32px" }}>
            {models.map(model => (
              <div key={model.model_name} style={{
                background: "#0f172a",
                border: `1px solid ${MODEL_COLORS[model.model_name]}44`,
                borderRadius: "12px",
                padding: "20px",
              }}>
                <div style={{
                  width: "10px", height: "10px", borderRadius: "50%",
                  background: MODEL_COLORS[model.model_name],
                  marginBottom: "10px"
                }} />
                <div style={{ fontWeight: 700, fontSize: "15px", marginBottom: "12px", color: "#f1f5f9" }}>
                  {model.model_name}
                </div>

                {/* Metrics */}
                {metrics.map(metric => (
                  <div key={metric} style={{ marginBottom: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "12px", color: "#94a3b8", textTransform: "capitalize" }}>{metric}</span>
                      <span style={{
                        fontSize: "12px", fontWeight: 700,
                        color: model[metric] === getBestValue(metric) ? "#22c55e" : "#f1f5f9"
                      }}>
                        {model[metric].toFixed(2)}%
                        {model[metric] === getBestValue(metric) && " 🏆"}
                      </span>
                    </div>
                    <div style={{ background: "#1e293b", borderRadius: "4px", height: "4px" }}>
                      <div style={{
                        width: `${model[metric]}%`,
                        background: MODEL_COLORS[model.model_name],
                        height: "4px", borderRadius: "4px",
                        transition: "width 0.5s ease"
                      }} />
                    </div>
                  </div>
                ))}

                {/* Confusion Matrix */}
                <ConfusionMatrix
                  cm={model.confusion_matrix}
                  modelColor={MODEL_COLORS[model.model_name]}
                />
              </div>
            ))}
          </div>

          {/* Summary Table */}
          <div style={{ background: "#0f172a", borderRadius: "12px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#1e293b" }}>
                  <th style={{ padding: "14px 16px", textAlign: "left", color: "#94a3b8", fontSize: "13px", fontWeight: 600 }}>Model</th>
                  {metrics.map(m => (
                    <th key={m} style={{ padding: "14px 16px", textAlign: "center", color: "#94a3b8", fontSize: "13px", fontWeight: 600, textTransform: "capitalize" }}>{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {models.map((model) => (
                  <tr key={model.model_name} style={{ borderTop: "1px solid #1e293b" }}>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: MODEL_COLORS[model.model_name] }} />
                        <span style={{ fontWeight: 600, color: "#f1f5f9" }}>{model.model_name}</span>
                      </div>
                    </td>
                    {metrics.map(metric => (
                      <td key={metric} style={{ padding: "14px 16px", textAlign: "center" }}>
                        <span style={{
                          color: model[metric] === getBestValue(metric) ? "#22c55e" : "#cbd5e1",
                          fontWeight: model[metric] === getBestValue(metric) ? 700 : 400,
                          fontSize: "14px"
                        }}>
                          {model[metric].toFixed(2)}%
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}