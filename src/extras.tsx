import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePrefs } from "./prefs";

/* ---- install prompt ---- */
let deferred: any = null;
const subs = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; subs.forEach((f) => f()); });
  window.addEventListener("appinstalled", () => { deferred = null; subs.forEach((f) => f()); });
}
export function useInstall() {
  const [, tick] = useState(0);
  useEffect(() => { const f = () => tick((n) => n + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  async function install() {
    if (!deferred) return;
    deferred.prompt(); await deferred.userChoice; deferred = null; subs.forEach((f) => f());
  }
  return { canInstall: !!deferred, install };
}

/* ---- offline banner ---- */
export function useOnline() {
  const [on, setOn] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => {
    const a = () => setOn(true), b = () => setOn(false);
    window.addEventListener("online", a); window.addEventListener("offline", b);
    return () => { window.removeEventListener("online", a); window.removeEventListener("offline", b); };
  }, []);
  return on;
}
export function OfflineBanner() {
  const on = useOnline();
  if (on) return null;
  return <div className="offline noprint">No internet. Saving will fail. Your entries stay on screen. Retry when back online.</div>;
}

/* ---- vibration ---- */
export function useBuzz() {
  const { p } = usePrefs();
  return (ms = 40) => { if (p.vibrate && "vibrate" in navigator) navigator.vibrate(ms); };
}

/* ---- keep screen awake during session ---- */
export function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on || !("wakeLock" in navigator)) return;
    let lock: any;
    const get = async () => { try { lock = await (navigator as any).wakeLock.request("screen"); } catch { /* denied */ } };
    get();
    const vis = () => { if (!document.hidden) get(); };
    document.addEventListener("visibilitychange", vis);
    return () => { document.removeEventListener("visibilitychange", vis); try { lock?.release(); } catch { /* ignore */ } };
  }, [on]);
}

/* ---- unsaved changes guard ---- */
export function useLeave(dirty: boolean) {
  const nav = useNavigate();
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);
  return (to: string, opts?: { replace?: boolean }) => {
    if (dirty && !confirm("Leave without saving? Your changes will be lost.")) return;
    nav(to, opts);
  };
}

/* ---- CSV download (built in browser from data already on screen) ---- */
export function downloadCsv(name: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const blob = new Blob(["\ufeff" + rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
