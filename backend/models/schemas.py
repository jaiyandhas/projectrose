from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from datetime import datetime


class EvaluateRequest(BaseModel):
    question_text: str = Field(..., min_length=10, description="The question being answered")
    answer_text: str = Field(..., min_length=20, description="The user's answer")
    sample_answer_text: Optional[str] = Field(None, description="Optional reference answer")


class FeedbackDetail(BaseModel):
    strengths: List[str] = []
    missing_points: List[str] = []
    improvements: List[str] = []
    summary: str = ""


class EvaluationResult(BaseModel):
    id: str
    question_text: str
    answer_text: str
    sample_answer_text: Optional[str]
    originality_score: float
    ai_usage_score: float
    coverage_score: float
    overall_score: float
    feedback: FeedbackDetail
    created_at: datetime


class HybridEvaluationResult(BaseModel):
    """Response from the 5-layer hybrid evaluation engine."""
    id: str
    question_text: str
    answer_text: str
    sample_answer_text: Optional[str]
    # Layer 1 — AI Detection
    ai_probability: float
    ai_detection_method: str
    # Layer 4 — Rubric sub-scores (30-point rubric)
    opinion_originality_score: float  # 0-15
    understanding_score: float         # 0-10
    references_score: float            # 0-5
    overall_score: float               # 0-30
    # Layer 3 — Embedding
    answer_question_similarity: float
    # Metadata
    ml_used: bool
    max_allowed: int
    feedback: FeedbackDetail
    created_at: datetime


class HistoryItem(BaseModel):
    id: str
    question_text: str
    overall_score: float
    originality_score: float
    ai_usage_score: float
    coverage_score: float
    created_at: datetime


class AnalyticsSummary(BaseModel):
    avg_score: float
    attempts_count: int
    last_updated: Optional[datetime]


# ── Human-in-the-Loop Schemas ──────────────────────────────────────────────

class ManualScoreRequest(BaseModel):
    evaluation_id: str = Field(..., description="UUID of the evaluation being scored")
    # New 30-point rubric
    opinion_originality: float = Field(..., ge=0, le=15, description="0-15 opinion & originality")
    understanding: float = Field(..., ge=0, le=10, description="0-10 understanding")
    references: float = Field(..., ge=0, le=5, description="0-5 references quality")
    # Legacy fields (kept for backwards compat)
    concept_coverage: Optional[float] = Field(None, ge=0, le=10)
    technical_depth: Optional[float] = Field(None, ge=0, le=10)
    clarity: Optional[float] = Field(None, ge=0, le=10)
    originality: Optional[float] = Field(None, ge=0, le=10)
    notes: Optional[str] = Field(None, description="Optional reviewer notes")


class ManualScoreResponse(BaseModel):
    id: str
    evaluation_id: str
    opinion_originality: float
    understanding: float
    references: float
    notes: Optional[str]
    created_at: datetime


class TrainingStatusResponse(BaseModel):
    labeled_count: int
    min_required: int
    can_train: bool
    models_ready: bool
    latest_model: Optional[Any]  # raw dict from Supabase


class TrainingTriggerResponse(BaseModel):
    message: str
    labeled_count: int


class MLPredictionResponse(BaseModel):
    model_config = {"protected_namespaces": ()}
    evaluation_id: str
    model_available: bool
    opinion_originality: Optional[float]
    understanding: Optional[float]
    references: Optional[float]
    overall_score: Optional[float]
    message: str


class AIDetectRequest(BaseModel):
    answer_text: str = Field(..., min_length=10, description="Answer to check for AI origin")


class AIDetectResponse(BaseModel):
    ai_probability: float
    method: str
    is_ai_detected: bool          # True if probability > 0.75
    max_score_allowed: int        # 5 if AI detected, 30 otherwise
    signals: Dict[str, Any] = {}

