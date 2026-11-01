import { useEffect, useMemo, useState } from "react";
import { createTrip, getProfile, listCustomers, listFish, listSuppliers } from "../api/api";
import { useApi } from "../api/hooks";
import { Icon } from "../ui/icons";
import { Avatar, FishThumb } from "../ui/art";
import { Button, ErrorBox, Field, ListCard, ListRow, Page, SearchBar, Sheet, Stepper, useToast } from "../ui/kit";
import { useBack } from "../ui/back";
import { useNavigate } from "react-router-dom";

export default function NewTrip() {
  const back = useBack("/trips");
  const nav = useNavigate();
  const toast = useToast();
  const profile = useApi(getProfile);
  const suppliers = useApi(listSuppliers);
  const fish = useApi(listFish);
  const customers = useApi(listCustomers);
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [fishIds, setFishIds] = useState<number[] | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [orders, setOrders] = useState<Record<number, Record<number, number>>>({});
  const [edit, setEdit] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Defaults come from the profile preferences (set once in Settings).
  useEffect(() => {
    const p = profile.data?.preferences;
    if (!p) return;
    setSupplierId((s) => s ?? (suppliers.data?.some((x) => x.id === p.defaultSupplierId) ? p.defaultSupplierId : null));
    setFishIds((f) => f ?? p.defaultFishIds);
  }, [profile.data]);

  const activeFish = (fish.data ?? []).filter((f) => f.active);
  const chosen = (fishIds ?? []).filter((id) => activeFish.some((f) => f.id === id));
  const shown = useMemo(() => (customers.data ?? []).filter((c) => c.name.toLowerCase().includes(q.toLowerCase())), [customers.data, q]);
  const total = (cid: number) => Object.values(orders[cid] ?? {}).reduce((a, n) => a + n, 0);
  const picked = Object.keys(orders).filter((k) => total(Number(k)) > 0).length;

  async function start() {
    setBusy(true); setErr("");
    try {
      const id = await createTrip({ supplierId: supplierId ?? 0, date, fishIds: chosen, orders: Object.entries(orders).map(([c, bags]) => ({ customerId: Number(c), bags })) });
      toast({ msg: "Trip started" });
      nav(`/trips/${id}`, { replace: true });
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not start the trip"); } finally { setBusy(false); }
  }
  const sel = edit ? customers.data?.find((c) => c.id === edit) : undefined;

  return (
    <Page title="New trip" sub="One supplier, the fish, and who wants how many bags" onBack={back}>
      {(suppliers.error || fish.error || customers.error) && <ErrorBox message={suppliers.error || fish.error || customers.error} />}
      <ListCard title="Supplier">
        {(suppliers.data ?? []).map((s) => (
          <ListRow key={s.id} icon="box" title={s.name} sub={s.phone} onClick={() => setSupplierId(s.id)} right={<span className={`radio ${supplierId === s.id ? "on" : ""}`} role="radio" aria-checked={supplierId === s.id} aria-label={s.name} />} />
        ))}
      </ListCard>
      <Field label="Trip date"><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <div className="label">Fish types</div>
      <div className="chips-row wrap">
        {activeFish.map((f) => <button key={f.id} className={`qchip ${chosen.includes(f.id) ? "on" : ""}`} onClick={() => setFishIds(chosen.includes(f.id) ? chosen.filter((x) => x !== f.id) : [...chosen, f.id])} aria-pressed={chosen.includes(f.id)}>{f.name}</button>)}
      </div>
      <div className="label mt">Customers ({picked} selected)</div>
      <SearchBar value={q} onChange={setQ} placeholder="Search customers" />
      <ListCard>
        {shown.map((c) => (
          <ListRow key={c.id} lead={<Avatar name={c.name} />} title={c.name} sub={total(c.id) ? `${total(c.id)} bags` : c.address} onClick={() => setEdit(c.id)} right={total(c.id) ? <span className="chip info">{total(c.id)} bags</span> : <Icon n="plus" size={18} className="lr-chev" />} />
        ))}
      </ListCard>
      {err && <div className="note bad" role="alert">{err}</div>}
      <div className="sticky-cta"><Button block busy={busy} disabled={picked === 0 || chosen.length === 0 || !supplierId} onClick={start}>Start trip</Button></div>

      <Sheet open={!!sel} onClose={() => setEdit(null)} title={sel ? `Bags for ${sel.name}` : ""}>
        {sel && (
          <div className="fish-edit">
            {activeFish.filter((f) => chosen.includes(f.id)).map((f) => (
              <div key={f.id} className="fe-row"><FishThumb name={f.name} color={f.color} photo={f.photo} size={44} /><span className="grow b">{f.name}</span>
                <Stepper label={`${f.name} bags`} value={orders[sel.id]?.[f.id] ?? 0} onChange={(n) => setOrders((o) => ({ ...o, [sel.id]: { ...(o[sel.id] ?? {}), [f.id]: n } }))} /></div>
            ))}
            <Button block onClick={() => setEdit(null)}>Done</Button>
          </div>
        )}
      </Sheet>
    </Page>
  );
}
