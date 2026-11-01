import type { ReactNode } from "react";
const P: Record<string, ReactNode> = {
  home: <><path d="M3 11l9-8 9 8" /><path d="M5 10v10h5v-6h4v6h5V10" /></>,
  trips: <><path d="M3 7h11v9H3z" /><path d="M14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="1.8" /><circle cx="17" cy="18" r="1.8" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M16 5.5a3 3 0 0 1 0 5.8M18.5 14.5c1.6.8 2.5 2.8 2.5 5.5" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>,
  filter: <path d="M4 5h16l-6 8v6l-4-2v-4z" />,
  back: <path d="M15 5l-7 7 7 7" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  chev: <path d="M9 5l7 7-7 7" />,
  down: <path d="M6 9l6 6 6-6" />,
  cash: <><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.6" /><path d="M6.5 9.5v.01M17.5 14.5v.01" /></>,
  phone: <><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></>,
  share: <><circle cx="6" cy="12" r="2.4" /><circle cx="18" cy="6" r="2.4" /><circle cx="18" cy="18" r="2.4" /><path d="M8.1 10.8l7.8-3.6M8.1 13.2l7.8 3.6" /></>,
  download: <><path d="M12 4v11M7 11l5 5 5-5" /><path d="M5 20h14" /></>,
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>,
  fish: <><path d="M3 12c3-5 8-6 12-3l4-3v12l-4-3c-4 3-9 2-12-3z" /><circle cx="8.5" cy="11" r=".9" /></>,
  user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  eyeoff: <><path d="M3 3l18 18M10.6 5.2A9.6 9.6 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3 3.8M6.5 6.6A17 17 0 0 0 2 12s4 7 10 7c1.5 0 2.9-.4 4.100-1" /></>,
  undo: <><path d="M9 7L4 12l5 5" /><path d="M4 12h10a6 6 0 0 1 0 12" transform="translate(0 -6)" /></>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>,
  logout: <><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" /></>,
  box: <><path d="M3 7l9-4 9 4v10l-9 4-9-4z" /><path d="M3 7l9 4 9-4M12 11v10" /></>,
  sliders: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>,
  bell: <><path d="M6 17V11a6 6 0 0 1 12 0v6l1.500 2h-15z" /><path d="M10 21h4" /></>,
  rupee: <><path d="M7 5h10M7 9h10M7 5c5 0 7 1.500 7 4s-2 4-7 4l8 7" /></>,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.500" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.500v.01" /></>,
  alert: <><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18v.01" /></>,
  palette: <><path d="M12 3a9 9 0 1 0 0 18c1.500 0 2-1 1.500-2.200-.5-1.300.4-2.300 1.800-2.300H17a4 4 0 0 0 4-4c0-5-4-9.500-9-9.500z" /><path d="M7.500 11v.01M10 7.500v.01M14.500 7.500v.01" /></>,
  list: <><path d="M8 6h12M8 12h12M8 18h12M4 6v.01M4 12v.01M4 18v.01" /></>,
  install: <><rect x="6" y="2.500" width="12" height="19" rx="2.500" /><path d="M12 7v7M9 11.500l3 3 3-3" /></>
};
export function Icon({ n, size = 22, className }: { n: string; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {P[n] ?? null}
    </svg>
  );
}
