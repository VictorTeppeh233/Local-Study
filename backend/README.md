# Local Study Suite — Backend API

The high-performance, 100% open-source Python backend for the Local Study Suite. It powers document ingestion, local RAG vector search, multimodal chat orchestration via local Ollama weights, and automated offline study tool generation (Anki decks, calendar sync files, quizzes, and analytics).

---

## 🛠️ Tech Stack & Open-Source Compliance

Every library and tool used in this backend is 100% open-source, self-hosted, and runs entirely offline with zero cloud dependencies or API keys.

| Component | Technology | License | Purpose |
| --- | --- | --- | --- |
| **API Framework** | FastAPI | MIT | High-performance asynchronous REST endpoints & Swagger docs |
| **AI Runner / Model** | Ollama (`gemma4:e4b`) | MIT / Open Weights | Local LLM inference with 128K context & multimodal vision |
| **Vector Database** | ChromaDB | Apache 2.0 | Local embedding storage and semantic chunk retrieval |
| **Relational Database** | SQLite | Public Domain | Course metadata, source tracking, and analytics storage |
| **PDF Parser** | pypdf | BSD-3-Clause | Clean text extraction from lecture slides and syllabi |
| **Anki Exporter** | genanki | MIT | Programmatic `.apkg` flashcard deck compilation |
| **Calendar Exporter** | icalendar | BSD | Standard `.ics` schedule and deadline synchronization |

---

## 📂 Backend Directory Structure

```text
backend/
├── requirements.txt            # Python dependencies
├── main.py                     # FastAPI entrypoint, CORS middleware, startup events
├── database.py                 # SQLite schema initialization and connection helpers
├── routers/
│   ├── notebooks.py            # Course/notebook CRUD and PDF upload parsing
│   ├── chat.py                 # RAG orchestration, Gemma chat, & Snap & Solve vision
│   └── productivity.py         # Anki (.apkg), Calendar (.ics), & export handlers
└── services/
    ├── rag_engine.py           # ChromaDB vector store wrapper & Ollama client
    └── exporters.py            # Deck compilation & calendar generation logic
```

---

## 🚀 Getting Started (Local Setup)

### Prerequisites

1. **Python 3.10+** installed on your system.
2. **Ollama** installed and running locally with the Gemma model pulled:
```bash
ollama serve
ollama pull gemma4:e4b
```

### Installation Steps

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create and activate a Python virtual environment:
```bash
python -m venv venv

# On macOS/Linux:
source venv/bin/activate

# On Windows (Command Prompt / PowerShell):
venv\Scripts\activate
```

3. Install the required open-source dependencies:
```bash
pip install -r requirements.txt
```

4. Run the FastAPI development server:
```bash
uvicorn main:app --reload --port 8000
```

The backend will now be live at **`http://localhost:8000`**.

---

## 📚 Interactive API Documentation

Once the server is running, FastAPI automatically generates interactive API documentation. You can test all endpoints, upload PDFs, and inspect request/response payloads directly in your browser:

* **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 🔌 Core API Endpoints Overview

### 1. Notebooks (`/notebooks`)

* `GET /notebooks` — List all course notebooks.
* `POST /notebooks` — Create a new course/skill notebook.
* `POST /notebooks/{id}/sources` — Upload a PDF lecture slide/syllabus (extracts text via `pypdf` and embeds into ChromaDB).

### 2. Chat & RAG (`/notebooks/{id}/chat`)

* `POST /notebooks/{id}/chat` — Send a student query (supports text queries and optional whiteboard images for Gemma vision). Retrieves relevant chunks from ChromaDB and queries local Ollama (`gemma4:e4b`).

### 3. Productivity & Exports (`/notebooks/{id}/export/...`)

* `GET /notebooks/{id}/export/anki` — Generates and downloads a `.apkg` file for Anki desktop.
* `GET /notebooks/{id}/export/calendar` — Generates and downloads a `.ics` calendar sync file for course deadlines.

---

## 🔒 Local Data Storage & Git Ignore

To ensure your repository remains lightweight and private, local storage folders are automatically ignored by Git:

* `app.db` (SQLite local database)
* `chroma_db/` (ChromaDB vector embeddings directory)
* `venv/` (Python virtual environment)
