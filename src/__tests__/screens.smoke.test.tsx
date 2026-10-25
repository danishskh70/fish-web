import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { PrefsProvider } from "../prefs";
import { SessionProvider } from "../session";
import { ConfirmProvider, ToastProvider } from "../ui-feedback";
import { router } from "../App";

vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: () => ({ needRefresh: [false, () => {}], offlineReady: [false, () => {}], updateServiceWorker: () => {} }),
}));

const trip = { id: 1, trip_date: "2026-10-24", supplier_id: 1, status: "IN_PROGRESS" };
const DATA: Record<string, unknown> = {
  "/auth/me": { username: "owner" },
  "/trips/": [trip],
  "/trips/1": trip,
  "/suppliers/": [{ id: 1, name: "Hatchery", phone: "1", address: "x", is_active: true }],
  "/customers/": [{ id: 3, name: "Ramesh", phone: "99", address: "Pune", is_active: true }],
  "/fish-types/": [{ id: 1, name: "Rohu", is_active: true }],
  "/trips/1/supplier-lists": [{ id: 1, status: "FINAL", version_number: 1, total_bags: 20, items: [{ id: 1, fish_type_id: 1, fish_type_name: "Rohu", quantity_bags: 20 }] }],
  "/trips/1/customers": [{ id: 5, customer_id: 3, trip_id: 1 }],
  "/trips/1/requirements-table": {
    fish_types: [{ id: 1, name: "Rohu" }],
    customers: [{ trip_customer_id: 5, customer_id: 3, name: "Ramesh", phone: "99", quantities: [{ fish_type_id: 1, quantity_bags: 10 }], total_bags: 10 }],
    fish_totals: [{ fish_type_id: 1, quantity_bags: 10, planned_quantity_bags: 10, effective_planned_quantity_bags: 10, shortfall_exists: false, shortfall_bags: 0 }],
    grand_total_bags: 10,
  },
  "/trips/1/stock": [{ fish_type_id: 1, fish_type_name: "Rohu", slip_bags: 20, handed_bags: 0, left_bags: 20, on_slip: true, rejected_bags: 0, damaged_bags: 0 }],
  "/trips/1/handover-totals": [],
  "/trips/1/supplier-deliveries": [],
  "/trips/1/handovers": [],
};

beforeAll(() => {
  // jsdom gaps, not app gaps
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia;
  vi.stubGlobal("fetch", async (url: string) => {
    const path = String(url).replace(/^.*\/api/, "");
    return new Response(JSON.stringify(path in DATA ? DATA[path] : []), { status: 200, headers: { "Content-Type": "application/json" } });
  });
});

function mount() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <PrefsProvider>
        <SessionProvider>
          <ToastProvider>
            <ConfirmProvider>
              <RouterProvider router={router} />
            </ConfirmProvider>
          </ToastProvider>
        </SessionProvider>
      </PrefsProvider>
    </QueryClientProvider>
  );
}

// Fresh load on a deep link with an empty cache: the case that used to crash with "more hooks".
describe("core screens load from a cold start", () => {
  it("session grid shows the customer card and its status", async () => {
    await router.navigate("/trips/1/session");
    mount();
    expect(await screen.findByText("Ramesh", {}, { timeout: 5000 })).toBeTruthy();
    expect(screen.getByText("Awaiting handover")).toBeTruthy();
  });

  it("handover page prefills the planned bags", async () => {
    await router.navigate("/trips/1/session/customers/5");
    mount();
    await screen.findByText(/Confirm handover/, {}, { timeout: 5000 });
    await waitFor(() => expect((screen.getByPlaceholderText("0") as HTMLInputElement).value).toBe("10"));
  });

  it("an open session locks the app: Home redirects to the session", async () => {
    await router.navigate("/dashboard");
    mount();
    await waitFor(() => expect(router.state.location.pathname).toBe("/trips/1/session"), { timeout: 5000 });
  });

  it("settings opens as a list of categories, each with its own page", async () => {
    await router.navigate("/settings");
    mount();
    expect(await screen.findByText("Choose what you want to change.", {}, { timeout: 5000 })).toBeTruthy();
    for (const label of ["General", "Trips & stock", "Customers & suppliers", "Printing & sharing", "Data & synchronization", "About"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(screen.queryByText("Security")).toBeNull(); // no empty category for a feature that does not exist
  });

  it("default rates page is write-only: shows Not set and never a number", async () => {
    await router.navigate("/settings/trips/rates");
    mount();
    expect(await screen.findByText("Not set", {}, { timeout: 5000 })).toBeTruthy();
    const input = screen.getByLabelText("Rohu") as HTMLInputElement;
    expect(input.type).toBe("password");
  });
});
