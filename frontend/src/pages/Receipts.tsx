import { useState } from "react";
import { useNavigate } from "react-router";
import { getPartnerships, listReceipts } from "../api";
import AddReceiptMenu from "../components/AddReceiptMenu";
import { addDays, money, shortDate, todayISO } from "../format";
import { useApi } from "../useApi";

const RANGES = { all: "All dates", "7": "Last 7 days", "30": "Last 30 days", "90": "Last 90 days" } as const;

export default function Receipts() {
  const navigate = useNavigate();
  const { data, error } = useApi(() => Promise.all([listReceipts(), getPartnerships()]));
  const [partnerId, setPartnerId] = useState("all");
  const [range, setRange] = useState<keyof typeof RANGES>("all");

  const [receipts, partnerships] = data ?? [[], []];
  const company = (id: string) => partnerships.find((p) => p.id === id)?.company ?? "Unknown partner";
  const since = range === "all" ? null : addDays(todayISO(), -Number(range));
  const shown = receipts
    .filter((r) => partnerId === "all" || r.partnership_id === partnerId)
    .filter((r) => !since || r.purchase_date >= since);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Receipts</h1>
          <div className="toolbar">
            <select aria-label="Partner" value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
              <option value="all">All partners</option>
              {partnerships.map((p) => <option key={p.id} value={p.id}>{p.company}</option>)}
            </select>
            <select aria-label="Date" value={range} onChange={(e) => setRange(e.target.value as keyof typeof RANGES)}>
              {Object.entries(RANGES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <AddReceiptMenu />
      </div>

      {error && <p className="banner error">Couldn't load receipts: {error}</p>}

      <div className="panel">
        <table className="table">
          <thead>
            <tr><th>Date</th><th>Partner</th><th>Vendor</th><th>Total</th><th>Photo</th><th>Logged by</th></tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="clickable" onClick={() => navigate(`/partnerships/${r.partnership_id}`)}>
                <td>{shortDate(r.purchase_date)}</td>
                <td>{company(r.partnership_id)}</td>
                <td>{r.vendor}</td>
                <td>{money(r.amount, true)}</td>
                <td>{r.image_path ? "Attached" : ""}</td>
                {/* logged_by stays empty until sign-in is built (DEV_NO_AUTH). */}
                <td>{r.logged_by ? "Staff" : "Not recorded"}</td>
              </tr>
            ))}
            {data && shown.length === 0 && <tr><td colSpan={6} className="empty">No receipts match these filters.</td></tr>}
            {!data && !error && <tr><td colSpan={6} className="empty">Loading…</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
