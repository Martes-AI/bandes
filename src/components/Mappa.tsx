import { useMemo, useRef, useState, type PointerEvent } from "react";
import mappa from "../data/mappa.json";
import { numero, regioneBreve } from "../lib/formato";

const PASSO = 10; // unità SVG tra due puntini
const RAGGIO = 3.3;
const LARGHEZZA = (mappa.colonne + 1) * PASSO;
const ALTEZZA = (mappa.righe + 1) * PASSO;
const CENTRI = mappa.centri as Record<string, number[]>;
/** Distanza minima tra due etichette dallo stesso lato, in frazione dell'altezza */
const STACCO = 0.065;
/** Oltre questa distanza dal puntino più vicino (in celle) si è in mare */
const PRESA = 1.6;

/** Cella della griglia → indice della regione */
const GRIGLIA = new Map<string, number>(mappa.punti.map(([x, y, i]) => [`${x},${y}`, i]));

/** La regione del puntino più vicino al punto (gx, gy) in celle, o null se si è in mare. */
export function regioneVicina(gx: number, gy: number): string | null {
  let migliore: string | null = null;
  let distanza = PRESA;
  const cx = Math.round(gx);
  const cy = Math.round(gy);
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const i = GRIGLIA.get(`${cx + dx},${cy + dy}`);
      if (i === undefined) continue;
      const d = Math.hypot(cx + dx - gx, cy + dy - gy);
      if (d < distanza) {
        distanza = d;
        migliore = mappa.regioni[i];
      }
    }
  }
  return migliore;
}

interface Props {
  /** Bandi aperti per regione, compresi i nazionali */
  conteggi: Record<string, number>;
  /** Bandi solo regionali: decidono quanto si accende la regione */
  regionali: Record<string, number>;
  selezionata: string | null;
  onScegli: (regione: string | null) => void;
}

interface Etichetta {
  regione: string;
  ax: number;
  ay: number;
  ex: number;
  ey: number;
  aDestra: boolean;
}

/** Ogni etichetta esce verso il mare e non si sovrappone alle altre dello stesso lato. */
function disponi(regioni: string[]): Etichetta[] {
  const etichette = regioni
    .filter((r) => CENTRI[r])
    .map((regione) => {
      const [x, y] = CENTRI[regione];
      const ax = ((x + 0.5) * PASSO) / LARGHEZZA;
      const ay = ((y + 0.5) * PASSO) / ALTEZZA;
      const aDestra = x >= mappa.colonne * 0.3;
      return { regione, ax, ay, ex: aDestra ? ax + 0.12 : ax - 0.12, ey: ay - 0.035, aDestra };
    })
    .sort((a, b) => a.ey - b.ey);
  for (const lato of [true, false]) {
    let ultima = -1;
    for (const e of etichette.filter((x) => x.aDestra === lato)) {
      e.ey = Math.max(e.ey, ultima + STACCO, 0.03);
      ultima = e.ey;
    }
  }
  return etichette;
}

/** L'Italia a puntini. Più bandi regionali, più la regione è chiara; quella scelta è verde.
 *  Il puntatore prende la regione più vicina, così si tocca anche tra un puntino e l'altro. */
export function Mappa({ conteggi, regionali, selezionata, onScegli }: Props) {
  const [sopra, setSopra] = useState<string | null>(null);
  const tela = useRef<HTMLDivElement>(null);
  const massimo = Math.max(1, ...Object.values(regionali));

  // La regione scelta e quella sotto il puntatore; senza nessuna delle due, le tre con più bandi regionali.
  const etichette = useMemo(() => {
    const mostrate = [selezionata, sopra].filter((r, i, a): r is string => !!r && a.indexOf(r) === i);
    if (mostrate.length) return disponi(mostrate);
    return disponi(
      Object.entries(regionali)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([r]) => r),
    );
  }, [selezionata, sopra, regionali]);

  function regioneDa(e: PointerEvent): string | null {
    const box = tela.current?.getBoundingClientRect();
    if (!box || !box.width) return null;
    const gx = ((e.clientX - box.left) / box.width) * (LARGHEZZA / PASSO) - 0.5;
    const gy = ((e.clientY - box.top) / box.height) * (ALTEZZA / PASSO) - 0.5;
    return regioneVicina(gx, gy);
  }

  return (
    <div className="mappa">
      <div
        ref={tela}
        className={sopra ? "mappa-tela sopra" : "mappa-tela"}
        style={{ aspectRatio: `${LARGHEZZA} / ${ALTEZZA}` }}
        onPointerMove={(e) => {
          const r = regioneDa(e);
          if (r !== sopra) setSopra(r);
        }}
        onPointerLeave={() => setSopra(null)}
        onClick={(e) => {
          const r = regioneDa(e as unknown as PointerEvent);
          // Toccare il mare, o di nuovo la regione scelta, torna a tutta Italia.
          onScegli(r && r !== selezionata ? r : null);
        }}
      >
        <svg viewBox={`0 0 ${LARGHEZZA} ${ALTEZZA}`} role="img" aria-label="Mappa d'Italia con i bandi aperti per regione">
          {mappa.punti.map(([x, y, i]) => {
            const regione = mappa.regioni[i];
            const scelta = regione === selezionata;
            const accesa = regione === sopra && !scelta;
            const intensita = (regionali[regione] ?? 0) / massimo;
            const opacita = selezionata && !scelta ? 0.14 + intensita * 0.16 : 0.2 + intensita * 0.6;
            return (
              <circle
                key={`${x}-${y}`}
                cx={(x + 0.5) * PASSO}
                cy={(y + 0.5) * PASSO}
                r={RAGGIO}
                className={scelta ? "punto scelto" : accesa ? "punto acceso" : "punto"}
                style={scelta || accesa ? undefined : { opacity: opacita }}
              />
            );
          })}
          {etichette.map((e) => (
            <g key={e.regione} className={e.regione === selezionata ? "filo" : "filo prova"}>
              <line x1={e.ax * LARGHEZZA} y1={e.ay * ALTEZZA} x2={e.ex * LARGHEZZA} y2={e.ey * ALTEZZA} />
              <rect x={e.ax * LARGHEZZA - 3.5} y={e.ay * ALTEZZA - 3.5} width={7} height={7} />
            </g>
          ))}
        </svg>
        {etichette.map((e) => (
          <span
            key={e.regione}
            className={[
              "etichetta",
              e.aDestra ? "" : "a-sinistra",
              selezionata && e.regione !== selezionata ? "prova" : "",
            ].join(" ")}
            style={{ left: `${e.ex * 100}%`, top: `${e.ey * 100}%` }}
          >
            {regioneBreve(e.regione)} · {numero(conteggi[e.regione] ?? 0)}
          </span>
        ))}
      </div>
    </div>
  );
}
