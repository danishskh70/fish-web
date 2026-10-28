// Idempotency UUID for one payment form, kept in sessionStorage.
// Same payload on retry -> same reference, so the server cannot record it twice.
// Changed payload -> new reference, so one reference never carries two bodies.
// scope keeps the handover sheet and the payments page from overwriting each other.
const key = (tcId: number, scope: string) => `fs_payment_ref_${scope}_${tcId}`;

export function getPaymentRef(tcId: number, sig: string, scope = "handover"): string {
  try {
    const s = JSON.parse(sessionStorage.getItem(key(tcId, scope)) ?? "null");
    if (s?.ref && s.sig === sig) return s.ref as string;
  } catch { /* ignore */ }
  const ref = crypto.randomUUID();
  try { sessionStorage.setItem(key(tcId, scope), JSON.stringify({ ref, sig })); } catch { /* storage blocked */ }
  return ref;
}

export function clearPaymentRef(tcId: number, scope = "handover"): void {
  try { sessionStorage.removeItem(key(tcId, scope)); } catch { /* ignore */ }
}
