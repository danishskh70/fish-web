import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { closeTrip, getTrip } from "../api/api";
import { pct } from "../api/money";
import type { TripRow } from "../api/types";
import { useApi } from "../api/hooks";
import { Avatar, EmptyArt, FishThumb } from "../ui/art";
import { Icon } from "../ui/icons";
import { Button, Chip, ErrorBox, Hero, Progress, SearchBar, Seg, Sheet, Skeleton, Stat, StatusChip, useToast } from "../ui/kit";
import { useBack, useGo } from "../ui/back";
import { bags, dateOnly, inr } from "../ui/format";
import AdvanceSheet from "./AdvanceSheet";

type Filter = "all" | "pending" | "handed" | "due";

export default function TripOverview() {
  const { id } = useParams();
  const tripId = Number(id);
  const back = useBack("/trips");
  const go = useGo();
  const toast = useToast();
  const [sp] = useSearchParams();
  const { data, error, reload } = useApi(() => getTrip(tripId), [tripId]);
  const [tab, setTab] = useState<"customers" | "orders">("customers");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>(sp.get("due") ? "due" : "all");
  const [fsheet, setFsheet] = useState(false);
  const [adv, setAdv] = useState<TripRow | null>(null);
  const [closing, setClosing] = useState(false);

  const rows = useMemo(() => (data?.rows ?? []).filter((r) => {
    if (q && !r.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === "pending") return !r.handedOver;
    if (filter === "handed") return r.handedOver;
    if (filter === "due") return r.remaining > 0;
    return true;
  }), [data, q, filter]);

  if (error) return <Hero title="Trip" sub="" onBack={back}><ErrorBox message={error} onRetry={reload} /></Hero>;
  if (!data) return <Hero title="Trip" sub="Loading" onBack={back}><Skeleton n={4} /></Hero>;
  const t = data.trip;
  const active = t.status === "IN_PROGRESS";
  const allHanded = data.handedCount === data.rows.length && data.rows.length > 0;

  async function close() {
    setClosing(true);
    try { await closeTrip(tripId); toast({ msg: "Trip closed. Balances stay open for collection." }); } catch (e) { toast({ msg: e instanceof Error ? e.message : "Could not close", tone: "bad" }); } finally { setClosing(false); }
  }

  return (
    <Hero title={`Trip #${t.code}`} sub={`${dateOnly(t.date)} · ${t.supplierName}`} onBack={back} right={<Chip tone={active ? "info" : "ok"}>{active ? "In progress" : "Closed"}</Chip>}>
      <div className="stats3 card">
        <Stat label="Customers" value={t.customers} /><Stat label="Bags" value={t.bags} /><Stat label="Trip amount" value={t.amountPending ? "—" : inr(t.amount)} />
      </div>
      <div className="card collect">
        <div className="between"><span className="sub">Collected {inr(t.paid)}</span>{t.amountPending ? <span className="sub">Amount known after handover</span> : <b className={t.remaining > 0 ? "warn-t" : "ok-t"}>{t.remaining > 0 ? `${inr(t.remaining)} remaining` : "All collected"}</b>}</div>
        {!t.amountPending && <Progress value={pct(t.amount, t.paid)} label="Collected" />}
      </div>

      <Seg<"customers" | "orders"> items={[["customers", "Customers"], ["orders", "Order list"]]} value={tab} onChange={setTab} />

      {tab === "customers" && (
        <>
          <SearchBar value={q} onChange={setQ} placeholder="Search customers…" right={<button className={`icon-btn boxed ${filter !== "all" ? "on" : ""}`} onClick={() => setFsheet(true)} aria-label="Filter customers"><Icon n="filter" size={20} /></button>} />
          {filter !== "all" && <p className="sub">Showing: <b>{{ pending: "Not handed over", handed: "Handed over", due: "With balance due", all: "" }[filter]}</b> · <button className="lnk" onClick={() => setFilter("all")}>Clear</button></p>}
          {rows.length === 0 && <div className="empty"><EmptyArt kind="search" /><h3>No customers match</h3></div>}
          <ul className="crows">
            {rows.map((r) => (
              <li key={r.id}>
                <div className="crow">
                  <button className="crow-main" onClick={() => go(`/trips/${tripId}/customers/${r.id}`)}>
                    <Avatar name={r.name} />
                    <span className="grow"><b>{r.name}</b><span className="sub">{bags(r.handedOver ? r.handedBags : r.orderedBags)}{r.amountUnknown ? "" : ` · ${inr(r.amount)}`}{r.rateMissing ? " · rate missing" : ""}</span>
                      <span className={`due ${r.remaining > 0 ? "" : "ok-t"}`}>{r.amountUnknown ? (r.advance > 0 ? `Advance ${inr(r.advance)}` : "") : r.remaining > 0 ? `${inr(r.remaining)} due` : r.remaining < 0 ? `${inr(-r.remaining)} credit` : r.amountFinal ? "Settled" : ""}</span></span>
                  </button>
                  {active && r.status === "PENDING" ? <button className="advbtn" onClick={() => setAdv(r)}>Advance</button> : <span className="crow-chip"><StatusChip s={r.status} />{r.advance > 0 && r.status === "ADVANCE" ? <small className="num">{inr(r.advance)}</small> : null}</span>}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {tab === "orders" && (
        <div className="orders">
          <div className="card">
            <h3 className="card-t">Fish totals</h3>
            {data.fishTotals.map((f) => <div key={f.fishId} className="ft-row"><FishThumb name={f.name} color={f.color} photo={null} size={40} /><b className="grow">{f.name}</b><span className="num">{f.ordered} ordered</span>{data.handedCount > 0 && <span className="sub num">{f.handed} handed</span>}</div>)}
          </div>
          <div className="card">
            <h3 className="card-t">By customer</h3>
            {data.rows.map((r) => (
              <div key={r.id} className="ol-row">
                <Avatar name={r.name} size={36} />
                <span className="grow"><b>{r.name}</b><span className="sub">{r.lines.map((l) => `${l.fishName} ${l.ordered}`).join(", ")}</span></span>
                {active && !r.handedOver ? <button className="advbtn" onClick={() => setAdv(r)}>{r.advance > 0 ? `Advance ${inr(r.advance)}` : "Advance"}</button> : <StatusChip s={r.status} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {active && (
        <div className="sticky-cta">
          {allHanded ? <Button block busy={closing} onClick={close}>Close trip</Button> : <p className="sub center">{data.handedCount} of {data.rows.length} handed over. Close the trip when everyone is done.</p>}
        </div>
      )}

      <Sheet open={fsheet} onClose={() => setFsheet(false)} title="Filter customers">
        <div className="lcard-b flat">
          {([["all", "All customers"], ["pending", "Not handed over"], ["handed", "Handed over"], ["due", "With balance due"]] as [Filter, string][]).map(([k, l]) => (
            <button key={k} className="lrow" onClick={() => { setFilter(k); setFsheet(false); }}><span className="lr-tx"><span className="lr-t">{l}</span></span><span className={`radio ${filter === k ? "on" : ""}`} /></button>
          ))}
        </div>
      </Sheet>
      <AdvanceSheet row={adv} tripCode={t.code} onClose={() => setAdv(null)} />
    </Hero>
  );
}
