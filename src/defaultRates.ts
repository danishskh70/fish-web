// Default selling rates, kept on THIS device only (frontend-only for now).
// They are write-only in the UI: never shown back, only sent to the server when a trip is created.
// Moving them to the server later is the safer design; this module is the only place to change.
export const RATE_RE = /^(?!0+(\.0{1,2})?$)\d+(\.\d{1,2})?$/; // positive, up to 2 decimals

const KEY = "fs_default_rates_v1";
type Store = { rates: Record<string, string>; at: Record<string, string> };

function read(): Store {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (s && typeof s.rates === "object" && typeof s.at === "object") return s as Store;
  } catch { /* ignore */ }
  return { rates: {}, at: {} };
}
function write(s: Store): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch { return false; }
}

export function saveDefaultRates(entries: Record<number, string>) {
  const s = read();
  const invalid: number[] = [];
  let saved = 0;
  for (const [id, raw] of Object.entries(entries)) {
    const v = raw.trim();
    if (!v) continue;
    if (!RATE_RE.test(v)) { invalid.push(Number(id)); continue; }
    s.rates[id] = v;
    s.at[id] = new Date().toISOString();
    saved++;
  }
  const ok = saved === 0 ? true : write(s);
  return { saved, invalid, ok };
}

export function clearDefaultRates() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

export function defaultRateInfo(fishId: number): { set: boolean; at?: string } {
  const s = read();
  return s.rates[String(fishId)] ? { set: true, at: s.at[String(fishId)] } : { set: false };
}

export const hasAnyDefaultRates = () => Object.keys(read().rates).length > 0;

// Payload for PUT /trips/{id}/rates. Only fish that have a saved default.
export function ratesForTrip(fishIds: number[]): { fish_type_id: number; rate_per_bag: string }[] {
  const s = read();
  return fishIds.filter((id) => s.rates[String(id)]).map((id) => ({ fish_type_id: id, rate_per_bag: s.rates[String(id)] }));
}
