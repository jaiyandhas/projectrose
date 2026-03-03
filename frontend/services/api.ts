import axios from "axios";
import { supabase } from "@/lib/supabase";

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
});

// Attach Supabase JWT token to every request
api.interceptors.request.use(async (config) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export interface EvaluatePayload {
    question_text: string;
    answer_text: string;
    sample_answer_text?: string;
}

export interface FeedbackDetail {
    strengths: string[];
    missing_points: string[];
    improvements: string[];
    summary: string;
}

export interface EvaluationResult {
    id: string;
    question_text: string;
    answer_text: string;
    sample_answer_text?: string;
    // Legacy 0–10 rubric fields (still populated for history/analytics)
    originality_score: number;
    ai_usage_score: number;
    coverage_score: number;
    // New 30-point rubric sub-scores (may be present in latest backend)
    opinion_originality_score?: number; // 0–15
    understanding_score?: number;       // 0–10
    references_score?: number;          // 0–5
    overall_score: number;
    feedback: FeedbackDetail;
    created_at: string;
}

export interface HistoryItem {
    id: string;
    question_text: string;
    overall_score: number;
    // Legacy mapping fallback
    originality_score: number;
    ai_usage_score: number;
    coverage_score: number;
    // New 30-point rubric
    opinion_originality_score?: number;
    understanding_score?: number;
    references_score?: number;
    created_at: string;
}

export interface AnalyticsSummary {
    avg_score: number;
    attempts_count: number;
    last_updated: string | null;
}

export interface ManualScorePayload {
    evaluation_id: string;
    opinion_originality: number;
    understanding: number;
    references: number;
    notes?: string;
}

export interface ManualScoreResponse {
    id: string;
    evaluation_id: string;
    opinion_originality: number;
    understanding: number;
    references: number;
    notes?: string;
    created_at: string;
}

export interface TrainingStatus {
    labeled_count: number;
    min_required: number;
    can_train: boolean;
    models_ready: boolean;
    latest_model: {
        id: string;
        sample_count: number;
        avg_r2_score: number;
        scores_json: Record<string, { r2: number }>;
        trained_at: string;
    } | null;
}

export interface MLPrediction {
    evaluation_id: string;
    model_available: boolean;
    opinion_originality: number | null;
    understanding: number | null;
    references: number | null;
    message: string;
}

export const evaluateAnswer = (payload: EvaluatePayload) =>
    api.post<EvaluationResult>("/api/evaluate", payload).then((r) => r.data);

export const getHistory = (page = 1, perPage = 10) =>
    api
        .get<HistoryItem[]>("/api/history", { params: { page, per_page: perPage } })
        .then((r) => r.data);

export const getEvaluation = (id: string) =>
    api.get<EvaluationResult>(`/api/history/${id}`).then((r) => r.data);

export const getAnalytics = () =>
    api.get<AnalyticsSummary>("/api/analytics").then((r) => r.data);

export const submitManualScore = (payload: ManualScorePayload) =>
    api.post<ManualScoreResponse>("/api/manual-score", payload).then((r) => r.data);

export const getManualScore = (evaluationId: string) =>
    api.get<ManualScoreResponse>(`/api/manual-score/${evaluationId}`).then((r) => r.data);

export const getTrainingStatus = () =>
    api.get<TrainingStatus>("/api/train/status").then((r) => r.data);

export const triggerTraining = () =>
    api.post<{ message: string; labeled_count: number }>("/api/train").then((r) => r.data);

export const getMLPrediction = (evaluationId: string) =>
    api.get<MLPrediction>(`/api/predict/${evaluationId}`).then((r) => r.data);
