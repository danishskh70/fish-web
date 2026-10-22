import { describe, it, expect } from "vitest";
import { money, intOf, amountInWords } from "../format";

describe("money() formatter", () => {
  it("handles null, undefined, and empty string safely without crashing", () => {
    expect(money(null)).toBe("₹0.00");
    expect(money(undefined)).toBe("₹0.00");
    expect(money("")).toBe("₹0.00");
    expect(money("   ")).toBe("₹0.00");
    expect(money("-")).toBe("₹0.00");
  });

  it("formats standard amounts with Indian numbering grouping", () => {
    expect(money("100")).toBe("₹100.00");
    expect(money("1000")).toBe("₹1,000.00");
    expect(money("10000")).toBe("₹10,000.00");
    expect(money("100000")).toBe("₹1,00,000.00");
    expect(money("1250000")).toBe("₹12,50,000.00");
    expect(money("12345678.50")).toBe("₹1,23,45,678.50");
  });

  it("handles decimal padding correctly", () => {
    expect(money("50.5")).toBe("₹50.50");
    expect(money("50.75")).toBe("₹50.75");
    expect(money("50.758")).toBe("₹50.75");
  });

  it("handles negative numbers", () => {
    expect(money("-500")).toBe("-₹500.00");
    expect(money("-150000.50")).toBe("-₹1,50,000.50");
  });
});

describe("intOf() parser", () => {
  it("converts strings to non-negative integers safely", () => {
    expect(intOf("")).toBe(0);
    expect(intOf(null)).toBe(0);
    expect(intOf(undefined)).toBe(0);
    expect(intOf("abc")).toBe(0);
    expect(intOf("42")).toBe(42);
    expect(intOf(100)).toBe(100);
    expect(intOf("05")).toBe(5);
  });

  it("handles negative strings and decimals", () => {
    expect(intOf("-5")).toBe(5); // digits extracted
    expect(intOf("12.9")).toBe(129); // digits extracted
  });
});

describe("amountInWords() converter", () => {
  it("converts numbers to Indian currency in words", () => {
    expect(amountInWords("0")).toBe("Rupees Zero Only");
    expect(amountInWords("")).toBe("Rupees Zero Only");
    expect(amountInWords(null)).toBe("Rupees Zero Only");
    expect(amountInWords("50")).toBe("Rupees Fifty Only");
    expect(amountInWords("100")).toBe("Rupees One Hundred Only");
    expect(amountInWords("1050")).toBe("Rupees One Thousand Fifty Only");
    expect(amountInWords("100000")).toBe("Rupees One Lakh Only");
    expect(amountInWords("125000")).toBe("Rupees One Lakh Twenty Five Thousand Only");
    expect(amountInWords("10000000")).toBe("Rupees One Crore Only");
  });
});
