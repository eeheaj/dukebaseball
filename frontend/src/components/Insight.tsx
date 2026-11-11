// The detail shown when you click something on the Overview: a side panel on wide screens,
// a drop-down right under the thing you tapped on phones. Same content either way.
import { useEffect, useRef } from "react";
import { Link } from "react-router";
import type { Overview, Receipt } from "../api";
import { amountText, isActive, monthLabel, paceFor, paceText, spendByPartner } from "../analytics";
import type { DealRow } from "../deals";
import { money, progressText, shortDate, todayISO, addDays } from "../format";
import AddReceiptMenu from "./AddReceiptMenu";
import { PaceBar, SpendByPartner } from "./OverviewCharts";
import PaceChart from "./PaceChart";
import PhotoLink from "./PhotoLink";
import ProgressBar from "./ProgressBar";
import StatusPill from "./StatusPill";

/** Where on the page the click came from, so the phone drop-down opens right there. */
export type Anchor = "kpis" | "table" | "months" | "partners" | "pace" | "recent";
export type KpiKey = "active" | "at_risk" | "spend" | "recent";
export type Selection = { from: Anchor } & (
  | { kind: "deal"; id: string }
  | { kind: "kpi"; key: KpiKey }
  | { kind: "month"; month: string }
  | { kind: "receipt"; id: string }
);

/** Same item, wherever it was clicked from. */
export const sameItem = (a: Selection | null, b: Selection) =>
  !!a && a.kind === b.kind && JSON.stringify({ ...a, from: 0 }) === JSON.stringify({ ...b, from: 0 });

interface Data { kpis: Overview; rows: DealRow[]; receipts: Receipt[] }
type Select = (s: Selection) => void;

export default function Insight({ sel, data, onSelect, onClose, inline }: { sel: Selection; data: Data; onSelect: Select; onClose: () => void; inline: boolean }) {
  const ref = useRef<HTMLElement>(null);
  // Phones: bring the drop-down into view. Side panel: move focus to it for keyboard users.
  useEffect(() => {
    if (inline) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    else ref.current?.focus({ preventScroll: true });
  }, [sel, inline]);

  const { title, body } = content(sel, data, (s) => onSelect({ ...s, from: sel.from }));
  return (
    <section ref={ref} className={`insight ${inline ? "inline" : "side"}`} aria-label={title} tabIndex={-1}>
      <header className="insight-head">
        <h2>{title}</h2>
        <button type="button" className="insight-close" aria-label="Close details" onClick={onClose}>✕</button>
      </header>
      {body}
    </section>
  );
}

