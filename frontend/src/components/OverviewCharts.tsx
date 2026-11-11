// The three Overview charts. Plain HTML bars: every bar is a button (click or keyboard
// opens its detail), and they resize with the page without measuring anything.
import { monthLabel, paceFor, paceText, type MonthTotal, type PartnerSpend } from "../analytics";
import type { DealRow } from "../deals";
import { money } from "../format";

/** Receipts per month. The value shows on the biggest month, and on the hovered or selected one. */
export function SpendByMonth({ months, selected, onSelect }: { months: MonthTotal[]; selected?: string; onSelect: (month: string) => void }) {
  const max = Math.max(...months.map((m) => m.total), 1);
  const peak = months.reduce((a, b) => (b.total > a.total ? b : a)).month;
  return (
    <div className="vbars">
      {months.map((m) => (
        <button
          key={m.month}
          type="button"
          className={`vbar${m.month === selected ? " on" : ""}${m.month === peak && m.total > 0 ? " peak" : ""}`}
          aria-pressed={m.month === selected}
          aria-label={`${monthLabel(m.month, true)}: ${money(m.total)} across ${m.count} receipt${m.count === 1 ? "" : "s"}`}
          onClick={() => onSelect(m.month)}
        >
          <span className="vbar-track">
            <span className="vbar-value">{money(m.total)}</span>
            <span className="vbar-fill" style={{ height: `${(m.total / max) * 100}%` }} />
          </span>
          <span className="vbar-label">{monthLabel(m.month)}</span>
        </button>
      ))}
    </div>
  );
}

/** Dollars per partner as horizontal bars, biggest first. */
export function SpendByPartner({ items, selected, onSelect }: { items: PartnerSpend[]; selected?: string; onSelect: (id: string) => void }) {
  const max = Math.max(...items.map((i) => i.total), 1);
  if (!items.length) return <p className="empty">No receipts yet.</p>;
  return (
    <div className="hbars">
      {items.map((i) => {
        const inner = (
          <>
            <span className="hbar-name">{i.name}</span>
            <span className="hbar-value">{money(i.total)}</span>
            <span className="hbar-track"><span className="hbar-fill" style={{ width: `${(i.total / max) * 100}%` }} /></span>
          </>
        );
        return i.id ? (
          <button key={i.id} type="button" className={`hbar${i.id === selected ? " on" : ""}`} aria-pressed={i.id === selected} onClick={() => onSelect(i.id!)}>
            {inner}
          </button>
        ) : (
          <div key="other" className="hbar hbar-other">{inner}</div>
        );
      })}
    </div>
  );
}

/** One deal's progress bar with a tick where it should be today. */
export function PaceBar({ row }: { row: DealRow }) {
  const { expectedPct } = paceFor(row);
  return (
    <span className="pace-track" aria-hidden="true">
      <span className="pace-fill" style={{ width: `${Math.min(row.prog.progress_pct, 100)}%` }} />
      {row.prog.status !== "complete" && <span className="pace-mark" style={{ left: `${expectedPct}%` }} />}
    </span>
  );
}

/** Each active deal against where it should be today, furthest behind first. */
export function PaceCheck({ rows, selected, onSelect }: { rows: DealRow[]; selected?: string; onSelect: (id: string) => void }) {
  const sorted = [...rows].sort((a, b) => paceFor(a).gap / a.p.target - paceFor(b).gap / b.p.target);
  if (!sorted.length) return <p className="empty">No active deals.</p>;
  return (
    <>
      <div className="pace-rows">
        {sorted.map((r) => {
          const text = paceText(r);
          const tone = text.startsWith("Behind") ? "behind" : "ahead";
          return (
            <button key={r.p.id} type="button" className={`pace-row${r.p.id === selected ? " on" : ""}`} aria-pressed={r.p.id === selected} onClick={() => onSelect(r.p.id)}>
              <span className="pace-name">{r.p.company}</span>
              <span className={`pace-text ${tone}`}>{tone === "behind" ? "▼" : "▲"} {text}</span>
              <PaceBar row={r} />
            </button>
          );
        })}
      </div>
      <p className="chart-key"><span className="key key-actual" />Progress <span className="key key-mark" />Where it should be today</p>
    </>
  );
}
