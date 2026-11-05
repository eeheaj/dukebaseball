import pytest
from fastapi.testclient import TestClient

from app.api import receipts as receipts_api
from app.config import get_settings
from app.main import app
from tests.conftest import make_settings

WITH_PHOTO = "00000000-0000-4000-8000-000000000001"
NO_PHOTO = "00000000-0000-4000-8000-000000000002"


class FakeRepo:
    rows = {
        WITH_PHOTO: {"id": WITH_PHOTO, "image_path": "2026-11/abc.jpg"},
        NO_PHOTO: {"id": NO_PHOTO, "image_path": None},
    }

    def get(self, receipt_id):
        return self.rows.get(receipt_id)


class FakeStore:
    def signed_url(self, path, expires_in=300):
        return f"https://example.supabase.co/storage/v1/object/sign/receipts/{path}?token=t"


@pytest.fixture
def client():
    app.dependency_overrides[get_settings] = lambda: make_settings(DEV_NO_AUTH=True)
    app.dependency_overrides[receipts_api.get_receipt_repo] = FakeRepo
    app.dependency_overrides[receipts_api.get_image_store] = FakeStore
    yield TestClient(app, follow_redirects=False)
    app.dependency_overrides.clear()


def test_redirects_to_signed_photo_url(client):
    r = client.get(f"/api/receipts/{WITH_PHOTO}/image")
    assert r.status_code == 307
    assert r.headers["location"].endswith("receipts/2026-11/abc.jpg?token=t")


def test_404_when_receipt_has_no_photo(client):
    assert client.get(f"/api/receipts/{NO_PHOTO}/image").status_code == 404


def test_404_for_unknown_receipt(client):
    assert client.get("/api/receipts/00000000-0000-4000-8000-000000000009/image").status_code == 404
