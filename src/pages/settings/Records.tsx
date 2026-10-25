import { A, useGet } from "../../lib";
import { downloadCsv } from "../../extras";
import { SGroup, SRow, SubPage } from "../../settings-ui";

export default function Records() {
  const cust = useGet(["customers"], "/customers/");
  const sup = useGet(["suppliers"], "/suppliers/");
  const fts = useGet(["fish-types"], "/fish-types/");
  const n = (d?: A[]) => (d ? `${d.length}` : undefined);

  function exportCustomers() {
    const rows = (cust.data ?? []).map((c: A) => [c.id, c.name, c.phone, c.address, c.is_active ? "Active" : "Inactive"]);
    downloadCsv(`customers-${new Date().toISOString().slice(0, 10)}.csv`, [["ID", "Name", "Phone", "Address", "Status"], ...rows]);
  }

  return (
    <SubPage title="Customers & suppliers" sub="Record and selection preferences">
      <SGroup title="Lists" hint="Add, edit or deactivate. Deactivated items stay in old trips.">
        <SRow to="/customers" icon="users" tone="o" label="Customers" value={n(cust.data)} />
        <SRow to="/suppliers" icon="box" tone="b" label="Suppliers" value={n(sup.data)} />
        <SRow to="/fish-types" icon="fish" tone="g" label="Fish types" value={n(fts.data)} />
      </SGroup>
      <SGroup title="Export">
        <SRow icon="down" tone="n" label="Export customers (CSV)" hint="Download the full customer list" onClick={exportCustomers} />
      </SGroup>
    </SubPage>
  );
}
