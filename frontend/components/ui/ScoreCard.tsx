"use client";
import ScoreCircle from "./ScoreCircle";

interface ScoreCardProps {
    label: string;
    score: number;
    max?: number;
    color?: string;
    description: string;
}

export default function ScoreCard({ label, score, max = 10, color = "var(--violet)", description }: ScoreCardProps) {
    return (
        <div
            className="glass-card animate-fade-up"
            style={{
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
            }}
        >
            {/* Glow bg */}
            <div
                style={{
                    position: "absolute",
                    top: "-20px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    background: color,
                    opacity: 0.07,
                    filter: "blur(24px)",
                }}
            />

            <div style={{ position: "relative" }}>
                <ScoreCircle value={score} max={max} size={100} color={color} />
            </div>

            <div>
                <p style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-primary)" }}>{label}</p>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>{description}</p>
            </div>
        </div>
    );
}
