import { useState } from "react";
import { Link } from "react-router";
import ProgressBar from "../components/ProgressBar";
import StatusPill from "../components/StatusPill";
import { byUrgency, loadDealRows, type DealRow } from "../deals";
import { monthDay, progressText } from "../format";
import { useApi } from "../useApi";

const SORTS = {
  status: { label: "Status", fn: byUrgency },
  deadline: { label: "Deadlines", fn: (a: DealRow, b: DealRow) => a.p.end_date.localeCompare(b.p.end_date) },
  name: { label: "Alphabetical", fn: (a: DealRow, b: DealRow) => a.p.company.localeCompare(b.p.company) },
};

export default function Partnerships() {
  const { data, error } = useApi(loadDealRows);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<keyof typeof SORTS>("status");

  const rows = (data ?? [])
    .filter((r) => r.p.company.toLowerCase().includes(q.trim().toLowerCase()))
    .sort(SORTS[sort].fn);

  return (
    <>
      <div className="page-head">
        <h1>Partnerships</h1>
        <div className="toolbar">
          <input type="search" aria-label="Search partners" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
          <select aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value as keyof typeof SORTS)}>
            {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>Sort: {v.label}</option>)}
          </select>
          <Link to="/partnerships/new" className="btn-primary">+ New Partnership</Link>
        </div>
      </div>

      {error && <p className="banner error">Couldn't load partnerships: {error}</p>}
      {!data && !error && <p className="loading">Loading…</p>}

      <div className="deal-cards">
        {rows.map((r) => (
          <Link key={r.p.id} to={`/partnerships/${r.p.id}`} className="deal-card">
            <span className="deal-card-head">
              <strong>{r.p.company}</strong>
              <StatusPill status={r.prog.status} />
            </span>
            <span className="sub">
              {progressText(r.p, r.prog.progress)} • {r.prog.days_left > 0 ? `ends ${monthDay(r.p.end_date)}` : "ended"}
            </span>
            <ProgressBar pct={r.prog.progress_pct} wide />
          </Link>
        ))}
        {data && rows.length === 0 && <p className="empty">{q ? `No partnerships match "${q}".` : "No partnerships yet."}</p>}
      </div>
    </>
  );
}
