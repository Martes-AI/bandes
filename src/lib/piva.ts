// Partita IVA italiana: controllo della cifra finale e lettura dell'indirizzo restituito da VIES.

/** Sigla della provincia → regione, con i nomi del catalogo di Incentivi Italia. */
const PROVINCE: Record<string, string> = {};
const REGIONI: Record<string, string> = {
  Piemonte: "TO VC NO CN AT AL BI VB",
  "Valle d'Aosta/Vallée d'Aoste": "AO",
  Lombardia: "VA CO SO MI BG BS PV CR MN LC LO MB",
  "Trentino-Alto Adige/Südtirol": "BZ TN",
  Veneto: "VR VI BL TV VE PD RO",
  "Friuli-Venezia Giulia": "UD GO TS PN",
  Liguria: "IM SV GE SP",
  "Emilia-Romagna": "PC PR RE MO BO FE RA FC RN",
  Toscana: "MS LU PT FI LI PI AR SI GR PO",
  Umbria: "PG TR",
  Marche: "PU AN MC AP FM",
  Lazio: "VT RI RM LT FR",
  Abruzzo: "AQ TE PE CH",
  Molise: "CB IS",
  Campania: "CE BN NA AV SA",
  Puglia: "FG BA TA BR LE BT",
  Basilicata: "PZ MT",
  Calabria: "CS CZ RC KR VV",
  Sicilia: "PA TP ME AG CL EN CT RG SR",
  Sardegna: "SS NU CA OR SU",
};
for (const [regione, sigle] of Object.entries(REGIONI)) for (const s of sigle.split(" ")) PROVINCE[s] = regione;

export function regioneDaProvincia(sigla: string): string | null {
  return PROVINCE[sigla.toUpperCase()] ?? null;
}

/** Toglie spazi e prefisso IT. Restituisce null se non sono 11 cifre. */
export function pulisciPiva(testo: string): string | null {
  const cifre = testo.replace(/\s+/g, "").replace(/^IT/i, "");
  return /^\d{11}$/.test(cifre) ? cifre : null;
}

/** L'algoritmo della cifra di controllo della partita IVA italiana. */
export function pivaValida(piva: string): boolean {
  if (!/^\d{11}$/.test(piva) || piva === "00000000000") return false;
  let somma = 0;
  for (let i = 0; i < 10; i++) {
    let c = Number(piva[i]);
    if (i % 2 === 1) {
      c *= 2;
      if (c > 9) c -= 9;
    }
    somma += c;
  }
  return (10 - (somma % 10)) % 10 === Number(piva[10]);
}

export interface Sede {
  comune: string | null;
  provincia: string | null;
  regione: string | null;
}

/** "VIA AURELIA 325 \n00165 ROMA RM\n" → Roma, RM, Lazio */
export function leggiSede(indirizzo: string): Sede {
  const righe = indirizzo
    .split("\n")
    .map((r) => r.trim())
    .filter(Boolean);
  for (const riga of righe.reverse()) {
    const m = /^(\d{5})\s+(.+?)\s+([A-Z]{2})$/.exec(riga);
    if (m) {
      const comune = m[2].toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (x) => x.toUpperCase());
      return { comune, provincia: m[3], regione: regioneDaProvincia(m[3]) };
    }
  }
  return { comune: null, provincia: null, regione: null };
}

/** La ragione sociale come la scrive VIES, senza spazi doppi. */
export function nomeBreve(nome: string): string {
  return nome.replace(/\s+/g, " ").trim().slice(0, 120);
}
