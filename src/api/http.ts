// Tiny fetch wrapper for the FastAPI backend. Same origin (Vite proxies /api), cookie session.
import { ApiError } from "./types";

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";
const AUTH = "ms_auth";
const TTL = 3000; // GET results are shared for 3 s so one screen does not repeat the same call
const cache = new Map<string, { at: number; p: Promise<unknown> }>();
export const clearCache = () => cache.clear();

function message(body: unknown, status: number): { code: string; message: string } {
  const b = body as { detail?: unknown; message?: string; code?: string } | null;
  const d = b?.detail;
  if (typeof d === "string") return { code: b?.code ?? "ERROR", message: d };
  if (Array.isArray(d) && d.length) {
    const first = d[0] as { loc?: unknown[]; msg?: string };
    const field = Array.isArray(first.loc) ? String(first.loc[first.loc.length - 1] ?? "") : "";
    return { code: "INVALID", message: `${field ? field + ": " : ""}${first.msg ?? "Invalid input"}` };
  }
  if (d && typeof d === "object") { const o = d as { message?: string; code?: string }; if (o.message) return { code: o.code ?? "ERROR", message: o.message }; }
  if (b?.message) return { code: b.code ?? "ERROR", message: b.message };
  const fallback: Record<number, string> = { 401: "Please sign in again", 403: "Not allowed", 404: "Not found", 409: "This conflicts with the current data", 429: "Too many tries. Wait a moment" };
  return { code: status === 404 ? "NOT_FOUND" : "ERROR", message: fallback[status] ?? `Request failed (${status})` };
}

async function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 20000);
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method, credentials: "include", signal: ctl.signal,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new ApiError("NETWORK", "Cannot reach the server. Is the backend running?");
  } finally { clearTimeout(timer); }
  if (res.status === 401 && !path.endsWith("/auth/login")) {
    localStorage.removeItem(AUTH);
    if (location.pathname !== "/login") location.assign("/login");
    throw new ApiError("UNAUTHENTICATED", "Please sign in again");
  }
  if (res.status === 204) return undefined as T;
  let data: unknown = null;
  try { data = await res.json(); } catch { /* empty or non-json body */ }
  if (!res.ok) { const m = message(data, res.status); throw new ApiError(m.code, m.message); }
  return data as T;
}

export function get<T>(path: string): Promise<T> {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < TTL) return hit.p as Promise<T>;
  const p = send<T>("GET", path);
  cache.set(path, { at: Date.now(), p });
  p.catch(() => cache.delete(path));
  return p;
}
// Any write makes every cached read stale.
export async function write<T>(method: "POST" | "PUT" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<T> {
  try { return await send<T>(method, path, body ?? (method === "POST" ? {} : undefined)); } finally { clearCache(); }
}
