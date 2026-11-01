// LIVE API: talks to the FastAPI backend wherever an endpoint exists.
// Still local (stub) because the backend has no endpoint yet:
//   profile + preferences, default rates (kept on this device), fish photos, receipt PDF,
//   and "expected amount before handover" (the screens show "after handover" instead).
import { rowStatus } from "./money";
import { notify } from "./stub";
import * as stub from "./stubApi";
import { clearCache, get, write } from "./http";
import {
  ApiError, type Customer, type CustomerDetail, type CustomerSummary, type CustomerTripBalance, type Fish, type FishTotal, type Line, type Method,
  type Outstanding, type PayKind, type Payment, type Preferences, type Profile, type Receipt, type Supplier, type TripDetail, type TripRow, type TripStatus, type TripSummary
} from "./types";

/* ---------- backend payload shapes (only what we read) ---------- */
interface TripR { id: number; trip_date: string; supplier_id: number; status: string }
interface FishR { id: number; name: string; is_active: boolean }
interface SupR { id: number; name: string; phone: string; is_active: boolean }
interface CustR { id: number; name: string; phone: string; address: string; is_active: boolean }
interface ReqTable { customers: { trip_customer_id: number; customer_id: number; name: string; phone: string; quantities: { fish_type_id: number; quantity_bags: number }[] }[] }
interface HandR { trip_customer_id: number; note: string | null; handed_over_at: string; lines: { fish_type_id: number; bags: number }[] }
interface SumCust { trip_customer_id: number; customer_id: number; billed_amount: string; complete: boolean; advance_paid: string; total_paid: string; remaining: string }
interface Summary { customers: SumCust[] }
interface PayR { id: number; trip_customer_id: number; reference: string; amount: string; method: string; kind: string; paid_at: string; note: string | null; voided_at: string | null; void_reason: string | null }
interface StockR { fish_type_id: number; fish_type_name: string; left_bags: number; on_slip: boolean }

const num = (s: string | number | null | undefined) => (s == null ? 0 : Number(s));
const code = (date: string) => `T-${date}`;
const status = (s: string): TripStatus => (s === "CLOSED" ? "CLOSED" : "IN_PROGRESS");
const PAL = ["#3f8be0", "#e08f3a", "#58a97f", "#8a73d6", "#8b9aaa", "#c2a152", "#c0632b", "#2f7fa8"];
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

/* ---------- device-only data (photos, rates until the backend has endpoints) ---------- */
const META = "ms_live_meta";
interface Meta { photos: Record<string, string>; rates: Record<string, number> }
const readMeta = (): Meta => { try { return { photos: {}, rates: {}, ...(JSON.parse(localStorage.getItem(META) ?? "{}") as Partial<Meta>) }; } catch { return { photos: {}, rates: {} }; } };
const saveMeta = (m: Meta) => { try { localStorage.setItem(META, JSON.stringify(m)); } catch { /* storage full */ } };

/* ---------- auth ---------- */
const AUTH = "ms_auth";
export const isAuthed = () => typeof localStorage !== "undefined" && localStorage.getItem(AUTH) === "1";
export async function login(username: string, password: string) {
  if (!username.trim() || !password) throw new ApiError("BAD_LOGIN", "Enter username and password");
  await write("POST", "/api/auth/login", { username: username.trim(), password, token_in_body: false });
  localStorage.setItem(AUTH, "1");
}
export async function logout() { try { await write("POST", "/api/auth/logout"); } finally { localStorage.removeItem(AUTH); clearCache(); } }
export async function pingBackend(): Promise<{ ok: boolean; mode: "demo" | "live" }> {
  try { await get("/api/health"); return { ok: true, mode: "live" }; } catch { return { ok: false, mode: "live" }; }
}

