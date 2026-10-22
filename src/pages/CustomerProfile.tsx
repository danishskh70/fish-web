import { useState, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { api, fmtDate } from "../api";
import {
  A,
  AppBar,
  Avatar,
  Bar,
  Btn,
  Err,
  Field,
  Icon,
  Load,
  Pill,
  Sheet,
  byIdDesc,
  fmtTime,
  post,
  useAct,
  useGet,
  useActiveTrip,
  useTripPhase,
} from "../lib";
import { useToast } from "../ui-feedback";

// Shows only what the backend gives: trips, planned vs handed bags, handover history.
// No money. No balances. Payment tracking does not exist yet.
export default function CustomerProfile() {
  const cid = Number(useParams().customerId);
  const nav = useNavigate();
  const { success } = useToast();
  const c = useGet(["customer", cid], `/customers/${cid}`);
  const trips = useGet(["trips"], "/trips/");
  const list: A[] = [...(trips.data ?? [])].sort(byIdDesc);

  const reqs = useQueries({
    queries: list.map((t) => ({
      queryKey: ["req", t.id],
      queryFn: () => api<A>(`/trips/${t.id}/requirements-table`),
      staleTime: 60000,
    })),
  });

  const hos = useQueries({
    queries: list.map((t) => ({
      queryKey: ["ho", t.id],
      queryFn: () => api<A[]>(`/trips/${t.id}/handovers`),
      staleTime: 60000,
    })),
  });

  const { act, err, busy } = useAct([["customer", cid], ["customers"]]);
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ name: "", phone: "", address: "" });

  // Active trip integration: check if customer can be added to current preparing trip
  const { trip: activeTrip } = useActiveTrip();
  const { phase: activePhase } = useTripPhase(activeTrip?.id ?? 0);
  const activeTcs = useGet(
    ["tc", activeTrip?.id],
    activeTrip ? `/trips/${activeTrip.id}/customers` : "",
    { staleTime: 30000 }
  );

  const isOnActiveTrip = useMemo(() => {
    if (!activeTcs.data) return true;
    return (activeTcs.data as A[]).some((x) => x.customer_id === cid);
  }, [activeTcs.data, cid]);

  if (!c.data) {
    return (
      <>
        <AppBar title="Customer" onBack={() => nav("/customers")} />
        <Load q={c} />
      </>
    );
  }

  const rows = list
    .map((t, i) => {
      const req = (reqs[i]?.data as A)?.customers?.find((x: A) => x.customer_id === cid);
      const mine = ((hos[i]?.data as A[]) ?? []).filter((h) => h.customer_id === cid);
      const handed = mine.reduce((a, h) => a + h.total_bags, 0);
      return { t, planned: req?.total_bags ?? 0, mine, handed, joined: !!req || mine.length > 0 };
    })
    .filter((r) => r.joined);

  const fishMap = new Map<string, number>();
  rows.forEach((r) =>
    r.mine.forEach((h) =>
      h.lines.forEach((l: A) =>
        fishMap.set(l.fish_type_name, (fishMap.get(l.fish_type_name) ?? 0) + l.bags)
      )
    )
  );

  const byFish = [...fishMap.entries()].filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]);
  const maxFish = Math.max(1, ...byFish.map((x) => x[1]));
  const totalBags = rows.reduce((a, r) => a + r.handed, 0);

  // Accurate loading & error state
  const loading = reqs.some((q) => q.isPending) || hos.some((q) => q.isPending);
  const errorQuery = reqs.find((q) => q.isError) || hos.find((q) => q.isError);

  const open = () => {
    setF({ name: c.data.name, phone: c.data.phone, address: c.data.address });
    setEdit(true);
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const ok = await act(() => post(`/customers/${cid}`, f, "PATCH"));
    if (ok) {
      setEdit(false);
      success("Customer details updated");
    }
  }

  async function addToActiveTrip() {
    if (!activeTrip) return;
    const ok = await act(() => post(`/trips/${activeTrip.id}/customers`, { customer_id: cid }));
    if (ok) {
      success(`Added ${c.data.name} to active trip`);
      nav(`/trips/${activeTrip.id}`);
    }
  }

  const cleanPhone = c.data.phone ? c.data.phone.replace(/\D/g, "") : "";

  return (
    <>
      <AppBar
        title={c.data.name}
        sub="Customer profile"
        onBack={() => nav("/customers")}
        right={
          <button className="ib" onClick={() => window.print()} aria-label="Print profile">
            <Icon n="print" />
          </button>
        }
      />
      <div className="page">
        <div className="printonly">
          <h2>{c.data.name}</h2>
          <div>
            {c.data.phone} · {c.data.address}
          </div>
        </div>

        <div className="card">
          <div className="row">
            <Avatar name={c.data.name} />
            <div className="grow">
              <div className="b">{c.data.name}</div>
              {c.data.phone && (
                <div className="sub mt2">
                  <a
                    href={`tel:${cleanPhone}`}
                    style={{ color: "var(--p)", textDecoration: "underline" }}
                  >
                    {c.data.phone}
                  </a>
                </div>
              )}
              <div className="sub">{c.data.address}</div>
            </div>
            {!c.data.is_active && <Pill tone="warn">inactive</Pill>}
          </div>

          <div className="row mt noprint" style={{ flexWrap: "wrap", gap: 8 }}>
            <Btn sm variant="soft" onClick={open}>
              Edit
            </Btn>
            {cleanPhone && (
              <>
                <a className="btn sm outline" href={`tel:${cleanPhone}`}>
                  <Icon n="phone" size={16} /> Call
                </a>
                <a
                  className="btn sm outline"
                  href={`https://wa.me/${cleanPhone.length === 10 ? "91" + cleanPhone : cleanPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon n="share" size={16} /> WhatsApp
                </a>
              </>
            )}
            <Btn
              sm
              variant="ghost"
              busy={busy}
              onClick={() =>
                act(() =>
                  post(`/customers/${cid}/${c.data.is_active ? "deactivate" : "activate"}`)
                )
              }
            >
              {c.data.is_active ? "Deactivate" : "Activate"}
            </Btn>
          </div>

          {activeTrip && activePhase === "preparing" && !isOnActiveTrip && c.data.is_active && (
            <div
              className="mt"
              style={{ borderTop: "1px dashed var(--bd)", paddingTop: 10 }}
            >
              <Btn sm block variant="soft" busy={busy} onClick={addToActiveTrip}>
                <Icon n="plus" size={16} /> Add to current trip ({fmtDate(activeTrip.trip_date)})
              </Btn>
            </div>
          )}
        </div>

        {loading && <div className="center sub" style={{ padding: 16 }}>Loading trip records…</div>}
        {errorQuery && (
          <div className="alert bad">
            Some trip records could not be loaded.
            <button
              className="btn sm outline mt2"
              onClick={() => {
                reqs.forEach((q) => q.refetch());
                hos.forEach((q) => q.refetch());
              }}
            >
              Retry
            </button>
          </div>
        )}

        <div className="stats">
          <div className="stat">
            <div className="t">Trips joined</div>
            <div className="v num">{rows.length}</div>
          </div>
          <div className="stat">
            <div className="t">Total bags received</div>
            <div className="v num">{totalBags}</div>
          </div>
        </div>

        <div className="h2">Fish received ({totalBags} bags total)</div>
        <div className="card">
          {byFish.length === 0 && <div className="sub">Nothing handed over yet.</div>}
          {byFish.map(([n, v]) => (
            <div className="hbar" key={n}>
              <span className="trunc">{n}</span>
              <Bar pct={(v * 100) / maxFish} />
              <b className="num">{v}</b>
            </div>
          ))}
        </div>

        <div className="h2">Trips</div>
        <div className="list">
          {rows.map((r) => (
            <Link to={`/trips/${r.t.id}`} className="li" key={r.t.id}>
              <div className="avatar info">
                <Icon n="truck" />
              </div>
              <div className="grow">
                <div className="b">{fmtDate(r.t.trip_date)}</div>
                <div className="sub">
                  Planned {r.planned} · Received {r.handed}
                </div>
              </div>
              <span className="chev">
                <Icon n="chev" size={18} />
              </span>
            </Link>
          ))}
          {rows.length === 0 && !loading && <div className="li sub">Not on any trip yet.</div>}
        </div>

        <div className="h2">Handover history</div>
        <div className="list">
          {rows
            .flatMap((r) => r.mine)
            .sort((a, b) => b.id - a.id)
            .map((h) => (
              <div className="li" key={h.id}>
                <div className="grow">
                  <div className="b">
                    {h.lines
                      .filter((l: A) => l.bags > 0)
                      .map((l: A) => `${l.fish_type_name} ${l.bags}`)
                      .join(" · ")}
                  </div>
                  <div className="sub">
                    {fmtTime(h.handed_over_at)}
                    {h.note ? ` · ${h.note}` : ""}
                  </div>
                </div>
                <div className="b num">{h.total_bags}</div>
              </div>
            ))}
          {totalBags === 0 && !loading && <div className="li sub">No handovers yet.</div>}
        </div>

        <div className="card sub">
          <Icon n="rupee" size={16} /> Amount paid and balance will appear here when payment
          tracking is added.
        </div>
      </div>

      {edit && (
        <Sheet onClose={() => setEdit(false)}>
          <h3>Edit customer</h3>
          <form onSubmit={save}>
            <Field label="Name" required>
              <input
                className="input"
                value={f.name}
                onChange={(e) => setF({ ...f, name: e.target.value })}
                required
              />
            </Field>
            <Field label="Phone" required>
              <input
                className="input"
                inputMode="tel"
                value={f.phone}
                onChange={(e) => setF({ ...f, phone: e.target.value })}
                required
              />
            </Field>
            <Field label="Address" required>
              <input
                className="input"
                value={f.address}
                onChange={(e) => setF({ ...f, address: e.target.value })}
                required
              />
            </Field>
            <Err m={err} />
            <Btn block busy={busy}>
              Save
            </Btn>
          </form>
        </Sheet>
      )}
    </>
  );
}
