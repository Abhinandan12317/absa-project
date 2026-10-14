import pytest
from src.absa.aspect_detector import detect_aspects
from src.absa.absa_pipeline import analyze_review, analyze_batch

def test_batch_single_consistency():
    no_aspect_review = "love it! amazing and would highly recommend"
    # First check with detect_aspects that it really has no aspect
    assert detect_aspects(no_aspect_review) == {}, "Expected review to have no detected aspects"

    aspect_bearing_reviews = [
        "The fabric is beautiful but runs terribly small.",
        "The dress fits perfectly and the fabric is lovely.",
        "Terrible quality, cheap material and overpriced."
    ]

    for review in aspect_bearing_reviews:
        assert len(detect_aspects(review)) > 0, f"Expected aspects for '{review}'"

    all_reviews = aspect_bearing_reviews + [no_aspect_review]

    # Run batch analysis
    batch_results = analyze_batch(all_reviews)

    # Run single analysis on each and compare
    for review, batch_result in zip(all_reviews, batch_results):
        single_result = analyze_review(review)

        assert single_result["overall_sentiment"] == batch_result["overall_sentiment"], (
            f"Sentiment mismatch for review: '{review}'\n"
            f"Single: {single_result['overall_sentiment']}, Batch: {batch_result['overall_sentiment']}"
        )

def test_tie_single_batch_consistency():
    # Specific test for tie between POSITIVE and NEGATIVE
    review = "The fabric is beautiful but runs terribly small."
    single = analyze_review(review)
    batch = analyze_batch([review])

    assert single["overall_sentiment"] == "NEUTRAL"
    assert batch[0]["overall_sentiment"] == "NEUTRAL"
    assert single["overall_sentiment"] == batch[0]["overall_sentiment"]

def test_contrastive_clauses_aspect_sentiment():
    review = "Awful fabric But, stitching is great!!!"
    res = analyze_review(review)
    assert res["aspect_sentiments"]["FABRIC"]["sentiment"] == "NEGATIVE"
    assert res["aspect_sentiments"]["STITCHING"]["sentiment"] == "POSITIVE"
    assert res["overall_sentiment"] == "NEUTRAL"

