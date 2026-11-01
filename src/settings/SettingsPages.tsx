import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MODE, getProfile, listFish, pingBackend, listSuppliers, logout, patchPreferences, resetDemoData, setFishActive, setFishPhoto, setRates, updateProfile } from "../api/api";
import { useApi } from "../api/hooks";
import type { Preferences } from "../api/types";
import { Avatar, FishThumb } from "../ui/art";
import { Icon } from "../ui/icons";
import { Button, ErrorBox, Field, ListCard, ListRow, Page, Sheet, Skeleton, Switch, useToast } from "../ui/kit";
import { useBack } from "../ui/back";
import { canInstall, isStandalone, onInstallChange, promptInstall } from "../ui/install";

const Radio = ({ on, label }: { on: boolean; label: string }) => <span className={`radio ${on ? "on" : ""}`} role="radio" aria-checked={on} aria-label={label} />;
const Check = ({ on, label }: { on: boolean; label: string }) => <span className={`checkbox ${on ? "on" : ""}`} role="checkbox" aria-checked={on} aria-label={label}>{on && <Icon n="check" size={14} />}</span>;

function usePrefs() {
  const p = useApi(getProfile);
  const toast = useToast();
  const save = async (patch: Partial<Preferences>) => { try { await patchPreferences(patch); } catch (e) { toast({ msg: e instanceof Error ? e.message : "Not saved", tone: "bad" }); } };
  return { ...p, prefs: p.data?.preferences, save };
}
const Shell = ({ title, sub, children, error, ready }: { title: string; sub?: string; children: React.ReactNode; error?: string; ready: boolean }) => {
  const back = useBack("/settings");
  return <Page title={title} sub={sub} onBack={back}>{error ? <ErrorBox message={error} /> : ready ? children : <Skeleton n={4} />}</Page>;
};

/* ---------- Profile ---------- */
export function ProfilePage() {
  const { data, error, prefs, save } = usePrefs();
  const toast = useToast();
  const nav = useNavigate();
  const [f, setF] = useState<{ name: string; phone: string; email: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data && !f) setF({ name: data.name, phone: data.phone, email: data.email }); }, [data, f]);
  async function saveProfile() {
    if (!f) return; setBusy(true);
    try { await updateProfile(f); toast({ msg: "Profile saved" }); } catch (e) { toast({ msg: e instanceof Error ? e.message : "Not saved", tone: "bad" }); } finally { setBusy(false); }
  }
  return (
    <Shell title="Profile" sub="Your account and preferences" error={error} ready={!!f && !!prefs}>
      {f && prefs && data && (
        <>
          <div className="who-row card"><Avatar name={f.name || "?"} size={56} /><div><div className="b">{data.name}</div><div className="sub">@{data.username}</div></div></div>
          <Field label="Name"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Phone"><input className="input" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="Email"><input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Button block busy={busy} onClick={saveProfile}>Save profile</Button>
          <ListCard title="Privacy">
            <ListRow icon="eye" title="Show rate per bag" sub="Shown on the handover screen. Turn off if others can see your phone." right={<Switch label="Show rate per bag" checked={prefs.showRates} onChange={(v) => save({ showRates: v })} />} />
          </ListCard>
          <Button block variant="outline" onClick={async () => { await logout(); nav("/login", { replace: true }); }}><Icon n="logout" size={18} /> Sign out</Button>
        </>
      )}
    </Shell>
  );
}

/* ---------- Default supplier: radio list ---------- */
export function DefaultSupplier() {
  const { error, prefs, save } = usePrefs();
  const sup = useApi(listSuppliers);
  return (
    <Shell title="Default Supplier" sub="Pre-selected when you start a trip" error={error} ready={!!prefs && !!sup.data}>
      <ListCard>
        <ListRow icon="close" title="None" sub="Choose every time" onClick={() => save({ defaultSupplierId: null })} right={<Radio on={prefs?.defaultSupplierId === null} label="None" />} />
        {(sup.data ?? []).map((s) => <ListRow key={s.id} icon="box" title={s.name} sub={s.phone} onClick={() => save({ defaultSupplierId: s.id })} right={<Radio on={prefs?.defaultSupplierId === s.id} label={s.name} />} />)}
      </ListCard>
    </Shell>
  );
}

