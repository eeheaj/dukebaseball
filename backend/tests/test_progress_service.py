from datetime import date

from app.schemas.partnership import PartnershipStatus
from app.services.progress_service import compute_progress

START, END = date(2026, 1, 1), date(2026, 12, 31)


def test_complete_when_target_hit():
    p = compute_progress(10_000, 10_500, START, END, today=date(2026, 6, 1))
    assert p.status == PartnershipStatus.complete
    assert p.progress_pct == 100.0


def test_at_risk_when_behind_linear_pace():
    # Halfway through the year with 20% spent.
    p = compute_progress(10_000, 2_000, START, END, today=date(2026, 7, 2))
    assert p.status == PartnershipStatus.at_risk
    assert p.required_pace > p.actual_pace


def test_on_track_when_ahead():
    p = compute_progress(10_000, 6_000, START, END, today=date(2026, 7, 2))
    assert p.status == PartnershipStatus.on_track


def test_days_left_never_negative():
    p = compute_progress(10_000, 1_000, START, END, today=date(2027, 2, 1))
    assert p.days_left == 0
