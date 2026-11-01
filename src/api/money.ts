// Pure money rules. Same rules the backend must enforce. Whole rupees in the stub;
// the backend should use Decimal / paise (never float).
import type { Line, Payment, RowStatus } from "./types";

export interface Calc { amount: number; amountFinal: boolean; paid: number; advance: number; remaining: number; rateMissing: boolean }

export function calcRow(lines: Line[], handedOver: boolean, payments: Payment[]): Calc {
  let amount = 0;
  let rateMissing = false;
  for (const l of lines) {
    const bags = handedOver ? (l.handed ?? 0) : l.ordered;
    if (bags > 0 && l.rate == null) rateMissing = true;
    amount += bags * (l.rate ?? 0);
  }
  const live = payments.filter((p) => !p.voidedAt);
  const paid = live.reduce((a, p) => a + p.amount, 0);
  const advance = live.filter((p) => p.kind === "ADVANCE").reduce((a, p) => a + p.amount, 0);
  return { amount, amountFinal: handedOver, paid, advance, remaining: amount - paid, rateMissing };
}

export function rowStatus(c: Calc, handedOver: boolean): RowStatus {
  if (c.remaining < 0 && c.paid > 0) return "CREDIT";
  if (handedOver) {
    if (c.amount > 0 && c.remaining === 0) return "PAID";
    if (c.paid > 0) return "PARTIAL";
    return "HANDED";
  }
  return c.advance > 0 ? "ADVANCE" : "PENDING";
}

export const pct = (amount: number, paid: number) => (amount <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((paid * 100) / amount))));

export function validateAmount(raw: string): number | null {
  const t = raw.replace(/[,\s₹]/g, "");
  if (!/^\d{1,9}$/.test(t)) return null;
  const n = Number(t);
  return n > 0 ? n : null;
}
