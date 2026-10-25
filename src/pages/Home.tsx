import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { api, fmtDate, fmtShort } from "../api";
import {
  A,
  AppBar,
  Avatar,
  Bar,
  Btn,
  Icon,
  PhasePill,
  Seg,
  byIdDesc,
  phaseOf,
  useActiveTrip,
  useAllTotals,
  useGet,
} from "../lib";
import { useInstall } from "../extras";
import { usePrefs } from "../prefs";

const sum = (r: A[]) => r.reduce((a, x) => a + (x.bags ?? 0), 0);

function Bars({ items }: { items: [string, number][] }) {
  const max = Math.max(1, ...items.map((i) => i[1]));
  return (
    <>
      {items.map(([l, n], i) => (
        <div className="hbar" key={l + i}>
          <span className="trunc">{l}</span>
          <Bar pct={(n * 100) / max} />
          <b className="num">{n}</b>
        </div>
      ))}
    </>
  );
}

const StatCard = ({
  ic,
  tone,
  v,
  t,
}: {
  ic: string;
  tone: string;
  v: React.ReactNode;
  t: string;
}) => (
  <div className="statc">
    <span className={`ic ${tone}`}>
      <Icon n={ic} />
    </span>
    <div>
      <div className="v num">{v}</div>
      <div className="t">{t}</div>
    </div>
  </div>
);

