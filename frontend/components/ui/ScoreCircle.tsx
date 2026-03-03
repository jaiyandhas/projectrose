"use client";
import { useEffect, useRef } from "react";

interface ScoreCircleProps {
    value: number;
    max: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
    label?: string;
    animate?: boolean;
}

export default function ScoreCircle({
    value,
    max,
    size = 120,
    strokeWidth = 10,
    color = "var(--violet)",
    label,
    animate = true,
}: ScoreCircleProps) {
    const safeMax = max > 0 ? max : 1;
    const safeValue = Number.isFinite(value) ? value : 0;

    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const percentage = Math.min(Math.max(safeValue / safeMax, 0), 1);
    const offset = circumference - percentage * circumference;

    const countRef = useRef<HTMLSpanElement>(null);

    // Animate the count-up
    useEffect(() => {
        if (!animate || !countRef.current) return;
        let start = 0;
        const duration = 800;
        const increment = safeValue / (duration / 16);
        const timer = setInterval(() => {
            start += increment;
            if (start >= safeValue) {
                start = safeValue;
                clearInterval(timer);
            }
            if (countRef.current) {
                countRef.current.textContent = start.toFixed(1);
            }
        }, 16);
        return () => clearInterval(timer);
    }, [value, animate]);

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
            }}
        >
            <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
                <circle
                    className="score-ring-bg"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    strokeWidth={strokeWidth}
                />
                <circle
                    className="score-ring-fill"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{ filter: `drop-shadow(0 0 6px ${color})` }}
                />
            </svg>
            <div
                style={{
                    position: "absolute",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                }}
            >
                <span
                    ref={countRef}
                    style={{ fontSize: size > 100 ? "26px" : "18px", fontWeight: 800, color: "var(--text-primary)" }}
                >
                    0.0
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>/{max}</span>
            </div>
            {label && (
                <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500 }}>{label}</span>
            )}
        </div>
    );
}
