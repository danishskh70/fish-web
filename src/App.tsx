import { Navigate, Route, Routes } from "react-router-dom";
import { isAuthed } from "./api/api";
import Shell from "./ui/Shell";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Trips, { ActiveTripRedirect } from "./pages/Trips";
import NewTrip from "./pages/NewTrip";
import TripOverview from "./pages/TripOverview";
import CustomerTrip from "./pages/CustomerTrip";
import Handover from "./pages/Handover";
import PaymentPage from "./pages/Payment";
import History from "./pages/History";
import ReceiptPage from "./pages/Receipt";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import Outstanding from "./pages/Outstanding";
import SettingsHome from "./settings/SettingsHome";
import { ProfilePage, DefaultSupplier, DefaultFish, LowStock, DefaultRates, StockAlerts, FishPrefs, Appearance, About } from "./settings/SettingsPages";

function Guard({ children }: { children: JSX.Element }) { return isAuthed() ? children : <Navigate to="/login" replace />; }

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Guard><Shell /></Guard>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/trips" element={<Trips />} />
        <Route path="/trips/active" element={<ActiveTripRedirect />} />
        <Route path="/trips/new" element={<NewTrip />} />
        <Route path="/trips/:id" element={<TripOverview />} />
        <Route path="/trips/:id/customers/:tcId" element={<CustomerTrip />} />
        <Route path="/trips/:id/customers/:tcId/handover" element={<Handover />} />
        <Route path="/trips/:id/customers/:tcId/payment" element={<PaymentPage />} />
        <Route path="/trips/:id/customers/:tcId/history" element={<History />} />
        <Route path="/trips/:id/customers/:tcId/receipts/:paymentId" element={<ReceiptPage />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/outstanding" element={<Outstanding />} />
        <Route path="/settings" element={<SettingsHome />} />
        <Route path="/settings/profile" element={<ProfilePage />} />
        <Route path="/settings/default-supplier" element={<DefaultSupplier />} />
        <Route path="/settings/default-fish" element={<DefaultFish />} />
        <Route path="/settings/low-stock" element={<LowStock />} />
        <Route path="/settings/default-rates" element={<DefaultRates />} />
        <Route path="/settings/stock-alerts" element={<StockAlerts />} />
        <Route path="/settings/fish" element={<FishPrefs />} />
        <Route path="/settings/appearance" element={<Appearance />} />
        <Route path="/settings/about" element={<About />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
