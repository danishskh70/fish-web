import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  A,
  AppBar,
  Avatar,
  Btn,
  Err,
  Icon,
  Load,
  Sheet,
  StockStrip,
  post,
  useAct,
  useGet,
  useTid,
  useTripPhase,
} from "../lib";
import { useBuzz } from "../extras";
import { useToast } from "../ui-feedback";
import BillView from "./Bill";

function genId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch { /* fall through */ }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export default function SessionFinish() {
  const id = useTid();
  const nav = useNavigate();
  const buzz = useBuzz();
  const { success } = useToast();
  const { phase } = useTripPhase(id);
  const rt = useGet(["req", id], `/trips/${id}/requirements-table`);
  const tcs = useGet(["tc", id], `/trips/${id}/customers`);
  const stock = useGet(["stock", id], `/trips/${id}/stock`);
  const tot = useGet(["totals", id], `/trips/${id}/handover-totals`);
  const cust = useGet(["customers"], "/customers/");
  const { act, err, busy } = useAct([
    ["ho", id],
    ["stock", id],
    ["totals", id],
    ["tc", id],
    ["req", id],
    ["trip", id],
    ["trips"],
  ]);

  const [ask, setAsk] = useState(false);
  const [previewSelf, setPreviewSelf] = useState(false);

  // Guard submit_reference in sessionStorage keyed by trip
  const REF_KEY = `fs_self_ref_${id}`;
  const getSelfRef = (): string => {
    let r = sessionStorage.getItem(REF_KEY);
    if (!r) {
      r = genId();
      sessionStorage.setItem(REF_KEY, r);
    }
    return r;
  };
  const rotateSelfRef = () => {
    sessionStorage.setItem(REF_KEY, genId());
  };
  const clearSelfRef = () => {
    sessionStorage.removeItem(REF_KEY);
  };

  const back = `/trips/${id}/session`;
  if (!phase || !rt.data || !tcs.data || !stock.data) {
    return (
      <>
        <AppBar title="Finish trip" onBack={() => nav(back)} />
        <Load q={!rt.data ? rt : !tcs.data ? tcs : stock} />
      </>
    );
  }
  if (phase !== "progress") return <Navigate to={`/trips/${id}`} replace />;

  const nameOf = (cid: number) => cust.data?.find((c: A) => c.id === cid)?.name ?? `#${cid}`;
  const handed = (cid: number) =>
    (tot.data ?? [])
      .filter((r: A) => r.customer_id === cid)
      .reduce((a: number, r: A) => a + r.bags, 0);
  const pending = rt.data.customers.filter(
    (c: A) => c.total_bags > 0 && handed(c.customer_id) === 0
  );
  const leftover = stock.data.filter((l: A) => l.left_bags > 0);
  const leftTotal = leftover.reduce((a: number, l: A) => a + l.left_bags, 0);
  const handedTotal = (tot.data ?? []).reduce((a: number, r: A) => a + r.bags, 0);
  const served = (tcs.data as A[]).filter((x) => handed(x.customer_id) > 0);
  const self = cust.data?.find((c: A) => c.name.trim().toLowerCase() === "self");

  // Leftover goes to the Self customer so stock reaches zero.
  async function giveSelf() {
    if (!self) return;
    const currentRef = getSelfRef();
    const ok = await act(async () => {
      let tcId = tcs.data.find((x: A) => x.customer_id === self.id)?.id;
      if (!tcId) {
        const r = await post(`/trips/${id}/customers`, { customer_id: self.id });
        tcId = r.id;
      }
      await post(`/trips/${id}/handovers`, {
        trip_customer_id: tcId,
        submit_reference: currentRef,
        lines: leftover.map((l: A) => ({ fish_type_id: l.fish_type_id, bags: l.left_bags })),
      });
    });
    if (ok) {
      buzz(60);
      rotateSelfRef();
      setPreviewSelf(false);
      success("Leftover stock allocated to Self");
    }
  }

  async function close() {
    const ok = await act(() => post(`/trips/${id}/close`));
    setAsk(false);
    if (ok) {
      buzz(100);
      clearSelfRef();
      success("Trip closed successfully");
      nav(`/trips/${id}`, { replace: true });
    }
  }

  return (
    <>
      <AppBar title="Finish trip" sub="Print, bill and close" onBack={() => nav(back)} />
      <div className="page nonav">
        {pending.length > 0 ? (
          <div className="alert warn">
            <Icon n="alert" size={16} /> No handover yet for:{" "}
            {pending.map((c: A) => nameOf(c.customer_id)).join(", ")}.
          </div>
        ) : (
          <div className="alert ok">All planned handovers are recorded.</div>
        )}

        <div className="h2">Stock left</div>
        <StockStrip id={id} />
        {leftover.length > 0 && (
          <div className="card">
            <div className="b">
              Leftover bags:{" "}
              {leftover.map((l: A) => `${l.fish_type_name} ${l.left_bags}`).join(", ")}
            </div>
            <div className="sub mt2 mb">
              Trip cannot close with stock left in truck. Hand it to Self customer.
            </div>
            {self ? (
              <Btn block variant="soft" busy={busy} onClick={() => setPreviewSelf(true)}>
                Preview & Give leftover to Self
              </Btn>
            ) : (
              <div className="alert warn">
                Create a customer named <b>Self</b> in{" "}
                <Link to="/customers" style={{ textDecoration: "underline" }}>
                  Customers
                </Link>
                , then return.
              </div>
            )}
          </div>
        )}

        <div className="h2">Print</div>
        <div className="list">
          <Link className="li" to={`/trips/${id}/print/summary`}>
            <span style={{ color: "var(--p)" }}>
              <Icon n="print" />
            </span>
            <span className="grow b">Trip summary</span>
            <span className="chev">
              <Icon n="chev" size={18} />
            </span>
          </Link>
          {served.map((x) => (
            <div className="li" key={x.id}>
              <Avatar name={nameOf(x.customer_id)} />
              <div className="grow b">{nameOf(x.customer_id)}</div>
              <Link className="btn sm soft" to={`/trips/${id}/print/slip/${x.id}`}>
                Slip
              </Link>
              <Link className="btn sm soft" to={`/trips/${id}/print/bill/${x.id}`}>
                Bill
              </Link>
            </div>
          ))}
        </div>

        <div className="h2">Bill</div>
        <BillView id={id} />

        <div className="h2">Close trip</div>
        <div className="card">
          <div className="sub mb">
            Closing locks this trip. No more edits or handovers. It moves to History.
          </div>
          <Err m={err} />
          <Btn block busy={busy} onClick={() => setAsk(true)}>
            <Icon n="flag" size={18} />
            Close trip
          </Btn>
        </div>
      </div>

      {previewSelf && (
        <Sheet onClose={() => !busy && setPreviewSelf(false)}>
          <h3>Allocate leftover to Self?</h3>
          <div className="sub mb">
            The following remaining stock will be recorded as handed to Self:
          </div>
          <div className="list mb">
            {leftover.map((l: A) => (
              <div className="li between" key={l.fish_type_id} style={{ padding: "8px 12px" }}>
                <span className="b">{l.fish_type_name}</span>
                <span className="b num">{l.left_bags} bags</span>
              </div>
            ))}
          </div>
          <div className="between b mb" style={{ padding: "0 4px" }}>
            <span>Total to Self:</span>
            <span className="num">{leftTotal} bags</span>
          </div>
          <Btn block busy={busy} onClick={giveSelf}>
            Confirm & Allocate to Self
          </Btn>
          <Btn
            block
            variant="ghost"
            className="mt2"
            disabled={busy}
            onClick={() => setPreviewSelf(false)}
          >
            Cancel
          </Btn>
        </Sheet>
      )}

      {ask && (
        <Sheet onClose={() => !busy && setAsk(false)}>
          <h3>Close this trip?</h3>
          <div className="between" style={{ padding: "6px 0" }}>
            <span>Customers served</span>
            <b>{served.length}</b>
          </div>
          <div className="between" style={{ padding: "6px 0" }}>
            <span>Bags handed</span>
            <b className="num">{handedTotal}</b>
          </div>
          <div className="between" style={{ padding: "6px 0" }}>
            <span>Stock left</span>
            <b className="num" style={{ color: leftTotal > 0 ? "var(--bad)" : undefined }}>
              {leftTotal}
            </b>
          </div>
          {pending.length > 0 && (
            <div className="alert warn mt">
              {pending.length} planned customer(s) got nothing.
            </div>
          )}
          {leftTotal > 0 && (
            <div className="alert bad mt">
              Cannot close trip while bags remain in stock. Hand leftover to Self first.
            </div>
          )}
          <div className="alert info mt">
            After closing: no handovers, no edits, no new stock. The trip stays in History, read only.
          </div>
          <Btn block busy={busy} disabled={leftTotal > 0} onClick={close}>
            Yes, close trip
          </Btn>
          <Btn
            block
            variant="ghost"
            className="mt2"
            disabled={busy}
            onClick={() => setAsk(false)}
          >
            Cancel
          </Btn>
        </Sheet>
      )}
    </>
  );
}
