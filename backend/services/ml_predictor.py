"""
ml_predictor.py — loads trained Rose models and generates score predictions.

Falls back gracefully (returns None) if no models have been trained yet.
Now predicts the 30-point rubric: opinion_originality, understanding, references.
"""

import os
from pathlib import Path
from typing import Optional

import joblib
import numpy as np

from services.ml_trainer import MODEL_DIR, FEATURE_COLS, SCORE_TARGETS

# Cache loaded models in-process
_MODEL_CACHE: dict = {}


def _load_model(target: str):
    """Load a model from disk, with in-process cache."""
    if target in _MODEL_CACHE:
        return _MODEL_CACHE[target]

    model_path = MODEL_DIR / f"model_{target}.joblib"
    if not model_path.exists():
        return None

    pipe = joblib.load(model_path)
    _MODEL_CACHE[target] = pipe
    return pipe


def predict_scores(features: dict) -> Optional[dict]:
    """
    Given a combined feature dict (spaCy + embedding features merged),
    return predicted scores for each rubric dimension.

    Returns None if no models are available yet.
    """
    # Build feature vector in the fixed column order
    try:
        x = np.array([[
            float(features.get(col, 0) or 0)
            for col in FEATURE_COLS
        ]])
    except Exception:
        return None

    predictions = {}
    any_loaded = False

    # Rubric clamp ranges per target
    clamp_ranges = {
        "opinion_originality": (0.0, 15.0),
        "understanding":       (0.0, 10.0),
        "references":          (0.0,  5.0),
    }

    for target in SCORE_TARGETS:
        model = _load_model(target)
        if model is None:
            predictions[target] = None
        else:
            any_loaded = True
            raw = float(model.predict(x)[0])
            lo, hi = clamp_ranges.get(target, (0.0, 15.0))
            predictions[target] = round(max(lo, min(hi, raw)), 2)

    return predictions if any_loaded else None


def invalidate_cache() -> None:
    """Call this after retraining to force model reload."""
    global _MODEL_CACHE
    _MODEL_CACHE = {}
