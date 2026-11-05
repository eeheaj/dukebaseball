from datetime import date

from app.services.ocr_service import parse_receipt_text

SAMPLE = """\
CHICK-FIL-A DURHAM
123 Main St
10/14/2026 12:31 PM
Chicken Sandwich      45.00
Waffle Fries          18.50
Subtotal              63.50
Tax                    4.76
TOTAL                 68.26
VISA ****1234
"""


def test_parses_vendor_date_total():
    r = parse_receipt_text(SAMPLE)
    assert r.vendor == "CHICK-FIL-A DURHAM"
    assert r.purchase_date == date(2026, 10, 14)
    assert r.total == 68.26


def test_parses_line_items_and_skips_totals():
    r = parse_receipt_text(SAMPLE)
    assert [(i.description, i.amount) for i in r.line_items] == [
        ("Chicken Sandwich", 45.00),
        ("Waffle Fries", 18.50),
    ]


def test_empty_text():
    r = parse_receipt_text("")
    assert r.vendor is None and r.total is None and r.line_items == []
