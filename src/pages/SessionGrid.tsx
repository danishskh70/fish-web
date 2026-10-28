import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
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
  Pill,
  Seg,
  useGet,
  LIVE,
  useTid,
  useTripPhase,
} from "../lib";
import { useWakeLock, downloadCsv } from "../extras";
import { usePrefs } from "../prefs";
import { useSessionDone } from "../session";
import { SearchInput } from "../ui-feedback";

// Home of the distribution session. Leaves by finishing trip or peeking at dashboard.
export default function SessionGrid() {
  const id = useTid();
  const nav = useNavigate();
  const { done } = useSessionDone();
  const { p } = usePrefs();
  useWakeLock(p.awake);

  const [view, setView] = useState("customers");
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const { t, phase } = useTripPhase(id);
  const rt = useGet(["req", id], `/trips/${id}/requirements-table`);
  const tcs = useGet(["tc", id], `/trips/${id}/customers`, LIVE);
  const stock = useGet(["stock", id], `/trips/${id}/stock`, LIVE);
  const tot = useGet(["totals", id], `/trips/${id}/handover-totals`, LIVE);
  const cust = useGet(["customers"], "/customers/");
  const slips = useGet(["slips", id], `/trips/${id}/supplier-deliveries`, LIVE);

  const hdr = (
    <AppBar
      title="Session"
      sub={t.data ? fmtDate(t.data.trip_date) : ""}
      right={
        <div className="row" style={{ gap: 6 }}>
          <button
            className="ib"
            onClick={() => nav("/settings")}
            aria-label="Settings"
            title="Settings"
          >
            <Icon n="sliders" size={20} />
          </button>
          <button
            className="ib"
            onClick={() => nav("/customers")}
            aria-label="Customers"
            title="Customers"
          >
            <Icon n="users" size={20} />
          </button>
        </div>
      }
    />
  );

  if (!t.data || !phase || !rt.data || !tcs.data) {
    return (
      <>
        {hdr}
        <Load q={!t.data ? t : !rt.data ? rt : tcs} />
      </>
    );
  }
  if (phase !== "progress") return <Navigate to={`/trips/${id}`} replace />;

  const nameOf = (cid: number) => cust.data?.find((c: A) => c.id === cid)?.name ?? `#${cid}`;
  const planned = (cid: number) =>
    rt.data.customers.find((c: A) => c.customer_id === cid)?.total_bags ?? 0;
  const handed = (cid: number) =>
    (tot.data ?? [])
      .filter((r: A) => r.customer_id === cid)
      .reduce((a: number, r: A) => a + r.bags, 0);

  const cards = (tcs.data as A[]).map((x) => ({
    x,
    name: nameOf(x.customer_id),
    planned: planned(x.customer_id),
    handed: handed(x.customer_id),
  }));

  const status = (c: A) => (done.has(c.x.id) ? "done" : c.handed > 0 ? "recorded" : "awaiting");
  const label: Record<string, string> = {
    awaiting: "Awaiting handover",
    recorded: "Handover recorded",
    done: "Completed",
  };

  const count = (s: string) => cards.filter((c) => status(c) === s).length;
  const required = cards.filter((c) => c.planned > 0);
  const pending = required.filter((c) => c.handed === 0);
  const allDone = required.length > 0 && pending.length === 0;
  const doneCount = required.length - pending.length;

  const shown = cards.filter(
    (c) =>
      (filter === "all" || status(c) === filter) &&
      c.name.toLowerCase().includes(q.toLowerCase())
  );

  const stockStatus = (l: A): ["ok" | "warn" | "bad" | "mut", string] =>
    !l.on_slip
      ? ["mut", "Not arrived"]
      : l.left_bags < 0
      ? ["bad", "Over-handed"]
      : l.left_bags === 0
      ? ["mut", "Empty"]
      : l.left_bags <= p.lowStock
      ? ["warn", "Low stock"]
      : ["ok", "In stock"];

  function exportStockCsv() {
    if (!stock.data) return;
    const rows = stock.data.map((l: A) => [
      l.fish_type_name,
      l.on_slip ? l.slip_bags : 0,
      l.delivered_bags,
      l.rejected_bags,
      l.damaged_bags,
      l.handed_bags,
      l.left_bags,
    ]);
    downloadCsv(`session-stock-${t.data?.trip_date}.csv`, [
      ["Fish", "Slip Bags", "Delivered", "Rejected", "Damaged", "Handed", "Left"],
      ...rows,
    ]);
  }

  return (
    <>
      {hdr}
      <div className="page nonav">
        <Seg
          value={view}
          onChange={setView}
          items={[
            ["customers", "Customers"],
            ["stock", "Stock"],
            ["deliveries", "Deliveries"],
          ]}
        />

        {view === "customers" && (
          <>
            {stock.data && (
              <div className="chips mb">
                {stock.data.map((l: A) => (
                  <span
                    key={l.fish_type_id}
                    className="chip on"
                    style={
                      l.left_bags < 0
                        ? { background: "var(--bad)", borderColor: "var(--bad)" }
                        : undefined
                    }
                  >
                    {l.fish_type_name}: {l.left_bags} left
                  </span>
                ))}
              </div>
            )}
            <div className="card">
              <div className="between">
                <span className="b">Handovers</span>
                <span className="sub b">
                  {doneCount} of {required.length}
                </span>
              </div>
              <div className="sub mt2 live">
                <i aria-hidden="true" /> Live · updated{" "}
                {tot.dataUpdatedAt
                  ? new Date(tot.dataUpdatedAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
                  : "now"}
              </div>
              <div className="mt2">
                <Bar pct={required.length ? (doneCount * 100) / required.length : 0} />
              </div>
            </div>

            <div className="tools-sticky">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Search customer by name…"
              className="mb"
            />

            <Seg
              value={filter}
              onChange={setFilter}
              items={[
                ["all", `All (${cards.length})`],
                ["awaiting", `Awaiting (${count("awaiting")})`],
                ["recorded", `Recorded (${count("recorded")})`],
                ["done", `Completed (${count("done")})`],
              ]}
            />
            </div>

            <div className="grid2">
              {shown.map((c) => {
                const s = status(c);
                return (
                  <button
                    key={c.x.id}
                    className={`ccard ${s}`}
                    onClick={() => nav(`/trips/${id}/session/customers/${c.x.id}`)}
                  >
                    <span
                      className="status-ic"
                      aria-hidden="true"
                      style={{ color: s === "done" ? "var(--ok)" : s === "recorded" ? "var(--info)" : "var(--warn)" }}
                    >
                      <Icon n={s === "done" ? "checks" : s === "recorded" ? "check" : "clock"} size={22} />
                    </span>
                    <Avatar name={c.name} />
                    <div className="nm">{c.name}</div>
                    <div className="sub">
                      Wants {c.planned} · Got {c.handed}
                    </div>
                    <div
                      className="sub b"
                      style={{
                        color:
                          s === "done"
                            ? "var(--ok)"
                            : s === "recorded"
                            ? "var(--info)"
                            : "var(--warn)",
                      }}
                    >
                      <span className="dot" aria-hidden="true" />
                      {label[s]}
                    </div>
                  </button>
                );
              })}
              <button
                className="ccard add"
                onClick={() => nav(`/trips/${id}/session/add`)}
              >
                <Icon n="plus" size={26} />
                Unexpected customer
              </button>
            </div>
            {shown.length === 0 && <div className="sub center">No customers match.</div>}
            <div className="sub center mt2">
              Completed means the payment step was finished.
            </div>
          </>
        )}

        {view === "stock" && (
          <>
            <div className="between mb">
              <span className="b">Stock levels</span>
              <Btn sm variant="outline" onClick={exportStockCsv}>
                <Icon n="down" size={16} /> Export CSV
              </Btn>
            </div>
            {(stock.data ?? []).map((l: A) => {
              const [tone, text] = stockStatus(l);
              return (
                <div className="card" key={l.fish_type_id}>
                  <div className="between">
                    <div className="row">
                      <span className="avatar info">
                        <Icon n="fish" />
                      </span>
                      <div className="b">{l.fish_type_name}</div>
                    </div>
                    <Pill tone={tone}>{text}</Pill>
                  </div>
                  <div className="between mt">
                    <div
                      className="num"
                      style={{
                        fontSize: "1.8rem",
                        fontWeight: 800,
                        color: l.left_bags < 0 ? "var(--bad)" : undefined,
                      }}
                    >
                      {l.on_slip ? l.left_bags : "—"}{" "}
                      <small className="sub">bags left</small>
                    </div>
                    <div className="sub" style={{ textAlign: "right" }}>
                      Received {l.on_slip ? l.slip_bags : 0}
                      <br />
                      Handed {l.handed_bags}
                    </div>
                  </div>
                  <div className="mt2">
                    <Bar
                      pct={l.slip_bags ? (l.handed_bags * 100) / l.slip_bags : 0}
                      bad={l.left_bags < 0}
                    />
                  </div>
                  {(l.rejected_bags > 0 || l.damaged_bags > 0) && (
                    <div className="sub mt2">
                      Rejected {l.rejected_bags} · Damaged {l.damaged_bags} (info only)
                    </div>
                  )}
                </div>
              );
            })}
            <Btn
              block
              variant="soft"
              onClick={() => nav(`/trips/${id}/session/receive`)}
            >
              <Icon n="plus" size={18} />
              Add stock
            </Btn>
          </>
        )}

        {view === "deliveries" && (
          <>
            <div className="list">
              {(slips.data ?? []).map((s: A) => {
                const short = s.items.reduce(
                  (a: number, i: A) => a + (i.shortage_bags ?? 0),
                  0
                );
                const rej = s.items.reduce(
                  (a: number, i: A) => a + i.rejected_bags + i.damaged_bags,
                  0
                );
                return (
                  <div className="li" key={s.id} style={{ alignItems: "flex-start" }}>
                    <div className="avatar warn">
                      <Icon n="truck" />
                    </div>
                    <div className="grow">
                      <div className="b">
                        {s.total_bags} bags · {fmtTime(s.received_at)}
                      </div>
                      <div className="sub">
                        {s.items
                          .map((i: A) => `${i.fish_type_name} ${i.delivered_bags}`)
                          .join(" · ")}
                      </div>
                      <div className="sub">{[s.vehicle, s.driver].filter(Boolean).join(" · ")}</div>
                      <div className="row mt2">
                        {short > 0 && <Pill tone="bad">Short {short}</Pill>}
                        {rej > 0 && <Pill tone="warn">Rejected/damaged {rej}</Pill>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {slips.isSuccess && slips.data.length === 0 && (
                <div className="li sub">No deliveries recorded yet.</div>
              )}
            </div>
            <Btn
              block
              variant="soft"
              onClick={() => nav(`/trips/${id}/session/receive`)}
            >
              <Icon n="plus" size={18} />
              Add stock
            </Btn>
          </>
        )}
      </div>

      <div className="cta nonav">
        {allDone && (
          <div className="alert ok" style={{ marginBottom: 8 }}>
            All handovers recorded.
          </div>
        )}
        <div className="row">
          {pending.length > 0 && (
            <Btn
              variant="soft"
              className="grow"
              onClick={() => nav(`/trips/${id}/session/customers/${pending[0].x.id}`)}
            >
              Next awaiting
            </Btn>
          )}
          <Btn
            className="grow"
            variant={allDone ? "" : "outline"}
            onClick={() => nav(`/trips/${id}/session/finish`)}
          >
            {allDone ? "Bill & close" : `Finish (${pending.length})`}
          </Btn>
        </div>
      </div>
    </>
  );
}