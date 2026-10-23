# Local Study Suite — Frontend (Next.js)

The modern, responsive user interface for the Local Study Suite, built with **Next.js (App Router)**, **TypeScript**, and **Tailwind CSS**. It provides a sleek, Notion-style split-pane workspace designed for students to manage courses, upload lecture slides, chat with local AI via RAG, and export offline study tools.

---

## 🛠️ Tech Stack & Open-Source Compliance

Every tool used in this frontend is 100% open-source and permissive-licensed, ensuring zero proprietary dependencies.

| Component | Technology | License | Purpose |
| --- | --- | --- | --- |
| **Framework** | Next.js (React App Router) | MIT | Server-side rendering, routing, and fast client performance |
| **Styling** | Tailwind CSS | MIT | Utility-first responsive dark-mode UI design |
| **Type Safety** | TypeScript | Apache 2.0 | Robust component typing and API contract consistency |
| **HTTP Client** | Native Fetch API | MIT | Communication with the local FastAPI backend (`localhost:8000`) |

---

## 📂 Frontend Directory Structure

```text
frontend/
├── package.json                # Dependencies and build scripts
├── tsconfig.json               # TypeScript configuration
├── tailwind.config.js          # Tailwind CSS styling configuration
└── src/
    ├── app/
    │   ├── layout.tsx          # Root layout with global Tailwind imports
    │   └── page.tsx            # Main app coordinator (state management for notebooks & tabs)
    ├── lib/
    │   └── api.ts              # Centralized API fetch wrapper for FastAPI endpoints
    └── components/
        ├── Sidebar.tsx         # Course/Notebook switcher & bundle import/export
        ├── SourceManager.tsx   # PDF uploader, source list, & calendar sync
        ├── ChatWorkspace.tsx   # Gemma RAG chat stream & Snap & Solve vision upload
        └── StudyTools.tsx      # Hub for Anki exports, audio briefings, and analytics
```

---

## 🚀 Getting Started (Local Setup)

### Prerequisites

1. **Node.js (v18+ recommended)** installed on your system.
2. The **FastAPI backend** running locally on port `8000` (see backend guide).

### Installation Steps

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install the required open-source packages:
```bash
npm install
```

3. Configure environment variables (optional for local development, defaults to `localhost:8000`):
Create a `.env.local` file in the `frontend/` root:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

4. Run the Next.js development server:
```bash
npm run dev
```

The frontend will now be live at **`http://localhost:3000`**.

---

## 🖥️ UI Component Breakdown

### 1. Root Page (`src/app/page.tsx`)

* Manages global state for the **active course notebook ID** and the **active view tab** (`Chat & RAG`, `Sources & Schedule`, `Study Tools`).

### 2. Sidebar (`src/components/Sidebar.tsx`)

* Displays all user course notebooks (e.g., *CS101*, *Organic Chemistry*).
* Provides a form to instantly create new course notebooks.
* Includes quick action buttons for importing and exporting `.study` offline course bundles.

### 3. Source Manager (`src/components/SourceManager.tsx`)

* Drag-and-drop file upload zone for PDF lecture slides, syllabi, and readings.
* Triggers syllabus parsing and allows students to instantly download generated `.ics` calendar sync files.

### 4. Chat Workspace (`src/components/ChatWorkspace.tsx`)

* Message feed displaying responses grounded in course materials with explicit source citations.
* Features a **Snap & Solve** image attachment button for uploading whiteboard photos directly to Gemma's vision endpoint.

### 5. Study Tools (`src/components/StudyTools.tsx`)

* One-click download buttons for **Anki Flashcards (`.apkg`)** and **Audio Briefings (`.mp3`)**.
* Analytics view container for tracking student weak spots and quiz performance over time.

---

## 🔄 Connecting Frontend to Backend

The frontend communicates with the local FastAPI backend via `src/lib/api.ts`. All endpoints target `http://localhost:8000`:

* `GET /notebooks` ➔ Fetches list of courses.
* `POST /notebooks` ➔ Creates a new course notebook.
* `POST /notebooks/{id}/sources` ➔ Uploads and parses PDF files.
* `POST /notebooks/{id}/chat` ➔ Sends RAG queries and whiteboard images to Gemma.
* `GET /notebooks/{id}/export/anki` ➔ Downloads Anki decks.
