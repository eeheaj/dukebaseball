from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.db.repositories import PartnershipRepo
from app.deps import get_current_user, get_supabase
from app.schemas.partnership import Partnership, PartnershipCreate, PartnershipProgress
from app.services.progress_service import compute_progress

router = APIRouter(prefix="/partnerships", tags=["partnerships"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[Partnership])
def list_partnerships(db: Client = Depends(get_supabase)):
    return PartnershipRepo(db).list()


@router.post("", response_model=Partnership, status_code=201)
def create_partnership(body: PartnershipCreate, db: Client = Depends(get_supabase)):
    # TODO: restrict to staff role once roles are wired up (see deps.get_current_user).
    return PartnershipRepo(db).create(body.model_dump(mode="json"))


@router.get("/{partnership_id}", response_model=Partnership)
def get_partnership(partnership_id: str, db: Client = Depends(get_supabase)):
    p = PartnershipRepo(db).get(partnership_id)
    if not p:
        raise HTTPException(404, "Partnership not found")
    return p


@router.get("/{partnership_id}/progress", response_model=PartnershipProgress)
def get_progress(partnership_id: str, db: Client = Depends(get_supabase)):
    repo = PartnershipRepo(db)
    p = repo.get(partnership_id)
    if not p:
        raise HTTPException(404, "Partnership not found")
    return compute_progress(
        target=float(p["target"]),
        progress=repo.progress_total(p),
        start_date=date.fromisoformat(p["start_date"]),
        end_date=date.fromisoformat(p["end_date"]),
    )
