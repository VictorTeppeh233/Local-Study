import os
import shutil
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from pypdf import PdfReader

try:
    from database import (
        create_notebook,
        delete_notebook,
        get_notebook,
        list_notebooks,
        update_notebook,
        add_source,
        list_sources,
        get_source,
        delete_source,
    )
    from services.rag_engine import (
        delete_notebook_collection,
        delete_source_chunks,
        index_document,
    )
except ImportError:
    from ..database import (
        create_notebook,
        delete_notebook,
        get_notebook,
        list_notebooks,
        update_notebook,
        add_source,
        list_sources,
        get_source,
        delete_source,
    )
    from ..services.rag_engine import (
        delete_notebook_collection,
        delete_source_chunks,
        index_document,
    )

router = APIRouter()
BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


class NotebookCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, json_schema_extra={"example": "CS101 - Introduction to Computer Science"})
    description: Optional[str] = Field("", max_length=1000, json_schema_extra={"example": "Lecture notes, syllabus, and study materials."})
    course_code: Optional[str] = Field("", max_length=50, json_schema_extra={"example": "CS-101"})


class NotebookUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    course_code: Optional[str] = Field(None, max_length=50)


@router.get("", response_model=List[Dict[str, Any]], summary="List all course notebooks")
def get_all_notebooks():
    """Returns all notebooks along with source and flashcard counts."""
    return list_notebooks()


@router.post("", status_code=status.HTTP_201_CREATED, summary="Create a new course/skill notebook")
def create_new_notebook(payload: NotebookCreate):
    """Creates a new notebook for organizing course documents and offline study sessions."""
    return create_notebook(
        title=payload.title,
        description=payload.description or "",
        course_code=payload.course_code or "",
    )


@router.get("/{id}", summary="Get notebook details")
def get_single_notebook(id: int):
    """Fetches details for a single notebook, including uploaded sources."""
    nb = get_notebook(id)
    if not nb:
        raise HTTPException(status_code=404, detail=f"Notebook with id {id} not found.")
    sources = list_sources(id)
    return {**nb, "sources": sources}


@router.put("/{id}", summary="Update notebook details")
def update_existing_notebook(id: int, payload: NotebookUpdate):
    """Updates the title, description, or course code of a notebook."""
    updated = update_notebook(id, payload.title, payload.description, payload.course_code)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Notebook with id {id} not found.")
    return updated


@router.delete("/{id}", summary="Delete notebook and associated data")
def delete_existing_notebook(id: int):
    """Permanently deletes a notebook, its SQLite metadata, upload directory, and vector store."""
    nb = get_notebook(id)
    if not nb:
        raise HTTPException(status_code=404, detail=f"Notebook with id {id} not found.")

    # Remove upload folder for this notebook
    nb_upload_dir = UPLOADS_DIR / f"notebook_{id}"
    if nb_upload_dir.exists():
        shutil.rmtree(nb_upload_dir, ignore_errors=True)

    # Delete ChromaDB collection
    delete_notebook_collection(id)

    # Delete from SQLite (cascades to sources, flashcards, deadlines, chat)
    delete_notebook(id)
    return {"message": f"Notebook {id} ('{nb['title']}') successfully deleted."}


@router.get("/{id}/sources", summary="List sources for a notebook")
def get_notebook_sources(id: int):
    """Lists all PDF documents and slides uploaded to this notebook."""
    if not get_notebook(id):
        raise HTTPException(status_code=404, detail=f"Notebook with id {id} not found.")
    return list_sources(id)


@router.post("/{id}/sources", status_code=status.HTTP_201_CREATED, summary="Upload PDF lecture slide/syllabus")
async def upload_notebook_source(id: int, file: UploadFile = File(...)):
    """
    Uploads a PDF file (lecture slides, syllabus, or notes), extracts its text
    via `pypdf`, breaks it into semantic chunks, and indexes it into ChromaDB.
    """
    nb = get_notebook(id)
    if not nb:
        raise HTTPException(status_code=404, detail=f"Notebook with id {id} not found.")

    filename = file.filename or "uploaded_document.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported for ingestion.")

    # Save file to disk
    nb_upload_dir = UPLOADS_DIR / f"notebook_{id}"
    nb_upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = nb_upload_dir / filename

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="The uploaded PDF file is empty.")

    with open(file_path, "wb") as f:
        f.write(content)

    file_size = len(content)

    # Extract text using pypdf
    try:
        reader = PdfReader(str(file_path))
        num_pages = len(reader.pages)
        pages_data = []

        for idx, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            if page_text.strip():
                pages_data.append({"page": idx + 1, "text": page_text})
    except Exception as e:
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(
            status_code=422,
            detail=f"Failed to parse PDF document with pypdf: {str(e)}"
        )

    # Record in SQLite database first to get source_id
    source_record = add_source(
        notebook_id=id,
        filename=filename,
        file_path=str(file_path),
        file_size=file_size,
        num_pages=num_pages,
        num_chunks=0
    )
    source_id = source_record["id"]

    # Index into ChromaDB
    try:
        num_chunks = index_document(
            notebook_id=id,
            source_id=source_id,
            filename=filename,
            pages=pages_data
        )
    except Exception as e:
        print(f"[Ingestion Error] Failed to index into ChromaDB: {e}")
        num_chunks = 0

    # Refresh record
    return {
        **source_record,
        "num_chunks": num_chunks,
        "message": f"Successfully ingested '{filename}' ({num_pages} pages, {num_chunks} chunks indexed)."
    }


@router.delete("/{id}/sources/{source_id}", summary="Delete a source")
def remove_source(id: int, source_id: int):
    """Deletes an uploaded document and removes its vector embeddings from ChromaDB."""
    src = get_source(source_id)
    if not src or src["notebook_id"] != id:
        raise HTTPException(status_code=404, detail="Source not found in this notebook.")

    # Remove file on disk
    file_path = Path(src["file_path"])
    if file_path.exists():
        try:
            file_path.unlink()
        except Exception:
            pass

    # Remove embeddings from ChromaDB
    delete_source_chunks(id, source_id)

    # Remove from SQLite
    delete_source(source_id)
    return {"message": f"Source '{src['filename']}' deleted successfully."}
