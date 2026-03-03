import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Project Rose",
  description: "Get instant AI-powered scoring and feedback on your written answers",
};

import BubbleBackground from "@/components/ui/BubbleBackground";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-mesh min-h-screen relative`}>
        <BubbleBackground />
        {children}
      </body>
    </html>
  );
}
