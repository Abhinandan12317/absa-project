import sys
import os
import re
import pickle
import json
import pandas as pd
from typing import Dict, List, Any

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.absa.aspect_detector import detect_aspects, get_aspect_sentences
from src.preprocessing.text_preprocessor import preprocess_single

# ── Paths ────────────────────────────────────────────────────────────────────
MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "models_saved")

# ── Sentiment label map ──────────────────────────────────────────────────────
LABEL_MAP = {0: "NEGATIVE", 1: "NEUTRAL", 2: "POSITIVE"}

# ── Load LR model (fallback) ─────────────────────────────────────────────────
def load_lr_model():
    lr_path    = os.path.join(MODEL_DIR, "lr_model.pkl")
    tfidf_path = os.path.join(MODEL_DIR, "tfidf_vectorizer.pkl")
    with open(lr_path, "rb") as f:
        model = pickle.load(f)
    with open(tfidf_path, "rb") as f:
        vectorizer = pickle.load(f)
    return model, vectorizer

# ── Load DistilBERT model (primary) ─────────────────────────────────────────
def load_distilbert_model():
    from transformers import DistilBertTokenizer, DistilBertForSequenceClassification
    import torch
    distilbert_path = os.path.join(MODEL_DIR, "distilbert_finetuned")
    tokenizer = DistilBertTokenizer.from_pretrained(distilbert_path)
    model = DistilBertForSequenceClassification.from_pretrained(distilbert_path)
    model.eval()
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)
    return model, tokenizer, device

# ── Aspect-specific negative/positive triggers ───────────────────────────────
ASPECT_NEGATIVE_WORDS = {
    "SIZE": ["runs small", "runs large", "too small", "too big", "too tight",
             "too loose", "doesn't fit", "does not fit", "wrong size", "too narrow",
             "too wide", "oversized", "undersized", "size down", "size up"],
    "FABRIC": ["cheap", "thin", "itchy", "rough", "scratchy", "see through",
               "pilling", "poor quality", "bad quality", "disappointed", "terrible",
               "awful", "horrible", "flimsy", "fell apart", "falling apart"],
    "STITCHING": ["fell apart", "falling apart", "loose thread", "fraying", "unraveling",
                  "terrible", "awful", "poor", "bad", "came apart", "poorly made",
                  "broke", "broken", "ripped"],
    "COLOR": ["faded", "fading", "bleeds", "wrong color", "different color",
              "not as shown", "not as pictured", "dull", "washed out"],
    "PRICE": ["expensive", "overpriced", "not worth", "too much", "way too high",
              "rip off", "ripoff", "waste of money", "poor value", "not worth it"],
    "DELIVERY": ["late", "delayed", "slow", "never arrived", "lost", "damaged",
                 "wrong item", "missing", "not received"]
}

ASPECT_POSITIVE_WORDS = {
    "SIZE": ["true to size", "fits perfectly", "perfect fit", "fits well",
         "fits great", "great fit", "fits nicely", "fits beautifully",
         "fit", "fits"],   
    "FABRIC": ["soft", "silky", "smooth", "comfortable", "comfy", "breathable",
               "stretchy", "great quality", "good quality", "luxurious", "lovely"],
    "STITCHING": ["well made", "sturdy", "durable", "great construction",
                  "solid", "excellent", "perfectly stitched"],
    "COLOR": ["beautiful", "vibrant", "bright", "vivid", "true to color",
              "as shown", "as pictured", "exactly as shown", "gorgeous", "lovely"],
    "PRICE": ["affordable", "great value", "good value", "worth it", "reasonable",
              "bargain", "great deal", "good deal"],
    "DELIVERY": ["fast", "quick", "speedy", "prompt", "on time", "early",
                 "arrived quickly", "fast shipping"]
}

