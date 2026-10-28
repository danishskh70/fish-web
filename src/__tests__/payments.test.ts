import { beforeEach, describe, expect, it } from "vitest";
import { cleanAmount } from "../payments";
import { clearPaymentRef, getPaymentRef } from "../paymentRef";

describe("cleanAmount", () => {
  it.each([
    ["500", "500"],
    ["1,250.50", "1250.50"],
    ["₹300", "300"],
    [" 42.5 ", "42.5"],
    ["007", "7"],
    ["0.50", "0.50"],
  ])("accepts %s", (input, out) => {
    expect(cleanAmount(input)).toBe(out);
  });

  it.each([
    "",
    "0",
    "0.00",
    "-5",
    "abc",
    "10.123",
    "1.2.3",
    "12345678901", // 11 digits, server max is 10 before the decimal
  ])("rejects %s", (input) => {
    expect(cleanAmount(input)).toBeNull();
  });
});

describe("payment reference", () => {
  beforeEach(() => sessionStorage.clear());

  it("reuses the reference for an identical payload", () => {
    const a = getPaymentRef(7, "sig-1");
    expect(getPaymentRef(7, "sig-1")).toBe(a);
  });

  it("makes a new reference when the payload changes", () => {
    const a = getPaymentRef(7, "sig-1");
    expect(getPaymentRef(7, "sig-2")).not.toBe(a);
  });

  it("keeps customers apart", () => {
    expect(getPaymentRef(7, "sig-1")).not.toBe(getPaymentRef(8, "sig-1"));
  });

  it("makes a new reference after clear", () => {
    const a = getPaymentRef(7, "sig-1");
    clearPaymentRef(7);
    expect(getPaymentRef(7, "sig-1")).not.toBe(a);
  });
});
