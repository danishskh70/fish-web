import React, { useState, useMemo, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "./api";
import { money, intOf, amountInWords } from "./format";
import type { Phase } from "./types";

export { money, intOf, amountInWords };
export type { Phase };
export * from "./types";
export * from "./keys";

export type A = any;

/* ---------- hooks ---------- */
export const useTid = () => Number(useParams().tripId);
export const useGet = (key: unknown[], path: string, options: { staleTime?: number } = {}) =>
  useQuery({ queryKey: key, queryFn: () => api<A>(path), ...options });
export const post = (p: string, b?: A, m = "POST") =>
  api<A>(p, { method: m, body: b === undefined ? undefined : JSON.stringify(b) });
export const byIdDesc = (a: A, b: A) => b.id - a.id;

// Only one trip may be open. Newest non-closed trip.
export function useActiveTrip(): { trip: A | undefined; loading: boolean } {
  const trips = useGet(["trips"], "/trips/");
  const trip = [...(trips.data ?? [])].sort(byIdDesc).find((t: A) => t.status !== "CLOSED");
  return { trip, loading: trips.isPending };
}

// Phase comes from persisted backend data only.
// PLANNING + no FINAL supplier list = preparing. PLANNING + FINAL list = configured.
export const phaseOf = (t: A, sl: A[] = []): Phase => {
  if (!t) return "preparing";
  if (t.status === "CLOSED") return "closed";
  if (t.status === "IN_PROGRESS") return "progress";
  if (Array.isArray(sl) && sl.some((s: A) => s?.status === "FINAL")) return "configured";
  return "preparing";
};

export function useTripPhase(id: number) {
  const t = useGet(["trip", id], `/trips/${id}`);
  const sl = useGet(["sl", id], `/trips/${id}/supplier-lists`);
  const phase: Phase | null = t.data && sl.data ? phaseOf(t.data, sl.data) : null;
  return { t, sl, phase };
}

// Handover totals of every trip. Bags only. No rates.
export function useAllTotals() {
  const trips = useGet(["trips"], "/trips/", { staleTime: 30000 });
  const list: A[] = trips.data ?? [];
  const qs = useQueries({
    queries: list.map((t: A) => ({
      queryKey: ["totals", t.id],
      queryFn: () => api<A[]>(`/trips/${t.id}/handover-totals`),
      staleTime: 60000,
    })),
  });
  const byTrip = useMemo(() => {
    const map: Record<number, A[]> = {};
    list.forEach((t: A, i: number) => {
      map[t.id] = (qs[i]?.data as A[]) ?? [];
    });
    return map;
  }, [list, qs]);
  return { trips: list, byTrip, loading: trips.isPending || qs.some((q) => q.isPending) };
}

export function useAct(keys: unknown[][] = []) {
  const qc = useQueryClient();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function act(fn: () => Promise<unknown>): Promise<boolean> {
    setBusy(true);
    setErr("");
    try {
      await fn();
      await Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: k })));
      return true;
    } catch (e) {
      setErr((e as ApiError).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { act, err, busy, clearErr: () => setErr("") };
}

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });

export function useNames() {
  const c = useGet(["customers"], "/customers/");
  const map = useMemo(() => {
    const m = new Map<number, string>();
    (c.data ?? []).forEach((x: A) => m.set(x.id, x.name));
    return m;
  }, [c.data]);
  return (id: number) => map.get(id) ?? `#${id}`;
}

