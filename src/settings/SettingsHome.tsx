import { getProfile, listFish, listSuppliers } from "../api/api";
import { useApi } from "../api/hooks";
import { Avatar } from "../ui/art";
import { Icon } from "../ui/icons";
import { ErrorBox, ListCard, ListRow, Page, Skeleton } from "../ui/kit";
import { useGo } from "../ui/back";

// Settings = list in list. Nothing is editable on this screen. Each row opens its own list.
export default function SettingsHome() {
  const go = useGo();
  const p = useApi(getProfile);
  const sup = useApi(listSuppliers);
  const fish = useApi(listFish);
  if (p.error) return <Page title="Settings"><ErrorBox message={p.error} onRetry={p.reload} /></Page>;
  if (!p.data) return <Page title="Settings"><Skeleton n={4} /></Page>;
  const pr = p.data.preferences;
  const supName = sup.data?.find((s) => s.id === pr.defaultSupplierId)?.name ?? "None";
  const active = fish.data?.filter((f) => f.active) ?? [];
  return (
    <Page title="Settings" right={<span className="hdr-ic"><Icon n="settings" /></span>}>
      <ListCard><ListRow lead={<Avatar name={p.data.name} />} title="Profile" sub="Manage your account and preferences" onClick={() => go("/settings/profile")} /></ListCard>
      <ListCard title="Trips">
        <ListRow icon="box" title="Default Supplier" sub={supName} onClick={() => go("/settings/default-supplier")} />
        <ListRow icon="fish" title="Default Fish Types" sub={`${pr.defaultFishIds.filter((id) => active.some((f) => f.id === id)).length} of ${active.length || "…"} selected`} onClick={() => go("/settings/default-fish")} />
        <ListRow icon="bell" title="Low Stock Warning" sub={`${pr.lowStock.all} bags for all fish`} onClick={() => go("/settings/low-stock")} />
        <ListRow icon="rupee" title="Default Rates" sub={pr.ratesSet.all ? "Set for all fish" : "Some fish have no rate"} onClick={() => go("/settings/default-rates")} />
      </ListCard>
      <ListCard title="Stock">
        <ListRow icon="alert" title="Stock Alerts" sub={pr.stockAlerts.enabled ? "On" : "Off"} onClick={() => go("/settings/stock-alerts")} />
        <ListRow icon="list" title="Fish Type Preferences" sub="Photos and active fish" onClick={() => go("/settings/fish")} />
      </ListCard>
      <ListCard title="App">
        <ListRow icon="palette" title="Appearance" sub={pr.theme === "system" ? "Match device" : pr.theme === "dark" ? "Dark" : "Light"} onClick={() => go("/settings/appearance")} />
        <ListRow icon="info" title="About and install" sub="Version, install app, demo data" onClick={() => go("/settings/about")} />
      </ListCard>
    </Page>
  );
}
