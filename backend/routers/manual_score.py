"""
manual_score.py — API endpoints for human-labeled score submission.

POST /api/manual-score
  - Auth protected
  - Saves human scores to `manual_scores`
  - Triggers feature extraction → saves to `extracted_features`
"""

from fastapi import APIRouter, Depends, HTTPException, status
from database.supabase_client import supabase
from models.schemas import ManualScoreRequest, ManualScoreResponse
from routers.auth import get_current_user
from services.feature_extractor import extract_features

router = APIRouter(prefix="/api", tags=["manual-score"])


@router.post("/manual-score", response_model=ManualScoreResponse, status_code=status.HTTP_201_CREATED)
async def submit_manual_score(
    body: ManualScoreRequest,
    user: dict = Depends(get_current_user),
):
    """
    Submit a human score for an evaluation.
    Also triggers NLP feature extraction on the answer text.
    """
    user_id = user["user_id"]

    # Verify the evaluation belongs to this user
    eval_resp = (
        supabase.table("evaluations")
        .select("id, answer_text, question_text")
        .eq("id", body.evaluation_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )

    if not eval_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation not found or does not belong to you.",
        )

    evaluation = eval_resp.data
    answer_text = evaluation["answer_text"]
    question_text = evaluation["question_text"]

    # Save human scores (upsert by evaluation_id)
    score_record = {
        "evaluation_id": body.evaluation_id,
        "user_id": user_id,
        "concept_coverage": body.concept_coverage,
        "technical_depth": body.technical_depth,
        "clarity": body.clarity,
        "originality": body.originality,
        "notes": body.notes,
    }

    ms_resp = (
        supabase.table("manual_scores")
        .upsert(score_record, on_conflict="evaluation_id")
        .execute()
    )

    if not ms_resp.data:
        raise HTTPException(status_code=500, detail="Failed to save manual score.")

    # Extract and save NLP features
    try:
        features = extract_features(answer_text, question_text)
        feature_record = {
            "evaluation_id": body.evaluation_id,
            **features,
        }
        supabase.table("extracted_features").upsert(
            feature_record, on_conflict="evaluation_id"
        ).execute()
    except Exception as e:
        # Non-fatal — features can be re-extracted later
        print(f"[warn] Feature extraction failed for {body.evaluation_id}: {e}")

    saved = ms_resp.data[0]
    return ManualScoreResponse(
        id=saved["id"],
        evaluation_id=saved["evaluation_id"],
        concept_coverage=saved["concept_coverage"],
        technical_depth=saved["technical_depth"],
        clarity=saved["clarity"],
        originality=saved["originality"],
        notes=saved.get("notes"),
        created_at=saved["created_at"],
    )


@router.get("/manual-score/{evaluation_id}", response_model=ManualScoreResponse)
async def get_manual_score(
    evaluation_id: str,
    user: dict = Depends(get_current_user),
):
    """Fetch existing human score for an evaluation (if any)."""
    user_id = user["user_id"]

    resp = (
        supabase.table("manual_scores")
        .select("*")
        .eq("evaluation_id", evaluation_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )

    if not resp.data:
        raise HTTPException(status_code=404, detail="No manual score found.")

    return ManualScoreResponse(**resp.data)
