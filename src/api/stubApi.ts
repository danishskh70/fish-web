// The ONLY file screens import data functions from. Each function = one future endpoint.
// Replace the body with fetch() later. Names, inputs and outputs are the contract.
import { calcRow, rowStatus, validateAmount } from "./money";
import { commit, getDb, nextId, resetDemo, snapRates, type TcRec } from "./stub";
import {
  ApiError, type Customer, type CustomerDetail, type CustomerSummary, type Fish, type FishTotal, type Line, type Method,
  type Outstanding, type PayKind, type Payment, type Preferences, type Profile, type Receipt, type Supplier,
  type TripDetail, type TripRow, type TripSummary
} from "./types";

const wait = (ms = 70) => new Promise((r) => setTimeout(r, ms));
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const AUTH = "ms_auth";

// ---------- internal builders ----------
function lines(tc: TcRec): Line[] {
  const db = getDb();
  const trip = db.trips.find((t) => t.id === tc.tripId)!;
  const ids = new Set<number>([...trip.fishIds, ...Object.keys(tc.orders).map(Number), ...Object.keys(tc.handed ?? {}).map(Number)]);
  const show = db.profile.preferences.showRates;
  return [...ids].filter((id) => (tc.orders[id] ?? 0) > 0 || (tc.handed?.[id] ?? 0) > 0 || tc.handed === null).map((id) => {
    const f = db.fish.find((x) => x.id === id)!;
    const rate = tc.rateSnap ? tc.rateSnap[String(id)] ?? null : db.secretRates[String(id)] ?? null;
    return { fishId: id, fishName: f.name, color: f.color, photo: f.photo, ordered: tc.orders[id] ?? 0, handed: tc.handed ? tc.handed[id] ?? 0 : null, rate: show ? rate : null, _rate: rate } as Line & { _rate: number | null };
  }).filter((l) => l.ordered > 0 || (l.handed ?? 0) > 0).map((l) => l);
}
function internalLines(tc: TcRec): Line[] {
  // same as lines() but with real rates for calculation (never sent to the screens)
  const out = lines(tc) as (Line & { _rate: number | null })[];
  return out.map((l) => ({ ...l, rate: l._rate }));
}
function row(tc: TcRec): TripRow {
  const db = getDb();
  const cust = db.customers.find((c) => c.id === tc.customerId)!;
  const pays = db.payments.filter((p) => p.tripCustomerId === tc.id);
  const calc = calcRow(internalLines(tc), tc.handed !== null, pays);
  const ls = lines(tc).map((l) => { const c = { ...l } as Line & { _rate?: number }; delete c._rate; return c as Line; });
  return {
    id: tc.id, tripId: tc.tripId, customerId: tc.customerId, name: cust.name, phone: cust.phone, lines: ls,
    orderedBags: ls.reduce((a, l) => a + l.ordered, 0), handedBags: ls.reduce((a, l) => a + (l.handed ?? 0), 0),
    handedOver: tc.handed !== null, handoverNote: tc.note, amount: calc.amount, amountFinal: calc.amountFinal,
    paid: calc.paid, advance: calc.advance, remaining: calc.remaining, rateMissing: calc.rateMissing, amountUnknown: false, status: rowStatus(calc, tc.handed !== null)
  };
}
const tripCode = (date: string) => `T-${date}`;
function summary(tripId: number): TripSummary {
  const db = getDb();
  const t = db.trips.find((x) => x.id === tripId)!;
  const rows = db.tcs.filter((c) => c.tripId === tripId).map(row);
  return {
    id: t.id, code: tripCode(t.date), date: t.date, supplierId: t.supplierId, supplierName: db.suppliers.find((s) => s.id === t.supplierId)?.name ?? "",
    status: t.status, customers: rows.length, bags: rows.reduce((a, r) => a + (r.handedOver ? r.handedBags : r.orderedBags), 0),
    amount: rows.reduce((a, r) => a + r.amount, 0), paid: rows.reduce((a, r) => a + r.paid, 0),
    remaining: rows.reduce((a, r) => a + Math.max(r.remaining, 0), 0)
  };
}
function mustTc(id: number) { const tc = getDb().tcs.find((t) => t.id === id); if (!tc) throw new ApiError("NOT_FOUND", "Customer not found in this trip"); return tc; }
const sortTrips = <T extends { date: string; id: number }>(a: T[]) => [...a].sort((x, y) => (y.date.localeCompare(x.date)) || y.id - x.id);

