import { useCallback, useEffect, useState } from "react";

/** Load data from the API on mount (and when deps change). Gives back data, error and reload. */
export function useApi<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchIt = useCallback(load, deps);

  const reload = useCallback(() => {
    setError(null);
    fetchIt()
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [fetchIt]);

  useEffect(reload, [reload]);
  return { data, error, reload };
}
