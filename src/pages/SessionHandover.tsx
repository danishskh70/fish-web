import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  A,
  AppBar,
  Avatar,
  Btn,
  Err,
  Icon,
  Load,
  Sheet,
  Stepper,
  intOf,
  post,
  useAct,
  useGet,
  LIVE,
  useTid,
  useTripPhase,
} from "../lib";
import { useBuzz, useLeave, useWakeLock } from "../extras";
import { clearHandoverRef, getHandoverRef } from "../handoverRef";
import { usePrefs } from "../prefs";
import { useSessionDone } from "../session";
import { useToast } from "../ui-feedback";

export default function SessionHandover() {
  const id = useTid();
  const tcId = Number(useParams().tcId);
  const nav = useNavigate();
  const { mark } = useSessionDone();
  const { p } = usePrefs();
  const buzz = useBuzz();
  const { success } = useToast();
  useWakeLock(p.awake);

  const { phase } = useTripPhase(id);
  const tcs = useGet(["tc", id], `/trips/${id}/customers`, LIVE);
  const rt = useGet(["req", id], `/trips/${id}/requirements-table`);
  const stock = useGet(["stock", id], `/trips/${id}/stock`, LIVE);
  const tot = useGet(["totals", id], `/trips/${id}/handover-totals`, LIVE);
  const cust = useGet(["customers"], "/customers/");
  const { act, err, busy } = useAct([["ho", id], ["stock", id], ["totals", id], ["trip", id]]);

  const [v, setV] = useState<Record<number, string>>({});
  const [note, setNote] = useState("");
  const [stage, setStage] = useState<"edit" | "confirm" | "payment">("edit");

  const leave = useLeave(stage === "edit" && (Object.keys(v).length > 0 || note !== ""));
  const back = `/trips/${id}/session`;
  const tc = tcs.data?.find((x: A) => x.id === tcId);

  if (!phase || !tc || !rt.data || !stock.data) {
    return (
      <>
        <AppBar title="Handover" onBack={() => nav(back)} />
        <Load q={!tcs.data ? tcs : !rt.data ? rt : stock} />
      </>
    );
  }
  if (phase !== "progress") return <Navigate to={`/trips/${id}`} replace />;

  const fish: A[] = rt.data.fish_types;
  const info = cust.data?.find((c: A) => c.id === tc.customer_id);

  const planned = (cid: number, fid: number) =>
    rt.data.customers
      .find((c: A) => c.customer_id === cid)
      ?.quantities.find((q: A) => q.fish_type_id === fid)?.quantity_bags ?? 0;

  const handed = (cid: number, fid?: number) =>
    (tot.data ?? [])
      .filter((r: A) => r.customer_id === cid && (fid === undefined || r.fish_type_id === fid))
      .reduce((a: number, r: A) => a + r.bags, 0);

  const leftOf = (fid: number) =>
    stock.data.find((s: A) => s.fish_type_id === fid)?.left_bags ?? 0;

  // Prefill from planned requirement (minus already handed)
  const pre = (fid: number) =>
    Math.max(0, planned(tc.customer_id, fid) - handed(tc.customer_id, fid));

  const val = (fid: number) => (v[fid] !== undefined ? v[fid] : pre(fid) ? String(pre(fid)) : "");

  const lines = fish.map((f) => ({ fish_type_id: f.id, bags: intOf(val(f.id)) }));
  const total = lines.reduce((a, l) => a + l.bags, 0);
  const over = fish.filter((f) => intOf(val(f.id)) > 0 && leftOf(f.id) - intOf(val(f.id)) < 0);

  const gotAny = handed(tc.customer_id) > 0;

  // Quick fill all planned
  const fillAllPlanned = () => {
    const next: Record<number, string> = {};
    fish.forEach((f) => {
      const p = pre(f.id);
      next[f.id] = p > 0 ? String(p) : "";
    });
    setV(next);
  };

  async function submit() {
    const body: A = {
      trip_customer_id: tc.id,
      submit_reference: getHandoverRef(tcId, JSON.stringify({ lines, note: note.trim() })),
      lines,
    };
    if (note.trim()) body.note = note.trim();

    const ok = await act(() => post(`/trips/${id}/handovers`, body));
    if (ok) {
      buzz(60);
      clearHandoverRef(tcId);
      success("Handover recorded successfully");
      setStage("payment");
    } else {
      setStage("edit");
    }
  }

  function answer() {
    mark(tc.id);
    const planTotal = (cid: number) =>
      rt.data.customers.find((c: A) => c.customer_id === cid)?.total_bags ?? 0;
    const next = p.autoNext
      ? (tcs.data as A[]).find(
          (x) => x.id !== tc.id && planTotal(x.customer_id) > 0 && handed(x.customer_id) === 0
        )
      : undefined;
    nav(next ? `/trips/${id}/session/customers/${next.id}` : back, { replace: true });
  }

  return (
    <>
      <AppBar
        title={info?.name ?? "Customer"}
        sub="Handover"
        onBack={() => leave(back)}
        right={
          gotAny ? (
            <button
              className="ib"
              onClick={() => nav(`/trips/${id}/print/slip/${tc.id}`)}
              aria-label="Print handover slip"
            >
              <Icon n="print" />
            </button>
          ) : undefined
        }
      />
      <div className="page nonav">
        <div className="card row">
          <Avatar name={info?.name ?? "?"} />
          <div>
            <div className="b">{info?.name}</div>
            <div className="sub">{[info?.phone, info?.address].filter(Boolean).join(" · ")}</div>
          </div>
        </div>

        <div className="between mb">
          <div className="sub">Change quantities to what the customer actually receives:</div>
          <button
            type="button"
            className="btn sm outline"
            onClick={fillAllPlanned}
            style={{ minHeight: 32, padding: "0 10px", fontSize: "0.8rem" }}
          >
            All planned
          </button>
        </div>

        {err && (
          <div className="card" style={{ borderColor: "var(--bad)", background: "var(--badb)" }}>
            {lines.every((l) => l.bags === 0) && handed(tc.customer_id) > 0 && (
          <div className="alert info" role="status">
            This customer already received the planned bags. Change a quantity only if they take more.
          </div>
        )}
        <Err m={err} />
            <div className="row mt2">
              <Btn sm onClick={submit} busy={busy}>
                <Icon n="refresh" size={16} /> Retry handover
              </Btn>
            </div>
          </div>
        )}

        {err.toLowerCase().includes("network") && (
          <div className="alert info">
            Network issue detected. Tap <b>Retry handover</b>. Your idempotency reference is
            preserved to prevent duplicate entries.
          </div>
        )}

        {fish.map((f) => (
          <div className="card" key={f.id}>
            <div className="between">
              <div>
                <div className="b">{f.name}</div>
                <div className="sub">
                  Planned {planned(tc.customer_id, f.id)} · Handed {handed(tc.customer_id, f.id)} ·{" "}
                  Stock {leftOf(f.id)}
                </div>
              </div>
              <Stepper value={val(f.id)} onChange={(n) => setV({ ...v, [f.id]: n })} />
            </div>
          </div>
        ))}

        <input
          className="input mb"
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="sub" style={{ fontSize: "0.78rem", color: "var(--mut)" }}>
          Tip: Handovers are permanent records. If a miscount occurs, record a subsequent handover
          with negative bags or adjust with admin.
        </div>
      </div>

      <div className="cta nonav">
        <Btn block disabled={total === 0} onClick={() => setStage("confirm")}>
          Confirm handover · {total} bag{total === 1 ? "" : "s"}
        </Btn>
      </div>

      {stage === "confirm" && (
        <Sheet onClose={() => !busy && setStage("edit")}>
          <h3>Hand over to {info?.name}?</h3>
          {lines
            .filter((l) => l.bags > 0)
            .map((l) => (
              <div className="between" key={l.fish_type_id} style={{ padding: "6px 0" }}>
                <span>{fish.find((f) => f.id === l.fish_type_id)?.name}</span>
                <span className="b num">{l.bags} bags</span>
              </div>
            ))}
          <div
            className="between b mt2 pt2"
            style={{ borderTop: "1px dashed var(--bd)", padding: "8px 0" }}
          >
            <span>Total:</span>
            <span className="num">{total} bags</span>
          </div>

          {over.length > 0 && (
            <div className="alert warn mt">
              Over stock:{" "}
              {over
                .map((f) => `${f.name} by ${intOf(val(f.id)) - leftOf(f.id)} bag(s)`)
                .join(", ")}
              . Allowed. Server flags it.
            </div>
          )}

          <div className="sub mt mb">Cannot be undone. Planned requirement stays unchanged.</div>
          <Btn block busy={busy} onClick={submit}>
            Record handover
          </Btn>
          <Btn
            block
            variant="ghost"
            className="mt2"
            disabled={busy}
            onClick={() => setStage("edit")}
          >
            Back
          </Btn>
        </Sheet>
      )}

      {stage === "payment" && (
        <Sheet onClose={answer}>
          <h3>Handover recorded</h3>
          <div className="b" style={{ fontSize: "1.15rem" }}>
            Was payment received?
          </div>
          <div className="alert info mt">
            Temporary note for your reference. The answer is not saved and has no accounting effect.
          </div>
          <div className="row">
            <Btn block onClick={answer}>
              Yes
            </Btn>
            <Btn block variant="outline" onClick={answer}>
              No
            </Btn>
          </div>
          <div className="row mt2">
            <Btn
              block
              variant="ghost"
              onClick={() => nav(`/trips/${id}/print/slip/${tc.id}`)}
            >
              <Icon n="print" size={18} /> Slip for customer
            </Btn>
            <Btn block variant="ghost" onClick={answer}>
              Skip
            </Btn>
          </div>
        </Sheet>
      )}
    </>
  );
}