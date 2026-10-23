"use client";

import React, { useState } from "react";
import {
  BarChart3,
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  Loader2,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  FileQuestion,
  BookOpen,
} from "lucide-react";
import { Notebook, QuizQuestion, WeakSpotMetric } from "@/lib/types";

interface QuizzesAnalyticsViewProps {
  notebook: Notebook;
}

const SAMPLE_POP_QUIZ: QuizQuestion[] = [
  {
    id: 1,
    topic: "Consensus Protocols",
    question: "What is the primary difference between crash-fault-tolerant (CFT) and Byzantine-fault-tolerant (BFT) consensus?",
    options: [
      "CFT systems tolerate nodes halting unexpectedly, whereas BFT systems can tolerate nodes sending malicious or contradictory messages.",
      "CFT systems use asymmetric cryptography while BFT systems use symmetric hashing.",
      "CFT requires 3f + 1 nodes whereas BFT only requires 2f + 1 nodes.",
      "There is no difference; they are interchangeable terms.",
    ],
    correctIndex: 0,
    explanation:
      "Crash-fault tolerance (e.g. Raft, Paxos) assumes non-faulty nodes execute honestly or halt. Byzantine fault tolerance (e.g. PBFT) defends against arbitrary and malicious behavior.",
  },
  {
    id: 2,
    topic: "Distributed Clocks",
    question: "Which of the following guarantees that if event A caused event B, then Clock(A) < Clock(B)?",
    options: [
      "NTP Wall Clock time synchronization",
      "Lamport Logical Clocks and Vector Clocks",
      "TCP sequence numbers",
      "DNS propagation timestamps",
    ],
    correctIndex: 1,
    explanation:
      "Lamport timestamps and Vector clocks capture the strict causal happens-before relationship in asynchronous distributed networks without relying on physical clock synchrony.",
  },
  {
    id: 3,
    topic: "Concurrency Control",
    question: "In Two-Phase Locking (2PL), what prevents a transaction from acquiring new locks once it releases any lock?",
    options: [
      "The shrinking phase begins immediately upon the first lock release.",
      "The operating system scheduler preempts the thread.",
      "ChromaDB automatically rolls back the transaction.",
      "A timeout triggers after 100 milliseconds.",
    ],
    correctIndex: 0,
    explanation:
      "Strict 2PL divides execution into growing and shrinking phases to ensure serializability. Once the first lock is released, no new locks can ever be acquired.",
  },
];

const INITIAL_METRICS: WeakSpotMetric[] = [
  {
    topic: "Distributed Clocks & Causality",
    accuracy: 45,
    totalAttempts: 20,
    status: "Needs Review",
    recommendedFocus: "Review vector clock merge rules and Lamport partial ordering proofs.",
  },
  {
    topic: "Two-Phase Commit & 2PL",
    accuracy: 62,
    totalAttempts: 16,
    status: "Moderate",
    recommendedFocus: "Practice lock escalation protocols and deadlock detection algorithms.",
  },
  {
    topic: "Consensus (Paxos & Raft)",
    accuracy: 88,
    totalAttempts: 25,
    status: "Mastered",
    recommendedFocus: "Strong mastery. Ready for advanced leaderless consensus questions.",
  },
];