/* ---------- Default fish: checkbox list ---------- */
export function DefaultFish() {
  const { error, prefs, save } = usePrefs();
  const fish = useApi(listFish);
  const active = (fish.data ?? []).filter((f) => f.active);
  const sel = prefs?.defaultFishIds ?? [];
  const toggle = (id: number) => save({ defaultFishIds: sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id] });
  const all = active.length > 0 && active.every((f) => sel.includes(f.id));
  return (
    <Shell title="Default Fish Types" sub="Pre-selected for every new trip" error={error} ready={!!prefs && !!fish.data}>
      <ListCard>
        <ListRow icon="list" title="Select all" onClick={() => save({ defaultFishIds: all ? [] : active.map((f) => f.id) })} right={<Check on={all} label="Select all" />} />
        {active.map((f) => <ListRow key={f.id} lead={<FishThumb name={f.name} color={f.color} photo={f.photo} size={40} />} title={f.name} onClick={() => toggle(f.id)} right={<Check on={sel.includes(f.id)} label={f.name} />} />)}
      </ListCard>
    </Shell>
  );
}

/* ---------- number sheet used by low stock and rates ---------- */
function NumberSheet({ open, title, hint, presets, current, onClose, onSave, onReset, unit }: { open: boolean; title: string; hint?: string; presets: number[]; current?: number; onClose: () => void; onSave: (n: number) => Promise<void> | void; onReset?: () => void; unit: string }) {
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setV(current !== undefined ? String(current) : ""); }, [open, current]);
  const n = Number(v.replace(/\D/g, ""));
  const ok = Number.isInteger(n) && n >= 1;
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {hint && <p className="sub">{hint}</p>}
      <div className="chips-row wrap">{presets.map((p) => <button key={p} className={`qchip ${n === p ? "on" : ""}`} onClick={() => setV(String(p))}>{p}</button>)}</div>
      <Field label={`Custom (${unit})`}><input className="input" inputMode="numeric" value={v} onChange={(e) => setV(e.target.value.replace(/\D/g, ""))} placeholder="Enter a number" /></Field>
      <Button block busy={busy} disabled={!ok} onClick={async () => { setBusy(true); try { await onSave(n); onClose(); } finally { setBusy(false); } }}>Save</Button>
      {onReset && <Button block variant="outline" onClick={() => { onReset(); onClose(); }}>Use the default for all fish</Button>}
    </Sheet>
  );
}

/* ---------- Low stock: one value for all fish + per-fish override ---------- */
export function LowStock() {
  const { error, prefs, save } = usePrefs();
  const fish = useApi(listFish);
  const [target, setTarget] = useState<"all" | number | null>(null);
  const active = (fish.data ?? []).filter((f) => f.active);
  const cur = prefs?.lowStock;
  const set = (all: number, perFish: Record<string, number>) => save({ lowStock: { all, perFish } });
  return (
    <Shell title="Low Stock Warning" sub="Warn when bags left falls to this number" error={error} ready={!!prefs && !!fish.data}>
      {cur && (
        <>
          <ListCard title="One value for all fish">
            <ListRow icon="bell" title="All fish types" sub="Used unless a fish has its own value" right={<span className="lr-right"><b className="num">{cur.all} bags</b><Icon n="chev" size={18} className="lr-chev" /></span>} onClick={() => setTarget("all")} />
          </ListCard>
          <ListCard title="Different for one fish (optional)">
            {active.map((f) => { const own = cur.perFish[String(f.id)]; return (
              <ListRow key={f.id} lead={<FishThumb name={f.name} color={f.color} photo={f.photo} size={40} />} title={f.name} sub={own === undefined ? "Using the default" : "Own value"} onClick={() => setTarget(f.id)}
                right={<span className="lr-right"><b className="num">{own ?? cur.all} bags</b><Icon n="chev" size={18} className="lr-chev" /></span>} />); })}
          </ListCard>
          <NumberSheet open={target !== null} unit="bags" title={target === "all" ? "All fish types" : active.find((f) => f.id === target)?.name ?? ""} presets={[5, 10, 20, 50]}
            current={target === "all" ? cur.all : target !== null ? cur.perFish[String(target)] ?? cur.all : undefined} onClose={() => setTarget(null)}
            onSave={(n) => { if (target === "all") return set(n, cur.perFish); return set(cur.all, { ...cur.perFish, [String(target)]: n }); }}
            onReset={target !== null && target !== "all" ? () => { const { [String(target)]: _x, ...rest } = cur.perFish; void _x; set(cur.all, rest); } : undefined} />
        </>
      )}
    </Shell>
  );
}

