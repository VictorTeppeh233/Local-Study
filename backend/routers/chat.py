from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

try:
    from database import (
        add_chat_message,
        clear_chat_history,
        get_notebook,
        list_chat_messages,
    )
    from services.rag_engine import answer_query_with_rag
except ImportError:
    from ..database import (
        add_chat_message,
        clear_chat_history,
        get_notebook,
        list_chat_messages,
    )
    from ..services.rag_engine import answer_query_with_rag

router = APIRouter()


class ChatQueryRequest(BaseModel):
    query: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        json_schema_extra={"example": "Can you explain the difference between processes and threads based on my lecture notes?"}
    )
    image: Optional[str] = Field(
        None,
        description="Optional base64 data URI or raw base64 string for Gemma vision inference (Snap & Solve)"
    )


class ChatResponse(BaseModel):
    response: str
    sources: List[Dict[str, Any]]
    notebook_id: int


@router.post("/{id}/chat", response_model=ChatResponse, summary="Send student query to RAG & Gemma")
async def chat_with_notebook(id: int, payload: ChatQueryRequest):
    """
    Submits a student question to the offline RAG system:
    1. Fetches recent conversation history from SQLite.
    2. Searches ChromaDB for semantic context chunks from uploaded PDFs.
    3. If an image is provided, feeds it to `gemma4:e4b` for multimodal whiteboard/diagram analysis.
    4. Records the query and answer to the notebook's chat history.
    """
    nb = get_notebook(id)
    if not nb:
        raise HTTPException(status_code=404, detail=f"Notebook with id {id} not found.")

    # Fetch recent chat history
    history = list_chat_messages(id, limit=8)

    # Save user message to database
    add_chat_message(
        notebook_id=id,
        role="user",
        content=payload.query,
        has_image=bool(payload.image)
    )

    # Query RAG Engine & Ollama
    result = await answer_query_with_rag(
        notebook_id=id,
        query=payload.query,
        chat_history=history,
        image_base64=payload.image
    )

    assistant_answer = result["response"]
    sources = result["sources"]

    # Save assistant response to database
    add_chat_message(
        notebook_id=id,
        role="assistant",
        content=assistant_answer,
        has_image=False
    )

    return ChatResponse(
        response=assistant_answer,
        sources=sources,
        notebook_id=id
    )


@router.get("/{id}/chat/history", summary="Get chat history")
def get_notebook_chat_history(id: int, limit: int = 50):
    """Retrieves chronological chat conversation history for this notebook."""
    if not get_notebook(id):
        raise HTTPException(status_code=404, detail=f"Notebook with id {id} not found.")
    return list_chat_messages(id, limit=limit)


@router.delete("/{id}/chat/history", summary="Clear chat history")
def clear_notebook_chat_history(id: int):
    """Clears all conversation messages associated with this notebook."""
    if not get_notebook(id):
        raise HTTPException(status_code=404, detail=f"Notebook with id {id} not found.")
    deleted_count = clear_chat_history(id)
    return {"message": f"Cleared {deleted_count} messages from notebook {id}."}
