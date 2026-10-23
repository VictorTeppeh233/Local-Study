"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Download,
  Plus,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  BookmarkCheck,
  Loader2,
  Trash2,
} from "lucide-react";
import { Deadline, Notebook } from "@/lib/types";
import {
  createDeadline,
  downloadCalendar,
  getDeadlines,
} from "@/lib/api";

interface TimelineCalendarViewProps {
  notebook: Notebook;
}

export function TimelineCalendarView({ notebook }: TimelineCalendarViewProps) {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    getDeadlines(notebook.id).then((data) => {
      if (isMounted) {
        setDeadlines(data);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [notebook.id]);

  const handleSyncIcs = async () => {
    setIsSyncing(true);
    try {
      await downloadCalendar(notebook.id, notebook.title);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dueDate) return;

    try {
      const newD = await createDeadline(notebook.id, {
        title,
        due_date: dueDate,
        description,
      });
      setDeadlines((prev) => [...prev, newD].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()));
      setTitle("");
      setDueDate("");
      setDescription("");
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAiExtract = async () => {
    setIsExtracting(true);
    // Simulate or call AI extractor
    await new Promise((r) => setTimeout(r, 1200));
    const extracted: Deadline = {
      id: Date.now(),
      notebook_id: notebook.id,
      title: "Extracted: Lab 3 Distributed Key-Value Store",
      description: "Auto-extracted by Gemma 4 from uploaded syllabus schedule.",
      due_date: "2026-11-25T23:59:00",
    };
    setDeadlines((prev) => [...prev, extracted]);
    setIsExtracting(false);
  };

  const formatDueDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return {
        formatted: d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        daysLeft: Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      };
    } catch {
      return { formatted: dateStr, daysLeft: 0 };
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-y-auto p-6 max-w-6xl mx-auto w-full">
      {/* Top Bar with Sync Schedule Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
              Sprint 2 Engine
            </span>
            <h1 className="text-xl font-extrabold text-zinc-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              Timeline & Calendar Engine
            </h1>
          </div>
          <p className="text-xs text-zinc-400">
            Syllabus milestones, assignment deadlines, and offline calendar synchronization.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleAiExtract}
            disabled={isExtracting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-xs font-semibold text-zinc-200 transition shadow-sm"
          >
            {isExtracting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            )}
            AI Extract from Syllabus
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-xs font-semibold text-zinc-200 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            Add Milestone
          </button>

          {/* Prominent .ICS Sync Action Button */}
          <button
            onClick={handleSyncIcs}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
          >
            {isSyncing ? (
              <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Sync Schedule (.ics)
          </button>
        </div>
      </div>

      {/* Deadlines Timeline Feed */}
      <div className="py-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-zinc-500 text-xs">
            <Loader2 className="w-5 h-5 animate-spin mr-2 text-emerald-400" />
            Loading timeline events...
          </div>
        ) : deadlines.length === 0 ? (
          <div className="p-8 text-center border border-zinc-800 rounded-2xl bg-zinc-900/40 space-y-3">
            <Calendar className="w-8 h-8 text-zinc-600 mx-auto" />
            <div className="text-sm font-semibold text-zinc-300">No deadlines recorded yet</div>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Add upcoming assignments, exam dates, or extract milestones automatically from your uploaded course syllabus.
            </p>
          </div>
        ) : (
          <div className="relative border-l border-zinc-800 ml-4 space-y-6">
            {deadlines.map((item, index) => {
              const { formatted, daysLeft } = formatDueDate(item.due_date);
              const isUrgent = daysLeft >= 0 && daysLeft <= 3;
              const isPast = daysLeft < 0;

              return (
                <div key={item.id || index} className="relative pl-6 group">
                  {/* Timeline Node Icon */}
                  <div
                    className={`absolute -left-3 top-1.5 w-6 h-6 rounded-full flex items-center justify-center border shadow-md ${
                      isUrgent
                        ? "bg-amber-950 border-amber-500 text-amber-400 animate-pulse"
                        : isPast
                        ? "bg-zinc-900 border-zinc-700 text-zinc-500"
                        : "bg-emerald-950 border-emerald-500 text-emerald-400"
                    }`}
                  >
                    {isUrgent ? (
                      <AlertTriangle className="w-3 h-3" />
                    ) : (
                      <Clock className="w-3 h-3" />
                    )}
                  </div>

                  {/* Card Container */}
                  <div className="p-4 rounded-2xl bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-750 transition-all shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-zinc-100">{item.title}</h3>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            isUrgent
                              ? "bg-amber-950/70 border-amber-800 text-amber-300"
                              : isPast
                              ? "bg-zinc-800/80 border-zinc-700 text-zinc-400"
                              : "bg-emerald-950/70 border-emerald-800 text-emerald-300"
                          }`}
                        >
                          {isPast ? "Completed / Past" : daysLeft === 0 ? "Due Today" : `${daysLeft} Days Left`}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{formatted}</span>
                      </div>
                    </div>

                    {item.description && (
                      <p className="text-xs text-zinc-400 leading-relaxed">{item.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Milestone Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-750 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-base font-bold text-zinc-100 mb-1">Add Course Milestone</h3>
            <p className="text-xs text-zinc-400 mb-4">Register assignment due dates, quiz dates, or project deadlines.</p>

            <form onSubmit={handleAddDeadline} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Milestone Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Midterm Examination"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-750 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Due Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-750 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Topics covered, submission requirements..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-750 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow"
                >
                  Save Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
