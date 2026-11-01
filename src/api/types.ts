// Shapes the UI uses. The future FastAPI backend must return these shapes (see BACKEND_GUIDE.md).
export type Method = "CASH" | "ONLINE";
export type PayKind = "ADVANCE" | "PAYMENT";
export type TripStatus = "PLANNED" | "IN_PROGRESS" | "CLOSED";
// Per customer in a trip: what the list chip shows.
export type RowStatus = "PENDING" | "ADVANCE" | "HANDED" | "PARTIAL" | "PAID" | "CREDIT";

export interface Fish { id: number; name: string; active: boolean; photo: string | null; color: string; rateSet: boolean }
export interface Supplier { id: number; name: string; phone: string; active: boolean }
export interface Customer { id: number; name: string; phone: string; address: string; active: boolean }

export interface Line { fishId: number; fishName: string; color: string; photo: string | null; ordered: number; handed: number | null; rate: number | null }

export interface TripRow {
  id: number;            // trip_customer id
  tripId: number;
  customerId: number;
  name: string;
  phone: string;
  lines: Line[];
  orderedBags: number;
  handedBags: number;
  handedOver: boolean;
  handoverNote: string;
  amount: number;        // expected (before handover) or billed (after handover)
  amountFinal: boolean;  // false until handover is recorded
  paid: number;
  advance: number;
  remaining: number;     // negative = credit
  rateMissing: boolean;
  amountUnknown: boolean; // true when the backend cannot give an amount before handover
  status: RowStatus;
}

export interface Payment {
  id: number; tripId: number; tripCustomerId: number; kind: PayKind; amount: number; method: Method;
  note: string; at: string; voidedAt: string | null; voidReason: string | null;
  remainingAfter: number; // snapshot at the moment of this payment
  ref: string;
}

export interface TripSummary {
  id: number; code: string; date: string; supplierId: number; supplierName: string; status: TripStatus;
  customers: number; bags: number; amount: number; paid: number; remaining: number;
  amountPending?: boolean; // true while no customer is handed over and the backend cannot give an expected amount
}
export interface FishTotal { fishId: number; name: string; color: string; ordered: number; handed: number }
export interface TripDetail { trip: TripSummary; rows: TripRow[]; fishTotals: FishTotal[]; handedCount: number }

export interface CustomerSummary extends Customer { outstanding: number; trips: number }
export interface CustomerTripBalance { tripId: number; tripCode: string; date: string; status: TripStatus; tcId: number; amount: number; paid: number; remaining: number; rateMissing: boolean }
export interface CustomerDetail { customer: Customer; outstanding: number; trips: CustomerTripBalance[] }

export interface Receipt {
  receiptNo: string; at: string; customerName: string; customerPhone: string; tripCode: string; supplierName: string;
  kind: PayKind; method: Method; amountReceived: number; tripAmount: number; paidSoFar: number; remainingForTrip: number | null; voided: boolean;
}
export interface Outstanding { total: number; trips: { tripId: number; code: string; date: string; remaining: number; customers: number }[] }

export interface Preferences {
  theme: "light" | "dark" | "system";
  showRates: boolean;
  defaultSupplierId: number | null;
  defaultFishIds: number[];
  lowStock: { all: number; perFish: Record<string, number> };
  stockAlerts: { enabled: boolean; onDashboard: boolean; vibrate: boolean };
  // Rates are write-only: the API never returns the values, only which fish have one.
  ratesSet: { all: boolean; perFish: Record<string, boolean> };
}
export interface Profile { name: string; username: string; phone: string; email: string; preferences: Preferences }

export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) { super(message); this.code = code; }
}
