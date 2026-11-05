// Types mirror backend/app/schemas/*.py. Keep them in sync (or generate from /openapi.json later).

export interface PartnershipCreate {
  company: string;
  contact_name: string | null;
  contact_email: string | null;
  commitment_type: "spend" | "units";
  target: number;
  start_date: string; // YYYY-MM-DD
  end_date: string;
  discount_pct: number | null;
  deliverables: string | null; // one per line
  tags: string[];
}

export interface Partnership extends PartnershipCreate {
  id: string;
  contract_path: string | null;
}

export type PartnershipStatus = "on_track" | "at_risk" | "complete";

/** Computed by the backend (services/progress_service.py). The UI never recomputes these. */
export interface PartnershipProgress {
  progress: number;
  progress_pct: number;
  days_left: number;
  actual_pace: number;
  required_pace: number;
  status: PartnershipStatus;
}

export interface Overview {
  active_deals: number;
  at_risk_deals: number;
  season_spend: number;
}

export interface LineItem {
  description: string;
  amount: number | null;
  quantity?: number | null;
}

export interface OcrResult {
  vendor: string | null;
  purchase_date: string | null; // YYYY-MM-DD
  total: number | null;
  line_items: LineItem[];
  raw_text: string;
  image_path: string | null;
  suggested_partnership_id: string | null;
}

export interface ReceiptCreate {
  partnership_id: string | null; // null = not a partner purchase
  vendor: string;
  purchase_date: string;
  amount: number;
  units: number | null;
  event: string | null;
  line_items: LineItem[];
  image_path: string | null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, init);
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      /* non-JSON error body */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export interface Receipt extends ReceiptCreate {
  id: string;
  logged_by: string | null;
}

export interface SetupStatus {
  tesseract: string | null;
  supabase_url: boolean;
  supabase_key: "secret" | "publishable" | "none";
  database: string;
  dev_no_auth: boolean;
  ready: boolean;
}

export const getStatus = () => request<SetupStatus>("/status");

export const getPartnerships = () => request<Partnership[]>("/partnerships");

export const getPartnership = (id: string) => request<Partnership>(`/partnerships/${id}`);

export const getProgress = (id: string) => request<PartnershipProgress>(`/partnerships/${id}/progress`);

export const createPartnership = (body: PartnershipCreate) => request<Partnership>("/partnerships", json(body));

export const getOverview = () => request<Overview>("/overview");

export const listReceipts = (partnershipId?: string) =>
  request<Receipt[]>(partnershipId ? `/receipts?partnership_id=${encodeURIComponent(partnershipId)}` : "/receipts");

export function scanReceipt(file: File) {
  const form = new FormData();
  form.append("image", file);
  return request<OcrResult>("/ocr/receipt", { method: "POST", body: form });
}

/** Opens the stored receipt photo (the backend redirects to a short-lived Supabase link). */
export const receiptImageUrl = (receiptId: string) => `/api/receipts/${encodeURIComponent(receiptId)}/image`;

export const validateReceipt = (receipt: ReceiptCreate, ocr: OcrResult | null) =>
  request<string[]>("/receipts/validate", json({ receipt, ocr }));

export const createReceipt = (receipt: ReceiptCreate) => request<{ id: string }>("/receipts", json(receipt));
