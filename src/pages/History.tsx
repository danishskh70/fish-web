import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fmtDate } from "../api";
import { A, AppBar, Btn, Empty, Icon, byIdDesc, useAllTotals, useGet } from "../lib";
import { downloadCsv } from "../extras";
import { SearchInput } from "../ui-feedback";

const PAGE_SIZE = 20;

export default function History() {
  const nav = useNavigate();
  const { trips, byTrip, loading } = useAllTotals();
  const sup = useGet(["suppliers"], "/suppliers/");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const name = (id: number) => sup.data?.find((s: A) => s.id === id)?.name ?? "";

  const allClosed = useMemo(() => {
    return trips.filter((t) => t.status === "CLOSED").sort(byIdDesc);
  }, [trips]);

  const filtered = useMemo(() => {
    return allClosed.filter((t) =>
      `${fmtDate(t.trip_date)} ${t.trip_date} ${name(t.supplier_id)}`
        .toLowerCase()
        .includes(q.toLowerCase())
    );
  }, [allClosed, q, sup.data]);

  // Aggregate stats over closed trips
  const totals = useMemo(() => {
    let bags = 0;
    const custSet = new Set<number>();
    allClosed.forEach((t) => {
      const rows = byTrip[t.id] ?? [];
      rows.forEach((r: A) => {
        bags += r.bags ?? 0;
        custSet.add(r.customer_id);
      });
    });
    return { trips: allClosed.length, bags, customers: custSet.size };
  }, [allClosed, byTrip]);

  const paged = filtered.slice(0, limit);

  function handleExportCsv() {
    const rows = filtered.map((t) => {
      const rows = byTrip[t.id] ?? [];
      const totalBags = rows.reduce((a: number, r: A) => a + (r.bags ?? 0), 0);
      const custCount = new Set(rows.map((r: A) => r.customer_id)).size;
      return [t.id, t.trip_date, name(t.supplier_id), totalBags, custCount];
    });

    downloadCsv(`trip-history-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Trip ID", "Trip Date", "Supplier", "Total Bags", "Customers Served"],
      ...rows,
    ]);
  }

  return (
    <>
      <AppBar
        title="Trip history"
        sub="Closed trips · Read only"
        onBack={() => nav("/dashboard")}
        right={
          allClosed.length > 0 ? (
            <button
              className="ib"
              onClick={handleExportCsv}
              aria-label="Export history to CSV"
            >
              <Icon n="down" />
            </button>
          ) : undefined
        }
      />
      <div className="page">
        {allClosed.length > 0 && (
          <div className="stats">
            <div className="stat">
              <div className="t">Closed trips</div>
              <div className="v num">{totals.trips}</div>
            </div>
            <div className="stat">
              <div className="t">Total bags handed</div>
              <div className="v num">{totals.bags}</div>
            </div>
          </div>
        )}

        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Search by date or supplier…"
          className="mb"
        />

        {loading && (
          <div className="center sub" style={{ padding: 24 }}>
            <div
              className="spin"
              style={{
                margin: "0 auto 8px",
                borderColor: "rgba(11, 122, 95, 0.2)",
                borderTopColor: "var(--p)",
              }}
            />
            Loading trips…
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <Empty
            title="No closed trips found"
            hint={q ? "No results match your search." : "Trips appear here after they are closed."}
          />
        )}

        <div className="list">
          {paged.map((t) => {
            const rows = byTrip[t.id] ?? [];
            const bagSum = rows.reduce((a: number, r: A) => a + r.bags, 0);
            const custCount = new Set(rows.map((r: A) => r.customer_id)).size;
            return (
              <Link to={`/trips/${t.id}`} className="li" key={t.id}>
                <div className="avatar info">
                  <Icon n="truck" />
                </div>
                <div className="grow">
                  <div className="b">{fmtDate(t.trip_date)}</div>
                  <div className="sub">
                    {name(t.supplier_id)} · {bagSum} bags · {custCount} customer
                    {custCount === 1 ? "" : "s"}
                  </div>
                </div>
                <span className="chev">
                  <Icon n="chev" size={18} />
                </span>
              </Link>
            );
          })}
        </div>

        {filtered.length > limit && (
          <div className="center mt">
            <Btn
              variant="outline"
              onClick={() => setLimit((l) => l + PAGE_SIZE)}
            >
              Show more ({filtered.length - limit} remaining)
            </Btn>
          </div>
        )}
      </div>
    </>
  );
}
