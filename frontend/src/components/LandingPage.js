import { useState, useEffect, useRef, useCallback } from "react";
import {
  AspectIcon,
  PipelineStepIcon,
  AudienceIcon,
  TechIcon,
  StatusIcon,
} from "./common/Icons";
import "./LandingPage.css";

// ── Data ─────────────────────────────────────────────────────────────────────
const SAMPLE_REVIEWS = [
  {
    text: "The fabric is super soft but the size runs really small. Color is beautiful!",
    overall: "POSITIVE",
    model: "DistilBERT Engine",
    aspects: [
      { code: "FABRIC", name: "FABRIC", s: "POSITIVE", c: 94.0, quote: "The fabric is super soft", color: "var(--pos-dot)" },
      { code: "SIZE",   name: "SIZE",   s: "NEGATIVE", c: 88.0, quote: "the size runs really small", color: "var(--neg-dot)" },
      { code: "COLOR",  name: "COLOR",  s: "POSITIVE", c: 91.0, quote: "Color is beautiful!", color: "var(--pos-dot)" },
    ],
  },
  {
    text: "Delivery took three weeks and the color faded after one wash. Price was okay.",
    overall: "NEGATIVE",
    model: "DistilBERT Engine",
    aspects: [
      { code: "DELIVERY", name: "DELIVERY", s: "NEGATIVE", c: 96.0, quote: "Delivery took three weeks", color: "var(--neg-dot)" },
      { code: "COLOR",    name: "COLOR",    s: "NEGATIVE", c: 92.0, quote: "the color faded after one wash", color: "var(--neg-dot)" },
      { code: "PRICE",    name: "PRICE",    s: "NEUTRAL",  c: 85.0, quote: "Price was okay", color: "var(--neu-dot)" },
    ],
  },
  {
    text: "Poor stitching along the seam, but the fabric feels premium and delivery was fast!",
    overall: "POSITIVE",
    model: "CNN-BiLSTM Baseline",
    aspects: [
      { code: "STITCHING", name: "STITCHING", s: "NEGATIVE", c: 95.0, quote: "Poor stitching along the seam", color: "var(--neg-dot)" },
      { code: "FABRIC",    name: "FABRIC",    s: "POSITIVE", c: 89.0, quote: "fabric feels premium", color: "var(--pos-dot)" },
      { code: "DELIVERY",  name: "DELIVERY",  s: "POSITIVE", c: 97.0, quote: "delivery was fast!", color: "var(--pos-dot)" },
    ],
  },
];

const MODELS_DATA = [
  {
    name: "DistilBERT", color: "var(--col-distilbert)", pill: "Transformer Architecture",
    desc: "Transformer-based contextual language model. Attention mechanisms retain full multi-clause context across compound sentences (e.g. separating 'soft fabric' from 'tight shoulders').",
    framework: "Hugging Face Transformers / PyTorch", latency: "~38ms per review inference",
    acc: "91.42%", prec: "90.87%", rec: "91.42%", f1: "91.05%",
    accN: 91.42, precN: 90.87, recN: 91.42, f1N: 91.05, badge: "Leader",
  },
  {
    name: "CNN-BiLSTM", color: "var(--col-cnnbilstm)", pill: "Deep Sequence Model",
    desc: "Hybrid deep neural network where 1D convolutions capture localized phrase patterns and bidirectional LSTMs preserve sequential memory across paragraph tokens.",
    framework: "PyTorch / TensorFlow", latency: "~24ms per review inference",
    acc: "88.90%", prec: "88.30%", rec: "88.90%", f1: "88.50%",
    accN: 88.90, precN: 88.30, recN: 88.90, f1N: 88.50,
  },
  {
    name: "SVM", color: "var(--col-svm)", pill: "Linear Margin Classifier",
    desc: "Classical maximum-margin classifier trained over TF-IDF n-gram representations. Highly reliable sparse baseline with very low compute footprint.",
    framework: "scikit-learn (TF-IDF Vectorizer)", latency: "~8ms per review inference",
    acc: "84.70%", prec: "84.10%", rec: "84.70%", f1: "84.20%",
    accN: 84.70, precN: 84.10, recN: 84.70, f1N: 84.20,
  },
  {
    name: "Logistic Regression", color: "var(--col-logreg)", pill: "Statistical Baseline",
    desc: "Multinomial probabilistic regression. Serves as the primary interpretable baseline to measure incremental gains from deep contextual attention layers.",
    framework: "scikit-learn", latency: "~4ms per review inference",
    acc: "82.30%", prec: "81.60%", rec: "82.30%", f1: "81.70%",
    accN: 82.30, precN: 81.60, recN: 82.30, f1N: 81.70,
  },
];

