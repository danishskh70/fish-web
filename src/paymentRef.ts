// Idempotency UUID for one payment form, kept in sessionStorage.
// Same payload on retry -> same reference, so the server cannot record it twice.
// Changed payload -> new reference, so one reference never carries two bodies.
const key = (tcId: number) => `fs_payment_ref_${tcId}`;

export function getPaymentRef(tcId: number, sig: string): string {
  try {
    const s = JSON.parse(sessionStorage.getItem(key(tcId)) ?? "null");
    if (s?.ref && s.sig === sig) return s.ref as string;
  } catch { /* ignore */ }
  const ref = crypto.randomUUID();
  try { sessionStorage.setItem(key(tcId), JSON.stringify({ ref, sig })); } catch { /* storage blocked */ }
  return ref;
}

export function clearPaymentRef(tcId: number): void {
  try { sessionStorage.removeItem(key(tcId)); } catch { /* ignore */ }
}
