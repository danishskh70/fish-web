import React, { createContext, useContext, useEffect, useState } from "react";

// Device preferences only. Nothing secret. Never rates, never tokens.
export type Prefs = {
  biz: string; bizAddr: string; bizPhone: string;
  text: "normal" | "large" | "xl"; contrast: boolean;
  vibrate: boolean; awake: boolean; autoNext: boolean;
  lowStock: number; defSupplier: string; defFish: number[] | null;
  installDismissed: boolean;
};
const DEFAULTS: Prefs = {
  biz: "FishSeed Manager", bizAddr: "", bizPhone: "",
  text: "normal", contrast: false, vibrate: true, awake: true, autoNext: false,
  lowStock: 10, defSupplier: "", defFish: null, installDismissed: false,
};
const KEY = "fs_prefs_v1";
function load(): Prefs {
  try { return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Prefs>) }; }
  catch { return DEFAULTS; }
}

const Ctx = createContext<{ p: Prefs; set: (x: Partial<Prefs>) => void }>({ p: DEFAULTS, set: () => {} });

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [p, setP] = useState<Prefs>(load);
  const set = (x: Partial<Prefs>) => setP((o) => {
    const n = { ...o, ...x };
    try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* storage blocked */ }
    return n;
  });
  useEffect(() => {
    const r = document.documentElement;
    r.style.fontSize = p.text === "xl" ? "20px" : p.text === "large" ? "18px" : "16px";
    r.classList.toggle("hc", p.contrast);
  }, [p.text, p.contrast]);
  return <Ctx.Provider value={{ p, set }}>{children}</Ctx.Provider>;
}
export const usePrefs = () => useContext(Ctx);
