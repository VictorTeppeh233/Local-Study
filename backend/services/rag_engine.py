import os
import re
import base64
from pathlib import Path
from typing import Any, Dict, List, Optional
import httpx
import chromadb
from chromadb.config import Settings

BASE_DIR = Path(__file__).resolve().parent.parent
CHROMA_PATH = Path(os.getenv("CHROMA_PATH", str(BASE_DIR / "chroma_db")))
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma4:e4b")

# Initialize ChromaDB persistent client
CHROMA_PATH.mkdir(parents=True, exist_ok=True)
_chroma_client = chromadb.PersistentClient(path=str(CHROMA_PATH))


def get_chroma_client() -> chromadb.PersistentClient:
    return _chroma_client


def get_collection_name(notebook_id: int) -> str:
    return f"notebook_{notebook_id}"


def get_or_create_notebook_collection(notebook_id: int):
    client = get_chroma_client()
    name = get_collection_name(notebook_id)
    return client.get_or_create_collection(
        name=name,
        metadata={"hnsw:space": "cosine"}
    )


def delete_notebook_collection(notebook_id: int) -> bool:
    client = get_chroma_client()
    name = get_collection_name(notebook_id)
    try:
        client.delete_collection(name=name)
        return True
    except Exception:
        return False


def chunk_text(text: str, chunk_size: int = 800, chunk_overlap: int = 150) -> List[str]:
    """Splits text into overlapping chunks using paragraph and sentence boundaries."""
    text = text.strip()
    if not text:
        return []

    # If text is small enough, return as single chunk
    if len(text) <= chunk_size:
        return [text]

    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        if end >= len(text):
            chunks.append(text[start:].strip())
            break

        # Attempt to break at paragraph boundary, newline, or sentence end
        split_point = -1
        for sep in ["\n\n", "\n", ". ", "? ", "! "]:
            idx = text.rfind(sep, start + chunk_overlap, end)
            if idx != -1:
                split_point = idx + len(sep)
                break

        if split_point == -1:
            split_point = end

        chunk = text[start:split_point].strip()
        if chunk:
            chunks.append(chunk)

        start = max(start + 1, split_point - chunk_overlap)

    return chunks


def index_document(
    notebook_id: int,
    source_id: int,
    filename: str,
    pages: List[Dict[str, Any]]
) -> int:
    """
    Indexes extracted PDF pages into ChromaDB.
    pages is a list of dicts: [{"page": 1, "text": "..."}]
    """
    collection = get_or_create_notebook_collection(notebook_id)
    documents = []
    metadatas = []
    ids = []

    total_chunks = 0
    for item in pages:
        page_num = item["page"]
        raw_text = item["text"]
        chunks = chunk_text(raw_text)

        for i, chunk in enumerate(chunks):
            doc_id = f"src_{source_id}_p{page_num}_c{i}"
            documents.append(chunk)
            metadatas.append({
                "notebook_id": notebook_id,
                "source_id": source_id,
                "filename": filename,
                "page": page_num,
                "chunk_index": i
            })
            ids.append(doc_id)
            total_chunks += 1

    if documents:
        # Chroma handles batches automatically
        collection.upsert(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )

    return total_chunks


def delete_source_chunks(notebook_id: int, source_id: int) -> int:
    """Deletes all chunks belonging to a given source."""
    try:
        collection = get_or_create_notebook_collection(notebook_id)
        collection.delete(where={"source_id": source_id})
        return True
    except Exception:
        return False


def search_relevant_chunks(notebook_id: int, query: str, n_results: int = 5) -> List[Dict[str, Any]]:
    """Retrieves top-k relevant document chunks for a query from ChromaDB."""
    try:
        collection = get_or_create_notebook_collection(notebook_id)
        count = collection.count()
        if count == 0:
            return []

        limit = min(n_results, count)
        results = collection.query(
            query_texts=[query],
            n_results=limit
        )

        chunks = []
        if results and results["documents"] and results["documents"][0]:
            docs = results["documents"][0]
            metas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(docs)
            distances = results["distances"][0] if results.get("distances") else [0.0] * len(docs)

            for doc, meta, dist in zip(docs, metas, distances):
                chunks.append({
                    "content": doc,
                    "filename": meta.get("filename", "Unknown"),
                    "page": meta.get("page", 1),
                    "source_id": meta.get("source_id"),
                    "distance": float(dist)
                })
        return chunks
    except Exception as e:
        print(f"[RAG] Error searching ChromaDB: {e}")
        return []


