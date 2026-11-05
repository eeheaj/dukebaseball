"""Setup check the capture page shows when something isn't configured. Never returns secrets."""

from fastapi import APIRouter
from pydantic import BaseModel

from app.config import get_settings
from app.services.ocr_service import tesseract_version

router = APIRouter(prefix="/status", tags=["status"])


class Status(BaseModel):
    tesseract: str | None  # version, or None if not found
    supabase_url: bool
    supabase_key: str  # "secret" | "publishable" | "none"
    database: str  # "ok" or a short error
    dev_no_auth: bool
    ready: bool


@router.get("", response_model=Status)
def get_status():
    s = get_settings()
    database = "not configured"
    if s.supabase_url and s.supabase_key:
        try:
            from app.deps import get_supabase

            get_supabase().table("partnerships").select("id").limit(1).execute()
            database = "ok"
        except Exception as exc:  # noqa: BLE001
            msg = str(exc)
            database = "tables missing: run scripts/apply_sql.py" if "partnerships" in msg else msg[:160]
    tess = tesseract_version()
    return Status(
        tesseract=tess,
        supabase_url=bool(s.supabase_url),
        supabase_key=s.supabase_key_kind,
        database=database,
        dev_no_auth=s.dev_no_auth,
        ready=bool(tess) and database == "ok" and s.supabase_key_kind != "none",
    )
