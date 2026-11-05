"""Run real Tesseract OCR on an image (or a generated sample receipt) and print the parsed result.

    uv run python scripts/ocr_smoke.py                 # generated sample
    uv run python scripts/ocr_smoke.py path/to/receipt.jpg
"""

import io
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from PIL import Image, ImageDraw, ImageFont  # noqa: E402

from app.services.ocr_service import scan_receipt  # noqa: E402

LINES = [
    "CHICK-FIL-A DURHAM",
    "123 Main St Durham NC",
    "10/14/2026 12:31 PM",
    "",
    "Chicken Sandwich 45.00",
    "Waffle Fries 18.50",
    "Subtotal 63.50",
    "Tax 4.76",
    "TOTAL 68.26",
]


def sample_receipt() -> bytes:
    try:
        font = ImageFont.truetype("arial.ttf", 32)
    except OSError:
        font = ImageFont.load_default(size=32)
    img = Image.new("RGB", (700, 60 + 48 * len(LINES)), "white")
    draw = ImageDraw.Draw(img)
    for i, line in enumerate(LINES):
        draw.text((30, 30 + 48 * i), line, fill="black", font=font)
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=90)
    return buf.getvalue()


if __name__ == "__main__":
    data = Path(sys.argv[1]).read_bytes() if len(sys.argv) > 1 else sample_receipt()
    result = scan_receipt(data)
    print(result.model_dump_json(indent=2, exclude={"raw_text"}))
    print("--- raw text ---")
    print(result.raw_text)
