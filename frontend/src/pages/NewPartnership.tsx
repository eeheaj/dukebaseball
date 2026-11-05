import { useState } from "react";
import { useNavigate } from "react-router";
import { createPartnership } from "../api";

export default function NewPartnership() {
  const navigate = useNavigate();
  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");
  const [type, setType] = useState<"spend" | "units">("spend");
  const [target, setTarget] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [discount, setDiscount] = useState("");
  const [deliverables, setDeliverables] = useState<string[]>([""]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const targetNum = Number(target.replace(/[$,\s]/g, ""));
    const discountNum = discount.trim() === "" ? null : Number(discount);
    if (!company.trim()) return setError("Add the company name.");
    if (!(targetNum > 0)) return setError("Add a target greater than 0.");
    if (!start || !end) return setError("Add a start and end date.");
    if (end < start) return setError("The end date can't be before the start date.");
    if (discountNum !== null && !(discountNum >= 0 && discountNum <= 100)) return setError("Discount must be between 0 and 100%.");

    setError(null);
    setSaving(true);
    try {
      const created = await createPartnership({
        company: company.trim(),
        contact_name: contact.trim() || null,
        contact_email: null,
        commitment_type: type,
        target: targetNum,
        start_date: start,
        end_date: end,
        discount_pct: discountNum,
        deliverables: deliverables.map((d) => d.trim()).filter(Boolean).join("\n") || null,
        tags: [],
      });
      navigate(`/partnerships/${created.id}`);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <form className="narrow" onSubmit={onSubmit} noValidate>
      <h1>New Partnership</h1>
      <div className="panel form-grid">
        <label>Company name<input value={company} onChange={(e) => setCompany(e.target.value)} /></label>
        <label>Contact person<input value={contact} onChange={(e) => setContact(e.target.value)} /></label>

        <div className="span-2">
          <span className="field-label">Commitment</span>
          <div className="segmented">
            {(["spend", "units"] as const).map((t) => (
              <button key={t} type="button" aria-pressed={type === t} className={type === t ? "on" : ""} onClick={() => setType(t)}>
                {t === "spend" ? "Spend $" : "Buy units"}
              </button>
            ))}
          </div>
        </div>

        <label>{type === "spend" ? "Target ($)" : "Target (units)"}<input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} /></label>
        <label>Discount the team gets (%)<input inputMode="decimal" placeholder="Optional" value={discount} onChange={(e) => setDiscount(e.target.value)} /></label>
        <label>Start date<input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label>
        <label>End date<input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></label>

        <div className="span-2">
          <span className="field-label">Deliverables (optional)</span>
          {deliverables.map((d, i) => (
            <div key={i} className="inline-row">
              <input aria-label={`Deliverable ${i + 1}`} placeholder="e.g. Logo on BP jerseys" value={d}
                onChange={(e) => setDeliverables((ds) => ds.map((x, j) => (j === i ? e.target.value : x)))} />
              {deliverables.length > 1 && (
                <button type="button" className="link" onClick={() => setDeliverables((ds) => ds.filter((_, j) => j !== i))}>Remove</button>
              )}
            </div>
          ))}
          <button type="button" className="link" onClick={() => setDeliverables((ds) => [...ds, ""])}>+ Add deliverable</button>
        </div>
      </div>

      {error && <p className="banner error" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="button" className="secondary" onClick={() => navigate(-1)}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Creating…" : "Create"}</button>
      </div>
    </form>
  );
}
