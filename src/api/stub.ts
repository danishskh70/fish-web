// STUB BACKEND. Everything here runs in the browser and saves to localStorage so the whole
// app can be used and demoed with no server. Each function in api.ts maps 1:1 to a backend
// endpoint listed in BACKEND_GUIDE.md. To go live: replace the body of each api.ts function
// with a fetch() call. Screens do not change.
import type { Fish, Customer, Payment, Preferences, Profile, Supplier } from "./types";

export interface TripRec { id: number; date: string; supplierId: number; status: "PLANNED" | "IN_PROGRESS" | "CLOSED"; fishIds: number[] }
export interface TcRec { id: number; tripId: number; customerId: number; orders: Record<string, number>; handed: Record<string, number> | null; rateSnap: Record<string, number | null> | null; handedAt: string | null; note: string }
export interface Db {
  schema: number;
  seq: Record<string, number>;
  profile: Profile;
  secretRates: Record<string, number>; // write-only. Never leaves this module except as flags.
  suppliers: Supplier[];
  fish: Fish[];
  customers: Customer[];
  trips: TripRec[];
  tcs: TcRec[];
  payments: Payment[];
}

const KEY = "ms_stub_v3";
const SCHEMA = 3;
let db: Db;
let version = 0;
const subs = new Set<() => void>();

export const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export const getVersion = () => version;
export const getDb = () => db;

export function commit() {
  version++;
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* storage full or blocked: keep in memory */ }
  subs.forEach((f) => f());
}
// Tell every screen to reload (used after real backend writes).
export function notify() { version++; subs.forEach((f) => f()); }
export function resetDemo() { db = seed(); commit(); }
export function nextId(k: string) { db.seq[k] = (db.seq[k] ?? 0) + 1; return db.seq[k]; }

function load(): Db {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    if (raw) { const d = JSON.parse(raw) as Db; if (d.schema === SCHEMA) return d; }
  } catch { /* fall through to seed */ }
  return seed();
}

export const defaultPrefs = (): Preferences => ({
  theme: "light",
  showRates: true,
  defaultSupplierId: 1,
  defaultFishIds: [1, 2, 3],
  lowStock: { all: 10, perFish: {} },
  stockAlerts: { enabled: true, onDashboard: true, vibrate: true },
  ratesSet: { all: true, perFish: { "1": true, "2": true, "3": true, "4": true, "5": true, "6": true } }
});

