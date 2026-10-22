import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { A, AppBar, Btn, Field, Icon, Seg, post, useGet } from "../lib";
import { useInstall, downloadCsv } from "../extras";
import { usePrefs, type ThemeMode } from "../prefs";
import { useConfirm, useToast } from "../ui-feedback";

function Toggle({
  label,
  hint,
  on,
  set,
}: {
  label: string;
  hint?: string;
  on: boolean;
  set: (v: boolean) => void;
}) {
  return (
    <button
      className="li"
      type="button"
      onClick={() => set(!on)}
      role="switch"
      aria-checked={on}
    >
      <span className="grow">
        <div className="b">{label}</div>
        {hint && <div className="sub">{hint}</div>}
      </span>
      <span
        style={{
          width: 46,
          height: 28,
          borderRadius: 99,
          background: on ? "var(--p)" : "#cbd8d3",
          position: "relative",
          flex: "none",
        }}
      >
        <i
          style={{
            position: "absolute",
            top: 3,
            left: on ? 21 : 3,
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "#fff",
            transition: "left .15s",
          }}
        />
      </span>
    </button>
  );
}

export default function Settings() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { success } = useToast();
  const { p, set, reset } = usePrefs();
  const { canInstall, install } = useInstall();
  const sup = useGet(["suppliers"], "/suppliers/");
  const fts = useGet(["fish-types"], "/fish-types/");
  const cust = useGet(["customers"], "/customers/");
  const fish = (fts.data ?? []).filter((x: A) => x.is_active);
  const defFish = p.defFish ?? fish.map((x: A) => x.id);

  async function logout() {
    try {
      await post("/auth/logout");
    } catch {
      /* ignore */
    }
    qc.clear();
    nav("/login", { replace: true });
  }

  async function clearCache() {
    const ok = await confirm({
      title: "Clear cache and reload?",
      body: "This will remove all cached queries and stored session tokens from this device. Trips and customers stored on the server will not be deleted.",
      confirmLabel: "Clear and reload",
      danger: true,
    });
    if (!ok) return;

    qc.clear();
    try {
      sessionStorage.clear();
      for (const k of await caches.keys()) await caches.delete(k);
      for (const r of (await navigator.serviceWorker?.getRegistrations()) ?? []) {
        await r.unregister();
      }
    } catch {
      /* ignore */
    }
    location.reload();
  }

  async function handleResetPrefs() {
    const ok = await confirm({
      title: "Reset preferences to default?",
      body: "This will restore display, field work, and business details to defaults.",
      confirmLabel: "Reset",
      danger: true,
    });
    if (ok) {
      reset();
      success("Preferences reset to defaults");
    }
  }

  function exportCustomersCsv() {
    const rows = (cust.data ?? []).map((c: A) => [
      c.id,
      c.name,
      c.phone,
      c.address,
      c.is_active ? "Active" : "Inactive",
    ]);
    downloadCsv(`customers-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["ID", "Name", "Phone", "Address", "Status"],
      ...rows,
    ]);
  }

  const Row = ({
    ic,
    label,
    hint,
    to,
  }: {
    ic: string;
    label: string;
    hint: string;
    to: string;
  }) => (
    <button className="li" type="button" onClick={() => nav(to)}>
      <span style={{ color: "var(--p)" }}>
        <Icon n={ic} />
      </span>
      <span className="grow">
        <div className="b">{label}</div>
        <div className="sub">{hint}</div>
      </span>
      <span className="chev">
        <Icon n="chev" size={18} />
      </span>
    </button>
  );

  return (
    <>
      <AppBar title="Settings" logo />
      <div className="page">
        <div className="h2">Business details on printouts</div>
        <div className="card">
          <Field label="Business name">
            <input
              className="input"
              value={p.biz}
              onChange={(e) => set({ biz: e.target.value })}
            />
          </Field>
          <Field label="Address">
            <input
              className="input"
              value={p.bizAddr}
              onChange={(e) => set({ bizAddr: e.target.value })}
            />
          </Field>
          <Field label="Phone">
            <input
              className="input"
              inputMode="tel"
              value={p.bizPhone}
              onChange={(e) => set({ bizPhone: e.target.value })}
            />
          </Field>
          <div className="sub">Saved on this device only.</div>
        </div>

        <div className="h2">Display & Theme</div>
        <div className="card">
          <div className="label">Appearance</div>
          <Seg
            value={p.theme ?? "system"}
            onChange={(v) => set({ theme: v as ThemeMode })}
            items={[
              ["light", "Light"],
              ["dark", "Dark"],
              ["system", "System"],
            ]}
          />
          <div className="label mt">Text size</div>
          <Seg
            value={p.text}
            onChange={(v) => set({ text: v as typeof p.text })}
            items={[
              ["normal", "Normal"],
              ["large", "Large"],
              ["xl", "Extra large"],
            ]}
          />
        </div>
        <div className="list">
          <Toggle
            label="Bright sun mode"
            hint="High contrast outlines for outdoor use"
            on={p.contrast}
            set={(v) => set({ contrast: v })}
          />
        </div>

        <div className="h2">Field work</div>
        <div className="list">
          <Toggle
            label="Vibrate on save"
            hint="Haptic feedback on successful action"
            on={p.vibrate}
            set={(v) => set({ vibrate: v })}
          />
          <Toggle
            label="Keep screen awake in session"
            hint="Prevents phone from sleeping during distribution"
            on={p.awake}
            set={(v) => set({ awake: v })}
          />
          <Toggle
            label="Open next customer after handover"
            hint="Skips the grid. Automatically moves to next awaiting customer."
            on={p.autoNext}
            set={(v) => set({ autoNext: v })}
          />
        </div>
        <div className="card">
          <Field label="Low stock warning (bags per fish)">
            <input
              className="input"
              inputMode="numeric"
              value={p.lowStock}
              onChange={(e) =>
                set({ lowStock: Number(e.target.value.replace(/\D/g, "")) || 0 })
              }
            />
          </Field>
        </div>

        <div className="h2">New trip defaults</div>
        <div className="card">
          <Field label="Default supplier">
            <select
              className="input"
              value={p.defSupplier}
              onChange={(e) => set({ defSupplier: e.target.value })}
            >
              <option value="">None</option>
              {(sup.data ?? [])
                .filter((s: A) => s.is_active)
                .map((s: A) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </Field>
          <div className="label">Default fish types</div>
          <div className="chips">
            {fish.map((x: A) => {
              const on = defFish.includes(x.id);
              return (
                <button
                  type="button"
                  key={x.id}
                  className={`chip ${on ? "on" : ""}`}
                  onClick={() =>
                    set({
                      defFish: on
                        ? defFish.filter((i: number) => i !== x.id)
                        : [...defFish, x.id],
                    })
                  }
                >
                  {on && <Icon n="check" size={14} />}
                  {x.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="h2">Master data & Backup</div>
        <div className="list">
          <Row ic="fish" label="Fish types" hint="Used when creating a trip" to="/fish-types" />
          <Row ic="box" label="Suppliers" hint="Used when creating a trip" to="/suppliers" />
          <button className="li" type="button" onClick={exportCustomersCsv}>
            <span style={{ color: "var(--p)" }}>
              <Icon n="down" />
            </span>
            <span className="grow">
              <div className="b">Export customers (CSV)</div>
              <div className="sub">Download full customer database</div>
            </span>
          </button>
        </div>

        <div className="h2">App & System</div>
        <div className="card">
          {canInstall && (
            <Btn block variant="soft" className="mb" onClick={install}>
              <Icon n="down" size={18} />
              Install app on this device
            </Btn>
          )}
          <Btn block variant="outline" className="mb" onClick={handleResetPrefs}>
            Reset preferences to defaults
          </Btn>
          <Btn block variant="outline" onClick={clearCache}>
            Clear cache and reload
          </Btn>
          <div className="sub center mt">
            FishSeed Manager · version {import.meta.env.VITE_APP_VERSION ?? "0.2.0"}
          </div>
        </div>
        <Btn block variant="dangersoft" className="mt" onClick={logout}>
          <Icon n="out" size={18} />
          Log out
        </Btn>
      </div>
    </>
  );
}
