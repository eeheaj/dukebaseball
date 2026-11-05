// In-memory stand-in for the FastAPI backend, following backend/app/schemas.
// Progress uses the same formula as backend/app/services/progress_service.py.
import type { Page, Route } from "@playwright/test";

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const today = new Date(`${iso(new Date())}T00:00:00Z`);
const rel = (n: number) => iso(new Date(today.getTime() + n * DAY));
const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);

type P = Record<string, unknown> & { id: string; commitment_type: "spend" | "units"; target: number; start_date: string; end_date: string };
type R = Record<string, unknown> & { id: string; partnership_id: string; amount: number; units: number | null; purchase_date: string; vendor: string };

export function seed() {
  const p = (id: string, company: string, commitment_type: "spend" | "units", target: number, start: number, end: number): P => ({
    id, company, contact_name: "Sample Contact", contact_email: null, commitment_type, target,
    start_date: rel(start), end_date: rel(end), discount_pct: 20, deliverables: "Logo on BP jerseys\nSocial post at home opener", tags: [], contract_path: null,
  });
  let n = 0;
  const r = (pid: string, vendor: string, day: number, amount: number, units: number | null = null, event: string | null = null): R => ({
    id: `00000000-0000-0000-0000-${String(++n).padStart(12, "0")}`, partnership_id: pid, vendor, purchase_date: rel(day),
    amount, units, event, line_items: [], image_path: null, logged_by: null,
  });
  return {
    partnerships: [
      p("p-tss", "Triangle Sports Supply", "units", 200, -96, 12),
      p("p-bcb", "Bull City Burger", "spend", 10000, -96, 45),
      p("p-ccb", "Carolina Charter Bus", "spend", 25000, -96, 30),
      p("p-dbc", "Durham Bagel Co.", "spend", 5000, -100, -5),
    ],
    receipts: [
      r("p-tss", "Triangle Sports Supply", -60, 735, 28, "Practice balls"),
      r("p-tss", "Triangle Sports Supply", -20, 588, 12, "Batting gloves"),
      r("p-bcb", "Bull City Burger", -70, 6588, null, "Team dinners"),
      r("p-bcb", "Bull City Burger", -22, 412, null, "Team dinner, away trip"),
      r("p-ccb", "Carolina Charter Bus", -36, 7650, null, "Bus to Virginia Tech"),
      r("p-ccb", "Carolina Charter Bus", -27, 2150, null, "Bus to Georgia Tech"),
      r("p-dbc", "Durham Bagel Co.", -30, 5000, null, "Team breakfasts"),
    ],
  };
}

function progress(p: P, receipts: R[]) {
  const t = iso(today);
  const done = receipts.filter((r) => r.partnership_id === p.id).reduce((s, r) => s + (p.commitment_type === "units" ? r.units ?? 0 : r.amount), 0);
  const total = Math.max(days(p.start_date, p.end_date), 1);
  const elapsed = Math.min(Math.max(days(p.start_date, t), 0), total);
  const daysLeft = Math.max(days(t, p.end_date), 0);
  const remaining = Math.max(p.target - done, 0);
  const status = done >= p.target ? "complete" : done < (p.target * elapsed) / total ? "at_risk" : "on_track";
  return {
    progress: done, progress_pct: Math.round(Math.min(done / p.target, 1) * 1000) / 10, days_left: daysLeft,
    actual_pace: elapsed ? Math.round((done / elapsed) * 100) / 100 : 0,
    required_pace: Math.round((daysLeft ? remaining / daysLeft : remaining) * 100) / 100, status,
  };
}

export interface FakeApi {
  db: ReturnType<typeof seed>;
  calls: { method: string; path: string; body: unknown }[];
  ocrResult: Record<string, unknown>;
}

export async function installFakeApi(page: Page): Promise<FakeApi> {
  const api: FakeApi = { db: seed(), calls: [], ocrResult: {} };
  await page.route("**/api/**", async (route: Route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace(/^\/api/, "");
    const method = req.method();
    const body = method === "POST" && req.headers()["content-type"]?.includes("json") ? req.postDataJSON() : null;
    api.calls.push({ method, path, body });
    const json = (data: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    const { partnerships, receipts } = api.db;
    let m: RegExpMatchArray | null;

    if (path === "/status") return json({ tesseract: "5.4.0", supabase_url: true, supabase_key: "secret", database: "ok", dev_no_auth: true, ready: true });
    if (path === "/partnerships" && method === "GET") return json([...partnerships].sort((a, b) => String(a.company).localeCompare(String(b.company))));
    if (path === "/partnerships" && method === "POST") {
      const created = { ...(body as object), id: `p-new-${partnerships.length}`, contract_path: null } as P;
      partnerships.push(created);
      return json(created, 201);
    }
    if ((m = path.match(/^\/partnerships\/([^/]+)\/progress$/))) {
      const p = partnerships.find((x) => x.id === m![1]);
      return p ? json(progress(p, receipts)) : json({ detail: "Partnership not found" }, 404);
    }
    if ((m = path.match(/^\/partnerships\/([^/]+)$/))) {
      const p = partnerships.find((x) => x.id === m![1]);
      return p ? json(p) : json({ detail: "Partnership not found" }, 404);
    }
    if (path === "/overview") {
      const t = iso(today);
      const active = partnerships.filter((p) => p.start_date <= t && t <= p.end_date);
      return json({
        active_deals: active.length,
        at_risk_deals: active.filter((p) => progress(p, receipts).status === "at_risk").length,
        season_spend: active.filter((p) => p.commitment_type === "spend").reduce((s, p) => s + progress(p, receipts).progress, 0),
      });
    }
    if (path === "/receipts" && method === "GET") {
      const pid = url.searchParams.get("partnership_id");
      return json(receipts.filter((r) => !pid || r.partnership_id === pid).sort((a, b) => b.purchase_date.localeCompare(a.purchase_date)));
    }
    if (path === "/receipts/validate") {
      const r = (body as { receipt: R }).receipt;
      const dup = receipts.some((x) => x.vendor.toLowerCase() === r.vendor.toLowerCase() && x.purchase_date === r.purchase_date && Math.abs(x.amount - r.amount) < 0.01);
      return json(dup ? ["Possible duplicate: same vendor, date and amount already logged."] : []);
    }
    if (path === "/receipts" && method === "POST") {
      const created = { ...(body as object), id: `r-new-${receipts.length}`, logged_by: null } as R;
      receipts.push(created);
      return json(created, 201);
    }
    if (path === "/ocr/receipt") return json(api.ocrResult);
    return json({ detail: `fake API has no route for ${method} ${path}` }, 404);
  });
  return api;
}

export { rel };