export default function Home() {
  const nav = useNavigate();
  const { p, set } = usePrefs();
  const { canInstall, install } = useInstall();
  const { trips, byTrip, loading } = useAllTotals();
  const sup = useGet(["suppliers"], "/suppliers/");
  const cust = useGet(["customers"], "/customers/");
  const me = useGet(["me"], "/auth/me");
  const { trip: active } = useActiveTrip();
  const aid = active?.id;

  const sl = useQuery({
    queryKey: ["sl", aid],
    queryFn: () => api<A[]>(`/trips/${aid}/supplier-lists`),
    enabled: !!active,
  });
  const rt = useQuery({
    queryKey: ["req", aid],
    queryFn: () => api<A>(`/trips/${aid}/requirements-table`),
    enabled: !!active,
  });

  const [range, setRange] = useState("30");
  const [showPast, setShowPast] = useState(false);
  const phase = active && sl.data ? phaseOf(active, sl.data) : null;

  const supName = (id: number) => sup.data?.find((s: A) => s.id === id)?.name ?? "";
  const custName = (id: number) => cust.data?.find((c: A) => c.id === id)?.name ?? `#${id}`;

  const closed = useMemo(() => {
    return trips.filter((t) => t.status === "CLOSED").sort(byIdDesc);
  }, [trips]);

  const rows = useMemo(() => {
    return closed.flatMap((t) => byTrip[t.id] ?? []);
  }, [closed, byTrip]);

  const totalBags = useMemo(() => sum(rows), [rows]);

  const { byFish, top, custMap } = useMemo(() => {
    const fishMap = new Map<string, number>();
    const cMap = new Map<number, number>();
    rows.forEach((r) => {
      fishMap.set(r.fish_type_name, (fishMap.get(r.fish_type_name) ?? 0) + (r.bags ?? 0));
      cMap.set(r.customer_id, (cMap.get(r.customer_id) ?? 0) + (r.bags ?? 0));
    });
    const bf = [...fishMap.entries()].sort((a, b) => b[1] - a[1]);
    const tp = [...cMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, n]) => [custName(id), n] as [string, number]);
    return { byFish: bf, top: tp, custMap: cMap };
  }, [rows, cust.data]);

  const days = Number(range);
  const inRange = useMemo(() => {
    return closed
      .filter((t) => Date.now() - new Date(t.trip_date).getTime() <= days * 86400000)
      .reverse();
  }, [closed, days]);

  const chart = useMemo(() => {
    return inRange.map(
      (t) => [fmtShort(t.trip_date), sum(byTrip[t.id] ?? [])] as [string, number]
    );
  }, [inRange, byTrip]);

  const rangeTotal = useMemo(() => chart.reduce((a, b) => a + b[1], 0), [chart]);

  const order =
    sl.data?.find((s: A) => s.status === "FINAL") ??
    sl.data?.find((s: A) => s.status === "DRAFT");

  const go = () => {
    if (!active) return;
    nav(
      phase === "configured"
        ? `/trips/${aid}/session/start`
        : phase === "progress"
        ? `/trips/${aid}/session`
        : `/trips/${aid}`
    );
  };

  const cta =
    phase === "preparing"
      ? "Continue configuration"
      : phase === "configured"
      ? "Start session"
      : phase === "progress"
      ? "Continue session"
      : "Open trip";

  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const user = me.data?.username ?? "";

  const avgPerTrip = closed.length > 0 ? Math.round(totalBags / closed.length) : 0;
  const avgPerCust = custMap.size > 0 ? (totalBags / custMap.size).toFixed(1) : "0";

  return (
    <>
      <AppBar title="FishSeed Manager" logo />
      <div className="page">
        <div className="row mb">
          <Avatar name={user || "O"} />
          <div className="grow">
            <div className="sub">{hello}</div>
            <div className="b" style={{ textTransform: "capitalize" }}>
              {user || "Owner"}
            </div>
          </div>
          <div className="sub b">{fmtDate(new Date().toISOString())}</div>
        </div>

        {canInstall && !p.installDismissed && (
          <div className="install">
            <span className="avatar">
              <Icon n="fish" />
            </span>
            <div className="grow">
              <div className="b">Install FishSeed Manager</div>
              <div className="sub">Add to home screen for quick access</div>
            </div>
            <Btn sm variant="ghost" onClick={() => set({ installDismissed: true })}>
              Not now
            </Btn>
            <Btn sm onClick={install}>
              Add
            </Btn>
          </div>
        )}

        <div className="h2">Current trip</div>
        {!active ? (
          <div className="card center">
            <div className="b">No active trip</div>
            <div className="sub mt2 mb">Start the next distribution run.</div>
            <Btn block onClick={() => nav("/trips/new")}>
              <Icon n="plus" size={18} />
              Create trip
            </Btn>
          </div>
        ) : (
          <>
            <div className="hero">
              <div className="between">
                <div>
                  <div className="sub">{supName(active.supplier_id) || "Trip"}</div>
                  <div className="b" style={{ fontSize: "1.3rem" }}>
                    {fmtDate(active.trip_date)}
                  </div>
                </div>
                {phase && <PhasePill p={phase} />}
              </div>
              <button className="next" onClick={go} disabled={!phase}>
                <div className="grow">
                  <div className="nl">{cta}</div>
                  <div className="ns">One active trip at a time</div>
                </div>
                <span className="go">
                  <Icon n="right" />
                </span>
              </button>
            </div>
            <div className="grid2">
              <StatCard
                ic="users"
                tone="g"
                v={rt.data?.customers.length ?? "–"}
                t="Customers"
              />
              <StatCard
                ic="box"
                tone="o"
                v={rt.data?.grand_total_bags ?? "–"}
                t="Bags wanted"
              />
              <StatCard
                ic="list"
                tone="b"
                v={order ? order.total_bags : "–"}
                t="Order list bags"
              />
              <StatCard
                ic="truck"
                tone="p"
                v={fmtShort(active.trip_date)}
                t="Trip date"
              />
            </div>
          </>
        )}

        <button
          type="button"
          className="fold"
          aria-expanded={showPast}
          onClick={() => setShowPast(!showPast)}
        >
          <span className="grow">
            <span className="b">Past trips and customers</span>
            <span className="sub" style={{ display: "block" }}>
              {closed.length} closed trip{closed.length === 1 ? "" : "s"} · {totalBags} bags
            </span>
          </span>
          <span className="fold-chev" aria-hidden="true">
            <Icon n="chevd" size={22} />
          </span>
        </button>
        {showPast && (
          <>
        <div className="h2">Past trips summary</div>
        {loading && (
          <div className="center sub" style={{ padding: 20 }}>
            <div
              className="spin"
              style={{
                margin: "0 auto 8px",
                borderColor: "rgba(11, 122, 95, 0.2)",
                borderTopColor: "var(--p)",
              }}
            />
            Loading analytics…
          </div>
        )}
        {!loading && closed.length === 0 && (
          <div className="card sub center">
            Analytics appear after your first closed trip.
          </div>
        )}
        {closed.length > 0 && (
          <>
            <div className="grid2">
              <StatCard ic="flag" tone="g" v={closed.length} t="Closed trips" />
              <StatCard ic="box" tone="b" v={totalBags} t="Bags handed" />
              <StatCard ic="users" tone="o" v={custMap.size} t="Customers served" />
              <StatCard ic="truck" tone="p" v={avgPerTrip} t="Avg bags / trip" />
            </div>
            <div className="card">
              <div className="between">
                <div className="b">Sales overview (bags)</div>
                <span className="sub b" style={{ color: "var(--p)" }}>
                  {rangeTotal} bags in range
                </span>
              </div>
              <div className="sub mt2 mb">
                {inRange.length} trip{inRange.length === 1 ? "" : "s"} completed in this period
              </div>
              <Seg
                value={range}
                onChange={setRange}
                items={[
                  ["7", "7 days"],
                  ["30", "30 days"],
                  ["90", "3 months"],
                ]}
              />
              {chart.length === 0 ? (
                <div className="sub mt2">No closed trips in this period.</div>
              ) : (
                <Bars items={chart} />
              )}
            </div>
            <div className="card">
              <div className="b mb">Bags by fish</div>
              <Bars items={byFish} />
            </div>
            <div className="card">
              <div className="between mb">
                <div className="b">Top customers</div>
                <span className="sub">Avg {avgPerCust} bags/customer</span>
              </div>
              <Bars items={top} />
            </div>
          </>
        )}

        <div className="between h2">
          <span>Trip history</span>
          <Link to="/trips" className="sub b" style={{ color: "var(--p)" }}>
            View all
          </Link>
        </div>
        <div className="list">
          {closed.slice(0, 3).map((t) => (
            <Link to={`/trips/${t.id}`} className="li" key={t.id}>
              <div className="avatar info">
                <Icon n="truck" />
              </div>
              <div className="grow">
                <div className="b">{fmtDate(t.trip_date)}</div>
                <div className="sub">
                  {supName(t.supplier_id)} · {sum(byTrip[t.id] ?? [])} bags
                </div>
              </div>
              <span className="chev">
                <Icon n="chev" size={18} />
              </span>
            </Link>
          ))}
          {closed.length === 0 && <div className="li sub">No closed trips yet.</div>}
        </div>

        <div className="between h2">
          <span>Customers</span>
          <Link to="/customers" className="sub b" style={{ color: "var(--p)" }}>
            View all
          </Link>
        </div>
        <div className="grid2">
          {(cust.data ?? []).slice(0, 6).map((c: A) => (
            <Link
              to={`/customers/${c.id}`}
              className={`ccard ${c.is_active ? "" : "off"}`}
              key={c.id}
            >
              <Avatar name={c.name} />
              <div className="nm">{c.name}</div>
              <div className="sub trunc">{c.phone}</div>
            </Link>
          ))}
        </div>
          </>
        )}
      </div>
    </>
  );
}
