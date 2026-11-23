import { ArrowUpRight } from "lucide-react";
import { giorniAllaScadenza, type Ordine } from "../lib/filtri";
import { data, importo, numero, regioneBreve } from "../lib/formato";
import type { Bando, Valutazione } from "../lib/tipi";
import { TESTO_ESITO, TONO_ESITO, Timbro } from "./Timbro";

interface Props {
  bandi: Bando[];
  totale: number;
  mostrati: number;
  altri: () => void;
  ordine: Ordine;
  cambiaOrdine: (o: Ordine) => void;
  valutazioni: Record<string, Valutazione>;
  regione: string | null;
  oggi: string;
  apri: (id: string) => void;
}

const ORDINI: { valore: Ordine; testo: string }[] = [
  { valore: "pertinenza", testo: "Pertinenza" },
  { valore: "scadenza", testo: "Scadenza" },
  { valore: "importo", testo: "Importo" },
];

function territorio(b: Bando, regione: string | null) {
  if (b.nazionale || b.regioni.length === 0) return "Tutta Italia";
  if (regione && b.regioni.includes(regione)) return regioneBreve(regione);
  if (b.regioni.length === 1) return regioneBreve(b.regioni[0]);
  return `${b.regioni.length} regioni`;
}

export function Scadenza({ bando, oggi }: { bando: Bando; oggi: string }) {
  const giorni = giorniAllaScadenza(bando, oggi);
  if (giorni === null) return <span className="muto">A sportello</span>;
  return (
    <span className="scadenza">
      <span>{data(bando.chiusura)}</span>
      {giorni <= 30 && (
        <Timbro tono="neutro">{giorni === 0 ? "oggi" : giorni === 1 ? "domani" : `${giorni} gg`}</Timbro>
      )}
    </span>
  );
}

export function Lista(props: Props) {
  const { bandi, valutazioni, oggi } = props;
  return (
    <section className="scheda lista" aria-labelledby="titolo-lista">
      <header className="lista-testa">
        <h2 id="titolo-lista">
          Bandi <span className="muto mono">{numero(props.totale)}</span>
        </h2>
        <div className="segmenti piccoli" role="group" aria-label="Ordina per">
          {ORDINI.map((o) => (
            <button
              key={o.valore}
              className={props.ordine === o.valore ? "segmento attivo" : "segmento"}
              aria-pressed={props.ordine === o.valore}
              onClick={() => props.cambiaOrdine(o.valore)}
            >
              {o.testo}
            </button>
          ))}
        </div>
      </header>

      <div className="tabella">
        <div className="riga intestazione" aria-hidden>
          <span>Bando</span>
          <span>Dove</span>
          <span className="destra">
            Contributo fino a
          </span>
          <span className="destra">
            Scadenza
          </span>
        </div>
        {bandi.length === 0 && (
          <p className="vuoto">Nessun bando aperto con questi filtri. Prova a toglierne uno.</p>
        )}
        {bandi.map((b) => {
          const v = valutazioni[b.id];
          return (
            <button
              key={b.id}
              className={v?.esito === "no" ? "riga bando escluso" : "riga bando"}
              onClick={() => props.apri(b.id)}
            >
              <span className="bando-titolo">
                {v && <Timbro tono={TONO_ESITO[v.esito]}>{TESTO_ESITO[v.esito]}</Timbro>}
                <span className="titolo">{b.titolo}</span>
                <span className="ente">{b.ente}</span>
                {v && <span className="perche">{v.perche}</span>}
              </span>
              <span className="secondario">
                {territorio(b, props.regione)}
              </span>
              <span className="destra mono">
                {importo(b.agevolazioneMax)}
              </span>
              <span className="destra mono">
                <Scadenza bando={b} oggi={oggi} />
              </span>
              <ArrowUpRight className="freccia" size={16} strokeWidth={1.5} aria-hidden />
            </button>
          );
        })}
      </div>
      {props.mostrati < props.totale && (
        <button className="bottone secondario altri" onClick={props.altri}>
          Mostra altri {numero(Math.min(40, props.totale - props.mostrati))}
        </button>
      )}
    </section>
  );
}
