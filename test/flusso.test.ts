import { describe, expect, it } from "vitest";
import { oggettiDellArray } from "../worker/catalogo";

function flusso(pezzi: string[]) {
  return new ReadableStream<string>({
    start(c) {
      for (const p of pezzi) c.enqueue(p);
      c.close();
    },
  });
}

async function tutti(pezzi: string[]) {
  const risultato: unknown[] = [];
  for await (const o of oggettiDellArray(flusso(pezzi))) risultato.push(o);
  return risultato;
}

describe("oggettiDellArray", () => {
  it("legge gli oggetti anche spezzati a metà tra un pezzo e l'altro", async () => {
    const json = JSON.stringify([{ a: 1, b: [1, { c: "}" }] }, { d: 'virgolette \\" e {graffe}' }, { e: null }]);
    const pezzi = json.match(/.{1,7}/gs)!;
    expect(await tutti(pezzi)).toEqual(JSON.parse(json));
  });

  it("si accorge di un file troncato", async () => {
    await expect(tutti(['[{"a":1},{"b":'])).rejects.toThrow("troncato");
  });
});
