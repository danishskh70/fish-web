import { useRef, useState } from "react";
import { recordPayment } from "../api/api";
import { validateAmount } from "../api/money";
import type { Method, PayKind, Payment, TripRow } from "../api/types";
import { Icon } from "../ui/icons";
import { Button, Field } from "../ui/kit";
import { inr, uid } from "../ui/format";

// One form for Advance (from the customer / order list) and Current payment (after handover).
// The reference stays the same on retry, so a double tap or a bad network never records twice.
export default function PayForm({ row, kind, onDone }: { row: TripRow; kind: PayKind; onDone: (p: Payment, replay: boolean) => void }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Method>("CASH");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ref = useRef(uid());
  const input = useRef<HTMLInputElement>(null);

  const val = validateAmount(amount);
  const chips = (kind === "PAYMENT" ? [row.remaining > 0 ? row.remaining : 0, 500, 1000] : [500, 1000, 1500]).filter((v, i, a) => v > 0 && a.indexOf(v) === i);
  const after = val && !row.amountUnknown ? row.remaining - val : null;

  async function submit() {
    if (!val) { setErr("Enter a whole rupee amount above zero"); input.current?.focus(); return; }
    setBusy(true); setErr("");
    try {
      const r = await recordPayment(row.tripId, row.id, { kind, amount: val, method, note, ref: ref.current });
      ref.current = uid(); setAmount(""); setNote("");
      onDone(r.payment, r.replay);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Not saved. Try again."); // same ref kept, so retry is safe
    } finally { setBusy(false); }
  }

  return (
    <div className="payform">
      {kind === "ADVANCE" && !row.amountUnknown && <div className="pf-rem"><span>Expected amount</span><b className="num">{inr(row.amount)}</b></div>}
      <div className="label">Amount</div>
      <div className="chips-row" role="group" aria-label="Quick amounts">
        {chips.map((c) => <button key={c} type="button" className={`qchip ${val === c ? "on" : ""}`} onClick={() => setAmount(String(c))}>{inr(c)}</button>)}
        <button type="button" className={`qchip ${val && !chips.includes(val) ? "on" : ""}`} onClick={() => input.current?.focus()}>Other</button>
      </div>
      <div className="amt-in"><span aria-hidden="true">₹</span><input ref={input} inputMode="numeric" autoComplete="off" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d,]/g, ""))} aria-label="Amount received in rupees" /></div>

      <div className="label mt">Payment method</div>
      <div className="methods" role="radiogroup" aria-label="Payment method">
        <button type="button" role="radio" aria-checked={method === "CASH"} className={`mtile ${method === "CASH" ? "on" : ""}`} onClick={() => setMethod("CASH")}><Icon n="cash" size={20} /> Cash</button>
        <button type="button" role="radio" aria-checked={method === "ONLINE"} className={`mtile ${method === "ONLINE" ? "on" : ""}`} onClick={() => setMethod("ONLINE")}><Icon n="phone" size={20} /> Online</button>
      </div>

      <Field label="Note (optional)"><input className="input" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder={kind === "ADVANCE" ? "e.g. Customer advance" : "e.g. Final collection"} /></Field>

      {after !== null && (
        <div className={`after ${after < 0 ? "warn" : ""}`}>
          <span>{after < 0 ? "Paid ahead after this" : "Remaining after payment"}</span><b className="num">{inr(Math.abs(after))}</b>
        </div>
      )}
      {after !== null && after < 0 && <div className="note warn">More than the remaining amount. The extra stays as credit for this trip.</div>}
      {kind === "PAYMENT" && row.rateMissing && <div className="note warn">A rate is missing for some bags, so this amount is not final.</div>}
      {err && <div className="note bad" role="alert">{err}</div>}
      <Button block busy={busy} onClick={submit}>{kind === "ADVANCE" ? "Record Advance" : "Record Payment"}</Button>
    </div>
  );
}
