import { NextRequest, NextResponse } from "next/server";

// Allow this serverless function to run for up to 60 seconds (Vercel max for Hobby tier default is 10s or 60s max config)
export const maxDuration = 60;
export async function POST(request: NextRequest) {
    try {
        const payload = await request.json();
        const token = request.headers.get("Authorization");

        // Forward the request to your Render backend
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://rose-backend-7aph.onrender.com";
        const res = await fetch(`${backendUrl}/api/evaluate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: token }),
            },
            body: JSON.stringify(payload),
        });

        const data = await res.json();

        // Pass the backend response (even error status codes) right back to the frontend
        return NextResponse.json(data, { status: res.status });

    } catch (error: any) {
        return NextResponse.json(
            { detail: "Internal Server Proxy Error", error: error.message },
            { status: 500 }
        );
    }
}
