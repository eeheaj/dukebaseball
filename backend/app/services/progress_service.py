from datetime import date

from app.schemas.partnership import PartnershipProgress, PartnershipStatus


def compute_progress(
    target: float,
    progress: float,
    start_date: date,
    end_date: date,
    today: date | None = None,
) -> PartnershipProgress:
    """Progress vs. target, days left, actual vs. required pace, and status."""
    today = today or date.today()
    total_days = max((end_date - start_date).days, 1)
    elapsed = min(max((today - start_date).days, 0), total_days)
    days_left = max((end_date - today).days, 0)

    remaining = max(target - progress, 0)
    actual_pace = progress / elapsed if elapsed else 0.0
    required_pace = remaining / days_left if days_left else remaining

    if progress >= target:
        status = PartnershipStatus.complete
    else:
        # At risk if behind where a linear pace would put us at this point.
        expected = target * elapsed / total_days
        status = PartnershipStatus.at_risk if progress < expected else PartnershipStatus.on_track

    return PartnershipProgress(
        progress=progress,
        progress_pct=round(min(progress / target, 1.0) * 100, 1),
        days_left=days_left,
        actual_pace=round(actual_pace, 2),
        required_pace=round(required_pace, 2),
        status=status,
    )
