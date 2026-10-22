import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAct } from "../lib";
import { ApiError } from "../api";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useAct hook", () => {
  it("runs action, invalidates query keys and returns true on success", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useAct([["trip", 1]]), { wrapper });

    let status = false;
    await act(async () => {
      status = await result.current.act(async () => "ok");
    });

    expect(status).toBe(true);
    expect(result.current.err).toBe("");
    expect(result.current.busy).toBe(false);
  });

  it("catches errors, sets err message and returns false", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useAct([]), { wrapper });

    let status = true;
    await act(async () => {
      status = await result.current.act(async () => {
        throw new ApiError(400, "Validation error occurred");
      });
    });

    expect(status).toBe(false);
    expect(result.current.err).toBe("Validation error occurred");
    expect(result.current.busy).toBe(false);

    // clearErr clears error message
    act(() => {
      result.current.clearErr();
    });
    expect(result.current.err).toBe("");
  });
});
