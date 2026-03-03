"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import EvaluationForm from "@/components/EvaluationForm";
import ResultsPanel from "@/components/ResultsPanel";
import { evaluateAnswer } from "@/services/api";
import type { EvaluationResult } from "@/services/api";
import ManualScorePanel from "@/components/ManualScorePanel";

export default function DashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<EvaluationResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [authChecked, setAuthChecked] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            if (!data.session) router.replace("/auth");
            else setAuthChecked(true);
        });
    }, [router]);

    if (!authChecked) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
                <div className="orb-pulse" style={{ width: "44px", height: "44px", borderRadius: "50%", background: "var(--violet)" }} />
            </div>
        );
    }

    const handleEvaluate = async (payload: {
        question_text: string;
        answer_text: string;
        sample_answer_text?: string;
    }) => {
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const res = await evaluateAnswer(payload);
            setResult(res);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { detail?: string } }; message?: string })
                ?.response?.data?.detail ?? (err as Error)?.message ?? "Evaluation failed";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-mesh" style={{ minHeight: "100vh" }}>
            <Navbar />

            <div style={{ padding: "32px 24px", maxWidth: "1280px", margin: "0 auto" }}>
                {/* Header */}
                <div style={{ marginBottom: "36px" }}>
                    <h1 style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "-0.02em" }}>
                        Evaluate with <span className="rose-text">Rose</span>
                    </h1>
                    <p style={{ color: "var(--text-muted)", fontSize: "15px", marginTop: "8px", fontWeight: 500 }}>
                        Submit your answer and let Rose score it on Originality, Understanding, and References.
                    </p>
                </div>

                {/* Split panel */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "45% 55%",
                        gap: "24px",
                        alignItems: "start",
                    }}
                >
                    {/* Left: form */}
                    <div className="glass-card" style={{ padding: "28px" }}>
                        <h2 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "20px" }}>
                            Your Submission
                        </h2>
                        <EvaluationForm onSubmit={handleEvaluate} loading={loading} />
                    </div>

                    {/* Right: results */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                        <div className="glass-card" style={{ padding: "28px", minHeight: "400px" }}>
                            <h2 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "20px" }}>
                                Rose's Evaluation
                            </h2>
                            <ResultsPanel loading={loading} result={result} error={error} />
                        </div>
                        {/* Manual scoring panel — shown after evaluation */}
                        {result && (
                            <ManualScorePanel evaluationId={result.id} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
