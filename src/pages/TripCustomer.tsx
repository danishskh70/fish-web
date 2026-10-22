import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError, fmtShort } from "../api";
import { A, AppBar, Avatar, Btn, Err, Icon, Load, Stepper, intOf, post, useAct, useGet, useTid, useTripPhase } from "../lib";
import { useBuzz, useLeave } from "../extras";

// Preparing: set planned requirements. Any other phase: read-only planned vs handed.
// Requirements are never rewritten by handovers.
export default function TripCustomer() {
  const id = useTid(); const tcId = Number(useParams().tcId); const nav = useNavigate(); const buzz = useBuzz();
  const { t, phase } = useTripPhase(id);
  const rt = useGet(["req", id], `/trips/${id}/requirements-table`);
  const tcs = useGet(["tc", id], `/trips/${id}/customers`);
  const cust = useGet(["customers"], "/customers/");
  const tot = useGet(["totals", id], `/trips/${id}/handover-totals`);
  const { act, err, busy } = useAct([["req", id], ["sl", id]]);
  const [v, setV] = useState<Record<number, string>>({});
  const [bad, setBad] = useState("");

  const list: A[] = rt.data?.customers ?? [];
  const idx = list.findIndex((c) => c.trip_customer_id === tcId);
  const row = list[idx];
  const planned = (fid: number) => row?.quantities.find((q: A) => q.fish_type_id === fid)?.quantity_bags ?? 0;
  const dirty = !!row && Object.entries(v).some(([fid, s]) => intOf(s) !== planned(Number(fid)));
  const leave = useLeave(dirty);

  if (!rt.data || !tcs.data || !phase || !row) return <><AppBar title="Customer" onBack={() => nav(`/trips/${id}`)} /><Load q={rt.data ? tcs : rt} /></>;
  const info = cust.data?.find((c: A) => c.id === row.customer_id);
  const handed = (fid: number) => (tot.data ?? []).filter((r: A) => r.customer_id === row.customer_id && r.fish_type_id === fid).reduce((a: number, r: A) => a + r.bags, 0);
  const val = (fid: number) => v[fid] ?? (planned(fid) ? String(planned(fid)) : "");
  const edit = phase === "preparing";
  const prev = list[idx - 1]; const next = list[idx + 1];
  const crumb = `${t.data ? fmtShort(t.data.trip_date) : "Trip"} › Customer ${idx + 1} of ${list.length}`;

  async function save(goTo: string) {
    setBad("");
    const changes = rt.data.fish_types.map((f: A) => ({ fid: f.id, cur: planned(f.id), n: intOf(val(f.id)) })).filter((c: A) => c.n !== c.cur);
    if (changes.some((c: A) => c.n === 0)) return setBad("A saved requirement cannot go below 1.");
    const ok = await act(async () => {
      for (const c of changes) {
        try { await post(`/trips/${id}/customers/${row.customer_id}/requirements`, { fish_type_id: c.fid, quantity_bags: c.n }); }
        catch (e) {
          if ((e as ApiError).status !== 409) throw e;
          const l = await api<A[]>(`/trips/${id}/customers/${row.customer_id}/requirements`);
          const r = l.find((x) => x.fish_type_id === c.fid);
          if (!r) throw e;
          await post(`/trips/${id}/customers/${row.customer_id}/requirements/${r.id}`, { quantity_bags: c.n }, "PATCH");
        }
      }
    });
    if (ok) { buzz(); setV({}); nav(goTo, { replace: true }); }
  }

  return (
    <>
      <AppBar title={row.name} sub={crumb} onBack={() => leave(`/trips/${id}`)} />
      <div className="page">
        <div className="card row"><Avatar name={row.name} /><div><div className="b">{row.name}</div><div className="sub">{[info?.phone, info?.address].filter(Boolean).join(" · ")}</div></div></div>
        <Err m={bad || err} />
        {rt.data.fish_types.map((f: A) => (
          <div className="card" key={f.id}>
            <div className="between">
              <div><div className="b">{f.name}</div>{!edit && <div className="sub">Planned {planned(f.id)} · Handed {handed(f.id)}</div>}</div>
              {edit ? <Stepper value={val(f.id)} onChange={(n) => setV({ ...v, [f.id]: n })} /> : <div className="b num" style={{ fontSize: "1.3rem" }}>{handed(f.id)}<span className="sub"> / {planned(f.id)}</span></div>}
            </div>
          </div>
        ))}
        {!edit && (
          <div className="row">
            <Link to={`/trips/${id}/print/slip/${tcId}`} className="btn soft grow"><Icon n="print" size={18} />Slip</Link>
            {phase === "closed" && <Link to={`/trips/${id}/print/bill/${tcId}`} className="btn soft grow"><Icon n="bill" size={18} />Bill</Link>}
          </div>
        )}
        {edit && (
          <div className="cta">
            <div className="row">
              {prev && <Btn variant="outline" disabled={busy} onClick={() => leave(`/trips/${id}/customers/${prev.trip_customer_id}`, { replace: true })} aria-label="Previous"><Icon n="back" size={18} /></Btn>}
              <Btn block busy={busy} onClick={() => save(next ? `/trips/${id}/customers/${next.trip_customer_id}` : `/trips/${id}`)}>{next ? "Save & next customer" : "Save & finish"}</Btn>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
