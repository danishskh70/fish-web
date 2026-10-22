import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Stepper, Seg, Pill, PhasePill } from "../lib";
import { ToastProvider, useToast, ConfirmProvider, useConfirm } from "../ui-feedback";

describe("Stepper component", () => {
  it("increments and decrements values", () => {
    const handleChange = vi.fn();
    render(<Stepper value="5" onChange={handleChange} />);

    const incBtn = screen.getByLabelText("Increase");
    fireEvent.click(incBtn);
    expect(handleChange).toHaveBeenCalledWith("6");

    const decBtn = screen.getByLabelText("Decrease");
    fireEvent.click(decBtn);
    expect(handleChange).toHaveBeenCalledWith("4");
  });

  it("decrements 1 to empty string instead of 0", () => {
    const handleChange = vi.fn();
    render(<Stepper value="1" onChange={handleChange} />);

    const decBtn = screen.getByLabelText("Decrease");
    fireEvent.click(decBtn);
    expect(handleChange).toHaveBeenCalledWith("");
  });
});

describe("Seg component", () => {
  it("renders segment items with proper accessibility attributes", () => {
    const handleChange = vi.fn();
    render(
      <Seg
        items={[
          ["tab1", "Tab One"],
          ["tab2", "Tab Two"],
        ]}
        value="tab1"
        onChange={handleChange}
      />
    );

    const tab1 = screen.getByText("Tab One");
    const tab2 = screen.getByText("Tab Two");

    expect(tab1.getAttribute("aria-selected")).toBe("true");
    expect(tab2.getAttribute("aria-selected")).toBe("false");

    fireEvent.click(tab2);
    expect(handleChange).toHaveBeenCalledWith("tab2");
  });
});

describe("Pill & PhasePill", () => {
  it("renders proper labels and tones for phases", () => {
    const { container, rerender } = render(<PhasePill p="preparing" />);
    expect(screen.getByText("Preparing")).toBeDefined();

    rerender(<PhasePill p="progress" />);
    expect(screen.getByText("In progress")).toBeDefined();

    rerender(<PhasePill p="closed" />);
    expect(screen.getByText("Closed")).toBeDefined();
  });
});

describe("Toast feedback provider", () => {
  function TestToastConsumer() {
    const { success, error } = useToast();
    return (
      <div>
        <button onClick={() => success("Operation successful")}>Trigger Success</button>
        <button onClick={() => error("Something failed")}>Trigger Error</button>
      </div>
    );
  }

  it("displays and dismisses toast notifications", async () => {
    render(
      <ToastProvider>
        <TestToastConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText("Trigger Success"));
    expect(screen.getByText("Operation successful")).toBeDefined();

    fireEvent.click(screen.getByText("Trigger Error"));
    expect(screen.getByText("Something failed")).toBeDefined();
  });
});