function seed(): Db {
  const fishRaw: [string, string, number][] = [
    ["Rohu", "#3f8be0", 600], ["Catla", "#e08f3a", 700], ["Mrigal", "#58a97f", 650],
    ["Grass Carp", "#8a73d6", 550], ["Silver Carp", "#8b9aaa", 500], ["Common Carp", "#c2a152", 450]
  ];
  const d: Db = {
    schema: SCHEMA,
    seq: {},
    profile: { name: "Danish", username: "danish", phone: "+91 98765 43210", email: "danish@example.com", preferences: defaultPrefs() },
    secretRates: {},
    suppliers: [
      { id: 1, name: "Sunrise Fisheries", phone: "+91 98220 11111", active: true },
      { id: 2, name: "Green Valley Hatchery", phone: "+91 98220 22222", active: true },
      { id: 3, name: "Blue Lake Seeds", phone: "+91 98220 33333", active: true }
    ],
    fish: fishRaw.map(([name, color, rate], i) => ({ id: i + 1, name, active: true, photo: null, color, rateSet: !!rate })),
    customers: [],
    trips: [], tcs: [], payments: []
  };
  fishRaw.forEach(([, , rate], i) => { d.secretRates[String(i + 1)] = rate; });
  const names = ["Rahul Sharma", "Pooja Kamat", "Amit More", "Sunita Devi", "Vikram Patil", "Neha Joshi", "Sanjay Kale", "Meena Shinde", "Ganesh Pawar", "Anita Jadhav"];
  const places = ["Pune", "Satara", "Nashik", "Sangamner", "Ahilyanagar", "Kolhapur", "Solapur", "Karad", "Baramati", "Shirur"];
  d.customers = names.map((name, i) => ({ id: i + 1, name, phone: `+91 98${(70000 + i * 1371) % 100000} ${String(10000 + i * 777).slice(0, 5)}`, address: places[i], active: true }));
  d.seq = { customer: 10, trip: 0, tc: 0, payment: 0, supplier: 3 };
  db = d; // helpers below read the module level db

  // Four closed trips with real money history, so balances and outstanding have data.
  const closed: { date: string; sup: number; rows: [number, Record<string, number>, number][] }[] = [
    { date: "2026-10-02", sup: 1, rows: [[1, { "1": 3 }, 1800], [2, { "1": 2, "2": 1 }, 1900], [3, { "2": 2 }, 700], [5, { "1": 4 }, 2400]] },
    { date: "2026-10-09", sup: 2, rows: [[2, { "1": 3 }, 1800], [4, { "3": 2 }, 1300], [6, { "2": 2 }, 1400], [7, { "1": 5 }, 2500]] },
    { date: "2026-10-16", sup: 1, rows: [[1, { "1": 2 }, 1200], [3, { "1": 1 }, 600], [8, { "4": 3 }, 1000], [9, { "1": 4 }, 2400]] },
    { date: "2026-10-23", sup: 3, rows: [[4, { "1": 4 }, 2400], [5, { "2": 1 }, 700], [10, { "1": 2, "3": 1 }, 1850], [6, { "1": 3 }, 1800]] }
  ];
  closed.forEach((c) => {
    const trip: TripRec = { id: nextId("trip"), date: c.date, supplierId: c.sup, status: "CLOSED", fishIds: [1, 2, 3, 4] };
    d.trips.push(trip);
    c.rows.forEach(([cust, orders, paid], idx) => {
      const tc: TcRec = { id: nextId("tc"), tripId: trip.id, customerId: cust, orders, handed: { ...orders }, rateSnap: snapRates(), handedAt: `${c.date}T09:${10 + idx}:00.000Z`, note: "" };
      d.tcs.push(tc);
      if (paid > 0) seedPay(tc.id, "PAYMENT", paid, idx % 2 ? "ONLINE" : "CASH", `${c.date}T11:${10 + idx}:00.000Z`);
    });
  });
  // Active trip, set up like the design: Rahul has an advance, nobody handed over yet.
  const active: TripRec = { id: nextId("trip"), date: "2026-10-28", supplierId: 1, status: "IN_PROGRESS", fishIds: [1, 2, 3] };
  d.trips.push(active);
  const act: [number, Record<string, number>][] = [[1, { "1": 2 }], [2, { "1": 3 }], [3, { "1": 1 }], [4, { "1": 4 }], [6, { "2": 2 }], [7, { "1": 5 }]];
  act.forEach(([cust, orders]) => d.tcs.push({ id: nextId("tc"), tripId: active.id, customerId: cust, orders, handed: null, rateSnap: null, handedAt: null, note: "" }));
  seedPay(d.tcs.find((t) => t.tripId === active.id && t.customerId === 1)!.id, "ADVANCE", 1000, "CASH", "2026-10-28T08:30:00.000Z");
  return d;
}

export function snapRates(): Record<string, number | null> {
  const o: Record<string, number | null> = {};
  db.fish.forEach((f) => { o[String(f.id)] = db.secretRates[String(f.id)] ?? null; });
  return o;
}

// Used by seed only. Real payments go through api.recordPayment (validation + idempotency).
function seedPay(tcId: number, kind: "ADVANCE" | "PAYMENT", amount: number, method: "CASH" | "ONLINE", at: string) {
  const tc = db.tcs.find((t) => t.id === tcId)!;
  const rates = tc.rateSnap ?? snapRates();
  const bags = tc.handed ?? tc.orders;
  const amountDue = Object.entries(bags).reduce((a, [f, n]) => a + n * (rates[f] ?? 0), 0);
  const before = db.payments.filter((p) => p.tripCustomerId === tcId && !p.voidedAt).reduce((a, p) => a + p.amount, 0);
  db.payments.push({ id: nextId("payment"), tripId: tc.tripId, tripCustomerId: tcId, kind, amount, method, note: "", at, voidedAt: null, voidReason: null, remainingAfter: amountDue - before - amount, ref: `seed-${tcId}-${db.payments.length}` });
}

// Load last, after every helper above exists (avoids a use-before-init error).
db = load();
