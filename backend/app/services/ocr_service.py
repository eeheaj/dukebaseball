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
_ITEM_RE = re.compile(r"^(?P<desc>[A-Za-z].*?)\s+\$?(?P<amt>\d+\.\d{2})$")
_SKIP_WORDS = ("total", "subtotal", "tax", "change", "cash", "visa", "mastercard", "amex", "balance")


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


def _find_line_items(lines: list[str]) -> list[LineItem]:
    items = []
    for line in lines:
        if any(w in line.lower() for w in _SKIP_WORDS):
            continue
        if m := _ITEM_RE.match(line):
            items.append(LineItem(description=m["desc"].strip(), amount=float(m["amt"])))
    return items
