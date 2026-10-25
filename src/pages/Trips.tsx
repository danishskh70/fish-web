import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { api, fmtDate } from "../api";
import { A, AppBar, Btn, Empty, Icon, PhasePill, byIdDesc, phaseOf, useActiveTrip, useAllTotals, useGet } from "../lib";
import { downloadCsv } from "../extras";
import { SearchInput } from "../ui-feedback";

const PAGE_SIZE = 20;

// Trips tab: the one open trip on top, closed trips below. Records and history live here.
export default function Trips() {
  const nav = useNavigate();
  const { trips, byTrip, loading } = useAllTotals();
  const sup = useGet(["suppliers"], "/suppliers/");
  const { trip: active } = useActiveTrip();
  const sl = useQuery({ queryKey: ["sl", active?.id], queryFn: () => api<A[]>(`/trips/${active!.id}/supplier-lists`), enabled: !!active });
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const supName = (id: number) => sup.data?.find((s: A) => s.id === id)?.name ?? "";
  const phase = active && sl.data ? phaseOf(active, sl.data) : null;
  const sum = (rows: A[]) => rows.reduce((a, r) => a + (r.bags ?? 0), 0);

  const closed = useMemo(() => trips.filter((t) => t.status === "CLOSED").sort(byIdDesc), [trips]);
  const filtered = useMemo(
    () => closed.filter((t) => `${fmtDate(t.trip_date)} ${t.trip_date} ${supName(t.supplier_id)}`.toLowerCase().includes(q.toLowerCase())),
    [closed, q, sup.data] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const totalBags = closed.reduce((a, t) => a + sum(byTrip[t.id] ?? []), 0);

  const go = () => {
    if (!active) return;
    nav(phase === "configured" ? `/trips/${active.id}/session/start` : phase === "progress" ? `/trips/${active.id}/session` : `/trips/${active.id}`);
  };
  const cta = phase === "preparing" ? "Continue setting up" : phase === "configured" ? "Start session" : phase === "progress" ? "Continue session" : "Open trip";

  function exportCsv() {
    const rows = filtered.map((t) => {
      const r = byTrip[t.id] ?? [];
      return [t.id, t.trip_date, supName(t.supplier_id), sum(r), new Set(r.map((x: A) => x.customer_id)).size];
    });
    downloadCsv(`trips-${new Date().toISOString().slice(0, 10)}.csv`, [["Trip ID", "Trip Date", "Supplier", "Total Bags", "Customers Served"], ...rows]);
  }

  return (
    <>
      <AppBar
        title="Trips"
        right={closed.length > 0 ? <button className="ib" onClick={exportCsv} aria-label="Export past trips to CSV"><Icon n="down" /></button> : undefined}
      />
      <div className="page">
        <h2 className="shead">Current trip</h2>
        {!active ? (
          <div className="card center">
            <div className="b">No trip in progress</div>
            <div className="sub mt2 mb">Start the next distribution run.</div>
            <Btn block onClick={() => nav("/trips/new")}><Icon n="plus" size={18} />Start a new trip</Btn>
          </div>
        ) : (
          <div className="card">
            <div className="between">
              <div className="row">
                <span className="ico b"><Icon n="truck" size={20} /></span>
                <div><div className="b">{fmtDate(active.trip_date)}</div><div className="sub">{supName(active.supplier_id)}</div></div>
              </div>
              {phase && <PhasePill p={phase} />}
            </div>
            <Btn block className="mt" onClick={go} disabled={!phase}>{cta}</Btn>
          </div>
        )}

        <h2 className="shead">Past trips</h2>
        {closed.length > 0 && (
          <div className="stats">
            <div className="stat"><div className="t">Closed trips</div><div className="v num">{closed.length}</div></div>
            <div className="stat"><div className="t">Total bags handed</div><div className="v num">{totalBags}</div></div>
          </div>
        )}
        {closed.length > 0 && <SearchInput value={q} onChange={setQ} placeholder="Search by date or supplier…" className="mb" />}
        {loading && <div className="sk-list" role="status" aria-busy="true"><span className="sr-only">Loading trips</span><div className="skeleton-shimmer sk-card" /><div className="skeleton-shimmer sk-card" /></div>}
        {!loading && filtered.length === 0 && <Empty title={q ? "No trips match your search" : "No closed trips yet"} hint={q ? "Try a different date or supplier." : "Trips appear here after you close them."} />}
        <div className="list">
          {filtered.slice(0, limit).map((t) => {
            const r = byTrip[t.id] ?? [];
            const n = new Set(r.map((x: A) => x.customer_id)).size;
            return (
              <Link to={`/trips/${t.id}`} className="li" key={t.id}>
                <span className="ico b"><Icon n="truck" size={20} /></span>
                <div className="grow"><div className="b">{fmtDate(t.trip_date)}</div><div className="sub">{supName(t.supplier_id)} · {sum(r)} bags · {n} customer{n === 1 ? "" : "s"}</div></div>
                <span className="chev"><Icon n="chev" size={18} /></span>
              </Link>
            );
          })}
        </div>
        {filtered.length > limit && <div className="center mt"><Btn variant="outline" onClick={() => setLimit((l) => l + PAGE_SIZE)}>Show more ({filtered.length - limit} left)</Btn></div>}
      </div>
    </>
  );
}
