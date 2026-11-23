import { CONFIG } from "../config";

/** Il capo del filo: un nodo e il filo che esce. */
export function Logo() {
  return (
    <span className="logo">
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
        <circle cx="8.5" cy="12" r="4.75" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <path
          d="M13.25 12c2 0 2.1-3.25 4.1-3.25S19.5 12 21.5 12"
          fill="none"
          stroke="var(--verde)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      {CONFIG.nome}
    </span>
  );
}
