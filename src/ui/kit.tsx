import { createContext, useCallback, useContext, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Icon } from "./icons";
import { HeaderArt } from "./art";
import type { RowStatus } from "../api/types";

/* ---------- buttons, chips ---------- */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "ghost" | "danger"; block?: boolean; busy?: boolean; sm?: boolean };
export function Button({ variant = "primary", block, busy, sm, className = "", children, disabled, ...rest }: BtnProps) {
  return (
    <button className={`btn ${variant} ${block ? "block" : ""} ${sm ? "sm" : ""} ${className}`} disabled={disabled || busy} aria-busy={busy || undefined} {...rest}>
      {busy ? <span className="spin" aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
}
export const Chip = ({ tone = "mut", children }: { tone?: "ok" | "info" | "warn" | "bad" | "mut" | "blue"; children: ReactNode }) => <span className={`chip ${tone}`}>{children}</span>;

export function StatusChip({ s }: { s: RowStatus }) {
  const m: Record<RowStatus, [string, "ok" | "info" | "warn" | "bad" | "mut" | "blue"]> = {
    PENDING: ["Pending", "mut"], ADVANCE: ["Advance paid", "info"], HANDED: ["Handed over", "warn"],
    PARTIAL: ["Partly paid", "warn"], PAID: ["Fully paid", "ok"], CREDIT: ["Paid ahead", "blue"]
  };
  return <Chip tone={m[s][1]}>{m[s][0]}</Chip>;
}

/* ---------- toast / snackbar ---------- */
interface Toast { msg: string; actionLabel?: string; onAction?: () => void; tone?: "ok" | "bad" }
const ToastCtx = createContext<(t: Toast) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastHost({ children }: { children: ReactNode }) {
  const [t, setT] = useState<Toast | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const shownAt = useRef(0);
  const { pathname } = useLocation();
  // A message from the previous screen should not cover buttons on the next one.
  useEffect(() => { if (Date.now() - shownAt.current > 700) setT(null); }, [pathname]);
  const show = useCallback((x: Toast) => {
    shownAt.current = Date.now();
    setT(x); window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setT(null), x.actionLabel ? 7000 : 3500);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className="snack-wrap" aria-live="polite" role="status">
        {t && (
          <div className={`snack ${t.tone ?? "ok"}`}>
            <Icon n={t.tone === "bad" ? "alert" : "check"} size={20} />
            <span className="grow">{t.msg}</span>
            {t.actionLabel && <button className="snack-act" onClick={() => { t.onAction?.(); setT(null); }}>{t.actionLabel}</button>}
          </div>
        )}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- sheet (bottom sheet on phone, dialog on desktop) ---------- */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-grab" aria-hidden="true" />
        {title && <div className="sheet-head"><h2>{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Close"><Icon n="close" /></button></div>}
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

export function SuccessOverlay({ title, amount, rows, okLabel = "OK", onOk, secondary }: { title: string; amount?: string; rows: [string, string][]; okLabel?: string; onOk: () => void; secondary?: { label: string; onClick: () => void } }) {
  return (
    <div className="scrim center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="success">
        <div className="tick"><svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24" /><path d="M15 27l8 8 14-16" /></svg></div>
        <h2>{title}</h2>
        {amount && <div className="success-amt num">{amount}</div>}
        <dl className="kv">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        <Button block onClick={onOk} autoFocus>{okLabel}</Button>
        {secondary && <Button block variant="outline" onClick={secondary.onClick}>{secondary.label}</Button>}
      </div>
    </div>
  );
}

/* ---------- layout ---------- */
export function Page({ title, sub, onBack, right, children, wide }: { title: string; sub?: string; onBack?: () => void; right?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <div className="pg">
      <div className="pg-band" aria-hidden="true" />
      <main className={`pg-panel ${wide ? "wide" : ""}`}>
        <header className="pg-head">
          {onBack && <button className="icon-btn" onClick={onBack} aria-label="Back"><Icon n="back" /></button>}
          <div className="pg-title"><h1>{title}</h1>{sub && <p>{sub}</p>}</div>
          {right}
        </header>
        <div className="pg-body">{children}</div>
      </main>
    </div>
  );
}

export function Hero({ title, sub, onBack, right, children }: { title: string; sub: string; onBack?: () => void; right?: ReactNode; children?: ReactNode }) {
  return (
    <div className="pg hero-pg">
      <div className="hero">
        <HeaderArt />
        <div className="hero-bar">
          {onBack && <button className="icon-btn light" onClick={onBack} aria-label="Back"><Icon n="back" /></button>}
          <div className="hero-t"><h1>{title}</h1><p>{sub}</p></div>
          {right}
        </div>
      </div>
      <main className="pg-panel hero-panel"><div className="pg-body">{children}</div></main>
    </div>
  );
}

/* ---------- inputs ---------- */
export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: "ok" | "warn" }) {
  return <div className="stat"><div className={`stat-v num ${tone ?? ""}`}>{value}</div><div className="stat-l">{label}</div></div>;
}
export function Progress({ value, label }: { value: number; label: string }) {
  return <div className="bar" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}><div className="bar-f" style={{ width: `${value}%` }} /></div>;
}
export function Seg<T extends string>({ items, value, onChange }: { items: [T, string][]; value: T; onChange: (v: T) => void }) {
  return <div className="seg" role="tablist">{items.map(([k, l]) => <button key={k} role="tab" aria-selected={value === k} className={value === k ? "on" : ""} onClick={() => onChange(k)}>{l}</button>)}</div>;
}
export function SearchBar({ value, onChange, placeholder, right }: { value: string; onChange: (v: string) => void; placeholder: string; right?: ReactNode }) {
  return (
    <div className="searchrow">
      <label className="search"><Icon n="search" size={18} /><input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} /></label>
      {right}
    </div>
  );
}
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="field"><span className="label">{label}</span>{children}{hint && <span className="hint">{hint}</span>}</label>;
}
export function Stepper({ value, onChange, min = 0, max = 9999, label }: { value: number; onChange: (n: number) => void; min?: number; max?: number; label: string }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Fewer ${label}`}>−</button>
      <input inputMode="numeric" value={value} onChange={(e) => { const n = Number(e.target.value.replace(/\D/g, "")); onChange(Math.min(max, Math.max(min, Number.isFinite(n) ? n : 0))); }} aria-label={label} />
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`More ${label}`}>+</button>
    </div>
  );
}
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`switch ${checked ? "on" : ""}`} onClick={() => onChange(!checked)}><span /></button>;
}

/* ---------- list rows ---------- */
export function ListCard({ title, children }: { title?: string; children: ReactNode }) {
  return <section className="lcard">{title && <h3 className="lcard-t">{title}</h3>}<div className="lcard-b">{children}</div></section>;
}
export function ListRow({ icon, title, sub, right, onClick, tone, lead }: { icon?: string; title: ReactNode; sub?: ReactNode; right?: ReactNode; onClick?: () => void; tone?: "bad"; lead?: ReactNode }) {
  const inner = (
    <>
      {lead ?? (icon && <span className={`lr-ic ${tone ?? ""}`}><Icon n={icon} size={20} /></span>)}
      <span className="lr-tx"><span className="lr-t">{title}</span>{sub && <span className="lr-s">{sub}</span>}</span>
      {right}
      {onClick && !right && <Icon n="chev" size={18} className="lr-chev" />}
    </>
  );
  return onClick ? <button className="lrow" onClick={onClick}>{inner}</button> : <div className="lrow static">{inner}</div>;
}

/* ---------- states ---------- */
export const Skeleton = ({ h = 64, n = 1 }: { h?: number; n?: number }) => (
  <div aria-hidden="true">{Array.from({ length: n }, (_, i) => <div key={i} className="skel" style={{ height: h }} />)}</div>
);
export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="errbox" role="alert"><Icon n="alert" /><span className="grow">{message}</span>{onRetry && <Button sm variant="outline" onClick={onRetry}>Retry</Button>}</div>;
}
