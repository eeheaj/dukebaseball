import { Link, useNavigate } from "react-router";
import { getOverview, listReceipts } from "../api";
import AddReceiptMenu from "../components/AddReceiptMenu";
import ProgressBar from "../components/ProgressBar";
import StatusPill from "../components/StatusPill";
import { byUrgency, loadDealRows, timeLeft } from "../deals";
import { initials, money, progressText, shortDate } from "../format";
import { useApi } from "../useApi";

export default function Overview() {
  const navigate = useNavigate();
  const { data, error } = useApi(() => Promise.all([getOverview(), loadDealRows(), listReceipts()]));

  if (error) return <p className="banner error">Couldn't load the overview: {error}</p>;
  if (!data) return <p className="loading">Loading…</p>;
  const [kpis, rows, receipts] = data;
  const company = (id: string | null) =>
    id ? rows.find((r) => r.p.id === id)?.p.company ?? "Unknown partner" : "Not a partner";

  return (
    <>
      <div className="page-head">
        <h1>Overview</h1>
        <AddReceiptMenu />
      </div>

      <div className="kpis">
        <div className="kpi"><span>Active Deals</span><strong data-testid="kpi-active">{kpis.active_deals}</strong></div>
        <div className="kpi"><span>At Risk</span><strong data-testid="kpi-at-risk">{kpis.at_risk_deals}</strong></div>
        <div className="kpi"><span>Spent this season</span><strong data-testid="kpi-spend">{money(kpis.season_spend, true)}</strong></div>
      </div>

      <div className="panel">
        <table className="table">
          <thead>
            <tr><th>Partner</th><th>Progress</th><th>Time left</th><th>Status</th></tr>
          </thead>
          <tbody>
            {[...rows].sort(byUrgency).map((r) => (
              <tr key={r.p.id} className="clickable" onClick={() => navigate(`/partnerships/${r.p.id}`)}>
                <td className="strong"><Link to={`/partnerships/${r.p.id}`}>{r.p.company}</Link></td>
                <td data-label="Progress">
                  <div className="sub">{progressText(r.p, r.prog.progress)}</div>
                  <ProgressBar pct={r.prog.progress_pct} />
                </td>
                <td data-label="Time left">{timeLeft(r)}</td>
                <td className="status-cell"><StatusPill status={r.prog.status} /></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="empty">No partnerships yet. <Link to="/partnerships/new">Add one</Link>.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="section-head">
        <h2>Recent Receipts</h2>
        <Link to="/receipts">View all</Link>
      </div>
      <div className="receipt-cards">
        {receipts.slice(0, 8).map((r) => (
          <Link key={r.id} to={r.partnership_id ? `/partnerships/${r.partnership_id}` : "/receipts"} className="receipt-card">
            <span className="sub">{shortDate(r.purchase_date)}</span>
            <span className="who">
              <span className="avatar">{initials(company(r.partnership_id))}</span>
              {company(r.partnership_id)}
            </span>
            <span className="what">
              <span className="sub">{[r.units ? `${r.units} units` : "", r.event ?? ""].filter(Boolean).join(" • ")}</span>
              <strong>{money(r.amount)}</strong>
            </span>
          </Link>
        ))}
        {receipts.length === 0 && <p className="empty">No receipts yet.</p>}
      </div>
    </>
  );
}
