import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLeave } from "../extras";
import {
  A,
  AppBar,
  Avatar,
  Btn,
  Empty,
  Err,
  Field,
  Icon,
  Load,
  Sheet,
  byIdDesc,
  post,
  useAct,
  useGet,
  useTid,
  useTripPhase,
} from "../lib";
import { SearchInput, useToast } from "../ui-feedback";

// Pick existing customers for this trip. Never creates duplicates of an existing record.
// Preparing: normal selection. In progress: unexpected customer. Same page, same API.
export default function AddCustomers() {
  const id = useTid();
  const nav = useNavigate();
  const { success } = useToast();
  const session = useLocation().pathname.includes("/session/");
  const back = session ? `/trips/${id}/session` : `/trips/${id}`;
  const { phase } = useTripPhase(id);
  const cust = useGet(["customers"], "/customers/");
  const tcs = useGet(["tc", id], `/trips/${id}/customers`);
  const trips = useGet(["trips"], "/trips/");
  const { act, err, busy } = useAct([["tc", id], ["req", id], ["customers"]]);
  const [sel, setSel] = useState<number[]>([]);
  const [s, setS] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [f, setF] = useState({ name: "", phone: "", address: "" });
  const leave = useLeave(sel.length > 0);

  if (!phase || !cust.data || !tcs.data) {
    return (
      <>
        <AppBar title="Add customers" onBack={() => nav(back)} />
        <Load q={!cust.data ? cust : tcs} />
      </>
    );
  }
  if (phase === "closed" || phase === "configured") {
    return (
      <>
        <AppBar title="Add customers" onBack={() => nav(back)} />
        <div className="page">
          <div className="alert warn">Customers cannot be changed in this state.</div>
        </div>
      </>
    );
  }
  if ((phase === "progress") !== session) {
    return (
      <>
        <AppBar title="Add customers" onBack={() => nav(back)} />
        <div className="page">
          <div className="alert warn">Not available now.</div>
        </div>
      </>
    );
  }

  const onTrip = (tcs.data as A[]).map((x) => x.customer_id);
  const list = (cust.data as A[]).filter(
    (c) =>
      c.is_active &&
      (c.name.toLowerCase().includes(s.toLowerCase()) || (c.phone && c.phone.includes(s)))
  );
  const last = [...(trips.data ?? [])].filter((t: A) => t.id !== id).sort(byIdDesc)[0];
  const toggle = (cid: number) =>
    setSel(sel.includes(cid) ? sel.filter((x) => x !== cid) : [...sel, cid]);

  async function save() {
    const ok = await act(async () => {
      for (const cid of sel) {
        await post(`/trips/${id}/customers`, { customer_id: cid });
      }
    });
    if (ok) {
      success(`Added ${sel.length} customer${sel.length > 1 ? "s" : ""} to trip`);
      nav(back, { replace: true });
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    let newId = 0;
    const ok = await act(async () => {
      const c = await post("/customers/", f);
      newId = c.id;
    });
    if (ok) {
      setSel([...sel, newId]);
      setNewOpen(false);
      setF({ name: "", phone: "", address: "" });
      success(`Created customer "${f.name}" and selected`);
    }
  }

  async function copyFromLast() {
    if (!last) return;
    const ok = await act(() => post(`/trips/${id}/customers/copy-from/${last.id}`));
    if (ok) {
      success(`Copied customers from previous trip #${last.id}`);
      nav(back, { replace: true });
    }
  }

  return (
    <>
      <AppBar
        title={session ? "Unexpected customer" : "Add customers"}
        sub={session ? "Added to this trip only" : "Tap to select"}
        onBack={() => leave(back)}
        right={
          <button
            className="ib"
            onClick={() => setNewOpen(true)}
            aria-label="New customer"
            title="Create new customer"
          >
            <Icon n="plus" />
          </button>
        }
      />
      <div className={`page ${session ? "nonav" : ""}`}>
        <Err m={err} />
        {last && tcs.data.length === 0 && !session && (
          <Btn block variant="soft" className="mb" busy={busy} onClick={copyFromLast}>
            Copy customers from last trip (#{last.id})
          </Btn>
        )}
        <SearchInput
          value={s}
          onChange={setS}
          placeholder="Search customers by name or phone…"
          className="mb"
        />
        {list.length === 0 && (
          <Empty
            title="No matching customers"
            hint="Tap + to create a new customer record."
            action={
              <Btn sm onClick={() => setNewOpen(true)}>
                Create customer
              </Btn>
            }
          />
        )}
        <div className="grid2">
          {list.map((c: A) => {
            const added = onTrip.includes(c.id);
            const on = sel.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                className={`ccard ${on ? "sel" : ""} ${added ? "off" : ""}`}
                disabled={added}
                aria-label={added ? `${c.name} — already on trip` : c.name}
                onClick={() => toggle(c.id)}
              >
                <span className="tick">{on && <Icon n="check" size={14} />}</span>
                <Avatar name={c.name} />
                <div className="nm">{c.name}</div>
                <div className="sub trunc">{added ? "Already on trip" : c.phone || "No phone"}</div>
              </button>
            );
          })}
        </div>
      </div>
      <div className={`cta ${session ? "nonav" : ""}`}>
        <Btn block busy={busy} disabled={sel.length === 0} onClick={save}>
          {sel.length
            ? `Add ${sel.length} customer${sel.length > 1 ? "s" : ""}`
            : "Select customers"}
        </Btn>
      </div>

      {newOpen && (
        <Sheet onClose={() => setNewOpen(false)}>
          <h3>New customer</h3>
          <form onSubmit={create}>
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
                placeholder="10-digit mobile number"
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
              Create and select
            </Btn>
          </form>
        </Sheet>
      )}
    </>
  );
}
