import React from "react";

/**
 * AspectIcon Component
 * Renders sleek, monochromatic SVG icons for the 6 garment analysis aspects.
 */
export const AspectIcon = ({ aspect, size = 18, color = "currentColor", className = "", style = {} }) => {
  const iconProps = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    style: { display: "inline-block", verticalAlign: "middle", ...style },
  };

  const code = (aspect || "").toUpperCase().trim();

  switch (code) {
    case "SIZE":
      return (
        <svg {...iconProps}>
          <path d="M2 12h20" />
          <path d="M6 12v-4" />
          <path d="M10 12v-2" />
          <path d="M14 12v-4" />
          <path d="M18 12v-2" />
          <rect x="2" y="6" width="20" height="12" rx="2" strokeWidth="1.5" />
        </svg>
      );

    case "FABRIC":
      return (
        <svg {...iconProps}>
          <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" />
          <path d="m22 12.5-8.58 3.91a2 2 0 0 1-1.66 0L3.17 12.5" />
          <path d="m22 17.5-8.58 3.91a2 2 0 0 1-1.66 0L3.17 17.5" />
        </svg>
      );

    case "STITCHING":
      return (
        <svg {...iconProps}>
          <circle cx="6" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <line x1="20" y1="4" x2="8.12" y2="15.88" />
          <line x1="14.47" y1="14.47" x2="20" y2="20" />
          <line x1="8.12" y1="8.12" x2="12" y2="12" />
        </svg>
      );

    case "COLOR":
      return (
        <svg {...iconProps}>
          <circle cx="13.5" cy="6.5" r=".5" fill={color} />
          <circle cx="17.5" cy="10.5" r=".5" fill={color} />
          <circle cx="8.5" cy="7.5" r=".5" fill={color} />
          <circle cx="6.5" cy="12.5" r=".5" fill={color} />
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.92 0 1.7-.75 1.7-1.68 0-.44-.17-.86-.44-1.18-.28-.32-.44-.73-.44-1.18 0-.93.75-1.68 1.68-1.68H17c2.76 0 5-2.24 5-5 0-4.42-4.03-8-10-8z" />
        </svg>
      );

    case "PRICE":
      return (
        <svg {...iconProps}>
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="3" />
        </svg>
      );

    case "DELIVERY":
      return (
        <svg {...iconProps}>
          <rect x="1" y="3" width="15" height="13" rx="2" />
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      );

    default:
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      );
  }
};

/**
 * PipelineStepIcon Component
 * Monochromatic SVG icons for 8-step pipeline stages.
 */
export const PipelineStepIcon = ({ stepNum, size = 20, color = "currentColor", className = "" }) => {
  const iconProps = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
  };

  switch (String(stepNum)) {
    case "01": // Review Ingestion
      return (
        <svg {...iconProps}>
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      );

    case "02": // React Client
      return (
        <svg {...iconProps}>
          <ellipse cx="12" cy="12" rx="9" ry="4.5" transform="rotate(30 12 12)" />
          <ellipse cx="12" cy="12" rx="9" ry="4.5" transform="rotate(90 12 12)" />
          <ellipse cx="12" cy="12" rx="9" ry="4.5" transform="rotate(150 12 12)" />
          <circle cx="12" cy="12" r="2" fill={color} />
        </svg>
      );

    case "03": // FastAPI Gateway
      return (
        <svg {...iconProps}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );

    case "04": // NLP Preprocessing
      return (
        <svg {...iconProps}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <rect x="9" y="9" width="6" height="6" />
          <line x1="9" y1="1" x2="9" y2="4" />
          <line x1="15" y1="1" x2="15" y2="4" />
          <line x1="9" y1="20" x2="9" y2="23" />
          <line x1="15" y1="20" x2="15" y2="23" />
          <line x1="20" y1="9" x2="23" y2="9" />
          <line x1="20" y1="15" x2="23" y2="15" />
          <line x1="1" y1="9" x2="4" y2="9" />
          <line x1="1" y1="15" x2="4" y2="15" />
        </svg>
      );

    case "05": // Model Inference
      return (
        <svg {...iconProps}>
          <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
          <path d="M12 12L2.1 12a10 10 0 0 0 17.8 5.4l-7.9-5.4z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );

    case "06": // ABSA Extraction
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" fill={color} />
        </svg>
      );

    case "07": // MongoDB Atlas
      return (
        <svg {...iconProps}>
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
      );

    case "08": // Visual Insights
      return (
        <svg {...iconProps}>
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
          <line x1="2" y1="20" x2="22" y2="20" />
        </svg>
      );

    default:
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
  }
};

/**
 * AudienceIcon Component
 * Monochromatic SVG icons for target audience profiles.
 */
