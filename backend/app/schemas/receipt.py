from datetime import date
from uuid import UUID

from pydantic import BaseModel


class LineItem(BaseModel):
    description: str
    amount: float | None = None
    quantity: float | None = None


class ReceiptBase(BaseModel):
    partnership_id: UUID
    vendor: str
    purchase_date: date
    amount: float
    units: float | None = None
    event: str | None = None
    line_items: list[LineItem] = []


class ReceiptCreate(ReceiptBase):
    image_path: str | None = None


class Receipt(ReceiptBase):
    id: UUID
    logged_by: UUID | None = None  # None while DEV_NO_AUTH is on
    image_path: str | None = None


class OcrResult(BaseModel):
    """Pre-filled fields from OCR. Every field is optional; the user confirms before saving."""

    vendor: str | None = None
    purchase_date: date | None = None
    total: float | None = None
    line_items: list[LineItem] = []
    raw_text: str = ""
    image_path: str | None = None  # where the photo was stored in the "receipts" bucket
    suggested_partnership_id: UUID | None = None
