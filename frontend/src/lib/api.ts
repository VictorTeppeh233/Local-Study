import {
  ChatMessage,
  Deadline,
  Flashcard,
  Notebook,
  SourceDocument,
  StudyBundle,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Mock fallbacks in case backend is starting or offline
const MOCK_NOTEBOOKS: Notebook[] = [
  {
    id: 1,
    title: "CS350 Distributed Systems",
    description: "Consensus algorithms, Raft, Paxos, and fault-tolerant computing",
    course_code: "CS-350",
    category: "Course",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    source_count: 2,
    flashcard_count: 8,
    deadline_count: 3,
  },
  {
    id: 2,
    title: "Machine Learning & Neural Nets",
    description: "Backprop, Transformer attention mechanisms, and fine-tuning",
    course_code: "CS-480",
    category: "Skill",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    source_count: 1,
    flashcard_count: 12,
    deadline_count: 2,
  },
  {
    id: 3,
    title: "German B1 Technical German",
    description: "Engineering vocabulary, grammar cases, and dialogue",
    course_code: "DE-201",
    category: "Language",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    source_count: 1,
    flashcard_count: 15,
    deadline_count: 1,
  },
];

export async function checkBackendHealth(): Promise<{ online: boolean; ollama: string }> {
  try {
    const res = await fetch(`${API_BASE}/`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error("Status " + res.status);
    const data = await res.json();
    return {
      online: true,
      ollama: data.ollama?.status === "connected" ? "gemma4:e4b (Connected)" : "Ollama Offline",
    };
  } catch {
    return { online: false, ollama: "Offline (Mock Mode)" };
  }
}

export async function getNotebooks(): Promise<Notebook[]> {
  try {
    const res = await fetch(`${API_BASE}/notebooks`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch notebooks");
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn("Backend unavailable, using mock notebooks", err);
    return MOCK_NOTEBOOKS;
  }
}

export async function createNotebook(payload: {
  title: string;
  description?: string;
  course_code?: string;
}): Promise<Notebook> {
  const res = await fetch(`${API_BASE}/notebooks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create notebook");
  return await res.json();
}

export async function deleteNotebook(id: number): Promise<void> {
  await fetch(`${API_BASE}/notebooks/${id}`, { method: "DELETE" });
}

export async function getSources(notebookId: number): Promise<SourceDocument[]> {
  try {
    const res = await fetch(`${API_BASE}/notebooks/${notebookId}/sources`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch sources");
    return await res.json();
  } catch {
    return [];
  }
}

export async function uploadSource(notebookId: number, file: File): Promise<SourceDocument> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/notebooks/${notebookId}/sources`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Failed to upload and parse PDF");
  }

  return await res.json();
}

export async function deleteSource(notebookId: number, sourceId: number): Promise<void> {
  await fetch(`${API_BASE}/notebooks/${notebookId}/sources/${sourceId}`, {
    method: "DELETE",
  });
}

export async function sendChatQuery(
  notebookId: number,
  query: string,
  imageBase64?: string
): Promise<{ response: string; sources: any[] }> {
  try {
    const res = await fetch(`${API_BASE}/notebooks/${notebookId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        image: imageBase64 || null,
      }),
    });

    if (!res.ok) {
      throw new Error("Chat request failed");
    }

    return await res.json();
  } catch (err) {
    console.warn("Using offline simulated RAG response", err);
    await new Promise((r) => setTimeout(r, 800));
    return {
      response:
        `Based on your lecture notes for this course, **${query}** involves core principles ` +
        `covered in Section 3.2. Specifically, consensus protocols ensure distributed nodes agree on a single data value ` +
        `even when some participants fail or experience latency.\n\n` +
        `Key properties required:\n` +
        `1. **Agreement**: Every non-faulty node decides the same value.\n` +
        `2. **Validity**: The decided value must have been proposed by at least one node.\n` +
        `3. **Termination**: All non-faulty nodes eventually reach a decision.`,
      sources: [
        { filename: "Lecture_04_Consensus_Protocols.pdf", page: 12, distance: 0.18 },
        { filename: "Lecture_04_Consensus_Protocols.pdf", page: 14, distance: 0.24 },
      ],
    };
  }
}

export async function getChatHistory(notebookId: number): Promise<ChatMessage[]> {
  try {
    const res = await fetch(`${API_BASE}/notebooks/${notebookId}/chat/history`);
    if (!res.ok) throw new Error("Failed");
    const data = await res.json();
    return data.map((d: any) => ({
      id: d.id,
      role: d.role,
      content: d.content,
      has_image: Boolean(d.has_image),
      timestamp: d.created_at,
    }));
  } catch {
    return [];
  }
}

export async function getFlashcards(notebookId: number): Promise<Flashcard[]> {
  try {
    const res = await fetch(`${API_BASE}/notebooks/${notebookId}/flashcards`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed");
    return await res.json();
  } catch {
    return [];
  }
}

export async function generateFlashcards(notebookId: number, count: number = 5): Promise<Flashcard[]> {
  const res = await fetch(`${API_BASE}/notebooks/${notebookId}/flashcards/generate?count=${count}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to generate flashcards");
  const data = await res.json();
  return data.cards || [];
}

export async function downloadAnkiDeck(notebookId: number, title: string): Promise<void> {
  const url = `${API_BASE}/notebooks/${notebookId}/export/anki`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to download Anki deck");
  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = `${title.toLowerCase().replace(/\s+/g, "_")}_flashcards.apkg`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

export async function getDeadlines(notebookId: number): Promise<Deadline[]> {
  try {
    const res = await fetch(`${API_BASE}/notebooks/${notebookId}/deadlines`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed");
    return await res.json();
  } catch {
    return [];
  }
}

export async function createDeadline(
  notebookId: number,
  payload: { title: string; due_date: string; description?: string }
): Promise<Deadline> {
  const res = await fetch(`${API_BASE}/notebooks/${notebookId}/deadlines`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create deadline");
  return await res.json();
}

export async function downloadCalendar(notebookId: number, title: string): Promise<void> {
  const url = `${API_BASE}/notebooks/${notebookId}/export/calendar`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to download calendar");
  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = `${title.toLowerCase().replace(/\s+/g, "_")}_schedule.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

export function exportStudyBundle(bundle: StudyBundle): void {
  const jsonStr = JSON.stringify(bundle, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${bundle.notebook.title.toLowerCase().replace(/\s+/g, "_")}.study`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
