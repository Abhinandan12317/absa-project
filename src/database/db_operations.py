from datetime import datetime
from bson import ObjectId
from src.database.mongo_client import get_database
import logging

logger = logging.getLogger(__name__)

# ---------- helpers ----------
def _serialize(doc):
    """Convert ObjectId to string for JSON serialization."""
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

# ---------- reviews collection ----------
def insert_review(review_text: str, rating: int = None, department: str = None,
                  age: int = None, recommended: int = None):
    """Store a raw review from the dataset or user input."""
    db = get_database()
    doc = {
        "review_text": review_text,
        "rating": rating,
        "department": department,
        "age": age,
        "recommended": recommended,
        "created_at": datetime.utcnow()
    }
    result = db["reviews"].insert_one(doc)
    return str(result.inserted_id)

def get_reviews(limit: int = 100):
    db = get_database()
    docs = list(db["reviews"].find().sort("created_at", -1).limit(limit))
    return [_serialize(d) for d in docs]

# ---------- analysis_results collection ----------
def save_analysis_result(review_text: str, overall_sentiment: str,
                         aspects: dict, model_used: str,
                         is_batch: bool = False, batch_id: str = None,
                         department: str = None):
    """
    Save result of single or batch analysis.
    aspects = { "SIZE": "POSITIVE", "FABRIC": "NEGATIVE", ... }
    """
    db = get_database()
    doc = {
        "review_text": review_text,
        "overall_sentiment": overall_sentiment,
        "aspects": aspects,
        "model_used": model_used,
        "is_batch": is_batch,
        "batch_id": batch_id,
        "department": department,          # ← NEW
        "analyzed_at": datetime.utcnow()
    }
    result = db["analysis_results"].insert_one(doc)
    return str(result.inserted_id)  

def get_analysis_history(limit: int = 50, batch_only: bool = False):
    db = get_database()
    query = {"is_batch": True} if batch_only else {}
    docs = list(db["analysis_results"].find(query).sort("analyzed_at", -1).limit(limit))
    return [_serialize(d) for d in docs]

def get_sentiment_stats(department: str = None):
    """Aggregate overall sentiment counts — for dashboard."""
    db = get_database()
    match = {}
    if department and department != "ALL":
        match["department"] = department
    pipeline = []
    if match:
        pipeline.append({"$match": match})
    pipeline.append({"$group": {"_id": "$overall_sentiment", "count": {"$sum": 1}}})
    result = list(db["analysis_results"].aggregate(pipeline))
    return {r["_id"]: r["count"] for r in result}

def get_aspect_stats(department: str = None):
    """Aggregate per-aspect sentiment counts — for bar chart."""
    db = get_database()
    query = {}
    if department and department != "ALL":
        query["department"] = department
    docs = list(db["analysis_results"].find(query, {"aspects": 1}))

    aspect_counts = {}
    for doc in docs:
        for aspect, value in doc.get("aspects", {}).items():
            if isinstance(value, dict):
                sentiment = value.get("sentiment", "NEUTRAL")
            else:
                sentiment = value
            if aspect not in aspect_counts:
                aspect_counts[aspect] = {"POSITIVE": 0, "NEGATIVE": 0, "NEUTRAL": 0}
            if sentiment in aspect_counts[aspect]:
                aspect_counts[aspect][sentiment] += 1
    return aspect_counts

def get_available_departments():
    """Return distinct department values stored in analysis_results."""
    db = get_database()
    depts = db["analysis_results"].distinct("department")
    # Filter out None/null, sort alphabetically
    return sorted([d for d in depts if d])

# ---------- model_metrics collection ----------
def save_model_metrics(model_name: str, accuracy: float, precision: float,
                       recall: float, f1: float, confusion_matrix: list = None):
    """Save evaluation metrics for a model."""
    db = get_database()
    # Upsert — update if exists, insert if not
    db["model_metrics"].update_one(
        {"model_name": model_name},
        {"$set": {
            "model_name": model_name,
            "accuracy": accuracy,
            "precision": precision,
            "recall": recall,
            "f1": f1,
            "confusion_matrix": confusion_matrix,
            "saved_at": datetime.utcnow()
        }},
        upsert=True
    )
    return True

def get_all_model_metrics():
    db = get_database()
    docs = list(db["model_metrics"].find().sort("accuracy", -1))
    return [_serialize(d) for d in docs]

def seed_model_metrics():
    """
    Seed the 4 model results from your existing JSON reports.
    Call this once to populate model_metrics collection.
    """
    models = [
        {"model_name": "Logistic Regression", "accuracy": 81.87,
         "precision": 82.1, "recall": 81.9, "f1": 81.8},
        {"model_name": "SVM",                 "accuracy": 82.31,
         "precision": 82.5, "recall": 82.3, "f1": 82.2},
        {"model_name": "CNN-BiLSTM",          "accuracy": 82.46,
         "precision": 82.7, "recall": 82.5, "f1": 82.4},
        {"model_name": "DistilBERT",          "accuracy": 85.27,
         "precision": 85.4, "recall": 85.3, "f1": 85.2},
    ]
    for m in models:
        save_model_metrics(**m)
    logger.info("Model metrics seeded to MongoDB")
    return True