export function QuizzesAnalyticsView({ notebook }: QuizzesAnalyticsViewProps) {
  const [quizMode, setQuizMode] = useState<"pop" | "essay">("pop");

  // Pop-Quiz State
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [popScore, setPopScore] = useState(0);

  // Essay Quiz State
  const [essayPrompt, setEssayPrompt] = useState(
    "Explain how the Raft consensus algorithm handles split-vote scenarios during leader election, and why randomized timeouts solve this problem."
  );
  const [studentEssay, setStudentEssay] = useState("");
  const [isEvaluatingEssay, setIsEvaluatingEssay] = useState(false);
  const [essayFeedback, setEssayFeedback] = useState<{
    score: number;
    grade: string;
    strengths: string;
    areasToImprove: string;
    rubricEvaluation: string;
  } | null>(null);

  const currentQ = SAMPLE_POP_QUIZ[currentQIndex];

  const handleSelectOption = (idx: number) => {
    if (hasAnswered) return;
    setSelectedOption(idx);
    setHasAnswered(true);
    if (idx === currentQ.correctIndex) {
      setPopScore((s) => s + 1);
    }
  };

  const handleNextQuestion = () => {
    setSelectedOption(null);
    setHasAnswered(false);
    if (currentQIndex < SAMPLE_POP_QUIZ.length - 1) {
      setCurrentQIndex((i) => i + 1);
    } else {
      // Completed quiz loop
      setCurrentQIndex(0);
    }
  };

  const handleEvaluateEssay = async () => {
    if (!studentEssay.trim() || isEvaluatingEssay) return;
    setIsEvaluatingEssay(true);

    // Call Gemma evaluator simulation
    await new Promise((r) => setTimeout(r, 1600));

    setEssayFeedback({
      score: 92,
      grade: "A (Excellent Comprehension)",
      strengths:
        "Accurately articulated how randomized election timeouts (e.g. 150-300ms) prevent simultaneous candidate transitions and split votes.",
      areasToImprove:
        "Consider noting the term 'heartbeat interval' and how leader AppendEntries RPCs suppress follower timeouts.",
      rubricEvaluation:
        "Rubric Score:\n• Theoretical Rigor: 9.5/10\n• Clarity & Terminology: 9.0/10\n• Completeness: 9.2/10",
    });
    setIsEvaluatingEssay(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-y-auto p-6 max-w-6xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/60">
            Sprint 4 Assessment
          </span>
          <h1 className="text-xl font-extrabold text-zinc-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            Quizzes & Weak-Spot Analytics
          </h1>
        </div>
        <p className="text-xs text-zinc-400">
          Formative multiple-choice drills, Gemma 4 essay rubrics, and persistent weak-spot metrics.
        </p>
      </div>

      {/* Weak-Spot Analytics Dashboard Cards (SQLite Metrics) */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          Weak-Spot Analytics (SQLite Metrics)
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {INITIAL_METRICS.map((metric, i) => {
            const isWeak = metric.status === "Needs Review";
            const isMastered = metric.status === "Mastered";

            return (
              <div
                key={i}
                className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between shadow-lg backdrop-blur"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-xs font-bold text-zinc-200">{metric.topic}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isWeak
                          ? "bg-rose-950/60 border-rose-800/80 text-rose-300"
                          : isMastered
                          ? "bg-emerald-950/60 border-emerald-800/80 text-emerald-300"
                          : "bg-amber-950/60 border-amber-800/80 text-amber-300"
                      }`}
                    >
                      {metric.status}
                    </span>
                  </div>

                  {/* Accuracy Bar */}
                  <div className="space-y-1.5 my-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-zinc-500">Mastery Score</span>
                      <span
                        className={`font-bold ${
                          isWeak ? "text-rose-400" : isMastered ? "text-emerald-400" : "text-amber-400"
                        }`}
                      >
                        {metric.accuracy}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isWeak ? "bg-rose-500" : isMastered ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                        style={{ width: `${metric.accuracy}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-800/80 text-[11px] text-zinc-400 leading-snug">
                  <span className="font-semibold text-zinc-300">Action: </span>
                  {metric.recommendedFocus}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quiz Engine Switcher (Pop-Quiz vs Typed Essay) */}
      <div className="p-6 rounded-2xl bg-zinc-900/70 border border-zinc-800 shadow-xl backdrop-blur">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800 mb-6">
          <div className="flex items-center gap-2">
            <FileQuestion className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-bold text-zinc-100">Interactive Quiz Simulator</h2>
          </div>

          {/* Toggle Buttons */}
          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
            <button
              onClick={() => setQuizMode("pop")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                quizMode === "pop"
                  ? "bg-indigo-600 text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Pop-Quiz (Multiple Choice)
            </button>
            <button
              onClick={() => setQuizMode("essay")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                quizMode === "essay"
                  ? "bg-indigo-600 text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Typed Essay (Gemma Evaluator)
            </button>
          </div>
        </div>

        {/* View A: Pop-Quiz */}
        {quizMode === "pop" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span className="font-mono uppercase text-indigo-400 font-bold">
                Question {currentQIndex + 1} of {SAMPLE_POP_QUIZ.length} • {currentQ.topic}
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 font-mono text-emerald-400">
                Score: {popScore} / {SAMPLE_POP_QUIZ.length}
              </span>
            </div>

            <div className="text-sm sm:text-base font-semibold text-zinc-100 leading-snug">
              {currentQ.question}
            </div>

            {/* Options list */}
            <div className="space-y-2.5">
              {currentQ.options.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === currentQ.correctIndex;

                let btnStyles = "bg-zinc-950/80 border-zinc-800 hover:border-zinc-700 text-zinc-300";
                if (hasAnswered) {
                  if (isCorrect) {
                    btnStyles = "bg-emerald-950/60 border-emerald-500 text-emerald-200 font-medium";
                  } else if (isSelected) {
                    btnStyles = "bg-rose-950/60 border-rose-500 text-rose-200";
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={hasAnswered}
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm transition-all flex items-start gap-3 ${btnStyles}`}
                  >
                    <span className="w-5 h-5 rounded-md bg-zinc-900 border border-zinc-750 flex items-center justify-center font-mono text-xs text-zinc-400 shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="leading-relaxed">{opt}</span>
                  </button>
                );
              })}
            </div>

            {/* Answer explanation card */}
            {hasAnswered && (
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 space-y-2 animate-in fade-in">
                <div className="font-bold flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" /> Explanation & Verification:
                </div>
                <p className="leading-relaxed text-zinc-400">{currentQ.explanation}</p>
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleNextQuestion}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-zinc-100 font-bold text-xs transition shadow"
                  >
                    Next Question
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* View B: Typed Essay with Gemma Evaluator */}
        {quizMode === "essay" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300">
              <span className="text-[10px] font-mono uppercase font-bold text-indigo-400 block mb-1">
                Essay Prompt
              </span>
              <p className="text-sm font-semibold text-zinc-200">{essayPrompt}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Your Answer / Explanation:
              </label>
              <textarea
                rows={5}
                placeholder="Type your explanation here. Gemma 4 will grade your rigor, terminology, and concept mastery against the rubric..."
                value={studentEssay}
                onChange={(e) => setStudentEssay(e.target.value)}
                className="w-full p-4 rounded-xl bg-zinc-950 border border-zinc-750 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition leading-relaxed"
              />
            </div>

            <button
              onClick={handleEvaluateEssay}
              disabled={isEvaluatingEssay || !studentEssay.trim()}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-zinc-100 font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/30"
            >
              {isEvaluatingEssay ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gemma 4 Evaluating Response via Local Offline Rubric...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-300" />
                  Evaluate Answer with Gemma 4
                </>
              )}
            </button>

            {/* Gemma Feedback Panel */}
            {essayFeedback && (
              <div className="p-5 rounded-2xl bg-zinc-950 border border-emerald-800/60 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm font-bold text-zinc-100">Gemma Evaluation Report</span>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Grade: {essayFeedback.grade} ({essayFeedback.score}/100)
                  </span>
                </div>

                <div className="text-xs space-y-2">
                  <p className="text-emerald-300 font-medium leading-relaxed">
                    <strong className="text-zinc-200">Key Strengths: </strong>
                    {essayFeedback.strengths}
                  </p>
                  <p className="text-amber-300 font-medium leading-relaxed">
                    <strong className="text-zinc-200">Areas to Deepen: </strong>
                    {essayFeedback.areasToImprove}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 font-mono text-[11px] text-zinc-400 whitespace-pre-wrap">
                  {essayFeedback.rubricEvaluation}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
