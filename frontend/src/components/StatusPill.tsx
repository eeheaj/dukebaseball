import type { PartnershipStatus } from "../api";

const LABEL: Record<PartnershipStatus, string> = { on_track: "On Track", at_risk: "At Risk", complete: "Complete" };

export default function StatusPill({ status }: { status: PartnershipStatus }) {
  return <span className={`pill pill-${status}`}>{LABEL[status]}</span>;
}