/* ---------- Default rates: write-only, one rate for all + per-fish ---------- */
export function DefaultRates() {
  const { error, prefs } = usePrefs();
  const fish = useApi(listFish);
  const toast = useToast();
  const [target, setTarget] = useState<"all" | number | null>(null);
  const active = (fish.data ?? []).filter((f) => f.active);
  async function save(n: number) {
    try { await setRates(target === "all" ? { all: n } : { perFish: { [target as number]: n } }); toast({ msg: "Rate saved" }); } catch (e) { toast({ msg: e instanceof Error ? e.message : "Not saved", tone: "bad" }); }
  }
  return (
    <Shell title="Default Rates" sub="Price per bag. Saved rates are never shown again." error={error} ready={!!prefs && !!fish.data}>
      <div className="note info"><Icon n="lock" size={18} /> Rates are write-only. You can replace a rate but not read it back, so nobody can see it over your shoulder.</div>
      <ListCard title="One rate for all fish">
        <ListRow icon="rupee" title="Set the same rate for every fish" sub="Overwrites all fish rates" onClick={() => setTarget("all")} />
      </ListCard>
      <ListCard title="Different for one fish">
        {active.map((f) => <ListRow key={f.id} lead={<FishThumb name={f.name} color={f.color} photo={f.photo} size={40} />} title={f.name} sub={f.rateSet ? "Rate is set" : "No rate yet"} onClick={() => setTarget(f.id)} right={<span className="lr-right"><span className={`chip ${f.rateSet ? "ok" : "warn"}`}>{f.rateSet ? "Set" : "Not set"}</span><Icon n="chev" size={18} className="lr-chev" /></span>} />)}
      </ListCard>
      <NumberSheet open={target !== null} unit="₹ per bag" title={target === "all" ? "Rate for all fish" : active.find((f) => f.id === target)?.name ?? ""} hint="Enter the new rate. The old one is not shown." presets={[450, 500, 600, 700]} onClose={() => setTarget(null)} onSave={save} />
    </Shell>
  );
}

/* ---------- Stock alerts: switches ---------- */
export function StockAlerts() {
  const { error, prefs, save } = usePrefs();
  const a = prefs?.stockAlerts;
  const set = (patch: Partial<Preferences["stockAlerts"]>) => save({ stockAlerts: { ...a!, ...patch } });
  return (
    <Shell title="Stock Alerts" sub="Low stock notifications" error={error} ready={!!a}>
      {a && (
        <ListCard>
          <ListRow icon="alert" title="Low stock alerts" sub="Master switch" right={<Switch label="Low stock alerts" checked={a.enabled} onChange={(v) => set({ enabled: v })} />} />
          <ListRow icon="home" title="Show on dashboard" sub="Banner when stock is low" right={<Switch label="Show on dashboard" checked={a.onDashboard} onChange={(v) => set({ onDashboard: v })} />} />
          <ListRow icon="phone" title="Vibrate" sub="Short buzz when a warning appears" right={<Switch label="Vibrate" checked={a.vibrate} onChange={(v) => set({ vibrate: v })} />} />
        </ListCard>
      )}
    </Shell>
  );
}

