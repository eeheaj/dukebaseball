"""All Supabase table access lives here so routers and services never build queries."""

from __future__ import annotations  # lets methods named `list` coexist with `list[...]` hints

import uuid
from datetime import date

from supabase import Client

_EXT = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic"}


class ReceiptImageStore:
    BUCKET = "receipts"

    def __init__(self, db: Client):
        self.db = db

    def upload(self, data: bytes, content_type: str) -> str:
        ext = _EXT.get(content_type, "jpg")
        path = f"{date.today():%Y-%m}/{uuid.uuid4()}.{ext}"
        self.db.storage.from_(self.BUCKET).upload(path, data, {"content-type": content_type})
        return path


class PartnershipRepo:
    def __init__(self, db: Client):
        self.db = db

    def list(self) -> list[dict]:
        return self.db.table("partnerships").select("*").order("company").execute().data

    def get(self, partnership_id: str) -> dict | None:
        rows = self.db.table("partnerships").select("*").eq("id", partnership_id).execute().data
        return rows[0] if rows else None

    def create(self, data: dict) -> dict:
        return self.db.table("partnerships").insert(data).execute().data[0]

    def progress_total(self, partnership: dict) -> float:
        field = "units" if partnership["commitment_type"] == "units" else "amount"
        rows = (
            self.db.table("receipts")
            .select(field)
            .eq("partnership_id", partnership["id"])
            .execute()
            .data
        )
        return sum(float(r[field] or 0) for r in rows)


class ReceiptRepo:
    def __init__(self, db: Client):
        self.db = db

    def list(self, partnership_id: str | None = None) -> list[dict]:
        q = (
            self.db.table("receipts")
            .select("*, partnerships(company)")
            .order("purchase_date", desc=True)
        )
        if partnership_id:
            q = q.eq("partnership_id", partnership_id)
        return q.execute().data

    def same_day_same_vendor(self, vendor: str, purchase_date: str) -> list[dict]:
        return (
            self.db.table("receipts")
            .select("*")
            .ilike("vendor", vendor)
            .eq("purchase_date", purchase_date)
            .execute()
            .data
        )

    def create(self, data: dict) -> dict:
        return self.db.table("receipts").insert(data).execute().data[0]