/* ---------- master data ---------- */
async function fishRaw() { return get<FishR[]>("/api/fish-types/"); }
export async function listFish(): Promise<Fish[]> {
  const [raw, meta] = await Promise.all([fishRaw(), Promise.resolve(readMeta())]);
  return raw.map((f, i) => ({ id: f.id, name: f.name, active: f.is_active, photo: meta.photos[String(f.id)] ?? null, color: PAL[i % PAL.length]!, rateSet: meta.rates[String(f.id)] !== undefined }));
}
export async function setFishActive(id: number, active: boolean) { await write("POST", `/api/fish-types/${id}/${active ? "activate" : "deactivate"}`); notify(); }
export async function setFishPhoto(id: number, dataUrl: string | null) {
  if (dataUrl && dataUrl.length > 400_000) throw new ApiError("TOO_BIG", "Photo is too large");
  const m = readMeta(); if (dataUrl) m.photos[String(id)] = dataUrl; else delete m.photos[String(id)];
  saveMeta(m); notify(); // device only until the backend has a photo endpoint
}
export async function listSuppliers(): Promise<Supplier[]> {
  const raw = await get<SupR[]>("/api/suppliers/");
  return raw.filter((s) => s.is_active).map((s) => ({ id: s.id, name: s.name, phone: s.phone, active: s.is_active }));
}

/* ---------- profile (local until the backend has /api/profile) ---------- */
export async function getProfile(): Promise<Profile> {
  const [p, me, fish] = await Promise.all([stub.getProfile(), get<{ username: string }>("/api/auth/me"), listFish()]);
  p.username = me.username;
  const active = fish.filter((f) => f.active);
  p.preferences.ratesSet = { all: active.length > 0 && active.every((f) => f.rateSet), perFish: Object.fromEntries(fish.map((f) => [String(f.id), f.rateSet])) };
  return p;
}
export const updateProfile = stub.updateProfile;
export const patchPreferences = stub.patchPreferences;
// Write-only. Kept on this device and sent with each NEW trip (PUT /trips/{id}/rates) until the backend stores default rates.
export async function setRates(input: { all?: number; perFish?: Record<number, number> }) {
  const vals = [input.all, ...Object.values(input.perFish ?? {})];
  if (vals.some((v) => v !== undefined && (!Number.isInteger(v) || v < 1 || v > 100000))) throw new ApiError("INVALID", "Rate must be a whole number from 1 to 100000");
  const m = readMeta();
  if (input.all !== undefined) (await fishRaw()).filter((f) => f.is_active).forEach((f) => { m.rates[String(f.id)] = input.all!; });
  Object.entries(input.perFish ?? {}).forEach(([id, v]) => { m.rates[id] = v; });
  saveMeta(m); notify();
}
export async function resetDemoData() { localStorage.removeItem(META); await stub.resetDemoData(); }

