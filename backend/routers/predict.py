"""
predict.py — ML prediction endpoint.

GET /api/predict/{evaluation_id}
  Returns ML-predicted scores for an evaluation.
  Requires: evaluation has been manually scored (features extracted).
  Falls back gracefully if no model is trained yet.
"""

from fastapi import APIRouter, Depends, HTTPException
from database.supabase_client import supabase
from models.schemas import MLPredictionResponse
from routers.auth import get_current_user
from services.ml_predictor import predict_scores

router = APIRouter(prefix="/api", tags=["predict"])


@router.get("/predict/{evaluation_id}", response_model=MLPredictionResponse)
async def get_ml_prediction(
    evaluation_id: str,
    user: dict = Depends(get_current_user),
):
    """
    Return ML-predicted scores for an evaluation.
    Fetches extracted features from DB and runs the trained models.
    """
    user_id = user["user_id"]

    # Verify evaluation ownership
    eval_resp = (
        supabase.table("evaluations")
        .select("id")
        .eq("id", evaluation_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not eval_resp.data:
        raise HTTPException(status_code=404, detail="Evaluation not found.")

    # Fetch extracted features
    ef_resp = (
        supabase.table("extracted_features")
        .select("*")
        .eq("evaluation_id", evaluation_id)
        .maybe_single()
        .execute()
    )

    if not ef_resp.data:
        raise HTTPException(
            status_code=404,
            detail="No features extracted for this evaluation yet. Submit a manual score first.",
        )

    features = ef_resp.data
    predictions = predict_scores(features)

    if predictions is None:
        return MLPredictionResponse(
            evaluation_id=evaluation_id,
            model_available=False,
            concept_coverage=None,
            technical_depth=None,
            clarity=None,
            originality=None,
            message="No trained model available yet. Keep labeling answers!",
        )

    return MLPredictionResponse(
        evaluation_id=evaluation_id,
        model_available=True,
        concept_coverage=predictions.get("concept_coverage"),
        technical_depth=predictions.get("technical_depth"),
        clarity=predictions.get("clarity"),
        originality=predictions.get("originality"),
        message="Predicted by Rose's learning model 🌹",
    )
