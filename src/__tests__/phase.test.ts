import { describe, it, expect } from "vitest";
import { phaseOf } from "../lib";

describe("phaseOf() business logic", () => {
  it("returns 'closed' when trip status is CLOSED", () => {
    expect(phaseOf({ status: "CLOSED" }, [])).toBe("closed");
    expect(phaseOf({ status: "CLOSED" }, [{ status: "FINAL" }])).toBe("closed");
  });

  it("returns 'progress' when trip status is IN_PROGRESS", () => {
    expect(phaseOf({ status: "IN_PROGRESS" }, [])).toBe("progress");
    expect(phaseOf({ status: "IN_PROGRESS" }, [{ status: "FINAL" }])).toBe("progress");
  });

  it("returns 'configured' when status is PLANNING and a FINAL supplier list exists", () => {
    expect(
      phaseOf({ status: "PLANNING" }, [{ id: 1, status: "DRAFT" }, { id: 2, status: "FINAL" }])
    ).toBe("configured");
  });

  it("returns 'preparing' when status is PLANNING and no FINAL supplier list exists", () => {
    expect(phaseOf({ status: "PLANNING" }, [])).toBe("preparing");
    expect(phaseOf({ status: "PLANNING" }, [{ id: 1, status: "DRAFT" }])).toBe("preparing");
  });

  it("handles empty / undefined inputs safely", () => {
    expect(phaseOf(null as any, [])).toBe("preparing");
    expect(phaseOf({ status: "PLANNING" }, undefined as any)).toBe("preparing");
  });
});
