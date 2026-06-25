import json
import os
import numpy as np
from datetime import datetime

# ── Paths ─────────────────────────────────────────────────────────────────────
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REPORTS_DIR  = os.path.join(PROJECT_ROOT, "outputs", "reports")

# ── Load individual model results ─────────────────────────────────────────────
def load_model_results():
    files = {
        "Logistic Regression": "lr_results.json",
        "SVM":                 "svm_results.json",
        "DistilBERT":          "distilbert_results.json",
        "CNN-BiLSTM":          "cnn_bilstm_results.json",
    }
    results = {}
    for model_name, filename in files.items():
        path = os.path.join(REPORTS_DIR, filename)
        with open(path, "r") as f:
            results[model_name] = json.load(f)
    return results

# ── Confusion matrix stats ────────────────────────────────────────────────────
def analyze_confusion_matrix(cm, class_names=["NEGATIVE", "NEUTRAL", "POSITIVE"]):
    cm = np.array(cm)
    total = cm.sum()
    per_class = {}

    for i, cls in enumerate(class_names):
        tp = cm[i, i]
        fp = cm[:, i].sum() - tp
        fn = cm[i, :].sum() - tp
        tn = total - tp - fp - fn

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall    = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1        = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
        support   = int(cm[i, :].sum())

        per_class[cls] = {
            "precision": round(float(precision), 4),
            "recall":    round(float(recall),    4),
            "f1":        round(float(f1),        4),
            "support":   support,
            "tp": int(tp), "fp": int(fp),
            "fn": int(fn), "tn": int(tn),
        }

    return per_class

# ── Generate full evaluation report ──────────────────────────────────────────
def generate_evaluation_report():
    print("=" * 60)
    print("ABSA PROJECT — MODEL EVALUATION REPORT")
    print("=" * 60)

    all_results = load_model_results()
    class_names = ["NEGATIVE", "NEUTRAL", "POSITIVE"]
    report = {
        "generated_at": datetime.now().isoformat(),
        "dataset": "Women's Clothing E-Commerce Reviews (Kaggle)",
        "total_records": 23486,
        "test_split": "20%",
        "classes": class_names,
        "models": {}
    }

    # ── Per-model evaluation ──────────────────────────────────────────────────
    for model_name, data in all_results.items():
        cm          = data["confusion_matrix"]
        per_class   = analyze_confusion_matrix(cm, class_names)
        cm_array    = np.array(cm)
        test_total  = int(cm_array.sum())
        correct     = int(np.trace(cm_array))

        model_report = {
            "accuracy":         round(data["accuracy"]  * 100, 2),
            "precision_macro":  round(data["precision"] * 100, 2),
            "recall_macro":     round(data["recall"]    * 100, 2),
            "f1_macro":         round(data["f1_score"]  * 100, 2),
            "test_samples":     test_total,
            "correct":          correct,
            "incorrect":        test_total - correct,
            "confusion_matrix": cm,
            "per_class":        per_class,
        }

        report["models"][model_name] = model_report

        # Print summary
        print(f"\n{'─'*50}")
        print(f"  {model_name}")
        print(f"{'─'*50}")
        print(f"  Accuracy  : {model_report['accuracy']}%")
        print(f"  Precision : {model_report['precision_macro']}%")
        print(f"  Recall    : {model_report['recall_macro']}%")
        print(f"  F1 Score  : {model_report['f1_macro']}%")
        print(f"  Test Samples: {test_total} | Correct: {correct} | Wrong: {test_total - correct}")
        print(f"\n  Per-Class Breakdown:")
        for cls, stats in per_class.items():
            print(f"    {cls:10s} → P: {stats['precision']:.4f}  R: {stats['recall']:.4f}  F1: {stats['f1']:.4f}  Support: {stats['support']}")
        print(f"\n  Confusion Matrix (rows=Actual, cols=Predicted):")
        print(f"               NEG    NEU    POS")
        for i, row in enumerate(cm):
            print(f"  {class_names[i]:10s} {row[0]:6d} {row[1]:6d} {row[2]:6d}")

    # ── Comparison summary ────────────────────────────────────────────────────
    print(f"\n{'='*60}")
    print("  MODEL COMPARISON SUMMARY")
    print(f"{'='*60}")
    print(f"  {'Model':<22} {'Accuracy':>10} {'Precision':>10} {'Recall':>10} {'F1':>10}")
    print(f"  {'─'*22} {'─'*10} {'─'*10} {'─'*10} {'─'*10}")

    best_model = max(report["models"].items(), key=lambda x: x[1]["accuracy"])

    for model_name, stats in report["models"].items():
        marker = " ← BEST" if model_name == best_model[0] else ""
        print(f"  {model_name:<22} {stats['accuracy']:>9.2f}% {stats['precision_macro']:>9.2f}% {stats['recall_macro']:>9.2f}% {stats['f1_macro']:>9.2f}%{marker}")

    print(f"\n  Best Model: {best_model[0]} ({best_model[1]['accuracy']}% accuracy)")

    # ── Ranking ───────────────────────────────────────────────────────────────
    ranked = sorted(report["models"].items(), key=lambda x: x[1]["accuracy"], reverse=True)
    report["ranking"] = [
        {
            "rank": i + 1,
            "model": name,
            "accuracy": stats["accuracy"],
            "f1": stats["f1_macro"]
        }
        for i, (name, stats) in enumerate(ranked)
    ]
    report["best_model"] = best_model[0]

    # ── Save report ───────────────────────────────────────────────────────────
    output_path = os.path.join(REPORTS_DIR, "evaluation_report.json")
    with open(output_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\n✅ Full report saved to: outputs/reports/evaluation_report.json")

    return report


# ── Also update MongoDB with real metrics ─────────────────────────────────────
def sync_metrics_to_mongodb(report):
    try:
        import sys
        sys.path.append(PROJECT_ROOT)
        from src.database.db_operations import save_model_metrics
        from src.database.mongo_client import get_database

        # Clear existing metrics
        db = get_database()
        db["model_metrics"].delete_many({})

        for model_name, stats in report["models"].items():
            save_model_metrics(
                model_name=model_name,
                accuracy=stats["accuracy"],
                precision=stats["precision_macro"],
                recall=stats["recall_macro"],
                f1=stats["f1_macro"],
                confusion_matrix=stats["confusion_matrix"]
            )
        print("✅ MongoDB model_metrics collection updated!")
    except Exception as e:
        print(f"⚠️  MongoDB sync skipped: {e}")


# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    report = generate_evaluation_report()
    sync_metrics_to_mongodb(report)