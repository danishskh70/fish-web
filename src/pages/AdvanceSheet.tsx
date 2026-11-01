import { useState } from "react";
import { voidPayment } from "../api/api";
import type { Payment, TripRow } from "../api/types";
import { Avatar } from "../ui/art";
import { Seg, Sheet, SuccessOverlay, useToast } from "../ui/kit";
import { dateTime, inr } from "../ui/format";
import PayForm from "./PayForm";

// Advance sheet opened from the customer list or the order list.
// "Current payment" stays locked until the handover is recorded.
export default function AdvanceSheet({ row, tripCode, onClose }: { row: TripRow | null; tripCode: string; onClose: () => void }) {
  const toast = useToast();
  const [tab, setTab] = useState<"ADVANCE" | "PAYMENT">("ADVANCE");
  const [done, setDone] = useState<Payment | null>(null);
  if (!row) return null;
  const close = () => { setDone(null); setTab("ADVANCE"); onClose(); };
  const kind = row.handedOver ? "PAYMENT" : "ADVANCE";
  return (
    <>
      <Sheet open={!done} onClose={close} title="">
        <div className="who-row"><Avatar name={row.name} /><div><div className="b">{row.name}</div><div className="sub">Trip {tripCode}</div></div></div>
        {(row.handedOver || !row.amountUnknown) && <div className="pf-rem big"><span>{row.handedOver ? "Remaining" : "Expected amount"}</span><b className="num">{inr(row.handedOver ? row.remaining : row.amount)}</b></div>}
        <Seg items={[["ADVANCE", "Advance"], ["PAYMENT", "Current Payment"]]} value={row.handedOver ? "PAYMENT" : tab} onChange={(v) => { if (v === "PAYMENT" && !row.handedOver) { toast({ msg: "Current payment opens after handover", tone: "bad" }); return; } setTab(v); }} />
        {!row.handedOver && <p className="sub mt2">Current payment unlocks after the handover is recorded.</p>}
        <PayForm key={kind} row={row} kind={kind} onDone={(p) => setDone(p)} />
      </Sheet>
      {done && (
        <SuccessOverlay
          title={done.kind === "ADVANCE" ? "Advance recorded!" : "Payment recorded!"} amount={inr(done.amount)}
          rows={[["Customer", row.name], ["Type", done.kind === "ADVANCE" ? "Advance" : "Current Payment"], ["Method", done.method === "CASH" ? "Cash" : "Online"], ["Date", dateTime(done.at)]]}
          onOk={() => { const p = done; close(); toast({ msg: `${inr(p.amount)} recorded`, actionLabel: "Undo", onAction: () => { voidPayment(p.tripId, p.tripCustomerId, p.id, "Undone right after saving").catch(() => toast({ msg: "Could not undo", tone: "bad" })); } }); }}
        />
      )}
    </>
  );
}
