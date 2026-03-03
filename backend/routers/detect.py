"""
detect.py — Standalone AI detection endpoint.

POST /api/detect
  Runs only Layer 1 (AI Detection) without scoring the full answer.
  Useful for quick checks, admin tools, and testing the detector.
"""

from fastapi import APIRouter, Depends, Request
from models.schemas import AIDetectRequest, AIDetectResponse
from routers.auth import get_current_user
from services.ai_detector import detect_ai
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter(prefix="/api", tags=["detect"])
limiter = Limiter(key_func=get_remote_address)


@router.post("/detect", response_model=AIDetectResponse)
@limiter.limit("30/hour")
async def detect_ai_endpoint(
    request: Request,
    body: AIDetectRequest,
    user: dict = Depends(get_current_user),
):
    """
    Check whether an answer text appears to be AI-generated.

    Returns:
    - ai_probability (0-1)
    - method: "openai" or "heuristic"
    - is_ai_detected: True if probability > 0.75
    - max_score_allowed: 5 if AI detected, 30 otherwise
    - signals: debug breakdown of detection signals
    """
    result = detect_ai(body.answer_text)
    ai_prob = result["ai_probability"]

    return AIDetectResponse(
        ai_probability=ai_prob,
        method=result["method"],
        is_ai_detected=ai_prob > 0.75,
        max_score_allowed=5 if ai_prob > 0.75 else 30,
        signals=result.get("signals", {}),
    )
