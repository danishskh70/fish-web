import { describe, it, expect } from "vitest";
import { friendlyMessage } from "../errors";

describe("friendlyMessage", () => {
  it("explains a dropped connection and mentions the entries are kept", () => {
    const m = friendlyMessage(0, "");
    expect(m.toLowerCase()).toContain("network");
    expect(m).toContain("still on screen");
  });
  it("tells an expired session to log in again, but a wrong password stays a wrong password", () => {
    expect(friendlyMessage(401, "")).toContain("log in again");
    expect(friendlyMessage(401, "", { login: true })).toBe("Wrong username or password.");
    expect(friendlyMessage(401, "Invalid credentials", { login: true })).toBe("Invalid credentials");
  });
  it("hides technical server errors behind a calm sentence", () => {
    expect(friendlyMessage(500, "Traceback ...")).toContain("Something went wrong");
    expect(friendlyMessage(404, "Not Found")).toContain("could not find");
  });
  it("turns validation text into plain words", () => {
    expect(friendlyMessage(422, "Field required")).toBe("Some required information is missing.");
    expect(friendlyMessage(422, "Input should be a valid integer; Field required")).toBe("Enter a whole number. Some required information is missing.");
    expect(friendlyMessage(422, "Input should be greater than or equal to 1")).toBe("The number must be 1 or more.");
  });
  it("keeps human-written server messages unchanged", () => {
    expect(friendlyMessage(409, "Stock left: Rohu 2 bags")).toBe("Stock left: Rohu 2 bags");
  });
  it("has a fallback when the server sends nothing", () => {
    expect(friendlyMessage(409, "")).toContain("changed");
    expect(friendlyMessage(400, "")).toContain("check what you entered");
  });
});
