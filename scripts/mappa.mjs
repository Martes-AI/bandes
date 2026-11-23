// Disegna l'Italia a puntini: una griglia regolare, un punto dove cade dentro una regione.
// Scrive src/data/mappa.json, che si genera una volta sola e sta nella repo.
//
//   node scripts/mappa.mjs percorso/limits_IT_regions.geojson
//
// Confini: openpolis/geojson-italy (dati ISTAT), licenza CC BY 4.0.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const QUI = dirname(fileURLToPath(import.meta.url));
const USCITA = resolve(QUI, "../src/data/mappa.json");
const PASSO = 0.135; // gradi di latitudine tra due righe
const LAT_MEDIA = 41.9;

function dentroAnello(lon, lat, anello) {
  let dentro = false;
  for (let i = 0, j = anello.length - 1; i < anello.length; j = i++) {
    const [xi, yi] = anello[i];
    const [xj, yj] = anello[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

function dentroPoligono(lon, lat, poligono) {
  if (!dentroAnello(lon, lat, poligono[0])) return false;
  return !poligono.slice(1).some((buco) => dentroAnello(lon, lat, buco));
}

async function main() {
  const percorso = process.argv[2];
  if (!percorso) throw new Error("Serve il percorso del geojson delle regioni");
  const geo = JSON.parse(await readFile(percorso, "utf-8"));
  const regioni = geo.features.map((f) => ({
    nome: f.properties.reg_name,
    poligoni: f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates,
  }));

  const passoLon = PASSO / Math.cos((LAT_MEDIA * Math.PI) / 180);
  const [lonMin, lonMax, latMin, latMax] = [6.6, 18.6, 36.6, 47.1];
  const colonne = Math.ceil((lonMax - lonMin) / passoLon);
  const righe = Math.ceil((latMax - latMin) / PASSO);

  const punti = [];
  for (let r = 0; r < righe; r++) {
    // Righe alternate sfalsate di mezzo passo: la trama sembra stampata, non pixelata.
    const sfasamento = r % 2 ? 0.5 : 0;
    for (let c = 0; c < colonne; c++) {
      const lon = lonMin + (c + sfasamento) * passoLon;
      const lat = latMax - r * PASSO;
      const indice = regioni.findIndex((reg) => reg.poligoni.some((p) => dentroPoligono(lon, lat, p)));
      if (indice >= 0) punti.push([+(c + sfasamento).toFixed(1), r, indice]);
    }
  }

  // Il centro di ogni regione, per appoggiarci l'etichetta.
  const centri = Object.fromEntries(
    regioni.map((reg, i) => {
      const suoi = punti.filter((p) => p[2] === i);
      const x = suoi.reduce((s, p) => s + p[0], 0) / (suoi.length || 1);
      const y = suoi.reduce((s, p) => s + p[1], 0) / (suoi.length || 1);
      return [reg.nome, [+x.toFixed(1), +y.toFixed(1)]];
    }),
  );

  await mkdir(dirname(USCITA), { recursive: true });
  await writeFile(
    USCITA,
    JSON.stringify({ colonne, righe, regioni: regioni.map((r) => r.nome), centri, punti }),
  );
  console.log(`${punti.length} punti su una griglia ${colonne}×${righe}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
