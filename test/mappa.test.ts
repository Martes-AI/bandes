import { describe, expect, it } from "vitest";
import mappa from "../src/data/mappa.json";
import { regioneVicina } from "../src/components/Mappa";

const centro = (r: string) => (mappa.centri as Record<string, number[]>)[r];

describe("regioneVicina", () => {
  it("prende la regione anche tra un puntino e l'altro", () => {
    const [x, y, i] = mappa.punti.find(([, , i]) => mappa.regioni[i] === "Veneto")!;
    expect(regioneVicina(x + 0.45, y + 0.45)).toBe(mappa.regioni[i]);
  });
  it("prende le regioni piccole dal loro centro", () => {
    for (const r of ["Valle d'Aosta/Vallée d'Aoste", "Molise", "Liguria", "Umbria"]) {
      const [x, y] = centro(r);
      expect(regioneVicina(x, y)).toBe(r);
    }
  });
  it("in mare non prende niente", () => {
    expect(regioneVicina(mappa.colonne - 1, 0)).toBeNull();
    expect(regioneVicina(-5, -5)).toBeNull();
  });
});
