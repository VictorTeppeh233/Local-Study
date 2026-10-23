"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, Cpu, HardDrive, WifiOff, Terminal } from "lucide-react";
import { checkBackendHealth } from "@/lib/api";
import { Notebook } from "@/lib/types";

interface HeaderProps {
  activeNotebook: Notebook | null;
}

export function Header({ activeNotebook }: HeaderProps) {
  const [ollamaStatus, setOllamaStatus] = useState<string>("Checking...");
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(true);

  useEffect(() => {
    checkBackendHealth().then((res) => {
      setIsBackendOnline(res.online);
      setOllamaStatus(res.ollama);
    });

    const interval = setInterval(() => {
      checkBackendHealth().then((res) => {
        setIsBackendOnline(res.online);
        setOllamaStatus(res.ollama);
      });
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-6 flex items-center justify-between">
      {/* Brand & Active Notebook */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-zinc-950 font-black text-lg shadow-lg shadow-emerald-500/20">
            L
          </div>
          <div>
            <span className="font-extrabold tracking-tight text-zinc-100 text-lg flex items-center gap-1.5">
              Local Learn
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                OS v1.0
              </span>
            </span>
          </div>
        </div>

        {activeNotebook && (
          <div className="hidden md:flex items-center gap-2 pl-4 border-l border-zinc-800 text-xs">
            <span className="text-zinc-500">Active Course:</span>
            <span className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-750 font-medium text-emerald-400 flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {activeNotebook.title}
              {activeNotebook.course_code && (
                <span className="text-zinc-500 font-mono text-[11px]">({activeNotebook.course_code})</span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Air-Gap Status Badge & Model Details */}
      <div className="flex items-center gap-3">
        {/* Offline Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs font-semibold shadow-inner">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Air-Gap Mode Active
          </span>
          <span className="text-emerald-700">|</span>
          <span className="flex items-center gap-1 text-emerald-400/90 font-mono text-[11px]">
            <Cpu className="w-3 h-3" />
            Model: gemma4:e4b (Ollama)
          </span>
        </div>

        {/* Backend Connectivity Status */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
            isBackendOnline
              ? "bg-zinc-900/80 border-zinc-800 text-zinc-300"
              : "bg-amber-950/40 border-amber-800/50 text-amber-300"
          }`}
          title={isBackendOnline ? "Connected to Local FastAPI server on :8000" : "Offline / Simulated Fallback"}
        >
          <HardDrive className="w-3 h-3 text-zinc-400" />
          <span>{isBackendOnline ? "API :8000" : "Demo Mode"}</span>
        </div>
      </div>
    </header>
  );
}
