export interface Notebook {
  id: number;
  title: string;
  description: string;
  course_code: string;
  category?: "Course" | "Skill" | "Language" | "Certification";
  created_at: string;
  updated_at: string;
  source_count?: number;
  flashcard_count?: number;
  deadline_count?: number;
}

export interface SourceDocument {
  id: number;
  notebook_id: number;
  filename: string;
  file_path: string;
  file_size: number;
  num_pages: number;
  num_chunks: number;
  created_at: string;
}

export interface Citation {
  filename: string;
  page: number;
  source_id?: number;
  distance?: number;
}

export interface ChatMessage {
  id: string | number;
  role: "user" | "assistant" | "system";
  content: string;
  citations?: Citation[];
  has_image?: boolean;
  image_preview?: string;
  timestamp?: string;
}

export interface Flashcard {
  id: number;
  notebook_id: number;
  front: string;
  back: string;
  mastered?: boolean;
}

export interface Deadline {
  id: number;
  notebook_id: number;
  title: string;
  description: string;
  due_date: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
}

export interface WeakSpotMetric {
  topic: string;
  accuracy: number;
  totalAttempts: number;
  status: "Needs Review" | "Moderate" | "Mastered";
  recommendedFocus: string;
}

export interface StudyBundle {
  version: string;
  exportedAt: string;
  notebook: Notebook;
  sources: SourceDocument[];
  flashcards: Flashcard[];
  deadlines: Deadline[];
  metrics?: WeakSpotMetric[];
}
