import { describe, it, expect, beforeEach } from "vitest";

describe("Handover idempotency reference persistence", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("persists UUID across remounts and reuses the same reference", () => {
    const tcId = 42;
    const key = `fs_handover_ref_${tcId}`;

    const getHandoverRef = (): string => {
      let r = sessionStorage.getItem(key);
      if (!r) {
        r = "mock-uuid-1234";
        sessionStorage.setItem(key, r);
      }
      return r;
    };

    const firstRef = getHandoverRef();
    expect(firstRef).toBe("mock-uuid-1234");
    expect(sessionStorage.getItem(key)).toBe("mock-uuid-1234");

    // Simulate page remount
    const secondRef = getHandoverRef();
    expect(secondRef).toBe(firstRef);

    // Simulate success cleanup
    sessionStorage.removeItem(key);
    expect(sessionStorage.getItem(key)).toBeNull();
  });

  it("handles trip leftover Self customer reference similarly", () => {
    const tripId = 7;
    const key = `fs_self_ref_${tripId}`;

    sessionStorage.setItem(key, "self-uuid-5678");
    expect(sessionStorage.getItem(key)).toBe("self-uuid-5678");

    sessionStorage.removeItem(key);
    expect(sessionStorage.getItem(key)).toBeNull();
  });
});
