import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router";
import { getOverview, listReceipts } from "../api";
import { isActive, spendByMonth, spendByPartner } from "../analytics";
import AddReceiptMenu from "../components/AddReceiptMenu";
import Insight, { sameItem, type Anchor, type KpiKey, type Selection } from "../components/Insight";
import { PaceCheck, SpendByMonth, SpendByPartner } from "../components/OverviewCharts";
import ProgressBar from "../components/ProgressBar";
import StatusPill from "../components/StatusPill";
import { byUrgency, loadDealRows, timeLeft } from "../deals";
import { addDays, initials, money, progressText, shortDate, todayISO } from "../format";
import { useApi } from "../useApi";
import { useMediaQuery } from "../useMediaQuery";

// Clicking anything opens its detail without leaving the page: a side panel on wide
// screens (the page shifts left to make room), a drop-down under the item on phones.
export default function Overview() {
  const { data, error } = useApi(() => Promise.all([getOverview(), loadDealRows(), listReceipts()]));
  const wide = useMediaQuery("(min-width: 1000px)");
  const [sel, setSel] = useState<Selection | null>(null);
  const toggle = (s: Selection) => setSel((cur) => (sameItem(cur, s) ? null : s));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSel(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (error) return <p className="banner error">Couldn't load the overview: {error}</p>;
  if (!data) return <p className="loading">Loading…</p>;
  const [kpis, rows, receipts] = data;
  const company = (id: string | null) =>
    id ? rows.find((r) => r.p.id === id)?.p.company ?? "Unknown partner" : "Not a partner";

  const insight = sel && <Insight sel={sel} data={{ kpis, rows, receipts }} onSelect={setSel} onClose={() => setSel(null)} inline={!wide} />;
  const dropDown = (at: Anchor) => (!wide && sel?.from === at ? insight : null);
  const picked = (kind: Selection["kind"], key: string) =>
    sel?.kind === kind && ("id" in sel ? sel.id : "key" in sel ? sel.key : sel.month) === key;

  const since = addDays(todayISO(), -30);
  const recent = receipts.filter((r) => r.purchase_date >= since);
  const tiles: { key: KpiKey; label: string; value: string; testId: string }[] = [
    { key: "active", label: "Active Deals", value: String(kpis.active_deals), testId: "kpi-active" },
    { key: "at_risk", label: "At Risk", value: String(kpis.at_risk_deals), testId: "kpi-at-risk" },
    { key: "spend", label: "Spent this season", value: money(kpis.season_spend, true), testId: "kpi-spend" },
    { key: "recent", label: "Receipts, 30 days", value: String(recent.length), testId: "kpi-recent" },
  ];

  return (
    <div className={`overview${wide && sel ? " with-panel" : ""}`}>
      <div className="overview-main">
        <div className="page-head">
          <h1>Overview</h1>
          <AddReceiptMenu />
        </div>

        <div className="kpis">
          {tiles.map((t) => (
            <button key={t.key} type="button" className={`kpi${picked("kpi", t.key) ? " on" : ""}`} aria-pressed={picked("kpi", t.key)} onClick={() => toggle({ kind: "kpi", key: t.key, from: "kpis" })}>
              <span>{t.label}</span><strong data-testid={t.testId}>{t.value}</strong>
            </button>
          ))}
        </div>
        {dropDown("kpis")}

        <div className="panel">
          <table className="table">
            <thead>
              <tr><th>Partner</th><th>Progress</th><th>Time left</th><th>Status</th></tr>
            </thead>
            <tbody>
              {[...rows].sort(byUrgency).map((r) => {
                const on = picked("deal", r.p.id);
                const open = () => toggle({ kind: "deal", id: r.p.id, from: "table" });
                return (
                  <Fragment key={r.p.id}>
                    <tr className={`clickable${on ? " selected" : ""}`} onClick={open}>
                      <td className="strong">
                        <button type="button" className="row-btn" aria-expanded={on} onClick={(e) => { e.stopPropagation(); open(); }}>{r.p.company}</button>
                      </td>
                      <td data-label="Progress">
                        <div className="sub">{progressText(r.p, r.prog.progress)}</div>
                        <ProgressBar pct={r.prog.progress_pct} />
                      </td>
                      <td data-label="Time left">{timeLeft(r)}</td>
                      <td className="status-cell"><StatusPill status={r.prog.status} /></td>
                    </tr>
                    {!wide && on && sel?.from === "table" && <tr className="expand"><td colSpan={4}>{insight}</td></tr>}
                  </Fragment>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={4} className="empty">No partnerships yet. <Link to="/partnerships/new">Add one</Link>.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="chart-grid">
          <section className="panel chart-card">
            <h2 className="chart-title">Spend by month</h2>
            <p className="sub">All receipts, last 6 months. Tap a month for its receipts.</p>
            <SpendByMonth months={spendByMonth(receipts)} selected={sel?.kind === "month" ? sel.month : undefined} onSelect={(month) => toggle({ kind: "month", month, from: "months" })} />
          </section>
          {dropDown("months")}
          <section className="panel chart-card">
            <h2 className="chart-title">Spend by partner</h2>
            <p className="sub">Dollars on receipts, all time.</p>
            <SpendByPartner items={spendByPartner(rows, receipts)} selected={sel?.kind === "deal" && sel.from === "partners" ? sel.id : undefined} onSelect={(id) => toggle({ kind: "deal", id, from: "partners" })} />
          </section>
          {dropDown("partners")}
        </div>

        <section className="panel chart-card">
          <h2 className="chart-title">Pace check</h2>
          <p className="sub">Each active deal against where it should be today if progress were even. Furthest behind first.</p>
          <PaceCheck rows={rows.filter((r) => isActive(r))} selected={sel?.kind === "deal" && sel.from === "pace" ? sel.id : undefined} onSelect={(id) => toggle({ kind: "deal", id, from: "pace" })} />
        </section>
        {dropDown("pace")}

        <div className="section-head">
          <h2>Recent Receipts</h2>
          <Link to="/receipts">View all</Link>
        </div>
        <div className="receipt-cards">
          {receipts.slice(0, 8).map((r) => (
            <button key={r.id} type="button" className={`receipt-card${picked("receipt", r.id) ? " on" : ""}`} aria-pressed={picked("receipt", r.id)} onClick={() => toggle({ kind: "receipt", id: r.id, from: "recent" })}>
              <span className="sub">{shortDate(r.purchase_date)}</span>
              <span className="who">
                <span className="avatar">{initials(company(r.partnership_id))}</span>
                {company(r.partnership_id)}
              </span>
              <span className="what">
                <span className="sub">{[r.units ? `${r.units} units` : "", r.event ?? ""].filter(Boolean).join(" • ")}</span>
                <strong>{money(r.amount)}</strong>
              </span>
            </button>
          ))}
          {receipts.length === 0 && <p className="empty">No receipts yet.</p>}
        </div>
        {dropDown("recent")}
      </div>

      {wide && sel && <aside className="insight-side">{insight}</aside>}
    </div>
  );
}
