import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  Seg,
  post,
  useAct,
  useAllTotals,
  useGet,
} from "../lib";
import { downloadCsv } from "../extras";
import { SearchInput, useToast } from "../ui-feedback";

export default function Customers() {
  const nav = useNavigate();
  const { success } = useToast();
  const list = useGet(["customers"], "/customers/");
  const { byTrip } = useAllTotals();
  const { act, err, busy } = useAct([["customers"]]);

  const [s, setS] = useState("");
  const [filter, setFilter] = useState("all"); // "all" | "active" | "inactive"
  const [sortBy, setSortBy] = useState("name"); // "name" | "bags" | "trips"
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", phone: "", address: "" });

  // Pre-calculate per-customer aggregate stats in a single pass O(trips * rows)
  const statsMap = useMemo(() => {
    const map = new Map<number, { trips: number; bags: number }>();
    Object.values(byTrip).forEach((tripRows) => {
      const tripCustomers = new Map<number, number>();
      (tripRows as A[]).forEach((row) => {
        tripCustomers.set(
          row.customer_id,
          (tripCustomers.get(row.customer_id) ?? 0) + (row.bags ?? 0)
        );
      });
      tripCustomers.forEach((bags, customerId) => {
        const cur = map.get(customerId) ?? { trips: 0, bags: 0 };
        map.set(customerId, { trips: cur.trips + 1, bags: cur.bags + bags });
      });
    });
    return map;
  }, [byTrip]);

  const stat = (cid: number) => statsMap.get(cid) ?? { trips: 0, bags: 0 };

  const rawList: A[] = list.data ?? [];

  const filtered = useMemo(() => {
    return rawList
      .filter((c: A) => {
        if (filter === "active") return c.is_active;
        if (filter === "inactive") return !c.is_active;
        return true;
      })
      .filter(
        (c: A) =>
          c.name.toLowerCase().includes(s.toLowerCase()) ||
          (c.phone && c.phone.includes(s)) ||
          (c.address && c.address.toLowerCase().includes(s.toLowerCase()))
      )
      .sort((a: A, b: A) => {
        if (sortBy === "bags") return stat(b.id).bags - stat(a.id).bags;
        if (sortBy === "trips") return stat(b.id).trips - stat(a.id).trips;
        return a.name.localeCompare(b.name);
      });
  }, [rawList, filter, s, sortBy, statsMap]);

  const noSelf =
    list.data && !list.data.some((c: A) => c.name.trim().toLowerCase() === "self");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (await act(() => post("/customers/", f))) {
      setOpen(false);
      setF({ name: "", phone: "", address: "" });
      success(`Customer "${f.name}" created`);
    }
  }

  function handleExportCsv() {
    const rows = filtered.map((c: A) => {
      const st = stat(c.id);
      return [c.id, c.name, c.phone, c.address, c.is_active ? "Active" : "Inactive", st.trips, st.bags];
    });
    downloadCsv(`customers-export-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["ID", "Name", "Phone", "Address", "Status", "Trips", "Bags"],
      ...rows,
    ]);
  }

  return (
    <>
      <AppBar
        title="Customers"
        onBack={() => nav("/dashboard")}
        right={
          <button className="ib" onClick={handleExportCsv} aria-label="Export customers to CSV">
            <Icon n="down" />
          </button>
        }
      />
      <div className="page">
        {noSelf && (
          <div className="alert warn">
            No customer named <b>Self</b>. Leftover bags need it.{" "}
            <button
              type="button"
              style={{ textDecoration: "underline", color: "inherit", font: "inherit" }}
              onClick={() => {
                setF({ name: "Self", phone: "", address: "" });
                setOpen(true);
              }}
            >
              Add Self
            </button>
          </div>
        )}

        <SearchInput
          value={s}
          onChange={setS}
          placeholder="Search by name, phone, or address…"
          className="mb"
        />

        <div className="between mb" style={{ gap: 6, flexWrap: "wrap" }}>
          <Seg
            value={filter}
            onChange={setFilter}
            items={[
              ["all", `All (${rawList.length})`],
              ["active", "Active"],
              ["inactive", "Inactive"],
            ]}
          />
          <div className="row" style={{ gap: 4 }}>
            <span className="sub" style={{ fontSize: "0.75rem" }}>Sort:</span>
            <select
              className="chip"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ minHeight: 34, padding: "4px 10px", fontSize: "0.78rem" }}
              aria-label="Sort customers"
            >
              <option value="name">Name</option>
              <option value="bags">Bags (High)</option>
              <option value="trips">Trips (High)</option>
            </select>
          </div>
        </div>

        <Load q={list} />
        {list.isSuccess && filtered.length === 0 && (
          <Empty
            title="No customers found"
            hint={s ? "Try adjusting your search filter." : "Tap Add to register your first customer."}
            action={
              <Btn sm onClick={() => setOpen(true)}>
                Add customer
              </Btn>
            }
          />
        )}

        <div className="grid2">
          {filtered.map((c: A) => {
            const st = stat(c.id);
            return (
              <Link
                to={`/customers/${c.id}`}
                className={`ccard ${c.is_active ? "" : "off"}`}
                key={c.id}
              >
                <Avatar name={c.name} />
                <div className="nm">{c.name}</div>
                <div className="sub trunc">{c.phone || "No phone"}</div>
                <div className="sub b">
                  {st.trips} trip{st.trips === 1 ? "" : "s"} · {st.bags} bags
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <button className="fab" onClick={() => setOpen(true)} aria-label="Add customer">
        <Icon n="plus" />
        Add
      </button>

      {open && (
        <Sheet onClose={() => setOpen(false)}>
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
              Save customer
            </Btn>
          </form>
        </Sheet>
      )}
    </>
  );
}