// ---------- auth + profile ----------
export const isAuthed = () => typeof localStorage !== "undefined" && localStorage.getItem(AUTH) === "1";
export async function login(username: string, password: string) {
  await wait(250);
  if (!username.trim() || !password) throw new ApiError("BAD_LOGIN", "Enter username and password");
  localStorage.setItem(AUTH, "1"); // STUB: any non-empty login works. Backend: session cookie.
}
export async function logout() { await wait(60); localStorage.removeItem(AUTH); }
export async function getProfile(): Promise<Profile> { await wait(); return clone(getDb().profile); }
export async function updateProfile(p: Partial<Pick<Profile, "name" | "phone" | "email">>) {
  await wait();
  const pr = getDb().profile;
  if (p.name !== undefined) { if (!p.name.trim()) throw new ApiError("INVALID", "Name is required"); pr.name = p.name.trim(); }
  if (p.phone !== undefined) pr.phone = p.phone.trim();
  if (p.email !== undefined) pr.email = p.email.trim();
  commit();
}
export async function patchPreferences(patch: Partial<Preferences>): Promise<Preferences> {
  await wait(40);
  const pr = getDb().profile.preferences;
  const { ratesSet: _ignored, ...safe } = patch; // rate flags only change through setRates
  void _ignored;
  Object.assign(pr, safe);
  commit();
  return clone(pr);
}
// Write-only. `all` fills every active fish; perFish overrides one fish.
export async function setRates(input: { all?: number; perFish?: Record<number, number> }) {
  await wait();
  const db = getDb();
  const bad = [input.all, ...Object.values(input.perFish ?? {})].some((v) => v !== undefined && (!Number.isInteger(v) || v < 1 || v > 100000));
  if (bad) throw new ApiError("INVALID", "Rate must be a whole number from 1 to 100000");
  if (input.all !== undefined) db.fish.filter((f) => f.active).forEach((f) => { db.secretRates[String(f.id)] = input.all!; });
  Object.entries(input.perFish ?? {}).forEach(([id, v]) => { db.secretRates[id] = v; });
  db.fish.forEach((f) => { f.rateSet = db.secretRates[String(f.id)] !== undefined; db.profile.preferences.ratesSet.perFish[String(f.id)] = f.rateSet; });
  db.profile.preferences.ratesSet.all = db.fish.filter((f) => f.active).every((f) => f.rateSet);
  commit();
}
export async function resetDemoData() { await wait(); resetDemo(); }

// ---------- master data ----------
export async function listFish(): Promise<Fish[]> { await wait(); return clone(getDb().fish); }
export async function setFishActive(id: number, active: boolean) { await wait(40); const f = getDb().fish.find((x) => x.id === id); if (f) { f.active = active; commit(); } }
export async function setFishPhoto(id: number, dataUrl: string | null) {
  await wait(40);
  if (dataUrl && dataUrl.length > 400_000) throw new ApiError("TOO_BIG", "Photo is too large");
  const f = getDb().fish.find((x) => x.id === id); if (f) { f.photo = dataUrl; commit(); }
}
export async function listSuppliers(): Promise<Supplier[]> { await wait(); return clone(getDb().suppliers.filter((s) => s.active)); }

// ---------- trips ----------
export async function listTrips(): Promise<TripSummary[]> {
  await wait();
  return sortTrips(getDb().trips).map((t) => summary(t.id));
}
export async function getActiveTripId(): Promise<number | null> {
  await wait(30);
  return getDb().trips.find((t) => t.status === "IN_PROGRESS")?.id ?? null;
}
export async function getTrip(id: number): Promise<TripDetail> {
  await wait();
  const db = getDb();
  if (!db.trips.some((t) => t.id === id)) throw new ApiError("NOT_FOUND", "Trip not found");
  const rows = db.tcs.filter((c) => c.tripId === id).map(row);
  const totals = new Map<number, FishTotal>();
  rows.forEach((r) => r.lines.forEach((l) => {
    const t = totals.get(l.fishId) ?? { fishId: l.fishId, name: l.fishName, color: l.color, ordered: 0, handed: 0 };
    t.ordered += l.ordered; t.handed += l.handed ?? 0; totals.set(l.fishId, t);
  }));
  return { trip: summary(id), rows, fishTotals: [...totals.values()], handedCount: rows.filter((r) => r.handedOver).length };
}
export async function createTrip(input: { supplierId: number; date: string; fishIds: number[]; orders: { customerId: number; bags: Record<number, number> }[] }) {
  await wait(150);
  const db = getDb();
  if (db.trips.some((t) => t.status === "IN_PROGRESS")) throw new ApiError("ACTIVE_EXISTS", "Close the current trip first. One active trip at a time.");
  if (!db.suppliers.some((s) => s.id === input.supplierId)) throw new ApiError("INVALID", "Choose a supplier");
  if (input.fishIds.length === 0) throw new ApiError("INVALID", "Choose at least one fish type");
  const orders = input.orders.filter((o) => Object.values(o.bags).some((n) => n > 0));
  if (orders.length === 0) throw new ApiError("INVALID", "Add at least one customer with bags");
  const trip = { id: nextId("trip"), date: input.date, supplierId: input.supplierId, status: "IN_PROGRESS" as const, fishIds: input.fishIds };
  db.trips.push(trip);
  orders.forEach((o) => db.tcs.push({
    id: nextId("tc"), tripId: trip.id, customerId: o.customerId, orders: Object.fromEntries(Object.entries(o.bags).filter(([, n]) => n > 0)),
    handed: null, rateSnap: null, handedAt: null, note: ""
  }));
  commit();
  return trip.id;
}
export async function closeTrip(id: number) {
  await wait(120);
  const db = getDb();
  const t = db.trips.find((x) => x.id === id);
  if (!t) throw new ApiError("NOT_FOUND", "Trip not found");
  if (t.status !== "IN_PROGRESS") throw new ApiError("INVALID", "Trip is not active");
  const pending = db.tcs.filter((c) => c.tripId === id && c.handed === null).length;
  if (pending > 0) throw new ApiError("PENDING_HANDOVERS", `${pending} customer${pending > 1 ? "s" : ""} not handed over yet`);
  t.status = "CLOSED"; // unpaid balances do NOT block closing
  commit();
}

