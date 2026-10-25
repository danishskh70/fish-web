// Idempotency UUID for one handover form, kept in sessionStorage.
// Reused only when the payload is identical (safe retry after a network drop).
// A changed payload gets a new UUID, so the server never sees one reference with two bodies.
const key = (tcId: number) => `fs_handover_ref_${tcId}`;

export function getHandoverRef(tcId: number, sig: string): string {
  try {
    const s = JSON.parse(sessionStorage.getItem(key(tcId)) ?? "null");
    if (s?.ref && s.sig === sig) return s.ref as string;
  } catch { /* ignore */ }
  const ref = crypto.randomUUID();
  try { sessionStorage.setItem(key(tcId), JSON.stringify({ ref, sig })); } catch { /* storage blocked */ }
  return ref;
}

export function clearHandoverRef(tcId: number): void {
  try { sessionStorage.removeItem(key(tcId)); } catch { /* ignore */ }
}
