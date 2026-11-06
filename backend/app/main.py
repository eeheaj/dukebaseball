import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from postgrest.exceptions import APIError

from app.api import exports, ocr, overview, partnerships, receipts, status
from app.config import get_settings

log = logging.getLogger("uvicorn.error")
settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Never log key values, only which kind is in use.
    log.info("Supabase key in use: %s | DEV_NO_AUTH=%s", settings.supabase_key_kind, settings.dev_no_auth)
    if settings.dev_no_auth:
        log.warning("DEV_NO_AUTH is on: every API route is open. Never use this on a public deploy.")
    if settings.supabase_key_kind == "publishable":
        log.warning(
            "Only the publishable key is set: inserts/uploads need SUPABASE_SECRET_KEY "
            "or supabase/dev/dev_anon_policies.sql."
        )
    yield


app = FastAPI(title="Duke Baseball Hub API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


_DB_HINTS = {
    # Postgres error code -> what to do about it
    "23502": "A required field is empty in the database. If this is a non-partner receipt, "
    "apply supabase/migrations/20261105010000_optional_partnership.sql in the SQL Editor.",
    "42501": "Permission denied by Supabase. Check SUPABASE_SERVICE_ROLE_KEY in .env.",
    "42P01": "Table missing. Apply the migrations in supabase/migrations.",
    "23503": "That partnership no longer exists. Refresh the page and pick again.",
}


@app.exception_handler(APIError)
async def supabase_error(_request: Request, exc: APIError) -> JSONResponse:
    """Turn Supabase/Postgres errors into a readable message instead of a bare 500."""
    log.error("Supabase error %s: %s", exc.code, exc.message)
    hint = _DB_HINTS.get(str(exc.code), "")
    return JSONResponse(status_code=400, content={"detail": f"Database error: {exc.message}. {hint}".strip()})


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


for module in (status, partnerships, receipts, ocr, overview, exports):
    app.include_router(module.router, prefix="/api")
