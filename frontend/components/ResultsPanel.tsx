"use client";
import ScoreCard from "./ui/ScoreCard";
import ScoreCircle from "./ui/ScoreCircle";
import FeedbackPanel from "./ui/FeedbackPanel";
import LoadingOrb from "./ui/LoadingOrb";
import type { EvaluationResult } from "@/services/api";

interface ResultsPanelProps {
    loading: boolean;
    result: EvaluationResult | null;
    error: string | null;
}

export default function ResultsPanel({ loading, result, error }: ResultsPanelProps) {
    if (loading) return <LoadingOrb />;

    if (error) {
        return (
            <div
                style={{
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    color: "#f87171",
                    padding: "20px",
                    borderRadius: "14px",
                    fontSize: "14px",
                    textAlign: "center",
                }}
            >
                <strong>Evaluation failed</strong>
                <p style={{ marginTop: "6px", color: "#fca5a5" }}>{error}</p>
            </div>
        );
    }

    if (!result) {
        return (
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "60px 20px",
                    textAlign: "center",
                    gap: "16px",
                }}
            >
                <div
                    style={{
                        width: "64px",
                        height: "64px",
                        borderRadius: "50%",
                        background: "rgba(139,92,246,0.1)",
                        border: "1px dashed rgba(139,92,246,0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "28px",
                    }}
                >
                    ✦
                </div>
                <p style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "16px" }}>
                    Ready to evaluate
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: "13px", maxWidth: "280px" }}>
                    Fill in the question and your answer on the left, then click <strong>Evaluate Answer</strong>.
                </p>
            </div>
        );
    }

    const pct = (result.overall_score / 30) * 100;
    const grade =
        pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B" : pct >= 60 ? "C" : "D";
    const gradeColor =
        pct >= 80 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#ef4444";

    return (
        <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Overall score hero */}
            <div
                className="glass-card"
                style={{
                    padding: "28px",
                    display: "flex",
                    alignItems: "center",
                    gap: "28px",
                    flexWrap: "wrap",
                }}
            >
                <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ScoreCircle
                        value={result.overall_score}
                        max={30}
                        size={140}
                        strokeWidth={12}
                        color="var(--violet)"
                    />
                    <div
                        style={{
                            position: "absolute",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                        }}
                    >
                        <span style={{ fontSize: "30px", fontWeight: 800 }}>
                            {result.overall_score.toFixed(1)}
                        </span>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>/30</span>
                    </div>
                </div>

                <div>
                    <div
                        style={{
                            display: "inline-block",
                            background: `${gradeColor}22`,
                            color: gradeColor,
                            fontWeight: 800,
                            fontSize: "28px",
                            padding: "4px 18px",
                            borderRadius: "10px",
                            marginBottom: "10px",
                        }}
                    >
                        {grade}
                    </div>
                    <p style={{ fontWeight: 700, fontSize: "17px" }}>Overall Score</p>
                    <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>
                        {pct >= 80
                            ? "Excellent work! Well-structured and insightful."
                            : pct >= 60
                                ? "Good effort — some gaps remain."
                                : "Needs improvement in coverage and depth."}
                    </p>
                </div>
            </div>

            {/* Sub-score cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                <ScoreCard
                    label="Originality"
                    // Prefer new 0–15 rubric field if present, fall back to legacy 0–10.
                    score={
                        // @ts-expect-error backend may return new fields not in TS type yet
                        (result as any).opinion_originality_score ??
                        result.originality_score ??
                        0
                    }
                    max={15}
                    color="var(--violet)"
                    description="Independent thinking"
                />
                <ScoreCard
                    label="Understanding"
                    // Prefer new 0–10 rubric field if present, fall back to legacy ai_usage_score.
                    score={
                        // @ts-expect-error backend may return new fields not in TS type yet
                        (result as any).understanding_score ??
                        result.ai_usage_score ??
                        0
                    }
                    max={10}
                    color="var(--cyan)"
                    description="Concept correctness"
                />
                <ScoreCard
                    label="References"
                    // Prefer new 0–5 rubric field if present, fall back to legacy coverage_score/2.
                    score={
                        // @ts-expect-error backend may return new fields not in TS type yet
                        (result as any).references_score ??
                        (typeof result.coverage_score === "number" ? result.coverage_score / 2 : 0)
                    }
                    max={5}
                    color="#22c55e"
                    description="Citation and reference quality"
                />
            </div>

            {/* Feedback accordion */}
            <div>
                <h3
                    style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: "12px",
                    }}
                >
                    Detailed Feedback
                </h3>
                <FeedbackPanel feedback={result.feedback} />
            </div>
        </div>
    );
}
