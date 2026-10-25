import { A, Icon, useGet } from "../../lib";
import { defaultRateInfo } from "../../defaultRates";
import { usePrefs } from "../../prefs";
import { SGroup, SRow, SelectRow, SubPage, SwitchRow, useSetPref } from "../../settings-ui";

export default function TripsStock() {
  const { p } = usePrefs();
  const save = useSetPref();
  const sup = useGet(["suppliers"], "/suppliers/");
  const fts = useGet(["fish-types"], "/fish-types/");
  const fish: A[] = (fts.data ?? []).filter((x: A) => x.is_active);
  const defFish: number[] = p.defFish ?? fish.map((x) => x.id);
  const ratesSet = fish.filter((f) => defaultRateInfo(f.id).set).length;
  const limits = [5, 10, 15, 20, 30, 50];
  if (!limits.includes(p.lowStock)) limits.push(p.lowStock);
  limits.sort((a, b) => a - b);

  return (
    <SubPage title="Trips & stock" sub="Default units and operational preferences">
      <SGroup title="New trip">
        <SelectRow icon="box" tone="b" label="Default supplier" value={p.defSupplier}
          options={[["", "None"], ...((sup.data ?? []).filter((s: A) => s.is_active).map((s: A) => [String(s.id), s.name]) as [string, string][])]}
          onChange={(v) => save({ defSupplier: v })} />
      </SGroup>
      <div className="card" style={{ marginTop: -4 }}>
        <div className="label">Default fish types</div>
        <div className="chips">
          {fish.map((x) => {
            const on = defFish.includes(x.id);
            return (
              <button type="button" key={x.id} className={`chip ${on ? "on" : ""}`} aria-pressed={on}
                onClick={() => save({ defFish: on ? defFish.filter((i) => i !== x.id) : [...defFish, x.id] })}>
                {on && <Icon n="check" size={14} />}{x.name}
              </button>
            );
          })}
        </div>
        <div className="sub mt2">Preselected when you create a trip. You can still change them there.</div>
      </div>

      <SGroup title="Rates" hint="Rates are secret. They are never shown again after saving.">
        <SRow to="/settings/trips/rates" icon="rupee" tone="o" label="Default rates" hint="Set once, used for every new trip" value={fish.length ? `${ratesSet} of ${fish.length} set` : undefined} />
        <SwitchRow icon="check" label="Apply default rates to new trips" hint="Done once when the trip is created" on={p.autoApplyRates} onChange={(v) => save({ autoApplyRates: v })} />
      </SGroup>

      <SGroup title="Stock">
        <SelectRow icon="alert" tone="o" label="Low stock warning" hint="Shown on the session Stock tab, in bags per fish" value={String(p.lowStock)}
          options={limits.map((n) => [String(n), `${n} bags`] as [string, string])}
          onChange={(v) => save({ lowStock: Number(v) })} />
      </SGroup>
    </SubPage>
  );
}