/* ---------- icons ---------- */
const P: Record<string, React.ReactNode> = {
  home: (
    <>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </>
  ),
  box: (
    <>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="M3.27 6.96L12 12.01l8.73-5.05" />
      <path d="M12 22.08V12" />
    </>
  ),
  list: (
    <>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M8 2h8v4H8z" />
      <path d="M9 12h6M9 16h6" />
    </>
  ),
  truck: (
    <>
      <path d="M1 3h15v13H1z" />
      <path d="M16 8h4l3 3v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </>
  ),
  menu: <path d="M3 12h18M3 6h18M3 18h18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  back: <path d="M19 12H5M12 19l-7-7 7-7" />,
  right: <path d="M5 12h14M12 5l7 7-7 7" />,
  chev: <path d="M9 18l6-6-6-6" />,
  user: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  users: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  check: <path d="M20 6L9 17l-5-5" />,
  lock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  alert: (
    <>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  out: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </>
  ),
  rupee: (
    <>
      <path d="M6 3h12M6 8h12M6 13l8.5 8M6 13h3" />
      <path d="M9 13c6.667 0 6.667-10 0-10" />
    </>
  ),
  bill: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8" />
    </>
  ),
  fish: (
    <>
      <path d="M2 12c3-5 9-7 14-4 2 1 4 3 6 4-2 1-4 3-6 4-5 3-11 1-14-4z" />
      <circle cx="15" cy="11" r=".8" fill="currentColor" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  sliders: <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />,
  print: (
    <>
      <path d="M6 9V2h12v7" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 14h12v8H6z" />
    </>
  ),
  down: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5M12 15V3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </>
  ),
  share: (
    <>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </>
  ),
  flag: (
    <>
      <path d="M4 22V4" />
      <path d="M4 4h13l-2 4 2 4H4" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  refresh: (
    <>
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </>
  ),
  phone: (
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  ),
};

