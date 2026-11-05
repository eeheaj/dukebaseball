from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from supabase import Client

from app.db.repositories import ReceiptImageStore, ReceiptRepo
from app.deps import get_current_user, get_supabase
from app.schemas.receipt import OcrResult, Receipt, ReceiptCreate
from app.services.validation_service import find_flags

router = APIRouter(prefix="/receipts", tags=["receipts"])


class ValidateRequest(BaseModel):
    receipt: ReceiptCreate
    ocr: OcrResult | None = None


@router.get("", response_model=list[Receipt])
def list_receipts(
    partnership_id: str | None = None,
    db: Client = Depends(get_supabase),
    _user=Depends(get_current_user),
):
    return ReceiptRepo(db).list(partnership_id)


@router.post("/validate", response_model=list[str])
def validate_receipt(body: ValidateRequest, db: Client = Depends(get_supabase), _user=Depends(get_current_user)):
    """Return duplicate/mismatch flags to show the user before they confirm."""
    existing = ReceiptRepo(db).same_day_same_vendor(body.receipt.vendor, body.receipt.purchase_date.isoformat())
    return find_flags(body.receipt, existing, body.ocr)


def get_receipt_repo(db: Client = Depends(get_supabase)) -> ReceiptRepo:
    return ReceiptRepo(db)


def get_image_store(db: Client = Depends(get_supabase)) -> ReceiptImageStore:
    return ReceiptImageStore(db)


@router.get("/{receipt_id}/image")
def receipt_image(
    receipt_id: UUID,
    repo: ReceiptRepo = Depends(get_receipt_repo),
    store: ReceiptImageStore = Depends(get_image_store),
    _user=Depends(get_current_user),
):
    """Redirect to a short-lived link for the photo the OCR step stored."""
    receipt = repo.get(str(receipt_id))
    if not receipt:
        raise HTTPException(404, "Receipt not found")
    if not receipt.get("image_path"):
        raise HTTPException(404, "This receipt has no photo")
    url = store.signed_url(receipt["image_path"])
    if not url:
        raise HTTPException(404, "Photo is missing from storage")
    return RedirectResponse(url, status_code=307)


@router.post("", response_model=Receipt, status_code=201)
def create_receipt(body: ReceiptCreate, db: Client = Depends(get_supabase), user=Depends(get_current_user)):
    data = body.model_dump(mode="json")
    data["logged_by"] = user.id
    return ReceiptRepo(db).create(data)
