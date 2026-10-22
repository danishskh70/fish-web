import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { usePrefs } from "../prefs";
import { A, AppBar, Btn, Card, Err, Field, Icon, post, useAct, useActiveTrip, useGet } from "../lib";

// Step 1: configure trip only. Date, supplier, fish. Customers come later.
export default function NewTrip() {
  const nav = useNavigate();
  const { trip: active, loading } = useActiveTrip();
  const sup = useGet(["suppliers"], "/suppliers/");
  const fts = useGet(["fish-types"], "/fish-types/");
  const { act, err, busy } = useAct([["trips"]]);
  const { p } = usePrefs();
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }));
  const [sidPick, setSid] = useState("");
  const [selPick, setSel] = useState<number[] | null>(null);

  if (!loading && active) return <Navigate to={`/trips/${active.id}`} replace />;

  const suppliers = (sup.data ?? []).filter((s: A) => s.is_active);
  const fish = (fts.data ?? []).filter((x: A) => x.is_active);
  const defSup = suppliers.some((s: A) => String(s.id) === p.defSupplier) ? p.defSupplier : "";
  const sid = sidPick || defSup || (suppliers.length === 1 ? String(suppliers[0].id) : "");
  const sel = selPick ?? (p.defFish ? fish.filter((x: A) => p.defFish!.includes(x.id)).map((x: A) => x.id) : fish.map((x: A) => x.id));
  const toggle = (id: number) => setSel(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);

  async function go(e: React.FormEvent) {
    e.preventDefault(); let id = 0;
    const ok = await act(async () => { const t = await post("/trips/", { trip_date: date, supplier_id: Number(sid), fish_type_ids: sel }); id = t.id; });
    if (ok) nav(`/trips/${id}`, { replace: true });
  }

  return (
    <>
      <AppBar title="Create trip" sub="Step 1 · Trip setup" onBack={() => nav("/dashboard")} />
      <form className="page" onSubmit={go}>
        <Card>
          <Field label="Trip date" required><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></Field>
          <Field label="Supplier" required>
            <select className="input" value={sid} onChange={(e) => setSid(e.target.value)} required>
              <option value="">Choose supplier</option>
              {suppliers.map((s: A) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <div className="label">Fish types *</div>
          <div className="chips">
            {fish.map((x: A) => (
              <button type="button" key={x.id} onClick={() => toggle(x.id)} className={`chip ${sel.includes(x.id) ? "on" : ""}`}>
                {sel.includes(x.id) && <Icon n="check" size={14} />}{x.name}
              </button>
            ))}
          </div>
          {((!sup.isPending && suppliers.length === 0) || (!fts.isPending && fish.length === 0)) &&
            <div className="alert warn mt">Add suppliers and fish types first in <Link to="/settings" style={{ textDecoration: "underline" }}>Settings</Link>.</div>}
        </Card>
        <div className="sub mb">Next: add customers for this trip.</div>
        <Err m={err} />
        <Btn block busy={busy} disabled={!sid || !sel.length}>Create trip</Btn>
      </form>
    </>
  );
}
