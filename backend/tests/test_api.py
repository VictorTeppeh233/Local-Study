import io
import os
import tempfile
from pathlib import Path
from fastapi.testclient import TestClient
import pytest

from backend.main import app
from backend.database import init_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    init_db()


def test_root_health():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "gemma4:e4b" in data["ollama"]["target_model"]


def test_notebook_lifecycle():
    # 1. Create a course notebook
    create_payload = {
        "title": "CS350 Distributed Operating Systems",
        "description": "Lecture notes and distributed algorithms",
        "course_code": "CS-350"
    }
    res = client.post("/notebooks", json=create_payload)
    assert res.status_code == 201
    nb_data = res.json()
    assert nb_data["title"] == create_payload["title"]
    nb_id = nb_data["id"]

    # 2. Get notebook details
    res = client.get(f"/notebooks/{nb_id}")
    assert res.status_code == 200
    assert res.json()["id"] == nb_id

    # 3. List all notebooks
    res = client.get("/notebooks")
    assert res.status_code == 200
    notebooks = res.json()
    assert any(n["id"] == nb_id for n in notebooks)

    # 4. Upload a PDF source
    sample_pdf_bytes = b"""%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 53 >> stream
BT /F1 12 Tf 50 700 Td (Distributed Systems Lecture Notes) Tj ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000348 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
418
%%EOF"""

    files = {"file": ("lecture1.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")}
    upload_res = client.post(f"/notebooks/{nb_id}/sources", files=files)
    assert upload_res.status_code == 201
    upload_data = upload_res.json()
    assert upload_data["filename"] == "lecture1.pdf"
    assert upload_data["num_pages"] == 1
    assert upload_data["num_chunks"] >= 1

    # 5. List sources
    sources_res = client.get(f"/notebooks/{nb_id}/sources")
    assert sources_res.status_code == 200
    assert len(sources_res.json()) >= 1

    # 6. Test Flashcard Creation and Anki export
    card_res = client.post(
        f"/notebooks/{nb_id}/flashcards",
        json={"front": "What is Paxos?", "back": "A consensus protocol for distributed systems."}
    )
    assert card_res.status_code == 201

    anki_res = client.get(f"/notebooks/{nb_id}/export/anki")
    assert anki_res.status_code == 200
    assert anki_res.headers["content-type"] == "application/octet-stream"
    assert len(anki_res.content) > 100

    # 7. Test Deadline Creation and Calendar export
    deadline_res = client.post(
        f"/notebooks/{nb_id}/deadlines",
        json={
            "title": "Assignment 1 Due",
            "due_date": "2026-11-10T23:59:00",
            "description": "Distributed RPC implementation"
        }
    )
    assert deadline_res.status_code == 201

    cal_res = client.get(f"/notebooks/{nb_id}/export/calendar")
    assert cal_res.status_code == 200
    assert "BEGIN:VCALENDAR" in cal_res.text
    assert "Assignment 1 Due" in cal_res.text

    # 8. Clean up notebook
    del_res = client.delete(f"/notebooks/{nb_id}")
    assert del_res.status_code == 200
