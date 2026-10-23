"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Upload,
  FileText,
  Trash2,
  Sparkles,
  Bot,
  User,
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertCircle,
  Paperclip,
} from "lucide-react";
import {
  ChatMessage,
  Citation,
  Notebook,
  SourceDocument,
} from "@/lib/types";
import {
  deleteSource,
  getChatHistory,
  getSources,
  sendChatQuery,
  uploadSource,
} from "@/lib/api";

interface ChatRagViewProps {
  notebook: Notebook;
  onOpenCitation: (citation: Citation) => void;
}

export function ChatRagView({ notebook, onOpenCitation }: ChatRagViewProps) {
  const [sources, setSources] = useState<SourceDocument[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load sources and chat history for active notebook
  useEffect(() => {
    let isMounted = true;
    getSources(notebook.id).then((data) => {
      if (isMounted) setSources(data);
    });

    getChatHistory(notebook.id).then((history) => {
      if (isMounted) {
        if (history.length > 0) {
          setMessages(history);
        } else {
          // Starter greeting
          setMessages([
            {
              id: "init",
              role: "assistant",
              content:
                `Welcome to **${notebook.title}**! I'm your offline study assistant running on **gemma4:e4b**.\n\n` +
                `You can upload lecture slides, syllabi, or notes on the left panel, and ask any question below. ` +
                `All responses are strictly grounded in your course documents with verifiable citations.`,
              citations: [],
            },
          ]);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [notebook.id, notebook.title]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Only PDF files are supported for ingestion.");
      return;
    }
    setUploadError(null);
    setIsUploading(true);
    setUploadProgress(`Parsing ${file.name} with pypdf and generating ChromaDB embeddings...`);

    try {
      const newSource = await uploadSource(notebook.id, file);
      setSources((prev) => [newSource, ...prev]);
      setUploadProgress(null);
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload and index document.");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDeleteSource = async (sourceId: number) => {
    await deleteSource(notebook.id, sourceId);
    setSources((prev) => prev.filter((s) => s.id !== sourceId));
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputQuery.trim();
    if (!query || isSending) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: query,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery("");
    setIsSending(true);

    try {
      const res = await sendChatQuery(notebook.id, query);
      const assistantMessage: ChatMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: res.response,
        citations: res.sources || [],
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: "⚠️ Unable to retrieve answer from local Gemma model. Please ensure Ollama is running (`ollama serve`).",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  // Helper to render message content with clickable citation tags
  const renderMessageContent = (msg: ChatMessage) => {
    return (
      <div className="space-y-3">
        <div className="text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
          {msg.content}
        </div>

        {/* Inline Citations / Grounding sources */}
        {msg.citations && msg.citations.length > 0 && (
          <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" /> Grounded In:
            </span>
            {msg.citations.map((c, i) => (
              <button
                key={i}
                onClick={() => onOpenCitation(c)}
                className="group flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-900 hover:bg-emerald-950/60 border border-zinc-750 hover:border-emerald-600/60 text-[11px] font-mono text-emerald-400 transition shadow-sm"
              >
                <span>
                  [{c.filename.replace(".pdf", "")}, p. {c.page}]
                </span>
                <ExternalLink className="w-2.5 h-2.5 text-zinc-500 group-hover:text-emerald-300" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 h-full overflow-hidden bg-zinc-950">
      {/* Left Column: PDF Source Manager & Uploader (4 Cols) */}
      <div className="lg:col-span-4 border-r border-zinc-800/80 flex flex-col h-full bg-zinc-950/50 backdrop-blur">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800/80">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              Course Ingestion & Sources
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
              {sources.length} Indexed
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Upload PDF lecture slides and readings for offline vector embedding.
          </p>
        </div>

        {/* Drag and Drop Upload Zone */}
        <div className="p-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
              isUploading
                ? "border-emerald-500/50 bg-emerald-950/20"
                : "border-zinc-800 hover:border-emerald-500/40 hover:bg-zinc-900/50"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="p-2.5 rounded-full bg-zinc-900 text-emerald-400 border border-zinc-800 shadow">
                {isUploading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
              </div>
              <div className="text-xs font-semibold text-zinc-200">
                {isUploading ? "Processing Document..." : "Drop PDF Lecture Slides Here"}
              </div>
              <p className="text-[11px] text-zinc-500">or click to browse local files (PDF)</p>
            </div>
          </div>

          {/* Progress / Status banner */}
          {uploadProgress && (
            <div className="mt-3 p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              <span className="truncate">{uploadProgress}</span>
            </div>
          )}
          {uploadError && (
            <div className="mt-3 p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
              <span className="truncate">{uploadError}</span>
            </div>
          )}
        </div>

        {/* Indexed Sources List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
            Active Course Documents
          </div>
          {sources.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-xs border border-zinc-850 rounded-xl p-4 bg-zinc-900/30">
              No lecture documents uploaded yet. Upload a syllabus or slide deck to enable RAG answers.
            </div>
          ) : (
            sources.map((src) => (
              <div
                key={src.id}
                className="group flex items-start justify-between p-3 rounded-xl bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800/90 transition shadow-sm"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-md bg-zinc-800 text-zinc-400 group-hover:text-emerald-400 transition mt-0.5">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-zinc-200 truncate" title={src.filename}>
                      {src.filename}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5 font-mono">
                      <span>{src.num_pages} Pages</span>
                      <span>•</span>
                      <span className="text-emerald-400/90">{src.num_chunks} Chunks Embedded</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteSource(src.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 transition"
                  title="Remove Source"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Column: RAG Chat Interface (8 Cols) */}
      <div className="lg:col-span-8 flex flex-col h-full bg-zinc-950">
        {/* Chat Feed Header */}
        <div className="h-14 border-b border-zinc-800/80 px-6 flex items-center justify-between bg-zinc-950/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-zinc-200">RAG Chat Workspace</span>
            <span className="text-[11px] text-zinc-500">• 128K Context Window Grounded</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-zinc-900 text-emerald-400 border border-emerald-900/50">
              Ollama gemma4:e4b
            </span>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((msg) => {
            const isAssistant = msg.role === "assistant";
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${isAssistant ? "mr-auto" : "ml-auto flex-row-reverse"}`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isAssistant
                      ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20"
                      : "bg-indigo-600 text-zinc-100 shadow-md shadow-indigo-600/20"
                  }`}
                >
                  {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                <div
                  className={`rounded-2xl p-4 shadow-md ${
                    isAssistant
                      ? "bg-zinc-900/90 border border-zinc-800/90 text-zinc-100"
                      : "bg-indigo-600/20 border border-indigo-500/40 text-indigo-100"
                  }`}
                >
                  {renderMessageContent(msg)}
                </div>
              </div>
            );
          })}

          {isSending && (
            <div className="flex gap-3 max-w-xl mr-auto animate-pulse">
              <div className="w-7 h-7 rounded-lg bg-emerald-500 text-zinc-950 flex items-center justify-center shrink-0 shadow-md">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center gap-2 text-xs text-zinc-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>Searching ChromaDB & synthesizing answer with Gemma 4...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/80 backdrop-blur">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-4xl mx-auto">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={`Ask anything about ${notebook.title} lecture materials...`}
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                disabled={isSending}
                className="w-full pl-4 pr-10 py-3 rounded-xl bg-zinc-900/90 border border-zinc-750 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={isSending || !inputQuery.trim()}
              className="p-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-zinc-950 font-semibold transition shadow-md shadow-emerald-500/20"
              title="Send Query"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="text-center mt-2 text-[10px] text-zinc-500">
            Grounding runs 100% offline via ChromaDB vector retrieval & local Ollama weights.
          </div>
        </div>
      </div>
    </div>
  );
}
