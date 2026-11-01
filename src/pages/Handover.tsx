import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getTripCustomer, listFish, recordHandover } from "../api/api";
import { useApi } from "../api/hooks";
import { Avatar, FishThumb } from "../ui/art";
import { Icon } from "../ui/icons";
import { Button, ErrorBox, Field, ListCard, ListRow, Page, Sheet, Skeleton, Stepper, SuccessOverlay } from "../ui/kit";
import { useBack } from "../ui/back";
import { bags, inr, uid } from "../ui/format";

export default function Handover() {
  const { id, tcId } = useParams();
  const base = `/trips/${id}/customers/${tcId}`;
  const back = useBack(base);
  const nav = useNavigate();
  const { data, error, reload } = useApi(() => getTripCustomer(Number(id), Number(tcId)), [tcId]);
  const fish = useApi(listFish);
  const [qty, setQty] = useState<Record<number, number> | null>(null);
  const [extra, setExtra] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const ref = useRef(uid()); // same reference on retry, so a double tap never records twice

  useEffect(() => { if (data && !qty) setQty(Object.fromEntries(data.row.lines.map((l) => [l.fishId, l.ordered]))); }, [data, qty]);

  if (error) return <Page title="Handover" onBack={back}><ErrorBox message={error} onRetry={reload} /></Page>;
  if (!data || !qty) return <Page title="Handover" onBack={back}><Skeleton n={3} h={90} /></Page>;
  const r = data.row;
  const locked = r.handedOver || data.trip.status === "CLOSED";
  const rateOf = (fid: number) => r.lines.find((l) => l.fishId === fid)?.rate ?? null;
  const total = Object.values(qty).reduce((a, n) => a + n, 0);
  const known = Object.keys(qty).every((k) => rateOf(Number(k)) !== null);
  const amount = known ? Object.entries(qty).reduce((a, [k, n]) => a + n * (rateOf(Number(k)) ?? 0), 0) : null;
  const addable = (fish.data ?? []).filter((f) => f.active && !(f.id in qty));

  async function save() {
    setBusy(true); setErr("");
    try { await recordHandover(Number(id), r.id, { bags: qty!, note, ref: ref.current }); setDone(true); } catch (e) { setErr(e instanceof Error ? e.message : "Not saved. Try again."); } finally { setBusy(false); }
  }

  return (
    <Page title="Handover" onBack={back}>
      <div className="who-row card"><Avatar name={r.name} size={48} /><div><div className="b">{r.name}</div><div className="sub">Trip {data.trip.code}</div></div></div>
      {locked && <div className="note warn">{r.handedOver ? "Handover is already recorded for this customer." : "This trip is closed."}</div>}
      <div className="label">Bags to hand over</div>
      <div className="hand-list">
        {Object.keys(qty).map(Number).map((fid) => {
          const l = r.lines.find((x) => x.fishId === fid);
          const f = fish.data?.find((x) => x.id === fid);
          const name = l?.fishName ?? f?.name ?? "Fish";
          return (
            <div key={fid} className="fe-row card">
              <FishThumb name={name} color={l?.color ?? f?.color ?? "#3f8be0"} photo={l?.photo ?? f?.photo ?? null} size={52} />
              <span className="grow"><b>{name}</b>{rateOf(fid) ? <span className="sub">{inr(rateOf(fid)!)} / bag</span> : null}{l && <span className="sub">Ordered {l.ordered}</span>}</span>
              <Stepper label={`${name} bags`} value={qty[fid] ?? 0} onChange={(n) => setQty((q) => ({ ...q!, [fid]: n }))} />
            </div>
          );
        })}
      </div>
      {addable.length > 0 && !locked && <button className="linkbtn" onClick={() => setExtra(true)}><Icon n="plus" size={16} /> Add another fish type</button>}
      <Field label="Notes (optional)"><textarea className="input area" rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. good quality" disabled={locked} /></Field>
      <div className="after"><span>Total</span><b className="num">{bags(total)}{amount !== null ? ` · ${inr(amount)}` : ""}</b></div>
      {err && <div className="note bad" role="alert">{err}</div>}
      <div className="sticky-cta"><Button block busy={busy} disabled={locked} onClick={save}>Record Handover</Button></div>

      <Sheet open={extra} onClose={() => setExtra(false)} title="Add fish type">
        <ListCard>{addable.map((f) => <ListRow key={f.id} lead={<FishThumb name={f.name} color={f.color} photo={f.photo} size={40} />} title={f.name} onClick={() => { setQty((q) => ({ ...q!, [f.id]: 1 })); setExtra(false); }} />)}</ListCard>
      </Sheet>
      {done && <SuccessOverlay title="Handover recorded!" amount={bags(total)} rows={[["Customer", r.name], ["Trip", data.trip.code]]} okLabel="Record payment"
        onOk={() => nav(`${base}/payment`, { replace: true, state: { from: base } })} secondary={{ label: "Pay later", onClick: () => nav(base, { replace: true }) }} />}
    </Page>
  );
}
