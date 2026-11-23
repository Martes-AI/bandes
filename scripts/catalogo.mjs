// Scarica l'open data di Incentivi Italia e scrive public/catalogo.json
// con i soli bandi aperti, nei campi che usa l'app.
//
//   node scripts/catalogo.mjs                  scarica e aggiorna
//   node scripts/catalogo.mjs --file dati.json usa un file già scaricato
//
// Il server di incentivitalia.gov.it taglia le connessioni lunghe:
// il download riprende da dove si è fermato con l'header Range.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizza, aperto } from "./normalizza.mjs";

const URL_OPEN_DATA = "https://www.incentivitalia.gov.it/open-data/incentivi/OpenData_Incentivi.json";
const QUI = dirname(fileURLToPath(import.meta.url));
const USCITA = resolve(QUI, "../public/catalogo.json");
const TENTATIVI = 12;

async function scarica() {
  const pezzi = [];
  let letti = 0;
  let totale = null;
  for (let tentativo = 1; tentativo <= TENTATIVI; tentativo++) {
    try {
      const risposta = await fetch(URL_OPEN_DATA, {
        headers: letti ? { Range: `bytes=${letti}-` } : {},
        signal: AbortSignal.timeout(120_000),
      });
      if (letti && risposta.status !== 206) {
        // Il server ha ignorato il Range: si riparte da capo.
        pezzi.length = 0;
        letti = 0;
      }
      if (!risposta.ok) throw new Error(`HTTP ${risposta.status}`);
      if (totale === null) {
        const lunghezza = Number(risposta.headers.get("content-length"));
        totale = lunghezza ? lunghezza + letti : null;
      }
      const lettore = risposta.body.getReader();
      for (;;) {
        const { done, value } = await lettore.read();
        if (done) break;
        pezzi.push(value);
        letti += value.length;
      }
      if (totale === null || letti >= totale) break;
    } catch (errore) {
      console.warn(`Tentativo ${tentativo}: ${errore.message} (letti ${letti} byte), riprendo`);
      if (tentativo === TENTATIVI) throw errore;
      await new Promise((r) => setTimeout(r, 2000 * tentativo));
    }
  }
  return Buffer.concat(pezzi).toString("utf-8");
}

async function main() {
  const indice = process.argv.indexOf("--file");
  const testo = indice > 0 ? await readFile(process.argv[indice + 1], "utf-8") : await scarica();
  const grezzi = JSON.parse(testo);
  if (!Array.isArray(grezzi) || grezzi.length < 1000) {
    throw new Error(`Catalogo sospetto: ${Array.isArray(grezzi) ? grezzi.length : typeof grezzi} voci`);
  }
  const oggi = new Date().toISOString().slice(0, 10);
  const bandi = grezzi
    .filter((r) => aperto(r, oggi))
    .map(normalizza)
    .sort((a, b) => (a.chiusura ?? "9999").localeCompare(b.chiusura ?? "9999") || a.id.localeCompare(b.id));

  // Se il file non è cambiato nei bandi, non si tocca: niente commit inutili.
  let precedente = null;
  try {
    precedente = JSON.parse(await readFile(USCITA, "utf-8"));
  } catch {}
  if (precedente && JSON.stringify(precedente.bandi) === JSON.stringify(bandi)) {
    console.log(`Nessun cambiamento: ${bandi.length} bandi aperti`);
    return;
  }

  await mkdir(dirname(USCITA), { recursive: true });
  await writeFile(USCITA, JSON.stringify({ aggiornato: oggi, totaleCatalogo: grezzi.length, bandi }));
  console.log(`Scritti ${bandi.length} bandi aperti su ${grezzi.length} in ${USCITA}`);
}

main().catch((errore) => {
  console.error(errore);
  process.exit(1);
});
