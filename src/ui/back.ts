import { useCallback } from "react";
import { useLocation, useNavigate, type NavigateOptions } from "react-router-dom";

// Back goes to the screen you really came from. If the page was opened directly
// (deep link, refresh, PWA shortcut) there is no history, so it goes to the fallback.
export function useBack(fallback: string) {
  const nav = useNavigate();
  return useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) nav(-1);
    else nav(fallback, { replace: true });
  }, [nav, fallback]);
}
export const useGo = () => {
  const nav = useNavigate();
  const loc = useLocation();
  return useCallback((to: string, opts?: NavigateOptions) => nav(to, { ...opts, state: { from: loc.pathname } }), [nav, loc.pathname]);
};
