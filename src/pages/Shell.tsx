import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Btn, Icon, useActiveTrip, useGet, A } from "../lib";

export default function Shell() {
  const p = useLocation().pathname;
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  // Offer the update only on top-level tabs, never while a form is open.
  const tabRoot = ["/dashboard", "/trips", "/customers", "/settings"].includes(p);
  const { trip: active } = useActiveTrip();
  const cust = useGet(["customers"], "/customers/", { staleTime: 60000 });

  const noSelf = cust.data && !(cust.data as A[]).some((c) => c.name?.trim().toLowerCase() === "self");

  const inTrips = p === "/trips" || p.startsWith("/trips/");
  const items: [string, string, string, boolean, boolean, string][] = [
    ["/dashboard", "home", "Home", p === "/dashboard", false, ""],
    ["/trips", "truck", "Trips", inTrips, !!active, "ok"],
    ["/customers", "users", "Customers", p.startsWith("/customers"), !!noSelf, "warn"],
    ["/settings", "sliders", "Settings", p.startsWith("/settings") || p === "/fish-types" || p === "/suppliers", false, ""],
  ];

  return (
    <>
      <Outlet />
      {needRefresh && tabRoot && (
        <div className="upd noprint" role="status">
          <span className="grow">New version ready.</span>
          <Btn sm onClick={() => updateServiceWorker(true)}>Update</Btn>
          <Btn sm variant="ghost" onClick={() => setNeedRefresh(false)}>Later</Btn>
        </div>
      )}
      <nav className="nav" aria-label="Bottom Navigation">
        {items.map(([to, ic, label, on, badge, tone]) => (
          <NavLink
            key={to}
            to={to}
            className={on ? "on" : ""}
            style={{ position: "relative" }}
          >
            <div className="nav-ic">
              <Icon n={ic} />
              {badge && (
                <span
                  style={{
                    position: "absolute",
                    top: 3,
                    right: 13,
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: tone === "ok" ? "var(--ok)" : "var(--warn)",
                  }}
                  aria-hidden="true"
                />
              )}
            </div>
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