function content(sel: Selection, { kpis, rows, receipts }: Data, select: Select): { title: string; body: React.ReactNode } {
  const company = (id: string | null) => (id ? rows.find((r) => r.p.id === id)?.p.company ?? "Unknown partner" : "Not a partner");
  const openDeal = (id: string) => select({ kind: "deal", id, from: sel.from });
  const active = rows.filter((r) => isActive(r));

  switch (sel.kind) {
    case "deal": {
      const row = rows.find((r) => r.p.id === sel.id);
      if (!row) return { title: "Partnership", body: <p className="empty">This partnership no longer exists.</p> };
      const { p, prog } = row;
      const mine = receipts.filter((r) => r.partnership_id === p.id);
      const deliverables = (p.deliverables ?? "").split("\n").map((d) => d.trim()).filter(Boolean);
      const live = prog.status !== "complete" && prog.days_left > 0;
      return {
        title: p.company,
        body: (
          <>
            <div className="insight-row"><StatusPill status={prog.status} /><span className="sub">{prog.days_left > 0 ? `${prog.days_left} days left, ends ${shortDate(p.end_date)}` : `Ended ${shortDate(p.end_date)}`}</span></div>
            <div className="stat-pair">
              <div><span className="stat-label">Progress</span><strong data-testid="insight-progress">{progressText(p, prog.progress)}</strong></div>
              <div><span className="stat-label">Pace</span><strong>{paceText(row)}</strong></div>
            </div>
            <PaceBar row={row} />
            {live && <p className="hint">Needs {amountText(p, prog.required_pace)} a day to hit the target.</p>}
            <PaceChart partnership={p} receipts={mine} />
            <h3 className="insight-sub">Deliverables</h3>
            {deliverables.length ? <ul className="deliverables">{deliverables.map((d) => <li key={d}>{d}</li>)}</ul> : <p className="sub">None listed</p>}
            <h3 className="insight-sub">Latest receipts</h3>
            <ReceiptList receipts={mine.slice(0, 5)} label={(r) => r.event || r.vendor} onSelect={(id) => select({ kind: "receipt", id, from: sel.from })} />
            <div className="insight-actions">
              <Link to={`/partnerships/${p.id}`} className="btn-secondary">Open full page</Link>
              <AddReceiptMenu partnershipId={p.id} />
            </div>
          </>
        ),
      };
    }

    case "kpi": {
      if (sel.key === "active") {
        const soon = active.filter((r) => r.prog.days_left <= 30).length;
        return {
          title: "Active deals",
          body: (
            <>
              <p className="sub">{active.length} running today. {soon} end{soon === 1 ? "s" : ""} in the next 30 days.</p>
              <DealList rows={[...active].sort((a, b) => a.prog.days_left - b.prog.days_left)} right={(r) => `${r.prog.days_left} days left`} onOpen={openDeal} />
            </>
          ),
        };
      }
      if (sel.key === "at_risk") {
        const risky = active.filter((r) => r.prog.status === "at_risk").sort((a, b) => paceFor(a).gap / a.p.target - paceFor(b).gap / b.p.target);
        return {
          title: "At risk",
          body: risky.length ? (
            <>
              <p className="sub">Behind where they should be today if spending were even across the deal.</p>
              <DealList rows={risky} right={(r) => paceText(r)} detail={(r) => `Needs ${amountText(r.p, r.prog.required_pace)} a day`} onOpen={openDeal} />
            </>
          ) : <p className="empty">Nothing is at risk right now.</p>,
        };
      }
      if (sel.key === "spend") {
        const spendDeals = active.filter((r) => r.p.commitment_type === "spend");
        return {
          title: "Spent this season",
          body: (
            <>
              <p className="big-number">{money(kpis.season_spend)}</p>
              <p className="sub">Spending on the {spendDeals.length} active dollar deals. Unit deals are counted in units, not here.</p>
              <DealList rows={spendDeals.sort((a, b) => b.prog.progress - a.prog.progress)} right={(r) => progressText(r.p, r.prog.progress)} onOpen={openDeal} />
            </>
          ),
        };
      }
      const since = addDays(todayISO(), -30);
      const recent = receipts.filter((r) => r.purchase_date >= since);
      const total = recent.reduce((s, r) => s + r.amount, 0);
      return {
        title: "Receipts, last 30 days",
        body: (
          <>
            <div className="stat-pair">
              <div><span className="stat-label">Total</span><strong>{money(total)}</strong></div>
              <div><span className="stat-label">Average</span><strong>{recent.length ? money(total / recent.length) : "-"}</strong></div>
            </div>
            <ReceiptList receipts={recent} label={(r) => company(r.partnership_id)} onSelect={(id) => select({ kind: "receipt", id, from: sel.from })} />
          </>
        ),
      };
    }

    case "month": {
      const inMonth = receipts.filter((r) => r.purchase_date.startsWith(sel.month));
      const total = inMonth.reduce((s, r) => s + r.amount, 0);
      return {
        title: monthLabel(sel.month, true),
        body: (
          <>
            <div className="stat-pair">
              <div><span className="stat-label">Spent</span><strong>{money(total)}</strong></div>
              <div><span className="stat-label">Receipts</span><strong>{inMonth.length}</strong></div>
            </div>
            {inMonth.length > 0 && <><h3 className="insight-sub">By partner</h3><SpendByPartner items={spendByPartner(rows, inMonth)} onSelect={openDeal} /></>}
            <h3 className="insight-sub">Receipts</h3>
            <ReceiptList receipts={inMonth} label={(r) => company(r.partnership_id)} onSelect={(id) => select({ kind: "receipt", id, from: sel.from })} />
          </>
        ),
      };
    }

    case "receipt": {
      const r = receipts.find((x) => x.id === sel.id);
      if (!r) return { title: "Receipt", body: <p className="empty">This receipt no longer exists.</p> };
      return {
        title: r.vendor,
        body: (
          <>
            <div className="stat-pair">
              <div><span className="stat-label">Total</span><strong>{money(r.amount, true)}</strong></div>
              <div><span className="stat-label">Date</span><strong>{shortDate(r.purchase_date)}</strong></div>
            </div>
            <dl className="facts">
              <dt>Partner</dt>
              <dd>{r.partnership_id ? <button type="button" className="link-btn" onClick={() => openDeal(r.partnership_id!)}>{company(r.partnership_id)}</button> : "Not a partner"}</dd>
              {r.units != null && <><dt>Units</dt><dd>{r.units}</dd></>}
              {r.event && <><dt>Trip / event</dt><dd>{r.event}</dd></>}
              {r.image_path && <><dt>Photo</dt><dd><PhotoLink receiptId={r.id} /></dd></>}
            </dl>
            {r.line_items.length > 0 && (
              <>
                <h3 className="insight-sub">Line items</h3>
                <ul className="mini-list">{r.line_items.map((li, i) => <li key={i}><span>{li.description}</span><span>{li.amount != null ? money(li.amount, true) : ""}</span></li>)}</ul>
              </>
            )}
          </>
        ),
      };
    }
  }
}

function DealList({ rows, right, detail, onOpen }: { rows: DealRow[]; right: (r: DealRow) => string; detail?: (r: DealRow) => string; onOpen: (id: string) => void }) {
  if (!rows.length) return <p className="empty">None.</p>;
  return (
    <ul className="mini-list deals">
      {rows.map((r) => (
        <li key={r.p.id}>
          <button type="button" onClick={() => onOpen(r.p.id)}>
            <span className="mini-top"><span className="strong">{r.p.company}</span><span>{right(r)}</span></span>
            <ProgressBar pct={r.prog.progress_pct} wide />
            {detail && <span className="sub">{detail(r)}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}

function ReceiptList({ receipts, label, onSelect }: { receipts: Receipt[]; label: (r: Receipt) => string; onSelect: (id: string) => void }) {
  if (!receipts.length) return <p className="sub">None yet.</p>;
  return (
    <ul className="mini-list">
      {receipts.map((r) => (
        <li key={r.id}>
          <button type="button" onClick={() => onSelect(r.id)}>
            <span className="sub">{shortDate(r.purchase_date)}</span>
            <span className="mini-name">{label(r)}</span>
            <span className="strong">{money(r.amount)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
