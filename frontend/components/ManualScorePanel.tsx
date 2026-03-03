"use client";
import { useState, useEffect } from "react";
import { CheckCircle, Brain, SlidersHorizontal } from "lucide-react";
import { submitManualScore, getManualScore } from "@/services/api";
import type { ManualScoreResponse } from "@/services/api";

interface ManualScorePanelProps {
    evaluationId: string;
}

const SCORE_FIELDS = [
    {
        key: "opinion_originality" as const,
        label: "Opinion & Originality",
        description: "Independent thinking & conceptual coverage",
        color: "var(--violet)",
        max: 15,
        step: 0.5,
    },
    {
        key: "understanding" as const,
        label: "Understanding",
        description: "Technical depth & clarity of concepts",
        color: "var(--cyan)",
        max: 10,
        step: 0.5,
    },
    {
        key: "references" as const,
        label: "References",
        description: "Quality of citations and examples",
        color: "#22c55e",
        max: 5,
        step: 0.5,
    },
];

type ScoreState = {
    opinion_originality: number;
    understanding: number;
    references: number;
};

export default function ManualScorePanel({ evaluationId }: ManualScorePanelProps) {
    const [scores, setScores] = useState<ScoreState>({
        opinion_originality: 7.5,
        understanding: 5.0,
        references: 2.5,
    });
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState<ManualScoreResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [collapsed, setCollapsed] = useState(false);

    // Check if already scored
    useEffect(() => {
        getManualScore(evaluationId)
            .then((existing) => {
                setScores({
                    opinion_originality: existing.opinion_originality ?? 7.5,
                    understanding: existing.understanding ?? 5.0,
                    references: existing.references ?? 2.5,
                });
                setNotes(existing.notes || "");
                setSubmitted(existing);
            })
            .catch(() => {
                // Not yet scored — fine
            });
    }, [evaluationId]);

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await submitManualScore({
                evaluation_id: evaluationId,
                ...scores,
                notes: notes || undefined,
            });
            setSubmitted(res);
        } catch (e: unknown) {
            const msg =
                (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
                "Failed to save score.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                background: "linear-gradient(135deg, rgba(139,92,246,0.06), rgba(6,182,212,0.04))",
                border: "1px solid rgba(139,92,246,0.2)",
                borderRadius: "18px",
                padding: "24px",
                marginTop: "24px",
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: collapsed ? 0 : "20px",
                    cursor: "pointer",
                }}
                onClick={() => setCollapsed(!collapsed)}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                        style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "10px",
                            background: "linear-gradient(135deg, var(--violet), var(--cyan))",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Brain size={16} color="white" />
                    </div>
                    <div>
                        <p style={{ fontWeight: 700, fontSize: "14px" }}>
                            Help Rose Learn 🌹
                        </p>
                        <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>
                            Your human score trains the AI evaluator
                        </p>
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {submitted && (
                        <span
                            style={{
                                fontSize: "11px",
                                background: "rgba(34,197,94,0.15)",
                                color: "#22c55e",
                                padding: "3px 10px",
                                borderRadius: "20px",
                                fontWeight: 600,
                            }}
                        >
                            ✓ Scored
                        </span>
                    )}
                    <SlidersHorizontal
                        size={16}
                        color="var(--text-muted)"
                        style={{
                            transform: collapsed ? "rotate(0deg)" : "rotate(90deg)",
                            transition: "transform 0.25s",
                        }}
                    />
                </div>
            </div>

            {!collapsed && (
                <>
                    {submitted ? (
                        // Success state
                        <div
                            style={{
                                background: "rgba(34,197,94,0.08)",
                                border: "1px solid rgba(34,197,94,0.2)",
                                borderRadius: "12px",
                                padding: "20px",
                                textAlign: "center",
                            }}
                        >
                            <CheckCircle size={32} color="#22c55e" style={{ marginBottom: "10px" }} />
                            <p style={{ fontWeight: 700, color: "#22c55e", fontSize: "15px" }}>
                                Score saved! Rose is learning from you.
                            </p>
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(3, 1fr)",
                                    gap: "10px",
                                    marginTop: "16px",
                                }}
                            >
                                {SCORE_FIELDS.map((f) => (
                                    <div
                                        key={f.key}
                                        style={{
                                            background: "rgba(255,255,255,0.03)",
                                            borderRadius: "10px",
                                            padding: "10px",
                                            textAlign: "center",
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: "20px",
                                                fontWeight: 800,
                                                color: f.color,
                                            }}
                                        >
                                            {submitted[f.key].toFixed(1)}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: "10px",
                                                color: "var(--text-muted)",
                                                marginTop: "2px",
                                            }}
                                        >
                                            {f.label}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSubmitted(null);
                                }}
                                style={{
                                    marginTop: "14px",
                                    background: "none",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: "8px",
                                    color: "var(--text-muted)",
                                    fontSize: "12px",
                                    padding: "6px 14px",
                                    cursor: "pointer",
                                }}
                            >
                                Edit score
                            </button>
                        </div>
                    ) : (
                        // Score input form
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {SCORE_FIELDS.map((field) => {
                                const val = scores[field.key];
                                return (
                                    <div key={field.key}>
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                marginBottom: "6px",
                                            }}
                                        >
                                            <div>
                                                <span
                                                    style={{ fontSize: "13px", fontWeight: 600 }}
                                                >
                                                    {field.label}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: "11px",
                                                        color: "var(--text-muted)",
                                                        marginLeft: "8px",
                                                    }}
                                                >
                                                    {field.description}
                                                </span>
                                            </div>
                                            <span
                                                style={{
                                                    fontSize: "15px",
                                                    fontWeight: 800,
                                                    color: field.color,
                                                    minWidth: "28px",
                                                    textAlign: "right",
                                                }}
                                            >
                                                {val.toFixed(1)}
                                            </span>
                                        </div>
                                        <div style={{ position: "relative" }}>
                                            <input
                                                type="range"
                                                min={0}
                                                max={field.max}
                                                step={field.step}
                                                value={val}
                                                onChange={(e) =>
                                                    setScores((prev) => ({
                                                        ...prev,
                                                        [field.key]: parseFloat(e.target.value),
                                                    }))
                                                }
                                                style={{
                                                    width: "100%",
                                                    accentColor: field.color,
                                                    cursor: "pointer",
                                                    height: "4px",
                                                }}
                                            />
                                            <div
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    fontSize: "10px",
                                                    color: "var(--text-muted)",
                                                    marginTop: "2px",
                                                }}
                                            >
                                                <span>0</span>
                                                <span>{field.max / 2}</span>
                                                <span>{field.max}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Notes */}
                            <div>
                                <label
                                    style={{
                                        fontSize: "12px",
                                        color: "var(--text-muted)",
                                        fontWeight: 600,
                                        display: "block",
                                        marginBottom: "6px",
                                    }}
                                >
                                    Notes (optional)
                                </label>
                                <textarea
                                    className="input-field"
                                    rows={2}
                                    placeholder="What was great or missing in this answer?"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    style={{ fontSize: "13px", resize: "vertical" }}
                                />
                            </div>

                            {error && (
                                <p
                                    style={{
                                        color: "#f87171",
                                        fontSize: "12px",
                                        background: "rgba(239,68,68,0.08)",
                                        padding: "8px 12px",
                                        borderRadius: "8px",
                                    }}
                                >
                                    {error}
                                </p>
                            )}

                            <button
                                className="btn-primary"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSubmit();
                                }}
                                disabled={loading}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px",
                                    fontSize: "14px",
                                }}
                            >
                                <Brain size={15} />
                                {loading ? "Saving…" : "Submit Human Score — Teach Rose 🌹"}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
