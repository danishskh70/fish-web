import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { A, AppBar, Avatar, Btn, Empty, Err, Field, Icon, Load, Sheet, post, useAct, useAllTotals, useGet } from "../lib";

export default function Customers() {
  const nav = useNavigate();
  const list = useGet(["customers"], "/customers/");
  const { byTrip } = useAllTotals();
  const { act, err, busy } = useAct([["customers"]]);
  const [s, setS] = useState("");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", phone: "", address: "" });

  const rows = (list.data ?? []).filter((c: A) => c.name.toLowerCase().includes(s.toLowerCase()));
  const stat = (cid: number) => {
    let trips = 0, bags = 0;
    Object.values(byTrip).forEach((r) => { const m = r.filter((x: A) => x.customer_id === cid); if (m.length) { trips++; bags += m.reduce((a: number, x: A) => a + x.bags, 0); } });
    return { trips, bags };
  };
  const noSelf = list.data && !list.data.some((c: A) => c.name.trim().toLowerCase() === "self");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (await act(() => post("/customers/", f))) { setOpen(false); setF({ name: "", phone: "", address: "" }); }
  }

  return (
    <>
      <AppBar title="Customers" onBack={() => nav("/dashboard")} />
      <div className="page">
        {noSelf && <div className="alert warn">No customer named <b>Self</b>. Leftover bags need it. <button style={{ textDecoration: "underline", color: "inherit", font: "inherit" }} onClick={() => { setF({ name: "Self", phone: "", address: "" }); setOpen(true); }}>Add Self</button></div>}
        {(list.data?.length ?? 0) > 8 && <input className="input mb" placeholder="Search…" value={s} onChange={(e) => setS(e.target.value)} />}
        <Load q={list} />
        {list.isSuccess && rows.length === 0 && <Empty title="No customers" hint="Tap Add." />}
        <div className="grid2">
          {rows.map((c: A) => {
            const st = stat(c.id);
            return (
              <Link to={`/customers/${c.id}`} className={`ccard ${c.is_active ? "" : "off"}`} key={c.id}>
                <Avatar name={c.name} /><div className="nm">{c.name}</div>
                <div className="sub trunc">{c.phone}</div>
                <div className="sub b">{st.trips} trips · {st.bags} bags</div>
              </Link>
            );
          })}
        </div>
      </div>
      <button className="fab" onClick={() => setOpen(true)}><Icon n="plus" />Add</button>
      {open && (
        <Sheet onClose={() => setOpen(false)}>
          <h3>New customer</h3>
          <form onSubmit={create}>
            <Field label="Name" required><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
            <Field label="Phone" required><input className="input" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} required /></Field>
            <Field label="Address" required><input className="input" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} required /></Field>
            <Err m={err} />
            <Btn block busy={busy}>Save</Btn>
          </form>
        </Sheet>
      )}
    </>
  );
}
