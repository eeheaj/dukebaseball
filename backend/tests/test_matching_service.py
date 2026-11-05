from app.services.matching_service import match_partnership

PARTNERS = [
    {"id": "p-cfa", "company": "Chick-fil-A Durham"},
    {"id": "p-ua", "company": "Under Armour"},
]


def test_matches_noisy_ocr_vendor():
    assert match_partnership("CHICK-FIL-A #0123 DURHAM", PARTNERS) == "p-cfa"


def test_matches_partial_name():
    assert match_partnership("UNDER ARMOUR OUTLET", PARTNERS) == "p-ua"


def test_unrelated_vendor_returns_none():
    assert match_partnership("Harris Teeter", PARTNERS) is None


def test_empty_vendor_returns_none():
    assert match_partnership(None, PARTNERS) is None
