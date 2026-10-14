import pytest
from src.evaluation.evaluator import build_model_metrics

EXPECTED_METRICS = {
    "Logistic Regression": {
        "accuracy": 81.87,
        "precision": 77.94,
        "recall": 81.87,
        "f1": 78.52,
        "macro_f1": 55.03,
    },
    "SVM": {
        "accuracy": 82.31,
        "precision": 79.24,
        "recall": 82.31,
        "f1": 80.23,
        "macro_f1": 58.61,
    },
    "CNN-BiLSTM": {
        "accuracy": 82.46,
        "precision": 80.13,
        "recall": 82.46,
        "f1": 81.07,
        "macro_f1": 59.46,
    },
    "DistilBERT": {
        "accuracy": 85.27,
        "precision": 84.88,
        "recall": 85.27,
        "f1": 85.07,
        "macro_f1": 67.76,
    },
}

def test_build_model_metrics_returns_four_models():
    metrics = build_model_metrics()
    assert len(metrics) == 4
    names = {m["model_name"] for m in metrics}
    assert names == set(EXPECTED_METRICS.keys())

def test_build_model_metrics_values():
    metrics = build_model_metrics()
    metrics_by_name = {m["model_name"]: m for m in metrics}

    for name, expected in EXPECTED_METRICS.items():
        assert name in metrics_by_name, f"Missing model {name}"
        actual = metrics_by_name[name]

        assert actual["accuracy"] == pytest.approx(expected["accuracy"], abs=0.01)
        assert actual["precision"] == pytest.approx(expected["precision"], abs=0.01)
        assert actual["recall"] == pytest.approx(expected["recall"], abs=0.01)
        assert actual["f1"] == pytest.approx(expected["f1"], abs=0.01)
        assert actual["macro_f1"] == pytest.approx(expected["macro_f1"], abs=0.01)

        # Ensure confusion matrix is present
        assert "confusion_matrix" in actual
        assert len(actual["confusion_matrix"]) == 3
