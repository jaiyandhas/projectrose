"use client";

export default function LoadingOrb() {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "60px 20px",
                gap: "24px",
            }}
        >
            {/* Orb */}
            <div style={{ position: "relative" }}>
                <div
                    className="orb-pulse"
                    style={{
                        width: "72px",
                        height: "72px",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, var(--violet) 0%, var(--cyan) 100%)",
                    }}
                />
                {/* Orbiting ring */}
                <div
                    className="animate-spin"
                    style={{
                        position: "absolute",
                        inset: "-12px",
                        borderRadius: "50%",
                        border: "2px dashed rgba(139,92,246,0.4)",
                    }}
                />
            </div>

            <div style={{ textAlign: "center" }}>
                <p style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "15px" }}>
                    Evaluating your answer…
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "6px" }}>
                    AI is analyzing originality, concept usage &amp; coverage
                </p>
            </div>
        </div>
    );
}
