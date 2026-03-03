"use client";
import { useEffect, useState } from "react";

export default function BubbleBackground() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    // Create 12 bubbles with randomized properties for a natural flow
    const bubbles = Array.from({ length: 12 }).map((_, i) => {
        const size = Math.random() * 80 + 40; // 40px to 120px
        const left = Math.random() * 100; // 0% to 100%
        const animationDuration = Math.random() * 15 + 15; // 15s to 30s
        const animationDelay = Math.random() * 10; // 0s to 10s

        return (
            <div
                key={i}
                className="bubble"
                style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    left: `${left}%`,
                    animationDuration: `${animationDuration}s`,
                    animationDelay: `${animationDelay}s`,
                }}
            />
        );
    });

    return (
        <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: -1,
            overflow: "hidden",
            pointerEvents: "none" // so it doesn't block clicks
        }}>
            {bubbles}
        </div>
    );
}
