"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Sidebar, TabId } from "@/components/Sidebar";
import { SourcePreviewModal } from "@/components/SourcePreviewModal";
import { ChatRagView } from "@/components/views/ChatRagView";
import { TimelineCalendarView } from "@/components/views/TimelineCalendarView";
import { ProductivityView } from "@/components/views/ProductivityView";
import { QuizzesAnalyticsView } from "@/components/views/QuizzesAnalyticsView";
import { StudyBundleView } from "@/components/views/StudyBundleView";
import { Citation, Notebook } from "@/lib/types";
import { createNotebook, getNotebooks } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("chat-rag");
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [activeNotebook, setActiveNotebook] = useState<Notebook | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);

  useEffect(() => {
    getNotebooks().then((data) => {
      setNotebooks(data);
      if (data.length > 0) {
        setActiveNotebook(data[0]);
      }
      setIsLoading(false);
    });
  }, []);

  const handleCreateNotebook = async (payload: {
    title: string;
    course_code?: string;
    description?: string;
  }) => {
    const created = await createNotebook(payload);
    setNotebooks((prev) => [created, ...prev]);
    setActiveNotebook(created);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-zinc-950 font-black shadow-lg shadow-emerald-500/20 animate-pulse">
            L
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            Initializing Local Learn OS...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Top Header */}
      <Header activeNotebook={activeNotebook} />

      {/* Main Workspace (Sidebar + Dynamic Sprint View) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Collapsible Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          notebooks={notebooks}
          activeNotebook={activeNotebook}
          onSelectNotebook={setActiveNotebook}
          onCreateNotebook={handleCreateNotebook}
        />

        {/* Dynamic Sprint View Container */}
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950 relative">
          {activeNotebook ? (
            <>
              {activeTab === "chat-rag" && (
                <ChatRagView
                  notebook={activeNotebook}
                  onOpenCitation={(c) => setActiveCitation(c)}
                />
              )}
              {activeTab === "timeline" && (
                <TimelineCalendarView notebook={activeNotebook} />
              )}
              {activeTab === "productivity" && (
                <ProductivityView notebook={activeNotebook} />
              )}
              {activeTab === "quizzes" && (
                <QuizzesAnalyticsView notebook={activeNotebook} />
              )}
              {activeTab === "bundles" && (
                <StudyBundleView
                  notebook={activeNotebook}
                  onImportComplete={() => {
                    getNotebooks().then((data) => setNotebooks(data));
                  }}
                />
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-xs">
              No active notebook selected. Create or select a notebook from the sidebar.
            </div>
          )}
        </main>
      </div>

      {/* Source Citation Preview Modal */}
      <SourcePreviewModal
        citation={activeCitation}
        onClose={() => setActiveCitation(null)}
      />
    </div>
  );
}
