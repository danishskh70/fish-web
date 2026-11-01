// Captures the browser's "install app" event early so Settings can offer it later.
interface BIP extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
let deferred: BIP | null = null;
const subs = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e as BIP; subs.forEach((f) => f()); });
  window.addEventListener("appinstalled", () => { deferred = null; subs.forEach((f) => f()); });
}
export const canInstall = () => deferred !== null;
export const onInstallChange = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export async function promptInstall() { if (!deferred) return false; await deferred.prompt(); const r = await deferred.userChoice; deferred = null; subs.forEach((f) => f()); return r.outcome === "accepted"; }
export const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
