import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi.responses import StreamingResponse
import csv
import io
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import uuid
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from src.absa.absa_pipeline import (
    load_lr_model, load_distilbert_model,
    analyze_review, analyze_batch, get_aspect_summary
)
from src.database.db_operations import (
    save_analysis_result,
    get_analysis_history,
    get_sentiment_stats,
    get_aspect_stats,
    get_all_model_metrics,
    seed_model_metrics
)
from src.database.mongo_client import get_database

# ── App setup ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="ABSA API",
    description="Aspect-Based Sentiment Analysis for E-Commerce Clothing Reviews",
    version="1.0.0"
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load models on startup ───────────────────────────────────────────────────
distilbert_model = None
distilbert_tokenizer = None
distilbert_device = None
lr_model = None
lr_vectorizer = None

@app.on_event("startup")
async def load_models():
    global distilbert_model, distilbert_tokenizer, distilbert_device
    global lr_model, lr_vectorizer

    print("Loading LR model...")
    lr_model, lr_vectorizer = load_lr_model()
    print("LR model loaded! ✅")

    print("Loading DistilBERT...")
    try:
        distilbert_model, distilbert_tokenizer, distilbert_device = load_distilbert_model()
        print("DistilBERT loaded! ✅")
    except Exception as e:
        print(f"DistilBERT failed: {e} — using LR as primary ⚠️")

    # Seed model metrics if MongoDB collection is empty
    try:
        db = get_database()
        if db["model_metrics"].count_documents({}) == 0:
            seed_model_metrics()
            print("Model metrics seeded to MongoDB ✅")
    except Exception as e:
        print(f"MongoDB seed skipped: {e} ⚠️")


# ── Request/Response schemas ─────────────────────────────────────────────────
class ReviewRequest(BaseModel):
    review: str
    department: Optional[str] = None     

class BatchRequest(BaseModel):
    reviews: List[str]
    department: Optional[str] = None  


# ── Endpoints ────────────────────────────────────────────────────────────────
@app.get("/health")
def health_check():
    try:
        db = get_database()
        db.command("ping")
        mongo_status = "connected"
    except Exception:
        mongo_status = "disconnected"

    return {
        "status": "ok",
        "distilbert_loaded": distilbert_model is not None,
        "lr_loaded": lr_model is not None,
        "mongodb": mongo_status
    }


@app.post("/analyze")
def analyze_single(request: ReviewRequest):
    if not request.review.strip():
        raise HTTPException(status_code=400, detail="Review text cannot be empty")

    try:
        result = analyze_review(
            request.review,
            distilbert=distilbert_model,
            tokenizer=distilbert_tokenizer,
            device=distilbert_device,
            lr_model=lr_model,
            vectorizer=lr_vectorizer
        )
        try:
            doc_id = save_analysis_result(
                review_text=request.review,
                overall_sentiment=result.get("overall_sentiment", "NEUTRAL"),
                aspects=result.get("aspect_sentiments", {}),
                model_used=result.get("model_used", "hybrid"),
                is_batch=False,
                department=request.department        # ← NEW
            )
            result["mongo_id"] = doc_id
        except Exception as e:
            logger.warning(f"MongoDB save failed (non-critical): {e}")

        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze-batch")