GENERIC_NEGATIVE = [
    "terrible", "awful", "horrible", "worst", "bad", "poor", "disappointed",
    "disappointing", "hate", "hated", "ugly", "disgusting", "waste", "useless",
    "garbage", "trash", "pathetic", "ridiculous", "unacceptable", "annoying",
    "never again", "do not buy", "don't buy", "avoid", "returned", "returning",
    # Additional negative indicators
    "complaint", "complaints", "upset", "sadly", "disaster", "disastrous",
    "defective", "defect", "broken", "damaged", "ripped", "torn", "fell apart",
    "falling apart", "not worth", "not what", "misleading", "misrepresented",
    "false advertising", "nothing like", "looks nothing", "scam", "fraud",
    "shocked", "shocked by", "poor quality", "bad quality", "cheaply made",
    "not happy", "very unhappy", "will not buy", "would not buy", "can't recommend",
    "cannot recommend", "don't recommend", "do not recommend", "regret", "regretted",
    "refund", "sending back", "sent back", "going back", "took back", "wasted",
    "rip off", "ripoff", "robbery", "overcharged", "fell short", "let down",
    "let me down", "not impressed", "unimpressed", "wish i hadn't", "mistake"
]

GENERIC_POSITIVE = [
    "love", "loved", "amazing", "excellent", "great", "perfect", "beautiful",
    "gorgeous", "fantastic", "wonderful", "awesome", "happy", "pleased",
    "impressed", "recommend", "highly recommend", "best", "favorite", "obsessed"
]

# ── Negation handling ────────────────────────────────────────────────────────
NEGATION_WORDS = {
    "not", "no", "never", "neither", "nor", "barely", "hardly", "scarcely",
    "don't", "doesn't", "didn't", "isn't", "aren't", "wasn't", "weren't",
    "can't", "cannot", "couldn't", "won't", "wouldn't", "shouldn't",
    # contracted forms without apostrophe (typed casually)
    "dont", "doesnt", "didnt", "isnt", "arent", "wasnt", "werent",
    "cant", "couldnt", "wont", "wouldnt", "shouldnt"
}

NEGATION_WINDOW = 4  # number of words after negation word to mark as negated

# ── Intensifier words (allowed between phrase words during matching) ─────────
# e.g. "runs small" should match "runs really small", "runs very small", etc.
INTENSIFIERS = frozenset([
    "really", "very", "so", "quite", "extremely", "incredibly", "super",
    "truly", "totally", "absolutely", "pretty", "rather", "fairly",
    "awfully", "terribly", "way", "just", "even", "still"
])

# Pre-built regex fragment: 0-2 optional intensifiers between phrase words
_INTENSIFIER_OPT = (
    r'(?:(?:' +
    '|'.join(re.escape(i) for i in sorted(INTENSIFIERS)) +
    r')\s+){0,2}'
)


def get_negated_positions(text: str) -> set:
    """
    Returns a set of word indices that fall inside a negation window.
    Normalises apostrophes before tokenising.
    """
    # Normalise curly/smart apostrophes to straight
    text = text.replace("\u2019", "'").replace("\u2018", "'")
    words = re.sub(r"[.,!?;:]", "", text.lower()).split()
    negated = set()
    for i, word in enumerate(words):
        if word in NEGATION_WORDS:
            for j in range(i + 1, min(i + 1 + NEGATION_WINDOW, len(words))):
                negated.add(j)
    return negated


def is_phrase_negated(phrase: str, text: str) -> bool:
    """
    Returns True if the keyword phrase appears inside a negation window
    that was triggered by a negation word OUTSIDE (before) the phrase.
    Normalises apostrophes before matching.

    Key fix: ignore negation triggers that come from within the phrase itself.
    e.g. 'do not buy' contains 'not' at index 1, which would mark 'buy' (index 2)
    as negated — but that is the phrase's own internal negation, not an external one.
    """
    text = text.replace("\u2019", "'").replace("\u2018", "'")
    words = re.sub(r"[.,!?;:]", "", text.lower()).split()
    phrase_words = phrase.lower().split()
    phrase_len = len(phrase_words)

    for i in range(len(words) - phrase_len + 1):
        if words[i:i + phrase_len] == phrase_words:
            # Build negated positions from ONLY negation words that appear BEFORE
            # the start of this phrase instance (external negation only).
            negated_positions = set()
            for k in range(i):   # only words before phrase start
                if words[k] in NEGATION_WORDS:
                    for j in range(k + 1, min(k + 1 + NEGATION_WINDOW, len(words))):
                        negated_positions.add(j)

            # The phrase is externally negated if any of its positions fall in the window
            if any(pos in negated_positions for pos in range(i, i + phrase_len)):
                return True
    return False


