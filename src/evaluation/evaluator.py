import json
import os
import sys
import numpy as np
from datetime import datetime

# Ensure utf-8 output on Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

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

# ── Build model metrics for DB / API ─────────────────────────────────────────
def build_model_metrics() -> list:
    """
    Reads the 4 JSONs and returns, per model:
    model_name, accuracy, precision, recall, f1 (weighted values, in percent, 2 decimals),
    plus macro_precision, macro_recall, macro_f1 and confusion_matrix.
    """
    all_results = load_model_results()
    class_names = ["NEGATIVE", "NEUTRAL", "POSITIVE"]
    metrics_list = []
    for model_name, data in all_results.items():
        cm = data["confusion_matrix"]
        per_class = analyze_confusion_matrix(cm, class_names)
        macro_precision = round(float(np.mean([v["precision"] for v in per_class.values()])) * 100, 2)
        macro_recall    = round(float(np.mean([v["recall"] for v in per_class.values()])) * 100, 2)
        macro_f1        = round(float(np.mean([v["f1"] for v in per_class.values()])) * 100, 2)

        metrics_list.append({
            "model_name":       model_name,
            "accuracy":         round(data["accuracy"]  * 100, 2),
            "precision":        round(data["precision"] * 100, 2),
            "recall":           round(data["recall"]    * 100, 2),
            "f1":               round(data["f1_score"]  * 100, 2),
            "macro_precision":  macro_precision,
            "macro_recall":     macro_recall,
            "macro_f1":         macro_f1,
            "confusion_matrix": cm,
        })
    return metrics_list

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

        macro_precision = round(float(np.mean([v["precision"] for v in per_class.values()])) * 100, 2)
        macro_recall    = round(float(np.mean([v["recall"] for v in per_class.values()])) * 100, 2)
        macro_f1        = round(float(np.mean([v["f1"] for v in per_class.values()])) * 100, 2)

        model_report = {
            "accuracy":           round(data["accuracy"]  * 100, 2),
            "precision_weighted": round(data["precision"] * 100, 2),
            "recall_weighted":    round(data["recall"]    * 100, 2),
            "f1_weighted":        round(data["f1_score"]  * 100, 2),
            "macro_precision":    macro_precision,
            "macro_recall":       macro_recall,
            "macro_f1":           macro_f1,
            "test_samples":       test_total,
            "correct":            correct,
            "incorrect":          test_total - correct,
            "confusion_matrix":   cm,
            "per_class":          per_class,
        }

        report["models"][model_name] = model_report

        # Print summary
        print(f"\n{'─'*50}")
        print(f"  {model_name}")
        print(f"{'─'*50}")
        print(f"  Accuracy           : {model_report['accuracy']}%")
        print(f"  Weighted Precision : {model_report['precision_weighted']}%")
        print(f"  Weighted Recall    : {model_report['recall_weighted']}%")
        print(f"  Weighted F1 Score  : {model_report['f1_weighted']}%")
        print(f"  Macro Precision    : {model_report['macro_precision']}%")
        print(f"  Macro Recall       : {model_report['macro_recall']}%")
        print(f"  Macro F1 Score     : {model_report['macro_f1']}%")
        print(f"  Test Samples: {test_total} | Correct: {correct} | Wrong: {test_total - correct}")
        print(f"\n  Per-Class Breakdown:")
        for cls, stats in per_class.items():
            print(f"    {cls:10s} → P: {stats['precision']:.4f}  R: {stats['recall']:.4f}  F1: {stats['f1']:.4f}  Support: {stats['support']}")
        print(f"\n  Confusion Matrix (rows=Actual, cols=Predicted):")
        print(f"               NEG    NEU    POS")
        for i, row in enumerate(cm):
            print(f"  {class_names[i]:10s} {row[0]:6d} {row[1]:6d} {row[2]:6d}")

    # ── Comparison summary ────────────────────────────────────────────────────
    print(f"\n{'='*75}")
    print("  MODEL COMPARISON SUMMARY")
    print(f"{'='*75}")
    print(f"  {'Model':<22} {'Accuracy':>10} {'W-Prec':>10} {'W-Rec':>10} {'W-F1':>10} {'Macro F1':>10}")
    print(f"  {'─'*22} {'─'*10} {'─'*10} {'─'*10} {'─'*10} {'─'*10}")

    best_model = max(report["models"].items(), key=lambda x: x[1]["accuracy"])

    for model_name, stats in report["models"].items():
        marker = " ← BEST" if model_name == best_model[0] else ""
        print(f"  {model_name:<22} {stats['accuracy']:>9.2f}% {stats['precision_weighted']:>9.2f}% {stats['recall_weighted']:>9.2f}% {stats['f1_weighted']:>9.2f}% {stats['macro_f1']:>9.2f}%{marker}")

    print(f"\n  Best Model: {best_model[0]} ({best_model[1]['accuracy']}% accuracy)")

    # ── Ranking ───────────────────────────────────────────────────────────────
    ranked = sorted(report["models"].items(), key=lambda x: x[1]["accuracy"], reverse=True)
    report["ranking"] = [
        {
            "rank": i + 1,
            "model": name,
            "accuracy": stats["accuracy"],
            "f1_weighted": stats["f1_weighted"],
            "macro_f1": stats["macro_f1"]
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
                precision=stats["precision_weighted"],
                recall=stats["recall_weighted"],
                f1=stats["f1_weighted"],
                confusion_matrix=stats["confusion_matrix"],
                macro_precision=stats.get("macro_precision"),
                macro_recall=stats.get("macro_recall"),
                macro_f1=stats.get("macro_f1")
            )
        print("✅ MongoDB model_metrics collection updated!")
    except Exception as e:
        print(f"⚠️  MongoDB sync skipped: {e}")


# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    report = generate_evaluation_report()
    sync_metrics_to_mongodb(report)