// ---------- customer in trip ----------
export async function getTripCustomer(_tripId: number, tcId: number) {
  await wait();
  const tc = mustTc(tcId);
  const db = getDb();
  const trip = db.trips.find((t) => t.id === tc.tripId)!;
  const payments = clone(db.payments.filter((p) => p.tripCustomerId === tcId)).sort((a, b) => b.at.localeCompare(a.at) || b.id - a.id);
  return { row: row(tc), trip: summary(trip.id), payments };
}
export async function recordHandover(_tripId: number, tcId: number, input: { bags: Record<number, number>; note: string; ref?: string }) {
  await wait(150);
  const tc = mustTc(tcId);
  const db = getDb();
  const trip = db.trips.find((t) => t.id === tc.tripId)!;
  if (trip.status !== "IN_PROGRESS") throw new ApiError("TRIP_CLOSED", "This trip is closed");
  if (tc.handed !== null) throw new ApiError("ALREADY_HANDED", "Handover is already recorded");
  const handed: Record<string, number> = {};
  for (const [f, n] of Object.entries(input.bags)) {
    if (!Number.isInteger(n) || n < 0 || n > 9999) throw new ApiError("INVALID", "Bags must be a whole number");
    handed[f] = n;
  }
  tc.handed = handed; tc.rateSnap = snapRates(); tc.handedAt = new Date().toISOString(); tc.note = input.note.trim().slice(0, 300);
  commit();
}

// ---------- payments ----------
export async function recordPayment(_tripId: number, tcId: number, input: { kind: PayKind; amount: number; method: Method; note: string; ref: string }) {
  await wait(160);
  const db = getDb();
  const tc = mustTc(tcId);
  const dup = db.payments.find((p) => p.ref === input.ref);
  if (dup) return { payment: clone(dup), replay: true }; // retry with the same ref never records twice
  const trip = db.trips.find((t) => t.id === tc.tripId)!;
  if (!validateAmount(String(input.amount))) throw new ApiError("INVALID", "Enter a whole rupee amount above zero");
  if (input.method !== "CASH" && input.method !== "ONLINE") throw new ApiError("INVALID", "Choose cash or online");
  if (input.kind === "ADVANCE") {
    if (trip.status === "CLOSED") throw new ApiError("TRIP_CLOSED", "Advance cannot be added to a closed trip");
    if (tc.handed !== null) throw new ApiError("ALREADY_HANDED", "Handover is done. Record a current payment instead");
  } else if (tc.handed === null) {
    throw new ApiError("NOT_HANDED", "Record the handover first");
  }
  const pays = db.payments.filter((p) => p.tripCustomerId === tcId);
  const before = calcRow(internalLines(tc), tc.handed !== null, pays);
  const payment: Payment = {
    id: nextId("payment"), tripId: tc.tripId, tripCustomerId: tcId, kind: input.kind, amount: input.amount, method: input.method, note: input.note.trim().slice(0, 200),
    at: new Date().toISOString(), voidedAt: null, voidReason: null, remainingAfter: before.remaining - input.amount, ref: input.ref
  };
  db.payments.push(payment);
  commit();
  return { payment: clone(payment), replay: false };
}
export async function voidPayment(_tripId: number, _tcId: number, paymentId: number, reason: string) {
  await wait(120);
  const p = getDb().payments.find((x) => x.id === paymentId);
  if (!p) throw new ApiError("NOT_FOUND", "Payment not found");
  if (p.voidedAt) throw new ApiError("INVALID", "Already cancelled");
  if (reason.trim().length < 3) throw new ApiError("INVALID", "Give a short reason");
  p.voidedAt = new Date().toISOString(); p.voidReason = reason.trim(); // row stays. History is never deleted.
  commit();
}
export async function getReceipt(_tripId: number, _tcId: number, paymentId: number): Promise<Receipt> {
  await wait();
  const db = getDb();
  const p = db.payments.find((x) => x.id === paymentId);
  if (!p) throw new ApiError("NOT_FOUND", "Receipt not found");
  const tc = mustTc(p.tripCustomerId);
  const r = row(tc);
  const trip = db.trips.find((t) => t.id === tc.tripId)!;
  // "remainingForTrip" is the snapshot taken when the payment was made, so old receipts never change.
  const paidThen = r.amount - p.remainingAfter;
  return {
    receiptNo: `R-${p.at.slice(0, 10).replace(/-/g, "")}-${String(p.id).padStart(4, "0")}`, at: p.at, customerName: r.name, customerPhone: r.phone,
    tripCode: tripCode(trip.date), supplierName: db.suppliers.find((s) => s.id === trip.supplierId)?.name ?? "", kind: p.kind, method: p.method,
    amountReceived: p.amount, tripAmount: r.amount, paidSoFar: paidThen, remainingForTrip: p.remainingAfter, voided: !!p.voidedAt
  };
}

