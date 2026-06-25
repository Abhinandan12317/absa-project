"""
Logistic Regression Model for Sentiment Classification
=======================================================
- Uses TF-IDF features
- Multiclass: Positive, Neutral, Negative
- Saves trained model and vectorizer to models_saved/
"""

import os
import sys
import json
import pickle
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score,
    recall_score, f1_score, confusion_matrix,
    classification_report
)

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
MODEL_SAVE_DIR = "models_saved"
DATA_PATH = "data/processed/model_ready.csv"
os.makedirs(MODEL_SAVE_DIR, exist_ok=True)


# ─────────────────────────────────────────────
# LOAD DATA
# ─────────────────────────────────────────────
def load_data():
    print("\n" + "="*55)
    print("  LOADING DATA")
    print("="*55)

    df = pd.read_csv(DATA_PATH)
    df = df.dropna(subset=["processed_text", "sentiment_id"])
    df["processed_text"] = df["processed_text"].astype(str)

    print(f"  Total samples : {len(df)}")
    print(f"  Class distribution:")
    dist = df["sentiment_label"].value_counts()
    for label, count in dist.items():
        pct = count / len(df) * 100
        print(f"    {label:10s}: {count} ({pct:.1f}%)")

    X = df["processed_text"].values
    y = df["sentiment_id"].values
    return X, y


# ─────────────────────────────────────────────
# BUILD TF-IDF FEATURES
# ─────────────────────────────────────────────
def build_tfidf(X_train, X_test):
    print("\n" + "="*55)
    print("  BUILDING TF-IDF FEATURES")
    print("="*55)

    vectorizer = TfidfVectorizer(
        max_features=50000,
        ngram_range=(1, 2),
        sublinear_tf=True,
        min_df=2,
    )

    X_train_tfidf = vectorizer.fit_transform(X_train)
    X_test_tfidf = vectorizer.transform(X_test)

    print(f"  Vocabulary size : {len(vectorizer.vocabulary_)}")
    print(f"  Train shape     : {X_train_tfidf.shape}")
    print(f"  Test shape      : {X_test_tfidf.shape}")

    # Save vectorizer
    vectorizer_path = os.path.join(MODEL_SAVE_DIR, "tfidf_vectorizer.pkl")
    with open(vectorizer_path, "wb") as f:
        pickle.dump(vectorizer, f)
    print(f"  Vectorizer saved → {vectorizer_path}")

    return X_train_tfidf, X_test_tfidf, vectorizer


# ─────────────────────────────────────────────
# TRAIN MODEL
# ─────────────────────────────────────────────
def train_model(X_train, y_train):
    print("\n" + "="*55)
    print("  TRAINING LOGISTIC REGRESSION")
    print("="*55)

    model = LogisticRegression(
        solver="lbfgs",
        C=1.0,
        max_iter=1000,
        random_state=42,
    )

    print("  Training...")
    model.fit(X_train, y_train)
    print("  Training complete!")

    # Save model
    model_path = os.path.join(MODEL_SAVE_DIR, "lr_model.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(model, f)
    print(f"  Model saved → {model_path}")

    return model


# ─────────────────────────────────────────────
# EVALUATE MODEL
# ─────────────────────────────────────────────
def evaluate_model(model, X_test, y_test):
    print("\n" + "="*55)
    print("  EVALUATION RESULTS")
    print("="*55)

    y_pred = model.predict(X_test)

    accuracy  = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average="weighted", zero_division=0)
    recall    = recall_score(y_test, y_pred, average="weighted", zero_division=0)
    f1        = f1_score(y_test, y_pred, average="weighted", zero_division=0)
    cm        = confusion_matrix(y_test, y_pred)

    print(f"  Accuracy  : {accuracy:.4f}  ({accuracy*100:.2f}%)")
    print(f"  Precision : {precision:.4f}")
    print(f"  Recall    : {recall:.4f}")
    print(f"  F1 Score  : {f1:.4f}")

    print(f"\n  Confusion Matrix:")
    print(f"  (0=Negative, 1=Neutral, 2=Positive)")
    print(f"  {cm}")

    print(f"\n  Classification Report:")
    labels = ["Negative", "Neutral", "Positive"]
    print(classification_report(y_test, y_pred, target_names=labels, zero_division=0))

    # Save results
    results = {
        "model": "Logistic Regression",
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "confusion_matrix": cm.tolist(),
    }

    os.makedirs("outputs/reports", exist_ok=True)
    results_path = "outputs/reports/lr_results.json"
    with open(results_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\n  Results saved → {results_path}")

    return results


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────
def main():
    print("\n" + "="*55)
    print("  LOGISTIC REGRESSION — SENTIMENT CLASSIFICATION")
    print("="*55)

    # Load data
    X, y = load_data()

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"\n  Train size : {len(X_train)}")
    print(f"  Test size  : {len(X_test)}")

    # Build TF-IDF
    X_train_tfidf, X_test_tfidf, vectorizer = build_tfidf(X_train, X_test)

    # Train
    model = train_model(X_train_tfidf, y_train)

    # Evaluate
    results = evaluate_model(model, X_test_tfidf, y_test)

    print("\n" + "="*55)
    print("  ✓ LOGISTIC REGRESSION COMPLETE")
    print("="*55)
    print(f"\n  Final Accuracy: {results['accuracy']*100:.2f}%")
    print(f"  Model saved in: models_saved/lr_model.pkl")


if __name__ == "__main__":
    main()