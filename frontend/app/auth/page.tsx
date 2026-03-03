"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthPage() {
    const router = useRouter();
    const [mode, setMode] = useState<"login" | "signup">("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            if (mode === "signup") {
                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { name } },
                });
                if (signUpError) throw signUpError;
                router.replace("/dashboard");
            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
                if (signInError) throw signInError;
                router.replace("/dashboard");
            }
        } catch (err: unknown) {
            setError((err as Error).message || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="flex items-center justify-center min-h-screen px-4 bg-mesh"
            style={{ flexDirection: "column", gap: "24px" }}
        >
            {/* Logo */}
            <div style={{ textAlign: "center", marginBottom: "8px" }}>
                <div
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "10px",
                        marginBottom: "10px",
                    }}
                >
                    <div
                        className="orb-pulse"
                        style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, var(--violet), var(--cyan))",
                        }}
                    />
                    <span style={{ fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px" }}>
                        <span className="gradient-text">AI</span> Answer Evaluator
                    </span>
                </div>
                <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
                    Instant AI-powered feedback on your written answers
                </p>
            </div>

            {/* Card */}
            <div className="glass-card animate-fade-up" style={{ width: "100%", maxWidth: "420px", padding: "36px" }}>
                {/* Tabs */}
                <div
                    style={{
                        display: "flex",
                        background: "rgba(255,255,255,0.05)",
                        borderRadius: "10px",
                        padding: "4px",
                        marginBottom: "28px",
                    }}
                >
                    {(["login", "signup"] as const).map((m) => (
                        <button
                            key={m}
                            onClick={() => { setMode(m); setError(""); }}
                            style={{
                                flex: 1,
                                padding: "8px",
                                borderRadius: "8px",
                                border: "none",
                                cursor: "pointer",
                                fontWeight: 600,
                                fontSize: "14px",
                                transition: "all 0.2s ease",
                                background: mode === m ? "var(--violet)" : "transparent",
                                color: mode === m ? "white" : "var(--text-muted)",
                                boxShadow: mode === m ? "0 0 16px var(--violet-glow)" : "none",
                            }}
                        >
                            {m === "login" ? "Sign In" : "Sign Up"}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {mode === "signup" && (
                        <div>
                            <label className="label">Name</label>
                            <input
                                className="input-field"
                                type="text"
                                placeholder="Your name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                    )}
                    <div>
                        <label className="label">Email</label>
                        <input
                            className="input-field"
                            type="email"
                            placeholder="you@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="label">Password</label>
                        <input
                            className="input-field"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>

                    {error && (
                        <div
                            style={{
                                background: "rgba(239,68,68,0.1)",
                                border: "1px solid rgba(239,68,68,0.3)",
                                color: "#f87171",
                                padding: "10px 14px",
                                borderRadius: "8px",
                                fontSize: "13px",
                            }}
                        >
                            {error}
                        </div>
                    )}

                    <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: "8px" }}>
                        {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
                    </button>
                </form>
            </div>
        </div>
    );
}
