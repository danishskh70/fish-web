import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api";
import { Btn, Err, Icon, money, useNames } from "../lib";
import type { PaymentSummary } from "../types";
import { isNegative, isZero, unsigned } from "../payments";

// Sensitive like Bill: billed amounts can leak a rate.
// Fetched on tap, kept in state only, never in the query cache.
// Hides after 30s, on blur, when the tab is hidden, on leaving the page.
const Row = ({ k, v, strong }: { k: string; v: string; strong?: boolean }) => (
  <div className="between" style={{ padding: "3px 0" }}>
    <span className="sub">{k}</span>
    <span className={`num ${strong ? "b" : ""}`}>{v}</span>
  </div>
);

const warnStyle = { color: "var(--warn)" } as const;

export default function PaymentSummaryView({ id }: { id: number }) {
  const name = useNames();
  const [d, setD] = useState<PaymentSummary | null>(null);
  const [err, setErr] = useState("");
  const [left, setLeft] = useState(30);
  const abortRef = useRef<AbortController | null>(null);
  const shown = !!d;

  useEffect(() => {
    if (!shown) return;
    setLeft(30);
    const interval = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          setD(null);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    const hide = () => setD(null);
    const vis = () => document.hidden && hide();
    window.addEventListener("blur", hide);
    document.addEventListener("visibilitychange", vis);
    return () => {
      clearInterval(interval);
      window.removeEventListener("blur", hide);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [shown]);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  async function open() {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setErr("");
    try {
      setD(await api<PaymentSummary>(`/trips/${id}/payments-summary`, { cache: "no-store", signal: ctrl.signal }));
    } catch (e) {
      if ((e as Error).name !== "AbortError") setErr((e as ApiError).message);
    }
  }

  if (!d) {
    return (
      <div className="card center">
        <div className="avatar" style={{ margin: "0 auto 10px", width: 52, height: 52 }}>
          <Icon n="lock" size={24} />
        </div>
        <div className="b">Payments</div>
        <div className="sub mt2 mb">Hidden. Shows amounts for 30 seconds.</div>
        <Err m={err} />
        <Btn block onClick={open}>
          <Icon n="rupee" size={18} />
          Show payments
        </Btn>
      </div>
    );
  }

  const quiet = (c: PaymentSummary["customers"][number]) =>
    isZero(c.billed_amount) &&
    isZero(c.total_paid) &&
    isZero(c.previous_balance) &&
    c.complete &&
    c.previous_complete;
  const customers = d.customers.filter((c) => !quiet(c));

  return (
    <>
      <div className="card">
        <div className="between mb" style={{ borderBottom: "1px solid var(--bd)", paddingBottom: 8 }}>
          <span className="badge-pill warn" style={{ fontSize: "0.75rem", padding: "2px 8px", height: "auto" }}>
            <Icon n="clock" size={12} /> Auto-hiding in {left}s
          </span>
          <button
            type="button"
            className="btn sm outline"
            onClick={() => setLeft((s) => Math.min(s + 30, 90))}
            style={{ minHeight: 28, fontSize: "0.76rem", padding: "0 8px" }}
          >
            +30s More
          </button>
        </div>

        <Row k="Billed" v={money(d.billed_amount)} />
        <Row k="Cash received" v={money(d.cash_paid)} />
        <Row k="Online received" v={money(d.online_paid)} />
        <Row k="Total received" v={money(d.total_paid)} strong />
        <Row k="Advance (included above)" v={money(d.advance_paid)} />
        <Row k="Still to collect" v={money(d.outstanding)} strong />
        {!isZero(d.credit) && <Row k="Credit (paid ahead)" v={money(d.credit)} />}

        {!d.complete && (
          <div className="alert warn mt">Some bags have no rate yet. Billed and remaining are not final.</div>
        )}
        <div className="sub mt2">
          Cash received should match cash in hand. Online received should match bank history.
        </div>
      </div>

      {customers.length === 0 && <div className="sub center">No billing or payments yet.</div>}

      {customers.map((c) => {
        const credit = isNegative(c.remaining);
        const totalCredit = isNegative(c.total_due);
        const showOld = !isZero(c.previous_balance) || !c.previous_complete;
        return (
          <div className="card" key={c.trip_customer_id}>
            <div className="between mb">
              <Link
                to={`/trips/${id}/session/customers/${c.trip_customer_id}/payments`}
                className="b"
                style={{ color: "var(--p)" }}
              >
                {name(c.customer_id)}
              </Link>
              <span className="sub">Tap name for payments</span>
            </div>
            <Row k="Billed" v={money(c.billed_amount)} />
            <Row k="Received" v={money(c.total_paid)} />
            <Row
              k={credit ? "Credit this trip" : "Remaining this trip"}
              v={money(credit ? unsigned(c.remaining) : c.remaining)}
            />
            {showOld && <Row k="Old balance" v={money(c.previous_balance)} />}
            <div style={{ borderTop: "1px dashed var(--bd)", marginTop: 4, paddingTop: 4 }}>
              <Row
                k={totalCredit ? "Total credit" : "Total due"}
                v={money(totalCredit ? unsigned(c.total_due) : c.total_due)}
                strong
              />
            </div>
            {!c.complete && <div className="sub" style={warnStyle}>Rates missing. Billed not final.</div>}
            {!c.previous_complete && (
              <div className="sub" style={warnStyle}>An older trip has unpriced bags. Old balance not final.</div>
            )}
          </div>
        );
      })}

      <Btn block variant="outline" onClick={() => setD(null)}>
        Hide payments
      </Btn>
    </>
  );
}
