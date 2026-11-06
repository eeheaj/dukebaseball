import { useEffect, useRef, useState } from "react";
import { getStatus, type SetupStatus } from "../api";

/** Shows what's missing (Tesseract, keys, tables) so the flow never fails silently. */
/** onRecover fires when setup goes from broken to ready (e.g. after Retry), so pages can reload. */
export default function SetupBanner({ onReady, onRecover }: { onReady?: () => void; onRecover?: () => void }) {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [backendDown, setBackendDown] = useState(false);

  const wasBroken = useRef(false);

  const check = () =>
    getStatus()
      .then((s) => {
        setStatus(s);
        setBackendDown(false);
        if (s.ready) {
          onReady?.();
          if (wasBroken.current) onRecover?.();
        }
        wasBroken.current = !s.ready;
      })
      .catch(() => {
        setBackendDown(true);
        wasBroken.current = true;
      });

  useEffect(() => {
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (backendDown) {
    return (
      <div className="banner error">
        <strong>Backend not reachable.</strong> In <code>backend/</code> run{" "}
        <code>uv run uvicorn app.main:app --reload --host 0.0.0.0</code>
        <button className="link" onClick={check}>Retry</button>
      </div>
    );
  }
  if (!status || status.ready) return null;

  const problems: string[] = [];
  if (!status.tesseract) problems.push("Tesseract not found: install it or set TESSERACT_CMD in .env.");
  if (!status.supabase_url) problems.push("SUPABASE_URL is missing in .env.");
  if (status.supabase_key === "none")
    problems.push("No Supabase key: set SUPABASE_SERVICE_ROLE_KEY (secret) in .env, then restart the backend.");
  else if (status.database !== "ok") problems.push(`Database: ${status.database}`);
  if (!status.dev_no_auth) problems.push("Sign-in is off for the prototype: set DEV_NO_AUTH=true in .env (or on Render).");

  return (
    <div className="banner warn">
      <strong>Setup needed</strong>
      <ul>{problems.map((p) => <li key={p}>{p}</li>)}</ul>
      <button className="link" onClick={check}>Re-check</button>
    </div>
  );
}
