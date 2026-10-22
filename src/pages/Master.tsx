import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { A, AppBar, Avatar, Btn, Empty, Err, Field, Icon, Load, Pill, Sheet, post, useAct, useGet } from "../lib";

export default function Master({ path, title, fields }: { path: string; title: string; fields: string[] }) {
  const nav = useNavigate();
  const list = useGet([path], `/${path}/`);
  const { act, err, busy } = useAct([[path]]);
  const [s, setS] = useState("");
  const [edit, setEdit] = useState<A>(null);
  const [f, setF] = useState<Record<string, string>>({});
  const required = path === "fish-types" ? ["name"] : fields;
  const open = (r?: A) => { setEdit(r ?? {}); setF(Object.fromEntries(fields.map((k) => [k, r?.[k] ?? ""]))); };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const ok = await act(() => edit.id ? post(`/${path}/${edit.id}`, f, "PATCH") : post(`/${path}/`, f));
    if (ok) setEdit(null);
  }
  const rows = (list.data ?? []).filter((r: A) => r.name.toLowerCase().includes(s.toLowerCase()));
  const noSelf = path === "customers" && list.data && !list.data.some((r: A) => r.name.toLowerCase() === "self");

  return (
    <>
      <AppBar title={title} onBack={() => nav("/settings")} />
      <div className="page">
        {noSelf && <div className="alert warn">No customer named <b>Self</b>. Add one. Leftover bags go to Self.</div>}
        {(list.data?.length ?? 0) > 6 && <input className="input mb" placeholder="Search…" value={s} onChange={(e) => setS(e.target.value)} />}
        <Load q={list} />
        {!edit && <Err m={err} />}
        {rows.length === 0 && list.isSuccess && <Empty title="Nothing here yet" hint="Tap + Add." />}
        <div className="list">
          {rows.map((r: A) => (
            <div className="li" key={r.id} style={{ flexWrap: "wrap" }}>
              <Avatar name={r.name} />
              <div className="grow">
                <div className="b">{r.name} {!r.is_active && <Pill tone="warn">inactive</Pill>}</div>
                {(r.phone || r.address) && <div className="sub trunc">{[r.phone, r.address].filter(Boolean).join(" · ")}</div>}
              </div>
              <div className="row" style={{ width: "100%", justifyContent: "flex-end", gap: 4 }}>
                <Btn sm variant="ghost" onClick={() => open(r)}>Edit</Btn>
                <Btn sm variant="ghost" onClick={() => act(() => post(`/${path}/${r.id}/${r.is_active ? "deactivate" : "activate"}`))}>{r.is_active ? "Deactivate" : "Activate"}</Btn>
                <Btn sm variant="ghost" style={{ color: "var(--bad)" }} onClick={() => confirm("Delete? If in use, deactivate instead.") && act(() => post(`/${path}/${r.id}`, undefined, "DELETE"))}>Delete</Btn>
              </div>
            </div>
          ))}
        </div>
      </div>
      <button className="fab" onClick={() => open()}><Icon n="plus" />Add</button>

      {edit && (
        <Sheet onClose={() => setEdit(null)}>
          <h3>{edit.id ? "Edit" : "Add"} {title.toLowerCase().replace(/s$/, "")}</h3>
          <form onSubmit={save}>
            {fields.map((k) => (
              <Field key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} required={required.includes(k)}>
                <input className="input" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} required={required.includes(k)} />
              </Field>
            ))}
            <Err m={err} />
            <div className="row"><Btn busy={busy} className="grow">Save</Btn><Btn variant="ghost" type="button" onClick={() => setEdit(null)}>Cancel</Btn></div>
          </form>
        </Sheet>
      )}
    </>
  );
}
