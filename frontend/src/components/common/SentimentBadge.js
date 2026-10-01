import React from "react";

export default function SentimentBadge({ sentiment, className = "" }) {
  const norm = (sentiment || "NEUTRAL").toUpperCase();
  return (
    <span className={`sentiment-badge ${norm} ${className}`.trim()}>
      {norm}
    </span>
  );
}