def _phrase_match(phrase: str, text_lower: str):
    """
    Find phrase in text_lower, allowing up to 2 optional intensifiers between
    consecutive words (e.g. 'runs small' matches 'runs really small',
    'runs very small', 'too tight' matches 'way too tight', etc.).
    Returns the first re.Match or None.
    """
    parts = phrase.lower().split()
    if len(parts) == 1:
        return re.search(r'\b' + re.escape(parts[0]) + r'\b', text_lower)
    # Build pattern: word0  [0-2 intensifiers]  word1  [0-2 intensifiers]  word2 ...
    pattern = r'\b' + re.escape(parts[0])
    for part in parts[1:]:
        pattern += r'\s+' + _INTENSIFIER_OPT + re.escape(part)
    pattern += r'\b'
    return re.search(pattern, text_lower)


def is_match_externally_negated(match_obj, text: str) -> bool:
    """
    Returns True if the matched span is preceded (within NEGATION_WINDOW words)
    by a negation word — using the character-level match position so it works
    correctly even when the phrase was found via fuzzy/intensifier-aware matching.
    Only looks at words BEFORE the match start.
    """
    text_norm = text.replace('\u2019', "'").replace('\u2018', "'")
    # Extract everything before the match and clean punctuation
    prefix = re.sub(r'[.,!?;:]', '', text_norm[:match_obj.start()].lower())
    prefix_words = prefix.split()
    # Check the last NEGATION_WINDOW words before the match
    for word in prefix_words[-NEGATION_WINDOW:]:
        if word in NEGATION_WORDS:
            return True
    return False


# ── Rule-based sentiment ─────────────────────────────────────────────────────
def rule_based_sentiment(text: str, aspect: str):
    """
    Returns 'POSITIVE', 'NEGATIVE', or None.
    Negated positives count as negative and vice-versa.
    Phrases that already start with a negation word are never double-negated.
    Supports intensifier-tolerant phrase matching (e.g. 'runs really small'
    matches the pattern 'runs small').
    """
    # Normalise apostrophes
    text = text.replace("\u2019", "'").replace("\u2018", "'")
    text_lower = text.lower()

    neg_words = list(dict.fromkeys(ASPECT_NEGATIVE_WORDS.get(aspect, []) + GENERIC_NEGATIVE))
    pos_words = list(dict.fromkeys(ASPECT_POSITIVE_WORDS.get(aspect, []) + GENERIC_POSITIVE))

    # Collect multi-word negative phrases present in text (for overlap protection)
    # Uses fuzzy matching so "not really as shown" still activates "not as shown"
    active_neg_phrases = set()
    for w in neg_words:
        if len(w.split()) > 1 and _phrase_match(w, text_lower):
            active_neg_phrases.add(w)

    neg_hits = 0
    pos_hits = 0

    for w in neg_words:
        parts = w.split()
        weight = 1 if len(parts) == 1 else 2
        m = _phrase_match(w, text_lower)
        if not m:
            continue
        # Never double-negate a phrase that already starts with a negation word
        # e.g. "not worth", "never arrived", "not as shown" are inherently negative
        phrase_starts_with_negation = parts[0] in NEGATION_WORDS
        if not phrase_starts_with_negation and is_match_externally_negated(m, text_lower):
            pos_hits += weight   # e.g. "not terrible" → positive
        else:
            neg_hits += weight

    for w in pos_words:
        parts = w.split()
        weight = 1 if len(parts) == 1 else 2
        m = _phrase_match(w, text_lower)
        if not m:
            continue
        # Skip if a longer negative phrase already covers this positive keyword
        # e.g. skip "as shown" when "not as shown" is active
        if any(w in neg_phrase for neg_phrase in active_neg_phrases):
            continue
        if is_match_externally_negated(m, text_lower):
            neg_hits += weight   # e.g. "not soft" → negative
        else:
            pos_hits += weight

    if neg_hits > pos_hits:
        return "NEGATIVE"
    elif pos_hits > neg_hits:
        return "POSITIVE"
    return None


