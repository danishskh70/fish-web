import React, { Suspense, useEffect } from "react";
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { byIdDesc, useGet, A } from "./lib";
import { OfflineBanner } from "./extras";

// Lazy-loaded pages for bundle splitting & faster initial load
const Login = React.lazy(() => import("./pages/Login"));
const Shell = React.lazy(() => import("./pages/Shell"));
const Home = React.lazy(() => import("./pages/Home"));
const NewTrip = React.lazy(() => import("./pages/NewTrip"));
const TripDashboard = React.lazy(() => import("./pages/TripDashboard"));
const AddCustomers = React.lazy(() => import("./pages/AddCustomers"));
const TripCustomer = React.lazy(() => import("./pages/TripCustomer"));
const Order = React.lazy(() => import("./pages/Order"));
const StartSession = React.lazy(() => import("./pages/StartSession"));
const SessionGrid = React.lazy(() => import("./pages/SessionGrid"));
const SessionHandover = React.lazy(() => import("./pages/SessionHandover"));
const SessionFinish = React.lazy(() => import("./pages/SessionFinish"));
const Rates = React.lazy(() => import("./pages/Rates"));
const Customers = React.lazy(() => import("./pages/Customers"));
const CustomerProfile = React.lazy(() => import("./pages/CustomerProfile"));
const History = React.lazy(() => import("./pages/History"));
const Settings = React.lazy(() => import("./pages/Settings"));
const Print = React.lazy(() => import("./pages/Print"));
const Master = React.lazy(() => import("./pages/Master"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Guard() {
  const loc = useLocation();
  const nav = useNavigate();
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => api("/auth/me") });

  useEffect(() => {
    const h = () => {
      qc.clear();
      nav("/login", { state: { from: loc.pathname } });
    };
    window.addEventListener("auth:401", h);
    return () => window.removeEventListener("auth:401", h);
  }, [loc.pathname, nav, qc]);

  if (me.isPending) {
    return <div className="center sub" style={{ paddingTop: 120 }}>Loading account…</div>;
  }
  if (me.isError) {
    return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  }
  return <Lock />;
}

// Session lock. Driven by persisted trip status, not frontend state.
// While a trip is IN_PROGRESS only its session, rates and read-only customers are reachable.
// Uses staleTime: 30000 so navigation between routes doesn't trigger constant refetches of /trips/
function Lock() {
  const loc = useLocation();
  const trips = useGet(["trips"], "/trips/", { staleTime: 30000 });

  if (trips.isPending && !trips.data) {
    return <div className="center sub" style={{ paddingTop: 120 }}>Loading session…</div>;
  }

  const active: A | undefined = [...(trips.data ?? [])]
    .sort(byIdDesc)
    .find((t: A) => t.status !== "CLOSED");

  if (active?.status === "IN_PROGRESS") {
    const base = `/trips/${active.id}`;
    const p = loc.pathname;
    const ok =
      p.startsWith(base + "/session") ||
      p.startsWith(base + "/print") ||
      p === base + "/rates" ||
      p.startsWith("/customers");
    if (!ok) return <Navigate to={base + "/session"} replace />;
  }
  return <Outlet />;
}

const PageFallback = () => (
  <div className="center sub" style={{ paddingTop: 120 }}>
    <div
      className="spin"
      style={{
        margin: "0 auto 8px",
        borderColor: "rgba(11, 122, 95, 0.2)",
        borderTopColor: "var(--p)",
      }}
    />
    Loading…
  </div>
);

export default function App() {
  return (
    <div className="app">
      <ScrollToTop />
      <OfflineBanner />
      <Suspense fallback={<PageFallback />}>
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
              <Route
                path="/fish-types"
                element={<Master path="fish-types" title="Fish types" fields={["name"]} />}
              />
              <Route
                path="/suppliers"
                element={
                  <Master
                    path="suppliers"
                    title="Suppliers"
                    fields={["name", "phone", "address"]}
                  />
                }
              />
              <Route path="/trips/new" element={<NewTrip />} />
              <Route path="/trips/:tripId" element={<TripDashboard />} />
              <Route path="/trips/:tripId/add-customers" element={<AddCustomers />} />
              <Route path="/trips/:tripId/customers/:tcId" element={<TripCustomer />} />
              <Route path="/trips/:tripId/order" element={<Order />} />
            </Route>
          </Route>
          {/* Explicit 404 page instead of silent redirect */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </div>
  );
}
