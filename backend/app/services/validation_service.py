from app.schemas.receipt import OcrResult, ReceiptCreate


def find_flags(receipt: ReceiptCreate, existing: list[dict], ocr: OcrResult | None = None) -> list[str]:
    """Return human-readable warnings. The user can still save after reviewing them."""
    flags: list[str] = []

    for other in existing:
        if (
            str(other.get("vendor", "")).strip().lower() == receipt.vendor.strip().lower()
            and str(other.get("purchase_date")) == receipt.purchase_date.isoformat()
            and abs(float(other.get("amount", 0)) - receipt.amount) < 0.01
        ):
            flags.append("Possible duplicate: same vendor, date and amount already logged.")
            break

    if ocr is not None:
        if ocr.total is not None and abs(ocr.total - receipt.amount) >= 0.01:
            flags.append(f"Amount ${receipt.amount:.2f} does not match receipt total ${ocr.total:.2f}.")
        if ocr.purchase_date and ocr.purchase_date != receipt.purchase_date:
            flags.append(f"Date {receipt.purchase_date} does not match receipt date {ocr.purchase_date}.")

    if receipt.line_items:
        items_sum = sum(i.amount or 0 for i in receipt.line_items)
        if items_sum > receipt.amount + 0.01:
            flags.append("Line items add up to more than the total.")

    return flags
