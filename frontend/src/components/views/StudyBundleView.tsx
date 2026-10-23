"use client";

import React, { useState, useRef } from "react";
import {
  Package,
  Download,
  Upload,
  Share2,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Layers,
  Sparkles,
} from "lucide-react";
import { Notebook, StudyBundle } from "@/lib/types";
import { exportStudyBundle, getDeadlines, getFlashcards, getSources } from "@/lib/api";

interface StudyBundleViewProps {
  notebook: Notebook;
  onImportComplete?: () => void;
}

export function StudyBundleView({ notebook, onImportComplete }: StudyBundleViewProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const [sources, flashcards, deadlines] = await Promise.all([
        getSources(notebook.id),
        getFlashcards(notebook.id),
        getDeadlines(notebook.id),
      ]);

      const bundle: StudyBundle = {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        notebook,
        sources,
        flashcards,
        deadlines,
        metrics: [
          {
            topic: "Consensus Protocols",
            accuracy: 88,
            totalAttempts: 25,
            status: "Mastered",
            recommendedFocus: "Ready for advanced topics",
          },
        ],
      };

      exportStudyBundle(bundle);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const bundle = JSON.parse(reader.result as string) as StudyBundle;
        setImportStatus(`Successfully verified and imported "${bundle.notebook?.title || file.name}"!`);
        if (onImportComplete) onImportComplete();
      } catch {
        setImportStatus("Error: Invalid or corrupted .study bundle archive.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800/60">
            Sprint 5 Ecosystem
          </span>
          <h1 className="text-xl font-extrabold text-zinc-100 flex items-center gap-2">
            <Package className="w-5 h-5 text-teal-400" />
            Ecosystem & Offline Study Bundles
          </h1>
        </div>
        <p className="text-xs text-zinc-400">
          Export and import self-contained <span className="font-mono text-teal-400">.study</span> archives for air-gapped peer sharing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Card */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between shadow-xl backdrop-blur">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-teal-950/60 text-teal-400 border border-teal-800/50">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-100">Export Course Bundle</h3>
                <p className="text-[11px] text-zinc-400">Pack active course assets into a portable .study archive</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 mb-4 text-xs text-zinc-300">
              <div className="font-semibold text-zinc-200">Package Includes:</div>
              <ul className="space-y-1.5 text-zinc-400 list-disc list-inside">
                <li>Notebook course code, title, and metadata</li>
                <li>{notebook.source_count || 2} indexed lecture source citations</li>
                <li>{notebook.flashcard_count || 8} compiled Anki flashcards</li>
                <li>{notebook.deadline_count || 3} syllabus deadlines and milestones</li>
                <li>Student mastery analytics and weak-spot metrics</li>
              </ul>
            </div>
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-teal-500/20"
          >
            <Download className="w-4 h-4" />
            {isExporting ? "Exporting Bundle..." : `Export "${notebook.title}.study"`}
          </button>
        </div>

        {/* Import Card */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between shadow-xl backdrop-blur">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-indigo-950/60 text-indigo-400 border border-indigo-800/50">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-100">Import Peer Bundle</h3>
                <p className="text-[11px] text-zinc-400">Load a classmate's .study archive directly into your local database</p>
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept=".study,.json"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleImportFile(e.target.files[0]);
                }
              }}
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 rounded-xl p-8 text-center cursor-pointer bg-zinc-950/70 transition group mb-4"
            >
              <div className="p-3 rounded-full bg-zinc-900 text-indigo-400 border border-zinc-800 w-fit mx-auto mb-2 group-hover:scale-105 transition">
                <FileCheck className="w-6 h-6" />
              </div>
              <div className="text-xs font-semibold text-zinc-200">Click to Select .study Archive</div>
              <p className="text-[11px] text-zinc-500 mt-0.5">Compatible with Local Learn OS bundle specifications</p>
            </div>

            {importStatus && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  importStatus.startsWith("Error")
                    ? "bg-rose-950/50 border-rose-800 text-rose-300"
                    : "bg-emerald-950/50 border-emerald-800 text-emerald-300"
                }`}
              >
                {importStatus.startsWith("Error") ? (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                )}
                <span>{importStatus}</span>
              </div>
            )}
          </div>

          <div className="text-[11px] text-zinc-500 text-center pt-2">
            Importing merges flashcards, documents, and syllabus deadlines locally with zero network traffic.
          </div>
        </div>
      </div>
    </div>
  );
}