export const Icon = ({ n, size = 22 }: { n: string; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {P[n]}
  </svg>
);

/* ---------- UI ---------- */
export const Card = ({ className = "", ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`card ${className}`} {...p} />
);

export const Btn = React.memo(function Btn({
  variant = "",
  sm,
  block,
  className = "",
  children,
  busy,
  ...p
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "" | "soft" | "outline" | "ghost" | "danger" | "dangersoft";
  sm?: boolean;
  block?: boolean;
  busy?: boolean;
}) {
  return (
    <button
      className={`btn ${variant} ${sm ? "sm" : ""} ${block ? "block" : ""} ${className}`}
      disabled={busy || p.disabled}
      {...p}
    >
      {busy ? <span className="spin" /> : children}
    </button>
  );
});

export const Pill = ({
  tone = "mut",
  children,
}: {
  tone?: "ok" | "warn" | "bad" | "info" | "mut";
  children: React.ReactNode;
}) => <span className={`pill ${tone}`}>{children}</span>;

export const StatusChip = ({ s }: { s: string }) => {
  const m: Record<string, ["warn" | "info" | "mut", string]> = {
    PLANNING: ["warn", "Planning"],
    IN_PROGRESS: ["info", "In progress"],
    CLOSED: ["mut", "Closed"],
  };
  const [tone, label] = m[s] ?? ["mut", s];
  return <Pill tone={tone}>{label}</Pill>;
};

export const PhasePill = ({ p }: { p: string }) => {
  const m: Record<string, ["warn" | "info" | "ok" | "mut", string]> = {
    preparing: ["warn", "Preparing"],
    configured: ["info", "Configured"],
    progress: ["ok", "In progress"],
    closed: ["mut", "Closed"],
  };
  const [tone, label] = m[p] ?? ["mut", p];
  return <Pill tone={tone}>{label}</Pill>;
};

export const Field = ({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <div className="field">
    <label className="label">
      {label}
      {required && <span style={{ color: "var(--bad)" }}> *</span>}
    </label>
    {children}
  </div>
);

export const Err = ({ m }: { m?: string }) => (m ? <div className="alert bad" role="alert">{m}</div> : null);
export const Warn = ({ children }: { children: React.ReactNode }) => (
  <div className="alert warn" role="alert">{children}</div>
);

export const Load = ({ q, text = "Loading…" }: { q: A; text?: string }) =>
  q.isPending ? (
    <div className="center sub" style={{ padding: 24 }}>
      <div className="spin" style={{ margin: "0 auto 8px", borderColor: "rgba(11, 122, 95, 0.2)", borderTopColor: "var(--p)" }} />
      {text}
    </div>
  ) : q.isError ? (
    <div className="alert bad" role="alert">
      <div>{q.error?.message || "Failed to load data."}</div>
      {typeof q.refetch === "function" && (
        <button className="btn sm outline mt2" onClick={() => q.refetch()}>
          Retry
        </button>
      )}
    </div>
  ) : null;

export const Empty = ({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) => (
  <div className="center" style={{ padding: "32px 16px" }}>
    <div className="avatar" style={{ margin: "0 auto 10px", width: 56, height: 56 }}>
      <Icon n="fish" size={28} />
    </div>
    <div className="b">{title}</div>
    {hint && <div className="sub mt2">{hint}</div>}
    {action && <div className="mt">{action}</div>}
  </div>
);

export const Num = (p: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input inputMode="numeric" pattern="[0-9]*" autoComplete="off" {...p} />
);

export const Stepper = React.memo(function Stepper({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const n = intOf(value);
  return (
    <div className="stepper">
      <button
        type="button"
        className="step-btn"
        aria-label="Decrease"
        onClick={() => onChange(n > 1 ? String(n - 1) : "")}
      >
        <Icon n="minus" />
      </button>
      <Num
        className="step-in"
        value={value}
        placeholder="0"
        aria-label="Quantity"
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      />
      <button
        type="button"
        className="step-btn"
        aria-label="Increase"
        onClick={() => onChange(String(n + 1))}
      >
        <Icon n="plus" />
      </button>
    </div>
  );
});

export function Seg({
  items,
  value,
  onChange,
}: {
  items: [string, string][];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="seg" role="tablist">
      {items.map(([k, l]) => (
        <button
          key={k}
          type="button"
          role="tab"
          aria-selected={value === k}
          className={value === k ? "on" : ""}
          onClick={() => onChange(k)}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export const Bar = ({ pct, bad }: { pct: number; bad?: boolean }) => (
  <div className={`bar ${bad ? "bad" : ""}`}>
    <i style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
  </div>
);

export function AppBar({
  title,
  sub,
  onBack,
  right,
  logo,
}: {
  title: string;
  sub?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  logo?: boolean;
}) {
  return (
    <header className="hdr">
      {onBack ? (
        <button className="ib" onClick={onBack} aria-label="Back">
          <Icon n="back" />
        </button>
      ) : logo ? (
        <span className="logo">
          <Icon n="fish" size={28} />
        </span>
      ) : null}
      <h1>
        {title}
        {sub && <small>{sub}</small>}
      </h1>
      {right}
    </header>
  );
}

export function Sheet({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="sheet-back" onClick={onClose} role="dialog" aria-modal="true">
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// Full-screen form with fixed action bar. Covers nav.
export function Full({
  title,
  sub,
  onBack,
  bar,
  children,
}: {
  title: string;
  sub?: string;
  onBack: () => void;
  bar?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="full">
      <AppBar title={title} sub={sub} onBack={onBack} />
      <div className="full-body">{children}</div>
      {bar && <div className="full-bar">{bar}</div>}
    </div>
  );
}

export const Avatar = ({ name, tone = "" }: { name: string; tone?: "" | "warn" | "info" }) => (
  <div className={`avatar ${tone}`}>{(name || "?").charAt(0).toUpperCase()}</div>
);

export const StockStrip = React.memo(function StockStrip({ id }: { id: number }) {
  const s = useGet(["stock", id], `/trips/${id}/stock`);
  if (!s.data) return <Load q={s} />;
  return (
    <div className="stats">
      {s.data.map((l: A) => (
        <div className={`stat ${l.left_bags < 0 ? "neg" : ""}`} key={l.fish_type_id}>
          <div className="t">{l.fish_type_name}</div>
          <div className="v num">
            {l.on_slip ? l.left_bags : "—"} <small>left</small>
          </div>
          <div className="sub mt2">
            Slip {l.on_slip ? l.slip_bags : 0} · Handed {l.handed_bags}
          </div>
        </div>
      ))}
    </div>
  );
});

export const Breadcrumb = ({ items }: { items: { label: string; to?: string }[] }) => (
  <nav className="breadcrumb sub" aria-label="Breadcrumb">
    {items.map((it, i) => (
      <span key={i} className="crumb-item">
        {i > 0 && <span className="crumb-sep"> › </span>}
        {it.to ? <Link to={it.to}>{it.label}</Link> : <span>{it.label}</span>}
      </span>
    ))}
  </nav>
);

export const SectionTitle = ({ title, action }: { title: string; action?: React.ReactNode }) => (
  <div className="between h2">
    <span>{title}</span>
    {action}
  </div>
);
