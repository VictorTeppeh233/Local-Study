# 🎓 Local Learn: Privacy-First, Offline Student Operating System

> **Built for Hacktoberfest Hack Day Accra — Gemma 4 Hackathon**  
> **Collaborators:** [Victor Teppeh](https://github.com/VictorTeppeh233) & [Danita Lamptey](https://github.com/iamatinad)  
> *A 100% open-source, air-gapped student operating system powered by Gemma 4.*

---

## 📌 Inspiration & Problem

Students constantly deal with fragmented learning tools—scattered lecture PDFs, manual calendar entries, separate flashcard applications, and expensive cloud AI subscriptions that compromise personal data privacy.

**Local Learn** unifies the student workflow into a single, privacy-first desktop workspace that runs **100% locally on your laptop** with zero external API dependencies.

---

## ✨ Core Features (5-Sprint Architecture)

1. 📚 **Course Notebooks & RAG Chat**: Drop lecture slides and syllabi (PDFs) into categorized notebooks (Course, Skill, Language) and interact with Gemma 4 with exact slide and page citations.
2. 📅 **Timeline & Calendar Engine**: Automatically parse course outlines and timetables into downloadable standard `.ics` files for instant calendar sync across Apple Calendar, Google Calendar, and Outlook.
3. ⚡ **Productivity Power-Ups**:
   - **Anki Flashcard Generator**: Automatically convert slide summaries into `.apkg` flashcard decks.
   - **Offline Audio Briefings**: Listen to 3-minute neural text-to-speech audio summaries generated locally.
   - **Snap & Solve (Multimodal Vision)**: Upload whiteboard photos or hand-written math notes and ask Gemma 4 questions directly.
4. 📊 **Quizzes & Weak-Spot Analytics**: Take pop-quizzes evaluated by Gemma 4 and track low-scoring topics over time in a local SQLite analytics dashboard.
5. 📦 **Local Study Bundles**: Export or import entire course notebooks (`.study` zip archives) to collaborate with peers offline via AirDrop or local drives.

---

## 🛠️ Open-Source Tech Stack

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, Lucide Icons
- **Backend Framework**: FastAPI (Python)
- **AI Model & Inference**: Gemma 4 (`gemma4:e4b` via Ollama) / Google AI Studio Gemini API
- **Vector Database**: ChromaDB / FAISS
- **Metadata & Analytics**: SQLite
- **Document Processing**: PyMuPDF (`fitz`), `icalendar`, `genanki`
- **Offline Audio Engine**: Piper TTS / Coqui TTS

---

## 🚀 Local Quickstart Guide

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)

### 1. Frontend Setup (Next.js)
```bash
cd frontend
npm install
npm run dev
