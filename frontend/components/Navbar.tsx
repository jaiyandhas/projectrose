"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LogOut, BarChart2, Zap, Brain } from "lucide-react";

export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.replace("/auth");
    };

    return (
        <nav
            style={{
                background: "rgba(8, 13, 26, 0.8)",
                backdropFilter: "blur(20px)",
                borderBottom: "1px solid var(--border)",
                padding: "0 24px",
                height: "60px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                position: "sticky",
                top: 0,
                zIndex: 100,
            }}
        >
            {/* Brand */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                    style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #ff6b9e, #8b5cf6)",
                        boxShadow: "0 0 16px rgba(255, 107, 158, 0.4)",
                    }}
                />
                <span style={{ fontWeight: 800, fontSize: "16px", letterSpacing: "-0.01em" }}>
                    Project <span className="rose-text">Rose</span>
                </span>
            </div>

            {/* Nav links */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Link
                    href="/dashboard"
                    className={`nav-link ${pathname === "/dashboard" ? "active" : ""}`}
                    style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                    <Zap size={14} /> Evaluate
                </Link>
                <Link
                    href="/analytics"
                    className={`nav-link ${pathname === "/analytics" ? "active" : ""}`}
                    style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                    <BarChart2 size={14} /> Analytics
                </Link>
                <Link
                    href="/learn"
                    className={`nav-link ${pathname === "/learn" ? "active" : ""}`}
                    style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                    <Brain size={14} /> Learn 🌹
                </Link>
                <button
                    onClick={handleLogout}
                    className="nav-link"
                    style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                    }}
                >
                    <LogOut size={14} /> Sign out
                </button>
            </div>
        </nav>
    );
}
