import { useState } from "react";
import { fmtDate } from "../../api";
import { A, Btn, Icon, Load, Pill, useGet } from "../../lib";
import { RATE_RE, clearDefaultRates, defaultRateInfo, saveDefaultRates } from "../../defaultRates";
import { useLeave } from "../../extras";
import { useConfirm, useToast } from "../../ui-feedback";
import { SubPage } from "../../settings-ui";

// Write-only on purpose: saved values are never displayed.
export default function DefaultRates() {
  const fts = useGet(["fish-types"], "/fish-types/");
  const { success, error } = useToast();
  const confirm = useConfirm();
  const [v, setV] = useState<Record<number, string>>({});
  const [tick, setTick] = useState(0); // re-read "Set" status after saving
  const fish: A[] = (fts.data ?? []).filter((x: A) => x.is_active);
  const filled = Object.entries(v).filter(([, s]) => s.trim() !== "");
  const bad = filled.filter(([, s]) => !RATE_RE.test(s.trim())).map(([id]) => Number(id));
  const dirty = filled.length > 0;
  const leave = useLeave(dirty);

  function save() {
    if (bad.length) return;
    const r = saveDefaultRates(Object.fromEntries(filled.map(([id, s]) => [Number(id), s])));
    if (!r.ok) return error("Could not save on this phone. Browser storage is blocked.");
    leave.skip();
    setV({});
    setTick((n) => n + 1);
    success(`Default rates saved (${r.saved})`);
  }
  async function clearAll() {
    const ok = await confirm({
      title: "Remove all saved default rates?",
      body: "Trips already created keep their rates. New trips will need rates set on the Rates page.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    clearDefaultRates();
    setTick((n) => n + 1);
    success("Saved default rates removed");
  }

  return (
    <SubPage title="Default rates" sub="Rate per bag, used for new trips" back="/settings/trips">
      <div className="alert info" role="note">
        <Icon n="lock" size={16} /> Saved on this phone only. Never shown again. Type a new rate to replace the old one. Use this on your own phone only.
      </div>
      <Load q={fts} />
      <div className="card" key={tick}>
        {fish.map((f) => {
          const info = defaultRateInfo(f.id);
          const invalid = bad.includes(f.id);
          return (
            <div className="field" key={f.id}>
              <div className="between" style={{ marginBottom: 6 }}>
                <label className="label" htmlFor={`dr-${f.id}`} style={{ margin: 0 }}>{f.name}</label>
                {info.set ? <Pill tone="ok">Set · {fmtDate(info.at!)}</Pill> : <Pill tone="warn">Not set</Pill>}
              </div>
              <input id={`dr-${f.id}`} className="input" type="password" inputMode="decimal" autoComplete="new-password"
                placeholder={info.set ? "Type a new rate to replace" : "Rate per bag"}
                aria-invalid={invalid} aria-describedby={invalid ? `dr-e-${f.id}` : undefined}
                value={v[f.id] ?? ""} onChange={(e) => setV({ ...v, [f.id]: e.target.value })} />
              {invalid && <div id={`dr-e-${f.id}`} className="sub" role="alert" style={{ color: "var(--bad)", marginTop: 4 }}>Enter a number above 0, up to 2 decimals.</div>}
            </div>
          );
        })}
        {fts.isSuccess && fish.length === 0 && <div className="sub">No active fish types. Add them under Customers & suppliers.</div>}
        <div className="row">
          <Btn block disabled={!dirty || bad.length > 0} onClick={save}>Save</Btn>
          <Btn variant="outline" disabled={!dirty} onClick={() => setV({})}>Cancel</Btn>
        </div>
      </div>
      <Btn block variant="dangersoft" className="mt" onClick={clearAll}>Remove all saved rates</Btn>
    </SubPage>
  );
}
