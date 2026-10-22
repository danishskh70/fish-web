import { useEffect } from "react";
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { byIdDesc, useGet, A } from "./lib";

import Login from "./pages/Login";
import Shell from "./pages/Shell";
import Home from "./pages/Home";
import NewTrip from "./pages/NewTrip";
import TripDashboard from "./pages/TripDashboard";
import AddCustomers from "./pages/AddCustomers";
import TripCustomer from "./pages/TripCustomer";
import Order from "./pages/Order";
import StartSession from "./pages/StartSession";
import SessionGrid from "./pages/SessionGrid";
import SessionHandover from "./pages/SessionHandover";
import SessionFinish from "./pages/SessionFinish";
import Rates from "./pages/Rates";
import Customers from "./pages/Customers";
import CustomerProfile from "./pages/CustomerProfile";
import History from "./pages/History";
import Settings from "./pages/Settings";
import Print from "./pages/Print";
import { OfflineBanner } from "./extras";
import Master from "./pages/Master";

function Guard() {
  const loc = useLocation(); const nav = useNavigate(); const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => api("/auth/me") });
  useEffect(() => {
    const h = () => { qc.clear(); nav("/login", { state: { from: loc.pathname } }); };
    window.addEventListener("auth:401", h);
    return () => window.removeEventListener("auth:401", h);
  }, [loc.pathname, nav, qc]);
  if (me.isPending) return <div className="center sub" style={{ paddingTop: 120 }}>Loading…</div>;
  if (me.isError) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  return <Lock />;
}

// Session lock. Driven by persisted trip status, not frontend state.
// While a trip is IN_PROGRESS only its session, rates and read-only customers are reachable.
function Lock() {
  const loc = useLocation();
  const trips = useGet(["trips"], "/trips/");
  if (trips.isPending) return <div className="center sub" style={{ paddingTop: 120 }}>Loading…</div>;
  const active: A | undefined = [...(trips.data ?? [])].sort(byIdDesc).find((t: A) => t.status !== "CLOSED");
  if (active?.status === "IN_PROGRESS") {
    const base = `/trips/${active.id}`; const p = loc.pathname;
    const ok = p.startsWith(base + "/session") || p.startsWith(base + "/print") || p === base + "/rates" || p.startsWith("/customers");
    if (!ok) return <Navigate to={base + "/session"} replace />;
  }
  return <Outlet />;
}

export default function App() {
  return (
    <div className="app">
      <OfflineBanner />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Guard />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Distribution session. No bottom nav. */}
          <Route path="/trips/:tripId/session/start" element={<StartSession />} />
          <Route path="/trips/:tripId/session" element={<SessionGrid />} />
          <Route path="/trips/:tripId/session/add" element={<AddCustomers />} />
          <Route path="/trips/:tripId/session/customers/:tcId" element={<SessionHandover />} />
          <Route path="/trips/:tripId/session/finish" element={<SessionFinish />} />
          <Route path="/trips/:tripId/session/receive" element={<StartSession more />} />
          <Route path="/trips/:tripId/print/:kind" element={<Print />} />
          <Route path="/trips/:tripId/print/:kind/:tcId" element={<Print />} />
          <Route path="/trips/:tripId/rates" element={<Rates />} />

          <Route element={<Shell />}>
            <Route path="/dashboard" element={<Home />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/:customerId" element={<CustomerProfile />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/fish-types" element={<Master path="fish-types" title="Fish types" fields={["name"]} />} />
            <Route path="/suppliers" element={<Master path="suppliers" title="Suppliers" fields={["name", "phone", "address"]} />} />
            <Route path="/trips/new" element={<NewTrip />} />
            <Route path="/trips/:tripId" element={<TripDashboard />} />
            <Route path="/trips/:tripId/add-customers" element={<AddCustomers />} />
            <Route path="/trips/:tripId/customers/:tcId" element={<TripCustomer />} />
            <Route path="/trips/:tripId/order" element={<Order />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  );
}
