import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useIsMobile } from "../useIsMobile";

/**
 * "+ Add Receipts" with the two paths from the wireframe.
 * Upload photo (desktop) / Take photo (phone, opens the camera): the capture page scans it right away.
 * Enter manually: the capture page opens straight on the form.
 * partnershipId (from a deal's page) pre-picks that deal when OCR doesn't suggest one.
 */
export default function AddReceiptMenu({ partnershipId }: { partnershipId?: string } = {}) {
  const [open, setOpen] = useState(false);
  const mobile = useIsMobile();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => wrapRef.current?.contains(e.target as Node) || setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div className="menu-wrap" ref={wrapRef}>
      <button className="btn-primary add-receipts" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span aria-hidden>+</span> Add Receipts
      </button>
      {open && (
        <div className="menu" role="menu">
          <button role="menuitem" onClick={() => { setOpen(false); fileRef.current?.click(); }}>
            <strong>{mobile ? "Take photo" : "Upload photo"}</strong>
            <span>{mobile ? "Opens the camera, auto-fills the details" : "Auto-fills the details"}</span>
          </button>
          <button role="menuitem" onClick={() => { setOpen(false); navigate(`/receipts/new?manual=1${partnershipId ? `&partnership=${encodeURIComponent(partnershipId)}` : ""}`); }}>
            <strong>Enter manually</strong>
            <span>Type it in</span>
          </button>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture={mobile ? "environment" : undefined}
        hidden
        data-testid="add-receipt-file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          // A File survives in history state, so the capture page can scan it on arrival.
          if (file) navigate("/receipts/new", { state: { file, partnershipId } });
        }}
      />
    </div>
  );
}
