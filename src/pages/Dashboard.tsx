import { Link } from "react-router-dom";
import { getLowStock, getOutstanding, getProfile, listTrips } from "../api/api";
import { useApi } from "../api/hooks";
import { Icon } from "../ui/icons";
import { Button, Chip, ErrorBox, Hero, Progress, Skeleton } from "../ui/kit";
import { useGo } from "../ui/back";
import { dateOnly, greeting, inr } from "../ui/format";
import { pct } from "../api/money";

// Three blocks only: current trip, money to collect, last closed trip.
export default function Dashboard() {
  const go = useGo();
  const profile = useApi(getProfile);
  const trips = useApi(listTrips);
  const out = useApi(getOutstanding);
  const low = useApi(getLowStock);
  const active = trips.data?.find((t) => t.status === "IN_PROGRESS");
  const last = trips.data?.find((t) => t.status === "CLOSED");
  const err = trips.error || out.error;
  return (
    <Hero title={`${greeting()}, ${profile.data?.name ?? ""}`} sub="Here is what needs you today">
      {err && <ErrorBox message={err} onRetry={() => { trips.reload(); out.reload(); }} />}
      {(trips.loading || out.loading) && !trips.data ? <Skeleton h={120} n={3} /> : (
        <div className="dash">
          <section className="card">
            <div className="card-h"><h2>Current trip</h2>{active && <Chip tone="info">In progress</Chip>}</div>
            {active ? (
              <>
                <div className="b big">{active.code}</div>
                <p className="sub">{dateOnly(active.date)} · {active.supplierName}</p>
                <div className="mini-stats"><span><b className="num">{active.customers}</b> customers</span><span><b className="num">{active.bags}</b> bags</span>{!active.amountPending && <span><b className="num">{inr(active.amount)}</b></span>}</div>
                {!active.amountPending && <Progress value={pct(active.amount, active.paid)} label="Collected" />}
                <p className="sub mt2">{active.amountPending ? `${inr(active.paid)} advance received · amount known after handover` : `${inr(active.paid)} collected · ${inr(active.remaining)} remaining`}</p>
                <Button block onClick={() => go(`/trips/${active.id}`)}>Continue trip</Button>
              </>
            ) : (
              <>
                <p className="sub">No trip running. Start one when the supplier confirms the date.</p>
                <Button block onClick={() => go("/trips/new")}><Icon n="plus" size={18} /> Start new trip</Button>
              </>
            )}
          </section>

          <section className="card">
            <div className="card-h"><h2>To collect</h2><Link className="lnk" to="/outstanding">See trips</Link></div>
            <div className="big num money">{inr(out.data?.total ?? 0)}</div>
            <p className="sub">{out.data && out.data.trips.length > 0 ? `Across ${out.data.trips.length} trip${out.data.trips.length > 1 ? "s" : ""}. Each trip is tracked separately.` : "Nothing outstanding. All trips are settled."}</p>
          </section>

          {last && (
            <section className="card">
              <div className="card-h"><h2>Last closed trip</h2></div>
              <button className="lastrow" onClick={() => go(`/trips/${last.id}`)}>
                <span className="grow"><b>{last.code}</b><span className="sub">{dateOnly(last.date)} · {last.bags} bags · {last.supplierName}</span></span>
                {last.remaining > 0 ? <Chip tone="warn">{inr(last.remaining)} due</Chip> : <Chip tone="ok">Settled</Chip>}
                <Icon n="chev" size={18} />
              </button>
            </section>
          )}

          {low.data && low.data.length > 0 && (
            <section className="card warnc">
              <div className="card-h"><h2><Icon n="alert" size={18} /> Low stock</h2><Link className="lnk" to="/settings/low-stock">Limits</Link></div>
              <p className="sub">{low.data.map((l) => `${l.name} ${l.left} left`).join(" · ")}</p>
            </section>
          )}
        </div>
      )}
    </Hero>
  );
}