def analyze_batch_reviews(request: BatchRequest):
    if not request.reviews:
        raise HTTPException(status_code=400, detail="Reviews list cannot be empty")
    if len(request.reviews) > 30000:
        raise HTTPException(status_code=400, detail="Max 30,000 reviews per batch")

    try:
        results = analyze_batch(
            request.reviews,
            distilbert=distilbert_model,
            tokenizer=distilbert_tokenizer,
            device=distilbert_device,
            lr_model=lr_model,
            vectorizer=lr_vectorizer
        )
        summary = get_aspect_summary(results)

        for r in results:
            aspects = r.get("aspect_sentiments", {})
            if aspects:
                sentiments = [v["sentiment"] for v in aspects.values()]
                pos = sentiments.count("POSITIVE")
                neg = sentiments.count("NEGATIVE")
                if pos > neg:
                    r["overall_sentiment"] = "POSITIVE"
                elif neg > pos:
                    r["overall_sentiment"] = "NEGATIVE"
                else:
                    r["overall_sentiment"] = "NEUTRAL"
            else:
                r["overall_sentiment"] = "NEUTRAL"

        batch_id = str(uuid.uuid4())
        for i, (review_text, result) in enumerate(zip(request.reviews, results)):
            try:
                save_analysis_result(
                    review_text=review_text,
                    overall_sentiment=result.get("overall_sentiment", "NEUTRAL"),
                    aspects=result.get("aspect_sentiments", {}),
                    model_used=result.get("model_used", "hybrid"),
                    is_batch=True,
                    batch_id=batch_id,
                    department=request.department    # ← NEW
                )
            except Exception as e:
                logger.warning(f"MongoDB save failed for review {i}: {e}")

        return {
            "success": True,
            "total_reviews": len(results),
            "batch_id": batch_id,
            "data": results,
            "summary": summary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── NEW: History & Stats Endpoints ───────────────────────────────────────────
@app.get("/results/history")
def get_history(limit: int = 50):
    """Fetch recent analysis results from MongoDB."""
    try:
        history = get_analysis_history(limit=limit)
        return {"count": len(history), "results": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/results/stats")
def get_stats(department: str = None):
    """Sentiment distribution + aspect stats, optionally filtered by department."""
    try:
        sentiment_stats = get_sentiment_stats(department=department)
        aspect_stats = get_aspect_stats(department=department)
        return {
            "sentiment_distribution": sentiment_stats,
            "aspect_sentiment": aspect_stats,
            "filtered_by": department or "ALL"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/results/export-csv")
def export_csv(department: str = None, sentiment: str = None):
    """
    Stream all analysis results as a downloadable CSV file.
    Optionally filter by department and/or overall_sentiment.
    """
    try:
        db = get_database()

        # Build filter query
        query = {}
        if department and department != "ALL":
            query["department"] = department
        if sentiment and sentiment != "ALL":
            query["overall_sentiment"] = sentiment

        docs = list(db["analysis_results"].find(query, {
            "_id": 1, "review_text": 1, "overall_sentiment": 1,
            "aspects": 1, "model_used": 1, "department": 1,
            "is_batch": 1, "analyzed_at": 1
        }))

        ASPECTS = ["SIZE", "FABRIC", "STITCHING", "COLOR", "PRICE", "DELIVERY"]

        def generate():
            output = io.StringIO()
            writer = csv.writer(output)

            # Header row
            writer.writerow([
                "ID", "Review", "Overall Sentiment", "Department",
                "Type",
                *[f"{a} Sentiment"   for a in ASPECTS],
                *[f"{A} Confidence"  for A in ASPECTS],
                "Model Used", "Analyzed At"
            ])
            yield output.getvalue()
            output.truncate(0)
            output.seek(0)

            # Data rows
            for doc in docs:
                aspects = doc.get("aspects", {})
                aspect_sentiments  = []
                aspect_confidences = []
                for a in ASPECTS:
                    val = aspects.get(a)
                    if val is None:
                        aspect_sentiments.append("")
                        aspect_confidences.append("")
                    elif isinstance(val, dict):
                        aspect_sentiments.append(val.get("sentiment", ""))
                        aspect_confidences.append(val.get("confidence", ""))
                    else:
                        aspect_sentiments.append(str(val))
                        aspect_confidences.append("")

                writer.writerow([
                    str(doc.get("_id", "")),
                    doc.get("review_text", ""),
                    doc.get("overall_sentiment", ""),
                    doc.get("department", ""),
                    "Batch" if doc.get("is_batch") else "Single",
                    *aspect_sentiments,
                    *aspect_confidences,
                    doc.get("model_used", ""),
                    str(doc.get("analyzed_at", ""))
                ])
                yield output.getvalue()
                output.truncate(0)
                output.seek(0)

        filename = "absa_results"
        if department and department != "ALL":
            filename += f"_{department}"
        if sentiment and sentiment != "ALL":
            filename += f"_{sentiment}"
        filename += ".csv"

        return StreamingResponse(
            generate(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/results/departments")
def get_departments():
    """List of distinct departments that have been analyzed."""
    try:
        from src.database.db_operations import get_available_departments
        depts = get_available_departments()
        return {"departments": depts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/models/metrics")
def get_model_metrics():
    """All 4 model metrics — for model comparison table."""
    try:
        metrics = get_all_model_metrics()
        return {"models": metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Run ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("src.api.main:app", host="0.0.0.0", port=8000, reload=True)