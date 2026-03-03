"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/dashboard");
      } else {
        router.replace("/auth");
      }
    });
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="orb-pulse w-16 h-16 rounded-full" />
    </div>
  );
}
