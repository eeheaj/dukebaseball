from datetime import date

from app.schemas.receipt import ReceiptCreate
from app.services.export_service import NON_PARTNER_LABEL, receipts_to_csv


def test_receipt_without_partnership_is_valid():
    r = ReceiptCreate(vendor="Harris Teeter", purchase_date=date(2026, 11, 5), amount=42.10)
    assert r.partnership_id is None
    assert r.model_dump(mode="json")["partnership_id"] is None


def test_export_labels_non_partner_receipts():
    rows = [
        {"purchase_date": "2026-11-05", "vendor": "Harris Teeter", "partnerships": None, "amount": 42.10},
        {"purchase_date": "2026-11-05", "vendor": "CFA", "partnerships": {"company": "Chick-fil-A Durham"}, "amount": 9.5},
    ]
    csv = receipts_to_csv(rows).decode()
    assert f"Harris Teeter,{NON_PARTNER_LABEL}" in csv
    assert "CFA,Chick-fil-A Durham" in csv
