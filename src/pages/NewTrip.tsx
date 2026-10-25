import { useState, useMemo } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { usePrefs } from "../prefs";
import { ratesForTrip } from "../defaultRates";
import {
  A,
  AppBar,
  Btn,
  Card,
  Err,
  Field,
  Icon,
  post,
  useAct,
  useActiveTrip,
  useGet,
} from "../lib";
import { useToast } from "../ui-feedback";

function getTodayKolkata(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

// Step 1: configure trip only. Date, supplier, fish. Customers come later.
export default function NewTrip() {
  const nav = useNavigate();
  const { success, error: toastError } = useToast();
  const { trip: active, loading } = useActiveTrip();
  const sup = useGet(["suppliers"], "/suppliers/");
  const fts = useGet(["fish-types"], "/fish-types/");
  const { act, err, busy } = useAct([["trips"]]);
  const { p } = usePrefs();

  const [date, setDate] = useState(getTodayKolkata);
  const [sidPick, setSid] = useState("");
  const [selPick, setSel] = useState<number[] | null>(null);

  const suppliers = (sup.data ?? []).filter((s: A) => s.is_active);
  const fish = (fts.data ?? []).filter((x: A) => x.is_active);

  const defSup = suppliers.some((s: A) => String(s.id) === p.defSupplier) ? p.defSupplier : "";
  const sid = sidPick || defSup || (suppliers.length === 1 ? String(suppliers[0].id) : "");

  const sel = useMemo(() => {
    if (selPick !== null) return selPick;
    if (p.defFish && p.defFish.length > 0) {
      return fish.filter((x: A) => p.defFish!.includes(x.id)).map((x: A) => x.id);
    }
    return fish.map((x: A) => x.id);
  }, [selPick, p.defFish, fish]);

  const toggle = (id: number) =>
    setSel(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);

  const selectAll = () => setSel(fish.map((x: A) => x.id));
  const clearAll = () => setSel([]);

  if (!loading && active) return <Navigate to={`/trips/${active.id}`} replace />;

  async function go(e: React.FormEvent) {
    e.preventDefault();
    let newId = 0;
    const ok = await act(async () => {
      const t = await post("/trips/", {
        trip_date: date,
        supplier_id: Number(sid),
        fish_type_ids: sel,
      });
      newId = t.id;
    });
    if (ok) {
      success("Trip created! Add customer requirements.");
      // One-time copy of the saved default rates into this trip. Never blocks the trip.
      const rates = p.autoApplyRates ? ratesForTrip(sel) : [];
      if (rates.length) {
        try {
          await post(`/trips/${newId}/rates`, { rates }, "PUT");
          success("Default rates applied to this trip.");
        } catch {
          toastError("Trip created, but default rates were not applied. Use Rates, Apply my default rates.");
        }
      }
      nav(`/trips/${newId}`, { replace: true });
    }
  }

  return (
    <>
      <AppBar title="Create trip" sub="Step 1 · Trip setup" onBack={() => nav("/dashboard")} />
      <form className="page" onSubmit={go}>
        <Card>
          <Field label="Trip date" required>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </Field>
          <Field label="Supplier" required>
            <select
              className="input"
              value={sid}
              onChange={(e) => setSid(e.target.value)}
              required
            >
              <option value="">Choose supplier</option>
              {suppliers.map((s: A) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="between mb">
            <span className="label" style={{ marginBottom: 0 }}>
              Fish types * ({sel.length} selected)
            </span>
            <div className="row" style={{ gap: 6 }}>
              <button
                type="button"
                className="sub b"
                style={{ color: "var(--p)", fontSize: "0.78rem" }}
                onClick={selectAll}
              >
                Select all
              </button>
              <span className="sub">·</span>
              <button
                type="button"
                className="sub"
                style={{ color: "var(--mut)", fontSize: "0.78rem" }}
                onClick={clearAll}
              >
                Clear
              </button>
            </div>
          </div>

          <div className="chips">
            {fish.map((x: A) => (
              <button
                type="button"
                key={x.id}
                onClick={() => toggle(x.id)}
                className={`chip ${sel.includes(x.id) ? "on" : ""}`}
              >
                {sel.includes(x.id) && <Icon n="check" size={14} />}
                {x.name}
              </button>
            ))}
          </div>

          {((!sup.isPending && suppliers.length === 0) ||
            (!fts.isPending && fish.length === 0)) && (
            <div className="alert warn mt">
              Add suppliers and fish types first in{" "}
              <Link to="/settings" style={{ textDecoration: "underline" }}>
                Settings
              </Link>
              .
            </div>
          )}
        </Card>
        <div className="sub mb">Next: add customer requirements for this trip.</div>
        <Err m={err} />
        <Btn block busy={busy} disabled={!sid || !sel.length}>
          Create trip
        </Btn>
      </form>
    </>
  );
}
