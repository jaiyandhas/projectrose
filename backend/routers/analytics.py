from fastapi import APIRouter, Depends, HTTPException
from database.supabase_client import supabase
from models.schemas import AnalyticsSummary
from routers.auth import get_current_user

router = APIRouter(prefix="/api", tags=["analytics"])


@router.get("/analytics", response_model=AnalyticsSummary)
async def get_analytics(user: dict = Depends(get_current_user)):
    """Retrieve aggregate evaluation stats for the authenticated user."""
    user_id = user["user_id"]

    resp = (
        supabase.table("analytics")
        .select("avg_score, attempts_count, last_updated")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )

    if not resp.data:
        # User hasn't evaluated anything yet
        return AnalyticsSummary(avg_score=0.0, attempts_count=0, last_updated=None)

    return AnalyticsSummary(**resp.data)
