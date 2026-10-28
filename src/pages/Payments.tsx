import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  A,
  AppBar,
  Avatar,
  Btn,
  Empty,
  Err,
  Icon,
  Load,
  Pill,
  Seg,
  Sheet,
  fmtTime,
  money,
  post,
  useAct,
  useGet,
  useNames,
  useTid,
  useTripPhase,
} from "../lib";
import type { Payment, PaymentKind, PaymentMethod } from "../types";
import { useBuzz } from "../extras";
import { clearPaymentRef, getPaymentRef } from "../paymentRef";
import { cleanAmount } from "../payments";
import { useToast } from "../ui-feedback";

const METHOD: Record<PaymentMethod, string> = { CASH: "Cash", ONLINE: "Online" };
const KIND: Record<PaymentKind, string> = { PAYMENT: "Payment", ADVANCE: "Advance" };

// One customer's payments on one trip. Works in any phase: payments and voids
// are allowed after the trip closes. Rows are never edited or deleted, only voided.
export default function Payments() {
  const id = useTid();
  const tcId = Number(useParams().tcId);
  const nav = useNavigate();
  const buzz = useBuzz();
  const { success } = useToast();
  const name = useNames();
  const { phase } = useTripPhase(id);
  const tcs = useGet(["tc", id], `/trips/${id}/customers`);
  const list = useGet(["pay", id, tcId], `/trips/${id}/customers/${tcId}/payments`);
  const add = useAct([["pay", id, tcId]]);
  const cancel = useAct([["pay", id, tcId]]);

  const [form, setForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [kind, setKind] = useState<PaymentKind>("PAYMENT");
  const [note, setNote] = useState("");
  const [bad, setBad] = useState("");
  const [voiding, setVoiding] = useState<Payment | null>(null);
  const [reason, setReason] = useState("");
  const [voidBad, setVoidBad] = useState("");

  const back = phase === "progress" ? `/trips/${id}/session` : `/trips/${id}`;
  const tc = tcs.data?.find((x: A) => x.id === tcId);

  if (tcs.data && !tc) {
    return (
      <>
        <AppBar title="Payments" onBack={() => nav(back)} />
        <div className="page nonav">
          <Empty title="Customer not on this trip" hint="Go back and pick a customer from this trip." />
        </div>
      </>
    );
  }
  if (!tc || !list.data) {
    return (
      <>
        <AppBar title="Payments" onBack={() => nav(back)} />
        <Load q={!tcs.data ? tcs : list} />
      </>
    );
  }

  const who = name(tc.customer_id);
  const rows: Payment[] = list.data;

  function openForm(k: PaymentKind) {
    setKind(k);
    setBad("");
    setForm(true);
  }

  async function submit() {
    setBad("");
    const clean = cleanAmount(amount);
    if (!clean) return setBad("Enter an amount above 0. Up to 2 decimals.");
    const body: A = {
      reference: getPaymentRef(tcId, JSON.stringify({ clean, method, kind, note: note.trim() }), "page"),
      amount: clean,
      method,
      kind,
    };
    if (note.trim()) body.note = note.trim();

    const ok = await add.act(() => post(`/trips/${id}/customers/${tcId}/payments`, body));
    if (ok) {
      clearPaymentRef(tcId, "page");
      buzz(60);
      success(kind === "ADVANCE" ? "Advance recorded" : "Payment recorded");
      setAmount("");
      setNote("");
      setForm(false);
    }
  }

  async function submitVoid() {
    if (!voiding) return;
    setVoidBad("");
    const r = reason.trim();
    if (!r) return setVoidBad("Give a reason.");
    const ok = await cancel.act(() =>
      post(`/trips/${id}/customers/${tcId}/payments/${voiding.id}/void`, { reason: r })
    );
    if (ok) {
      buzz(60);
      success("Payment voided");
      setVoiding(null);
      setReason("");
    }
  }

  return (
    <>
      <AppBar title="Payments" sub={who} onBack={() => nav(back)} />
      <div className="page nonav">
        <div className="card row">
          <Avatar name={who} />
          <div>
            <div className="b">{who}</div>
            <div className="sub">Cash, online and advance. Void a wrong entry. Rows are never deleted.</div>
          </div>
        </div>

        {phase === "closed" && (
          <div className="alert info">Trip is closed. Payments and voids are still allowed.</div>
        )}

        {rows.length === 0 && (
          <Empty title="No payments yet" hint="Record cash, online or an advance." />
        )}

        {rows.map((p) => {
          const gone = !!p.voided_at;
          return (
            <div className="card" key={p.id} style={gone ? { opacity: 0.6 } : undefined}>
              <div className="between">
                <div>
                  <div
                    className="b num"
                    style={{
                      fontSize: "1.2rem",
                      textDecoration: gone ? "line-through" : undefined,
                    }}
                  >
                    {money(p.amount)}
                  </div>
                  <div className="sub">
                    {KIND[p.kind]} · {METHOD[p.method]} · {fmtTime(p.paid_at)}
                  </div>
                  {p.note && <div className="sub">{p.note}</div>}
                </div>
                {gone ? (
                  <Pill tone="bad">Voided</Pill>
                ) : (
                  <Btn
                    sm
                    variant="dangersoft"
                    onClick={() => {
                      setVoiding(p);
                      setReason("");
                      setVoidBad("");
                    }}
                  >
                    Void
                  </Btn>
                )}
              </div>
              {gone && <div className="sub mt2">Reason: {p.void_reason}</div>}
            </div>
          );
        })}
      </div>

      <div className="cta nonav">
        <div className="row">
          <Btn block variant="soft" onClick={() => openForm("ADVANCE")}>
            Advance
          </Btn>
          <Btn block onClick={() => openForm("PAYMENT")}>
            <Icon n="plus" size={18} /> Add payment
          </Btn>
        </div>
      </div>

      {form && (
        <Sheet onClose={() => !add.busy && setForm(false)}>
          <h3>{kind === "ADVANCE" ? "Advance from" : "Payment from"} {who}</h3>
          <Err m={bad || add.err} />
          <div className="field">
            <label className="label">Amount (₹)</label>
            <input
              className="input"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            />
          </div>
          <Seg
            items={[
              ["CASH", "Cash"],
              ["ONLINE", "Online"],
            ]}
            value={method}
            onChange={(v) => setMethod(v as PaymentMethod)}
          />
          <div className="mt">
            <Seg
              items={[
                ["PAYMENT", "Payment"],
                ["ADVANCE", "Advance"],
              ]}
              value={kind}
              onChange={(v) => setKind(v as PaymentKind)}
            />
          </div>
          <input
            className="input mt"
            placeholder="Note (optional)"
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="sub mt">Cash goes in the cash tally. Online must match the bank.</div>
          <Btn block className="mt" busy={add.busy} onClick={submit}>
            Record
          </Btn>
          <Btn
            block
            variant="ghost"
            className="mt2"
            disabled={add.busy}
            onClick={() => setForm(false)}
          >
            Cancel
          </Btn>
        </Sheet>
      )}

      {voiding && (
        <Sheet onClose={() => !cancel.busy && setVoiding(null)}>
          <h3>Void {money(voiding.amount)}?</h3>
          <div className="sub mb">
            The row stays in history, marked voided. Totals ignore it. This cannot be undone.
          </div>
          <Err m={voidBad || cancel.err} />
          <input
            className="input"
            placeholder="Reason (required)"
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Btn block variant="danger" className="mt" busy={cancel.busy} onClick={submitVoid}>
            Void payment
          </Btn>
          <Btn
            block
            variant="ghost"
            className="mt2"
            disabled={cancel.busy}
            onClick={() => setVoiding(null)}
          >
            Keep it
          </Btn>
        </Sheet>
      )}
    </>
  );
}
