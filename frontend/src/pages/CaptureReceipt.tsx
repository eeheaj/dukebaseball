import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import {
  createReceipt,
  getPartnerships,
  listReceipts,
  scanReceipt,
  validateReceipt,
  type LineItem,
  type OcrResult,
  type Partnership,
  type Receipt,
  type ReceiptCreate,
} from "../api";
import RecentReceipts from "../components/RecentReceipts";
import SetupBanner from "../components/SetupBanner";
import Stepper from "../components/Stepper";
import { useIsMobile } from "../useIsMobile";

type Step = "photo" | "scanning" | "review" | "saving" | "saved";

const today = () => new Date().toISOString().slice(0, 10);
// Dropdown value for receipts that don't count toward any partnership ("" = nothing chosen yet).
const NON_PARTNER = "none";
const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function CaptureReceipt() {
  const mobile = useIsMobile();
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [recent, setRecent] = useState<Receipt[]>([]);
  const [step, setStep] = useState<Step>("photo");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [ocr, setOcr] = useState<OcrResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flags, setFlags] = useState<string[]>([]);

  // Form fields, all editable after OCR
  const [partnershipId, setPartnershipId] = useState("");
  const [vendor, setVendor] = useState("");
  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState("");
  const [units, setUnits] = useState("");
  const [event, setEvent] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);

  // Arriving from a partnership page's "Add Receipts": that deal is the fallback pick.
  const location = useLocation();
  const [params] = useSearchParams();
  const arrival = location.state as { file?: File; partnershipId?: string } | null;
  const presetPartnership = useRef(arrival?.partnershipId ?? params.get("partnership") ?? "");

  const loadData = useCallback(() => {
    getPartnerships().then(setPartnerships).catch(() => {});
    listReceipts().then(setRecent).catch(() => {});
  }, []);

  useEffect(loadData, [loadData]);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const selected = partnerships.find((p) => p.id === partnershipId);
  const stepIndex = step === "saved" ? 2 : step === "review" || step === "saving" ? 1 : 0;

  function pickFile(f: File | null) {
    setFile(f);
    setOcr(null);
    setFlags([]);
    setError(null);
    setStep("photo");
  }

  async function onScan(photo: File | null = file) {
    if (!photo) return;
    setError(null);
    setStep("scanning");
    try {
      const r = await scanReceipt(photo);
      setOcr(r);
      setVendor(r.vendor ?? "");
      setDate(r.purchase_date ?? today());
      setAmount(r.total != null ? r.total.toFixed(2) : "");
      setItems(r.line_items);
      setPartnershipId(r.suggested_partnership_id ?? presetPartnership.current);
      setStep("review");
    } catch (e) {
      setError((e as Error).message);
      setStep("photo");
    }
  }

  function enterManually() {
    setOcr(null);
    setPartnershipId((cur) => cur || presetPartnership.current);
    setStep("review");
  }

  // Arriving from the "Add Receipts" menu: scan the photo picked there, or open the form for manual entry.
  const arrived = useRef(false);
  useEffect(() => {
    if (arrived.current) return;
    arrived.current = true;
    const handedOver = arrival?.file;
    if (handedOver) {
      setFile(handedOver);
      void onScan(handedOver);
    } else if (params.get("manual")) {
      enterManually();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function buildReceipt(): ReceiptCreate | null {
    if (!partnershipId) return setError('Pick a partnership, or "Not a partner purchase".'), null;
    if (!vendor.trim()) return setError("Vendor is required."), null;
    const amt = Number(amount);
    if (!amount || Number.isNaN(amt)) return setError("Enter the total amount."), null;
    return {
      partnership_id: partnershipId === NON_PARTNER ? null : partnershipId,
      vendor: vendor.trim(),
      purchase_date: date,
      amount: amt,
      units: units ? Number(units) : null,
      event: event.trim() || null,
      line_items: items.filter((i) => i.description.trim()),
      image_path: ocr?.image_path ?? null,
    };
  }

  async function onSave() {
    setError(null);
    const receipt = buildReceipt();
    if (!receipt) return;
    const force = flags.length > 0; // second click after seeing warnings
    setStep("saving");
    try {
      if (!force) {
        const found = await validateReceipt(receipt, ocr);
        if (found.length) {
          setFlags(found);
          setStep("review");
          return;
        }
      }
      await createReceipt(receipt);
      setStep("saved");
      loadData();
    } catch (e) {
      setError((e as Error).message);
      setStep("review");
    }
  }

  function reset() {
    pickFile(null);
    setPartnershipId("");
    setVendor("");
    setDate(today());
    setAmount("");
    setUnits("");
    setEvent("");
    setItems([]);
  }

  const updateItem = (i: number, patch: Partial<LineItem>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  // Which fields OCR found, shown as chips at the top of the review step
  const found = ocr && [
    { label: "Vendor", ok: !!ocr.vendor },
    { label: "Date", ok: !!ocr.purchase_date },
    { label: "Total", ok: ocr.total != null },
    { label: `${ocr.line_items.length} items`, ok: ocr.line_items.length > 0 },
    { label: "Partner match", ok: !!ocr.suggested_partnership_id },
  ];
  const missing = (ok: boolean) => (ocr && !ok ? "missing" : "");

  return (
    <>
      <SetupBanner onReady={loadData} />
      <Stepper current={stepIndex as 0 | 1 | 2} />
      {error && <p className="banner error">{error}</p>}

      {/* Step 1: photo */}
      {(step === "photo" || step === "scanning") && (
        <section className="card">
          <label className={`photo ${preview ? "has-image" : ""}`}>
            {preview ? (
              <img src={preview} alt="Receipt preview" />
            ) : (
              <span className="photo-empty">
                <span className="photo-icon">📷</span>
                {mobile ? "Tap to take a photo of the receipt" : "Choose a photo of the receipt"}
                <span className="muted small">Lay it flat, fill the frame, good light</span>
              </span>
            )}
            {step === "scanning" && (
              <span className="overlay">
                <span className="spinner" /> Reading receipt…
              </span>
            )}
            <input
              type="file"
              accept="image/*"
              capture={mobile ? "environment" : undefined}
              data-testid="capture-file"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
          </label>

          {file ? (
            <div className="actions">
              <button className="primary" onClick={() => onScan()} disabled={step === "scanning"}>
                {step === "scanning" ? "Scanning…" : "Scan receipt"}
              </button>
              <button className="secondary" onClick={() => pickFile(null)} disabled={step === "scanning"}>
                Retake
              </button>
            </div>
          ) : (
            <button className="link" onClick={enterManually}>
              No photo? Enter it manually
            </button>
          )}
        </section>
      )}

      {/* Step 2: review */}
      {(step === "review" || step === "saving") && (
        <section className="card form">
          <div className="review-head">
            {preview && (
              <a href={preview} target="_blank" rel="noreferrer" className="thumb" title="Open full photo">
                <img src={preview} alt="Receipt" />
              </a>
            )}
            <div>
              <h2>{ocr ? "Check what we read" : "Enter receipt"}</h2>
              {found && (
                <div className="chips">
                  {found.map((f) => (
                    <span key={f.label} className={`chip ${f.ok ? "ok" : "no"}`}>
                      {f.ok ? "✓" : "?"} {f.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <label>
            Partnership *
            <select
              className={!partnershipId && ocr ? "missing" : ""}
              value={partnershipId}
              onChange={(e) => setPartnershipId(e.target.value)}
            >
              <option value="">{partnerships.length ? "Select…" : "No partnerships yet: run the seed SQL"}</option>
              {partnerships.length > 0 && (
                <optgroup label="Partnerships">
                  {partnerships.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.company}
                      {p.id === ocr?.suggested_partnership_id ? "  ★ suggested" : ""}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Other">
                <option value={NON_PARTNER}>Not a partner purchase</option>
              </optgroup>
            </select>
            {ocr && !ocr.suggested_partnership_id && !partnershipId && (
              <span className="hint">
                No partner matched “{ocr.vendor ?? "this vendor"}”. Pick one, or choose “Not a partner purchase”.
              </span>
            )}
            {partnershipId === NON_PARTNER && (
              <span className="hint">Logged and exported, but won’t count toward any partnership.</span>
            )}
          </label>
          <label>
            Vendor *
            <input className={missing(!!ocr?.vendor)} value={vendor} onChange={(e) => setVendor(e.target.value)} />
          </label>
          <div className="row">
            <label>
              Date *
              <input
                type="date"
                className={missing(!!ocr?.purchase_date)}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label>
              Total $ *
              <input
                inputMode="decimal"
                className={missing(ocr?.total != null)}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
          </div>
          <div className="row">
            {selected?.commitment_type === "units" && (
              <label>
                Units
                <input inputMode="decimal" value={units} onChange={(e) => setUnits(e.target.value)} />
              </label>
            )}
            <label>
              Trip / event
              <input value={event} onChange={(e) => setEvent(e.target.value)} placeholder="optional" />
            </label>
          </div>

          <fieldset>
            <legend>Line items</legend>
            {items.length === 0 && <p className="muted small">None found. Add them if you need them.</p>}
            {items.map((it, i) => (
              <div className="item" key={i}>
                <input value={it.description} onChange={(e) => updateItem(i, { description: e.target.value })} placeholder="Item" />
                <input
                  inputMode="decimal"
                  value={it.amount ?? ""}
                  onChange={(e) => updateItem(i, { amount: e.target.value === "" ? null : Number(e.target.value) })}
                  placeholder="$"
                />
                <button className="icon" onClick={() => setItems(items.filter((_, idx) => idx !== i))} aria-label="Remove item">
                  ✕
                </button>
              </div>
            ))}
            <button className="link" onClick={() => setItems([...items, { description: "", amount: null }])}>
              + Add item
            </button>
          </fieldset>

          {flags.length > 0 && (
            <div className="banner warn">
              <strong>Please double-check:</strong>
              <ul>{flags.map((f) => <li key={f}>{f}</li>)}</ul>
            </div>
          )}

          <div className="actions">
            <button className="primary" onClick={onSave} disabled={step === "saving"}>
              {step === "saving" ? "Saving…" : flags.length ? "Save anyway" : "Save receipt"}
            </button>
            <button className="secondary" onClick={() => setStep("photo")} disabled={step === "saving"}>
              Back
            </button>
          </div>

          {ocr?.raw_text && (
            <details>
              <summary>Raw OCR text</summary>
              <pre>{ocr.raw_text}</pre>
            </details>
          )}
        </section>
      )}

      {/* Step 3: saved */}
      {step === "saved" && (
        <section className="card center">
          <p className="success">✓ Receipt saved</p>
          <p className="summary">
            <strong>{vendor}</strong>
            <br />
            {money(Number(amount))} on {date}
            <br />
            <span className="muted">
              {selected ? `counted toward ${selected.company}` : "not a partner purchase: not counted toward any partnership"}
            </span>
          </p>
          <button className="primary wide" onClick={reset}>
            Scan another receipt
          </button>
          {selected && <Link to={`/partnerships/${selected.id}`}>See {selected.company} progress</Link>}
        </section>
      )}

      <RecentReceipts receipts={recent} partnerships={partnerships} />
    </>
  );
}
