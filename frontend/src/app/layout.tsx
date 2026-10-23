import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Local Learn — Offline-First Student OS",
  description:
    "100% open-source, air-gapped student operating system powered by local Gemma 4 weights, ChromaDB RAG, and automated study tools.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 antialiased selection:bg-emerald-500/20 selection:text-emerald-300 min-h-screen overflow-hidden">
        {children}
      </body>
    </html>
  );
}
