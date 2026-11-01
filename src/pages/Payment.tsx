import { useState } from "react";
import { useParams } from "react-router-dom";
import { getTripCustomer, voidPayment } from "../api/api";
import { pct } from "../api/money";
import type { Payment } from "../api/types";
import { useApi } from "../api/hooks";
import { Avatar } from "../ui/art";
import { Icon } from "../ui/icons";
import { Button, ErrorBox, Page, Progress, Skeleton, SuccessOverlay, useToast } from "../ui/kit";
import { useBack, useGo } from "../ui/back";
import { dateTime, inr } from "../ui/format";
import PayForm from "./PayForm";

// Payment screen. After a save it STAYS here: the balance, history and status update in place.
export default function PaymentPage() {
  const { id, tcId } = useParams();
  const base = `/trips/${id}/customers/${tcId}`;
  const back = useBack(base);
  const go = useGo();
  const toast = useToast();
  const { data, error, reload } = useApi(() => getTripCustomer(Number(id), Number(tcId)), [tcId]);
  const [done, setDone] = useState<Payment | null>(null);

  if (error) return <Page title="Payment" onBack={back}><ErrorBox message={error} onRetry={reload} /></Page>;
  if (!data) return <Page title="Payment" onBack={back}><Skeleton n={3} h={100} /></Page>;
  const r = data.row;
  const paidFull = r.amountFinal && r.amount > 0 && r.remaining === 0;
  const state = paidFull ? ["Fully paid", "ok"] : r.remaining < 0 ? ["Paid ahead", "blue"] : r.paid > 0 ? ["Partly paid", "warn"] : ["Not paid yet", "mut"];

  return (
    <Page title="Payment" sub={`${r.name} · ${data.trip.code}`} onBack={back} right={<button className="icon-btn" onClick={() => go(`${base}/history`)} aria-label="Payment history"><Icon n="history" /></button>}>
      <div className="who-row card"><Avatar name={r.name} size={48} /><div><div className="b">{r.name}</div><div className="sub">Trip {data.trip.code}</div></div></div>
      {!r.handedOver ? (
        <div className="card lockbox"><Icon n="alert" size={26} /><div><b>Record the handover first</b><p className="sub">Current payment opens after the bags are handed over. Use Advance from the customer list before that.</p></div><Button onClick={() => go(`${base}/handover`)}>Go to handover</Button></div>
      ) : (
        <>
          <div className={`card pstate ${state[1]}`}>
            <div className="ps-h"><span className="dot" /> <b>{state[0]}</b></div>
            <div className="trio"><div><span className="sub">Trip amount</span><b className="num">{inr(r.amount)}</b></div><div><span className="sub">Paid so far</span><b className="num">{inr(r.paid)}</b></div><div><span className="sub">{r.remaining < 0 ? "Credit" : "Remaining"}</span><b className="num big-n">{inr(Math.abs(r.remaining))}</b></div></div>
            <Progress value={pct(r.amount, r.paid)} label="Collected" />
          </div>
          <h2 className="sec">Record payment</h2>
          <PayForm row={r} kind="PAYMENT" onDone={(p) => setDone(p)} />
        </>
      )}
      {done && (
        <SuccessOverlay title={`${inr(done.amount)} recorded`} rows={[["Customer", r.name], ["Type", "Current Payment"], ["Method", done.method === "CASH" ? "Cash" : "Online"], ["Date", dateTime(done.at)], ["Remaining after", inr(Math.max(done.remainingAfter, 0))]]} okLabel="Done"
          secondary={{ label: "View receipt", onClick: () => { const p = done; setDone(null); go(`${base}/receipts/${p.id}`); } }}
          onOk={() => { const p = done; setDone(null); toast({ msg: `${inr(p.amount)} recorded`, actionLabel: "Undo", onAction: () => { voidPayment(p.tripId, p.tripCustomerId, p.id, "Undone right after saving").catch(() => toast({ msg: "Could not undo", tone: "bad" })); } }); }} />
      )}
    </Page>
  );
}
