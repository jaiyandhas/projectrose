"""
hybrid_engine.py — Master Orchestrator (Layers 1-5)

Runs the full 5-layer evaluation pipeline:

  Layer 1: AI Detection          (ai_detector.py)
  Layer 2: Feature Extraction    (feature_extractor.py)
  Layer 3: Embedding Similarity  (embedding_engine.py)
  Layer 4: ML Regression         (ml_predictor.py)
  Layer 5: Hard Cap Enforcement  (deterministic rule)

Returns:
    HybridResult dict with all scores + metadata
"""

from __future__ import annotations

import logging
from typing import Optional

from services.ai_detector import detect_ai
from services.feature_extractor import extract_features
from services.embedding_engine import compute_embedding_features
from services.ml_predictor import predict_scores

logger = logging.getLogger(__name__)


# ── Fallback deterministic scorer ─────────────────────────────────────────────
# Used when no ML models are trained yet (< MIN_SAMPLES labeled examples).
# Produces a reasonable score from pure features + embeddings so the API
# is always functional.

def _deterministic_score(features: dict, emb: dict) -> dict:
    """
    Rule-based score estimation (0-30 total).
    Returns {"opinion_originality": float, "understanding": float, "references": float}
    """
    # ── opinion_originality (0-15) ──────────────────────────────────────────
    # Signals: lexical diversity, examples, structure connectors, embedding depth
    lex_div    = features.get("lexical_diversity", 0.5)        # 0-1
    has_ex     = 1.0 if features.get("has_examples") else 0.0
    connectors = min(features.get("structure_connectors_count", 0), 5) / 5.0
    depth      = emb.get("semantic_depth_score", 0.5)           # 0-1

    opinion_raw = (
        lex_div    * 5.0 +   # max 5
        has_ex     * 3.0 +   # max 3
        connectors * 3.0 +   # max 3
        depth      * 4.0     # max 4
    )
    opinion_originality = min(15.0, max(0.0, opinion_raw))

    # ── understanding (0-10) ───────────────────────────────────────────────
    # Signals: keyword density, question-answer similarity, entity count, techkw
    aq_sim      = emb.get("answer_question_similarity", 0.5)    # 0-1
    tech_kw     = min(features.get("tech_keyword_count", 0), 10) / 10.0
    entity_rich = min(features.get("entity_count", 0), 8) / 8.0
    sub_cov     = emb.get("avg_sub_question_coverage", aq_sim) # 0-1

    understanding_raw = (
        aq_sim      * 4.0 +   # max 4
        tech_kw     * 2.5 +   # max 2.5
        entity_rich * 1.5 +   # max 1.5
        sub_cov     * 2.0     # max 2
    )
    understanding = min(10.0, max(0.0, understanding_raw))

    # ── references (0-5) ──────────────────────────────────────────────────
    # Signals: citation count, reference section, legal refs, sample similarity
    citations   = min(features.get("citation_count", 0), 3) / 3.0
    has_refs    = 1.0 if features.get("has_reference_section") else 0.0
    legal_refs  = min(features.get("legal_ref_count", 0), 3) / 3.0
    samp_sim    = emb.get("answer_sample_similarity", 0.0)

    references_raw = (
        citations   * 2.0 +   # max 2
        has_refs    * 1.5 +   # max 1.5
        legal_refs  * 1.0 +   # max 1
        samp_sim    * 0.5     # max 0.5
    )
    references = min(5.0, max(0.0, references_raw))

    return {
        "opinion_originality": round(opinion_originality, 2),
        "understanding":       round(understanding, 2),
        "references":          round(references, 2),
    }


# ── Main pipeline ──────────────────────────────────────────────────────────────

def run_hybrid_evaluation(
    question: str,
    answer: str,
    sample_answer: Optional[str] = None,
) -> dict:
    """
    Run the full 5-layer hybrid evaluation pipeline.

    Returns a dict with:
        ai_probability          : float (0-1)
        ai_detection_method     : "openai" | "heuristic"
        ai_detection_signals    : dict (debug)
        features                : dict (Layer 2)
        embedding_features      : dict (Layer 3)
        opinion_originality     : float (0-15)
        understanding           : float (0-10)
        references              : float (0-5)
        overall_score           : float (0-30)
        ml_used                 : bool
        max_allowed             : int   (5 if AI detected, else 30)
    """

    # ── Layer 1: AI Detection ──────────────────────────────────────────────
    ai_result = detect_ai(answer)
    ai_prob = ai_result["ai_probability"]

    # Log borderline cases for later analysis without changing the rule.
    if 0.65 <= ai_prob <= 0.85:
        logger.info("Borderline AI probability: %.4f", ai_prob)

    max_allowed = 5 if ai_prob > 0.75 else 30

    # ── Layer 2: Feature Extraction ───────────────────────────────────────
    features = extract_features(answer, question)

    # ── Layer 3: Embedding Similarity ─────────────────────────────────────
    emb_features = compute_embedding_features(answer, question, sample_answer)

    # ── Layer 4: ML Regression ────────────────────────────────────────────
    combined_features = {**features, **emb_features}
    ml_scores = predict_scores(combined_features)
    ml_used   = ml_scores is not None

    if ml_used:
        opinion_originality = float(ml_scores.get("opinion_originality", 0) or 0)
        understanding       = float(ml_scores.get("understanding", 0) or 0)
        references          = float(ml_scores.get("references", 0) or 0)
        # Clamp to rubric ranges
        opinion_originality = round(min(15.0, max(0.0, opinion_originality)), 2)
        understanding       = round(min(10.0, max(0.0, understanding)), 2)
        references          = round(min(5.0,  max(0.0, references)), 2)
    else:
        # Fallback deterministic scoring
        det = _deterministic_score(features, emb_features)
        opinion_originality = det["opinion_originality"]
        understanding       = det["understanding"]
        references          = det["references"]

    # ── Layer 5: Hard Cap Enforcement ────────────────────────────────────
    raw_total    = opinion_originality + understanding + references
    overall_score = round(min(float(max_allowed), raw_total), 2)

    return {
        # AI detection
        "ai_probability":       round(ai_prob, 4),
        "ai_detection_method":  ai_result["method"],
        "ai_detection_signals": ai_result.get("signals", {}),
        # Feature layers (full detail for training storage)
        "features":             features,
        "embedding_features":   emb_features,
        # Rubric sub-scores
        "opinion_originality":  opinion_originality,
        "understanding":        understanding,
        "references":           references,
        # Final
        "overall_score":        overall_score,
        "ml_used":              ml_used,
        "max_allowed":          max_allowed,
    }
