// Da un record dell'open data di Incentivi Italia ai campi che usa l'app.

// Un bando "a sportello" senza data di chiusura, aperto prima di questa data,
// è quasi sempre esaurito ma nessuno lo ha chiuso nel catalogo.
export const SPORTELLO_VALIDO_DAL = "2025-01-01";

const data = (v) => (typeof v === "string" && v.length >= 10 ? v.slice(0, 10) : null);
const numero = (v) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);
const lista = (v) => (Array.isArray(v) ? v.map((x) => String(x ?? "").trim()).filter(Boolean) : []);
const testo = (v) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");

export function aperto(r, oggi) {
  if (r.Incentivo_attivato && r.Incentivo_attivato !== "SI") return false;
  const apertura = data(r.Data_apertura);
  const chiusura = data(r.Data_chiusura);
  if (apertura && apertura > oggi) return false;
  if (chiusura) return chiusura >= oggi;
  return !apertura || apertura >= SPORTELLO_VALIDO_DAL;
}

// La descrizione del portale ha tre parti fisse: "Cos'è", "A chi si rivolge", "Cosa prevede".
export function sezioni(descrizione) {
  const pulita = testo(descrizione);
  const marcatori = [
    ["cose", /Cos['’]è\s*/i],
    ["chi", /A chi si rivolge\s*/i],
    ["cosa", /Cosa prevede\s*/i],
  ];
  const posizioni = marcatori
    .map(([chiave, re]) => {
      const m = re.exec(pulita);
      return m ? { chiave, inizio: m.index, corpo: m.index + m[0].length } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.inizio - b.inizio);
  if (posizioni.length === 0) return { cose: pulita, chi: "", cosa: "" };
  const risultato = { cose: "", chi: "", cosa: "" };
  posizioni.forEach((p, i) => {
    const fine = i + 1 < posizioni.length ? posizioni[i + 1].inizio : pulita.length;
    risultato[p.chiave] = pulita.slice(p.corpo, fine).trim();
  });
  if (!risultato.cose && posizioni[0].inizio > 0) risultato.cose = pulita.slice(0, posizioni[0].inizio).trim();
  return risultato;
}

export function normalizza(r) {
  const regioni = lista(r.Regioni);
  return {
    id: String(r.idBando),
    titolo: testo(r.Titolo),
    ente: testo(r.Soggetto_Concedente || r.Amministrazione_responsabile),
    ...sezioni(r.Descrizione),
    apertura: data(r.Data_apertura),
    chiusura: data(r.Data_chiusura),
    notaScadenza: testo(r.Note_di_apertura_chiusura).slice(0, 400),
    regioni,
    nazionale: regioni.length >= 19,
    ambito: lista(r.Ambito_territoriale).filter((a) => a !== "Non applicabile"),
    dimensioni: lista(r.Dimensione_beneficiari),
    soggetti: lista(r.Tipologia_Soggetto),
    settori: lista(r.Settore_Attivita),
    finalita: lista(r.Obiettivo_Finalita),
    costi: lista(r.Costi_Ammessi),
    forme: lista(r.Forma_agevolazione),
    ateco: testo(r.Codici_ATECO).slice(0, 300),
    agevolazioneMax: numero(r.Agevolazione_Concedibile_Max),
    spesaMax: numero(r.Spesa_Ammessa_Max),
    dotazione: numero(r.Stanziamento_incentivo),
    link: testo(r.Link_istituzionale) || null,
    linkDomanda: testo(r.Link_piattaforma_domande) || null,
    scheda: `https://www.incentivitalia.gov.it/incentivo/${encodeURIComponent(String(r.idBando))}`,
  };
}
