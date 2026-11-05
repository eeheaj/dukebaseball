import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import exports, ocr, overview, partnerships, receipts, status
from app.config import get_settings

log = logging.getLogger("uvicorn.error")
settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Never log key values, only which kind is in use.
    log.info("Supabase key in use: %s | DEV_NO_AUTH=%s", settings.supabase_key_kind, settings.dev_no_auth)
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


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


for module in (status, partnerships, receipts, ocr, overview, exports):
    app.include_router(module.router, prefix="/api")
