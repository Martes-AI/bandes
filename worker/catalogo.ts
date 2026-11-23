// Aggiornamento giornaliero del catalogo, dentro il Worker.
// Il file di Incentivi Italia pesa circa 28 MB: leggerlo tutto in memoria sfiora il limite di 128 MB
// di un Worker, quindi si legge a flusso e si tiene un bando alla volta.

import { aperto, normalizza } from "../scripts/normalizza.mjs";
import type { Bando, Catalogo } from "../src/lib/tipi";

export const URL_OPEN_DATA = "https://www.incentivitalia.gov.it/open-data/incentivi/OpenData_Incentivi.json";
export const CHIAVE_KV = "catalogo";

/**
 * Restituisce uno alla volta gli oggetti di un array JSON di primo livello (`[ {...}, {...} ]`),
 * senza mai tenere in memoria più di un oggetto.
 */
export async function* oggettiDellArray(flusso: ReadableStream<string>): AsyncGenerator<unknown> {
  let profondita = 0;
  let inStringa = false;
  let escape = false;
  let corrente = "";
  const lettore = flusso.getReader();
  for (;;) {
    const { done, value } = await lettore.read();
    if (done) break;
    let inizio = profondita >= 2 ? 0 : -1;
    for (let i = 0; i < value.length; i++) {
      const c = value[i];
      if (inStringa) {
        if (escape) escape = false;
        else if (c === "\\") escape = true;
        else if (c === '"') inStringa = false;
        continue;
      }
      if (c === '"') inStringa = true;
      else if (c === "{" || c === "[") {
        profondita++;
        if (profondita === 2) inizio = i;
      } else if (c === "}" || c === "]") {
        if (profondita === 2) {
          corrente += value.slice(Math.max(inizio, 0), i + 1);
          yield JSON.parse(corrente);
          corrente = "";
          inizio = -1;
        }
        profondita--;
      }
    }
    if (profondita >= 2) corrente += value.slice(Math.max(inizio, 0));
  }
  if (profondita !== 0) throw new Error("JSON del catalogo troncato");
}

export async function scaricaCatalogo(oggi: string): Promise<Catalogo> {
  const risposta = await fetch(URL_OPEN_DATA, { signal: AbortSignal.timeout(240_000) });
  if (!risposta.ok || !risposta.body) throw new Error(`Incentivi Italia: HTTP ${risposta.status}`);
  const bandi: Bando[] = [];
  let totale = 0;
  for await (const r of oggettiDellArray(risposta.body.pipeThrough(new TextDecoderStream()))) {
    totale++;
    if (r && typeof r === "object" && aperto(r as Record<string, unknown>, oggi)) {
      bandi.push(normalizza(r as Record<string, unknown>));
    }
  }
  // Un catalogo troppo piccolo è quasi sempre un download interrotto: meglio tenere quello di ieri.
  if (totale < 1000 || bandi.length < 100) throw new Error(`Catalogo sospetto: ${bandi.length} aperti su ${totale}`);
  bandi.sort((a, b) => (a.chiusura ?? "9999").localeCompare(b.chiusura ?? "9999") || a.id.localeCompare(b.id));
  return { aggiornato: oggi, totaleCatalogo: totale, bandi };
}
