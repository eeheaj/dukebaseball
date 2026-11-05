import pytest
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.deps import get_supabase
from app.main import app


def make_settings(**overrides) -> Settings:
    # _env_file=None: tests never read the real .env (and its keys).
    return Settings(_env_file=None, **overrides)


def _no_supabase():
    return object()  # tests must never talk to the real project


@pytest.fixture
def client():
    app.dependency_overrides[get_settings] = lambda: make_settings()
    app.dependency_overrides[get_supabase] = _no_supabase
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def dev_client():
    app.dependency_overrides[get_settings] = lambda: make_settings(DEV_NO_AUTH=True)
    app.dependency_overrides[get_supabase] = _no_supabase
    yield TestClient(app)
    app.dependency_overrides.clear()
