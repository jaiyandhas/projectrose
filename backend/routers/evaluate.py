"""
evaluate.py — Main evaluation endpoint.

Now calls the 5-layer HybridEngine for scoring.
Gemini is called in parallel (fire-and-forget pattern) for feedback text only.
If Gemini fails, deterministic feedback is returned as fallback.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from database.supabase_client import supabase
from models.schemas import EvaluateRequest, HybridEvaluationResult, FeedbackDetail
from routers.auth import get_current_user
from services.hybrid_engine import run_hybrid_evaluation
from services.ai_evaluator import evaluate_answer as gemini_feedback
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter(prefix="/api", tags=["evaluate"])
limiter = Limiter(key_func=get_remote_address)


def _get_gemini_feedback(question: str, answer: str, sample_answer) -> FeedbackDetail:
    """
    Call Gemini for qualitative feedback text only.
    If it fails, return a deterministic fallback so scoring always completes.
    """
    try:
        result = gemini_feedback(
            question=question,
            answer=answer,
            sample_answer=sample_answer,
        )
        fb = result.get("feedback", {})
        return FeedbackDetail(
            strengths=fb.get("strengths", []),
            missing_points=fb.get("missing_points", []),
            improvements=fb.get("improvements", []),
            summary=fb.get("summary", ""),
        )
    except Exception:
        # Deterministic fallback — Gemini is optional here
        return FeedbackDetail(
            strengths=["Answer submitted for evaluation."],
            missing_points=["Automatic feedback unavailable — manual review recommended."],
            improvements=["Add more technical depth and references."],
            summary="Hybrid engine scored this answer. Qualitative feedback unavailable.",
        )


@router.post("/evaluate", response_model=HybridEvaluationResult)
@limiter.limit("10/hour")
async def evaluate(
    request: Request,
    body: EvaluateRequest,
    user: dict = Depends(get_current_user),
):
    """
    Submit an answer for hybrid evaluation.
    
    Runs the full 5-layer pipeline:
      1. AI Detection
      2. Feature Extraction (deterministic)
      3. Embedding Similarity (local MiniLM)
      4. ML Regression (if trained)
      5. Hard Cap (AI > 0.75 → max 5)

    Rate-limited to 10 per hour per IP.
    """
    user_id = user["user_id"]

    # ── Run the full hybrid pipeline ─────────────────────────────────────
    try:
        hybrid = run_hybrid_evaluation(
            question=body.question_text,
            answer=body.answer_text,
            sample_answer=body.sample_answer_text,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Hybrid engine error: {exc}",
        )

    # ── Get qualitative feedback from Gemini (text only, doesn't affect score) ──
    feedback = _get_gemini_feedback(
        body.question_text, body.answer_text, body.sample_answer_text
    )

    # ── Persist to Supabase ───────────────────────────────────────────────
    # Use legacy-friendly columns so it works with existing schema.
    record = {
        "user_id": user_id,
        "question_text": body.question_text,
        "answer_text": body.answer_text,
        "sample_answer_text": body.sample_answer_text,
        # Final score (0–30)
        "overall_score": hybrid["overall_score"],
        # Legacy 0–10 rubric fields used by history/analytics
        "originality_score": round(hybrid["opinion_originality"] / 1.5, 2),
        "ai_usage_score": round(hybrid["understanding"], 2),
        "coverage_score": round(hybrid["references"] * 2, 2),
        # Store full feedback JSON
        "feedback_json": feedback.model_dump(),
    }

    resp = supabase.table("evaluations").insert(record).execute()

    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to save evaluation")

    saved = resp.data[0]

    return HybridEvaluationResult(
        id=saved["id"],
        question_text=saved["question_text"],
        answer_text=saved["answer_text"],
        sample_answer_text=saved.get("sample_answer_text"),
        ai_probability=hybrid["ai_probability"],
        ai_detection_method="hybrid",
        opinion_originality_score=hybrid["opinion_originality"],
        understanding_score=hybrid["understanding"],
        references_score=hybrid["references"],
        overall_score=saved["overall_score"],
        answer_question_similarity=hybrid["embedding_features"].get("answer_question_similarity", 0.0),
        ml_used=hybrid["ml_used"],
        max_allowed=hybrid["max_allowed"],
        feedback=feedback,
        created_at=saved["created_at"],
    )