/* ---------- Fish type preferences: photo + active ---------- */
async function resize(file: File): Promise<string> {
  const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Not an image")); i.src = URL.createObjectURL(file); });
  const s = 256 / Math.max(img.width, img.height, 256);
  const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(img.src);
  return c.toDataURL("image/jpeg", 0.82);
}
export function FishPrefs() {
  const fish = useApi(listFish);
  const toast = useToast();
  const [id, setId] = useState<number | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const f = fish.data?.find((x) => x.id === id);
  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file0 = e.target.files?.[0]; e.target.value = "";
    if (!file0 || !f) return;
    try { await setFishPhoto(f.id, await resize(file0)); toast({ msg: "Photo saved" }); } catch (x) { toast({ msg: x instanceof Error ? x.message : "Could not save photo", tone: "bad" }); }
  }
  return (
    <Shell title="Fish Type Preferences" sub="Photos and which fish you use" error={fish.error} ready={!!fish.data}>
      <ListCard>
        {(fish.data ?? []).map((x) => <ListRow key={x.id} lead={<FishThumb name={x.name} color={x.color} photo={x.photo} size={44} />} title={x.name} sub={x.active ? (x.photo ? "Active · own photo" : "Active") : "Hidden"} onClick={() => setId(x.id)} />)}
      </ListCard>
      <p className="sub">Photos are optional. Without one, a coloured fish picture is used.</p>
      <Sheet open={!!f} onClose={() => setId(null)} title={f?.name}>
        {f && (
          <>
            <div className="center"><FishThumb name={f.name} color={f.color} photo={f.photo} size={96} /></div>
            <input ref={file} type="file" accept="image/*" hidden onChange={pick} />
            <Button block variant="outline" onClick={() => file.current?.click()}><Icon n="camera" size={18} /> {f.photo ? "Change photo" : "Add photo"}</Button>
            {f.photo && <Button block variant="ghost" onClick={() => setFishPhoto(f.id, null)}>Remove photo</Button>}
            <ListCard><ListRow icon="fish" title="Use this fish" sub="Hidden fish are not offered on new trips" right={<Switch label="Use this fish" checked={f.active} onChange={(v) => setFishActive(f.id, v)} />} /></ListCard>
          </>
        )}
      </Sheet>
    </Shell>
  );
}

/* ---------- Appearance ---------- */
export function Appearance() {
  const { error, prefs, save } = usePrefs();
  const opts: [Preferences["theme"], string, string][] = [["light", "Light", "Bright screens"], ["dark", "Dark", "Easy on the eyes at night"], ["system", "Match device", "Follows your phone setting"]];
  return (
    <Shell title="Appearance" error={error} ready={!!prefs}>
      <ListCard>{opts.map(([k, l, s]) => <ListRow key={k} icon="palette" title={l} sub={s} onClick={() => save({ theme: k })} right={<Radio on={prefs?.theme === k} label={l} />} />)}</ListCard>
    </Shell>
  );
}

/* ---------- About, install, demo data ---------- */
export function About() {
  const toast = useToast();
  const nav = useNavigate();
  const [, force] = useState(0);
  useEffect(() => onInstallChange(() => force((n) => n + 1)), []);
  const ios = /iphone|ipad/i.test(navigator.userAgent);
  const conn = useApi(pingBackend);
  return (
    <Shell title="About and install" ready>
      <ListCard title="Connection">
        <ListRow icon="info" title={MODE === "live" ? "Live backend" : "Demo data (no server)"} sub={MODE === "live" ? (conn.data ? (conn.data.ok ? "Connected" : "Cannot reach the backend. Start FastAPI on port 8000.") : "Checking…") : "Run without VITE_USE_STUB=1 to use the backend"} right={conn.data ? <span className={`chip ${conn.data.ok ? "ok" : "bad"}`}>{conn.data.ok ? "Online" : "Offline"}</span> : undefined} />
        {MODE === "live" && <ListRow icon="list" title="Kept on this device" sub="Profile, preferences, default rates and fish photos. The backend has no endpoint for them yet." />}
      </ListCard>
      <ListCard title="Install">
        {isStandalone() ? <ListRow icon="check" title="Installed" sub="You are using the app" /> : canInstall()
          ? <ListRow icon="install" title="Install app" sub="Add MatsyaSetu to your home screen" onClick={async () => { if (await promptInstall()) toast({ msg: "Installed" }); }} />
          : <ListRow icon="install" title="Install app" sub={ios ? "Tap Share, then Add to Home Screen" : "Use the browser menu: Install app"} />}
      </ListCard>
      <ListCard title="App">
        <ListRow icon="info" title="Version" sub="MatsyaSetu 3.0 (demo data)" />
        <ListRow icon="history" title={MODE === "live" ? "Reset device settings" : "Reset demo data"} sub={MODE === "live" ? "Clears local preferences, rates and photos" : "Brings back the sample trips and customers"} onClick={async () => { await resetDemoData(); toast({ msg: "Demo data restored" }); }} />
        <ListRow icon="logout" title="Sign out" tone="bad" onClick={async () => { await logout(); nav("/login", { replace: true }); }} />
      </ListCard>
    </Shell>
  );
}
