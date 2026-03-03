"""
train.py — API endpoints to trigger model training and check training status.

POST /api/train          — trigger retraining
GET  /api/train/status   — dataset size, model R², whether ready
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from models.schemas import TrainingStatusResponse, TrainingTriggerResponse
from routers.auth import get_current_user
from services.ml_trainer import train_models, get_training_status
from services.ml_predictor import invalidate_cache

router = APIRouter(prefix="/api", tags=["train"])


@router.get("/train/status", response_model=TrainingStatusResponse)
async def training_status(user: dict = Depends(get_current_user)):
    """Check how many labeled samples exist and the latest model version."""
    status = get_training_status()
    return TrainingStatusResponse(**status)


@router.post("/train", response_model=TrainingTriggerResponse)
async def trigger_training(
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    """
    Trigger model retraining in the background.
    Returns immediately with a status message.
    """
    status = get_training_status()
    if not status["can_train"]:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Not enough labeled data. Need {status['min_required']} samples, "
                f"have {status['labeled_count']}."
            ),
        )

    def _train_and_invalidate():
        try:
            train_models()
            invalidate_cache()
        except Exception as e:
            print(f"[error] Training failed: {e}")

    background_tasks.add_task(_train_and_invalidate)

    return TrainingTriggerResponse(
        message="Training started in the background. Check /api/train/status shortly.",
        labeled_count=status["labeled_count"],
    )
