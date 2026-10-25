import { describe, it, expect, beforeEach } from "vitest";
import { clearHandoverRef, getHandoverRef } from "../handoverRef";

describe("handover idempotency reference", () => {
  beforeEach(() => sessionStorage.clear());

  it("reuses the same reference for an identical payload (retry or remount)", () => {
    const a = getHandoverRef(42, "payload-1");
    const b = getHandoverRef(42, "payload-1");
    expect(b).toBe(a);
  });

  it("makes a new reference when the payload changes", () => {
    const a = getHandoverRef(42, "payload-1");
    const b = getHandoverRef(42, "payload-2");
    expect(b).not.toBe(a);
  });

  it("keeps references separate per customer", () => {
    expect(getHandoverRef(1, "x")).not.toBe(getHandoverRef(2, "x"));
  });

  it("clears after success so the next handover gets a fresh reference", () => {
    const a = getHandoverRef(42, "payload-1");
    clearHandoverRef(42);
    expect(getHandoverRef(42, "payload-1")).not.toBe(a);
  });

  it("still returns a reference when storage is blocked", () => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error("blocked"); };
    try { expect(getHandoverRef(7, "x")).toMatch(/[0-9a-f-]{36}/); }
    finally { Storage.prototype.setItem = orig; }
  });
});
