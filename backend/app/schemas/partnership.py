from datetime import date
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


class CommitmentType(str, Enum):
    spend = "spend"  # dollars
    units = "units"  # number of items bought


class PartnershipStatus(str, Enum):
    on_track = "on_track"
    at_risk = "at_risk"
    complete = "complete"


class PartnershipBase(BaseModel):
    company: str
    contact_name: str | None = None
    contact_email: str | None = None
    commitment_type: CommitmentType
    target: float = Field(gt=0)
    start_date: date
    end_date: date
    discount_pct: float | None = Field(default=None, ge=0, le=100)
    deliverables: str | None = None
    tags: list[str] = []


class PartnershipCreate(PartnershipBase):
    pass


class Partnership(PartnershipBase):
    id: UUID
    contract_path: str | None = None


class PartnershipProgress(BaseModel):
    progress: float
    progress_pct: float
    days_left: int
    actual_pace: float  # progress per day so far
    required_pace: float  # progress per day needed from today to hit target
    status: PartnershipStatus
