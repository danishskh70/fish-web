import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getVersion, subscribe } from "./stub";

// Runs a loader, re-runs whenever any stub write happens (so every screen stays in sync),
// and keeps the last good data on screen while reloading (no flicker).
export function useApi<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const version = useSyncExternalStore(subscribe, getVersion);
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const seq = useRef(0);
  useEffect(() => {
    const my = ++seq.current;
    setError("");
    load().then(
      (d) => { if (my === seq.current) { setData(d); setLoading(false); } },
      (e: unknown) => { if (my === seq.current) { setError(e instanceof Error ? e.message : "Something went wrong"); setLoading(false); } }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, tick, ...deps]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload };
}
