import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, fmtDate } from "../api";
import { A, fmtTime, Btn, Icon, Load, money, useGet, useTid } from "../lib";
import { downloadCsv } from "../extras";
import { usePrefs } from "../prefs";

// Printable documents. Browser print = paper or Save as PDF. Bags only, except bill pages.
export default function Print() {
  const id = useTid(); const nav = useNavigate(); const { p } = usePrefs();
  const { kind = "", tcId } = useParams(); const tc = Number(tcId);
  const trip = useGet(["trip", id], `/trips/${id}`);
  const sup = useGet(["suppliers"], "/suppliers/");
  const rt = useGet(["req", id], `/trips/${id}/requirements-table`);
  const sl = useGet(["sl", id], `/trips/${id}/supplier-lists`);
  const tot = useGet(["totals", id], `/trips/${id}/handover-totals`);
  const ho = useGet(["ho", id], `/trips/${id}/handovers`);
  const stock = useGet(["stock", id], `/trips/${id}/stock`);
  const slips = useGet(["slips", id], `/trips/${id}/supplier-deliveries`);
  const [bill, setBill] = useState<A>(null);
  const [berr, setBerr] = useState("");

  // Bill is fetched here only, never cached. Cleared when page closes.
  useEffect(() => {
    if (kind !== "bill") return;
    api(`/trips/${id}/bill`, { cache: "no-store" }).then(setBill).catch((e) => setBerr(e.message));
    return () => setBill(null);
  }, [kind, id]);

  const wait = [trip, sup, rt, sl, tot, ho, stock, slips].find((q) => !q.data);
  const bar = (extra?: React.ReactNode) => (
    <div className="pbar noprint">
      <Btn sm variant="outline" onClick={() => nav(-1)}><Icon n="back" size={16} />Back</Btn>
      <Btn sm onClick={() => window.print()}><Icon n="print" size={16} />Print / Save PDF</Btn>
      {extra}
    </div>
  );
  if (wait) return <>{bar()}<Load q={wait} /></>;
  if (kind === "bill" && !bill) return <>{bar()}<div className="page">{berr ? <div className="alert bad">{berr}</div> : <div className="center sub">Loading bill…</div>}</div></>;

  const d = rt.data; const fish: A[] = d.fish_types;
  const supplier = sup.data.find((s: A) => s.id === trip.data.supplier_id)?.name ?? "";
  const list = sl.data.find((s: A) => s.status === "FINAL") ?? sl.data.find((s: A) => s.status === "DRAFT");
  const qty = (c: A, fid: number) => c.quantities.find((q: A) => q.fish_type_id === fid)?.quantity_bags ?? 0;
  const handedBy = (tcid: number, fid?: number) => tot.data.filter((r: A) => r.trip_customer_id === tcid && (fid === undefined || r.fish_type_id === fid)).reduce((a: number, r: A) => a + r.bags, 0);
  const row = d.customers.find((c: A) => c.trip_customer_id === tc);

  const Head = ({ doc }: { doc: string }) => (
    <>
      <div className="ptitle">
        <div className="biz">{p.biz}</div>
        {(p.bizAddr || p.bizPhone) && <div className="sub">{[p.bizAddr, p.bizPhone].filter(Boolean).join(" · ")}</div>}
        <div className="doc">{doc}</div>
      </div>
      <div className="pmeta"><span>Trip date: <b>{fmtDate(trip.data.trip_date)}</b></span><span>Supplier: <b>{supplier}</b></span><span>Printed: {fmtDate(new Date().toISOString())}</span></div>
    </>
  );

  let extra: React.ReactNode = null;
  let body: React.ReactNode = null;

  if (kind === "requirements") {
    extra = <Btn sm variant="soft" onClick={() => downloadCsv(`requirements-${trip.data.trip_date}.csv`, [["Customer", "Phone", ...fish.map((f: A) => f.name), "Total"], ...d.customers.map((c: A) => [c.name, c.phone, ...fish.map((f: A) => qty(c, f.id)), c.total_bags])])}><Icon n="down" size={16} />CSV</Btn>;
    body = <>
      <Head doc="Customer requirement list" />
      <table className="ptable"><thead><tr><th>#</th><th>Customer</th>{fish.map((f: A) => <th key={f.id} className="n">{f.name}</th>)}<th className="n">Total</th></tr></thead>
        <tbody>{d.customers.map((c: A, i: number) => <tr key={c.trip_customer_id}><td>{i + 1}</td><td>{c.name}</td>{fish.map((f: A) => <td key={f.id} className="n">{qty(c, f.id) || ""}</td>)}<td className="n">{c.total_bags}</td></tr>)}</tbody>
        <tfoot><tr><td /><td>Total bags</td>{d.fish_totals.map((t: A) => <td key={t.fish_type_id} className="n">{t.quantity_bags}</td>)}<td className="n">{d.grand_total_bags}</td></tr></tfoot></table>
    </>;
  } else if (kind === "order") {
    body = <>
      <Head doc="Order list for supplier" />
      {!list ? <div className="alert warn">No order list yet.</div> : <>
        <table className="ptable"><thead><tr><th>#</th><th>Fish</th><th className="n">Bags</th></tr></thead>
          <tbody>{list.items.map((i: A, n: number) => <tr key={i.id}><td>{n + 1}</td><td>{i.fish_type_name}</td><td className="n">{i.quantity_bags}</td></tr>)}</tbody>
          <tfoot><tr><td /><td>Total</td><td className="n">{list.total_bags}</td></tr></tfoot></table>
        <div className="sub">Status: {list.status === "FINAL" ? "Final" : "Draft"}</div></>}
    </>;
  } else if (kind === "packing") {
    body = <>
      <Head doc="Packing list" />
      {!list ? <div className="alert warn">No order list yet.</div> : list.items.map((i: A) => (
        <div key={i.id} style={{ breakInside: "avoid" }}>
          <div className="b mt">{i.fish_type_name} · {i.quantity_bags} bags</div>
          <table className="ptable"><thead><tr><th>Customer</th><th className="n">Bags</th></tr></thead>
            <tbody>{d.customers.filter((c: A) => qty(c, i.fish_type_id) > 0).map((c: A) => <tr key={c.trip_customer_id}><td>{c.name}</td><td className="n">{qty(c, i.fish_type_id)}</td></tr>)}</tbody></table>
        </div>
      ))}
    </>;
  } else if (kind === "summary") {
    const hoRows: (string | number)[][] = ho.data.flatMap((h: A) => h.lines.filter((l: A) => l.bags > 0).map((l: A) => [fmtTime(h.handed_over_at), d.customers.find((c: A) => c.trip_customer_id === h.trip_customer_id)?.name ?? `#${h.customer_id}`, l.fish_type_name, l.bags, h.note ?? ""]));
    extra = <Btn sm variant="soft" onClick={() => downloadCsv(`handovers-${trip.data.trip_date}.csv`, [["Time", "Customer", "Fish", "Bags", "Note"], ...hoRows])}><Icon n="down" size={16} />CSV</Btn>;
    body = <>
      <Head doc="Trip summary" />
      <table className="ptable"><thead><tr><th>Fish</th><th className="n">Received</th><th className="n">Rejected</th><th className="n">Damaged</th><th className="n">Handed</th><th className="n">Left</th></tr></thead>
        <tbody>{stock.data.map((l: A) => <tr key={l.fish_type_id}><td>{l.fish_type_name}</td><td className="n">{l.slip_bags}</td><td className="n">{l.rejected_bags}</td><td className="n">{l.damaged_bags}</td><td className="n">{l.handed_bags}</td><td className="n">{l.left_bags}</td></tr>)}</tbody></table>
      <div className="b mt">Handed per customer</div>
      <table className="ptable"><thead><tr><th>Customer</th><th className="n">Wanted</th>{fish.map((f: A) => <th key={f.id} className="n">{f.name}</th>)}<th className="n">Got</th></tr></thead>
        <tbody>{d.customers.map((c: A) => <tr key={c.trip_customer_id}><td>{c.name}</td><td className="n">{c.total_bags}</td>{fish.map((f: A) => <td key={f.id} className="n">{handedBy(c.trip_customer_id, f.id) || ""}</td>)}<td className="n">{handedBy(c.trip_customer_id)}</td></tr>)}</tbody></table>
      <div className="b mt">Deliveries from supplier</div>
      <table className="ptable"><thead><tr><th>Time</th><th>Vehicle / driver</th><th>Items</th><th className="n">Bags</th></tr></thead>
        <tbody>{slips.data.map((s: A) => <tr key={s.id}><td>{fmtTime(s.received_at)}</td><td>{[s.vehicle, s.driver].filter(Boolean).join(" · ")}</td><td>{s.items.map((i: A) => `${i.fish_type_name} ${i.delivered_bags}`).join(", ")}</td><td className="n">{s.total_bags}</td></tr>)}</tbody></table>
    </>;
  } else if (kind === "slip" && row) {
    const mine = ho.data.filter((h: A) => h.trip_customer_id === tc);
    const lines = fish.map((f: A) => [f.name, handedBy(tc, f.id)] as [string, number]).filter((x) => x[1] > 0);
    const total = handedBy(tc);
    const last = mine.length ? fmtTime(mine[0].handed_over_at) : "";
    const text = `${p.biz}\nHandover slip\nCustomer: ${row.name}\nDate: ${fmtDate(trip.data.trip_date)}\n${lines.map(([n, b]) => `${n}: ${b} bags`).join("\n")}\nTotal: ${total} bags`;
    extra = <Btn sm variant="soft" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener")}><Icon n="share" size={16} />WhatsApp</Btn>;
    body = <>
      <Head doc="Handover slip" />
      <div className="pmeta"><span>Customer: <b>{row.name}</b></span><span>{[row.phone, row.address].filter(Boolean).join(" · ")}</span></div>
      <table className="ptable"><thead><tr><th>Fish</th><th className="n">Planned</th><th className="n">Handed</th></tr></thead>
        <tbody>{fish.filter((f: A) => qty(row, f.id) > 0 || handedBy(tc, f.id) > 0).map((f: A) => <tr key={f.id}><td>{f.name}</td><td className="n">{qty(row, f.id)}</td><td className="n">{handedBy(tc, f.id)}</td></tr>)}</tbody>
        <tfoot><tr><td>Total</td><td className="n">{row.total_bags}</td><td className="n">{total}</td></tr></tfoot></table>
      {last && <div className="sub">Last handover: {last}</div>}
      <div className="psign"><span>Customer sign</span><span>Owner sign</span></div>
    </>;
  } else if (kind === "bill" && bill && !tcId) {
    body = <>
      <Head doc="Complete bill" />
      <table className="ptable"><thead><tr><th>#</th><th>Customer</th><th className="n">Bags</th><th className="n">Amount</th></tr></thead>
        <tbody>{bill.customers.map((c: A, i: number) => <tr key={c.trip_customer_id}><td>{i + 1}</td><td>{d.customers.find((x: A) => x.trip_customer_id === c.trip_customer_id)?.name ?? `#${c.customer_id}`}{!c.complete && <span className="sub"> (unpriced {c.unpriced_bags} bags)</span>}</td><td className="n">{c.total_bags}</td><td className="n">{money(c.total_amount)}</td></tr>)}</tbody>
        <tfoot><tr><td /><td>Total</td><td className="n">{bill.total_bags}</td><td className="n">{money(bill.total_amount)}</td></tr></tfoot></table>
      {!bill.complete && <div className="alert warn">Some bags have no rate yet. Set rates, then print again.</div>}
    </>;
  } else if (kind === "bill" && bill && row) {
    const c = bill.customers.find((x: A) => x.trip_customer_id === tc);
    body = <>
      <Head doc="Bill" />
      <div className="pmeta"><span>Customer: <b>{row.name}</b></span><span>{[row.phone, row.address].filter(Boolean).join(" · ")}</span></div>
      <table className="ptable"><thead><tr><th>Fish</th><th className="n">Bags</th></tr></thead>
        <tbody>{fish.filter((f: A) => handedBy(tc, f.id) > 0).map((f: A) => <tr key={f.id}><td>{f.name}</td><td className="n">{handedBy(tc, f.id)}</td></tr>)}</tbody>
        <tfoot><tr><td>Total bags</td><td className="n">{c?.total_bags ?? handedBy(tc)}</td></tr><tr><td>Total amount</td><td className="n">{c ? money(c.total_amount) : "—"}</td></tr></tfoot></table>
      {c && !c.complete && <div className="alert warn">Incomplete: {c.unpriced_bags} bags have no rate.</div>}
      <div className="center mt sub">Thank you for your business.</div>
    </>;
  } else {
    body = <div className="alert warn">Nothing to print here.</div>;
  }

  return <>{bar(extra)}<div className="printable">{body}</div></>;
}
