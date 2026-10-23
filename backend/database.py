import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = Path(os.getenv("DATABASE_PATH", str(BASE_DIR / "app.db")))


def get_connection() -> sqlite3.Connection:
    """Creates and returns a connection to the SQLite database."""
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


@contextmanager
def get_db():
    """Context manager for SQLite transactions."""
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    """Initializes the database schema if tables do not exist."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.executescript("""
        CREATE TABLE IF NOT EXISTS notebooks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            course_code TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            notebook_id INTEGER NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
            filename TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_size INTEGER DEFAULT 0,
            num_pages INTEGER DEFAULT 0,
            num_chunks INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            notebook_id INTEGER NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            has_image INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS flashcards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            notebook_id INTEGER NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
            front TEXT NOT NULL,
            back TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS deadlines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            notebook_id INTEGER NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            due_date TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_sources_notebook ON sources(notebook_id);
        CREATE INDEX IF NOT EXISTS idx_chat_messages_notebook ON chat_messages(notebook_id);
        CREATE INDEX IF NOT EXISTS idx_flashcards_notebook ON flashcards(notebook_id);
        CREATE INDEX IF NOT EXISTS idx_deadlines_notebook ON deadlines(notebook_id);
        """)


# --- Notebook CRUD ---
def create_notebook(title: str, description: str = "", course_code: str = "") -> Dict[str, Any]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO notebooks (title, description, course_code, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            """,
            (title, description, course_code),
        )
        notebook_id = cursor.lastrowid
        cursor.execute("SELECT * FROM notebooks WHERE id = ?", (notebook_id,))
        row = cursor.fetchone()
        return dict(row)


def list_notebooks() -> List[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT n.*,
                   (SELECT COUNT(*) FROM sources WHERE notebook_id = n.id) AS source_count,
                   (SELECT COUNT(*) FROM flashcards WHERE notebook_id = n.id) AS flashcard_count,
                   (SELECT COUNT(*) FROM deadlines WHERE notebook_id = n.id) AS deadline_count
            FROM notebooks n
            ORDER BY n.updated_at DESC
        """)
        return [dict(row) for row in cursor.fetchall()]


def get_notebook(notebook_id: int) -> Optional[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT n.*,
                   (SELECT COUNT(*) FROM sources WHERE notebook_id = n.id) AS source_count,
                   (SELECT COUNT(*) FROM flashcards WHERE notebook_id = n.id) AS flashcard_count,
                   (SELECT COUNT(*) FROM deadlines WHERE notebook_id = n.id) AS deadline_count
            FROM notebooks n
            WHERE n.id = ?
        """, (notebook_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def update_notebook(notebook_id: int, title: Optional[str] = None, description: Optional[str] = None, course_code: Optional[str] = None) -> Optional[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        current = get_notebook(notebook_id)
        if not current:
            return None
        new_title = title if title is not None else current["title"]
        new_desc = description if description is not None else current["description"]
        new_code = course_code if course_code is not None else current["course_code"]
        cursor.execute("""
            UPDATE notebooks
            SET title = ?, description = ?, course_code = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (new_title, new_desc, new_code, notebook_id))
        return get_notebook(notebook_id)


def delete_notebook(notebook_id: int) -> bool:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM notebooks WHERE id = ?", (notebook_id,))
        return cursor.rowcount > 0


# --- Source CRUD ---
def add_source(
    notebook_id: int,
    filename: str,
    file_path: str,
    file_size: int = 0,
    num_pages: int = 0,
    num_chunks: int = 0
) -> Dict[str, Any]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO sources (notebook_id, filename, file_path, file_size, num_pages, num_chunks)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (notebook_id, filename, file_path, file_size, num_pages, num_chunks))
        source_id = cursor.lastrowid
        # Update notebook updated_at
        cursor.execute("UPDATE notebooks SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", (notebook_id,))
        cursor.execute("SELECT * FROM sources WHERE id = ?", (source_id,))
        return dict(cursor.fetchone())


def list_sources(notebook_id: int) -> List[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sources WHERE notebook_id = ? ORDER BY created_at DESC", (notebook_id,))
        return [dict(row) for row in cursor.fetchall()]


def get_source(source_id: int) -> Optional[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sources WHERE id = ?", (source_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def delete_source(source_id: int) -> Optional[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sources WHERE id = ?", (source_id,))
        row = cursor.fetchone()
        if not row:
            return None
        cursor.execute("DELETE FROM sources WHERE id = ?", (source_id,))
        return dict(row)


# --- Chat Messages CRUD ---
def add_chat_message(notebook_id: int, role: str, content: str, has_image: bool = False) -> Dict[str, Any]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO chat_messages (notebook_id, role, content, has_image)
            VALUES (?, ?, ?, ?)
        """, (notebook_id, role, content, 1 if has_image else 0))
        msg_id = cursor.lastrowid
        cursor.execute("UPDATE notebooks SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", (notebook_id,))
        cursor.execute("SELECT * FROM chat_messages WHERE id = ?", (msg_id,))
        return dict(cursor.fetchone())


def list_chat_messages(notebook_id: int, limit: int = 50) -> List[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM chat_messages
            WHERE notebook_id = ?
            ORDER BY created_at ASC
            LIMIT ?
        """, (notebook_id, limit))
        return [dict(row) for row in cursor.fetchall()]


def clear_chat_history(notebook_id: int) -> int:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM chat_messages WHERE notebook_id = ?", (notebook_id,))
        return cursor.rowcount


# --- Flashcards CRUD ---
def add_flashcard(notebook_id: int, front: str, back: str) -> Dict[str, Any]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO flashcards (notebook_id, front, back)
            VALUES (?, ?, ?)
        """, (notebook_id, front, back))
        card_id = cursor.lastrowid
        cursor.execute("SELECT * FROM flashcards WHERE id = ?", (card_id,))
        return dict(cursor.fetchone())


def list_flashcards(notebook_id: int) -> List[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM flashcards WHERE notebook_id = ? ORDER BY id ASC", (notebook_id,))
        return [dict(row) for row in cursor.fetchall()]


def delete_flashcard(card_id: int) -> bool:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM flashcards WHERE id = ?", (card_id,))
        return cursor.rowcount > 0


# --- Deadlines CRUD ---
def add_deadline(notebook_id: int, title: str, due_date: str, description: str = "") -> Dict[str, Any]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO deadlines (notebook_id, title, description, due_date)
            VALUES (?, ?, ?, ?)
        """, (notebook_id, title, description, due_date))
        deadline_id = cursor.lastrowid
        cursor.execute("SELECT * FROM deadlines WHERE id = ?", (deadline_id,))
        return dict(cursor.fetchone())


def list_deadlines(notebook_id: int) -> List[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM deadlines WHERE notebook_id = ? ORDER BY due_date ASC", (notebook_id,))
        return [dict(row) for row in cursor.fetchall()]


def delete_deadline(deadline_id: int) -> bool:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM deadlines WHERE id = ?", (deadline_id,))
        return cursor.rowcount > 0
