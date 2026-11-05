from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from supabase import Client

from app.db.repositories import PartnershipRepo, ReceiptImageStore
from app.deps import get_current_user, get_supabase
from app.schemas.receipt import OcrResult
from app.services.matching_service import match_partnership
from app.services.ocr_service import scan_receipt

router = APIRouter(prefix="/ocr", tags=["ocr"], dependencies=[Depends(get_current_user)])

MAX_BYTES = 10 * 1024 * 1024


def get_image_store(db: Client = Depends(get_supabase)) -> ReceiptImageStore:
    return ReceiptImageStore(db)


def get_partnership_repo(db: Client = Depends(get_supabase)) -> PartnershipRepo:
    return PartnershipRepo(db)


@router.post("/receipt", response_model=OcrResult)
async def ocr_receipt(
    image: UploadFile = File(...),
    store: ReceiptImageStore = Depends(get_image_store),
    partnerships: PartnershipRepo = Depends(get_partnership_repo),
):
    """Store the photo, OCR it, and suggest which partnership it belongs to."""
    content_type = image.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(400, "Upload an image file")
    data = await image.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "Image is larger than 10 MB")

    try:
        result = await run_in_threadpool(scan_receipt, data)
    except Exception as exc:
        if type(exc).__name__ == "TesseractNotFoundError":
            raise HTTPException(503, "Tesseract not installed; set TESSERACT_CMD in .env") from exc
        raise HTTPException(422, f"Could not read image: {exc}") from exc

    result.image_path = await run_in_threadpool(store.upload, data, content_type)
    suggestion = match_partnership(result.vendor, partnerships.list())
    result.suggested_partnership_id = UUID(str(suggestion)) if suggestion else None
    return result
