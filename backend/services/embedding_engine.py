"""
embedding_engine.py — Layer 3: Local Embedding Similarity

Uses sentence-transformers `all-MiniLM-L6-v2`:
  - ~90 MB, downloads once, cached at ~/.cache/huggingface/
  - Runs on CPU, no GPU required
  - 384-dim vectors, cosine similarity

Public API:
    embed(text) -> np.ndarray
    cosine_sim(a, b) -> float
    compute_embedding_features(answer, question, sample_answer=None) -> dict
"""

from __future__ import annotations

import numpy as np
from typing import Optional

# Lazy-load the model once (first call triggers download if not cached)
_model = None


def _get_model():
    global _model
    if _model is not None:
        return _model
    from sentence_transformers import SentenceTransformer
    _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


# ── Core ops ──────────────────────────────────────────────────────────────────

def embed(text: str) -> np.ndarray:
    """Encode text to a 384-dim L2-normalised vector."""
    model = _get_model()
    vec = model.encode(text, normalize_embeddings=True)
    return vec


def cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity for pre-normalised vectors (just dot product)."""
    return float(np.clip(np.dot(a, b), 0.0, 1.0))


# ── Feature computation ───────────────────────────────────────────────────────

def compute_embedding_features(
    answer: str,
    question: str,
    sample_answer: Optional[str] = None,
) -> dict:
    """
    Compute embedding-based semantic features.

    Returns:
        answer_question_similarity  : how well answer covers the question (0–1)
        answer_sample_similarity    : similarity to reference answer (0 if absent)
        semantic_depth_score        : proxy for depth — answer diverges from question
                                      meaningfully (0–1; middle values = deep)
        sub_question_similarities   : list of sims for each sub-question (if '?' split)
        avg_sub_question_coverage   : mean sub-question coverage (0–1)
    """
    if not answer.strip() or not question.strip():
        return _zero_features()

    ans_vec = embed(answer)
    q_vec   = embed(question)

    answer_question_sim = cosine_sim(ans_vec, q_vec)

    # Sample similarity
    answer_sample_sim = 0.0
    if sample_answer and sample_answer.strip():
        samp_vec = embed(sample_answer)
        answer_sample_sim = cosine_sim(ans_vec, samp_vec)

    # Semantic depth: we want an answer that is strongly related to the question
    # but NOT a mere paraphrase of it. A perfectly overlapping answer might be
    # shallow; a too-distant answer is off-topic. Golden zone: 0.4 – 0.8.
    # Score peaks at sim=0.65, falls off below 0.3 and near 1.0.
    raw_depth = 1.0 - abs(answer_question_sim - 0.65) / 0.65
    semantic_depth_score = round(max(0.0, min(1.0, raw_depth)), 4)

    # Sub-question coverage: split on '?' or numbered sub-questions
    sub_questions = _extract_sub_questions(question)
    sub_sims = []
    for sq in sub_questions:
        sq_vec = embed(sq)
        sub_sims.append(cosine_sim(ans_vec, sq_vec))

    avg_sub_cov = float(np.mean(sub_sims)) if sub_sims else answer_question_sim

    return {
        "answer_question_similarity": round(answer_question_sim, 4),
        "answer_sample_similarity":   round(answer_sample_sim, 4),
        "semantic_depth_score":       semantic_depth_score,
        "sub_question_count":         len(sub_questions),
        "avg_sub_question_coverage":  round(avg_sub_cov, 4),
    }


def _extract_sub_questions(question: str) -> list[str]:
    """
    Split question into sub-questions by '?' boundaries or numbered parts.
    Returns a list with at least the full question as fallback.
    """
    import re
    # Split on question marks
    parts = [p.strip() for p in re.split(r"\?", question) if p.strip()]
    if len(parts) > 1:
        return parts[:5]  # cap at 5 sub-questions

    # Split on numbered parts: (a), (b), 1. 2.
    parts = re.split(r"(?:^|\s)(?:\(?\b[abci]\b\)?|\d+\.)\s+", question)
    parts = [p.strip() for p in parts if p.strip() and len(p.split()) > 3]
    if len(parts) > 1:
        return parts[:5]

    return [question]  # single question


def _zero_features() -> dict:
    return {
        "answer_question_similarity": 0.0,
        "answer_sample_similarity":   0.0,
        "semantic_depth_score":       0.0,
        "sub_question_count":         0,
        "avg_sub_question_coverage":  0.0,
    }
