import re
from typing import Dict, List, Tuple

# Aspect keyword dictionary
ASPECT_KEYWORDS = {
    "SIZE": [
        "size", "sizing", "fit", "fits", "fitted", "fitting", "small", "large",
        "tight", "loose", "big", "huge", "tiny", "oversized", "undersized",
        "true to size", "runs small", "runs large", "petite", "plus size",
        "length", "short", "long", "narrow", "wide", "roomy", "snug"
    ],
    "FABRIC": [
        "fabric", "material", "cloth", "textile", "feel", "soft", "silky",
        "smooth", "rough", "coarse", "itchy", "comfortable", "comfy",
        "breathable", "stretchy", "stretch", "cotton", "polyester", "linen",
        "wool", "synthetic", "thin", "thick", "sheer", "lightweight",
        "heavyweight", "texture", "feels", "wearing"
    ],
    "STITCHING": [
        "stitch", "stitching", "seam", "seams", "sewing", "sewn", "hem",
        "hemming", "thread", "construction", "built", "well made", "poorly made",
        "falling apart", "unraveling", "loose thread", "fraying", "durable",
        "sturdy", "craftsmanship", "workmanship", "finished", "lining",
        # NEW: hardware and fasteners
        "zipper", "zippers", "button", "buttons", "snap", "snaps",
        "buckle", "buckles", "clasp", "hook", "hooks",
        # NEW: quality signals
        "pilling", "pills", "quality", "well-made", "poorly-constructed",
        "came apart", "fell apart", "came undone", "unstitched",
        "loose seam", "burst seam", "split seam", "intact", "holds up",
        "held up", "coming apart", "coming undone"
    ],
    "COLOR": [
        "color", "colour", "shade", "hue", "vibrant", "bright", "dark", "light",
        "faded", "dull", "vivid", "rich", "pale", "accurate", "true to color",
        "as pictured", "as shown", "different color", "bleeds", "fading",
        "pattern", "print", "floral", "stripe", "check", "solid"
    ],
    "PRICE": [
        "price", "cost", "worth", "value", "expensive", "cheap", "affordable",
        "overpriced", "underpriced", "budget", "pricey", "reasonable", "deal",
        "bargain", "money", "pay", "paid", "spend", "spent", "investment",
        "good value", "poor value", "bang for", "dollar",
        # NEW: price-specific signals
        "costly", "priced", "markup", "sale", "discount", "discounted",
        "on sale", "clearance", "steal", "rip off", "ripoff", "robbery",
        "not worth", "well worth", "wallet", "pocket", "splurge",
        "splurged", "regret buying", "worth every"
    ],
    "DELIVERY": [
        "delivery", "shipping", "shipped", "arrived", "arrival", "package",
        "packaging", "courier", "fast delivery", "slow delivery", "on time",
        "delayed", "delay", "tracking", "dispatch", "dispatched", "received",
        "transit", "days to arrive", "quick ship", "fast", "quick", "speedy",
        "slow", "prompt", "rapid", "swift", "late", "early", "overnight",
        "express", "return", "refund", "exchange", "lost", "damaged in transit"
    ]
}

# These words only count if a strong anchor keyword is nearby (within same sentence)
CONTEXT_DEPENDENT = {
    "DELIVERY": {
        "weak": ["fast", "quick", "speedy", "slow", "prompt", "rapid", "swift", "late", "early"],
        "anchors": ["delivery", "shipping", "shipped", "arrived", "arrival", "package",
                    "courier", "dispatch", "dispatched", "received", "transit"]
    },
    "FABRIC": {
        "weak": ["soft", "rough", "thin", "thick", "smooth", "comfortable", "comfy", "itchy"],
        "anchors": ["fabric", "material", "cloth", "textile", "cotton", "polyester", "linen", "wool"]
    },
    # NEW: guard generic words from polluting STITCHING
    "STITCHING": {
        "weak": ["built", "finished", "durable", "sturdy", "construction", "quality",
                 "pilling", "pills", "intact", "holds up", "held up"],
        "anchors": ["stitch", "stitching", "seam", "seams", "hem", "hemming", "thread",
                    "zipper", "zippers", "button", "buttons", "sewing", "sewn",
                    "lining", "craftsmanship", "workmanship", "fraying", "unraveling",
                    "falling apart", "came apart", "fell apart", "came undone",
                    "well made", "poorly made"]
    },
    # NEW: guard generic words from polluting PRICE
    "PRICE": {
        "weak": ["worth", "value", "deal", "bargain", "cheap", "budget", "investment",
                 "sale", "discount", "discounted", "splurge", "splurged"],
        "anchors": ["price", "cost", "expensive", "affordable", "overpriced", "underpriced",
                    "pricey", "reasonable", "money", "pay", "paid", "spend", "spent",
                    "dollar", "costly", "priced", "markup", "clearance", "steal",
                    "rip off", "ripoff", "robbery", "wallet", "pocket", "bang for",
                    "good value", "poor value", "not worth", "well worth", "worth every",
                    "regret buying"]
    }
}


