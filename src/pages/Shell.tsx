import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Icon } from "../lib";

export default function Shell() {
  const p = useLocation().pathname;
  const items: [string, string, string, boolean][] = [
    ["/dashboard", "home", "Home", p === "/dashboard" || p.startsWith("/trips")],
    ["/customers", "users", "Customers", p.startsWith("/customers")],
    ["/history", "clock", "History", p === "/history"],
    ["/settings", "sliders", "Settings", p === "/settings" || p === "/fish-types" || p === "/suppliers"],
  ];
  return (
    <>
      <Outlet />
      <nav className="nav">
        {items.map(([to, ic, label, on]) => (
          <NavLink key={to} to={to} className={on ? "on" : ""}><Icon n={ic} />{label}</NavLink>
        ))}
      </nav>
    </>
  );
}
