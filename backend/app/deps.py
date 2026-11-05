from functools import lru_cache
from types import SimpleNamespace

from fastapi import Depends, Header, HTTPException, status
from supabase import Client, create_client

from app.config import Settings, get_settings


@lru_cache
def _client() -> Client:
    s = get_settings()
    if not s.supabase_url or not s.supabase_key:
        raise RuntimeError("Supabase URL/key missing: check NEXT_PUBLIC_SUPABASE_URL and keys in .env")
    return create_client(s.supabase_url, s.supabase_key)


def get_supabase() -> Client:
    return _client()


def get_bearer_token(authorization: str | None = Header(default=None)) -> str | None:
    return authorization.split(" ", 1)[1] if authorization and authorization.lower().startswith("bearer ") else None


def get_current_user(
    token: str | None = Depends(get_bearer_token),
    settings: Settings = Depends(get_settings),
):
    """Validate the Supabase JWT sent by the frontend as `Authorization: Bearer <token>`."""
    if settings.dev_no_auth:
        return SimpleNamespace(id=None, email="dev@local")
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    try:
        user = get_supabase().auth.get_user(token).user
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token") from exc
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    return user
