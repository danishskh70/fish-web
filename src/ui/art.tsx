import { colorFor, initials } from "./format";

// Sunset lake with a fishing boat. Used as the trip header image (no photo file needed).
export function HeaderArt() {
  return (
    <svg className="hero-art" viewBox="0 0 400 190" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0d3f86" /><stop offset=".55" stopColor="#3d8fd9" /><stop offset="1" stopColor="#ffd9a0" /></linearGradient>
        <linearGradient id="lake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f6c987" /><stop offset=".25" stopColor="#4aa3d6" /><stop offset="1" stopColor="#0f5c9e" /></linearGradient>
        <radialGradient id="sun" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#fff6c9" /><stop offset=".6" stopColor="#ffd36b" /><stop offset="1" stopColor="#ffd36b" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="400" height="190" fill="url(#sky)" />
      <circle cx="262" cy="108" r="46" fill="url(#sun)" />
      <path d="M0 112l40-18 36 14 52-24 44 20 58-26 60 22 50-14 60 20v62H0z" fill="#1f6b6e" opacity=".85" />
      <path d="M0 126l60-14 50 12 70-16 70 14 60-10 90 14v64H0z" fill="#2f8f7a" opacity=".9" />
      <rect y="124" width="400" height="66" fill="url(#lake)" />
      <path d="M218 128h88M200 136h128M230 144h64" stroke="#fff2c4" strokeOpacity=".7" strokeWidth="2" strokeLinecap="round" />
      <g transform="translate(150 118)">
        <path d="M0 22l8 10h52l10-14z" fill="#143a5e" />
        <path d="M30 20V-14l22 30z" fill="#fff" />
        <path d="M27 20V-10L8 18z" fill="#ffe0a8" />
        <path d="M30 -14v-6" stroke="#143a5e" strokeWidth="2" />
      </g>
      <g fill="#fff" opacity=".9"><path d="M40 40q6-6 12 0q6-6 12 0" stroke="#fff" strokeWidth="2" fill="none" /><path d="M300 30q5-5 10 0q5-5 10 0" stroke="#fff" strokeWidth="2" fill="none" /></g>
    </svg>
  );
}

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M6 33c9-13 22-15 33-6l9-7v26l-9-7c-11 9-24 7-33-6z" fill="#1d8bff" />
      <path d="M6 33c9-13 22-15 33-6-8-1-16 2-22 10z" fill="#7cc4ff" />
      <circle cx="17" cy="31" r="2.6" fill="#fff" />
    </svg>
  );
}

// Fish picture: uploaded photo if there is one, otherwise a clean illustration in the fish's colour.
export function FishThumb({ name, color, photo, size = 52 }: { name: string; color: string; photo: string | null; size?: number }) {
  if (photo) return <img className="fthumb" src={photo} alt={name} width={size} height={size} style={{ width: size, height: size }} />;
  return (
    <span className="fthumb" style={{ width: size, height: size, background: `${color}22` }} role="img" aria-label={name}>
      <svg viewBox="0 0 64 40" width={size * 0.8} height={size * 0.5} aria-hidden="true">
        <path d="M4 20C12 6 28 3 40 12l16-9v34l-16-9C28 37 12 34 4 20z" fill={color} />
        <path d="M4 20C12 6 28 3 40 12c-9-1-18 3-24 11z" fill="#fff" opacity=".28" />
        <circle cx="13" cy="18" r="2.2" fill="#fff" />
      </svg>
    </span>
  );
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  return <span className="av" style={{ width: size, height: size, background: colorFor(name), fontSize: size * 0.38 }} aria-hidden="true">{initials(name)}</span>;
}

export function EmptyArt({ kind }: { kind: "trips" | "customers" | "payments" | "search" }) {
  const body = {
    trips: <><rect x="14" y="40" width="64" height="30" rx="6" fill="#cfe0fb" /><path d="M78 50h20l12 14v6H78z" fill="#9fc0f5" /><circle cx="34" cy="74" r="8" fill="#0b2a5b" /><circle cx="96" cy="74" r="8" fill="#0b2a5b" /><circle cx="34" cy="74" r="3" fill="#fff" /><circle cx="96" cy="74" r="3" fill="#fff" /></>,
    customers: <><circle cx="48" cy="46" r="14" fill="#9fc0f5" /><path d="M22 84c0-14 12-24 26-24s26 10 26 24z" fill="#cfe0fb" /><circle cx="86" cy="52" r="11" fill="#cfe0fb" /><path d="M70 84c0-10 7-18 16-18s16 8 16 18z" fill="#9fc0f5" /></>,
    payments: <><rect x="20" y="36" width="80" height="48" rx="8" fill="#cfe0fb" /><rect x="20" y="46" width="80" height="10" fill="#0b2a5b" opacity=".85" /><rect x="30" y="68" width="26" height="8" rx="3" fill="#9fc0f5" /></>,
    search: <><circle cx="54" cy="52" r="22" fill="none" stroke="#9fc0f5" strokeWidth="8" /><path d="M72 70l20 20" stroke="#0b2a5b" strokeWidth="9" strokeLinecap="round" /></>
  }[kind];
  return <svg className="empty-art" viewBox="0 0 120 100" aria-hidden="true">{body}<path d="M8 92q12-6 24 0t24 0t24 0t24 0t24 0" fill="none" stroke="#9fc0f5" strokeWidth="3" strokeLinecap="round" /></svg>;
}
