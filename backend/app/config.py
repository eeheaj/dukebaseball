from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parents[1]
_ROOT_DIR = _BACKEND_DIR.parent


class Settings(BaseSettings):
    # Root .env first (shared with the frontend), then backend/.env overrides.
    model_config = SettingsConfigDict(
        env_file=(_ROOT_DIR / ".env", _BACKEND_DIR / ".env"),
        extra="ignore",
        populate_by_name=True,
    )

    supabase_url: str = Field(
        default="",
        validation_alias=AliasChoices("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"),
    )
    supabase_publishable_key: str = Field(
        default="",
        validation_alias=AliasChoices(
            "SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_ANON_KEY"
        ),
    )
    supabase_secret_key: str = Field(
        default="",
        validation_alias=AliasChoices("SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"),
    )
    tesseract_cmd: str = Field(default="", validation_alias="TESSERACT_CMD")
    cors_origins: str = Field(
        default="http://localhost:5173,http://localhost:3000", validation_alias="CORS_ORIGINS"
    )
    # Local testing only: skips the bearer-token check on every route.
    dev_no_auth: bool = Field(default=False, validation_alias="DEV_NO_AUTH")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def supabase_key(self) -> str:
        """Secret key if available (bypasses RLS server-side), else the publishable key."""
        return self.supabase_secret_key or self.supabase_publishable_key

    @property
    def supabase_key_kind(self) -> str:
        if self.supabase_secret_key:
            return "secret"
        return "publishable" if self.supabase_publishable_key else "none"


@lru_cache
def get_settings() -> Settings:
    return Settings()
