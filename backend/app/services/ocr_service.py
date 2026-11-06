import io
import os
import re
import shutil
from datetime import date, datetime
from pathlib import Path

from app.config import get_settings
from app.schemas.receipt import LineItem, OcrResult

_TOTAL_RE = re.compile(r"\b(?:grand\s+)?total\b[^\d\-]*\$?\s*(\d+[.,]\d{2})", re.IGNORECASE)
_SUBTOTAL_RE = re.compile(r"\bsub\s*-?\s*total\b", re.IGNORECASE)
_DATE_RES = [
    (re.compile(r"\b(\d{1,2}/\d{1,2}/\d{4})\b"), "%m/%d/%Y"),
    (re.compile(r"\b(\d{1,2}/\d{1,2}/\d{2})\b"), "%m/%d/%y"),
    (re.compile(r"\b(\d{4}-\d{2}-\d{2})\b"), "%Y-%m-%d"),
]
# A price at the end of a line. Allows "$ 4.99", "4,99", "4. 99", a trailing tax flag ("4.99 T",
# "4.99 FA") or OCR junk ("4.99 |"), and O/o/l/I misread as digits ("4.9O").
_D = r"[\dOolI]"
_PRICE_TAIL = re.compile(
    rf"(?P<neg>-)?\$?\s*(?P<amt>{_D}{{1,5}}\s?[.,]\s?{_D}{{2}})(?P<neg2>-)?(?:\s+[A-Za-z]{{1,2}})?[\s*#|)\]]*$"
)
_DIGIT_FIX = str.maketrans("OolI", "0011")
# Totals block: once we reach it, the items are over.
_STOP_RE = re.compile(r"\b(?:sub\s*-?\s*total|total|tax|balance|amount\s+due)\b", re.IGNORECASE)
# Payment / summary lines that are never items.
_SKIP_RE = re.compile(
    r"\b(?:cash|change|visa|mastercard|amex|discover|debit|credit|card|tip|gratuity|tender|payment|"
    r"auth|approval|savings|saved|coupon|discount)\b",
    re.IGNORECASE,
)
_LEAD_QTY = re.compile(r"^(?P<qty>\d{1,2})\s*[xX@]?\s+(?=\S)")
_AT_QTY = re.compile(r"\b(?P<qty>\d{1,3})\s*[xX@]\s*\$?\d+[.,]\d{2}\b")
_CODE = re.compile(r"(?:^|\s)\d{3,}(?=\s|$)")  # SKU / PLU numbers


def preprocess(image_bytes: bytes):
    """Make phone photos friendlier to Tesseract."""
    from PIL import Image, ImageOps

    img = Image.open(io.BytesIO(image_bytes))
    img = ImageOps.exif_transpose(img)  # phones often store photos sideways + an EXIF flag
    img = ImageOps.grayscale(img)
    if img.width < 1000:
        scale = 1000 / img.width
        img = img.resize((1000, int(img.height * scale)), Image.LANCZOS)
    return ImageOps.autocontrast(img)


_WINDOWS_DEFAULTS = [
    Path(r"C:\Program Files\Tesseract-OCR\tesseract.exe"),
    Path(os.environ.get("LOCALAPPDATA", "")) / "Programs" / "Tesseract-OCR" / "tesseract.exe",
]


def _tesseract_cmd() -> str | None:
    """TESSERACT_CMD from .env, else PATH, else the default Windows install location."""
    configured = get_settings().tesseract_cmd
    if configured:
        return configured
    if shutil.which("tesseract"):
        return None  # pytesseract finds it on PATH
    return next((str(p) for p in _WINDOWS_DEFAULTS if p.is_file()), None)


def tesseract_version() -> str | None:
    import pytesseract

    if cmd := _tesseract_cmd():
        pytesseract.pytesseract.tesseract_cmd = cmd
    try:
        return str(pytesseract.get_tesseract_version())
    except Exception:  # noqa: BLE001
        return None


def extract_text(image_bytes: bytes) -> str:
    import pytesseract

    if cmd := _tesseract_cmd():
        pytesseract.pytesseract.tesseract_cmd = cmd
    # --psm 6: treat the image as a single uniform block of text (works well for receipts).
    return pytesseract.image_to_string(preprocess(image_bytes), config="--psm 6")


def parse_receipt_text(text: str) -> OcrResult:
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    return OcrResult(
        vendor=lines[0] if lines else None,
        purchase_date=_find_date(text),
        total=_find_total(lines),
        line_items=_find_line_items(lines),
        raw_text=text,
    )


def scan_receipt(image_bytes: bytes) -> OcrResult:
    return parse_receipt_text(extract_text(image_bytes))


def _find_total(lines: list[str]) -> float | None:
    # Use the last "total" line that isn't a subtotal.
    for line in reversed(lines):
        if _SUBTOTAL_RE.search(line):
            continue
        if m := _TOTAL_RE.search(line):
            return float(m.group(1).replace(",", "."))
    return None


def _find_date(text: str) -> date | None:
    for regex, fmt in _DATE_RES:
        if m := regex.search(text):
            try:
                return datetime.strptime(m.group(1), fmt).date()
            except ValueError:
                continue
    return None


def _letters(text: str) -> int:
    return sum(c.isalpha() for c in text)


def _find_line_items(lines: list[str]) -> list[LineItem]:
    items: list[LineItem] = []
    pending: str | None = None  # a text-only line whose price may be on the next line
    for line in lines:
        if _STOP_RE.search(line):
            if items:
                break
            pending = None
            continue
        if _SKIP_RE.search(line):
            pending = None
            continue
        m = _PRICE_TAIL.search(line)
        if not m or not any(c.isdigit() for c in m["amt"]):
            pending = line if _letters(line) >= 2 else None
            continue
        desc = line[: m.start()].strip()
        if _letters(desc) < 2:
            if desc or not pending:
                pending = None
                continue
            desc = pending  # "Chicken Sandwich" / "45.00" split across two lines
        pending = None
        if m["neg"] or m["neg2"]:
            continue  # discounts / voids
        amount = float(re.sub(r"\s", "", m["amt"]).translate(_DIGIT_FIX).replace(",", "."))
        item = _clean_item(desc, amount)
        if item:
            items.append(item)
    return items


def _clean_item(desc: str, amount: float) -> LineItem | None:
    qty = None
    if at := _AT_QTY.search(desc):  # "Burger 2 @ 4.99"
        qty = float(at["qty"])
        desc = desc[: at.start()] + desc[at.end() :]
    elif lead := _LEAD_QTY.match(desc):  # "2 Burger" / "2x Burger"
        qty = float(lead["qty"])
        desc = desc[lead.end() :]
    desc = _CODE.sub(" ", desc)
    desc = re.sub(r"\s{2,}", " ", desc).strip(" .:-*#|$")
    if _letters(desc) < 2:
        return None
    return LineItem(description=desc, amount=amount, quantity=qty)
