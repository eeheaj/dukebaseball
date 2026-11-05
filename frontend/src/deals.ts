import { getPartnerships, getProgress, type Partnership, type PartnershipProgress, type PartnershipStatus } from "./api";

export interface DealRow {
  p: Partnership;
  prog: PartnershipProgress;
}

/** Every partnership with its backend-computed progress. */
export async function loadDealRows(): Promise<DealRow[]> {
  const partnerships = await getPartnerships();
  const progress = await Promise.all(partnerships.map((p) => getProgress(p.id)));
  return partnerships.map((p, i) => ({ p, prog: progress[i] }));
}

const ORDER: Record<PartnershipStatus, number> = { at_risk: 0, on_track: 1, complete: 2 };

/** Most urgent first: at risk, then on track, then complete; ties by fewest days left. */
export const byUrgency = (a: DealRow, b: DealRow) =>
  ORDER[a.prog.status] - ORDER[b.prog.status] || a.prog.days_left - b.prog.days_left;

export const timeLeft = (r: DealRow) =>
  r.prog.days_left === 0 ? "Ended" : r.prog.days_left === 1 ? "1 day" : `${r.prog.days_left} days`;
