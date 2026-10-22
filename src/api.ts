const BASE = import.meta.env.VITE_API_BASE_URL ?? "https://fish-project-zwv0.onrender.com/api";
export class ApiError extends Error {
  constructor(public status: number, message: string, public retryAfter?: number) { super(message); }
}
function detailText(d: unknown): string {
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => x?.msg ?? "Invalid").join("; ");
  return "Request failed";
}
// Never log bodies: they hold passwords or rates.
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      ...init, credentials: "include",
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
  } catch { throw new ApiError(0, "Network problem. Retry."); }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const ra = Number(res.headers.get("Retry-After")) || undefined;
    if (res.status === 401 && !path.startsWith("/auth/")) window.dispatchEvent(new Event("auth:401"));
    throw new ApiError(res.status, detailText(body.detail), ra);
  }
  return body as T;
}
export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" });
export const fmtShort = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short" });
