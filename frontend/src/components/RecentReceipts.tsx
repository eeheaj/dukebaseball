import type { Partnership, Receipt } from "../api";

const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function RecentReceipts({ receipts, partnerships }: { receipts: Receipt[]; partnerships: Partnership[] }) {
  if (!receipts.length) return null;
  const company = (id: string | null) =>
    id ? partnerships.find((p) => p.id === id)?.company ?? "—" : "Non-partner";
  return (
    <section className="card">
      <h2>Recent receipts</h2>
      <ul className="recent">
        {receipts.slice(0, 8).map((r) => (
          <li key={r.id}>
            <div>
              <strong>{r.vendor}</strong>
              <span className="muted small">
                {r.purchase_date} · {company(r.partnership_id)}
                {r.image_path ? " · 📎" : ""}
              </span>
            </div>
            <span className="amount">{money(r.amount)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
