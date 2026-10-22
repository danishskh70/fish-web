import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fmtDate } from "../api";
import {
  A,
  fmtTime,
  AppBar,
  Avatar,
  Bar,
  Btn,
  Icon,
  Load,
  PhasePill,
  Pill,
  Sheet,
  StockStrip,
  useGet,
  useNames,
  useTid,
  useTripPhase,
} from "../lib";
import { downloadCsv } from "../extras";
import BillView from "./Bill";

export default function TripDashboard() {
  const id = useTid();
  const nav = useNavigate();
  const name = useNames();
  const { t, sl, phase } = useTripPhase(id);
  const rt = useGet(["req", id], `/trips/${id}/requirements-table`);
  const sup = useGet(["suppliers"], "/suppliers/");
  const tot = useGet(["totals", id], `/trips/${id}/handover-totals`);
  const slips = useGet(["slips", id], `/trips/${id}/supplier-deliveries`);
  const [menu, setMenu] = useState(false);

  const bad = [t, sl, rt].find((q) => !q.data);
  if (bad || !phase) {
    return (
      <>
        <AppBar title="Trip" onBack={() => nav("/dashboard")} />
        <Load q={bad ?? t} />
      </>
    );
  }

  const d = rt.data;
  const trip = t.data;
  const supplier = sup.data?.find((s: A) => s.id === trip.supplier_id)?.name ?? "";
  const customers: A[] = d.customers;
  const noReq = customers.filter((c) => c.total_bags === 0);
  const draft = sl.data.find((s: A) => s.status === "DRAFT");
  const final = sl.data.find((s: A) => s.status === "FINAL");
  const handed = (cid: number) =>
    (tot.data ?? [])
      .filter((r: A) => r.customer_id === cid)
      .reduce((a: number, r: A) => a + r.bags, 0);
  const prep = phase === "preparing";
  const closed = phase === "closed";
  const stepsDone =
    1 +
    (customers.length > 0 ? 1 : 0) +
    (customers.length > 0 && noReq.length === 0 ? 1 : 0) +
    (final ? 1 : 0);

  let cta: { label: string; go: () => void } | null = null;
  if (prep) {
    if (!customers.length) cta = { label: "Add customers", go: () => nav(`/trips/${id}/add-customers`) };
    else if (noReq.length)
      cta = {
        label: `Set requirements (${noReq.length} left)`,
        go: () => nav(`/trips/${id}/customers/${noReq[0].trip_customer_id}`),
      };
    else cta = { label: "Order list & save configuration", go: () => nav(`/trips/${id}/order`) };
  } else if (phase === "configured") cta = { label: "Start session", go: () => nav(`/trips/${id}/session/start`) };
  else if (phase === "progress") cta = { label: "Continue session", go: () => nav(`/trips/${id}/session`) };

  const Step = ({ ok, label, hint }: { ok: boolean; label: string; hint: string }) => (
    <div className="li" style={{ padding: "10px 0", border: 0 }}>
      <div
        className="avatar"
        style={{
          width: 30,
          height: 30,
          background: ok ? "var(--okb)" : "#eaf0ee",
          color: ok ? "var(--ok)" : "var(--mut)",
        }}
      >
        {ok ? <Icon n="check" size={16} /> : ""}
      </div>
      <div className="grow">
        <div className="b">{label}</div>
        <div className="sub">{hint}</div>
      </div>
    </div>
  );

  const PItem = ({ to, label }: { to: string; label: string }) => (
    <Link to={to} className="li">
      <span style={{ color: "var(--p)" }}>
        <Icon n="print" />
      </span>
      <span className="grow b">{label}</span>
      <span className="chev">
        <Icon n="chev" size={18} />
      </span>
    </Link>
  );

  const exportRequirementsCsv = () => {
    const fish: A[] = d.fish_types;
    const qty = (c: A, fid: number) =>
      c.quantities?.find((q: A) => q.fish_type_id === fid)?.quantity_bags ?? 0;
    downloadCsv(`requirements-${trip.trip_date}.csv`, [
      ["Customer", "Phone", ...fish.map((f: A) => f.name), "Total"],
      ...d.customers.map((c: A) => [
        c.name,
        c.phone,
        ...fish.map((f: A) => qty(c, f.id)),
        c.total_bags,
      ]),
    ]);
  };

  return (
    <>
      <AppBar
        title={fmtDate(trip.trip_date)}
        sub={supplier}
        onBack={() => nav(closed ? "/history" : "/dashboard")}
        right={
          <>
            <button className="ib" onClick={() => setMenu(true)} aria-label="Print & Export">
              <Icon n="print" />
            </button>
            <PhasePill p={phase} />
          </>
        }
      />
      <div className="page">
        <div className="card">
          <div className="label">Fish on this trip</div>
          <div className="chips">
            {d.fish_types.map((f: A) => (
              <span key={f.id} className="chip on">
                {f.name}
              </span>
            ))}
          </div>
        </div>

        {prep && (
          <div className="card">
            <div className="between mb">
              <span className="b">Trip preparation</span>
              <span className="sub b">Step {stepsDone} of 4</span>
            </div>
            <Bar pct={(stepsDone * 100) / 4} />
            <Step ok label="Trip setup" hint={`${fmtDate(trip.trip_date)} · ${supplier}`} />
            <Step
              ok={customers.length > 0}
              label="Customers"
              hint={customers.length ? `${customers.length} added` : "Add customers for this trip"}
            />
            <Step
              ok={customers.length > 0 && noReq.length === 0}
              label="Requirements"
              hint={`${customers.length - noReq.length} of ${customers.length} set`}
            />
            <Step
              ok={!!final}
              label="Order list"
              hint={draft ? "Draft ready. Save configuration." : "Not created yet"}
            />
          </div>
        )}
        {phase === "configured" && (
          <div className="alert ok">
            Configuration saved. Start the session when the supplier arrives.
          </div>
        )}
        {closed && <div className="alert warn">This trip is closed. Read only.</div>}

        <div className="between h2">
          <span>Customers</span>
          {prep && <span className="sub">{d.grand_total_bags} bags wanted</span>}
        </div>
        <div className="grid2">
          {prep && (
            <button
              className="ccard add"
              onClick={() => nav(`/trips/${id}/add-customers`)}
            >
              <Icon n="plus" size={26} />
              Add customer
            </button>
          )}
          {customers.map((c) => {
            const got = handed(c.customer_id);
            return (
              <button
                className="ccard"
                key={c.trip_customer_id}
                onClick={() => nav(`/trips/${id}/customers/${c.trip_customer_id}`)}
              >
                <Avatar name={name(c.customer_id)} />
                <div className="nm">{c.name}</div>
                <div className="sub">Wants {c.total_bags} bags</div>
                {(phase === "progress" || closed) && <div className="sub b">Got {got}</div>}
                {prep && c.total_bags === 0 && <Pill tone="warn">No requirement</Pill>}
              </button>
            );
          })}
        </div>
        {customers.length === 0 && !prep && (
          <div className="sub center">No customers on this trip.</div>
        )}

        {closed && (
          <>
            <div className="h2">Stock summary</div>
            <StockStrip id={id} />
            <div className="h2">Deliveries from supplier</div>
            <div className="list">
              {(slips.data ?? []).map((s: A) => (
                <div className="li" key={s.id}>
                  <div className="avatar warn">
                    <Icon n="truck" />
                  </div>
                  <div className="grow">
                    <div className="b">{s.total_bags} bags</div>
                    <div className="sub trunc">
                      {s.items.map((i: A) => `${i.fish_type_name} ${i.delivered_bags}`).join(" · ")}
                    </div>
                  </div>
                  <div className="sub">{fmtTime(s.received_at).split(",")[0]}</div>
                </div>
              ))}
              {slips.isSuccess && slips.data.length === 0 && (
                <div className="li sub">No deliveries.</div>
              )}
            </div>
            <div className="h2">Bill</div>
            <BillView id={id} closed />
          </>
        )}
        {cta && (
          <div className="cta">
            <Btn block onClick={cta.go}>
              {cta.label}
            </Btn>
          </div>
        )}
      </div>

      {menu && (
        <Sheet onClose={() => setMenu(false)}>
          <h3>Print and export</h3>
          <div className="list">
            <PItem to={`/trips/${id}/print/requirements`} label="Customer requirement list" />
            <button className="li" type="button" onClick={exportRequirementsCsv}>
              <span style={{ color: "var(--p)" }}>
                <Icon n="down" />
              </span>
              <span className="grow b">Export requirements (CSV)</span>
            </button>
            {(draft || final) && (
              <PItem to={`/trips/${id}/print/order`} label="Order list for supplier" />
            )}
            {(draft || final) && <PItem to={`/trips/${id}/print/packing`} label="Packing list" />}
            <PItem to={`/trips/${id}/print/summary`} label="Trip summary" />
            {closed && <PItem to={`/trips/${id}/print/bill`} label="Complete bill" />}
          </div>
          <div className="sub mt">
            On the next page tap Print, then choose Save as PDF if you want a file.
          </div>
        </Sheet>
      )}
    </>
  );
}
