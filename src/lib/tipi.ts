// Tipi condivisi tra l'app nel browser e il Worker.

export interface Bando {
  id: string;
  titolo: string;
  ente: string;
  /** "Cos'è" dalla scheda del portale */
  cose: string;
  /** "A chi si rivolge" */
  chi: string;
  /** "Cosa prevede" */
  cosa: string;
  apertura: string | null;
  chiusura: string | null;
  notaScadenza: string;
  regioni: string[];
  nazionale: boolean;
  ambito: string[];
  dimensioni: string[];
  soggetti: string[];
  settori: string[];
  finalita: string[];
  costi: string[];
  forme: string[];
  ateco: string;
  agevolazioneMax: number | null;
  spesaMax: number | null;
  dotazione: number | null;
  link: string | null;
  linkDomanda: string | null;
  scheda: string;
}

export interface Catalogo {
  aggiornato: string;
  totaleCatalogo: number;
  bandi: Bando[];
}

export const DIMENSIONI = ["Microimpresa", "Piccola Impresa", "Media Impresa", "Grande Impresa"] as const;
export type Dimensione = (typeof DIMENSIONI)[number];

export type TipoSoggetto = "impresa" | "startup" | "professionista" | "nonprofit" | "da-costituire";

export interface Profilo {
  regione: string | null;
  dimensione: Dimensione | null;
  soggetto: TipoSoggetto | null;
  settore: string | null;
  /** Chiavi di OBIETTIVI: il bando passa se ne tocca almeno uno */
  obiettivi: string[];
  soloFondoPerduto: boolean;
  cerca: string;
}

/** Un'impresa trovata con la partita IVA nel registro europeo VIES */
export interface Impresa {
  piva: string;
  nome: string;
  comune: string | null;
  provincia: string | null;
  regione: string | null;
  /** Sito ufficiale, quando la ricerca lo trova */
  sito?: string | null;
}

/** Un risultato della ricerca per nome: verificata = partita IVA confermata dal registro VIES */
export interface ImpresaTrovata extends Impresa {
  verificata: boolean;
}

/** Chi fornirà il servizio pagato dal bando: facoltativo, serve all'AI per le regole sul fornitore */
export interface Fornitore {
  impresa: Impresa | null;
  /** Cosa fornisce, scritto dall'utente */
  cosa: string;
}

export type Esito = "si" | "forse" | "no";

export interface Valutazione {
  id: string;
  esito: Esito;
  /** Perché, in una frase per l'imprenditore */
  perche: string;
  /** Cosa controllare prima di fare domanda */
  verifica: string;
  /** Cosa dice il bando sul fornitore indicato, vuoto se non c'è un fornitore */
  fornitore: string;
}

export interface RichiestaValutazione {
  profilo: Profilo;
  descrizione: string;
  azienda: Impresa | null;
  fornitore: Fornitore | null;
  ids: string[];
}

export const MAX_BANDI_DA_VALUTARE = 20;
export const MAX_DESCRIZIONE = 1200;
