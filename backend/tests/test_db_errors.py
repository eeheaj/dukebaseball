from postgrest.exceptions import APIError

from app.api import receipts as receipts_api
from app.config import get_settings
from app.deps import get_supabase
from app.main import app
from tests.conftest import make_settings


def test_database_error_becomes_readable_400(monkeypatch):
    def failing_create(self, data):
        raise APIError({"message": 'null value in column "partnership_id"', "code": "23502"})

    monkeypatch.setattr(receipts_api.ReceiptRepo, "create", failing_create)
    app.dependency_overrides[get_settings] = lambda: make_settings(DEV_NO_AUTH=True)
    app.dependency_overrides[get_supabase] = lambda: object()
    try:
        from fastapi.testclient import TestClient

        r = TestClient(app).post(
            "/api/receipts",
            json={"partnership_id": None, "vendor": "X", "purchase_date": "2026-11-05", "amount": 1},
        )
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 400
    assert "optional_partnership.sql" in r.json()["detail"]
