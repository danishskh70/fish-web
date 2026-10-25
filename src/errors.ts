// Turns server and network problems into sentences a beginner can act on.
// Human-written server messages (for example "Stock left: Rohu 2") pass through unchanged.
const VALIDATION: [RegExp, string][] = [
  [/^field required$/i, "Some required information is missing."],
  [/valid integer|parse string as an integer/i, "Enter a whole number."],
  [/valid number|valid decimal|parse string as a number/i, "Enter a valid number."],
  [/greater than or equal to 1|greater than 0/i, "The number must be 1 or more."],
  [/at least 1 character|string should have at least/i, "This field cannot be empty."],
  [/valid date/i, "Enter a valid date."],
];

export function friendlyMessage(status: number, detail: string, opts: { login?: boolean } = {}): string {
  const d = (detail ?? "").trim();
  if (status === 0)
    return "Network problem. Check your internet. Your entries are still on screen. Tap the button again.";
  if (status === 401) return opts.login ? d || "Wrong username or password." : "Your session ended. Please log in again.";
  if (status === 403) return "You are not allowed to do this.";
  if (status === 404) return "We could not find this. It may have been removed. Go back and refresh.";
  if (status === 429) return "Too many tries. Please wait a little and try again.";
  if (status >= 500)
    return "Something went wrong on the server. Your entries are still on screen. Please try again in a moment.";
  if (!d)
    return status === 409
      ? "This changed since you opened it. Refresh and try again."
      : "Something is not right. Please check what you entered and try again.";
  const parts = d.split(";").map((p) => p.trim()).filter(Boolean).map((p) => VALIDATION.find(([re]) => re.test(p))?.[1] ?? p);
  return [...new Set(parts)].join(" ");
}
