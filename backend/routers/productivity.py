import re
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Response, status
from pydantic import BaseModel, Field

try:
    from database import (
        add_deadline,
        add_flashcard,
        delete_deadline,
        delete_flashcard,
        get_notebook,
        list_deadlines,
        list_flashcards,
    )
    from services.exporters import (
        extract_deadlines_with_llm,
        generate_anki_package,
        generate_calendar_ics,
        generate_flashcards_with_llm,
    )
except ImportError:
    from ..database import (
        add_deadline,
        add_flashcard,
        delete_deadline,
        delete_flashcard,
        get_notebook,
        list_deadlines,
        list_flashcards,
    )
    from ..services.exporters import (
        extract_deadlines_with_llm,
        generate_anki_package,
        generate_calendar_ics,
        generate_flashcards_with_llm,
    )

router = APIRouter()


def slugify(title: str) -> str:
    cleaned = re.sub(r"[^\w\s-]", "", title).strip().lower()
    return re.sub(r"[-\s]+", "_", cleaned) or "study_export"


class FlashcardCreate(BaseModel):
    front: str = Field(..., min_length=1, json_schema_extra={"example": "What is a Deadlock in OS?"})
    back: str = Field(..., min_length=1, json_schema_extra={"example": "A situation where a set of processes are blocked because each is holding a resource and waiting for another."})


class DeadlineCreate(BaseModel):
    title: str = Field(..., min_length=1, json_schema_extra={"example": "CS101 Final Project Due"})
    due_date: str = Field(..., json_schema_extra={"example": "2026-11-20T23:59:00"})
    description: Optional[str] = Field("", json_schema_extra={"example": "Submit repository link and report."})


# --- Anki Exports & Flashcard Management ---
@router.get("/{id}/export/anki", summary="Export flashcards to Anki .apkg file")
async def export_anki_deck(id: int):
    """
    Compiles all notebook flashcards into a downloadable .apkg Anki deck.
    If no flashcards have been created yet, it will attempt to synthesize high-yield
    cards from the uploaded course materials via local Ollama weights.
    """
    nb = get_notebook(id)
    if not nb:
        raise HTTPException(status_code=404, detail=f"Notebook with id {id} not found.")

    cards = list_flashcards(id)
    if not cards:
        # Auto-generate flashcards from indexed sources
        generated = await generate_flashcards_with_llm(id, count=5)
        for g in generated:
            cards.append(add_flashcard(id, g["front"], g["back"]))

    if not cards:
        # If still no cards (no sources uploaded yet), provide a starter sample card
        cards.append(add_flashcard(
            id,
            f"Getting Started with {nb['title']}",
            "Upload your lecture slides or syllabus to generate AI flashcards and notes!"
        ))

    package_bytes = generate_anki_package(id, nb["title"], cards)
    filename = f"{slugify(nb['title'])}_flashcards.apkg"

    return Response(
        content=package_bytes,
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@router.get("/{id}/flashcards", response_model=List[Dict[str, Any]], summary="List notebook flashcards")
def get_flashcards(id: int):
    """Lists all stored flashcards for this notebook."""
    if not get_notebook(id):
        raise HTTPException(status_code=404, detail=f"Notebook with id {id} not found.")
    return list_flashcards(id)


@router.post("/{id}/flashcards", status_code=status.HTTP_201_CREATED, summary="Create a flashcard manually")
def create_card(id: int, payload: FlashcardCreate):
    """Creates a new flashcard for this notebook."""
    if not get_notebook(id):
        raise HTTPException(status_code=404, detail=f"Notebook with id {id} not found.")
    return add_flashcard(id, payload.front, payload.back)


@router.post("/{id}/flashcards/generate", summary="AI generate flashcards from course sources")
async def generate_cards(id: int, count: int = 5):
    """Uses Ollama (gemma4:e4b) to synthesize study flashcards from uploaded course documents."""
    if not get_notebook(id):
        raise HTTPException(status_code=404, detail=f"Notebook with id {id} not found.")

    new_cards = await generate_flashcards_with_llm(id, count=count)
    saved = []
    for card in new_cards:
        saved.append(add_flashcard(id, card["front"], card["back"]))

    return {
        "generated_count": len(saved),
        "cards": saved
    }


@router.delete("/{id}/flashcards/{card_id}", summary="Delete a flashcard")
def remove_card(id: int, card_id: int):
    """Deletes a single flashcard."""
    success = delete_flashcard(card_id)
    if not success:
        raise HTTPException(status_code=404, detail="Flashcard not found.")
    return {"message": "Flashcard deleted successfully."}


# --- Calendar Exports & Deadline Management ---
@router.get("/{id}/export/calendar", summary="Export deadlines to .ics iCalendar file")
def export_calendar(id: int):
    """
    Generates and downloads a standard .ics calendar file containing all
    deadlines, exams, and milestones for this course notebook.
    """
    nb = get_notebook(id)
    if not nb:
        raise HTTPException(status_code=404, detail=f"Notebook with id {id} not found.")

    deadlines = list_deadlines(id)
    if not deadlines:
        # Return a calendar with a sample milestone if none registered
        deadlines = [{
            "id": 1,
            "title": f"Study Session: {nb['title']}",
            "description": "Scheduled study session for course review.",
            "due_date": "2026-11-01T10:00:00"
        }]

    ics_bytes = generate_calendar_ics(nb["title"], deadlines)
    filename = f"{slugify(nb['title'])}_schedule.ics"

    return Response(
        content=ics_bytes,
        media_type="text/calendar",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@router.get("/{id}/deadlines", response_model=List[Dict[str, Any]], summary="List course deadlines")
def get_deadlines(id: int):
    """Lists all upcoming deadlines and exam dates for this notebook."""
    if not get_notebook(id):
        raise HTTPException(status_code=404, detail=f"Notebook with id {id} not found.")
    return list_deadlines(id)


@router.post("/{id}/deadlines", status_code=status.HTTP_201_CREATED, summary="Create a course deadline")
def create_deadline_entry(id: int, payload: DeadlineCreate):
    """Creates a new course deadline or milestone."""
    if not get_notebook(id):
        raise HTTPException(status_code=404, detail=f"Notebook with id {id} not found.")
    return add_deadline(id, payload.title, payload.due_date, payload.description or "")


@router.post("/{id}/deadlines/extract", summary="AI extract deadlines from syllabus")
async def extract_deadlines(id: int):
    """Uses Ollama (gemma4:e4b) to parse syllabus lecture materials and extract deadlines."""
    if not get_notebook(id):
        raise HTTPException(status_code=404, detail=f"Notebook with id {id} not found.")

    extracted = await extract_deadlines_with_llm(id)
    saved = []
    for item in extracted:
        saved.append(add_deadline(id, item["title"], item["due_date"], item.get("description", "")))

    return {
        "extracted_count": len(saved),
        "deadlines": saved
    }


@router.delete("/{id}/deadlines/{deadline_id}", summary="Delete a deadline")
def remove_deadline(id: int, deadline_id: int):
    """Deletes a single deadline."""
    success = delete_deadline(deadline_id)
    if not success:
        raise HTTPException(status_code=404, detail="Deadline not found.")
    return {"message": "Deadline deleted successfully."}
