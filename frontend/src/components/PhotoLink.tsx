import { useState } from "react";
import { openReceiptPhoto } from "../api";

/** "View" for a receipt's stored photo. Fetches a short-lived link (with sign-in) and opens it in a new tab. */
export default function PhotoLink({ receiptId }: { receiptId: string }) {
  const [error, setError] = useState(false);
  return (
    <button
      type="button"
      className="link-btn"
      title={error ? "Couldn't open the photo. Try again." : "Open the receipt photo"}
      onClick={(e) => {
        e.stopPropagation();
        setError(false);
        openReceiptPhoto(receiptId).catch(() => setError(true));
      }}
    >
      {error ? "Retry" : "View"}
    </button>
  );
}
