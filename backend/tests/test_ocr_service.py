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


def _items(text):
    return [(i.description, i.amount, i.quantity) for i in parse_receipt_text(text).line_items]


def test_items_with_tax_flags_and_noise():
    text = "BULL CITY BURGER\nBurger 12.99 T\nFries $ 4.50 F\nShake 5.25 |\nSubtotal 22.74\nTax 1.70\nTotal 24.44\n"
    assert _items(text) == [("Burger", 12.99, None), ("Fries", 4.50, None), ("Shake", 5.25, None)]


def test_items_with_quantities_and_codes():
    text = "STORE\n2 Chicken Sandwich 9.98\n3x Lemonade 7.50\n004011 BANANAS 1.29\nWings 2 @ 7.99 15.98\nTOTAL 34.75\n"
    assert _items(text) == [
        ("Chicken Sandwich", 9.98, 2.0),
        ("Lemonade", 7.50, 3.0),
        ("BANANAS", 1.29, None),
        ("Wings", 15.98, 2.0),
    ]


def test_items_ocr_misreads_comma_and_split_lines():
    text = "SHOP\nBaseballs dozen\n45.00\nBatting Gloves 4,99\nGrip Tape 3.O0\nTOTAL 52.99\n"
    assert _items(text) == [("Baseballs dozen", 45.00, None), ("Batting Gloves", 4.99, None), ("Grip Tape", 3.00, None)]


def test_items_skip_discounts_payments_and_after_total():
    text = (
        "SHOP\nBat 89.99\nMember discount -10.00\nCoupon 5.00\nBall 5.00-\nTOTAL 79.99\n"
        "VISA 79.99\nRefund Policy Item 1.00\n"
    )
    assert _items(text) == [("Bat", 89.99, None)]


def test_header_lines_are_not_items():
    text = "CHICK-FIL-A\n123 Main St Durham NC 27701\n(919) 555-1234\n10/14/2026 12:31 PM\nNuggets 6.49\nTOTAL 6.94\n"
    assert _items(text) == [("Nuggets", 6.49, None)]
