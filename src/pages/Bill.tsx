import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { api, ApiError, fmtDate } from "../api";
import { A, Btn, Err, Icon, money, useGet, useNames } from "../lib";
import { usePrefs } from "../prefs";
import { useToast } from "../ui-feedback";

// Sensitive: fetched on tap, kept in state only, never in query cache.
// Hides after 30s, on blur, when tab hidden, on leaving the page.
export default function BillView({ id, closed }: { id: number; closed?: boolean }) {
  const name = useNames();
  const { p } = usePrefs();
  const { success } = useToast();
  const trip = useGet(["trip", id], `/trips/${id}`);
  const [d, setD] = useState<A>(null);
  const [err, setErr] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(30);
  const abortRef = useRef<AbortController | null>(null);
  const shown = !!d;

  useEffect(() => {
    if (!shown) return;
    setSecondsLeft(30);
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
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
      const res = await api(`/trips/${id}/bill`, { cache: "no-store", signal: ctrl.signal });
      setD(res);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setErr((e as ApiError).message);
      }
    }
  }

  const extendTimer = () => {
    setSecondsLeft((prev) => Math.min(prev + 30, 90));
    success("Viewing time extended by 30 seconds");
  };

  const copySummary = () => {
    if (!d) return;
    const lines = [
      `${p.biz} - Bill Summary`,
      trip.data ? `Trip: ${fmtDate(trip.data.trip_date)}` : `Trip #${id}`,
      ...d.customers.map(
        (c: A) => `${name(c.customer_id)}: ${c.total_bags} bags · ${money(c.total_amount)}`
      ),
      `Total: ${d.total_bags} bags · ${money(d.total_amount)}`,
    ].join("\n");

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(lines).then(
        () => success("Summary copied to clipboard"),
        () => { /* silent — user can still select manually */ }
      );
    }
  };

  const shareWhatsApp = () => {
    if (!d) return;
    const lines = [
      `*${p.biz} - Bill Summary*`,
      trip.data ? `Date: ${fmtDate(trip.data.trip_date)}` : `Trip #${id}`,
      ...d.customers.map(
        (c: A) => `${name(c.customer_id)}: ${c.total_bags} bags - ${money(c.total_amount)}`
      ),
      `*Total: ${d.total_bags} bags - ${money(d.total_amount)}*`,
    ].join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(lines)}`, "_blank", "noopener");
  };

  if (!d) {
    return (
      <div className="card center">
        <div
          className="avatar"
          style={{ margin: "0 auto 10px", width: 52, height: 52 }}
        >
          <Icon n="lock" size={24} />
        </div>
        <div className="b">Bill</div>
        <div className="sub mt2 mb">Hidden. Shows amounts for 30 seconds.</div>
        <Err m={err} />
        <Btn block onClick={open}>
          <Icon n="bill" size={18} />
          Show bill
        </Btn>
        <div className="row mt2">
          <Link to={`/trips/${id}/print/bill`} className="btn soft grow">
            <Icon n="print" size={18} />
            Print bill
          </Link>
          {!closed && (
            <Link to={`/trips/${id}/rates`} className="btn soft grow">
              <Icon n="rupee" size={18} />
              Set rates
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <div className="between mb" style={{ borderBottom: "1px solid var(--bd)", paddingBottom: 8 }}>
          <div className="row">
            <span
              className="badge-pill warn"
              aria-live="polite"
              aria-atomic="true"
              style={{ fontSize: "0.75rem", padding: "2px 8px", height: "auto" }}
            >
              <Icon n="clock" size={12} /> Auto-hiding in {secondsLeft}s
            </span>
          </div>
          <button
            type="button"
            className="btn sm outline"
            onClick={extendTimer}
            style={{ minHeight: 44, minWidth: 96, fontSize: "0.8rem", padding: "0 12px" }}
          >
            +30s More
          </button>
        </div>

        <div className="center mb">
          <div className="b" style={{ color: "var(--p)", fontSize: "1.2rem" }}>
            {p.biz}
          </div>
          {(p.bizAddr || p.bizPhone) && (
            <div className="sub">{[p.bizAddr, p.bizPhone].filter(Boolean).join(" · ")}</div>
          )}
          <div className="sub mt2">
            Bill · {trip.data ? fmtDate(trip.data.trip_date) : `Trip #${id}`}
          </div>
        </div>

        <table className="tbl">
          <thead>
            <tr>
              <th>Customer</th>
              <th style={{ textAlign: "right" }}>Bags</th>
              <th style={{ textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {d.customers.map((c: A) => (
              <tr key={c.trip_customer_id}>
                <td>
                  <Link
                    to={`/trips/${id}/print/bill/${c.trip_customer_id}`}
                    style={{ color: "var(--p)", fontWeight: 700 }}
                  >
                    {name(c.customer_id)}
                  </Link>
                  {!c.complete && (
                    <div className="sub" style={{ color: "var(--warn)" }}>
                      {c.unpriced_bags} bags unpriced
                    </div>
                  )}
                </td>
                <td className="num" style={{ textAlign: "right" }}>
                  {c.total_bags}
                </td>
                <td className="num b" style={{ textAlign: "right" }}>
                  {money(c.total_amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div
          className="between"
          style={{ borderTop: "2px dashed var(--bd)", paddingTop: 14, marginTop: 6 }}
        >
          <span className="b">Total · {d.total_bags} bags</span>
          <span
            className="b num"
            style={{ fontSize: "1.4rem", color: "var(--p)" }}
          >
            {money(d.total_amount)}
          </span>
        </div>

        {!d.complete && (
          <div className="alert warn mt">
            Some bags have no rate yet.
            {!closed && (
              <>
                {" "}
                <Link to={`/trips/${id}/rates`} style={{ textDecoration: "underline" }}>
                  Set rates
                </Link>
              </>
            )}
          </div>
        )}

        <div className="row mt2" style={{ gap: 8 }}>
          <button type="button" className="btn sm soft grow" onClick={copySummary}>
            <Icon n="copy" size={16} /> Copy
          </button>
          <button type="button" className="btn sm soft grow" onClick={shareWhatsApp}>
            <Icon n="share" size={16} /> WhatsApp
          </button>
        </div>

        <div className="sub mt2">Tap a customer name to print their individual bill.</div>
      </div>

      <div className="row">
        <Btn block variant="outline" onClick={() => setD(null)}>
          Hide bill
        </Btn>
        <Link to={`/trips/${id}/print/bill`} className="btn block">
          <Icon n="print" size={18} />
          Print complete bill
        </Link>
      </div>
    </>
  );
}
