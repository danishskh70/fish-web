import { describe, it, expect, beforeEach } from "vitest";
import { RATE_RE, clearDefaultRates, defaultRateInfo, hasAnyDefaultRates, ratesForTrip, saveDefaultRates } from "../defaultRates";

describe("default rates (device only)", () => {
  beforeEach(() => localStorage.clear());

  it("accepts positive amounts with up to 2 decimals only", () => {
    for (const ok of ["1", "120", "120.5", "120.50", "0.5"]) expect(RATE_RE.test(ok)).toBe(true);
    for (const bad of ["", "0", "0.00", "-5", "12.345", "1,200", "abc", "1e3", " 5"]) expect(RATE_RE.test(bad)).toBe(false);
  });

  it("saves valid entries, reports invalid ones, ignores blanks", () => {
    const r = saveDefaultRates({ 1: "120", 2: "abc", 3: "  ", 4: "99.50" });
    expect(r.saved).toBe(2);
    expect(r.invalid).toEqual([2]);
    expect(defaultRateInfo(1).set).toBe(true);
    expect(defaultRateInfo(2).set).toBe(false);
    expect(defaultRateInfo(3).set).toBe(false);
  });

  it("builds the trip payload only for chosen fish that have a saved rate", () => {
    saveDefaultRates({ 1: "120", 2: "80" });
    expect(ratesForTrip([2, 3])).toEqual([{ fish_type_id: 2, rate_per_bag: "80" }]);
    expect(ratesForTrip([])).toEqual([]);
  });

  it("keeps rates as strings, so there is no float rounding", () => {
    saveDefaultRates({ 1: "0.10" });
    expect(ratesForTrip([1])[0].rate_per_bag).toBe("0.10");
  });

  it("overwrites an old rate and can be cleared", () => {
    saveDefaultRates({ 1: "100" });
    saveDefaultRates({ 1: "110" });
    expect(ratesForTrip([1])[0].rate_per_bag).toBe("110");
    expect(hasAnyDefaultRates()).toBe(true);
    clearDefaultRates();
    expect(hasAnyDefaultRates()).toBe(false);
  });

  it("survives corrupt storage", () => {
    localStorage.setItem("fs_default_rates_v1", "{not json");
    expect(hasAnyDefaultRates()).toBe(false);
    expect(ratesForTrip([1])).toEqual([]);
  });
});
