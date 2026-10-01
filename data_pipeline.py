"""
Data Pipeline - Step 1: Data Loading & Preprocessing
=====================================================
Run this script to:
  1. Load the dataset
  2. Validate and clean the data
  3. Run full preprocessing pipeline
  4. Save processed outputs for model training

Usage:
  python data_pipeline.py
"""

import os
import sys
import json
import pandas as pd
import numpy as np
from collections import defaultdict

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from src.preprocessing.text_preprocessor import (
    preprocess_dataframe,
    add_sentiment_labels,
)

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
RAW_DATA_PATH = "data/raw/reviews.csv"
PROCESSED_DIR = "data/processed"
os.makedirs(PROCESSED_DIR, exist_ok=True)


# ─────────────────────────────────────────────
# STEP 1: LOAD DATA
# ─────────────────────────────────────────────
def load_data(path):
    print("\n" + "="*55)
    print("  STEP 1: LOADING DATA")
    print("="*55)

    if not os.path.exists(path):
        print(f"[ERROR] File not found: {path}")
        sys.exit(1)

    df = pd.read_csv(path)
    print(f"  Loaded {len(df)} rows, {len(df.columns)} columns")
    print(f"  Columns: {list(df.columns)}")
    return df


# ─────────────────────────────────────────────
# STEP 2: VALIDATE & CLEAN
# ─────────────────────────────────────────────
def validate_and_clean(df):
    print("\n" + "="*55)
    print("  STEP 2: VALIDATION & CLEANING")
    print("="*55)

    initial_count = len(df)

    # Drop rows with missing review text
    df = df.dropna(subset=["Review Text"])
    df = df[df["Review Text"].str.strip().str.len() >= 10]

    # Drop rows with invalid ratings
    df = df[df["Rating"].between(1, 5)]

    # Fill optional columns
    for col in ["Title", "Department Name", "Division Name", "Class Name"]:
        if col in df.columns:
            df[col] = df[col].fillna("Unknown")

    df = df.reset_index(drop=True)

    print(f"  Rows before cleaning : {initial_count}")
    print(f"  Rows after cleaning  : {len(df)}")
    print(f"  Dropped              : {initial_count - len(df)}")
    print(f"\n  Rating distribution:")
    dist = df["Rating"].value_counts().sort_index()
    for rating, count in dist.items():
        bar = "█" * (count // 100)
        print(f"    {rating}★  {count:4d}  {bar}")

    return df


# ─────────────────────────────────────────────
# STEP 3: ADD SENTIMENT LABELS
# ─────────────────────────────────────────────
def label_sentiments(df):
    print("\n" + "="*55)
    print("  STEP 3: SENTIMENT LABELING")
    print("="*55)

    df = add_sentiment_labels(df)

    dist = df["sentiment_label"].value_counts()
    print(f"  Sentiment distribution:")
    for label, count in dist.items():
        pct = count / len(df) * 100
        bar = "█" * int(pct / 2)
        print(f"    {label:10s}  {count:4d}  ({pct:.1f}%)  {bar}")

    return df


# ─────────────────────────────────────────────
# STEP 4: PREPROCESS TEXT
# ─────────────────────────────────────────────
def run_preprocessing(df):
    print("\n" + "="*55)
    print("  STEP 4: TEXT PREPROCESSING")
    print("="*55)

    df = preprocess_dataframe(df, text_col="Review Text", verbose=True)
    return df


# ─────────────────────────────────────────────
# STEP 5: GENERATE ABSA WEAK LABELS
# ─────────────────────────────────────────────
def generate_absa_labels(df):
    print("\n" + "="*55)
    print("  STEP 5: GENERATING ABSA WEAK LABELS")
    print("="*55)

    """
    Since dataset has no aspect-level labels,
    we generate them using:
      - Aspect keywords detected in review
      - Overall rating as sentiment signal
      
    Logic:
      - Rating 4-5 + aspect mentioned = aspect sentiment POSITIVE
      - Rating 1-2 + aspect mentioned = aspect sentiment NEGATIVE
      - Rating 3   + aspect mentioned = aspect sentiment NEUTRAL
    """

    def generate_aspect_labels(row):
        aspects = row["aspects_detected"]
        if isinstance(aspects, str):
            aspects = json.loads(aspects)
        sentiment = row["sentiment_label"]
        aspect_labels = {}
        for aspect in aspects:
            aspect_labels[aspect] = sentiment
        return json.dumps(aspect_labels)

    df["aspect_labels"] = df.apply(generate_aspect_labels, axis=1)

    # Count aspect label distribution
    aspect_counts = defaultdict(lambda: defaultdict(int))
    for labels in df["aspect_labels"]:
        parsed = json.loads(labels)
        for aspect, sentiment in parsed.items():
            aspect_counts[aspect][sentiment] += 1

    print("  Aspect-level label distribution:")
    for aspect, sentiments in sorted(aspect_counts.items()):
        total = sum(sentiments.values())
        print(f"\n    {aspect} ({total} reviews):")
        for sentiment, count in sentiments.items():
            pct = count / total * 100
            print(f"      {sentiment:10s}: {count} ({pct:.1f}%)")

    return df


# ─────────────────────────────────────────────
# STEP 6: SAVE OUTPUTS
# ─────────────────────────────────────────────
def save_outputs(df):
    print("\n" + "="*55)
    print("  STEP 6: SAVING OUTPUTS")
    print("="*55)

    df_save = df.copy()

    # Convert list/dict columns to JSON strings for CSV saving
    for col in ["aspects_detected", "aspect_sentences", "tokens",
                "tokens_no_stop", "lemmatized"]:
        if col in df_save.columns:
            df_save[col] = df_save[col].apply(
                lambda x: json.dumps(x) if isinstance(x, (dict, list)) else x
            )

    # Full processed dataset
    full_path = os.path.join(PROCESSED_DIR, "reviews_processed.csv")
    df_save.to_csv(full_path, index=False)
    print(f"  Saved full processed dataset → {full_path}")

    # Model ready dataset
    model_df = df_save[[
        "Review Text", "processed_text", "sentiment_label",
        "sentiment_id", "Rating", "Department Name", "num_aspects"
    ]].copy()
    model_path = os.path.join(PROCESSED_DIR, "model_ready.csv")
    model_df.to_csv(model_path, index=False)
    print(f"  Saved model-ready dataset   → {model_path}")

    # ABSA ready dataset
    absa_df = df_save[df_save["num_aspects"] > 0][[
        "Review Text", "processed_text", "sentiment_label",
        "sentiment_id", "Rating", "aspects_detected",
        "aspect_sentences", "aspect_labels", "num_aspects"
    ]].copy()
    absa_path = os.path.join(PROCESSED_DIR, "absa_ready.csv")
    absa_df.to_csv(absa_path, index=False)
    print(f"  Saved ABSA-ready dataset    → {absa_path}")
    print(f"    Reviews with aspects: {len(absa_df)}/{len(df)}")

    # Dataset statistics
    stats = {
        "total_reviews": len(df),
        "reviews_with_aspects": int((df["num_aspects"] > 0).sum()),
        "sentiment_distribution": df["sentiment_label"].value_counts().to_dict(),
        "rating_distribution": {
            int(k): int(v)
            for k, v in df["Rating"].value_counts().sort_index().items()
        },
        "aspect_coverage": {
            asp: int(df["aspects_detected"].apply(
                lambda x: asp in (x if isinstance(x, dict) else json.loads(x) if x else {})
            ).sum())
            for asp in ["SIZE", "FABRIC", "STITCHING", "COLOR", "PRICE", "DELIVERY"]
        },
    }
    stats_path = os.path.join(PROCESSED_DIR, "dataset_stats.json")
    with open(stats_path, "w") as f:
        json.dump(stats, f, indent=2)
    print(f"  Saved dataset statistics    → {stats_path}")

    return stats


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────
def main():
    print("\n" + "="*55)
    print("  ABSA PROJECT — DATA PIPELINE")
    print("="*55)

    df = load_data(RAW_DATA_PATH)
    df = validate_and_clean(df)
    df = label_sentiments(df)
    df = run_preprocessing(df)
    df = generate_absa_labels(df)
    stats = save_outputs(df)

    print("\n" + "="*55)
    print("  ✓ DATA PIPELINE COMPLETE")
    print("="*55)
    print(f"\n  Total reviews processed : {stats['total_reviews']}")
    print(f"  Reviews with aspects    : {stats['reviews_with_aspects']}")
    print(f"\n  Aspect coverage:")
    for asp, cnt in stats["aspect_coverage"].items():
        print(f"    {asp:12s}: {cnt} reviews")
    print(f"\n  Output files in: data/processed/")
    print(f"\n  Next step: python train_models.py")


if __name__ == "__main__":
    main()