def _has_anchor_nearby(sentence: str, anchors: List[str]) -> bool:
    """Check if any anchor word exists in the same sentence."""
    sentence_lower = sentence.lower()
    for anchor in anchors:
        if re.search(r'\b' + re.escape(anchor) + r'\b', sentence_lower):
            return True
    return False


def detect_aspects(text: str) -> Dict[str, List[str]]:
    """
    Detect which aspects are mentioned in a review.
    Returns dict of aspect -> list of matched keywords found.
    """
    text_lower = text.lower()
    sentences = re.split(r'[.!?]+', text)
    detected = {}

    for aspect, keywords in ASPECT_KEYWORDS.items():
        matched = []
        context_dep = CONTEXT_DEPENDENT.get(aspect, {})
        weak_words = context_dep.get("weak", [])
        anchors = context_dep.get("anchors", [])

        for keyword in keywords:
            pattern = r'\b' + re.escape(keyword) + r'\b'

            if keyword in weak_words:
                # Only match if anchor is in the same sentence
                for sentence in sentences:
                    if re.search(pattern, sentence.lower()):
                        if _has_anchor_nearby(sentence, anchors):
                            matched.append(keyword)
                            break
            else:
                if re.search(pattern, text_lower):
                    matched.append(keyword)

        if matched:
            detected[aspect] = matched

    return detected


def get_aspect_sentences(text: str, aspect: str) -> List[str]:
    """
    Extract sentences from review that mention a specific aspect.
    """
    keywords = ASPECT_KEYWORDS.get(aspect, [])
    sentences = re.split(r'[.!?]+', text)
    relevant = []

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        sentence_lower = sentence.lower()
        for keyword in keywords:
            pattern = r'\b' + re.escape(keyword) + r'\b'
            if re.search(pattern, sentence_lower):
                relevant.append(sentence)
                break  # avoid duplicates per sentence

    return relevant


def get_detected_aspect_list(text: str) -> List[str]:
    """
    Returns just the list of detected aspect names for a review.
    Example: ["SIZE", "FABRIC", "COLOR"]
    """
    detected = detect_aspects(text)
    return list(detected.keys())


# ── Quick test ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    sample = (
        "The fabric is super soft and comfortable, but the size runs really small. "
        "Color looks exactly as shown in the picture. Delivery was fast too!"
    )
    print("=== Basic test ===")
    print("Review:", sample)
    detected = detect_aspects(sample)
    print("Detected Aspects:")
    for aspect, keywords in detected.items():
        print(f"  {aspect}: {keywords}")

    print()
    print("=== STITCHING tests ===")

    # Should detect STITCHING — strong anchors present
    s1 = "The zipper broke after one use and the seams are already fraying."
    print(f"'{s1}'")
    print("  →", detect_aspects(s1))

    s2 = "Buttons fell off within a week, terrible craftsmanship."
    print(f"'{s2}'")
    print("  →", detect_aspects(s2))

    s3 = "The stitching is neat and the lining feels premium."
    print(f"'{s3}'")
    print("  →", detect_aspects(s3))

    # Should NOT detect STITCHING — "quality" alone is too generic
    s4 = "Great quality overall, I love this dress."
    print(f"'{s4}'")
    print("  →", detect_aspects(s4), "  ← STITCHING should NOT appear")

    print()
    print("=== PRICE tests ===")

    # Should detect PRICE — strong signals
    p1 = "This is a total rip off, not worth the price at all."
    print(f"'{p1}'")
    print("  →", detect_aspects(p1))

    p2 = "Got it on sale and it was an absolute steal, worth every penny."
    print(f"'{p2}'")
    print("  →", detect_aspects(p2))

    p3 = "Very costly for what you get, expected better quality for this markup."
    print(f"'{p3}'")
    print("  →", detect_aspects(p3))

    # Should NOT trigger PRICE — "deal" alone without price context
    p4 = "The color fades fast after one wash, bad deal."
    print(f"'{p4}'")
    print("  →", detect_aspects(p4), "  ← check: 'deal' needs price anchor")

    print()
    print("=== Edge case: 'fast' should NOT be DELIVERY ===")
    edge = "The color fades fast after one wash."
    print(f"'{edge}'")
    print("  →", detect_aspects(edge), "  ← COLOR only, NOT DELIVERY")