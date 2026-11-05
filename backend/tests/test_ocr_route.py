import io
from datetime import date

import pytest
from PIL import Image

from app.api import ocr as ocr_api
from app.config import get_settings
from app.main import app
from app.services import ocr_service
from tests.conftest import make_settings

RECEIPT_TEXT = """CHICK-FIL-A #0123 DURHAM
10/14/2026
Chicken Sandwich 45.00
TOTAL 68.26
"""


class FakeStore:
    def __init__(self):
        self.uploads = []

    def upload(self, data, content_type):
        self.uploads.append((len(data), content_type))
        return "2026-11/fake.jpg"


class FakePartnerships:
    def list(self):
        return [{"id": "6f1c2a9e-0000-4000-8000-000000000001", "company": "Chick-fil-A Durham"}]


@pytest.fixture
def api(monkeypatch):
    store = FakeStore()
    monkeypatch.setattr(ocr_service, "extract_text", lambda _b: RECEIPT_TEXT)
    app.dependency_overrides[get_settings] = lambda: make_settings(DEV_NO_AUTH=True)
    app.dependency_overrides[ocr_api.get_image_store] = lambda: store
    app.dependency_overrides[ocr_api.get_partnership_repo] = FakePartnerships
    from fastapi.testclient import TestClient

    yield TestClient(app), store
    app.dependency_overrides.clear()


def _jpeg() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (400, 600), "white").save(buf, "JPEG")
    return buf.getvalue()


def test_scan_returns_fields_path_and_suggestion(api):
    client, store = api
    r = client.post("/api/ocr/receipt", files={"image": ("r.jpg", _jpeg(), "image/jpeg")})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["vendor"] == "CHICK-FIL-A #0123 DURHAM"
    assert body["purchase_date"] == date(2026, 10, 14).isoformat()
    assert body["total"] == 68.26
    assert body["image_path"] == "2026-11/fake.jpg"
    assert body["suggested_partnership_id"] == "6f1c2a9e-0000-4000-8000-000000000001"
    assert store.uploads == [(len(_jpeg()), "image/jpeg")]


def test_rejects_non_image(api):
    client, store = api
    r = client.post("/api/ocr/receipt", files={"image": ("r.txt", b"hello", "text/plain")})
    assert r.status_code == 400
    assert store.uploads == []


def test_preprocess_handles_small_image():
    img = ocr_service.preprocess(_jpeg())
    assert img.mode == "L" and img.width == 1000
