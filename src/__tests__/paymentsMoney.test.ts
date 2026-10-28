import { describe, expect, it } from "vitest";
import { isNegative, isZero, unsigned } from "../payments";
import { clearPaymentRef, getPaymentRef } from "../paymentRef";

describe("money string helpers", () => {
  it.each([
    ["0", true],
    ["0.00", true],
    ["-0.00", true],
    ["", true],
    ["0.01", false],
    ["100.00", false],
    ["-5.00", false],
  ])("isZero(%s) = %s", (input, out) => {
    expect(isZero(input)).toBe(out);
  });

  it.each([
    ["-5.00", true],
    ["-0.00", false],
    ["5.00", false],
    ["0.00", false],
  ])("isNegative(%s) = %s", (input, out) => {
    expect(isNegative(input)).toBe(out);
  });

  it("unsigned strips the minus only", () => {
    expect(unsigned("-5.00")).toBe("5.00");
    expect(unsigned("5.00")).toBe("5.00");
  });
});

describe("payment reference scopes", () => {
  it("keeps handover and page scopes apart", () => {
    sessionStorage.clear();
    const a = getPaymentRef(3, "sig");
    const b = getPaymentRef(3, "sig", "page");
    expect(a).not.toBe(b);
    clearPaymentRef(3, "page");
    expect(getPaymentRef(3, "sig")).toBe(a);
    expect(getPaymentRef(3, "sig", "page")).not.toBe(b);
  });
});
