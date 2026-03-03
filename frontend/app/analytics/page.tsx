"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import HistoryList from "@/components/HistoryList";
import { getAnalytics, getHistory } from "@/services/api";
import type { AnalyticsSummary, HistoryItem } from "@/services/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, Target, Award } from "lucide-react";

export default function AnalyticsPage() {
    const router = useRouter();
    const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            if (!data.session) { router.replace("/auth"); return; }
            Promise.all([getAnalytics(), getHistory(1, 20)]).then(([a, h]) => {
                setAnalytics(a);
                setHistory(h);
                setLoading(false);
            }).catch(() => setLoading(false));
        });
    }, [router]);

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
                <div className="orb-pulse" style={{ width: "44px", height: "44px", borderRadius: "50%", background: "var(--violet)" }} />
            </div>
        );
    }

    // Chart data: last 10 evaluations
    const chartData = [...history].reverse().slice(-10).map((h, i) => ({
        name: `#${i + 1}`,
        score: parseFloat(h.overall_score.toFixed(1)),
    }));

    const statCards = [
        {
            icon: <Target size={20} />,
            label: "Total Attempts",
            value: analytics?.attempts_count ?? 0,
            color: "var(--violet)",
        },
        {
            icon: <TrendingUp size={20} />,
            label: "Average Score",
            value: `${(analytics?.avg_score ?? 0).toFixed(1)}/30`,
            color: "var(--cyan)",
        },
        {
            icon: <Award size={20} />,
            label: "Best Score",
            value: history.length
                ? `${Math.max(...history.map((h) => h.overall_score)).toFixed(1)}/30`
                : "—",
            color: "#22c55e",
        },
    ];

    return (
        <div className="bg-mesh" style={{ minHeight: "100vh" }}>
            <Navbar />
            <div style={{ padding: "32px 24px", maxWidth: "1100px", margin: "0 auto" }}>
                {/* Header */}
                <div style={{ marginBottom: "32px" }}>
                    <h1 style={{ fontSize: "28px", fontWeight: 800 }}>
                        <span className="rose-text">Rose</span> Analytics
                    </h1>
                    <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "6px" }}>
                        Track your progress and improvement over time.
                    </p>
                </div>

                {/* Stat cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "28px" }}>
                    {statCards.map(({ icon, label, value, color }) => (
                        <div
                            key={label}
                            className="glass-card animate-fade-up"
                            style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: "16px" }}
                        >
                            <div
                                style={{
                                    width: "44px",
                                    height: "44px",
                                    borderRadius: "12px",
                                    background: `${color}22`,
                                    color,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                {icon}
                            </div>
                            <div>
                                <p style={{ color: "var(--text-muted)", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                                <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginTop: "2px" }}>{value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Chart */}
                {chartData.length > 0 && (
                    <div className="glass-card" style={{ padding: "24px", marginBottom: "28px" }}>
                        <h2 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "20px" }}>Score Trend (last 10)</h2>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis domain={[0, 30]} tick={{ fill: "var(--text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{
                                        background: "var(--bg-secondary)",
                                        border: "1px solid var(--border)",
                                        borderRadius: "10px",
                                        color: "var(--text-primary)",
                                        fontSize: "13px",
                                    }}
                                    cursor={{ fill: "rgba(139,92,246,0.1)" }}
                                />
                                <Bar dataKey="score" fill="var(--violet)" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* History list */}
                <div className="glass-card" style={{ padding: "24px" }}>
                    <h2 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "16px" }}>
                        Evaluation History
                    </h2>
                    <HistoryList items={history} />
                </div>
            </div>
        </div>
    );
}
