export default function ProgressBar({ pct, wide = false }: { pct: number; wide?: boolean }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className={`bar ${wide ? "bar-wide" : ""}`} role="progressbar" aria-valuenow={Math.round(clamped)} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${clamped}%` }} />
    </div>
  );
}
