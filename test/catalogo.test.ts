import { describe, expect, it } from "vitest";
// @ts-expect-error: modulo JavaScript dello script, senza tipi
import { aperto, normalizza, sezioni } from "../scripts/normalizza.mjs";

describe("aperto", () => {
  const oggi = "2026-11-23";
  it("tiene i bandi con chiusura futura e toglie quelli chiusi", () => {
    expect(aperto({ Data_apertura: "2026-01-01", Data_chiusura: "2026-12-01" }, oggi)).toBe(true);
    expect(aperto({ Data_apertura: "2026-01-01", Data_chiusura: "2026-11-01" }, oggi)).toBe(false);
  });
  it("toglie i bandi che non sono ancora aperti", () => {
    expect(aperto({ Data_apertura: "2027-01-01", Data_chiusura: "2027-03-01" }, oggi)).toBe(false);
  });
  it("tiene gli sportelli recenti e toglie quelli vecchi senza data di chiusura", () => {
    expect(aperto({ Data_apertura: "2025-06-01", Data_chiusura: null }, oggi)).toBe(true);
    expect(aperto({ Data_apertura: "2022-06-01", Data_chiusura: null }, oggi)).toBe(false);
  });
});

describe("sezioni", () => {
  it("divide la descrizione del portale nelle tre parti", () => {
    const s = sezioni("Cos'è Un voucher. A chi si rivolge Le PMI venete. Cosa prevede Il 50% delle spese.");
    expect(s).toEqual({ cose: "Un voucher.", chi: "Le PMI venete.", cosa: "Il 50% delle spese." });
  });
  it("senza intestazioni mette tutto in Cos'è", () => {
    expect(sezioni("Testo libero")).toEqual({ cose: "Testo libero", chi: "", cosa: "" });
  });
});

describe("normalizza", () => {
  it("riconosce i bandi nazionali e scarta gli importi a zero", () => {
    const tutte = Array.from({ length: 21 }, (_, i) => `Regione ${i}`);
    const b = normalizza({ idBando: 42, Titolo: " Bando ", Regioni: tutte, Agevolazione_Concedibile_Max: 0 });
    expect(b.id).toBe("42");
    expect(b.titolo).toBe("Bando");
    expect(b.nazionale).toBe(true);
    expect(b.agevolazioneMax).toBeNull();
    expect(b.scheda).toBe("https://www.incentivitalia.gov.it/incentivo/42");
  });
});