# ── Predict with DistilBERT ──────────────────────────────────────────────────
def predict_distilbert(text: str, model, tokenizer, device) -> Dict[str, Any]:
    import torch
    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=128,
        padding=True
    ).to(device)
    with torch.no_grad():
        outputs = model(**inputs)
    probs = torch.softmax(outputs.logits, dim=1).cpu().numpy()[0]
    pred = int(probs.argmax())
    confidence = round(float(probs.max()), 4)
    label = LABEL_MAP.get(pred, "NEUTRAL")
    return {"label": label, "confidence": confidence, "source": "distilbert"}


# ── Predict with LR (fallback) ───────────────────────────────────────────────
def predict_lr(text: str, model, vectorizer) -> Dict[str, Any]:
    cleaned = preprocess_single(text)["processed_text"]
    vec = vectorizer.transform([cleaned])
    pred = model.predict(vec)[0]
    proba = model.predict_proba(vec)[0]
    confidence = round(float(max(proba)), 4)
    label = LABEL_MAP.get(int(pred), "NEUTRAL")
    return {"label": label, "confidence": confidence, "source": "lr"}


# ── Master predict function ──────────────────────────────────────────────────
def predict_sentiment(text: str, aspect: str = None,
                      distilbert=None, tokenizer=None, device=None,
                      lr_model=None, vectorizer=None) -> Dict[str, Any]:
    # Step 1 — rule-based first
    if aspect:
        rule_label = rule_based_sentiment(text, aspect)
        if rule_label:
            return {"label": rule_label, "confidence": 1.0, "source": "rules"}

    # Step 2 — DistilBERT if loaded
    if distilbert is not None and tokenizer is not None:
        return predict_distilbert(text, distilbert, tokenizer, device)

    # Step 3 — LR fallback
    if lr_model is not None and vectorizer is not None:
        return predict_lr(text, lr_model, vectorizer)

    raise ValueError("No model loaded!")


# ── Sentence-level sentiment aggregation ─────────────────────────────────────
def aggregate_sentence_sentiments(sentence_results: List[Dict]) -> Dict[str, Any]:
    """
    Given a list of per-sentence sentiment results, aggregate by majority vote.
    Confidence is averaged across sentences with the winning label.
    """
    if not sentence_results:
        return {"label": "NEUTRAL", "confidence": 0.0, "source": "none"}

    # Count votes per label
    counts = {"POSITIVE": 0, "NEGATIVE": 0, "NEUTRAL": 0}
    conf_sum = {"POSITIVE": 0.0, "NEGATIVE": 0.0, "NEUTRAL": 0.0}

    for r in sentence_results:
        label = r["label"]
        counts[label] += 1
        conf_sum[label] += r["confidence"]

    # Winning label by majority vote
    winner = max(counts, key=lambda l: (counts[l], conf_sum[l]))

    # Average confidence of winning label's sentences
    avg_conf = round(conf_sum[winner] / counts[winner], 4) if counts[winner] > 0 else 0.0

    # Source: if any sentence used rules, mark as rules; else distilbert/lr
    sources = [r["source"] for r in sentence_results]
    source = "rules" if "rules" in sources else sources[0]

    return {
        "label": winner,
        "confidence": avg_conf,
        "source": source,
        "sentence_count": len(sentence_results),
        "votes": counts
    }


def derive_overall_sentiment(aspect_sentiments: dict) -> str:
    """
    Derives overall sentiment from aspect votes.
    Counts only POSITIVE and NEGATIVE aspects; NEUTRAL aspects are ignored unless
    there are no POS/NEG aspects.
      - No POS and no NEG -> "NEUTRAL"
      - Only POS -> "POSITIVE"
      - Only NEG -> "NEGATIVE"
      - More NEG than POS -> "NEGATIVE"
      - More POS than NEG -> "POSITIVE"
      - Equal (tie between POS and NEG) -> "NEGATIVE"
    """
    if not aspect_sentiments:
        return "NEUTRAL"

    sentiments = []
    for v in aspect_sentiments.values():
        if isinstance(v, dict):
            sentiments.append(v.get("sentiment", "NEUTRAL"))
        else:
            sentiments.append(str(v))

    pos = sentiments.count("POSITIVE")
    neg = sentiments.count("NEGATIVE")

    if neg == 0 and pos == 0:
        return "NEUTRAL"
    elif neg == 0:
        return "POSITIVE"
    elif pos == 0:
        return "NEGATIVE"
    elif neg > pos:
        return "NEGATIVE"
    elif pos > neg:
        return "POSITIVE"
    else:
        return "NEUTRAL"


