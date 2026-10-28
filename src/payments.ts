// Money stays a string. No float math. Server does all sums.
// Returns a clean amount string for the API, or null if invalid.
// Server rules: greater than 0, at most 2 decimals, at most 10 digits before the point.
export function cleanAmount(input: string): string | null {
  const s = input.replace(/[₹,\s]/g, "");
  const m = /^(\d{1,10})(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return null;
  const whole = m[1].replace(/^0+(?=\d)/, "");
  const frac = m[2];
  if (/^0*$/.test(whole) && (!frac || /^0*$/.test(frac))) return null;
  return frac !== undefined ? `${whole}.${frac}` : whole;
}

// Money strings from the server. Sign and zero checks only. No float math.
export const isZero = (s: string): boolean => /^-?0*(\.0*)?$/.test(s.trim());
export const isNegative = (s: string): boolean => s.trim().startsWith("-") && !isZero(s);
export const unsigned = (s: string): string => s.trim().replace(/^-/, "");
