import { useState } from "react";
import { useParams } from "react-router-dom";
import { getTripCustomer } from "../api/api";
import { useApi } from "../api/hooks";
import { Avatar, EmptyArt } from "../ui/art";
import { Icon } from "../ui/icons";
import { Chip, ErrorBox, Page, Seg, Skeleton } from "../ui/kit";
import { useBack, useGo } from "../ui/back";
import { dateTime, inr } from "../ui/format";

export default function History() {
  const { id, tcId } = useParams();
  const base = `/trips/${id}/customers/${tcId}`;
  const back = useBack(base);
  const go = useGo();
  const { data, error, reload } = useApi(() => getTripCustomer(Number(id), Number(tcId)), [tcId]);
  const [f, setF] = useState<"all" | "ADVANCE" | "PAYMENT">("all");
  if (error) return <Page title="Payment history" onBack={back}><ErrorBox message={error} onRetry={reload} /></Page>;
  if (!data) return <Page title="Payment history" onBack={back}><Skeleton n={3} /></Page>;
  const { row: r, payments } = data;
  const list = payments.filter((p) => f === "all" || p.kind === f);
  return (
    <Page title="Payment history" onBack={back}>
      <div className="who-row card"><Avatar name={r.name} size={48} /><div><div className="b">{r.name}</div><div className="sub">Trip {data.trip.code}</div></div></div>
      <Seg<"all" | "ADVANCE" | "PAYMENT"> items={[["all", "All"], ["ADVANCE", "Advance"], ["PAYMENT", "Current"]]} value={f} onChange={setF} />
      {list.length === 0 && <div className="empty"><EmptyArt kind="payments" /><h3>No payments yet</h3></div>}
      <ul className="hist">
        {list.map((p) => (
          <li key={p.id}>
            <button className={`hrow ${p.voidedAt ? "void" : ""}`} onClick={() => go(`${base}/receipts/${p.id}`)}>
              <span className={`hic ${p.method === "CASH" ? "cash" : "online"}`}><Icon n={p.method === "CASH" ? "cash" : "phone"} size={20} /></span>
              <span className="grow"><b>{p.kind === "ADVANCE" ? "Advance" : "Current Payment"}</b><span className="sub">{dateTime(p.at)} · {p.method === "CASH" ? "Cash" : "Online"}</span>{p.voidedAt && <span className="sub bad-t">Cancelled: {p.voidReason}</span>}</span>
              <span className="num b amt">{p.voidedAt ? <s>{inr(p.amount)}</s> : inr(p.amount)}</span><Icon n="chev" size={16} className="lr-chev" />
            </button>
          </li>
        ))}
      </ul>
      <div className={`card remcard ${r.remaining <= 0 && r.amountFinal ? "ok" : ""}`}>
        <Icon n={r.remaining <= 0 && r.amountFinal ? "check" : "info"} size={24} />
        <div className="grow"><span className="sub">Remaining for this trip</span><b className="num big-n">{inr(Math.max(r.remaining, 0))}</b></div>
        {r.remaining <= 0 && r.amountFinal ? <Chip tone="ok">Fully paid</Chip> : <Chip tone="warn">To collect</Chip>}
      </div>
    </Page>
  );
}
