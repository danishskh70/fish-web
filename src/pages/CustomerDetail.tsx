import { useParams } from "react-router-dom";
import { getCustomer } from "../api/api";
import { useApi } from "../api/hooks";
import { Avatar } from "../ui/art";
import { Icon } from "../ui/icons";
import { Chip, ErrorBox, ListCard, ListRow, Page, Skeleton } from "../ui/kit";
import { useBack, useGo } from "../ui/back";
import { dateOnly, inr } from "../ui/format";

// Customer → their trips. Every trip keeps its own balance. They are never merged into one number per trip.
export default function CustomerDetail() {
  const { id } = useParams();
  const back = useBack("/customers");
  const go = useGo();
  const { data, error, reload } = useApi(() => getCustomer(Number(id)), [id]);
  if (error) return <Page title="Customer" onBack={back}><ErrorBox message={error} onRetry={reload} /></Page>;
  if (!data) return <Page title="Customer" onBack={back}><Skeleton n={3} h={90} /></Page>;
  const c = data.customer;
  const due = data.trips.filter((t) => t.remaining > 0);
  return (
    <Page title={c.name} sub={c.address} onBack={back}>
      <div className="card paysum">
        <div className="who-row"><Avatar name={c.name} size={52} /><div className="grow"><div className="b">{c.name}</div><div className="sub">{c.phone}</div></div>{c.phone && <a className="icon-btn boxed" href={`tel:${c.phone.replace(/\s/g, "")}`} aria-label={`Call ${c.name}`}><Icon n="phone" size={20} /></a>}</div>
        <div className="trio one"><div><span className="sub">Total to collect</span><b className={`num big-n ${data.outstanding > 0 ? "warn-t" : "ok-t"}`}>{inr(data.outstanding)}</b></div></div>
        {due.length > 1 && <p className="sub">{due.map((t) => `${t.tripCode.slice(2)}: ${inr(t.remaining)}`).join(" + ")}</p>}
      </div>
      <ListCard title="Trips">
        {data.trips.length === 0 && <ListRow title="No trips yet" />}
        {data.trips.map((t) => (
          <ListRow key={t.tcId} icon="trips" title={t.tripCode} sub={`${dateOnly(t.date)} · amount ${inr(t.amount)}`} onClick={() => go(`/trips/${t.tripId}/customers/${t.tcId}`)}
            right={<span className="lr-right">{t.remaining > 0 ? <Chip tone="warn">{inr(t.remaining)} due</Chip> : t.remaining < 0 ? <Chip tone="blue">Credit {inr(-t.remaining)}</Chip> : <Chip tone="ok">Paid</Chip>}<Icon n="chev" size={18} className="lr-chev" /></span>} />
        ))}
      </ListCard>
    </Page>
  );
}