export const AudienceIcon = ({ type, size = 24, color = "currentColor", className = "" }) => {
  const iconProps = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
  };

  switch (type) {
    case "shopper":
      return (
        <svg {...iconProps}>
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      );

    case "seller":
      return (
        <svg {...iconProps}>
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      );

    case "qa":
      return (
        <svg {...iconProps}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
      );

    default:
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
  }
};

/**
 * Monochromatic Brand / Tech Icon Component
 */
export const TechIcon = ({ name, size = 16, className = "" }) => {
  const iconProps = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    style: { display: "inline-block", verticalAlign: "middle" },
  };

  switch (name) {
    case "React 18":
      return (
        <svg {...iconProps}>
          <ellipse cx="12" cy="12" rx="9" ry="4.5" transform="rotate(30 12 12)" />
          <ellipse cx="12" cy="12" rx="9" ry="4.5" transform="rotate(90 12 12)" />
          <ellipse cx="12" cy="12" rx="9" ry="4.5" transform="rotate(150 12 12)" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </svg>
      );

    case "Plotly.js":
      return (
        <svg {...iconProps}>
          <rect x="3" y="12" width="4" height="8" rx="1" />
          <rect x="10" y="7" width="4" height="13" rx="1" />
          <rect x="17" y="3" width="4" height="17" rx="1" />
        </svg>
      );

    case "FastAPI":
      return (
        <svg {...iconProps}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );

    case "Uvicorn":
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="10" />
          <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
        </svg>
      );

    case "MongoDB Atlas":
      return (
        <svg {...iconProps}>
          <path d="M12 2C9 7 4 10 4 15a8 8 0 0 0 16 0c0-5-5-8-8-13z" />
          <line x1="12" y1="2" x2="12" y2="22" strokeWidth="1.5" />
        </svg>
      );

    case "scikit-learn":
      return (
        <svg {...iconProps}>
          <circle cx="6" cy="6" r="3" />
          <circle cx="18" cy="6" r="3" />
          <circle cx="12" cy="18" r="3" />
          <line x1="8.5" y1="7.5" x2="15.5" y2="7.5" />
          <line x1="7.5" y1="8.5" x2="10.5" y2="15.5" />
          <line x1="16.5" y1="8.5" x2="13.5" y2="15.5" />
        </svg>
      );

    case "PyTorch":
      return (
        <svg {...iconProps}>
          <path d="M14 4.5 17.5 8 14 11.5" />
          <path d="M16 8H7a4 4 0 0 0-4 4v5" />
          <circle cx="17.5" cy="8" r="1.5" fill="currentColor" />
        </svg>
      );

    case "Hugging Face":
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="10" />
          <circle cx="9" cy="9" r="1" fill="currentColor" />
          <circle cx="15" cy="9" r="1" fill="currentColor" />
          <path d="M8 15s1.5 2 4 2 4-2 4-2" />
        </svg>
      );

    case "NLTK":
      return (
        <svg {...iconProps}>
          <path d="M4 19V5l12 14V5" />
          <circle cx="19" cy="19" r="1" fill="currentColor" />
        </svg>
      );

    case "spaCy":
      return (
        <svg {...iconProps}>
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
          <path d="M12 6v6l4 2" />
        </svg>
      );

    default:
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
  }
};

/**
 * Utility Monochromatic Status & UI Icons
 */
export const StatusIcon = ({ type, size = 16, color = "currentColor", className = "" }) => {
  const iconProps = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    style: { display: "inline-block", verticalAlign: "middle" },
  };

  switch (type) {
    case "warning":
      return (
        <svg {...iconProps}>
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );

    case "check":
      return (
        <svg {...iconProps} strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );

    case "search":
      return (
        <svg {...iconProps}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );

    case "folder":
      return (
        <svg {...iconProps}>
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      );

    case "chart":
      return (
        <svg {...iconProps}>
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      );

    case "target":
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" fill={color} />
        </svg>
      );

    case "bot":
      return (
        <svg {...iconProps}>
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <circle cx="8.5" cy="16" r="1.5" fill={color} />
          <circle cx="15.5" cy="16" r="1.5" fill={color} />
          <path d="M12 2v7" />
          <circle cx="12" cy="2" r="1" fill={color} />
        </svg>
      );

    case "star":
      return (
        <svg {...iconProps}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );

    case "trophy":
      return (
        <svg {...iconProps}>
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.45 1-1 1H7v3h10v-3h-2c-.55 0-1-.45-1-1v-2.34" />
          <path d="M18 4H6v7a6 6 0 0 0 12 0V4z" />
        </svg>
      );

    default:
      return null;
  }
};
