import { describe, expect, it } from "vitest";
import { calcRow, pct, rowStatus, validateAmount } from "./money";
import type { Line, Payment } from "./types";

const line = (ordered: number, handed: number | null, rate: number | null = 600): Line => ({ fishId: 1, fishName: "Rohu", color: "#000", photo: null, ordered, handed, rate });
const pay = (amount: number, kind: "ADVANCE" | "PAYMENT" = "PAYMENT", voided = false): Payment => ({
  id: 1, tripId: 1, tripCustomerId: 1, kind, amount, method: "CASH", note: "", at: "", voidedAt: voided ? "x" : null, voidReason: null, remainingAfter: 0, ref: "r"
});

describe("calcRow", () => {
  it("uses ordered bags before handover and handed bags after", () => {
    expect(calcRow([line(2, null)], false, []).amount).toBe(1200);
    expect(calcRow([line(2, 3)], true, []).amount).toBe(1800);
  });
  it("advance then payment settles to zero", () => {
    const c = calcRow([line(2, 2)], true, [pay(1000, "ADVANCE"), pay(200)]);
    expect(c.paid).toBe(1200);
    expect(c.remaining).toBe(0);
    expect(rowStatus(c, true)).toBe("PAID");
  });
  it("voided payments do not count", () => {
    const c = calcRow([line(2, 2)], true, [pay(1000, "ADVANCE"), pay(200, "PAYMENT", true)]);
    expect(c.remaining).toBe(200);
    expect(rowStatus(c, true)).toBe("PARTIAL");
  });
  it("overpay is credit", () => {
    const c = calcRow([line(1, 1)], true, [pay(900)]);
    expect(c.remaining).toBe(-300);
    expect(rowStatus(c, true)).toBe("CREDIT");
  });
  it("flags missing rate and never claims a final zero", () => {
    const c = calcRow([line(2, 2, null)], true, []);
    expect(c.rateMissing).toBe(true);
    expect(rowStatus(c, true)).toBe("HANDED");
  });
  it("advance chip before handover", () => {
    expect(rowStatus(calcRow([line(2, null)], false, [pay(1000, "ADVANCE")]), false)).toBe("ADVANCE");
    expect(rowStatus(calcRow([line(2, null)], false, []), false)).toBe("PENDING");
  });
});

describe("helpers", () => {
  it("validates amounts", () => {
    expect(validateAmount("1,000")).toBe(1000);
    expect(validateAmount("₹ 200")).toBe(200);
    expect(validateAmount("0")).toBeNull();
    expect(validateAmount("12.5")).toBeNull();
    expect(validateAmount("")).toBeNull();
  });
  it("percent collected", () => {
    expect(pct(2000, 1200)).toBe(60);
    expect(pct(0, 5)).toBe(0);
    expect(pct(100, 250)).toBe(100);
  });
});
