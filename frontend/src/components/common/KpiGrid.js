import React from "react";

export default function KpiGrid({ items }) {
  // items: array of { label, value, theme: 'brand'|'pos'|'neg'|'neu', subtext }
  return (
    <div className="kpi-grid">
      {items.map((item, idx) => (
        <div key={idx} className={`kpi-tile ${item.theme || "brand"}`}>
          <div className="kpi-label">
            <span>{item.label}</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">
              {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
            </span>
          </div>
          <div className="kpi-subtext">{item.subtext || "Live evaluation"}</div>
        </div>
      ))}
    </div>
  );
}
