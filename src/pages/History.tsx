import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fmtDate } from "../api";
import { A, AppBar, Empty, Icon, Load, byIdDesc, useAllTotals, useGet } from "../lib";

export default function History() {
  const nav = useNavigate();
  const { trips, byTrip, loading } = useAllTotals();
  const sup = useGet(["suppliers"], "/suppliers/");
  const [q, setQ] = useState("");
  const name = (id: number) => sup.data?.find((s: A) => s.id === id)?.name ?? "";
  const closed = trips.filter((t) => t.status === "CLOSED").sort(byIdDesc)
    .filter((t) => `${fmtDate(t.trip_date)} ${t.trip_date} ${name(t.supplier_id)}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <AppBar title="Trip history" sub="Closed trips. Read only" onBack={() => nav("/dashboard")} />
      <div className="page">
        <div className="srch"><Icon n="search" size={18} /><input className="input" placeholder="Search by date or supplier…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Load q={{ isPending: loading, isError: false }} />
        {!loading && closed.length === 0 && <Empty title="No closed trips found" hint="Closed trips appear here." />}
        <div className="list">
          {closed.map((t) => {
            const rows = byTrip[t.id] ?? [];
            return (
              <Link to={`/trips/${t.id}`} className="li" key={t.id}>
                <div className="avatar info"><Icon n="truck" /></div>
                <div className="grow"><div className="b">{fmtDate(t.trip_date)}</div><div className="sub">{name(t.supplier_id)} · {rows.reduce((a: number, r: A) => a + r.bags, 0)} bags · {new Set(rows.map((r: A) => r.customer_id)).size} customers</div></div>
                <span className="chev"><Icon n="chev" size={18} /></span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
