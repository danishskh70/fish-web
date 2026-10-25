import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppBar, Icon } from "./lib";
import { usePrefs, type Prefs } from "./prefs";
import { useToast } from "./ui-feedback";

// Phone-settings style building blocks: grouped rows, tonal icon, value on the right, chevron.
export type Tone = "g" | "b" | "o" | "p" | "n";

export function SubPage({ title, sub, back = "/settings", children }: { title: string; sub?: string; back?: string; children: React.ReactNode }) {
  const nav = useNavigate();
  return (
    <>
      <AppBar title={title} sub={sub} onBack={() => nav(back)} />
      <div className="page">{children}</div>
    </>
  );
}

export function SGroup({ title, hint, children }: { title?: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      {title && <h2 className="shead">{title}</h2>}
      <div className="list">{children}</div>
      {hint && <p className="shint">{hint}</p>}
    </section>
  );
}

const Ico = ({ icon, tone = "g" }: { icon: string; tone?: Tone }) => (
  <span className={`ico ${tone}`} aria-hidden="true"><Icon n={icon} size={20} /></span>
);

export function SRow({ icon, tone, label, hint, value, to, onClick, danger }: {
  icon: string; tone?: Tone; label: string; hint?: string; value?: string; to?: string; onClick?: () => void; danger?: boolean;
}) {
  const body = (
    <>
      <Ico icon={icon} tone={danger ? "o" : tone} />
      <span className="grow">
        <span className="b srow-l" style={danger ? { color: "var(--bad)" } : undefined}>{label}</span>
        {hint && <span className="sub srow-h">{hint}</span>}
      </span>
      {value && <span className="sval">{value}</span>}
      {to && <span className="chev" aria-hidden="true"><Icon n="chev" size={18} /></span>}
    </>
  );
  return to ? <Link to={to} className="li srow">{body}</Link> : <button type="button" className="li srow" onClick={onClick}>{body}</button>;
}

export function InfoRow({ icon, tone, label, value, hint }: { icon: string; tone?: Tone; label: string; value?: string; hint?: string }) {
  return (
    <div className="li srow">
      <Ico icon={icon} tone={tone} />
      <span className="grow"><span className="b srow-l">{label}</span>{hint && <span className="sub srow-h">{hint}</span>}</span>
      {value && <span className="sval">{value}</span>}
    </div>
  );
}

export function SwitchRow({ icon, tone, label, hint, on, onChange }: { icon: string; tone?: Tone; label: string; hint?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" className="li srow" role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <Ico icon={icon} tone={tone} />
      <span className="grow"><span className="b srow-l">{label}</span>{hint && <span className="sub srow-h">{hint}</span>}</span>
      <span className={`sw ${on ? "on" : ""}`} aria-hidden="true" />
    </button>
  );
}

export function SelectRow({ icon, tone, label, hint, value, options, onChange }: {
  icon: string; tone?: Tone; label: string; hint?: string; value: string; options: [string, string][]; onChange: (v: string) => void;
}) {
  return (
    <label className="li srow">
      <Ico icon={icon} tone={tone} />
      <span className="grow"><span className="b srow-l">{label}</span>{hint && <span className="sub srow-h">{hint}</span>}</span>
      <select className="sel" value={value} aria-label={label} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

// Instant-save preferences: change, then a small "Saved" toast.
export function useSetPref() {
  const { set } = usePrefs();
  const { success } = useToast();
  return (patch: Partial<Prefs>) => { set(patch); success("Saved"); };
}
