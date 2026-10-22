import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  A,
  AppBar,
  Btn,
  Err,
  Field,
  Load,
  Num,
  Stepper,
  intOf,
  post,
  useAct,
  useGet,
  useTid,
  useTripPhase,
} from "../lib";
import { useBuzz, useLeave } from "../extras";
import { useToast } from "../ui-feedback";

// start: record the first delivery. IN_PROGRESS follows from it.
// more: record an extra delivery during the session (supplier sends more).
export default function StartSession({ more = false }: { more?: boolean }) {
  const id = useTid();
  const nav = useNavigate();
  const buzz = useBuzz();
  const { success } = useToast();
  const { sl, phase } = useTripPhase(id);
  const rt = useGet(["req", id], `/trips/${id}/requirements-table`);
  const { act, err, busy } = useAct([["slips", id], ["stock", id], ["trip", id], ["trips"]]);
  const [v, setV] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [x, setX] = useState({ vehicle: "", driver: "" });
  const [bad, setBad] = useState("");
  const leave = useLeave(Object.keys(v).length > 0 || !!x.vehicle || !!x.driver);
  const back = more ? `/trips/${id}/session` : `/trips/${id}`;

  if (!sl.data || !rt.data || !phase) {
    return (
      <>
        <AppBar
          title={more ? "Add stock" : "Start session"}
          onBack={() => nav(back)}
        />
        <Load q={sl.data ? rt : sl} />
      </>
    );
  }
  if (!more && phase === "progress") return <Navigate to={`/trips/${id}/session`} replace />;
  if (more ? phase !== "progress" : phase !== "configured") {
    return (
      <>
        <AppBar
          title={more ? "Add stock" : "Start session"}
          onBack={() => nav(back)}
        />
        <div className="page">
          <div className="alert warn">
            {phase === "closed"
              ? "Trip is closed."
              : more
              ? "Session has not started."
              : "Save trip configuration first."}
          </div>
          <Link to={`/trips/${id}`} className="btn soft block">
            Back to trip
          </Link>
        </div>
      </>
    );
  }

  const fish: A[] = rt.data.fish_types;
  const final = sl.data.find((s: A) => s.status === "FINAL");
  const dflt = (fid: number) =>
    more ? 0 : final?.items.find((i: A) => i.fish_type_id === fid)?.quantity_bags ?? 0;
  const dv = (fid: number) => v[`d${fid}`] ?? (dflt(fid) ? String(dflt(fid)) : "");
  const items = fish.map((f) => ({
    fish_type_id: f.id,
    delivered_bags: intOf(dv(f.id)),
    rejected_bags: intOf(v[`r${f.id}`] ?? ""),
    damaged_bags: intOf(v[`x${f.id}`] ?? ""),
  }));
  const total = items.reduce((a, i) => a + i.delivered_bags, 0);

  async function save() {
    setBad("");
    if (items.some((i) => i.rejected_bags + i.damaged_bags > i.delivered_bags)) {
      return setBad("Rejected + damaged bags cannot exceed delivered bags.");
    }
    const body: A = { items };
    if (final && !more) body.supplier_list_id = final.id;
    if (x.vehicle) body.vehicle = x.vehicle.trim();
    if (x.driver) body.driver = x.driver.trim();

    if (await act(() => post(`/trips/${id}/supplier-deliveries`, body))) {
      buzz();
      success(more ? "Stock added to current session" : "Session started! Proceed with distribution.");
      nav(`/trips/${id}/session`, { replace: true });
    }
  }

  return (
    <>
      <AppBar
        title={more ? "Add stock" : "Start session"}
        sub={more ? "Extra bags from supplier" : "Bags received from supplier"}
        onBack={() => leave(back)}
      />
      <div className="page nonav">
        <div className="alert info">
          {more
            ? "Enter bags that just arrived. They add to current truck stock."
            : "Enter what actually arrived from the supplier. Ordered bags are prefilled. Once recorded, the session begins."}
        </div>
        <Err m={bad || err} />
        {fish.map((f) => (
          <div className="card" key={f.id}>
            <div className="between">
              <div>
                <div className="b">{f.name}</div>
                {!more && <div className="sub">Ordered {dflt(f.id)}</div>}
              </div>
              <Stepper value={dv(f.id)} onChange={(n) => setV({ ...v, [`d${f.id}`]: n })} />
            </div>
            {open && (
              <div className="row mt">
                <div className="grow">
                  <div className="sub">Rejected</div>
                  <Num
                    className="input"
                    placeholder="0"
                    value={v[`r${f.id}`] ?? ""}
                    onChange={(e) => setV({ ...v, [`r${f.id}`]: e.target.value })}
                  />
                </div>
                <div className="grow">
                  <div className="sub">Damaged</div>
                  <Num
                    className="input"
                    placeholder="0"
                    value={v[`x${f.id}`] ?? ""}
                    onChange={(e) => setV({ ...v, [`x${f.id}`]: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
        <Btn block variant="ghost" onClick={() => setOpen(!open)}>
          {open ? "Hide details" : "Rejected, damaged, vehicle, driver details"}
        </Btn>
        {open && (
          <div className="card mt">
            <Field label="Vehicle (optional)">
              <input
                className="input"
                placeholder="e.g. WB-01-AB-1234"
                value={x.vehicle}
                onChange={(e) => setX({ ...x, vehicle: e.target.value })}
              />
            </Field>
            <Field label="Driver (optional)">
              <input
                className="input"
                placeholder="Driver name / phone"
                value={x.driver}
                onChange={(e) => setX({ ...x, driver: e.target.value })}
              />
            </Field>
          </div>
        )}
      </div>
      <div className="cta nonav">
        <Btn block busy={busy} disabled={total === 0} onClick={save}>
          {more ? "Save stock" : "Start session"} · {total} bag{total === 1 ? "" : "s"}
        </Btn>
      </div>
    </>
  );
}
