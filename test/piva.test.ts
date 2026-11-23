import { describe, expect, it } from "vitest";
import { leggiSede, pivaValida, pulisciPiva, regioneDaProvincia } from "../src/lib/piva";

describe("partita IVA", () => {
  it("controlla la cifra finale", () => {
    expect(pivaValida("12345678903")).toBe(true);
    expect(pivaValida("12345678901")).toBe(false);
    expect(pivaValida("00000000000")).toBe(false);
    expect(pivaValida("1234")).toBe(false);
  });

  it("toglie spazi e prefisso IT", () => {
    expect(pulisciPiva(" IT 123 456 789 03 ")).toBe("12345678903");
    expect(pulisciPiva("12345")).toBeNull();
  });
});

describe("sede da VIES", () => {
  it("ricava comune, provincia e regione dall'indirizzo", () => {
    expect(leggiSede("VIA AURELIA 325 \n00165 ROMA RM\n")).toEqual({ comune: "Roma", provincia: "RM", regione: "Lazio" });
    expect(leggiSede("VIA X 1\n39100 BOLZANO .BOZEN BZ\n").regione).toBe("Trentino-Alto Adige/Südtirol");
    expect(leggiSede("VIA X 1\n70056 MOLFETTA BA").comune).toBe("Molfetta");
  });

  it("senza CAP e provincia non inventa niente", () => {
    expect(leggiSede("indirizzo strano")).toEqual({ comune: null, provincia: null, regione: null });
  });

  it("copre tutte le province con una regione", () => {
    for (const s of ["AO", "SU", "BT", "MB", "FM", "VV", "PO"]) expect(regioneDaProvincia(s)).not.toBeNull();
  });
});
