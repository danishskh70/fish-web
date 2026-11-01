import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MODE, addCustomer, listCustomers } from "../api/api";
import { useApi } from "../api/hooks";
import { Avatar, EmptyArt } from "../ui/art";
import { Icon } from "../ui/icons";
import { Button, Chip, ErrorBox, Field, ListCard, ListRow, Page, SearchBar, Seg, Sheet, Skeleton, useToast } from "../ui/kit";
import { useGo } from "../ui/back";
import { inr } from "../ui/format";

export default function Customers() {
  const go = useGo();
  const toast = useToast();
  const [sp, setSp] = useSearchParams();
  const { data, error, loading, reload } = useApi(listCustomers);
  const [q, setQ] = useState("");
  const [f, setF] = useState<"all" | "due">("all");
  const [open, setOpen] = useState(sp.get("add") === "1");
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { if (sp.get("add") === "1") { setOpen(true); setSp({}, { replace: true }); } }, [sp, setSp]);
  const list = useMemo(() => (data ?? []).filter((c) => (f === "all" || c.outstanding > 0) && `${c.name} ${c.phone} ${c.address}`.toLowerCase().includes(q.toLowerCase())), [data, q, f]);

  async function save() {
    setBusy(true); setErr("");
    try { const c = await addCustomer(form); setOpen(false); setForm({ name: "", phone: "", address: "" }); toast({ msg: `${c.name} added` }); }
    catch (e) { setErr(e instanceof Error ? e.message : "Could not save"); } finally { setBusy(false); }
  }
  return (
    <Page title="Customers" sub={data ? `${data.length} customers` : undefined} right={<Button sm onClick={() => setOpen(true)}><Icon n="plus" size={16} /> Add</Button>}>
      <SearchBar value={q} onChange={setQ} placeholder="Search name, phone or place" />
      <Seg<"all" | "due"> items={[["all", "All"], ["due", "With balance due"]]} value={f} onChange={setF} />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Skeleton n={5} />}
      {data && list.length === 0 && <div className="empty"><EmptyArt kind="customers" /><h3>No customers found</h3></div>}
      {list.length > 0 && (
        <ListCard>
          {list.map((c) => <ListRow key={c.id} lead={<Avatar name={c.name} />} title={c.name} sub={`${c.phone} · ${c.address}`} onClick={() => go(`/customers/${c.id}`)}
            right={<span className="lr-right">{c.outstanding > 0 ? <Chip tone="warn">{inr(c.outstanding)} due</Chip> : <Chip tone="ok">Clear</Chip>}<Icon n="chev" size={18} className="lr-chev" /></span>} />)}
        </ListCard>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title="Add customer">
        <Field label="Customer name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></Field>
        <Field label={MODE === "live" ? "Phone (required)" : "Phone"}><input className="input" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91" /></Field>
        <Field label={MODE === "live" ? "Place (required)" : "Place"}><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
        {err && <div className="note bad" role="alert">{err}</div>}
        <Button block busy={busy} onClick={save}>Save customer</Button>
      </Sheet>
    </Page>
  );
}
