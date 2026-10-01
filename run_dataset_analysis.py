import sys
import os
import pandas as pd
import time
from tqdm import tqdm

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.absa.absa_pipeline import (
    load_lr_model, load_distilbert_model,
    analyze_review, get_aspect_summary
)
from src.database.db_operations import save_analysis_result
from src.database.mongo_client import get_database

# ── Config ───────────────────────────────────────────────────────────────────
CSV_PATH    = os.path.join("data", "raw", "reviews.csv")
BATCH_SIZE  = 100       # save to MongoDB every N reviews
SKIP_EMPTY  = True      # skip rows with no review text
LIMIT       = None      # set to e.g. 500 to do a test run first

# ── Load models ───────────────────────────────────────────────────────────────
print("Loading LR model...")
lr_model, lr_vectorizer = load_lr_model()
print("LR model loaded! ✅")

print("Loading DistilBERT...")
try:
    distilbert, tokenizer, device = load_distilbert_model()
    print(f"DistilBERT loaded! (device: {device}) ✅\n")
except Exception as e:
    print(f"DistilBERT failed: {e} — using LR only ⚠️\n")
    distilbert, tokenizer, device = None, None, None

# ── Load CSV ──────────────────────────────────────────────────────────────────
print(f"Loading dataset from {CSV_PATH}...")
df = pd.read_csv(CSV_PATH)
print(f"Total rows: {len(df)}")

# Drop rows with empty Review Text
df = df[df["Review Text"].notna() & (df["Review Text"].str.strip() != "")]
print(f"Rows with valid review text: {len(df)}")

if LIMIT:
    df = df.head(LIMIT)
    print(f"Limited to {LIMIT} rows for this run.\n")

# ── Check already processed ───────────────────────────────────────────────────
db = get_database()
already_done = db["analysis_results"].count_documents({"is_batch": True, "batch_id": "dataset_full"})
print(f"Already in MongoDB from this dataset run: {already_done}")

if already_done >= len(df):
    print("Dataset already fully processed! Delete the existing documents to re-run.")
    sys.exit(0)

# Skip already-processed rows
df = df.iloc[already_done:].reset_index(drop=True)
print(f"Resuming from row {already_done}, {len(df)} rows remaining.\n")

# ── Run analysis ──────────────────────────────────────────────────────────────
print("=" * 60)
print("Starting ABSA on full dataset...")
print("=" * 60)

success = 0
failed  = 0
start   = time.time()

for i, row in tqdm(df.iterrows(), total=len(df), desc="Analyzing"):
    review_text = str(row["Review Text"]).strip()
    department  = str(row["Department Name"]) if pd.notna(row["Department Name"]) else None
    rating      = int(row["Rating"])          if pd.notna(row["Rating"])          else None
    recommended = int(row["Recommended IND"]) if pd.notna(row["Recommended IND"]) else None
    age         = int(row["Age"])             if pd.notna(row["Age"])             else None

    try:
        result = analyze_review(
            review_text,
            distilbert=distilbert,
            tokenizer=tokenizer,
            device=device,
            lr_model=lr_model,
            vectorizer=lr_vectorizer
        )

        save_analysis_result(
            review_text=review_text,
            overall_sentiment=result.get("overall_sentiment", "NEUTRAL"),
            aspects=result.get("aspect_sentiments", {}),
            model_used=result.get("model_used", "hybrid"),
            is_batch=True,
            batch_id="dataset_full",
            department=department
        )
        success += 1

    except Exception as e:
        failed += 1
        if failed <= 5:   # only print first 5 errors
            print(f"\n⚠️  Row {i} failed: {e}")

    # Progress update every 500 rows
    if (success + failed) % 500 == 0:
        elapsed  = time.time() - start
        rate     = (success + failed) / elapsed
        remaining = (len(df) - (success + failed)) / rate if rate > 0 else 0
        print(f"\n  ✅ {success} done | ❌ {failed} failed | "
              f"⏱ {elapsed/60:.1f} min elapsed | ~{remaining/60:.1f} min remaining")

# ── Summary ───────────────────────────────────────────────────────────────────
elapsed = time.time() - start
print("\n" + "=" * 60)
print("DATASET ANALYSIS COMPLETE")
print("=" * 60)
print(f"✅ Successfully analyzed : {success}")
print(f"❌ Failed                : {failed}")
print(f"⏱ Total time            : {elapsed/60:.1f} minutes")
print(f"📦 Total in MongoDB      : {db['analysis_results'].count_documents({})}")

# Department breakdown
print("\nDepartment breakdown in MongoDB:")
pipeline = [
    {"$match": {"batch_id": "dataset_full"}},
    {"$group": {"_id": "$department", "count": {"$sum": 1}}},
    {"$sort": {"count": -1}}
]
for doc in db["analysis_results"].aggregate(pipeline):
    print(f"  {doc['_id']:20s} : {doc['count']}")