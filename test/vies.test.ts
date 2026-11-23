import { describe, expect, it } from "vitest";
import { cercaImpresa } from "../worker/index";

const risposta = (corpo: object, stato = 200) =>
  new Response(JSON.stringify(corpo), { status: stato, headers: { "content-type": "application/json" } });
const valida = { isValid: true, userError: "VALID", name: "GOOGLE ITALY S.R.L.", address: "VIA CONFALONIERI 4 \n20124 MILANO MI\n" };

/** Un finto VIES che risponde con le risposte date, una per chiamata. */
function finto(...risposte: Response[]) {
  let i = 0;
  const prendi = (async () => risposte[Math.min(i++, risposte.length - 1)].clone()) as unknown as typeof fetch;
  return { prendi, chiamate: () => i };
}

describe("cercaImpresa", () => {
  it("riprova quando VIES è occupato, invece di dire che la partita IVA non è attiva", async () => {
    const v = finto(risposta({ isValid: false, userError: "MS_MAX_CONCURRENT_REQ" }), risposta(valida));
    const impresa = await cercaImpresa("03660670963", v.prendi, 0);
    expect(impresa?.nome).toBeTruthy();
    expect(impresa?.regione).toBe("Lombardia");
    expect(v.chiamate()).toBe(2);
  });
  it("riprova dopo un errore HTTP", async () => {
    const v = finto(risposta({}, 503), risposta(valida));
    expect((await cercaImpresa("03660670963", v.prendi, 0))?.provincia).toBe("MI");
  });
  it("una partita IVA non valida è una risposta definitiva: niente altri tentativi", async () => {
    const v = finto(risposta({ isValid: false, userError: "INVALID" }));
    expect(await cercaImpresa("03660670963", v.prendi, 0)).toBeNull();
    expect(v.chiamate()).toBe(1);
  });
  it("dopo tre tentativi falliti lancia l'errore", async () => {
    const v = finto(risposta({ isValid: false, userError: "MS_UNAVAILABLE" }));
    await expect(cercaImpresa("03660670963", v.prendi, 0)).rejects.toThrow("MS_UNAVAILABLE");
    expect(v.chiamate()).toBe(3);
  });
});