// ---------- customers ----------
export async function listCustomers(): Promise<CustomerSummary[]> {
  await wait();
  const db = getDb();
  return db.customers.filter((c) => c.active).map((c) => {
    const rows = db.tcs.filter((t) => t.customerId === c.id).map(row);
    return { ...c, outstanding: rows.reduce((a, r) => a + Math.max(r.remaining, 0), 0), trips: rows.length };
  }).sort((a, b) => a.name.localeCompare(b.name));
}
export async function addCustomer(input: { name: string; phone: string; address: string }): Promise<Customer> {
  await wait(120);
  const db = getDb();
  const name = input.name.trim();
  if (name.length < 2) throw new ApiError("INVALID", "Enter the customer name");
  if (db.customers.some((c) => c.name.toLowerCase() === name.toLowerCase())) throw new ApiError("DUPLICATE", "A customer with this name already exists");
  const c: Customer = { id: nextId("customer"), name, phone: input.phone.trim(), address: input.address.trim(), active: true };
  db.customers.push(c); commit();
  return clone(c);
}
export async function getCustomer(id: number): Promise<CustomerDetail> {
  await wait();
  const db = getDb();
  const customer = db.customers.find((c) => c.id === id);
  if (!customer) throw new ApiError("NOT_FOUND", "Customer not found");
  const trips = sortTrips(db.tcs.filter((t) => t.customerId === id).map((tc) => ({ tc, trip: db.trips.find((t) => t.id === tc.tripId)! })).map((x) => ({ ...x, date: x.trip.date, id: x.tc.id })))
    .map(({ tc, trip }) => { const r = row(tc); return { tripId: trip.id, tripCode: tripCode(trip.date), date: trip.date, status: trip.status, tcId: tc.id, amount: r.amount, paid: r.paid, remaining: r.remaining, rateMissing: r.rateMissing }; });
  return { customer: clone(customer), outstanding: trips.reduce((a, t) => a + Math.max(t.remaining, 0), 0), trips };
}

// ---------- dashboard ----------
export async function getOutstanding(): Promise<Outstanding> {
  await wait();
  const db = getDb();
  const trips = sortTrips(db.trips).map((t) => {
    const rows = db.tcs.filter((c) => c.tripId === t.id).map(row).filter((r) => r.remaining > 0);
    return { tripId: t.id, code: tripCode(t.date), date: t.date, remaining: rows.reduce((a, r) => a + r.remaining, 0), customers: rows.length };
  }).filter((t) => t.remaining > 0);
  return { total: trips.reduce((a, t) => a + t.remaining, 0), trips };
}
export async function getLowStock() {
  // STUB: stock ledger is a backend feature. Shows how the threshold settings will be used.
  await wait(30);
  const p = getDb().profile.preferences;
  if (!p.stockAlerts.enabled || !p.stockAlerts.onDashboard) return [];
  const fish = getDb().fish.filter((f) => f.active);
  const left: Record<string, number> = { "1": 6, "2": 14, "3": 3, "4": 22, "5": 9, "6": 30 };
  return fish.map((f) => ({ fishId: f.id, name: f.name, left: left[String(f.id)] ?? 20, limit: p.lowStock.perFish[String(f.id)] ?? p.lowStock.all }))
    .filter((x) => x.left <= x.limit);
}

export async function pingBackend(): Promise<{ ok: boolean; mode: "demo" | "live" }> { return { ok: true, mode: "demo" }; }
