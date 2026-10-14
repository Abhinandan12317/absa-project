import pytest
from src.absa.absa_pipeline import derive_overall_sentiment

def test_empty_aspects():
    assert derive_overall_sentiment({}) == "NEUTRAL"

def test_only_neutral_aspects():
    aspects = {
        "SIZE": {"sentiment": "NEUTRAL"},
        "COLOR": {"sentiment": "NEUTRAL"}
    }
    assert derive_overall_sentiment(aspects) == "NEUTRAL"

def test_only_positive_aspects():
    aspects = {
        "SIZE": {"sentiment": "POSITIVE"},
        "FABRIC": {"sentiment": "POSITIVE"}
    }
    assert derive_overall_sentiment(aspects) == "POSITIVE"

def test_only_negative_aspects():
    aspects = {
        "SIZE": {"sentiment": "NEGATIVE"},
        "PRICE": {"sentiment": "NEGATIVE"}
    }
    assert derive_overall_sentiment(aspects) == "NEGATIVE"

def test_more_positive_than_negative():
    aspects = {
        "SIZE": {"sentiment": "POSITIVE"},
        "FABRIC": {"sentiment": "POSITIVE"},
        "PRICE": {"sentiment": "NEGATIVE"},
        "COLOR": {"sentiment": "NEUTRAL"}
    }
    assert derive_overall_sentiment(aspects) == "POSITIVE"

def test_more_negative_than_positive():
    aspects = {
        "SIZE": {"sentiment": "NEGATIVE"},
        "FABRIC": {"sentiment": "NEGATIVE"},
        "PRICE": {"sentiment": "POSITIVE"},
        "COLOR": {"sentiment": "NEUTRAL"}
    }
    assert derive_overall_sentiment(aspects) == "NEGATIVE"

def test_tie_positive_and_negative_resolves_to_neutral():
    # Tie case (1 POS vs 1 NEG)
    aspects_1 = {
        "FABRIC": {"sentiment": "POSITIVE"},
        "SIZE": {"sentiment": "NEGATIVE"}
    }
    assert derive_overall_sentiment(aspects_1) == "NEUTRAL"

    # Tie case with neutral (2 POS, 2 NEG, 1 NEU)
    aspects_2 = {
        "FABRIC": {"sentiment": "POSITIVE"},
        "COLOR": {"sentiment": "POSITIVE"},
        "SIZE": {"sentiment": "NEGATIVE"},
        "PRICE": {"sentiment": "NEGATIVE"},
        "DELIVERY": {"sentiment": "NEUTRAL"}
    }
    assert derive_overall_sentiment(aspects_2) == "NEUTRAL"

def test_string_format_aspect_sentiments():
    assert derive_overall_sentiment({"SIZE": "POSITIVE", "COLOR": "POSITIVE"}) == "POSITIVE"
    assert derive_overall_sentiment({"SIZE": "POSITIVE", "COLOR": "NEGATIVE"}) == "NEUTRAL"
    assert derive_overall_sentiment({"SIZE": "NEUTRAL"}) == "NEUTRAL"
