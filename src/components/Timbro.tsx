import type { Esito } from "../lib/tipi";

/** L'etichetta verde in mono: il segno di Bandolo. Si usa solo per esiti e scadenze vicine. */
export function Timbro({ tono, children }: { tono: "verde" | "neutro" | "spento"; children: React.ReactNode }) {
  return <span className={`timbro timbro-${tono}`}>{children}</span>;
}

export const TESTO_ESITO: Record<Esito, string> = {
  si: "Fa per te",
  forse: "Da verificare",
  no: "Non fa per te",
};

export const TONO_ESITO: Record<Esito, "verde" | "neutro" | "spento"> = {
  si: "verde",
  forse: "neutro",
  no: "spento",
};