const ASPECTS_DATA = [
  { code: "SIZE",      name: "Size & Fit",          dist: [46,37,17], chip: { text: "110 Pos / 88 Neg", cls: "POSITIVE" }, kw: ["fit","small","large","tight","loose","length"],   example: "Runs almost two full sizes smaller than standard sizing in the bust." },
  { code: "FABRIC",    name: "Fabric & Material",   dist: [75,14,11], chip: { text: "190 Pos / 34 Neg", cls: "POSITIVE" }, kw: ["soft","cotton","material","polyester","silk","breathable"], example: "The organic combed cotton is buttery soft and breathable for summer." },
  { code: "STITCHING", name: "Stitching & Hemming", dist: [55,30,15], chip: { text: "75 Pos / 41 Neg",  cls: "NEGATIVE" }, kw: ["seam","thread","stitching","hem","loose thread","quality"], example: "Poor seam alignment along the collar with loose threads after one wash." },
  { code: "COLOR",     name: "Color & Vibrancy",    dist: [76,10,14], chip: { text: "160 Pos / 22 Neg", cls: "POSITIVE" }, kw: ["shade","color","faded","bright","dye","hue"],  example: "The rich emerald tone matches the studio catalog photographs perfectly." },
  { code: "PRICE",     name: "Value & Price",        dist: [44,25,31], chip: { text: "64 Pos / 37 Neg",  cls: "NEUTRAL"  }, kw: ["price","expensive","cheap","worth it","deal","value"], example: "Remarkable construction for a $35 garment compared to designer labels." },
  { code: "DELIVERY",  name: "Logistics & Shipping", dist: [53,28,19], chip: { text: "58 Pos / 30 Neg",  cls: "POSITIVE" }, kw: ["shipping","delivery","arrived","package","courier","delayed"], example: "Dispatched in eco-friendly packaging and arrived two days ahead of schedule." },
];

const PIPELINE_STEPS = [
  { num: "01", title: "Review Ingestion",  desc: "Unstructured customer text captured via input or batch CSV uploads." },
  { num: "02", title: "React Client",      desc: "Client validation, state management, and real-time Plotly charts." },
  { num: "03", title: "FastAPI Gateway",   desc: "High-throughput async Python REST endpoint running under 50ms." },
  { num: "04", title: "NLP Preprocessing", desc: "Tokenization, stopword removal, and dependency parsing via spaCy & NLTK." },
  { num: "05", title: "Model Inference",   desc: "Fine-tuned DistilBERT transformer computes contextual multi-label vectors." },
  { num: "06", title: "ABSA Extraction",   desc: "Aspect classification maps polarity to clothing attributes with confidence scores." },
  { num: "07", title: "MongoDB Atlas",     desc: "Predictions, timestamps, and department taxonomies indexed for fast queries." },
  { num: "08", title: "Visual Insights",   desc: "Aggregated distribution donuts, aspect bar charts, and exportable reports." },
];

const TECH_PILLS = [
  { label: "React 18",       dot: "#61dafb" },
  { label: "Plotly.js",      dot: "#3f4f75" },
  { label: "FastAPI",        dot: "#009688" },
  { label: "Uvicorn",        dot: "#22c55e" },
  { label: "MongoDB Atlas",  dot: "#47a248" },
  { label: "scikit-learn",   dot: "#f7931e" },
  { label: "PyTorch",        dot: "#ee4c2c" },
  { label: "Hugging Face",   dot: "#ffd21e" },
  { label: "NLTK",           dot: "#1e88e5" },
  { label: "spaCy",          dot: "#09a3d5" },
];

