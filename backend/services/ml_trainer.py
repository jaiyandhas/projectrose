"""
ml_trainer.py — trains scikit-learn/XGBoost regression models on human-labeled data.

Pipeline:
  1. Fetch labeled data: manual_scores JOIN extracted_features
  2. Train one regressor per score dimension (opinion_originality, understanding, references)
  3. Save models to disk with joblib
  4. Save model version metadata to Supabase

Requires at least MIN_SAMPLES labeled examples.
Score targets now match the 30-point rubric:
  opinion_originality (0-15)
  understanding       (0-10)
  references          (0-5)
"""

import os
import json
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

from database.supabase_client import supabase

# --- Constants -----------------------------------------------------------------
MIN_SAMPLES = 10
MODEL_DIR = Path(os.getenv("MODEL_DIR", "/tmp/rose_models"))
MODEL_DIR.mkdir(parents=True, exist_ok=True)

# New rubric targets
SCORE_TARGETS = ["opinion_originality", "understanding", "references"]

# Extended feature columns (Layer 2 + Layer 3 embeddings)
FEATURE_COLS = [
    # Original spaCy features
    "word_count",
    "sentence_count",
    "avg_sentence_length",
    "tech_keyword_count",
    "keyword_density",
    "has_examples",
    "has_lists",
    "has_headings",
    "structure_connectors_count",
    "noun_count",
    "verb_count",
    "entity_count",
    "lexical_diversity",
    "structure_score",
    # Layer 2 extensions
    "citation_count",
    "has_reference_section",
    "legal_ref_count",
    "paragraph_count",
    "intro_detected",
    "conclusion_detected",
    "sub_question_keyword_hits",
    # Layer 3 embedding features (stored alongside extracted_features in DB)
    "answer_question_similarity",
    "answer_sample_similarity",
    "semantic_depth_score",
    "avg_sub_question_coverage",
]


# --- Data loading --------------------------------------------------------------

def load_training_data() -> pd.DataFrame:
    """
    Fetch all rows from `manual_scores` joined with `extracted_features`.
    Returns a DataFrame with feature columns + target score columns.
    """
    ms_resp = (
        supabase.table("manual_scores")
        .select(
            "evaluation_id, opinion_originality, understanding, references"
        )
        .execute()
    )
    if not ms_resp.data:
        return pd.DataFrame()

    ms_df = pd.DataFrame(ms_resp.data)
    eval_ids = ms_df["evaluation_id"].tolist()

    ef_resp = (
        supabase.table("extracted_features")
        .select("*")
        .in_("evaluation_id", eval_ids)
        .execute()
    )
    if not ef_resp.data:
        return pd.DataFrame()

    ef_df = pd.DataFrame(ef_resp.data)

    merged = ms_df.merge(ef_df, on="evaluation_id", how="inner")

    # Convert boolean columns to float
    bool_cols = [
        "has_examples", "has_lists", "has_headings",
        "has_reference_section", "intro_detected", "conclusion_detected",
    ]
    for col in bool_cols:
        if col in merged.columns:
            merged[col] = merged[col].astype(float)

    return merged


# --- Training ------------------------------------------------------------------

def train_models() -> dict:
    """
    Train one regressor per score dimension.
    Returns a summary dict with sample_count, r2_scores, model_paths.
    Raises ValueError if insufficient data.
    """
    df = load_training_data()

    if len(df) < MIN_SAMPLES:
        raise ValueError(
            f"Not enough labeled data to train. Need >={MIN_SAMPLES} samples, "
            f"have {len(df)}."
        )

    # Build feature matrix, only using columns that exist
    available_cols = [c for c in FEATURE_COLS if c in df.columns]
    X = df[available_cols].fillna(0).values
    results = {}

    for target in SCORE_TARGETS:
        if target not in df.columns:
            continue

        y = df[target].astype(float).values

        # Choose regressor based on dataset size
        try:
            import xgboost as xgb
            if len(df) >= 50:
                estimator = xgb.XGBRegressor(
                    n_estimators=200,
                    max_depth=4,
                    learning_rate=0.05,
                    subsample=0.8,
                    colsample_bytree=0.8,
                    random_state=42,
                    verbosity=0,
                )
            else:
                estimator = RandomForestRegressor(
                    n_estimators=100, max_depth=6, random_state=42
                )
        except ImportError:
            # XGBoost not available, use GradientBoosting
            if len(df) >= 50:
                estimator = GradientBoostingRegressor(
                    n_estimators=150, max_depth=4, learning_rate=0.1, random_state=42
                )
            else:
                estimator = RandomForestRegressor(
                    n_estimators=100, max_depth=6, random_state=42
                )

        pipe = Pipeline([
            ("scaler", StandardScaler()),
            ("model", estimator),
        ])

        # Cross-validation R2
        n_splits = min(5, len(df))
        cv_scores = cross_val_score(pipe, X, y, cv=n_splits, scoring="r2")
        r2 = float(np.mean(cv_scores))

        # Train on full dataset
        pipe.fit(X, y)

        model_path = MODEL_DIR / f"model_{target}.joblib"
        joblib.dump(pipe, model_path)

        results[target] = {
            "r2": round(r2, 4),
            "model_path": str(model_path),
            "feature_count": len(available_cols),
        }

    # Save training summary to Supabase
    _save_model_version(len(df), results)

    return {
        "sample_count": len(df),
        "scores": results,
        "model_dir": str(MODEL_DIR),
        "feature_cols": available_cols,
    }


def _save_model_version(sample_count: int, scores: dict) -> None:
    """Upsert a record into `model_versions`."""
    avg_r2 = float(np.mean([v["r2"] for v in scores.values()])) if scores else 0.0
    supabase.table("model_versions").insert({
        "sample_count": sample_count,
        "avg_r2_score": avg_r2,
        "scores_json": json.dumps(scores),
        "model_dir": str(MODEL_DIR),
    }).execute()


# --- Status -------------------------------------------------------------------

def get_training_status() -> dict:
    """Return dataset stats and latest model version info."""
    ms_resp = supabase.table("manual_scores").select("id", count="exact").execute()
    labeled_count = ms_resp.count if hasattr(ms_resp, "count") and ms_resp.count else len(ms_resp.data or [])

    mv_resp = (
        supabase.table("model_versions")
        .select("*")
        .order("trained_at", desc=True)
        .limit(1)
        .execute()
    )

    model_info = mv_resp.data[0] if mv_resp.data else None
    models_ready = all(
        (MODEL_DIR / f"model_{t}.joblib").exists() for t in SCORE_TARGETS
    )

    return {
        "labeled_count": labeled_count,
        "min_required": MIN_SAMPLES,
        "can_train": labeled_count >= MIN_SAMPLES,
        "models_ready": models_ready,
        "latest_model": model_info,
    }