# ── Analyze single review ─────────────────────────────────────────────────────
def analyze_review(review_text: str,
                   distilbert=None, tokenizer=None, device=None,
                   lr_model=None, vectorizer=None) -> Dict[str, Any]:

    detected = detect_aspects(review_text)

    # Determine model_used label
    if distilbert is not None:
        model_used = "DistilBERT + Rules"
    elif lr_model is not None:
        model_used = "LR + Rules"
    else:
        model_used = "Rules"

    results = {
        "review": review_text,
        "aspects_detected": list(detected.keys()),
        "aspect_sentiments": {},
        "model_used": model_used
    }

    if not detected:
        # ── Apply generic rule-based check FIRST before deferring to DistilBERT ──
        text_lower = review_text.lower()
        generic_neg_hits = sum(1 for w in GENERIC_NEGATIVE
                               if (m := _phrase_match(w, text_lower))
                               and not is_match_externally_negated(m, text_lower))
        generic_pos_hits = sum(1 for w in GENERIC_POSITIVE
                               if (m := _phrase_match(w, text_lower))
                               and not is_match_externally_negated(m, text_lower))

        if generic_neg_hits > generic_pos_hits:
            results["overall_sentiment"] = "NEGATIVE"
        elif generic_pos_hits > generic_neg_hits:
            results["overall_sentiment"] = "POSITIVE"
        else:
            # Fall back to DistilBERT / LR only when rules are inconclusive
            overall = predict_sentiment(review_text,
                                        distilbert=distilbert, tokenizer=tokenizer, device=device,
                                        lr_model=lr_model, vectorizer=vectorizer)
            results["overall_sentiment"] = overall["label"]
        return results

    for aspect, keywords in detected.items():
        sentences = get_aspect_sentences(review_text, aspect)

        if not sentences:
            # No specific sentence found — fall back to full review
            sentiment = predict_sentiment(
                review_text, aspect=aspect,
                distilbert=distilbert, tokenizer=tokenizer, device=device,
                lr_model=lr_model, vectorizer=vectorizer
            )
            sentence_results = [sentiment]
        else:
            # ── Sentence-level: run prediction on each sentence individually ──
            sentence_results = []
            for sentence in sentences:
                s = sentence.strip()
                if not s:
                    continue
                sent = predict_sentiment(
                    s, aspect=aspect,
                    distilbert=distilbert, tokenizer=tokenizer, device=device,
                    lr_model=lr_model, vectorizer=vectorizer
                )
                sent["sentence"] = s     # attach the sentence for transparency
                sentence_results.append(sent)

            # If all sentences were empty (edge case)
            if not sentence_results:
                sentiment = predict_sentiment(
                    review_text, aspect=aspect,
                    distilbert=distilbert, tokenizer=tokenizer, device=device,
                    lr_model=lr_model, vectorizer=vectorizer
                )
                sentence_results = [sentiment]

        # Aggregate sentence-level results into one aspect sentiment
        aggregated = aggregate_sentence_sentiments(sentence_results)

        results["aspect_sentiments"][aspect] = {
            "sentiment":      aggregated["label"],
            "confidence":     aggregated["confidence"],
            "source":         aggregated["source"],
            "keywords_found": keywords,
            "context":        " | ".join(r.get("sentence", "") for r in sentence_results),
            "sentence_count": aggregated.get("sentence_count", 1),
            "votes":          aggregated.get("votes", {})
        }

    # Derive overall_sentiment from aspect votes
    results["overall_sentiment"] = derive_overall_sentiment(results["aspect_sentiments"])

    return results


# ── Analyze batch ────────────────────────────────────────────────────────────
def analyze_batch(reviews: List[str],
                  distilbert=None, tokenizer=None, device=None,
                  lr_model=None, vectorizer=None) -> List[Dict]:
    results = []
    for i, review in enumerate(reviews):
        result = analyze_review(review,
                                distilbert=distilbert, tokenizer=tokenizer, device=device,
                                lr_model=lr_model, vectorizer=vectorizer)
        result["review_id"] = i
        results.append(result)
    return results