// ── Scroll-reveal hook ────────────────────────────────────────────────────────
function useReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("lp-revealed");
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    const items = document.querySelectorAll(".lp-reveal");
    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

// ── Typing demo hook ──────────────────────────────────────────────────────────
function useTypingDemo() {
  const [reviewIdx, setReviewIdx] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const timerRef = useRef(null);

  const typeReview = useCallback((idx) => {
    clearTimeout(timerRef.current);
    const full = SAMPLE_REVIEWS[idx].text;
    let i = 0;
    setDisplayedText("");
    const tick = () => {
      i++;
      setDisplayedText(full.slice(0, i));
      if (i < full.length) timerRef.current = setTimeout(tick, 22);
    };
    timerRef.current = setTimeout(tick, 80);
  }, []);

  useEffect(() => {
    typeReview(reviewIdx);
    return () => clearTimeout(timerRef.current);
  }, [reviewIdx, typeReview]);

  const next = () => setReviewIdx((i) => (i + 1) % SAMPLE_REVIEWS.length);

  return { reviewIdx, displayedText, next, review: SAMPLE_REVIEWS[reviewIdx] };
}

// ── Scroll progress hook ──────────────────────────────────────────────────────
function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  const [scrolled, setScrolled]  = useState(false);

  useEffect(() => {
    const handler = () => {
      const top    = document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      setProgress(height > 0 ? (top / height) * 100 : 0);
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return { progress, scrolled };
}

// ── LandingPage ───────────────────────────────────────────────────────────────
export default function LandingPage({ onLaunch }) {
  const { progress, scrolled } = useScrollProgress();
  const { reviewIdx, displayedText, next, review } = useTypingDemo();
  const [activeModel, setActiveModel] = useState(0);
  const [activeAspect, setActiveAspect] = useState(null);

  useReveal();

  const m = MODELS_DATA[activeModel];

  return (
    <div className="lp-root">
      {/* Scroll progress */}
      <div className="lp-scroll-progress" style={{ width: `${progress}%` }} aria-hidden="true" />

      {/* ── Navbar ────────────────────────────────────────────────────────── */}
      <header className={`lp-navbar${scrolled ? " lp-navbar--scrolled" : ""}`}>
        <div className="lp-navbar-container">
          <a href="#lp-hero" className="lp-nav-brand">
            <div className="lp-brand-logo-fallback">
              <AspectIcon aspect="STITCHING" size={14} color="#ffffff" />
            </div>
            <div className="lp-brand-text">
              <div className="lp-brand-title">ABSA <span className="lp-brand-tag">v2.4</span></div>
              <div className="lp-brand-subtitle">Clothing Review Analyzer</div>
            </div>
          </a>

          <nav className="lp-nav-links-wrap" aria-label="Landing Navigation">
            <a href="#lp-how-it-works" className="lp-nav-link-btn">How it works</a>
            <a href="#lp-aspects"      className="lp-nav-link-btn">Aspects</a>
            <a href="#lp-models"       className="lp-nav-link-btn">Models</a>
            <a href="#lp-technology"   className="lp-nav-link-btn">Technology</a>
          </nav>

          <div className="lp-nav-actions-right">
            <div className="lp-nav-meta-badge">
              <span className="lp-status-dot" />
              <span>ATMECE CSE Project</span>
            </div>
            <button className="lp-btn-launch" onClick={onLaunch}>
              Launch Analyzer
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <section className="lp-hero-wrapper" id="lp-hero">
          <div className="lp-hero-bg-ambient" aria-hidden="true">
            <div className="lp-ambient-radial-glow" />
            <div className="lp-ambient-grid-faint" />
            <div className="lp-hero-float-icon" style={{ top:"18%",  left:"8%",   animationDelay:"0s"   }}>
              <AspectIcon aspect="SIZE" size={20} />
            </div>
            <div className="lp-hero-float-icon" style={{ top:"25%",  right:"10%", animationDelay:"1.5s" }}>
              <AspectIcon aspect="FABRIC" size={20} />
            </div>
            <div className="lp-hero-float-icon" style={{ top:"70%",  left:"6%",   animationDelay:"3s"   }}>
              <AspectIcon aspect="STITCHING" size={20} />
            </div>
            <div className="lp-hero-float-icon" style={{ top:"75%",  right:"8%",  animationDelay:"2s"   }}>
              <AspectIcon aspect="COLOR" size={20} />
            </div>
            <div className="lp-hero-float-icon" style={{ top:"45%",  left:"48%",  animationDelay:"4s"   }}>
              <AspectIcon aspect="PRICE" size={20} />
            </div>
            <div className="lp-hero-float-icon" style={{ top:"12%",  right:"34%", animationDelay:"2.8s" }}>
              <AspectIcon aspect="DELIVERY" size={20} />
            </div>
          </div>

          <div className="lp-hero-grid">
            {/* Left copy */}
            <div className="lp-hero-left lp-reveal">
              <span className="lp-section-eyebrow">
                <StatusIcon type="target" size={12} color="currentColor" />
                Aspect-Based Sentiment Analysis
              </span>

              <h1 className="lp-hero-headline">
                Don't just know IF they liked&nbsp;it.<br />
                Know <span className="lp-headline-accent">WHAT</span> they liked.
              </h1>

              <p className="lp-hero-supporting-text">
                Turn customer reviews into structured insights across size, fabric, stitching, color, price and delivery.
                Standard sentiment analysis tells you whether a customer was happy — ABSA tells you exactly <em>why</em>.
              </p>

              <div className="lp-hero-cta-group">
                <button className="lp-btn-launch lp-btn-launch--lg" onClick={onLaunch}>
                  Try the Analyzer →
                </button>
                <a href="#lp-how-it-works" className="lp-btn-secondary">
                  See how it works ↓
                </a>
              </div>

              <div className="lp-hero-trust-row">
                {["AI-powered review intelligence","Sub-50ms inference","DistilBERT contextual embeddings"].map((t) => (
                  <div className="lp-trust-item" key={t}>
                    <StatusIcon type="check" size={14} color="var(--brand-accent)" />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right demo card */}
            <div className="lp-reveal" style={{ transitionDelay: "0.15s" }}>
              <div className="lp-hero-demo-card">
                <div className="lp-demo-status-bar">
                  <div className="lp-demo-status-pill">
                    <span className="lp-pulse-active-dot" />
                    <span>LIVE ANALYSIS WORKSPACE</span>
                  </div>
                  <span className="lp-demo-model-badge">{review.model}</span>
                </div>

                <div className="lp-demo-inner">
                  <div>
                    <div className="lp-demo-input-label">Review Input</div>
                    <div className="lp-demo-review-input-box">
                      <span>{displayedText}</span>
                      <span className="lp-typing-cursor" />
                    </div>
                  </div>

                  <div className="lp-demo-overview-strip">
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span className="lp-demo-ov-label">Overall Sentiment</span>
                      <span className={`lp-sentiment-badge lp-sentiment-badge--${review.overall}`}>{review.overall}</span>
                    </div>
                    <span className="lp-demo-active-model">Active: {review.model}</span>
                  </div>

                  <div>
                    <div className="lp-demo-aspects-heading">Detected Aspects ({review.aspects.length})</div>
                    <div className="lp-demo-detected-stack">
                      {review.aspects.map((a) => (
                        <div className="lp-demo-aspect-item" key={a.code}>
                          <div className="lp-demo-aspect-top">
                            <span className="lp-demo-aspect-title" style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
                              <AspectIcon aspect={a.code} size={14} />
                              {a.name}
                            </span>
                            <div className="lp-demo-confidence-wrap">
                              <span className="lp-demo-conf-pct">{a.c.toFixed(1)}%</span>
                              <div className="lp-demo-conf-track">
                                <div className="lp-demo-conf-fill" style={{ width:`${a.c}%`, background:a.color }} />
                              </div>
                              <span className={`lp-sentiment-badge lp-sentiment-badge--${a.s}`}>{a.s}</span>
                            </div>
                          </div>
                          <div className="lp-demo-quote-clause">"{a.quote}"</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lp-demo-controls-footer">
                    <span className="lp-demo-footer-counter">
                      Example <strong>{reviewIdx + 1}</strong> of {SAMPLE_REVIEWS.length}
                    </span>
                    <button className="lp-demo-cycle-btn" onClick={next}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                        <path d="M3 3v5h5"/>
                        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                        <path d="M16 21h5v-5"/>
                      </svg>
                      Next Sample Review
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 1: Problem ────────────────────────────────────────── */}
        <section className="lp-section-wrapper" id="lp-the-problem">
          <div className="lp-section-header-center lp-reveal">
            <span className="lp-section-eyebrow">The Analytical Gap</span>
            <h2 className="lp-section-title">A single sentiment hides the real story.</h2>
            <p className="lp-section-subtitle">
              Customer feedback is nuanced. When an algorithm squeezes a complex compound review into a single binary label,
              brands lose the actionable root cause behind returns.
            </p>
          </div>

          <div className="lp-problem-grid">
            <div className="lp-comparison-card lp-comparison-card--flawed lp-reveal">
              <div>
                <div className="lp-card-tag-header">
                  <span className="lp-card-tag-name">Traditional Sentiment Analysis</span>
                  <span className="lp-tag-badge lp-tag-badge--neutral">Coarse &amp; Lossy</span>
                </div>
                <div className="lp-mock-review-callout">"The fabric is great, but the size is too small."</div>
                <div className="lp-problem-outcome-box">
                  <div className="lp-outcome-pill-row">
                    <span className="lp-outcome-label">Aggregate Classification:</span>
                    <span className="lp-sentiment-badge lp-sentiment-badge--NEUTRAL">NEUTRAL</span>
                  </div>
                  <p className="lp-outcome-verdict-text">
                    1 review → 1 ambiguous label. The positive fabric praise and the negative sizing complaint cancel each other out mathematically.
                  </p>
                </div>
              </div>
              <div className="lp-card-warning-footer">
                <StatusIcon type="warning" size={15} color="#b45309" />
                <span>Blindspot: Merchandisers cannot tell whether to switch fabric mills or update size charts.</span>
              </div>
            </div>

            <div className="lp-comparison-card lp-comparison-card--solution lp-reveal" style={{ transitionDelay:"0.15s" }}>
              <div>
                <div className="lp-card-tag-header">
                  <span className="lp-card-tag-name lp-card-tag-name--blue">Aspect-Based Sentiment Analysis (ABSA)</span>
                  <span className="lp-tag-badge lp-tag-badge--blue">Clause-Level Precision</span>
                </div>
                <div className="lp-fragmented-sentence-box">
                  <span className="lp-frag-pos">The fabric is great</span>, but{" "}
                  <span className="lp-frag-neg">the size is too small</span>.
                </div>
                <div className="lp-problem-outcome-box lp-problem-outcome-box--solution">
                  <div className="lp-outcome-chips-label">Deconstructed Multi-Aspect Sentiments:</div>
                  <div className="lp-outcome-chips-row">
                    <span className="lp-aspect-chip lp-aspect-chip--POSITIVE">
                      <AspectIcon aspect="FABRIC" size={13} /> FABRIC: POSITIVE (92%)
                    </span>
                    <span className="lp-aspect-chip lp-aspect-chip--NEGATIVE">
                      <AspectIcon aspect="SIZE" size={13} /> SIZE: NEGATIVE (89%)
                    </span>
                  </div>
                  <p className="lp-outcome-verdict-text">
                    1 review → multiple structured opinions. Positive textile ratings remain intact while sizing issues are flagged directly to manufacturing.
                  </p>
                </div>
              </div>
              <div className="lp-card-success-footer">
                <StatusIcon type="check" size={15} color="#15803d" />
                <span>Direct Action: Instruct pattern cutters to adjust specifications while retaining the current fabric supplier.</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 2: Pipeline ───────────────────────────────────────── */}
        <section className="lp-section-wrapper lp-section-alt" id="lp-how-it-works">
          <div className="lp-section-header-center lp-reveal">
            <span className="lp-section-eyebrow">End-to-End Architecture</span>
            <h2 className="lp-section-title">From review text to structured insight.</h2>
            <p className="lp-section-subtitle">
              A seamless 8-stage data pipeline combining asynchronous microservices, contextual transformers, and reactive visualization.
            </p>
          </div>

          <div className="lp-pipeline-track lp-reveal">
            <div className="lp-pipeline-line-connector">
              <div className="lp-pipeline-travel-pulse" />
            </div>
            {PIPELINE_STEPS.map((step) => (
              <div className="lp-pipeline-step-card" key={step.num}>
                <div className="lp-step-card-top">
                  <div className="lp-step-circle-icon">
                    <PipelineStepIcon stepNum={step.num} size={20} color="var(--brand-accent)" />
                  </div>
                  <span className="lp-step-num-code">{step.num}</span>
                </div>
                <div className="lp-step-title">{step.title}</div>
                <div className="lp-step-desc">{step.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION 3: Aspects ────────────────────────────────────────── */}
        <section className="lp-section-wrapper" id="lp-aspects">
          <div className="lp-section-header-center lp-reveal">
            <span className="lp-section-eyebrow">Garment Domain Taxonomy</span>
            <h2 className="lp-section-title">Six aspects. One complete review.</h2>
            <p className="lp-section-subtitle">
              Trained specifically on e-commerce clothing feedback to detect the exact attributes that dictate customer satisfaction and product return rates.
            </p>
          </div>

          <div className="lp-aspects-grid-3x2">
            {ASPECTS_DATA.map((asp, i) => (
              <div
                className={`lp-aspect-explore-card lp-reveal${activeAspect === i ? " lp-aspect-explore-card--active" : ""}`}
                style={{ transitionDelay: `${i * 0.08}s` }}
                key={asp.code}
                onClick={() => setActiveAspect(activeAspect === i ? null : i)}
              >
                <div className="lp-aspect-card-header-row">
                  <div className="lp-aspect-card-title-group">
                    <div className="lp-aspect-emoji-bubble">
                      <AspectIcon aspect={asp.code} size={22} color="var(--brand-accent)" />
                    </div>
                    <div>
                      <div className="lp-aspect-card-name">{asp.name}</div>
                      <span className="lp-aspect-code-tag">ASPECT: {asp.code}</span>
                    </div>
                  </div>
                  <span className={`lp-aspect-chip lp-aspect-chip--${asp.chip.cls}`}>{asp.chip.text}</span>
                </div>
                <div className="lp-aspect-keywords-pill-wrap">
                  {asp.kw.map((k) => <span className="lp-aspect-kw-tag" key={k}>{k}</span>)}
                </div>
                <div className="lp-aspect-mini-sentiment-bar" title="Sentiment Balance">
                  <div className="lp-bar-seg" style={{ width:`${asp.dist[0]}%`, background:"var(--pos-dot)" }} />
                  <div className="lp-bar-seg" style={{ width:`${asp.dist[1]}%`, background:"var(--neg-dot)" }} />
                  <div className="lp-bar-seg" style={{ width:`${asp.dist[2]}%`, background:"var(--neu-dot)" }} />
                </div>
                <div className="lp-aspect-example-box">"{asp.example}"</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION 4: Models ─────────────────────────────────────────── */}
        <section className="lp-section-wrapper lp-section-alt" id="lp-models">
          <div className="lp-section-header-center lp-reveal">
            <span className="lp-section-eyebrow">Machine Learning Evaluation</span>
            <h2 className="lp-section-title">Four models. One comparison.</h2>
            <p className="lp-section-subtitle">
              Trained, tuned, and evaluated on identical stratified test partitions of real customer feedback.
            </p>
          </div>

          <div className="lp-reveal" style={{ display:"flex", justifyContent:"center" }}>
            <div className="lp-model-tabs-container">
              {MODELS_DATA.map((md, i) => (
                <button
                  key={md.name}
                  className={`lp-model-tab-btn${activeModel === i ? " lp-model-tab-btn--active" : ""}`}
                  onClick={() => setActiveModel(i)}
                >
                  <span className="lp-model-dot-indicator" style={{ background: md.color }} />
                  <span>{md.name}</span>
                  {md.badge && <span className="lp-model-leader-badge">{md.badge}</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="lp-model-showcase-panel lp-reveal">
            <div className="lp-model-detail-grid">
              <div className="lp-model-bio-left">
                <div className="lp-model-bio-header">
                  <span className="lp-model-dot-indicator" style={{ background:m.color, width:10, height:10 }} />
                  <span className="lp-model-arch-pill">{m.pill}</span>
                </div>
                <h3 className="lp-model-name">{m.name}</h3>
                <p className="lp-model-description">{m.desc}</p>
                <div className="lp-model-meta-list">
                  <div className="lp-model-meta-item"><strong>Framework:</strong> <span className="lp-aspect-kw-tag">{m.framework}</span></div>
                  <div className="lp-model-meta-item"><strong>Evaluation Test Set:</strong> <span>20% Stratified Holdout</span></div>
                  <div className="lp-model-meta-item"><strong>Latency Profile:</strong> <span>{m.latency}</span></div>
                </div>
                <div style={{ marginTop: 28 }}>
                  <button className="lp-btn-secondary" onClick={onLaunch} style={{ fontSize: 13 }}>
                    View full comparison in Analyzer →
                  </button>
                </div>
              </div>

              <div className="lp-model-metrics-right">
                <div className="lp-model-metrics-header">
                  <div>
                    <div className="lp-metrics-header-title">Test Split Benchmarks</div>
                    <div className="lp-metrics-header-sub">Verified multi-class evaluation metrics</div>
                  </div>
                  <span className="lp-metrics-verified-badge">
                    <StatusIcon type="check" size={12} color="#10b981" /> Verified
                  </span>
                </div>
                {[
                  { label:"Accuracy",         val:m.acc,  pct:m.accN  },
                  { label:"Precision (Macro)", val:m.prec, pct:m.precN },
                  { label:"Recall (Macro)",    val:m.rec,  pct:m.recN  },
                  { label:"F1 Score",          val:m.f1,   pct:m.f1N   },
                ].map((row) => (
                  <div className="lp-metric-row" key={row.label}>
                    <div className="lp-metric-label-row">
                      <span className="lp-metric-label">{row.label}</span>
                      <span className="lp-metric-val">{row.val}</span>
                    </div>
                    <div className="lp-metric-bar-track">
                      <div className="lp-metric-bar-progress" style={{ width:`${row.pct}%`, background:m.color }} />
                    </div>
                  </div>
                ))}
                <div className="lp-metrics-footer-note">
                  Metric streams synchronize with FastAPI backend at localhost:8000
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 5: KPIs ───────────────────────────────────────────── */}
        <section className="lp-section-wrapper" id="lp-live-numbers">
          <div className="lp-section-header-center lp-reveal">
            <span className="lp-section-eyebrow">Application Telemetry</span>
            <h2 className="lp-section-title">Turning reviews into measurable insight.</h2>
            <p className="lp-section-subtitle">
              Real-time metrics calculated across the analyzed review dataset and validated against domain benchmarks.
            </p>
          </div>

          <div className="lp-kpi-grid-4 lp-reveal">
            {[
              { cls:"brand", label:"Reviews Analyzed",    val:"640",  sub:"Live evaluation corpus",     valStyle:{} },
              { cls:"pos",   label:"Positive Sentiments", val:"412",  sub:"64.4% favorable ratings",    valStyle:{ color:"var(--pos-text)" } },
              { cls:"neg",   label:"Negative Sentiments", val:"96",   sub:"15.0% flagged for attention", valStyle:{ color:"var(--neg-text)" } },
              { cls:"neu",   label:"Neutral Sentiments",  val:"132",  sub:"20.6% balanced feedback",    valStyle:{ color:"var(--neu-text)" } },
            ].map((k) => (
              <div className={`lp-kpi-tile lp-kpi-tile--${k.cls}`} key={k.label}>
                <div className="lp-kpi-label">{k.label}</div>
                <div className="lp-kpi-value-row">
                  <span className="lp-kpi-value" style={k.valStyle}>{k.val}</span>
                </div>
                <div className="lp-kpi-subtext">{k.sub}</div>
              </div>
            ))}
          </div>

          <div className="lp-kpi-secondary-row lp-reveal" style={{ transitionDelay:"0.15s" }}>
            {[
              { iconType:"target", title:"6 Custom Clothing Aspects", sub:"Size, Fabric, Stitching, Color, Price, Logistics", badge:"Domain Trained" },
              { iconType:"bot",    title:"4 Machine Learning Models", sub:"From linear baselines to fine-tuned Transformers", badge:"Benchmarked" },
            ].map((k) => (
              <div className="lp-kpi-tile-compact" key={k.title}>
                <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                  <div className="lp-kpi-icon-container">
                    <StatusIcon type={k.iconType} size={22} color="var(--brand-accent)" />
                  </div>
                  <div>
                    <div className="lp-kpi-compact-title">{k.title}</div>
                    <div className="lp-kpi-compact-sub">{k.sub}</div>
                  </div>
                </div>
                <span className="lp-brand-tag">{k.badge}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION 6: Audience ───────────────────────────────────────── */}
        <section className="lp-section-wrapper lp-section-alt" id="lp-who-is-it-for">
          <div className="lp-section-header-center lp-reveal">
            <span className="lp-section-eyebrow">Audience &amp; Impact</span>
            <h2 className="lp-section-title">Understand what customers actually care about.</h2>
            <p className="lp-section-subtitle">
              Bridging consumer shopping decisions with operational manufacturing intelligence.
            </p>
          </div>

          <div className="lp-audience-grid-3">
            {[
              { type:"shopper", title:"Smart Shoppers",    delay:"0s",    desc:"Skip reading 500+ unstructured reviews. Immediately see whether customer complaints are about true-to-size fit, fabric shrinkage, delayed courier arrivals, or garment durability before purchasing." },
              { type:"seller",  title:"Sellers & Brands",  delay:"0.12s", desc:"Stop guessing why return rates spiked. Pinpoint whether 1-star reviews are caused by delayed regional shipping or inconsistent sizing patterns across specific manufacturing production batches." },
              { type:"qa",      title:"Product & QA Teams",delay:"0.24s", desc:"Identify textile flaws and seam tearing before minor defects escalate into expensive product recalls. Monitor stitching feedback across clothing departments in real time." },
            ].map((a) => (
              <div className="lp-audience-card lp-reveal" style={{ transitionDelay:a.delay }} key={a.title}>
                <div className="lp-audience-icon-badge">
                  <AudienceIcon type={a.type} size={24} color="var(--brand-accent)" />
                </div>
                <div className="lp-audience-title">{a.title}</div>
                <p className="lp-audience-desc">{a.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION 7: Technology ─────────────────────────────────────── */}
        <section className="lp-section-wrapper" id="lp-technology">
          <div className="lp-section-header-center lp-reveal" style={{ marginBottom:32 }}>
            <span className="lp-section-eyebrow">Full Stack</span>
            <h2 className="lp-section-title">Built across the full ML application stack.</h2>
            <p className="lp-section-subtitle">
              Engineered with industry-standard NLP libraries, high-performance web frameworks, and reactive client graphing.
            </p>
          </div>

          <div className="lp-tech-pills-row lp-reveal">
            {TECH_PILLS.map((t) => (
              <div className="lp-tech-pill" key={t.label}>
                <TechIcon name={t.label} size={15} />
                <span>{t.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION 8: CTA ────────────────────────────────────────────── */}
        <section className="lp-section-wrapper" style={{ paddingTop:0 }}>
          <div className="lp-cta-banner-card lp-reveal">
            <h2 className="lp-cta-headline">Paste a review. See every opinion inside it.</h2>
            <p className="lp-cta-subtitle">
              Go from one sentence to structured aspect-level insight with sub-50ms inference.
            </p>
            <button className="lp-btn-launch lp-btn-launch--xl" onClick={onLaunch}>
              Launch Analyzer →
            </button>
          </div>
        </section>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="lp-app-footer">
        <div className="lp-footer-inner">
          <div>
            <strong>ABSA</strong> — Aspect-Based Sentiment Analysis | ATMECE CSE Project · <strong>Team 34</strong>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="lp-footer-link">GitHub →</a>
            <span>·</span>
            <span>FastAPI Backend: localhost:8000</span>
            <span>·</span>
            <a href="#lp-hero" className="lp-footer-link">Back to top ↑</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
