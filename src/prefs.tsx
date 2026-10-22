import React, { createContext, useContext, useEffect, useState } from "react";

// Device preferences only. Nothing secret. Never rates, never tokens.
export type ThemeMode = "light" | "dark" | "system";

export type Prefs = {
  biz: string;
  bizAddr: string;
  bizPhone: string;
  text: "normal" | "large" | "xl";
  contrast: boolean;
  theme: ThemeMode;
  vibrate: boolean;
  awake: boolean;
  autoNext: boolean;
  lowStock: number;
  defSupplier: string;
  defFish: number[] | null;
  installDismissed: boolean;
};

export const DEFAULTS: Prefs = {
  biz: "FishSeed Manager",
  bizAddr: "",
  bizPhone: "",
  text: "normal",
  contrast: false,
  theme: "system",
  vibrate: true,
  awake: true,
  autoNext: false,
  lowStock: 10,
  defSupplier: "",
  defFish: null,
  installDismissed: false,
};

const KEY = "fs_prefs_v1";

function load(): Prefs {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Prefs>) };
  } catch {
    return DEFAULTS;
  }
}

interface PrefsContextValue {
  p: Prefs;
  set: (x: Partial<Prefs>) => void;
  reset: () => void;
}

const Ctx = createContext<PrefsContextValue>({
  p: DEFAULTS,
  set: () => {},
  reset: () => {},
});

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [p, setP] = useState<Prefs>(load);

  const set = (x: Partial<Prefs>) =>
    setP((o) => {
      const n = { ...o, ...x };
      try {
        localStorage.setItem(KEY, JSON.stringify(n));
      } catch {
        /* storage blocked */
      }
      return n;
    });

  const reset = () => {
    setP(DEFAULTS);
    try {
      localStorage.setItem(KEY, JSON.stringify(DEFAULTS));
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const r = document.documentElement;
    r.style.fontSize = p.text === "xl" ? "20px" : p.text === "large" ? "18px" : "16px";
    r.classList.toggle("hc", p.contrast);

    const applyTheme = () => {
      const isDark =
        p.theme === "dark" ||
        (p.theme === "system" &&
          typeof window !== "undefined" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      r.classList.toggle("dark", isDark);
    };

    applyTheme();

    if (p.theme === "system" && typeof window !== "undefined") {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      mql.addEventListener("change", applyTheme);
      return () => mql.removeEventListener("change", applyTheme);
    }
  }, [p.text, p.contrast, p.theme]);

  return <Ctx.Provider value={{ p, set, reset }}>{children}</Ctx.Provider>;
}

export const usePrefs = () => useContext(Ctx);
