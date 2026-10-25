import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { useLeave } from "../extras";
import { ConfirmProvider } from "../ui-feedback";

function Form({ dirty, skip }: { dirty: boolean; skip?: boolean }) {
  const leave = useLeave(dirty);
  return (
    <button
      onClick={() => {
        if (skip) leave.skip();
        leave("/other");
      }}
    >
      go
    </button>
  );
}

function setup(dirty: boolean, skip = false) {
  const router = createMemoryRouter(
    [
      { path: "/", element: <Form dirty={dirty} skip={skip} /> },
      { path: "/other", element: <div>other page</div> },
    ],
    { initialEntries: ["/"] }
  );
  render(
    <ConfirmProvider>
      <RouterProvider router={router} />
    </ConfirmProvider>
  );
  return router;
}

describe("useLeave unsaved-changes guard", () => {
  it("lets the user leave straight away when nothing is unsaved", async () => {
    setup(false);
    fireEvent.click(screen.getByText("go"));
    expect(await screen.findByText("other page")).toBeTruthy();
  });

  it("asks first when there are unsaved changes, and Stay keeps the form", async () => {
    const router = setup(true);
    fireEvent.click(screen.getByText("go"));
    fireEvent.click(await screen.findByText("Stay"));
    await Promise.resolve();
    expect(router.state.location.pathname).toBe("/");
    expect(screen.queryByText("other page")).toBeNull();
  });

  it("Leave really leaves (the old guard stayed on the page)", async () => {
    const router = setup(true);
    fireEvent.click(screen.getByText("go"));
    fireEvent.click(await screen.findByText("Leave"));
    expect(await screen.findByText("other page")).toBeTruthy();
    expect(router.state.location.pathname).toBe("/other");
  });

  it("skip() lets a finished save navigate without asking", async () => {
    setup(true, true);
    fireEvent.click(screen.getByText("go"));
    expect(await screen.findByText("other page")).toBeTruthy();
    expect(screen.queryByText("Leave")).toBeNull();
  });
});
