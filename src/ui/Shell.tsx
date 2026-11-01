import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useRegisterSW } from "virtual:pwa-register/react";
import { getProfile } from "../api/api";
import { useApi } from "../api/hooks";
import { LogoMark } from "./art";
import { Icon } from "./icons";
import { Button, ListRow, Sheet, ToastHost } from "./kit";
import { getActiveTripId } from "../api/api";

const TABS: [string, string, string][] = [
  ["/dashboard", "home", "Dashboard"], ["/trips", "trips", "Trips"], ["/customers", "users", "Customers"], ["/settings", "settings", "Settings"]
];

export default function Shell() {
  const loc = useLocation();
  const nav = useNavigate();
  const [quick, setQuick] = useState(false);
  const profile = useApi(getProfile);
  const active = useApi(getActiveTripId);
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW();

  const theme = profile.data?.preferences.theme ?? "light";
  useEffect(() => {
    const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#06142e" : "#0b2a5b");
  }, [theme]);

  // Hide the nav on focused task screens so thumbs have room (handover, payment, forms).
  const focus = /\/(handover|payment|history|new)$/.test(loc.pathname) || loc.pathname.includes("/receipts/") || loc.pathname === "/login";
  const here = (p: string) => loc.pathname === p || loc.pathname.startsWith(p + "/");
  const go = (to: string) => { setQuick(false); nav(to, { state: { from: loc.pathname } }); };

  const item = (t: [string, string, string]) => (
    <NavLink key={t[0]} to={t[0]} className={`nav-i ${here(t[0]) ? "on" : ""}`} aria-current={here(t[0]) ? "page" : undefined}>
      <span className="nav-ic"><Icon n={t[1]} size={22} /></span><span className="nav-l">{t[2]}</span>
    </NavLink>
  );

  return (
    <ToastHost>
      <div className={`app ${focus ? "focus" : ""}`}>
        <aside className="side" aria-label="Main navigation">
          <div className="side-brand"><LogoMark size={38} /><div><strong>MatsyaSetu</strong><small>Fish Seed Management</small></div></div>
          {TABS.map(item)}
          <button className="side-new" onClick={() => setQuick(true)}><Icon n="plus" size={20} /> Quick add</button>
          <div className="side-foot">{profile.data ? `Signed in as ${profile.data.name}` : ""}</div>
        </aside>

        <div className="content"><Outlet /></div>

        <nav className="bnav" aria-label="Main navigation">
          {item(TABS[0]!)}{item(TABS[1]!)}
          <button className="fab" onClick={() => setQuick(true)} aria-label="Quick add"><Icon n="plus" size={28} /></button>
          {item(TABS[2]!)}{item(TABS[3]!)}
        </nav>

        {needRefresh && !focus && (
          <div className="upd" role="status"><span className="grow">New version ready.</span><Button sm onClick={() => updateServiceWorker(true)}>Update</Button><Button sm variant="ghost" onClick={() => setNeedRefresh(false)}>Later</Button></div>
        )}
      </div>

      <Sheet open={quick} onClose={() => setQuick(false)} title="Quick add">
        <div className="lcard-b flat">
          <ListRow icon="trips" title="New trip" sub={active.data ? "Close the current trip first" : "Pick supplier, fish and customers"} onClick={active.data ? undefined : () => go("/trips/new")} />
          {active.data ? <ListRow icon="list" title="Current trip" sub="Open customers and payments" onClick={() => go(`/trips/${active.data}`)} /> : null}
          <ListRow icon="users" title="Add customer" sub="Name, phone, place" onClick={() => go("/customers?add=1")} />
          <ListRow icon="rupee" title="Outstanding balances" sub="Trip-wise money to collect" onClick={() => go("/outstanding")} />
        </div>
      </Sheet>
    </ToastHost>
  );
}
