"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import { getTrainingStatus, triggerTraining } from "@/services/api";
import type { TrainingStatus } from "@/services/api";
import { Brain, Zap, Database, BarChart3, RefreshCw, CheckCircle, AlertCircle, Clock } from "lucide-react";

export default function LearnPage() {
    const router = useRouter();
    const [authChecked, setAuthChecked] = useState(false);
    const [status, setStatus] = useState<TrainingStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [training, setTraining] = useState(false);
    const [trainingMsg, setTrainingMsg] = useState<string | null>(null);
    const [trainingError, setTrainingError] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            if (!data.session) router.replace("/auth");
            else setAuthChecked(true);
        });
    }, [router]);

    const fetchStatus = useCallback(async () => {
        try {
            const s = await getTrainingStatus();
            setStatus(s);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (authChecked) fetchStatus();
    }, [authChecked, fetchStatus]);

    const handleTrain = async () => {
        setTraining(true);
        setTrainingMsg(null);
        setTrainingError(null);
        try {
            const res = await triggerTraining();
            setTrainingMsg(res.message);
            // Refresh status after a short delay
            setTimeout(() => fetchStatus(), 3000);
        } catch (e: unknown) {
            const detail =
                (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
                "Training failed.";
            setTrainingError(detail);
        } finally {
            setTraining(false);
        }
    };

    if (!authChecked) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
                <div className="orb-pulse" style={{ width: "44px", height: "44px", borderRadius: "50%", background: "var(--violet)" }} />
            </div>
        );
    }

    const pct = status
        ? Math.round((status.labeled_count / Math.max(status.min_required, 1)) * 100)
        : 0;
    const progressClamped = Math.min(pct, 100);

    const latestModel = status?.latest_model;

    return (
        <div className="bg-mesh" style={{ minHeight: "100vh" }}>
            <Navbar />
            <div style={{ padding: "32px 24px", maxWidth: "900px", margin: "0 auto" }}>
                {/* Header */}
                <div style={{ marginBottom: "36px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "10px" }}>
                        <div
                            style={{
                                width: "44px",
                                height: "44px",
                                borderRadius: "14px",
                                background: "linear-gradient(135deg, var(--violet), var(--cyan))",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: "0 0 20px rgba(139,92,246,0.35)",
                            }}
                        >
                            <Brain size={22} color="white" />
                        </div>
                        <div>
                            <h1 style={{ fontSize: "26px", fontWeight: 800 }}>
                                <span className="gradient-text">Rose</span> Learning Dashboard
                            </h1>
                            <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "2px" }}>
                                Train Rose's AI evaluator using your human-labeled scores
                            </p>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}>
                        <div className="orb-pulse" style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--violet)" }} />
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

                        {/* Phase indicator */}
                        <div className="glass-card" style={{ padding: "24px" }}>
                            <h2 style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "18px" }}>
                                Current Phase
                            </h2>
                            <div style={{ display: "flex", gap: "12px" }}>
                                {[
                                    { phase: "Phase 1", label: "Collect Labels", icon: <Database size={16} />, active: !status?.can_train, done: !!status?.can_train },
                                    { phase: "Phase 2", label: "Train Model", icon: <Brain size={16} />, active: status?.can_train && !status?.models_ready, done: !!status?.models_ready },
                                    { phase: "Phase 3", label: "Hybrid System", icon: <Zap size={16} />, active: !!status?.models_ready, done: false },
                                ].map((s, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            flex: 1,
                                            padding: "16px",
                                            borderRadius: "14px",
                                            border: `1px solid ${s.done ? "rgba(34,197,94,0.3)" : s.active ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.06)"}`,
                                            background: s.done ? "rgba(34,197,94,0.06)" : s.active ? "rgba(139,92,246,0.08)" : "rgba(255,255,255,0.02)",
                                            position: "relative",
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                                            <span style={{ color: s.done ? "#22c55e" : s.active ? "var(--violet)" : "var(--text-muted)" }}>
                                                {s.icon}
                                            </span>
                                            {s.done && <CheckCircle size={12} color="#22c55e" />}
                                            {s.active && !s.done && (
                                                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--violet)", display: "inline-block" }} className="orb-pulse" />
                                            )}
                                        </div>
                                        <p style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600 }}>{s.phase}</p>
                                        <p style={{ fontSize: "13px", fontWeight: 700, marginTop: "2px", color: s.active || s.done ? "var(--text-primary)" : "var(--text-muted)" }}>
                                            {s.label}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Stats row */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                            {/* Labeled count */}
                            <div className="glass-card" style={{ padding: "20px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                                    <Database size={16} color="var(--cyan)" />
                                    <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                                        Labeled Answers
                                    </span>
                                </div>
                                <p style={{ fontSize: "36px", fontWeight: 800, lineHeight: 1 }}>
                                    {status?.labeled_count ?? 0}
                                    <span style={{ fontSize: "16px", color: "var(--text-muted)", fontWeight: 400 }}>
                                        /{status?.min_required ?? 10}
                                    </span>
                                </p>
                                {/* Progress bar */}
                                <div style={{ marginTop: "12px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", height: "4px", overflow: "hidden" }}>
                                    <div
                                        style={{
                                            width: `${progressClamped}%`,
                                            height: "100%",
                                            background: "linear-gradient(90deg, var(--violet), var(--cyan))",
                                            borderRadius: "4px",
                                            transition: "width 0.6s ease",
                                        }}
                                    />
                                </div>
                                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "6px" }}>
                                    {!status?.can_train
                                        ? `${(status?.min_required ?? 10) - (status?.labeled_count ?? 0)} more needed to train`
                                        : "✓ Ready to train!"}
                                </p>
                            </div>

                            {/* Model status */}
                            <div className="glass-card" style={{ padding: "20px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                                    <Brain size={16} color="var(--violet)" />
                                    <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                                        Model Status
                                    </span>
                                </div>
                                {status?.models_ready ? (
                                    <>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <CheckCircle size={20} color="#22c55e" />
                                            <span style={{ fontWeight: 700, color: "#22c55e", fontSize: "16px" }}>Active</span>
                                        </div>
                                        <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px" }}>
                                            Rose is predicting scores
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <AlertCircle size={20} color="#f59e0b" />
                                            <span style={{ fontWeight: 700, color: "#f59e0b", fontSize: "16px" }}>Untrained</span>
                                        </div>
                                        <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px" }}>
                                            Label more answers to train
                                        </p>
                                    </>
                                )}
                            </div>

                            {/* R² accuracy */}
                            <div className="glass-card" style={{ padding: "20px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                                    <BarChart3 size={16} color="#22c55e" />
                                    <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                                        Accuracy (R²)
                                    </span>
                                </div>
                                {latestModel ? (
                                    <>
                                        <p style={{ fontSize: "36px", fontWeight: 800, lineHeight: 1, color: "#22c55e" }}>
                                            {(latestModel.avg_r2_score * 100).toFixed(0)}
                                            <span style={{ fontSize: "16px", fontWeight: 400 }}>%</span>
                                        </p>
                                        <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px" }}>
                                            Trained on {latestModel.sample_count} samples
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-muted)", lineHeight: 1 }}>—</p>
                                        <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px" }}>
                                            No model trained yet
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Train button */}
                        <div className="glass-card" style={{ padding: "28px" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
                                <div>
                                    <h3 style={{ fontSize: "16px", fontWeight: 700 }}>Train Rose Now</h3>
                                    <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>
                                        {status?.can_train
                                            ? `You have ${status.labeled_count} labeled answers ready. Training takes a few seconds.`
                                            : `Need ${(status?.min_required ?? 10) - (status?.labeled_count ?? 0)} more labeled answers before training is possible.`}
                                    </p>
                                </div>
                                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                    <button
                                        onClick={fetchStatus}
                                        style={{
                                            background: "rgba(255,255,255,0.05)",
                                            border: "1px solid var(--border)",
                                            borderRadius: "10px",
                                            padding: "9px 14px",
                                            color: "var(--text-muted)",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                            fontSize: "13px",
                                        }}
                                    >
                                        <RefreshCw size={14} /> Refresh
                                    </button>
                                    <button
                                        className="btn-primary"
                                        onClick={handleTrain}
                                        disabled={training || !status?.can_train}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            opacity: !status?.can_train ? 0.4 : 1,
                                        }}
                                    >
                                        <Brain size={16} />
                                        {training ? "Training…" : "Train Rose 🌹"}
                                    </button>
                                </div>
                            </div>

                            {trainingMsg && (
                                <div style={{ marginTop: "16px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "10px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
                                    <CheckCircle size={16} color="#22c55e" />
                                    <p style={{ fontSize: "13px", color: "#22c55e" }}>{trainingMsg}</p>
                                </div>
                            )}
                            {trainingError && (
                                <div style={{ marginTop: "16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
                                    <AlertCircle size={16} color="#f87171" />
                                    <p style={{ fontSize: "13px", color: "#f87171" }}>{trainingError}</p>
                                </div>
                            )}
                        </div>

                        {/* Latest model breakdown */}
                        {latestModel?.scores_json && (
                            <div className="glass-card" style={{ padding: "24px" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                                    <h3 style={{ fontSize: "14px", fontWeight: 700 }}>Latest Model R² Scores</h3>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-muted)" }}>
                                        <Clock size={12} />
                                        {new Date(latestModel.trained_at).toLocaleString()}
                                    </div>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                                    {Object.entries(latestModel.scores_json).map(([key, val]) => {
                                        const r2 = val.r2 ?? 0;
                                        const pctBar = Math.max(0, Math.min(100, r2 * 100));
                                        const color = pctBar > 70 ? "#22c55e" : pctBar > 40 ? "#f59e0b" : "#ef4444";
                                        const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                                        return (
                                            <div key={key} style={{ background: "rgba(255,255,255,0.02)", borderRadius: "12px", padding: "14px" }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                                                    <span style={{ fontSize: "13px", fontWeight: 600 }}>{label}</span>
                                                    <span style={{ fontSize: "13px", fontWeight: 800, color }}>{(r2 * 100).toFixed(1)}%</span>
                                                </div>
                                                <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "4px", height: "4px" }}>
                                                    <div style={{ width: `${pctBar}%`, height: "100%", background: color, borderRadius: "4px", transition: "width 0.6s" }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* How it works */}
                        <div className="glass-card" style={{ padding: "24px" }}>
                            <h3 style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "16px" }}>
                                How Rose Learns
                            </h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                {[
                                    { step: "1", text: "Submit an answer → get AI evaluation", color: "var(--violet)" },
                                    { step: "2", text: "Score it yourself using the sliders in the results panel", color: "var(--cyan)" },
                                    { step: "3", text: `Collect ${status?.min_required ?? 10}+ labeled answers`, color: "#f59e0b" },
                                    { step: "4", text: "Click \"Train Rose\" — a Random Forest model is trained in seconds", color: "#22c55e" },
                                    { step: "5", text: "Future evaluations show both AI + ML-predicted scores for comparison", color: "#a78bfa" },
                                ].map((s) => (
                                    <div key={s.step} style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                                        <div style={{
                                            width: "26px", height: "26px", borderRadius: "50%", flexShrink: 0,
                                            background: `${s.color}22`, border: `1px solid ${s.color}44`,
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            fontSize: "12px", fontWeight: 800, color: s.color
                                        }}>
                                            {s.step}
                                        </div>
                                        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>{s.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
