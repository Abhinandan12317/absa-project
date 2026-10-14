import sys
import os

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Disable network calls in nltk during test runs
try:
    import nltk
    nltk.download = lambda *args, **kwargs: True
except Exception:
    pass
