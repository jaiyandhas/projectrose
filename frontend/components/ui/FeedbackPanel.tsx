"use client";
import { useState } from "react";
import { ChevronDown, Star, AlertCircle, Lightbulb } from "lucide-react";
import type { FeedbackDetail } from "@/services/api";

interface Section {
    key: keyof FeedbackDetail;
    title: string;
    icon: React.ReactNode;
    color: string;
}

const SECTIONS: Section[] = [
    { key: "strengths", title: "Strengths", icon: <Star size={15} />, color: "#22c55e" },
    { key: "missing_points", title: "Missing Points", icon: <AlertCircle size={15} />, color: "#f59e0b" },
    { key: "improvements", title: "Improvements", icon: <Lightbulb size={15} />, color: "var(--cyan)" },
];

interface FeedbackPanelProps {
    feedback: FeedbackDetail;
}

export default function FeedbackPanel({ feedback }: FeedbackPanelProps) {
    const [openKey, setOpenKey] = useState<keyof FeedbackDetail | null>("strengths");

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {/* Summary */}
            {feedback.summary && (
                <div
                    style={{
                        background: "rgba(139,92,246,0.08)",
                        border: "1px solid rgba(139,92,246,0.2)",
                        borderRadius: "12px",
                        padding: "14px 16px",
                        fontSize: "14px",
                        color: "var(--text-muted)",
                        lineHeight: 1.6,
                    }}
                >
                    {feedback.summary}
                </div>
            )}

            {SECTIONS.map(({ key, title, icon, color }) => {
                const items = feedback[key] as string[];
                const isOpen = openKey === key;
                return (
                    <div key={key} className="glass-card" style={{ overflow: "hidden" }}>
                        <button
                            onClick={() => setOpenKey(isOpen ? null : key)}
                            style={{
                                width: "100%",
                                padding: "14px 16px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "var(--text-primary)",
                                fontWeight: 600,
                                fontSize: "14px",
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ color }}>{icon}</span>
                                {title}
                                <span
                                    style={{
                                        background: `${color}22`,
                                        color,
                                        borderRadius: "6px",
                                        padding: "2px 8px",
                                        fontSize: "12px",
                                        fontWeight: 700,
                                    }}
                                >
                                    {items?.length || 0}
                                </span>
                            </div>
                            <ChevronDown
                                size={16}
                                style={{
                                    color: "var(--text-muted)",
                                    transition: "transform 0.25s ease",
                                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                                }}
                            />
                        </button>

                        {isOpen && items?.length > 0 && (
                            <div className="accordion-open" style={{ padding: "0 16px 14px" }}>
                                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
                                    {items.map((item, i) => (
                                        <li
                                            key={i}
                                            style={{
                                                display: "flex",
                                                gap: "10px",
                                                fontSize: "13px",
                                                color: "var(--text-muted)",
                                                lineHeight: 1.5,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    width: "20px",
                                                    height: "20px",
                                                    borderRadius: "50%",
                                                    background: `${color}22`,
                                                    color,
                                                    fontSize: "11px",
                                                    fontWeight: 700,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    flexShrink: 0,
                                                    marginTop: "1px",
                                                }}
                                            >
                                                {i + 1}
                                            </span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
