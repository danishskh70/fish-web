export type TripStatus = "PLANNING" | "IN_PROGRESS" | "CLOSED";

export interface Trip {
  id: number;
  trip_date: string;
  supplier_id: number;
  status: TripStatus;
  created_at?: string;
  closed_at?: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  address: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FishType {
  id: number;
  name: string;
  is_active: boolean;
}

export interface Supplier {
  id: number;
  name: string;
  phone: string;
  address: string;
  is_active: boolean;
}

export interface TripCustomerRef {
  id: number;
  trip_id: number;
  customer_id: number;
}

export type SupplierListStatus = "DRAFT" | "FINAL" | "SUPERSEDED";

export interface SupplierListItem {
  id: number;
  supplier_list_id: number;
  fish_type_id: number;
  fish_type_name: string;
  quantity_bags: number;
}

export interface SupplierList {
  id: number;
  trip_id: number;
  status: SupplierListStatus;
  total_bags: number;
  items: SupplierListItem[];
}

export interface RequirementsCustomerItem {
  fish_type_id: number;
  quantity_bags: number;
}

export interface RequirementsTableCustomer {
  trip_customer_id: number;
  customer_id: number;
  name: string;
  phone: string;
  address: string;
  total_bags: number;
  quantities: RequirementsCustomerItem[];
}

export interface RequirementsFishTotal {
  fish_type_id: number;
  fish_type_name: string;
  quantity_bags: number;
  planned_quantity_bags?: number;
}

export interface RequirementsTable {
  customers: RequirementsTableCustomer[];
  fish_types: FishType[];
  fish_totals: RequirementsFishTotal[];
  grand_total_bags: number;
}

export interface DeliverySlipItem {
  id?: number;
  fish_type_id: number;
  fish_type_name?: string;
  delivered_bags: number;
  rejected_bags: number;
  damaged_bags: number;
  shortage_bags?: number;
}

export interface DeliverySlip {
  id: number;
  trip_id: number;
  supplier_list_id?: number;
  vehicle?: string;
  driver?: string;
  received_at: string;
  total_bags: number;
  items: DeliverySlipItem[];
}

export interface HandoverLine {
  id?: number;
  handover_id?: number;
  fish_type_id: number;
  fish_type_name?: string;
  bags: number;
}

export interface Handover {
  id: number;
  trip_id: number;
  trip_customer_id: number;
  customer_id: number;
  handed_over_at: string;
  submit_reference?: string;
  note?: string;
  total_bags: number;
  lines: HandoverLine[];
}

export interface HandoverTotalRow {
  trip_id: number;
  trip_customer_id: number;
  customer_id: number;
  fish_type_id: number;
  fish_type_name: string;
  bags: number;
}

export interface StockLine {
  fish_type_id: number;
  fish_type_name: string;
  on_slip: boolean;
  slip_bags: number;
  delivered_bags: number;
  rejected_bags: number;
  damaged_bags: number;
  handed_bags: number;
  left_bags: number;
}

export interface RateStatusFish {
  fish_type_id: number;
  fish_type_name: string;
  default_set: boolean;
  override_trip_customer_ids: number[];
}

export interface BillCustomer {
  trip_customer_id: number;
  customer_id: number;
  total_bags: number;
  unpriced_bags: number;
  complete: boolean;
  total_amount: string;
}

export interface Bill {
  total_bags: number;
  unpriced_bags: number;
  complete: boolean;
  total_amount: string;
  customers: BillCustomer[];
}

export type Phase = "preparing" | "configured" | "progress" | "closed";

export type PaymentMethod = "CASH" | "ONLINE";
export type PaymentKind = "ADVANCE" | "PAYMENT";

export interface Payment {
  id: number;
  trip_customer_id: number;
  reference: string;
  amount: string;
  method: PaymentMethod;
  kind: PaymentKind;
  paid_at: string;
  note: string | null;
  voided_at: string | null;
  void_reason: string | null;
  created_at: string;
}

export interface PaymentSummaryCustomer {
  trip_customer_id: number;
  customer_id: number;
  billed_amount: string;
  complete: boolean;
  advance_paid: string;
  cash_paid: string;
  online_paid: string;
  total_paid: string;
  remaining: string;
  previous_balance: string;
  previous_complete: boolean;
  total_due: string;
}

// Sensitive like Bill: billed amounts. Fetch on tap, keep in state only.
export interface PaymentSummary {
  trip_id: number;
  customers: PaymentSummaryCustomer[];
  billed_amount: string;
  complete: boolean;
  advance_paid: string;
  cash_paid: string;
  online_paid: string;
  total_paid: string;
  outstanding: string;
  credit: string;
}
