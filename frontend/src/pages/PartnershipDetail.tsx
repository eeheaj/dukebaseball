import { Link, useParams } from "react-router";
import { getPartnership, getProgress, listReceipts, receiptImageUrl } from "../api";
import AddReceiptMenu from "../components/AddReceiptMenu";
import PaceChart from "../components/PaceChart";
import ProgressBar from "../components/ProgressBar";
import StatusPill from "../components/StatusPill";
import { money, progressText, shortDate } from "../format";
import { useApi } from "../useApi";

export default function PartnershipDetail() {
  const { id = "" } = useParams();
  const { data, error } = useApi(() => Promise.all([getPartnership(id), getProgress(id), listReceipts(id)]), [id]);

  if (error) return <p className="banner error">Couldn't load this partnership: {error} <Link to="/partnerships">Back</Link></p>;
  if (!data) return <p className="loading">Loading…</p>;
  const [p, prog, receipts] = data;
  const units = p.commitment_type === "units";
  const deliverables = (p.deliverables ?? "").split("\n").map((d) => d.trim()).filter(Boolean);
  const pace = units ? `${prog.required_pace} units` : money(prog.required_pace);

  return (
    <>
      <div className="page-head">
        <h1 className="with-back"><Link to="/partnerships" aria-label="Back to partnerships">←</Link>{p.company}</h1>
        <AddReceiptMenu partnershipId={p.id} />
      </div>

      <div className="detail-grid">
        <section className="panel">
          <div className="deal-card-head">
            <h2 className="muted-h">Commitment</h2>
            <StatusPill status={prog.status} />
          </div>
          <p className="strong">{units ? `Buy ${p.target} units` : `Spend ${money(p.target)}`}</p>
          <p className="sub">
            {shortDate(p.start_date)} to {shortDate(p.end_date)}
            {p.discount_pct != null && ` • ${p.discount_pct}% off`}
          </p>
          {p.contact_name && <p className="sub">Contact: {p.contact_name}</p>}
          <h3>Deliverables</h3>
          {deliverables.length ? <ul className="deliverables">{deliverables.map((d) => <li key={d}>{d}</li>)}</ul> : <p className="sub">None listed</p>}
        </section>

        <section className="panel">
          <p className="sub" data-testid="deal-progress">
            {progressText(p, prog.progress)} • {prog.days_left > 0 ? `${prog.days_left} days left` : "ended"}
          </p>
          <ProgressBar pct={prog.progress_pct} />
          {prog.status !== "complete" && prog.days_left > 0 && (
            <p className="hint">Needs {pace} a day to hit the target.</p>
          )}
          <PaceChart partnership={p} receipts={receipts} />
        </section>
      </div>

      <h2 className="section-title">Receipts for this deal</h2>
      <div className="panel">
        <table className="table">
          <thead>
            <tr><th>Date</th><th>Vendor</th><th>Total</th>{units && <th>Units</th>}<th>Trip / event</th><th>Photo</th></tr>
          </thead>
          <tbody>
            {receipts.map((r) => (
              <tr key={r.id}>
                <td>{shortDate(r.purchase_date)}</td>
                <td>{r.vendor}</td>
                <td>{money(r.amount, true)}</td>
                {units && <td>{r.units ?? "-"}</td>}
                <td>{r.event ?? ""}</td>
                <td>{r.image_path && <a href={receiptImageUrl(r.id)} target="_blank" rel="noreferrer">View</a>}</td>
              </tr>
            ))}
            {receipts.length === 0 && <tr><td colSpan={units ? 6 : 5} className="empty">No receipts yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
