import React from "react";
import { AspectIcon } from "./Icons";

export default function AspectChip({ aspect, sentiment, showSentiment = false }) {
  const norm = (sentiment || "NEUTRAL").toUpperCase();
  return (
    <span className={`aspect-chip ${norm}`}>
      <AspectIcon aspect={aspect} size={13} />
      <span>{aspect}{showSentiment ? `: ${norm}` : ""}</span>
    </span>
  );
}