/* ---------- trip building blocks ---------- */
interface Bundle { trip: TripR; req: ReqTable; hands: HandR[]; sum: Summary }
async function bundle(tripId: number): Promise<Bundle> {
  const [trip, req, hands, sum] = await Promise.all([
    get<TripR>(`/api/trips/${tripId}`), get<ReqTable>(`/api/trips/${tripId}/requirements-table`),
    get<HandR[]>(`/api/trips/${tripId}/handovers`), get<Summary>(`/api/trips/${tripId}/payments-summary`)
  ]);
  return { trip, req, hands, sum };
}
function rowsOf(b: Bundle, fish: Map<number, Fish>): TripRow[] {
  const handed = new Map<number, Map<number, number>>();
  const notes = new Map<number, string>();
  b.hands.forEach((h) => {
    const m = handed.get(h.trip_customer_id) ?? new Map<number, number>();
    h.lines.forEach((l) => m.set(l.fish_type_id, (m.get(l.fish_type_id) ?? 0) + l.bags));
    handed.set(h.trip_customer_id, m);
    if (h.note) notes.set(h.trip_customer_id, h.note);
  });
  return b.req.customers.map((c) => {
    const s = b.sum.customers.find((x) => x.trip_customer_id === c.trip_customer_id);
    const hm = handed.get(c.trip_customer_id);
    const handedOver = !!hm;
    const ids = [...new Set([...c.quantities.map((q) => q.fish_type_id), ...(hm ? [...hm.keys()] : [])])];
    const lines: Line[] = ids.map((id) => {
      const f = fish.get(id);
      return { fishId: id, fishName: f?.name ?? `Fish ${id}`, color: f?.color ?? "#3f8be0", photo: f?.photo ?? null, ordered: c.quantities.find((q) => q.fish_type_id === id)?.quantity_bags ?? 0, handed: handedOver ? hm!.get(id) ?? 0 : null, rate: null };
    }).filter((l) => l.ordered > 0 || (l.handed ?? 0) > 0);
    const amount = handedOver ? num(s?.billed_amount) : 0;
    const paid = num(s?.total_paid);
    const advance = num(s?.advance_paid);
    const remaining = handedOver ? num(s?.remaining) : 0;
    const rateMissing = handedOver && !!s && !s.complete;
    const st = !handedOver ? (paid > 0 ? "ADVANCE" : "PENDING") : rowStatus({ amount, amountFinal: true, paid, advance, remaining, rateMissing }, true);
    return {
      id: c.trip_customer_id, tripId: b.trip.id, customerId: c.customer_id, name: c.name, phone: c.phone, lines,
      orderedBags: lines.reduce((a, l) => a + l.ordered, 0), handedBags: lines.reduce((a, l) => a + (l.handed ?? 0), 0), handedOver,
      handoverNote: notes.get(c.trip_customer_id) ?? "", amount, amountFinal: handedOver, paid, advance, remaining, rateMissing, amountUnknown: !handedOver, status: st
    } satisfies TripRow;
  });
}
const fishMap = async () => new Map((await listFish()).map((f) => [f.id, f]));
function summaryOf(b: Bundle, rows: TripRow[], suppliers: Supplier[]): TripSummary {
  return {
    id: b.trip.id, code: code(b.trip.trip_date), date: b.trip.trip_date, supplierId: b.trip.supplier_id, supplierName: suppliers.find((s) => s.id === b.trip.supplier_id)?.name ?? "",
    status: status(b.trip.status), customers: rows.length, bags: rows.reduce((a, r) => a + (r.handedOver ? r.handedBags : r.orderedBags), 0),
    amount: rows.reduce((a, r) => a + r.amount, 0), paid: rows.reduce((a, r) => a + r.paid, 0), remaining: rows.reduce((a, r) => a + Math.max(r.remaining, 0), 0),
    amountPending: rows.length > 0 && rows.every((r) => r.amountUnknown)
  };
}
const sortTrips = <T extends { trip_date: string; id: number }>(a: T[]) => [...a].sort((x, y) => y.trip_date.localeCompare(x.trip_date) || y.id - x.id);
async function allBundles() {
  const trips = sortTrips(await get<TripR[]>("/api/trips/"));
  const [fish, suppliers, bundles] = await Promise.all([fishMap(), listSuppliersAll(), Promise.all(trips.map((t) => bundle(t.id)))]);
  return bundles.map((b) => { const rows = rowsOf(b, fish); return { b, rows, summary: summaryOf(b, rows, suppliers) }; });
}
async function listSuppliersAll(): Promise<Supplier[]> { const raw = await get<SupR[]>("/api/suppliers/"); return raw.map((s) => ({ id: s.id, name: s.name, phone: s.phone, active: s.is_active })); }

/* ---------- trips ---------- */
export async function listTrips(): Promise<TripSummary[]> { return (await allBundles()).map((x) => x.summary); }
export async function getActiveTripId(): Promise<number | null> {
  const t = sortTrips(await get<TripR[]>("/api/trips/")).find((x) => status(x.status) === "IN_PROGRESS");
  return t?.id ?? null;
}
export async function getTrip(id: number): Promise<TripDetail> {
  const [b, fish, suppliers] = await Promise.all([bundle(id), fishMap(), listSuppliersAll()]);
  const rows = rowsOf(b, fish);
  const totals = new Map<number, FishTotal>();
  rows.forEach((r) => r.lines.forEach((l) => {
    const t = totals.get(l.fishId) ?? { fishId: l.fishId, name: l.fishName, color: l.color, ordered: 0, handed: 0 };
    t.ordered += l.ordered; t.handed += l.handed ?? 0; totals.set(l.fishId, t);
  }));
  return { trip: summaryOf(b, rows, suppliers), rows, fishTotals: [...totals.values()], handedCount: rows.filter((r) => r.handedOver).length };
}
export async function createTrip(input: { supplierId: number; date: string; fishIds: number[]; orders: { customerId: number; bags: Record<number, number> }[] }) {
  if (!input.supplierId) throw new ApiError("INVALID", "Choose a supplier");
  if (input.fishIds.length === 0) throw new ApiError("INVALID", "Choose at least one fish type");
  const orders = input.orders.filter((o) => Object.values(o.bags).some((n) => n > 0));
  if (orders.length === 0) throw new ApiError("INVALID", "Add at least one customer with bags");
  if (await getActiveTripId()) throw new ApiError("ACTIVE_EXISTS", "Close the current trip first. One active trip at a time.");
  const trip = await write<TripR>("POST", "/api/trips/", { trip_date: input.date, supplier_id: input.supplierId, fish_type_ids: input.fishIds });
  try {
    for (const o of orders) {
      await write("POST", `/api/trips/${trip.id}/customers`, { customer_id: o.customerId });
      for (const [fid, n] of Object.entries(o.bags)) if (n > 0) await write("POST", `/api/trips/${trip.id}/customers/${o.customerId}/requirements`, { fish_type_id: Number(fid), quantity_bags: n });
    }
    const rates = readMeta().rates;
    const lines = input.fishIds.filter((f) => rates[String(f)] !== undefined).map((f) => ({ fish_type_id: f, rate_per_bag: String(rates[String(f)]) }));
    if (lines.length > 0) await write("PUT", `/api/trips/${trip.id}/rates`, { rates: lines });
  } catch (e) {
    notify();
    throw new ApiError("PARTIAL", `Trip #${trip.id} was created but not finished: ${e instanceof Error ? e.message : "error"}. Open it from Trips to fix.`);
  }
  notify();
  return trip.id;
}
export async function closeTrip(id: number) { await write("POST", `/api/trips/${id}/close`); notify(); }

