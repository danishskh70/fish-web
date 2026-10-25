import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { A, AppBar, post, useGet } from "../../lib";
import { useOnline } from "../../extras";
import { usePrefs } from "../../prefs";
import { SGroup, SRow } from "../../settings-ui";

const THEME: Record<string, string> = { light: "Light", dark: "Dark", system: "System" };

export default function SettingsHome() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { p } = usePrefs();
  const online = useOnline();
  const sup = useGet(["suppliers"], "/suppliers/");

  const defSup = (sup.data ?? []).find((s: A) => String(s.id) === p.defSupplier)?.name;
  const version = __APP_VERSION__.split(" ")[0];

  async function logout() {
    try { await post("/auth/logout"); } catch { /* ignore */ }
    qc.clear();
    nav("/login", { replace: true });
  }

  return (
    <>
      <AppBar title="Settings" />
      <div className="page">
        <p className="sub mb">Choose what you want to change.</p>

        <SGroup>
          <SRow to="/settings/general" icon="sliders" tone="g" label="General" hint="Appearance and interface preferences" value={THEME[p.theme] ?? "System"} />
          <SRow to="/settings/trips" icon="truck" tone="b" label="Trips & stock" hint="Default units and operational preferences" value={defSup ?? "Not set"} />
        </SGroup>

        <SGroup>
          <SRow to="/settings/records" icon="users" tone="o" label="Customers & suppliers" hint="Record and selection preferences" />
          <SRow to="/settings/printing" icon="print" tone="p" label="Printing & sharing" hint="Bills, print layouts and exports" />
        </SGroup>

        <SGroup>
          <SRow to="/settings/data" icon="down" tone="n" label="Data & synchronization" hint="Connection, refresh and recovery" value={online ? "Online" : "Offline"} />
          <SRow to="/settings/about" icon="info" tone="g" label="About" hint="Version and application information" value={version} />
        </SGroup>

        <SGroup>
          <SRow icon="out" danger label="Log out" hint="Sign out on this device" onClick={logout} />
        </SGroup>
      </div>
    </>
  );
}
