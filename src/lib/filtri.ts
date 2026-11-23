import type { Bando, Profilo, TipoSoggetto } from "./tipi";

export const FONDO_PERDUTO = "Contributo/Fondo perduto";

/** Cosa vuoi finanziare: ogni voce è una regola sui campi del catalogo. */
export const OBIETTIVI: { chiave: string; etichetta: string; tocca: (b: Bando) => boolean }[] = [
  {
    chiave: "digitale",
    etichetta: "Digitale e AI",
    tocca: (b) => b.finalita.includes("Digitalizzazione") || b.finalita.includes("Innovazione e ricerca"),
  },
  {
    chiave: "servizi",
    etichetta: "Software e consulenze",
    tocca: (b) => b.costi.includes("Servizi, brevetti e licenze"),
  },
  {
    chiave: "formazione",
    etichetta: "Formazione",
    tocca: (b) => b.costi.includes("Formazione Professionale") || b.finalita.some((f) => f.startsWith("Formazione")),
  },
  {
    chiave: "macchinari",
    etichetta: "Macchinari e impianti",
    tocca: (b) => b.costi.includes("Impianti/Macchinari/Attrezzature"),
  },
  {
    chiave: "personale",
    etichetta: "Assunzioni",
    tocca: (b) => b.costi.includes("Costo del personale"),
  },
  {
    chiave: "green",
    etichetta: "Energia e green",
    tocca: (b) => b.finalita.includes("Transizione ecologica"),
  },
  {
    chiave: "export",
    etichetta: "Export",
    tocca: (b) => b.finalita.includes("Internazionalizzazione"),
  },
  {
    chiave: "avvio",
    etichetta: "Avviare un'impresa",
    tocca: (b) =>
      b.finalita.some((f) => f.startsWith("Start up") || f.startsWith("Imprenditoria")),
  },
  {
    chiave: "liquidita",
    etichetta: "Liquidità e credito",
    tocca: (b) => b.finalita.includes("Sostegno liquidità") || b.finalita.includes("Crisi d'impresa"),
  },
  {
    chiave: "immobili",
    etichetta: "Immobili",
    tocca: (b) => b.costi.includes("Fabbricati e terreni"),
  },
];

export const SOGGETTI: { chiave: TipoSoggetto; etichetta: string; valori: string[] }[] = [
  { chiave: "impresa", etichetta: "Impresa", valori: ["Impresa", "Consorzio", "Rete d'impresa"] },
  { chiave: "startup", etichetta: "Startup o PMI innovativa", valori: ["Impresa - SU/PMI innovativa", "Impresa"] },
  { chiave: "professionista", etichetta: "Libero professionista", valori: ["Professionista"] },
  { chiave: "nonprofit", etichetta: "Cooperativa o non profit", valori: ["Cooperative/Associazioni Non Profit"] },
  {
    chiave: "da-costituire",
    etichetta: "Impresa da costituire",
    valori: ["Impresa da costituire - Altro", "Impresa da costituire - Giovanile", "Impresa da costituire - Femminile"],
  },
];

const CLASSI = new Set(["Microimpresa", "Piccola Impresa", "Media Impresa", "Grande Impresa"]);

export const profiloVuoto: Profilo = {
  regione: null,
  dimensione: null,
  soggetto: null,
  settore: null,
  obiettivi: [],
  soloFondoPerduto: false,
  cerca: "",
};

function normalizzaTesto(s: string) {
  return s.toLocaleLowerCase("it").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function vaInRegione(b: Bando, regione: string | null) {
  return !regione || b.nazionale || b.regioni.length === 0 || b.regioni.includes(regione);
}

/** Tutti i filtri tranne quelli indicati in `salta`: serve a contare le voci della barra laterale. */
export function passa(b: Bando, p: Profilo, salta: (keyof Profilo)[] = []): boolean {
  const usa = (k: keyof Profilo) => !salta.includes(k);
  if (usa("regione") && !vaInRegione(b, p.regione)) return false;
  if (usa("dimensione") && p.dimensione) {
    const classi = b.dimensioni.filter((d) => CLASSI.has(d));
    if (classi.length > 0 && !classi.includes(p.dimensione)) return false;
  }
  if (usa("soggetto") && p.soggetto && b.soggetti.length > 0) {
    const valori = SOGGETTI.find((s) => s.chiave === p.soggetto)?.valori ?? [];
    if (!b.soggetti.some((s) => valori.includes(s))) return false;
  }
  if (usa("settore") && p.settore && b.settori.length > 0 && !b.settori.includes(p.settore)) return false;
  if (usa("obiettivi") && p.obiettivi.length > 0) {
    const regole = OBIETTIVI.filter((o) => p.obiettivi.includes(o.chiave));
    if (!regole.some((o) => o.tocca(b))) return false;
  }
  if (usa("soloFondoPerduto") && p.soloFondoPerduto && !b.forme.includes(FONDO_PERDUTO)) return false;
  if (usa("cerca") && p.cerca.trim()) {
    const parole = normalizzaTesto(p.cerca).split(/\s+/).filter(Boolean);
    const testo = normalizzaTesto(`${b.titolo} ${b.ente} ${b.cose}`);
    if (!parole.every((w) => testo.includes(w))) return false;
  }
  return true;
}

export function giorniAllaScadenza(b: Bando, oggi: string): number | null {
  if (!b.chiusura) return null;
  return Math.round((Date.parse(b.chiusura) - Date.parse(oggi)) / 86_400_000);
}

export type Ordine = "pertinenza" | "scadenza" | "importo";

/**
 * Pertinenza senza AI: prima i bandi della propria regione (più mirati dei nazionali),
 * poi quelli che toccano più obiettivi scelti, poi la scadenza più vicina.
 */
export function punteggio(b: Bando, p: Profilo): number {
  let punti = 0;
  if (p.regione && b.regioni.includes(p.regione) && !b.nazionale) punti += 4;
  punti += OBIETTIVI.filter((o) => p.obiettivi.includes(o.chiave) && o.tocca(b)).length * 2;
  if (b.forme.includes(FONDO_PERDUTO)) punti += 1;
  if (p.settore && b.settori.length > 0 && b.settori.length < 8 && b.settori.includes(p.settore)) punti += 2;
  return punti;
}

export function ordina(bandi: Bando[], p: Profilo, ordine: Ordine): Bando[] {
  const perScadenza = (a: Bando, b: Bando) => (a.chiusura ?? "9999").localeCompare(b.chiusura ?? "9999");
  const copia = [...bandi];
  if (ordine === "scadenza") return copia.sort(perScadenza);
  if (ordine === "importo") return copia.sort((a, b) => (b.agevolazioneMax ?? 0) - (a.agevolazioneMax ?? 0));
  return copia.sort((a, b) => punteggio(b, p) - punteggio(a, p) || perScadenza(a, b));
}
