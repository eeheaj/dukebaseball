from fastapi import APIRouter, Depends
from pydantic import BaseModel
from supabase import Client

from app.db.repositories import ReceiptRepo
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


@router.post("", response_model=Receipt, status_code=201)
def create_receipt(body: ReceiptCreate, db: Client = Depends(get_supabase), user=Depends(get_current_user)):
    data = body.model_dump(mode="json")
    data["logged_by"] = user.id
    return ReceiptRepo(db).create(data)
