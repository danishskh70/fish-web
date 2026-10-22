import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  A,
  AppBar,
  Btn,
  Err,
  Field,
  Icon,
  Load,
  Pill,
  post,
  useAct,
  useGet,
  useNames,
  useTid,
} from "../lib";
import { useToast } from "../ui-feedback";

const OK = /^\d+(\.\d{1,2})?$/;

// Write-only: empty on open, never prefilled, cleared after save.
function RateForm({
  tripId,
  path,
  fish,
  onDone,
}: {
  tripId: number;
  path: string;
  fish: A[];
  onDone: () => void;
}) {
  const [v, setV] = useState<Record<number, string>>({});
  const [bad, setBad] = useState("");
  const { success } = useToast();
  const { act, err, busy } = useAct([
    ["rs", tripId],
    ["bill", tripId],
    ["totals", tripId],
  ]);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBad("");
    const rates = fish.filter((f) => (v[f.fish_type_id] ?? "").trim() !== "");
    if (rates.some((f) => !OK.test(v[f.fish_type_id].trim()))) {
      return setBad("Use a valid number with up to 2 decimal places.");
    }
    if (!rates.length) {
      return setBad("Enter at least one rate before saving.");
    }

    const payload = {
      rates: rates.map((f) => ({
        fish_type_id: f.fish_type_id,
        rate_per_bag: v[f.fish_type_id].trim(),
      })),
    };

    const ok = await act(() => post(path, payload, "PUT"));
    if (ok) {
      setV({});
      success("Rates saved successfully");
      onDone();
    }
  }

  return (
    <form onSubmit={go} autoComplete="off">
      {fish.map((f) => (
        <Field key={f.fish_type_id} label={f.fish_type_name}>
          <input
            className="input"
            type="password"
            inputMode="decimal"
            autoComplete="off"
            placeholder="New rate per bag (₹)"
            value={v[f.fish_type_id] ?? ""}
            onChange={(e) => setV({ ...v, [f.fish_type_id]: e.target.value })}
          />
        </Field>
      ))}
      <Err m={bad || err} />
      <Btn block busy={busy}>
        Save rates
      </Btn>
    </form>
  );
}

export default function Rates() {
  const id = useTid();
  const nav = useNavigate();
  const name = useNames();
  const t = useGet(["trip", id], `/trips/${id}`);
  const st = useGet(["rs", id], `/trips/${id}/rate-status`);
  const tcs = useGet(["tc", id], `/trips/${id}/customers`);
  const [tc, setTc] = useState("");
  const ro = t.data?.status === "CLOSED";

  return (
    <>
      <AppBar title="Rates" sub="Secret. Write only" onBack={() => nav(-1)} />
      <div className="page nonav">
        <div className="alert info">
          <Icon n="lock" size={16} /> Old rate values cannot be viewed. Saving overwrites. Unpriced
          handovers get priced. Priced lines never change.
        </div>
        <Load q={st} />
        <div className="list">
          {(st.data ?? []).map((f: A) => (
            <div className="li between" key={f.fish_type_id}>
              <span className="b">{f.fish_type_name}</span>
              {f.default_set ? (
                <Pill tone="ok">Default rate set</Pill>
              ) : (
                <Pill tone="warn">No default</Pill>
              )}
            </div>
          ))}
        </div>
        {!ro && st.data && (
          <>
            <div className="h2">Trip default rates</div>
            <div className="card">
              <RateForm
                tripId={id}
                path={`/trips/${id}/rates`}
                fish={st.data}
                onDone={() => st.refetch()}
              />
            </div>
            <div className="h2">Rate for one customer</div>
            <div className="card">
              <Field label="Customer">
                <select
                  className="input"
                  value={tc}
                  onChange={(e) => setTc(e.target.value)}
                  aria-label="Select customer for custom rate"
                >
                  <option value="">Choose customer…</option>
                  {(tcs.data ?? []).map((x: A) => (
                    <option key={x.id} value={x.id}>
                      {name(x.customer_id)}
                      {st.data.some((f: A) => f.override_trip_customer_ids.includes(x.id))
                        ? " · custom rate set"
                        : ""}
                    </option>
                  ))}
                </select>
              </Field>
              {tc && (
                <RateForm
                  key={tc}
                  tripId={id}
                  path={`/trips/${id}/customers/${tc}/rates`}
                  fish={st.data}
                  onDone={() => st.refetch()}
                />
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