async def call_ollama_chat(
    messages: List[Dict[str, Any]],
    model: Optional[str] = None,
    timeout: float = 300.0
) -> str:
    """Direct async client call to Ollama /api/chat endpoint."""
    target_model = model or OLLAMA_MODEL
    url = f"{OLLAMA_HOST}/api/chat"

    payload = {
        "model": target_model,
        "messages": messages,
        "stream": False,
        "keep_alive": "60m",
        "options": {
            "temperature": 0.3
        }
    }

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            return data.get("message", {}).get("content", "").strip()
        except httpx.ConnectError:
            return (
                "⚠️ Error: Unable to connect to local Ollama server at "
                f"{OLLAMA_HOST}. Please ensure Ollama is running (`ollama serve`)."
            )
        except httpx.TimeoutException:
            return (
                f"⚠️ Local LLM ({target_model}) inference timed out after {int(timeout)}s. "
                "Because Gemma 4 is running on CPU, the initial cold-start weight loading takes extra time. Please try your question again now that weights are cached in RAM."
            )
        except Exception as e:
            err_msg = str(e) or type(e).__name__
            return f"⚠️ Error querying local LLM ({target_model}): {err_msg}"


async def answer_query_with_rag(
    notebook_id: int,
    query: str,
    chat_history: Optional[List[Dict[str, Any]]] = None,
    image_base64: Optional[str] = None
) -> Dict[str, Any]:
    """
    RAG Chat Orchestration:
    1. Retrieves relevant context chunks from ChromaDB.
    2. Builds augmented prompt with citations.
    3. Handles multimodal vision input (whiteboard, formula, handwritten notes).
    4. Queries local Ollama (gemma4:e4b).
    """
    relevant_chunks = search_relevant_chunks(notebook_id, query, n_results=4)

    context_blocks = []
    for i, c in enumerate(relevant_chunks, 1):
        context_blocks.append(
            f"--- Source [{i}] File: {c['filename']} (Page {c['page']}) ---\n{c['content']}"
        )
    context_text = "\n\n".join(context_blocks) if context_blocks else "No relevant lecture documents found in notebook."

    system_prompt = (
        "You are an expert offline academic tutor and study assistant in the Local Study Suite.\n"
        "Your goal is to help the student understand concepts deeply, solve problems step-by-step, and retain knowledge.\n\n"
        "Instructions:\n"
        "1. Base your answer primarily on the provided Notebook Sources.\n"
        "2. When citing facts, mention the source file and page number from the context.\n"
        "3. If an image is attached (Snap & Solve), examine diagrams, equations, or whiteboard handwriting carefully.\n"
        "4. If the provided sources don't fully cover the topic, clearly state what comes from the course notes vs general academic knowledge.\n"
        "5. Keep explanations clear, rigorous, and easy to study."
    )

    messages = [{"role": "system", "content": system_prompt}]

    # Include recent chat history
    if chat_history:
        for msg in chat_history[-6:]:
            role = "user" if msg.get("role") == "user" else "assistant"
            messages.append({"role": role, "content": msg.get("content", "")})

    # Prepare user message
    user_content = (
        f"Relevant Notebook Materials:\n{context_text}\n\n"
        f"Student Question: {query}"
    )

    user_msg: Dict[str, Any] = {"role": "user", "content": user_content}
    if image_base64:
        # Strip header if present e.g. data:image/png;base64,
        if "," in image_base64:
            image_base64 = image_base64.split(",", 1)[1]
        user_msg["images"] = [image_base64]

    messages.append(user_msg)

    llm_response = await call_ollama_chat(messages)

    return {
        "response": llm_response,
        "sources": [
            {
                "filename": c["filename"],
                "page": c["page"],
                "source_id": c["source_id"],
                "distance": c["distance"]
            }
            for c in relevant_chunks
        ]
    }
