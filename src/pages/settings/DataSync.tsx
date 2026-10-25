import { useQueryClient } from "@tanstack/react-query";
import { useOnline } from "../../extras";
import { usePrefs } from "../../prefs";
import { useConfirm, useToast } from "../../ui-feedback";
import { InfoRow, SGroup, SRow, SubPage } from "../../settings-ui";

export default function DataSync() {
  const qc = useQueryClient();
  const online = useOnline();
  const confirm = useConfirm();
  const { success } = useToast();
  const { reset } = usePrefs();
  const last = Math.max(0, ...qc.getQueryCache().getAll().map((q) => q.state.dataUpdatedAt));
  const lastText = last ? new Date(last).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "No data yet";

  async function refreshAll() {
    await qc.invalidateQueries();
    success("Data refreshed");
  }
  async function clearCache() {
    const ok = await confirm({
      title: "Clear cache and reload?",
      body: "Removes cached screens and saved handover references from this phone, then reloads. Everything on the server stays.",
      confirmLabel: "Clear and reload",
      danger: true,
    });
    if (!ok) return;
    qc.clear();
    try {
      sessionStorage.clear();
      for (const k of await caches.keys()) await caches.delete(k);
      for (const r of (await navigator.serviceWorker?.getRegistrations()) ?? []) await r.unregister();
    } catch { /* ignore */ }
    location.reload();
  }
  async function resetPrefs() {
    const ok = await confirm({
      title: "Reset settings to default?",
      body: "Restores appearance, field work and business details. Saved default rates are kept.",
      confirmLabel: "Reset",
      danger: true,
    });
    if (ok) { reset(); success("Settings reset"); }
  }

  return (
    <SubPage title="Data & synchronization" sub="Connection, refresh and recovery">
      <SGroup title="Connection">
        <InfoRow icon="check" tone={online ? "g" : "o"} label="Connection" value={online ? "Online" : "Offline"} hint={online ? undefined : "Saving will fail until you are back online"} />
        <InfoRow icon="clock" tone="b" label="Last update from server" value={lastText} />
        <InfoRow icon="down" tone="n" label="Live refresh" hint="Session screens refresh by themselves every 15 seconds" />
      </SGroup>
      <SGroup title="Refresh">
        <SRow icon="down" tone="b" label="Refresh all data now" onClick={refreshAll} />
      </SGroup>
      <SGroup title="Recovery" hint="Use these if something looks wrong. Your trips and customers are safe on the server.">
        <SRow icon="alert" tone="o" label="Clear cache and reload" onClick={clearCache} />
        <SRow icon="sliders" tone="n" label="Reset settings to default" onClick={resetPrefs} />
      </SGroup>
    </SubPage>
  );
}