/* ---------- customer in trip ---------- */
function mapPayments(list: PayR[], tripId: number, row: TripRow): Payment[] {
  const asc = [...list].sort((a, b) => a.paid_at.localeCompare(b.paid_at) || a.id - b.id);
  let cum = 0;
  const out = asc.map((p) => {
    if (!p.voided_at) cum += num(p.amount);
    return {
      id: p.id, tripId, tripCustomerId: p.trip_customer_id, kind: p.kind as PayKind, amount: num(p.amount), method: p.method as Method, note: p.note ?? "", at: p.paid_at,
      voidedAt: p.voided_at, voidReason: p.void_reason, remainingAfter: row.handedOver ? row.amount - cum : 0, ref: p.reference
    } satisfies Payment;
  });
  return out.reverse();
}
export async function getTripCustomer(tripId: number, tcId: number) {
  const [d, raw] = await Promise.all([getTrip(tripId), get<PayR[]>(`/api/trips/${tripId}/customers/${tcId}/payments`)]);
  const row = d.rows.find((r) => r.id === tcId);
  if (!row) throw new ApiError("NOT_FOUND", "Customer not found in this trip");
  return { row, trip: d.trip, payments: mapPayments(raw, tripId, row) };
}
export async function recordHandover(tripId: number, tcId: number, input: { bags: Record<number, number>; note: string; ref?: string }) {
  const lines = Object.entries(input.bags).filter(([, n]) => n > 0).map(([f, n]) => ({ fish_type_id: Number(f), bags: n }));
  if (lines.length === 0) throw new ApiError("INVALID", "Enter at least one bag to hand over");
  await write("POST", `/api/trips/${tripId}/handovers`, { trip_customer_id: tcId, submit_reference: input.ref ?? uid(), note: input.note.trim() || null, lines });
  notify();
}

