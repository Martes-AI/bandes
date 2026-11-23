import { describe, expect, it } from "vitest";
import { giorniAllaScadenza, ordina, passa, profiloVuoto } from "../src/lib/filtri";
import { importo, numero } from "../src/lib/formato";
import type { Bando, Profilo } from "../src/lib/tipi";

function bando(parte: Partial<Bando>): Bando {
  return {
    id: "1",
    titolo: "Voucher digitali",
    ente: "Camera di Commercio di Vicenza",
    cose: "Contributi per la digitalizzazione",
    chi: "",
    cosa: "",
    apertura: "2026-10-01",
    chiusura: "2026-12-15",
    notaScadenza: "",
    regioni: ["Veneto"],
    nazionale: false,
    ambito: [],
    dimensioni: ["Microimpresa", "Piccola Impresa"],
    soggetti: ["Impresa"],
    settori: ["Meccanica", "Commercio"],
    finalita: ["Digitalizzazione"],
    costi: ["Servizi, brevetti e licenze"],
    forme: ["Contributo/Fondo perduto"],
    ateco: "",
    agevolazioneMax: 10000,
    spesaMax: 20000,
    dotazione: 500000,
    link: null,
    linkDomanda: null,
    scheda: "https://www.incentivitalia.gov.it/incentivo/1",
    ...parte,
  };
}

const profilo = (p: Partial<Profilo>): Profilo => ({ ...profiloVuoto, ...p });

describe("passa", () => {
  it("senza filtri passa tutto", () => {
    expect(passa(bando({}), profiloVuoto)).toBe(true);
  });

  it("la regione esclude i bandi di altre regioni ma tiene i nazionali", () => {
    expect(passa(bando({}), profilo({ regione: "Lombardia" }))).toBe(false);
    expect(passa(bando({ nazionale: true, regioni: [] }), profilo({ regione: "Lombardia" }))).toBe(true);
    expect(passa(bando({}), profilo({ regione: "Veneto" }))).toBe(true);
  });

  it("la dimensione conta solo se il bando ne indica almeno una", () => {
    expect(passa(bando({}), profilo({ dimensione: "Media Impresa" }))).toBe(false);
    expect(passa(bando({ dimensioni: [] }), profilo({ dimensione: "Media Impresa" }))).toBe(true);
    expect(passa(bando({ dimensioni: ["Non classificabile/classificato"] }), profilo({ dimensione: "Media Impresa" }))).toBe(true);
  });

  it("gli obiettivi passano se il bando ne tocca almeno uno", () => {
    expect(passa(bando({}), profilo({ obiettivi: ["export"] }))).toBe(false);
    expect(passa(bando({}), profilo({ obiettivi: ["export", "digitale"] }))).toBe(true);
  });

  it("il professionista non vede i bandi solo per imprese", () => {
    expect(passa(bando({}), profilo({ soggetto: "professionista" }))).toBe(false);
    expect(passa(bando({ soggetti: ["Impresa", "Professionista"] }), profilo({ soggetto: "professionista" }))).toBe(true);
  });

  it("solo fondo perduto toglie prestiti e garanzie", () => {
    expect(passa(bando({ forme: ["Prestito/Anticipo rimborsabile"] }), profilo({ soloFondoPerduto: true }))).toBe(false);
  });

  it("la ricerca ignora maiuscole e accenti", () => {
    expect(passa(bando({ titolo: "Città più digitali" }), profilo({ cerca: "citta PIU" }))).toBe(true);
    expect(passa(bando({}), profilo({ cerca: "turismo" }))).toBe(false);
  });

  it("salta i filtri indicati, per contare le voci della barra", () => {
    expect(passa(bando({}), profilo({ regione: "Lombardia" }), ["regione"])).toBe(true);
  });
});

describe("ordina e scadenze", () => {
  it("pertinenza: prima la propria regione, poi i nazionali", () => {
    const nazionale = bando({ id: "n", nazionale: true, regioni: [], chiusura: "2026-12-01" });
    const veneto = bando({ id: "v", chiusura: "2027-01-01" });
    expect(ordina([nazionale, veneto], profilo({ regione: "Veneto" }), "pertinenza").map((b) => b.id)).toEqual(["v", "n"]);
  });

  it("scadenza: gli sportelli senza data vanno in fondo", () => {
    const sportello = bando({ id: "s", chiusura: null });
    const presto = bando({ id: "p", chiusura: "2026-11-30" });
    expect(ordina([sportello, presto], profiloVuoto, "scadenza").map((b) => b.id)).toEqual(["p", "s"]);
  });

  it("conta i giorni alla scadenza", () => {
    expect(giorniAllaScadenza(bando({ chiusura: "2026-12-03" }), "2026-11-23")).toBe(10);
    expect(giorniAllaScadenza(bando({ chiusura: null }), "2026-11-23")).toBeNull();
  });
});

describe("formato", () => {
  it("raggruppa le migliaia anche sotto 10.000", () => {
    expect(numero(6095)).toBe("6.095");
    expect(importo(5000)).toBe("€ 5.000");
  });

  it("scrive i milioni in breve", () => {
    expect(importo(1_500_000)).toBe("€ 1,5 mln");
    expect(importo(34_200_000)).toBe("€ 34 mln");
    expect(importo(null)).toBe("—");
  });
});
