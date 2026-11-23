import { CONFIG } from "../config";

/** Un timbro con la spunta: il bando che fa per te. */
export function Logo() {
  return (
    <span className="logo">
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.25" />
        <path
          d="M7.75 12.25l2.75 2.75 5.75-6"
          fill="none"
          stroke="var(--verde)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {CONFIG.nome}
    </span>
  );
}
