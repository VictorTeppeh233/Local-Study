import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx

try:
    from database import init_db
    from routers import chat, notebooks, productivity
except ImportError:
    from .database import init_db
    from .routers import chat, notebooks, productivity

BASE_DIR = Path(__file__).resolve().parent
UPLOADS_DIR = BASE_DIR / "uploads"
CHROMA_DIR = BASE_DIR / "chroma_db"
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma4:e4b")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure dirs and initialize SQLite database
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    CHROMA_DIR.mkdir(parents=True, exist_ok=True)
    init_db()

    # Verify Ollama status
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{OLLAMA_HOST}/api/tags")
            if resp.status_code == 200:
                print(f"✅ Local Ollama runner detected at {OLLAMA_HOST} (model: {OLLAMA_MODEL})")
            else:
                print(f"⚠️ Ollama returned non-200 status: {resp.status_code}")
    except Exception as e:
        print(f"⚠️ Ollama runner not detected at {OLLAMA_HOST}: {e}")

    yield

    # Shutdown logic if needed


app = FastAPI(
    title="Local Study Suite — Backend API",
    description=(
        "The high-performance, 100% open-source Python backend for the Local Study Suite. "
        "It powers offline document ingestion, local RAG vector search, multimodal chat orchestration "
        "via local Ollama weights (`gemma4:e4b`), and automated offline study tool generation "
        "(Anki decks, calendar sync files, quizzes, and analytics)."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware (allows cross-origin communication for local frontends)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Core Routers
app.include_router(notebooks.router, prefix="/notebooks", tags=["Notebooks"])
app.include_router(chat.router, prefix="/notebooks", tags=["Chat & RAG"])
app.include_router(productivity.router, prefix="/notebooks", tags=["Productivity & Exports"])


@app.get("/", tags=["Health & Status"])
async def root():
    """System health and service status overview."""
    ollama_online = False
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            res = await client.get(f"{OLLAMA_HOST}/api/tags")
            ollama_online = res.status_code == 200
    except Exception:
        ollama_online = False

    return {
        "status": "online",
        "service": "Local Study Suite Backend API",
        "version": "1.0.0",
        "offline_compliance": "100% local, zero cloud dependencies",
        "ollama": {
            "status": "connected" if ollama_online else "offline",
            "host": OLLAMA_HOST,
            "target_model": OLLAMA_MODEL
        },
        "documentation": {
            "swagger_ui": "/docs",
            "redoc": "/redoc"
        }
    }


@app.get("/health", tags=["Health & Status"])
async def health_check():
    """Simple ping check for monitoring."""
    return {"status": "ok"}
