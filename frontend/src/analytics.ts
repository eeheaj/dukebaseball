// Numbers behind the Overview charts. Pure functions over what the API already returns
// (partnerships, their progress, receipts), so no backend changes are needed.
import type { Partnership, Receipt } from "./api";
import type { DealRow } from "./deals";
import { daysBetween, money, todayISO } from "./format";

const sum = (rs: Receipt[]) => rs.reduce((s, r) => s + r.amount, 0);

/** "2026-10" -> "Oct", or "October 2026" with long = true */
export const monthLabel = (month: string, long = false) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", long ? { month: "long", year: "numeric", timeZone: "UTC" } : { month: "short", timeZone: "UTC" });

export interface MonthTotal { month: string; total: number; count: number }

/** Receipt totals for the last `n` calendar months, oldest first. Empty months are kept so gaps show. */
export function spendByMonth(receipts: Receipt[], n = 6, today = todayISO()): MonthTotal[] {
  const [y, m] = today.split("-").map(Number);
  return Array.from({ length: n }, (_, i) => {
    const month = new Date(Date.UTC(y, m - 1 - (n - 1 - i), 1)).toISOString().slice(0, 7);
    const rs = receipts.filter((r) => r.purchase_date.startsWith(month));
    return { month, total: sum(rs), count: rs.length };
  });
}

export interface PartnerSpend { id: string | null; name: string; total: number; count: number }

/** Dollars on receipts per partner, biggest first. Receipts not tied to a deal are grouped last. */
export function spendByPartner(rows: DealRow[], receipts: Receipt[]): PartnerSpend[] {
  const partners = rows
    .map(({ p }) => {
      const rs = receipts.filter((r) => r.partnership_id === p.id);
      return { id: p.id, name: p.company, total: sum(rs), count: rs.length };
    })
    .filter((x) => x.count > 0)
    .sort((a, b) => b.total - a.total);
  const other = receipts.filter((r) => !r.partnership_id);
  return other.length ? [...partners, { id: null, name: "Not a partner", total: sum(other), count: other.length }] : partners;
}

export interface Pace { expected: number; expectedPct: number; gap: number }

/** Where the deal should be today if progress were even across its dates (the backend's at-risk rule). */
export function paceFor({ p, prog }: DealRow, today = todayISO()): Pace {
  const total = Math.max(daysBetween(p.start_date, p.end_date), 1);
  const elapsed = Math.min(Math.max(daysBetween(p.start_date, today), 0), total);
  const expected = (p.target * elapsed) / total;
  return { expected, expectedPct: (elapsed / total) * 100, gap: prog.progress - expected };
}

export const isActive = ({ p }: DealRow, today = todayISO()) => p.start_date <= today && today <= p.end_date;

/** "$1,200" or "33 units" in the deal's own measure. */
export const amountText = (p: Partnership, v: number) =>
  p.commitment_type === "units" ? `${Math.round(v)} units` : money(v);

/** "Behind by 33 units", "Ahead by $1,200", or "On pace". */
export function paceText(row: DealRow) {
  if (row.prog.status === "complete") return "Target hit";
  const { gap } = paceFor(row);
  const size = Math.abs(gap);
  if (size < 1) return "On pace";
  return `${gap < 0 ? "Behind" : "Ahead"} by ${amountText(row.p, size)}`;
}
