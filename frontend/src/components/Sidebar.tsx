"use client";

import React, { useState } from "react";
import {
  BookOpen,
  Calendar,
  Zap,
  BarChart3,
  Package,
  Plus,
  ChevronLeft,
  ChevronRight,
  FolderPlus,
  Layers,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Notebook } from "@/lib/types";

export type TabId = "chat-rag" | "timeline" | "productivity" | "quizzes" | "bundles";

interface SidebarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  notebooks: Notebook[];
  activeNotebook: Notebook | null;
  onSelectNotebook: (notebook: Notebook) => void;
  onCreateNotebook: (payload: { title: string; course_code?: string; description?: string }) => Promise<void>;
}

export function Sidebar({
  activeTab,
  onSelectTab,
  notebooks,
  activeNotebook,
  onSelectNotebook,
  onCreateNotebook,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newCategory, setNewCategory] = useState<"Course" | "Skill" | "Language">("Course");
  const [newDesc, setNewDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navItems = [
    {
      id: "chat-rag" as TabId,
      label: "Notebooks & RAG",
      sprint: "Sprint 1",
      icon: BookOpen,
      desc: "Course files & AI Chat",
    },
    {
      id: "timeline" as TabId,
      label: "Timeline & Calendar",
      sprint: "Sprint 2",
      icon: Calendar,
      desc: "Deadlines & .ics Sync",
    },
    {
      id: "productivity" as TabId,
      label: "Productivity Power-Ups",
      sprint: "Sprint 3",
      icon: Zap,
      desc: "Anki, Audio & Vision",
    },
    {
      id: "quizzes" as TabId,
      label: "Quizzes & Analytics",
      sprint: "Sprint 4",
      icon: BarChart3,
      desc: "Gemma Evaluator & Metrics",
    },
    {
      id: "bundles" as TabId,
      label: "Study Bundles",
      sprint: "Sprint 5",
      icon: Package,
      desc: ".study Peer Sharing",
    },
  ];

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreateNotebook({
        title: newTitle.trim(),
        course_code: newCode.trim(),
        description: newDesc.trim(),
      });
      setNewTitle("");
      setNewCode("");
      setNewDesc("");
      setShowCreateModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <aside
      className={`relative flex flex-col border-r border-zinc-800/80 bg-zinc-950/70 backdrop-blur-xl transition-all duration-300 ease-in-out select-none ${
        collapsed ? "w-20" : "w-72"
      }`}
    >
      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-5 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 transition-all shadow-md"
        title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      {/* Notebook Selector & Quick Switcher */}
      <div className="p-4 border-b border-zinc-800/70">
        {!collapsed ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-emerald-400" />
                Course Notebooks
              </span>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/60 px-2 py-0.5 rounded-md transition"
              >
                <Plus className="w-3 h-3" />
                New
              </button>
            </div>

            {/* Dropdown / Notebook pill */}
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
              {notebooks.map((nb) => {
                const isSelected = activeNotebook?.id === nb.id;
                return (
                  <button
                    key={nb.id}
                    onClick={() => onSelectNotebook(nb)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-all ${
                      isSelected
                        ? "bg-zinc-800/90 text-emerald-300 border border-emerald-500/30 shadow-sm"
                        : "text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-200 border border-transparent"
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="font-semibold text-zinc-200 truncate">{nb.title}</div>
                      {nb.course_code && (
                        <span className="text-[10px] text-zinc-500 font-mono">{nb.course_code}</span>
                      )}
                    </div>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-2 rounded-lg bg-emerald-950/60 text-emerald-400 hover:bg-emerald-900 border border-emerald-800/80 transition shadow"
              title="Create Course Notebook"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Module Navigation Tabs */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {!collapsed && (
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Sprint Modules
          </div>
        )}
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
                isActive
                  ? "bg-gradient-to-r from-emerald-500/15 to-indigo-500/15 text-zinc-100 border border-emerald-500/40 shadow-md shadow-emerald-950/30"
                  : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200 border border-transparent"
              } ${collapsed ? "justify-center px-0" : ""}`}
              title={collapsed ? `${item.label} (${item.sprint})` : undefined}
            >
              <div
                className={`p-2 rounded-lg transition-colors ${
                  isActive
                    ? "bg-emerald-500 text-zinc-950 shadow-sm shadow-emerald-500/50"
                    : "bg-zinc-900 text-zinc-400 group-hover:text-zinc-200 group-hover:bg-zinc-800"
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              {!collapsed && (
                <div className="flex-1 truncate">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold tracking-tight">{item.label}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-800/90 text-zinc-400 border border-zinc-700/50">
                      {item.sprint}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 truncate mt-0.5">{item.desc}</p>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      {!collapsed && (
        <div className="p-4 border-t border-zinc-800/70 bg-zinc-950/40 text-[11px] text-zinc-500">
          <div className="flex items-center gap-1.5 text-zinc-400 font-medium mb-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            100% Offline Student OS
          </div>
          <p className="text-[10px] text-zinc-500 leading-relaxed">
            Runs locally on device with zero cloud telemetry or API subscriptions.
          </p>
        </div>
      )}

      {/* Create Notebook Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-750 rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                <FolderPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-100">Create Course Notebook</h3>
                <p className="text-xs text-zinc-400">Add a course, technical skill, or language to study.</p>
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Notebook Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS101 Introduction to Algorithms"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-750 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Course Code</label>
                  <input
                    type="text"
                    placeholder="e.g. CS-101"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-750 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-750 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 transition"
                  >
                    <option value="Course">Course</option>
                    <option value="Skill">Skill / Tech</option>
                    <option value="Language">Language</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Lecture notes, syllabus, and study topics..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-750 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newTitle.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition disabled:opacity-50 shadow-md shadow-emerald-500/20"
                >
                  {isSubmitting ? "Creating..." : "Create Notebook"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}
