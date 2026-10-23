import json
import re
import tempfile
import zlib
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional
import dateutil.parser
import genanki
import icalendar

try:
    from services.rag_engine import call_ollama_chat, search_relevant_chunks
except ImportError:
    try:
        from rag_engine import call_ollama_chat, search_relevant_chunks
    except ImportError:
        from .rag_engine import call_ollama_chat, search_relevant_chunks

# Deterministic IDs for Anki Models
ANKI_MODEL_ID = 1607392319
ANKI_CSS = """
.card {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 18px;
    text-align: center;
    color: #1e293b;
    background-color: #f8fafc;
    padding: 24px;
    border-radius: 12px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    max-width: 600px;
    margin: 0 auto;
}
.question {
    font-weight: 600;
    color: #0f172a;
    margin-bottom: 16px;
}
.answer {
    color: #0284c7;
    margin-top: 16px;
    font-weight: 500;
}
hr {
    border: 0;
    height: 1px;
    background: #cbd5e1;
    margin: 16px 0;
}
.badge {
    display: inline-block;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    border-radius: 9999px;
    background-color: #e2e8f0;
    color: #475569;
    margin-bottom: 12px;
}
"""

anki_model = genanki.Model(
    ANKI_MODEL_ID,
    "Local Study Flashcard Model",
    fields=[
        {"name": "Question"},
        {"name": "Answer"},
        {"name": "DeckTag"},
    ],
    templates=[
        {
            "name": "Card 1",
            "qfmt": '<div class="card"><div class="badge">{{DeckTag}}</div><div class="question">{{Question}}</div></div>',
            "afmt": '<div class="card"><div class="badge">{{DeckTag}}</div><div class="question">{{Question}}</div><hr id="answer"><div class="answer">{{Answer}}</div></div>',
        },
    ],
    css=ANKI_CSS,
)


def generate_anki_package(notebook_id: int, notebook_title: str, flashcards: List[Dict[str, Any]]) -> bytes:
    """
    Compiles flashcards into a standard .apkg file for Anki.
    Returns the file content as bytes.
    """
    # Deterministic deck ID based on notebook title and id
    deck_seed = f"localstudy_{notebook_id}_{notebook_title}"
    deck_id = abs(zlib.crc32(deck_seed.encode("utf-8")))

    deck_name = f"Local Study :: {notebook_title}"
    deck = genanki.Deck(deck_id, deck_name)

    tag = notebook_title[:20]
    for card in flashcards:
        front = card.get("front", "").strip()
        back = card.get("back", "").strip()
        if not front or not back:
            continue

        note = genanki.Note(
            model=anki_model,
            fields=[front, back, tag],
        )
        deck.add_note(note)

    # Write to a temporary file and read back bytes
    with tempfile.NamedTemporaryFile(suffix=".apkg", delete=False) as tmp:
        tmp_path = Path(tmp.name)

    try:
        genanki.Package(deck).write_to_file(str(tmp_path))
        with open(tmp_path, "rb") as f:
            package_bytes = f.read()
        return package_bytes
    finally:
        if tmp_path.exists():
            tmp_path.unlink()


def generate_calendar_ics(notebook_title: str, deadlines: List[Dict[str, Any]]) -> bytes:
    """
    Generates a standard .ics iCalendar file for notebook deadlines and milestones.
    Returns the file content as bytes.
    """
    cal = icalendar.Calendar()
    cal.add("prodid", "-//Local Study Suite//Offline Academic Assistant//EN")
    cal.add("version", "2.0")
    cal.add("x-wr-calname", f"{notebook_title} - Deadlines & Schedule")

    for item in deadlines:
        title = item.get("title", "Study Deadline")
        desc = item.get("description", "")
        raw_date = item.get("due_date", "")

        try:
            parsed_dt = dateutil.parser.parse(raw_date)
        except Exception:
            # Default to tomorrow if unparseable
            parsed_dt = datetime.now() + timedelta(days=1)

        event = icalendar.Event()
        event.add("summary", f"[{notebook_title}] {title}")
        event.add("description", desc or f"Study deadline for {notebook_title}")
        event.add("dtstart", parsed_dt)
        event.add("dtend", parsed_dt + timedelta(hours=1))
        event.add("dtstamp", datetime.now())
        event.add("uid", f"localstudy-{item.get('id', 0)}-{parsed_dt.timestamp()}@localstudy")

        cal.add_component(event)

    return cal.to_ical()


