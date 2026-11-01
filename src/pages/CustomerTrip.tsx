import { useParams } from "react-router-dom";
import { getTripCustomer } from "../api/api";
import { pct } from "../api/money";
import { useApi } from "../api/hooks";
import { Avatar, FishThumb } from "../ui/art";
import { Icon } from "../ui/icons";
import { Button, Chip, ErrorBox, ListCard, ListRow, Page, Progress, Skeleton, StatusChip } from "../ui/kit";
import { useBack, useGo } from "../ui/back";
import { bags, dateOnly, inr } from "../ui/format";
import { useState } from "react";
import AdvanceSheet from "./AdvanceSheet";

// Customer inside one trip. The same screen is reached from the trip list and from Customers → trips.
export default function CustomerTrip() {
  const { id, tcId } = useParams();
  const tripId = Number(id);
  const back = useBack(`/trips/${tripId}`);
  const go = useGo();
  const { data, error, reload } = useApi(() => getTripCustomer(tripId, Number(tcId)), [tcId]);
  const [adv, setAdv] = useState(false);
  if (error) return <Page title="Customer" onBack={back}><ErrorBox message={error} onRetry={reload} /></Page>;
  if (!data) return <Page title="Customer" onBack={back}><Skeleton n={3} h={90} /></Page>;
  const { row: r, trip, payments } = data;
  const closed = trip.status === "CLOSED";
  const live = payments.filter((p) => !p.voidedAt);
  const base = `/trips/${tripId}/customers/${r.id}`;
  return (
    <Page title={r.name} sub={`Trip ${trip.code} · ${dateOnly(trip.date)}`} onBack={back} right={<StatusChip s={r.status} />}>
      <div className="card paysum">
        <div className="who-row"><Avatar name={r.name} size={48} /><div className="grow"><div className="b">{r.name}</div><div className="sub">{r.phone}</div></div>{r.phone && <a className="icon-btn boxed" href={`tel:${r.phone.replace(/\s/g, "")}`} aria-label={`Call ${r.name}`}><Icon n="phone" size={20} /></a>}</div>
        {r.rateMissing && <div className="note warn">A rate is missing for some bags. The amount is not final.</div>}
        <div className="trio"><div><span className="sub">{r.amountFinal ? "Trip amount" : "Expected"}</span><b className="num">{r.amountUnknown ? "After handover" : inr(r.amount)}</b></div><div><span className="sub">Paid so far</span><b className="num">{inr(r.paid)}</b></div>
          <div><span className="sub">{r.remaining < 0 ? "Credit" : "Remaining"}</span><b className={`num ${r.remaining > 0 ? "warn-t" : "ok-t"}`}>{r.amountUnknown ? "—" : inr(Math.abs(r.remaining))}</b></div></div>
        <Progress value={pct(r.amount, r.paid)} label="Collected" />
        <p className="sub mt2">{pct(r.amount, r.paid)}% collected · this trip only</p>
      </div>

      <ListCard title="Bags">
        {r.lines.map((l) => <ListRow key={l.fishId} lead={<FishThumb name={l.fishName} color={l.color} photo={l.photo} size={44} />} title={l.fishName} sub={l.rate ? `${inr(l.rate)} / bag` : undefined} right={<span className="num b">{r.handedOver ? `${l.handed ?? 0} of ${l.ordered}` : `${l.ordered} ordered`}</span>} />)}
        <ListRow icon="box" title="Total" right={<span className="num b">{bags(r.handedOver ? r.handedBags : r.orderedBags)}</span>} />
      </ListCard>

      <ListCard title="Steps">
        <ListRow icon="rupee" title="1. Advance (optional)" sub={r.advance > 0 ? `${inr(r.advance)} received` : closed || r.handedOver ? "Not available" : "Before the handover"} onClick={!closed && !r.handedOver ? () => setAdv(true) : undefined} right={r.advance > 0 ? <Chip tone="info">Done</Chip> : undefined} />
        <ListRow icon="trips" title="2. Handover" sub={r.handedOver ? `${bags(r.handedBags)} handed over` : closed ? "Trip closed" : "Record the bags given"} onClick={!closed && !r.handedOver ? () => go(`${base}/handover`) : undefined} right={r.handedOver ? <Chip tone="ok">Done</Chip> : undefined} />
        <ListRow icon="cash" title="3. Payment" sub={!r.handedOver ? "Opens after handover" : r.remaining > 0 ? `${inr(r.remaining)} to collect` : "Nothing to collect"} onClick={r.handedOver ? () => go(`${base}/payment`) : undefined} right={r.handedOver && r.remaining <= 0 && r.amount > 0 ? <Chip tone="ok">Done</Chip> : undefined} />
      </ListCard>

      <ListCard>
        <ListRow icon="history" title="Payment history" sub={`${live.length} payment${live.length === 1 ? "" : "s"}`} onClick={() => go(`${base}/history`)} />
      </ListCard>

      {r.handedOver && <div className="sticky-cta"><Button block onClick={() => go(`${base}/payment`)}>{r.remaining > 0 ? "Record payment" : "Open payments"}</Button></div>}
      {!r.handedOver && !closed && <div className="sticky-cta"><Button block onClick={() => go(`${base}/handover`)}>Record handover</Button></div>}
      <AdvanceSheet row={adv ? r : null} tripCode={trip.code} onClose={() => setAdv(false)} />
    </Page>
  );
}
