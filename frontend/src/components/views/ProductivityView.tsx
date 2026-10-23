"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Zap,
  Download,
  Sparkles,
  Camera,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Image as ImageIcon,
  Send,
  Loader2,
  CheckCircle2,
  Layers,
  ArrowRight,
  Eye,
} from "lucide-react";
import { Flashcard, Notebook } from "@/lib/types";
import {
  downloadAnkiDeck,
  generateFlashcards,
  getFlashcards,
  sendChatQuery,
} from "@/lib/api";

interface ProductivityViewProps {
  notebook: Notebook;
}

export function ProductivityView({ notebook }: ProductivityViewProps) {
  // Flashcards state
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isGeneratingCards, setIsGeneratingCards] = useState(false);
  const [isDownloadingAnki, setIsDownloadingAnki] = useState(false);

  // Audio Briefing state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioSpeed, setAudioSpeed] = useState<number>(1.0);
  const [audioProgress, setAudioProgress] = useState<number>(34); // percentage

  // Snap & Solve Vision state
  const [visionImage, setVisionImage] = useState<string | null>(null);
  const [visionQuery, setVisionQuery] = useState("");
  const [visionAnswer, setVisionAnswer] = useState<string | null>(null);
  const [isAnalyzingVision, setIsAnalyzingVision] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;
    getFlashcards(notebook.id).then((data) => {
      if (isMounted) setCards(data);
    });
    return () => {
      isMounted = false;
    };
  }, [notebook.id]);

  // Audio simulator loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlayingAudio) {
      interval = setInterval(() => {
        setAudioProgress((prev) => (prev >= 100 ? 0 : prev + 1));
      }, 300 / audioSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlayingAudio, audioSpeed]);

  const handleExportAnki = async () => {
    setIsDownloadingAnki(true);
    try {
      await downloadAnkiDeck(notebook.id, notebook.title);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDownloadingAnki(false);
    }
  };

  const handleGenerateCards = async () => {
    setIsGeneratingCards(true);
    try {
      const newCards = await generateFlashcards(notebook.id, 4);
      setCards((prev) => [...newCards, ...prev]);
      setCurrentCardIndex(0);
      setIsFlipped(false);
    } finally {
      setIsGeneratingCards(false);
    }
  };

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setVisionImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSolveVision = async () => {
    if (!visionImage || isAnalyzingVision) return;
    setIsAnalyzingVision(true);
    setVisionAnswer(null);

    try {
      const query = visionQuery.trim() || "Analyze this whiteboard diagram/equation step-by-step and explain the solution.";
      const res = await sendChatQuery(notebook.id, query, visionImage);
      setVisionAnswer(res.response);
    } catch {
      setVisionAnswer("Failed to process diagram with Gemma vision.");
    } finally {
      setIsAnalyzingVision(false);
    }
  };

  const currentCard = cards[currentCardIndex];

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-y-auto p-6 max-w-6xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
            Sprint 3 Power-Ups
          </span>
          <h1 className="text-xl font-extrabold text-zinc-100 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Productivity Power-Ups Hub
          </h1>
        </div>
        <p className="text-xs text-zinc-400">
          Anki flashcard decks, synthesized audio briefings, and multimodal Snap & Solve whiteboard analysis.
        </p>
      </div>

      {/* Grid: Anki Decks & Audio Briefing (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Anki Flashcard Generator & Interactive Deck */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between shadow-xl backdrop-blur">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-amber-950/60 text-amber-400 border border-amber-800/50">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">Anki Flashcard Deck</h3>
                  <p className="text-[11px] text-zinc-400">
                    Spaced repetition deck compiled via <span className="font-mono text-amber-400">genanki</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateCards}
                  disabled={isGeneratingCards}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 flex items-center gap-1.5 transition"
                >
                  {isGeneratingCards ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" /> : <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                  Generate Cards
                </button>

                <button
                  onClick={handleExportAnki}
                  disabled={isDownloadingAnki}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition shadow"
                >
                  {isDownloadingAnki ? <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-950" /> : <Download className="w-3.5 h-3.5" />}
                  Export .apkg Deck
                </button>
              </div>
            </div>

            {/* Interactive Flashcard Preview */}
            {cards.length > 0 && currentCard ? (
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="my-4 min-h-[160px] p-6 rounded-xl bg-zinc-950/90 border border-zinc-750 flex flex-col justify-between cursor-pointer hover:border-amber-500/50 transition-all select-none shadow-inner"
              >
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span className="font-mono uppercase font-bold text-amber-400">
                    {isFlipped ? "Answer (Back)" : "Question (Front)"}
                  </span>
                  <span>
                    Card {currentCardIndex + 1} of {cards.length} • Click to flip
                  </span>
                </div>

                <div className="text-center py-4">
                  <p className="text-sm sm:text-base font-semibold text-zinc-100">
                    {isFlipped ? currentCard.back : currentCard.front}
                  </p>
                </div>

                <div className="text-center text-[10px] text-zinc-500">
                  {isFlipped ? "Ready for Anki Spaced Repetition" : "Tap anywhere to reveal definition"}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl my-4">
                No flashcards created yet. Click Generate Cards to synthesize high-yield pairs with Gemma.
              </div>
            )}
          </div>

          {/* Navigation Controls */}
          {cards.length > 0 && (
            <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80 text-xs text-zinc-400">
              <button
                onClick={() => {
                  setIsFlipped(false);
                  setCurrentCardIndex((prev) => (prev > 0 ? prev - 1 : cards.length - 1));
                }}
                className="px-3 py-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 transition"
              >
                Previous Card
              </button>
              <span className="font-mono text-zinc-500">
                {currentCardIndex + 1} / {cards.length}
              </span>
              <button
                onClick={() => {
                  setIsFlipped(false);
                  setCurrentCardIndex((prev) => (prev < cards.length - 1 ? prev + 1 : 0));
                }}
                className="px-3 py-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 transition"
              >
                Next Card
              </button>
            </div>
          )}
        </div>

        {/* Card 2: Offline Audio Briefing */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between shadow-xl backdrop-blur">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-indigo-950/60 text-indigo-400 border border-indigo-800/50">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">Offline Audio Briefing</h3>
                  <p className="text-[11px] text-zinc-400">5-minute synthesized spoken lecture summary</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
                Offline TTS
              </span>
            </div>

            {/* Simulated Animated Waveform */}
            <div className="my-6 p-6 rounded-xl bg-zinc-950/90 border border-zinc-800 flex items-center justify-center gap-1.5 h-24">
              {[40, 65, 30, 85, 45, 95, 60, 20, 75, 50, 90, 35, 60, 80, 45, 100, 70, 30, 55, 80, 40, 65].map((h, i) => (
                <div
                  key={i}
                  style={{
                    height: isPlayingAudio ? `${Math.max(15, (h * (audioProgress % 10 + 2)) % 95)}%` : `${h * 0.4}%`,
                  }}
                  className={`w-1.5 rounded-full transition-all duration-150 ${
                    i / 22 <= audioProgress / 100 ? "bg-indigo-400" : "bg-zinc-700"
                  }`}
                />
              ))}
            </div>

            {/* Progress track */}
            <div className="space-y-1">
              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-200"
                  style={{ width: `${audioProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                <span>01:42</span>
                <span>05:00</span>
              </div>
            </div>
          </div>

          {/* Audio Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-800/80">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-zinc-100 font-bold transition shadow-md shadow-indigo-600/30"
              >
                {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <button
                onClick={() => setAudioProgress(0)}
                className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                title="Restart"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Playback speed selector */}
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs font-mono">
              {[1.0, 1.25, 1.5, 2.0].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setAudioSpeed(speed)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                    audioSpeed === speed ? "bg-indigo-600 text-white font-bold" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: "Snap & Solve" Multimodal Vision Zone */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 shadow-xl backdrop-blur">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                "Snap & Solve" Multimodal Vision Zone
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                  Gemma 4 Vision
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                Drag-and-drop or upload whiteboard photos, formulas, and handwritten diagram notes.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Image Uploader & Preview (5 Cols) */}
          <div className="md:col-span-5 flex flex-col justify-center">
            <input
              type="file"
              ref={imageInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleImageUpload(e.target.files[0]);
                }
              }}
            />

            {visionImage ? (
              <div className="relative rounded-xl overflow-hidden border border-zinc-750 bg-zinc-950 p-2 group">
                <img
                  src={visionImage}
                  alt="Whiteboard Snapshot"
                  className="w-full h-48 object-contain rounded-lg"
                />
                <button
                  onClick={() => setVisionImage(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg bg-black/80 text-zinc-300 hover:text-rose-400 transition"
                  title="Remove Image"
                >
                  Change
                </button>
              </div>
            ) : (
              <div
                onClick={() => imageInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 rounded-xl p-8 text-center cursor-pointer bg-zinc-950/60 transition group"
              >
                <div className="p-3 rounded-full bg-zinc-900 text-emerald-400 border border-zinc-800 w-fit mx-auto mb-2 group-hover:scale-105 transition">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div className="text-xs font-semibold text-zinc-200">Drop Whiteboard Image Here</div>
                <p className="text-[11px] text-zinc-500 mt-0.5">Supports PNG, JPG, WebP photo of notes</p>
              </div>
            )}
          </div>

          {/* Prompt input & analysis output (7 Cols) */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Student Question / Guidance for Gemma Vision
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Derive the proof on the left, or explain the state machine transition diagram..."
                value={visionQuery}
                onChange={(e) => setVisionQuery(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-750 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <button
              onClick={handleSolveVision}
              disabled={!visionImage || isAnalyzingVision}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-emerald-500/20"
            >
              {isAnalyzingVision ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                  Running Multimodal Inference with gemma4:e4b...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Snap & Solve with Gemma 4 Vision
                </>
              )}
            </button>

            {/* Answer Display */}
            {visionAnswer && (
              <div className="p-4 rounded-xl bg-zinc-950 border border-emerald-900/60 text-xs text-zinc-200 leading-relaxed shadow-inner">
                <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase mb-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Gemma Multimodal Solution
                </div>
                <div className="whitespace-pre-wrap">{visionAnswer}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