async def generate_flashcards_with_llm(notebook_id: int, count: int = 5) -> List[Dict[str, str]]:
    """
    Uses local Ollama gemma4:e4b to generate flashcards based on indexed sources.
    """
    chunks = search_relevant_chunks(notebook_id, "key concepts definitions terms principles exam questions", n_results=6)
    if not chunks:
        return []

    context = "\n\n".join([f"Page {c['page']}: {c['content']}" for c in chunks])
    prompt = f"""
You are an expert academic educator. Based on the following study materials, generate exactly {count} high-yield flashcard question-and-answer pairs.

Study Material:
{context}

Output ONLY valid JSON formatted as a list of objects, each containing "front" and "back" keys.
Example format:
[
  {{"front": "What is Amdahl's Law?", "back": "A formula that predicts the theoretical speedup in latency of an execution of a task with fixed workload."}},
  {{"front": "Define Polling vs Interrupts.", "back": "Polling continuously checks device status; Interrupts alert the CPU asynchronously when an event occurs."}}
]
"""
    messages = [
        {"role": "system", "content": "You output only strictly valid JSON matching the requested schema without any markdown formatting or commentary."},
        {"role": "user", "content": prompt}
    ]

    response = await call_ollama_chat(messages)
    try:
        # Extract json array if surrounded by markdown fences
        clean = response.strip()
        if "```json" in clean:
            clean = clean.split("```json")[1].split("```")[0].strip()
        elif "```" in clean:
            clean = clean.split("```")[1].split("```")[0].strip()

        data = json.loads(clean)
        if isinstance(data, list):
            return [{"front": str(x.get("front", "")), "back": str(x.get("back", ""))} for x in data if "front" in x and "back" in x]
    except Exception as e:
        print(f"[Exporters] Flashcard JSON parse error: {e}, raw text: {response[:150]}")

    return []


async def extract_deadlines_with_llm(notebook_id: int) -> List[Dict[str, str]]:
    """
    Extracts dates, exams, and project milestones from course syllabi using Ollama.
    """
    chunks = search_relevant_chunks(notebook_id, "syllabus schedule deadlines exam dates midterm homework project due", n_results=6)
    if not chunks:
        return []

    context = "\n\n".join([f"Excerpt: {c['content']}" for c in chunks])
    prompt = f"""
Extract all assignments, exams, project milestones, and deadlines from the following syllabus excerpts.

Syllabus Excerpts:
{context}

Output ONLY valid JSON as a list of objects with "title", "due_date" (ISO 8601 YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS), and "description".
Example format:
[
  {{"title": "Midterm Examination", "due_date": "2026-11-15T09:00:00", "description": "Covers chapters 1 through 5."}},
  {{"title": "Homework 1 Submission", "due_date": "2026-10-31T23:59:00", "description": "Vector mathematics assignment."}}
]
"""
    messages = [
        {"role": "system", "content": "You output only strictly valid JSON matching the requested schema without markdown or commentary."},
        {"role": "user", "content": prompt}
    ]

    response = await call_ollama_chat(messages)
    try:
        clean = response.strip()
        if "```json" in clean:
            clean = clean.split("```json")[1].split("```")[0].strip()
        elif "```" in clean:
            clean = clean.split("```")[1].split("```")[0].strip()

        data = json.loads(clean)
        if isinstance(data, list):
            return [
                {
                    "title": str(x.get("title", "")),
                    "due_date": str(x.get("due_date", "")),
                    "description": str(x.get("description", ""))
                }
                for x in data if "title" in x and "due_date" in x
            ]
    except Exception as e:
        print(f"[Exporters] Deadline JSON parse error: {e}")

    return []