# ── Aspect summary ───────────────────────────────────────────────────────────
def get_aspect_summary(batch_results: List[Dict]) -> Dict[str, Dict]:
    summary = {}
    aspects = ["SIZE", "FABRIC", "STITCHING", "COLOR", "PRICE", "DELIVERY"]

    for aspect in aspects:
        counts = {"POSITIVE": 0, "NEGATIVE": 0, "NEUTRAL": 0, "total": 0}
        for result in batch_results:
            if aspect in result.get("aspect_sentiments", {}):
                label = result["aspect_sentiments"][aspect]["sentiment"]
                counts[label] += 1
                counts["total"] += 1
        if counts["total"] > 0:
            summary[aspect] = {
                "count": counts["total"],
                "positive_pct": round(counts["POSITIVE"] / counts["total"] * 100, 1),
                "negative_pct": round(counts["NEGATIVE"] / counts["total"] * 100, 1),
                "neutral_pct":  round(counts["NEUTRAL"]  / counts["total"] * 100, 1),
            }

    return summary


# ── Main test ────────────────────────────────────────────────────────────────
if __name__ == "__main__":

    # ── DEBUG: verify fixes are loaded ───────────────────────────────────────
    print("=== DEBUG ===")
    t1 = "doesn\u2019t fit well"   # curly apostrophe
    t2 = "doesn't fit well"         # straight apostrophe
    print(f"Curly apostrophe test:   '{t1}'")
    print(f"  normalized: '{t1.replace(chr(0x2019), chr(0x27))}'")
    print(f"  negated positions: {get_negated_positions(t1)}")
    print(f"  'fit' negated? {is_phrase_negated('fit', t1)}")
    print(f"Straight apostrophe test: '{t2}'")
    print(f"  negated positions: {get_negated_positions(t2)}")
    print(f"  'fit' negated? {is_phrase_negated('fit', t2)}")
    print(f"'never arrived' neg positions: {get_negated_positions('never arrived')}")
    print(f"'never' in NEGATION_WORDS: {'never' in NEGATION_WORDS}")
    print(f"NEGATION_WORDS sample: {list(NEGATION_WORDS)[:6]}")
    print()
    # ── END DEBUG ─────────────────────────────────────────────────────────────

    # ── Negation unit tests (no model needed) ────────────────────────────────
    print("=== Negation tests (rule-based only) ===")
    negation_cases = [
        ("not soft at all",           "FABRIC",    "NEGATIVE"),
        ("super soft and comfy",       "FABRIC",    "POSITIVE"),
        ("doesn't fit well",           "SIZE",      "NEGATIVE"),
        ("fits perfectly",             "SIZE",      "POSITIVE"),
        ("not worth the price",        "PRICE",     "NEGATIVE"),
        ("not overpriced at all",      "PRICE",     "POSITIVE"),
        ("not terrible stitching",     "STITCHING", "POSITIVE"),
        ("not awful, actually solid",  "STITCHING", "POSITIVE"),
        ("color is not as shown",      "COLOR",     "NEGATIVE"),
        ("never arrived",              "DELIVERY",  "NEGATIVE"),
    ]
    all_passed = True
    for text, aspect, expected in negation_cases:
        result = rule_based_sentiment(text, aspect)
        status = "✓" if result == expected else "✗ FAIL"
        if result != expected:
            all_passed = False
        print(f"  {status}  '{text}' → {result}  (expected {expected})")
    print(f"\n{'All negation tests passed!' if all_passed else 'Some tests failed — check above.'}\n")

    # ── Model loading ─────────────────────────────────────────────────────────
    print("Loading DistilBERT...")
    try:
        distilbert, tokenizer, device = load_distilbert_model()
        print(f"DistilBERT loaded! (device: {device})\n")
        lr_model, vectorizer = None, None
    except Exception as e:
        print(f"DistilBERT failed to load: {e}")
        print("Falling back to LR model...\n")
        distilbert, tokenizer, device = None, None, None
        lr_model, vectorizer = load_lr_model()
        print("LR model loaded!\n")

    # ── Regression tests for bug fixes ───────────────────────────────────────
    print("=== Regression tests (end-to-end with model) ===")
    regression_cases = [
        # FIX 1: No aspect detected + negative language → should be NEGATIVE, not NEUTRAL
        ("not at all what it looks like or is described as. sadly will be returning", "NEGATIVE"),
        ("do not buy. i'm very upset i have to pay the $5.95 return fee since i ordered this.", "NEGATIVE"),
        ("obviously they are going back tomorrow. i'm very disappointed.", "NEGATIVE"),
        ("i had been drooling over this top for awhile and was so disappointed!", "NEGATIVE"),
        # FIX 1 cont'd: positive language with no aspect → should be POSITIVE
        ("love it! amazing quality and would highly recommend.", "POSITIVE"),
        # FIX 2: Mixed pos+neg aspects tie → should lean NEGATIVE not NEUTRAL
        ("The fabric is beautiful but runs terribly small.", "NEGATIVE"),
        # Normal cases that should still work
        ("The fabric is super soft but the size runs really small. Color is beautiful!", None),  # can be anything
        ("Terrible stitching, fell apart after one wash. Price is way too high.", "NEGATIVE"),
        ("Fast delivery! The dress fits perfectly and the color is exactly as shown.", "POSITIVE"),
    ]
    reg_passed = 0
    reg_total = 0
    for text, expected_overall in regression_cases:
        result = analyze_review(text, distilbert=distilbert, tokenizer=tokenizer, device=device,
                                lr_model=lr_model, vectorizer=vectorizer)
        got = result["overall_sentiment"]
        if expected_overall is None:
            status = "–"  # no expectation
        elif got == expected_overall:
            status = "✓"
            reg_passed += 1
            reg_total += 1
        else:
            status = "✗ FAIL"
            reg_total += 1
        print(f"  {status}  '{text[:70]}...' → {got}" +
              (f"  (expected {expected_overall})" if expected_overall else ""))
    if reg_total > 0:
        print(f"\n  Passed {reg_passed}/{reg_total} regression tests.\n")

    # ── Batch analysis ────────────────────────────────────────────────────────
    test_reviews = [
        "The fabric is super soft but the size runs really small. Color is beautiful!",
        "Terrible stitching, fell apart after one wash. Price is way too high for this quality.",
        "Fast delivery! The dress fits perfectly and the color is exactly as shown.",
        "Material feels cheap and thin. Very disappointed with the overall quality.",
        # negation-heavy reviews to verify end-to-end
        "The fabric is not soft at all, feels rough and cheap.",
        "Doesn't fit well even though I ordered my usual size.",
        "Not overpriced for what you get — actually great value.",
        # Previously broken cases from CSV
        "not at all what it looks like or is described as. sadly will be returning",
        "do not buy. i'm very upset i have to pay the return fee since i ordered this.",
    ]

    print("=" * 60)
    print("ABSA RESULTS")
    print("=" * 60)

    batch_results = analyze_batch(test_reviews,
                                  distilbert=distilbert, tokenizer=tokenizer, device=device,
                                  lr_model=lr_model, vectorizer=vectorizer)

    for result in batch_results:
        print(f"\nReview: {result['review'][:80]}...")
        print(f"Aspects Found: {result['aspects_detected']}")
        for aspect, data in result["aspect_sentiments"].items():
            print(f"  {aspect}: {data['sentiment']} "
                  f"(conf: {data['confidence']}) "
                  f"[{data['source']}] "
                  f"sentences: {data.get('sentence_count', 1)} "
                  f"votes: {data.get('votes', {})}")
            print(f"    context: {data['context'][:100]}")
        print(f"  Overall: {result['overall_sentiment']}")

    print("\n" + "=" * 60)
    print("ASPECT SUMMARY ACROSS ALL REVIEWS")
    print("=" * 60)
    summary = get_aspect_summary(batch_results)
    for aspect, stats in summary.items():
        print(f"{aspect}: {stats}")

    output_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "outputs", "reports", "absa_sample_results.json"
    )
    with open(output_path, "w") as f:
        json.dump({"batch_results": batch_results, "summary": summary}, f, indent=2)
    print(f"\nResults saved to outputs/reports/absa_sample_results.json")