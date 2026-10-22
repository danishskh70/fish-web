import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Icon, useActiveTrip, useGet, A } from "../lib";

export default function Shell() {
  const p = useLocation().pathname;
  const { trip: active } = useActiveTrip();
  const cust = useGet(["customers"], "/customers/", { staleTime: 60000 });

  const hasInProgressTrip = active?.status === "IN_PROGRESS";
  const noSelf = cust.data && !(cust.data as A[]).some((c) => c.name?.trim().toLowerCase() === "self");

  const items: [string, string, string, boolean, boolean, string][] = [
    [
      "/dashboard",
      "home",
      "Home",
      p === "/dashboard" || (p.startsWith("/trips") && !p.includes("/customers")),
      hasInProgressTrip,
      "ok",
    ],
    [
      "/customers",
      "users",
      "Customers",
      p.startsWith("/customers"),
      !!noSelf,
      "warn",
    ],
    ["/history", "clock", "History", p === "/history", false, ""],
    [
      "/settings",
      "sliders",
      "Settings",
      p === "/settings" || p === "/fish-types" || p === "/suppliers",
      false,
      "",
    ],
  ];

  return (
    <>
      <Outlet />
      <nav className="nav" aria-label="Bottom Navigation">
        {items.map(([to, ic, label, on, badge, tone]) => (
          <NavLink
            key={to}
            to={to}
            className={on ? "on" : ""}
            style={{ position: "relative" }}
          >
            <div style={{ position: "relative" }}>
              <Icon n={ic} />
              {badge && (
                <span
                  style={{
                    position: "absolute",
                    top: -1,
                    right: -2,
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
