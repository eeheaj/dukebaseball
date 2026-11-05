from fastapi import APIRouter, Depends
from fastapi.responses import Response
from supabase import Client

from app.db.repositories import ReceiptRepo
from app.deps import get_current_user, get_supabase
from app.services.export_service import receipts_to_csv, receipts_to_xlsx

router = APIRouter(prefix="/exports", tags=["exports"], dependencies=[Depends(get_current_user)])

XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


@router.get("/receipts.csv")
def export_receipts_csv(partnership_id: str | None = None, db: Client = Depends(get_supabase)):
    data = receipts_to_csv(ReceiptRepo(db).list(partnership_id))
    return Response(data, media_type="text/csv",
                    headers={"Content-Disposition": 'attachment; filename="receipts.csv"'})


@router.get("/receipts.xlsx")
def export_receipts_xlsx(partnership_id: str | None = None, db: Client = Depends(get_supabase)):
    data = receipts_to_xlsx(ReceiptRepo(db).list(partnership_id))
    return Response(data, media_type=XLSX_MIME,
                    headers={"Content-Disposition": 'attachment; filename="receipts.xlsx"'})
