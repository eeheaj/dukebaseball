import { useEffect, useRef, useState } from "react";
import type { Partnership, Receipt } from "../api";
import { addDays, daysBetween, money, shortDate, todayISO } from "../format";

/**
 * "Actual vs. pace needed": cumulative progress (solid) against a straight line
 * from 0 at the start date to the target at the end date (dashed). Plain SVG, drawn at the
 * container's real pixel width so labels stay readable on phones instead of shrinking.
 */
export default function PaceChart({ partnership: p, receipts }: { partnership: Partnership; receipts: Receipt[] }) {
  const ref = useRef<HTMLElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = 200, PAD = { l: 52, r: 12, t: 10, b: 24 };
  const span = Math.max(daysBetween(p.start_date, p.end_date), 1);
  const today = todayISO();
  const lastDay = Math.min(span, Math.max(0, daysBetween(p.start_date, today)));
  const value = (r: Receipt) => (p.commitment_type === "units" ? r.units ?? 0 : r.amount);

  // Cumulative total at each receipt date (inside the deal window), as a step line.
  const inWindow = receipts
    .filter((r) => r.purchase_date >= p.start_date && r.purchase_date <= p.end_date)
    .sort((a, b) => a.purchase_date.localeCompare(b.purchase_date));
  const steps: [number, number][] = [[0, 0]];
  let total = 0;
  for (const r of inWindow) {
    const day = daysBetween(p.start_date, r.purchase_date);
    if (day > lastDay) break;
    steps.push([day, total]);
    total += value(r);
    steps.push([day, total]);
  }
  steps.push([lastDay, total]);

  const yMax = Math.max(p.target, total) * 1.05;
  const x = (day: number) => PAD.l + (day / span) * (W - PAD.l - PAD.r);
  const y = (v: number) => H - PAD.b - (v / yMax) * (H - PAD.t - PAD.b);
  const fmt = (v: number) => (p.commitment_type === "spend" ? (v >= 1000 ? `$${Math.round(v / 1000)}k` : money(v)) : String(Math.round(v)));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * p.target);
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * span));

  return (
    <figure className="chart" ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Actual progress compared with the pace needed to hit the target">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="grid" />
            <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end">{fmt(t)}</text>
          </g>
        ))}
        {xTicks.map((d, i) => (
          // First and last labels hug the edges so they aren't cut off.
          <text key={d} x={x(d)} y={H - 6} textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}>{shortDate(addDays(p.start_date, d))}</text>
        ))}
        <line x1={x(0)} y1={y(0)} x2={x(span)} y2={y(p.target)} className="pace" />
        <polyline points={steps.map(([d, v]) => `${x(d)},${y(v)}`).join(" ")} className="actual" />
      </svg>
      <figcaption>
        <span className="key key-actual" />Actual
        <span className="key key-pace" />Pace needed
      </figcaption>
    </figure>
  );
}
