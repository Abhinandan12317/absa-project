import re
import string
import pandas as pd
import numpy as np
import nltk

# Ensure required NLTK resources are available
for resource in ["stopwords", "punkt", "punkt_tab", "wordnet", "omw-1.4"]:
    try:
        nltk.download(resource, quiet=True)
    except Exception:
        pass

from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import WordNetLemmatizer
from collections import defaultdict

# ─────────────────────────────────────────────
# CONTRACTION MAP
# ─────────────────────────────────────────────
CONTRACTIONS = {
    "don't": "do not", "doesn't": "does not", "didn't": "did not",
    "won't": "will not", "wouldn't": "would not", "can't": "cannot",
    "couldn't": "could not", "shouldn't": "should not", "it's": "it is",
    "i'm": "i am", "i've": "i have", "i'll": "i will", "i'd": "i would",
    "they're": "they are", "they've": "they have", "they'll": "they will",
    "we're": "we are", "we've": "we have", "we'll": "we will",
    "you're": "you are", "you've": "you have", "you'll": "you will",
    "he's": "he is", "she's": "she is", "that's": "that is",
    "there's": "there is", "here's": "here is", "wasn't": "was not",
    "weren't": "were not", "isn't": "is not", "aren't": "are not",
    "hasn't": "has not", "haven't": "have not", "hadn't": "had not",
}

# ─────────────────────────────────────────────
# ASPECT LEXICON
# ─────────────────────────────────────────────
ASPECT_LEXICON = {
    "SIZE": [
        "size", "sizing", "fit", "fits", "fitting", "fitted",
        "small", "large", "big", "tight", "loose", "narrow", "wide",
        "runs small", "runs large", "true to size", "size up", "size down",
        "oversized", "undersized", "length", "too small", "too large",
    ],
    "FABRIC": [
        "fabric", "material", "cloth", "texture", "quality",
        "soft", "silky", "cotton", "polyester", "linen", "silk",
        "breathable", "stretchy", "thin", "thick", "sheer",
        "see-through", "pilling", "lightweight", "scratchy", "itchy",
    ],
    "STITCHING": [
        "stitch", "stitching", "seam", "seams", "sewing",
        "thread", "hem", "zipper", "button", "closure",
        "came apart", "falling apart", "fell apart", "loose thread",
        "craftsmanship", "well made", "poorly made",
    ],
    "COLOR": [
        "color", "colour", "shade", "hue", "print", "pattern",
        "faded", "fading", "vibrant", "bright", "dark", "light",
        "color bleeding", "true to photo", "as pictured",
        "different color", "wrong color", "color accurate",
    ],
    "PRICE": [
        "price", "cost", "expensive", "cheap", "affordable",
        "value", "worth", "overpriced", "budget", "premium",
        "money", "deal", "bargain", "not worth", "great value",
    ],
    "DELIVERY": [
        "delivery", "shipping", "shipped", "arrived", "package",
        "tracking", "fast shipping", "slow shipping", "late", "delayed",
        "on time", "quick delivery", "damaged", "returns", "exchange",
    ],
}

PHRASE_ASPECTS = {}
for aspect, keywords in ASPECT_LEXICON.items():
    for kw in keywords:
        if " " in kw:
            PHRASE_ASPECTS[kw] = aspect

lemmatizer = WordNetLemmatizer()
STOP_WORDS = set(stopwords.words('english'))
STOP_WORDS.update(['item', 'product', 'review', 'purchase', 'order', 'bought'])

# ─────────────────────────────────────────────
# PREPROCESSING FUNCTIONS
# ─────────────────────────────────────────────
def expand_contractions(text):
    for contraction, expanded in CONTRACTIONS.items():
        text = re.sub(r'\b' + re.escape(contraction) + r'\b', expanded, text, flags=re.IGNORECASE)
    return text

def normalize_text(text):
    text = str(text).lower().strip()
    text = expand_contractions(text)
    return text

def remove_noise(text):
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'http\S+|www\S+', ' ', text)
    text = re.sub(r'\S+@\S+', ' ', text)
    text = re.sub(r'[^\w\s\'-]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def tokenize(text):
    return word_tokenize(text)

def remove_stopwords(tokens):
    return [t for t in tokens if t not in STOP_WORDS and len(t) > 1]

def lemmatize_tokens(tokens):
    return [lemmatizer.lemmatize(t) for t in tokens]

def detect_aspects(text):
    text_lower = text.lower()
    detected = defaultdict(list)
    for phrase, aspect in PHRASE_ASPECTS.items():
        if phrase in text_lower:
            detected[aspect].append(phrase)
    words = set(text_lower.split())
    for aspect, keywords in ASPECT_LEXICON.items():
        for kw in keywords:
            if " " not in kw and kw in words:
                if kw not in detected[aspect]:
                    detected[aspect].append(kw)
    return dict(detected)

def extract_aspect_sentences(text, aspects_detected):
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if len(s.strip()) > 5]
    aspect_sentences = defaultdict(list)
    for aspect, keywords in aspects_detected.items():
        for sentence in sentences:
            sent_lower = sentence.lower()
            if any(kw in sent_lower for kw in keywords):
                if sentence not in aspect_sentences[aspect]:
                    aspect_sentences[aspect].append(sentence)
    return dict(aspect_sentences)

def preprocess_single(text):
    original = text
    normalized = normalize_text(text)
    cleaned = remove_noise(normalized)
    tokens = tokenize(cleaned)
    tokens_no_stop = remove_stopwords(tokens)
    lemmatized = lemmatize_tokens(tokens_no_stop)
    aspects_detected = detect_aspects(cleaned)
    aspect_sentences = extract_aspect_sentences(cleaned, aspects_detected)
    return {
        "original": original,
        "cleaned": cleaned,
        "tokens": tokens,
        "tokens_no_stop": tokens_no_stop,
        "lemmatized": lemmatized,
        "processed_text": " ".join(lemmatized),
        "aspects_detected": aspects_detected,
        "aspect_sentences": aspect_sentences,
        "num_aspects": len(aspects_detected),
    }

def preprocess_dataframe(df, text_col="Review Text", verbose=True):
    if verbose:
        print(f"Preprocessing {len(df)} reviews...")
    results = []
    for i, row in df.iterrows():
        text = row.get(text_col, "")
        if pd.isna(text) or str(text).strip() == "":
            text = ""
        result = preprocess_single(str(text))
        results.append(result)
        if verbose and (i + 1) % 1000 == 0:
            print(f"  Processed {i+1}/{len(df)} reviews")
    result_df = pd.DataFrame(results)
    final_df = pd.concat([df.reset_index(drop=True), result_df], axis=1)
    if verbose:
        print(f"Preprocessing complete!")
    return final_df

def assign_sentiment_label(rating):
    if rating >= 4:
        return "Positive"
    elif rating == 3:
        return "Neutral"
    else:
        return "Negative"

def add_sentiment_labels(df, rating_col="Rating"):
    df = df.copy()
    df["sentiment_label"] = df[rating_col].apply(assign_sentiment_label)
    df["sentiment_id"] = df["sentiment_label"].map({"Negative": 0, "Neutral": 1, "Positive": 2})
    return df