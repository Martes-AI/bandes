import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HEADER_SICUREZZA, conSicurezza } from "../worker/sicurezza";

/** Gli header della regola "/*" di public/_headers, con i nomi in minuscolo. */
function headerStatici() {
  const righe = readFileSync(new URL("../public/_headers", import.meta.url), "utf8").split("\n");
  const da = righe.indexOf("/*");
  const header: Record<string, string> = {};
  for (const riga of righe.slice(da + 1)) {
    if (!/^\s+\S/.test(riga)) break;
    const [nome, ...valore] = riga.trim().split(": ");
    header[nome.toLowerCase()] = valore.join(": ");
  }
  return header;
}

describe("header di sicurezza", () => {
  it("file statici e Worker usano gli stessi header", () => {
    expect(headerStatici()).toEqual(HEADER_SICUREZZA);
  });

  it("conSicurezza li aggiunge senza togliere quelli della risposta", async () => {
    const r = conSicurezza(new Response("{}", { status: 404, headers: { "content-type": "application/json" } }));
    expect(r.status).toBe(404);
    expect(r.headers.get("content-type")).toBe("application/json");
    expect(r.headers.get("x-frame-options")).toBe("DENY");
    expect(r.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(await r.text()).toBe("{}");
  });
});
