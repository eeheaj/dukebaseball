import csv
import io

from openpyxl import Workbook

# TODO: replace with the exact columns from the team's existing Excel sheet.
RECEIPT_COLUMNS = ["Date", "Vendor", "Partner", "Amount", "Units", "Event", "Logged By"]


def _receipt_row(r: dict) -> list:
    return [
        r.get("purchase_date"),
        r.get("vendor"),
        (r.get("partnerships") or {}).get("company"),
        r.get("amount"),
        r.get("units"),
        r.get("event"),
        r.get("logged_by"),
    ]


def receipts_to_csv(receipts: list[dict]) -> bytes:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(RECEIPT_COLUMNS)
    writer.writerows(_receipt_row(r) for r in receipts)
    return buf.getvalue().encode()


def receipts_to_xlsx(receipts: list[dict]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Receipts"
    ws.append(RECEIPT_COLUMNS)
    for r in receipts:
        ws.append(_receipt_row(r))
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
