"use client";
import type { HistoryItem } from "@/services/api";

interface HistoryListProps {
    items: HistoryItem[];
}

export default function HistoryList({ items }: HistoryListProps) {
    if (!items.length) {
        return (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: "14px" }}>
                No evaluations yet. Head to{" "}
                <a href="/dashboard" style={{ color: "var(--violet)" }}>Evaluate</a> to get started.
            </div>
        );
    }

    const getScoreColor = (score: number) =>
        score >= 24 ? "#22c55e" : score >= 18 ? "#f59e0b" : "#ef4444";

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {items.map((item) => {
                const color = getScoreColor(item.overall_score);
                const date = new Date(item.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                });
                return (
                    <div
                        key={item.id}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "16px",
                            padding: "14px 16px",
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid var(--border)",
                            borderRadius: "12px",
                            transition: "border-color 0.2s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(139,92,246,0.3)")}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                    >
                        {/* Score badge */}
                        <div
                            style={{
                                minWidth: "52px",
                                height: "52px",
                                borderRadius: "12px",
                                background: `${color}18`,
                                border: `1.5px solid ${color}44`,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <span style={{ fontWeight: 800, fontSize: "14px", color }}>{item.overall_score.toFixed(0)}</span>
                            <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>/30</span>
                        </div>

                        {/* Question text */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p
                                style={{
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    color: "var(--text-primary)",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {item.question_text}
                            </p>
                            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "3px" }}>{date}</p>
                        </div>

                        {/* Mini sub-scores */}
                        <div style={{ display: "flex", gap: "12px", flexShrink: 0 }}>
                            {[
                                { label: "Orig", val: item.opinion_originality_score ?? item.originality_score ?? 0, color: "var(--violet)", max: 15 },
                                { label: "Undr", val: item.understanding_score ?? item.ai_usage_score ?? 0, color: "var(--cyan)", max: 10 },
                                { label: "Refs", val: item.references_score ?? (item.coverage_score ? item.coverage_score / 2 : 0), color: "#22c55e", max: 5 },
                            ].map(({ label, val, color: c, max }) => (
                                <div key={label} style={{ textAlign: "center" }}>
                                    <p style={{ fontSize: "13px", fontWeight: 700, color: c }}>
                                        {val.toFixed(1)}<span style={{ fontSize: "10px", color: "var(--text-muted)" }}>/{max}</span>
                                    </p>
                                    <p style={{ fontSize: "10px", color: "var(--text-muted)" }}>{label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