/* ---------- payments ---------- */
export async function recordPayment(tripId: number, tcId: number, input: { kind: PayKind; amount: number; method: Method; note: string; ref: string }) {
  const p = await write<PayR>("POST", `/api/trips/${tripId}/customers/${tcId}/payments`, { reference: input.ref, amount: String(input.amount), method: input.method, kind: input.kind, note: input.note.trim() || null });
  const fresh = await getTripCustomer(tripId, tcId); // balance after this payment, from saved records
  notify();
  const payment = fresh.payments.find((x) => x.id === p.id) ?? mapPayments([p], tripId, fresh.row)[0]!;
  return { payment, replay: false };
}
export async function voidPayment(tripId: number, tcId: number, paymentId: number, reason: string) {
  if (reason.trim().length < 3) throw new ApiError("INVALID", "Give a short reason");
  await write("POST", `/api/trips/${tripId}/customers/${tcId}/payments/${paymentId}/void`, { reason: reason.trim() });
  notify();
}
export async function getReceipt(tripId: number, tcId: number, paymentId: number): Promise<Receipt> {
  const d = await getTripCustomer(tripId, tcId);
  const p = d.payments.find((x) => x.id === paymentId);
  if (!p) throw new ApiError("NOT_FOUND", "Receipt not found");
  // Remaining is replayed from the saved payments in order. The backend does not store a snapshot yet.
  return {
    receiptNo: `R-${p.at.slice(0, 10).replace(/-/g, "")}-${String(p.id).padStart(4, "0")}`, at: p.at, customerName: d.row.name, customerPhone: d.row.phone,
    tripCode: d.trip.code, supplierName: d.trip.supplierName, kind: p.kind, method: p.method, amountReceived: p.amount, tripAmount: d.row.amountUnknown ? 0 : d.row.amount,
    paidSoFar: d.row.handedOver ? d.row.amount - p.remainingAfter : p.amount, remainingForTrip: d.row.handedOver ? p.remainingAfter : null, voided: !!p.voidedAt
  };
}

/* ---------- customers ---------- */
export async function listCustomers(): Promise<CustomerSummary[]> {
  const [raw, all] = await Promise.all([get<CustR[]>("/api/customers/"), allBundles()]);
  const out = new Map<number, { due: number; trips: number }>();
  all.forEach(({ rows }) => rows.forEach((r) => { const o = out.get(r.customerId) ?? { due: 0, trips: 0 }; o.due += Math.max(r.remaining, 0); o.trips++; out.set(r.customerId, o); }));
  return raw.filter((c) => c.is_active).map((c) => ({ id: c.id, name: c.name, phone: c.phone, address: c.address, active: c.is_active, outstanding: out.get(c.id)?.due ?? 0, trips: out.get(c.id)?.trips ?? 0 }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
export async function addCustomer(input: { name: string; phone: string; address: string }): Promise<Customer> {
  if (input.name.trim().length < 2) throw new ApiError("INVALID", "Enter the customer name");
  if (!input.phone.trim() || !input.address.trim()) throw new ApiError("INVALID", "Phone and place are required");
  const c = await write<CustR>("POST", "/api/customers/", { name: input.name.trim(), phone: input.phone.trim(), address: input.address.trim() });
  notify();
  return { id: c.id, name: c.name, phone: c.phone, address: c.address, active: c.is_active };
}
export async function getCustomer(id: number): Promise<CustomerDetail> {
  const [c, all] = await Promise.all([get<CustR>(`/api/customers/${id}`), allBundles()]);
  const trips: CustomerTripBalance[] = [];
  all.forEach(({ b, rows, summary }) => rows.filter((r) => r.customerId === id).forEach((r) => trips.push({
    tripId: b.trip.id, tripCode: summary.code, date: summary.date, status: summary.status, tcId: r.id, amount: r.amount, paid: r.paid, remaining: r.remaining, rateMissing: r.rateMissing
  })));
  return { customer: { id: c.id, name: c.name, phone: c.phone, address: c.address, active: c.is_active }, outstanding: trips.reduce((a, t) => a + Math.max(t.remaining, 0), 0), trips };
}

/* ---------- dashboard ---------- */
export async function getOutstanding(): Promise<Outstanding> {
  const trips = (await allBundles()).map(({ rows, summary }) => {
    const due = rows.filter((r) => r.remaining > 0);
    return { tripId: summary.id, code: summary.code, date: summary.date, remaining: due.reduce((a, r) => a + r.remaining, 0), customers: due.length };
  }).filter((t) => t.remaining > 0);
  return { total: trips.reduce((a, t) => a + t.remaining, 0), trips };
}
export async function getLowStock() {
  const id = await getActiveTripId();
  if (!id) return [];
  const p: Preferences = (await stub.getProfile()).preferences;
  if (!p.stockAlerts.enabled || !p.stockAlerts.onDashboard) return [];
  const stock = await get<StockR[]>(`/api/trips/${id}/stock`);
  return stock.filter((s) => s.on_slip).map((s) => ({ fishId: s.fish_type_id, name: s.fish_type_name, left: s.left_bags, limit: p.lowStock.perFish[String(s.fish_type_id)] ?? p.lowStock.all })).filter((x) => x.left <= x.limit);
}
