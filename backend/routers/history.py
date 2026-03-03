from fastapi import APIRouter, Depends, HTTPException, Query
from database.supabase_client import supabase
from models.schemas import EvaluationResult, HistoryItem, FeedbackDetail
from routers.auth import get_current_user
from typing import List

router = APIRouter(prefix="/api", tags=["history"])


@router.get("/history", response_model=List[HistoryItem])
async def get_history(
    user: dict = Depends(get_current_user),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
):
    """Paginated list of the user's past evaluations (newest first)."""
    user_id = user["user_id"]
    offset = (page - 1) * per_page

    resp = (
        supabase.table("evaluations")
        .select("id, question_text, overall_score, originality_score, ai_usage_score, coverage_score, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .range(offset, offset + per_page - 1)
        .execute()
    )

    return [HistoryItem(**row) for row in resp.data]


@router.get("/history/{evaluation_id}", response_model=EvaluationResult)
async def get_evaluation(
    evaluation_id: str,
    user: dict = Depends(get_current_user),
):
    """Fetch a single evaluation by ID (must belong to the authenticated user)."""
    user_id = user["user_id"]

    resp = (
        supabase.table("evaluations")
        .select("*")
        .eq("id", evaluation_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    if not resp.data:
        raise HTTPException(status_code=404, detail="Evaluation not found")

    row = resp.data
    return EvaluationResult(
        id=row["id"],
        question_text=row["question_text"],
        answer_text=row["answer_text"],
        sample_answer_text=row.get("sample_answer_text"),
        originality_score=row["originality_score"],
        ai_usage_score=row["ai_usage_score"],
        coverage_score=row["coverage_score"],
        overall_score=row["overall_score"],
        feedback=FeedbackDetail(**row["feedback_json"]),
        created_at=row["created_at"],
    )
