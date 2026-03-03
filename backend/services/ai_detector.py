"""
ai_detector.py — Layer 1: AI Detection

Primary:  OpenAI text classification via /v1/moderations endpoint
          (fast, essentially free, uses OPENAI_API_KEY from .env)
Fallback: Fully offline heuristic using perplexity proxies:
          - sentence length variance  (AI text is uniform)
          - repetition ratio           (AI repeats phrases)
          - unique bigram density      (AI is less diverse)
          - avg word length            (AI prefers longer words)

Returns:
    {
        "ai_probability": float,   # 0.0 – 1.0
        "method": "openai" | "heuristic",
        "signals": dict            # debug breakdown
    }
"""

from __future__ import annotations

import os
import re
import math
from typing import Optional
from collections import Counter
from dotenv import load_dotenv

load_dotenv()

# ── OpenAI (optional) ─────────────────────────────────────────────────────────
_openai_client = None


def _offline_mode_enabled() -> bool:
    """Return True if OFFLINE_MODE is enabled via env var."""
    return os.getenv("OFFLINE_MODE", "").strip().lower() in {"1", "true", "yes"}


def _get_openai_client():
    global _openai_client
    if _offline_mode_enabled():
        return None
    if _openai_client is not None:
        return _openai_client
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        return None
    try:
        from openai import OpenAI
        _openai_client = OpenAI(api_key=api_key)
        return _openai_client
    except Exception:
        return None


# ── Heuristic helpers ──────────────────────────────────────────────────────────

def _sentence_lengths(text: str) -> list[int]:
    """Split text into sentences and return list of word counts per sentence."""
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    return [len(s.split()) for s in sentences if s.strip()]


def _repetition_ratio(text: str) -> float:
    """Ratio of repeated 4-grams to total 4-grams. High → AI-like repetition."""
    words = text.lower().split()
    if len(words) < 8:
        return 0.0
    fourgrams = [tuple(words[i:i+4]) for i in range(len(words) - 3)]
    counts = Counter(fourgrams)
    repeated = sum(v - 1 for v in counts.values() if v > 1)
    return min(1.0, repeated / max(len(fourgrams), 1))


def _unique_bigram_density(text: str) -> float:
    """Higher → more diverse vocabulary (human-like). Lower → AI-like."""
    words = text.lower().split()
    if len(words) < 4:
        return 1.0
    bigrams = [tuple(words[i:i+2]) for i in range(len(words) - 1)]
    return len(set(bigrams)) / max(len(bigrams), 1)


def _variance(nums: list[float]) -> float:
    if len(nums) < 2:
        return 0.0
    mean = sum(nums) / len(nums)
    return sum((x - mean) ** 2 for x in nums) / len(nums)


def _heuristic_ai_probability(text: str) -> tuple[float, dict]:
    """
    Compute AI probability using offline signals.
    Returns (probability, signals_dict).
    """
    lengths = _sentence_lengths(text)
    length_var = _variance([float(l) for l in lengths]) if lengths else 0.0
    rep_ratio = _repetition_ratio(text)
    bigram_density = _unique_bigram_density(text)
    avg_word_len = sum(len(w) for w in text.split()) / max(len(text.split()), 1)

    # AI text tends to be: uniform sentence length, repetitive, less bigram diverse
    # Normalize and weight:
    #   low variance (< 5)  → suspicious
    #   high rep ratio (> 0.1) → suspicious
    #   low bigram density (< 0.5) → suspicious
    #   avg word len > 6 → slightly suspicious (formal AI prose)

    var_score = max(0.0, 1.0 - (length_var / 30.0))        # 0=diverse, 1=uniform
    rep_score = min(1.0, rep_ratio * 5.0)                   # 0=no repeat, 1=very repetitive
    bigram_score = max(0.0, 1.0 - bigram_density)           # 0=diverse, 1=repetitive
    word_len_score = min(1.0, max(0.0, (avg_word_len - 4.0) / 4.0))

    # Weighted average
    ai_prob = (
        var_score    * 0.30 +
        rep_score    * 0.35 +
        bigram_score * 0.25 +
        word_len_score * 0.10
    )

    signals = {
        "sentence_length_variance": round(length_var, 2),
        "repetition_ratio": round(rep_ratio, 4),
        "unique_bigram_density": round(bigram_density, 4),
        "avg_word_length": round(avg_word_len, 2),
        "var_score": round(var_score, 3),
        "rep_score": round(rep_score, 3),
        "bigram_score": round(bigram_score, 3),
    }

    return round(min(1.0, max(0.0, ai_prob)), 4), signals


# ── OpenAI-based detection ─────────────────────────────────────────────────────

def _openai_ai_probability(text: str) -> Optional[float]:
    """
    Use OpenAI's moderation API as a proxy for AI-generated content.
    The moderation endpoint returns category scores — we use the overall
    'flagged' level as a weak proxy + a lightweight classification approach.

    Returns a float 0–1 or None if unavailable.
    """
    if _offline_mode_enabled():
        return None

    client = _get_openai_client()
    if client is None:
        return None

    try:
        # Use chat completions to estimate AI origin (classification prompt)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0,
            max_tokens=10,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an AI text detector. Given a text, output ONLY a JSON number "
                        "between 0.0 and 1.0 representing the probability that the text was "
                        "written by an AI (1.0 = certainly AI, 0.0 = certainly human). "
                        "Output ONLY the number, nothing else."
                    ),
                },
                {
                    "role": "user",
                    "content": text[:2000],  # cap to save tokens
                },
            ],
        )
        raw = response.choices[0].message.content.strip()
        return round(float(raw), 4)
    except Exception:
        return None


def _combine_probabilities(heuristic_prob: float, openai_prob: Optional[float]) -> float:
    """
    Combine heuristic and OpenAI probabilities into a single stable estimate.

    Heuristic signal is treated as primary; OpenAI is an auxiliary signal.
    """
    if openai_prob is None:
        return max(0.0, min(1.0, heuristic_prob))

    # Weighted average with heuristic as the anchor signal.
    combined = 0.7 * heuristic_prob + 0.3 * openai_prob
    return max(0.0, min(1.0, combined))


# ── Public API ─────────────────────────────────────────────────────────────────

def detect_ai(answer_text: str) -> dict:
    """
    Detect whether an answer was AI-generated.

    Returns:
        {
            "ai_probability": float,
            "method": "openai" | "heuristic",
            "signals": dict
        }
    """
    if not answer_text or not answer_text.strip():
        return {"ai_probability": 0.0, "method": "heuristic", "signals": {}}

    # Always compute deterministic heuristic first.
    heuristic_prob, signals = _heuristic_ai_probability(answer_text)

    # Optionally enhance with OpenAI-based estimate, if available and not offline.
    openai_prob = _openai_ai_probability(answer_text)
    combined_prob = _combine_probabilities(heuristic_prob, openai_prob)

    signals["heuristic_score"] = heuristic_prob
    if openai_prob is not None:
        signals["openai_score"] = openai_prob
        signals["combined_score"] = combined_prob
        method = "hybrid"
    else:
        method = "heuristic"

    return {
        "ai_probability": round(combined_prob, 4),
        "method": method,
        "signals": signals,
    }
