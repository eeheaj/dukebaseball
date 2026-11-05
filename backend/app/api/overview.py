from datetime import date

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from supabase import Client

from app.db.repositories import PartnershipRepo
from app.deps import get_current_user, get_supabase
from app.schemas.partnership import PartnershipStatus
from app.services.progress_service import compute_progress

router = APIRouter(prefix="/overview", tags=["overview"], dependencies=[Depends(get_current_user)])


class Overview(BaseModel):
    active_deals: int
    at_risk_deals: int
    season_spend: float


@router.get("", response_model=Overview)
def get_overview(db: Client = Depends(get_supabase)):
    repo = PartnershipRepo(db)
    today = date.today()
    active = at_risk = 0
    spend = 0.0
    for p in repo.list():
        start, end = date.fromisoformat(p["start_date"]), date.fromisoformat(p["end_date"])
        if not (start <= today <= end):
            continue
        active += 1
        progress = repo.progress_total(p)
        if p["commitment_type"] == "spend":
            spend += progress
        if compute_progress(float(p["target"]), progress, start, end, today).status == PartnershipStatus.at_risk:
            at_risk += 1
    return Overview(active_deals=active, at_risk_deals=at_risk, season_spend=round(spend, 2))
