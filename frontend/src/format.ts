import type { Partnership } from "./api";

export const money = (n: number, cents = false) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });

/** "$6,200 of $10,000" or "40 of 200 units" */
export const progressText = (p: Partnership, progress: number) =>
  p.commitment_type === "spend" ? `${money(progress)} of ${money(p.target)}` : `${progress} of ${p.target} units`;

const parse = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
};

/** "2026-10-14" -> "Oct 14" */
export const shortDate = (d: string) =>
  parse(d).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** "2026-11-20" -> "11/20" */
export const monthDay = (d: string) => {
  const [, m, day] = d.split("-").map(Number);
  return `${m}/${day}`;
};

export const daysBetween = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / 86_400_000);

export const addDays = (d: string, n: number) => new Date(parse(d).getTime() + n * 86_400_000).toISOString().slice(0, 10);

/** Today as YYYY-MM-DD in the browser's time zone. */
export const todayISO = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
};

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
