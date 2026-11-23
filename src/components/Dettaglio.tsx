import { useEffect, useRef } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { CONFIG } from "../config";
import { FONDO_PERDUTO, OBIETTIVI } from "../lib/filtri";
import { importo, regioneBreve } from "../lib/formato";
import type { Bando, Valutazione } from "../lib/tipi";
import { Scadenza } from "./Lista";
import { TESTO_ESITO, TONO_ESITO, Timbro } from "./Timbro";

interface Props {
  bando: Bando | null;
  valutazione?: Valutazione;
  oggi: string;
  chiudi: () => void;
}

const PER_INVITO = new Set(["digitale", "servizi", "formazione"]);

function Sezione({ titolo, testo }: { titolo: string; testo: string }) {
  if (!testo) return null;
  return (
    <section className="sezione">
      <h3>{titolo}</h3>
      <p>{testo}</p>
    </section>
  );
}

export function Dettaglio({ bando, valutazione, oggi, chiudi }: Props) {
  const pannello = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bando) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && chiudi();
    window.addEventListener("keydown", esc);
    pannello.current?.focus();
    return () => window.removeEventListener("keydown", esc);
  }, [bando, chiudi]);

  if (!bando) return null;
  const invito =
    CONFIG.invito && OBIETTIVI.some((o) => PER_INVITO.has(o.chiave) && o.tocca(bando)) ? CONFIG.invito : null;
  const dove = bando.nazionale || bando.regioni.length === 0 ? "Tutta Italia" : bando.regioni.map(regioneBreve).join(", ");

  return (
    <div className="velo" onClick={chiudi}>
      <div
        className="pannello"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titolo-bando"
        tabIndex={-1}
        ref={pannello}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="pannello-testa">
          <span className="muto">{bando.ente}</span>
          <button className="icona-bottone" onClick={chiudi} aria-label="Chiudi">
            <X size={18} strokeWidth={1.5} />
          </button>
        </header>

        <div className="pannello-corpo">
          <h2 id="titolo-bando">{bando.titolo}</h2>

          {valutazione && (
            <div className={`giudizio giudizio-${valutazione.esito}`}>
              <Timbro tono={TONO_ESITO[valutazione.esito]}>{TESTO_ESITO[valutazione.esito]}</Timbro>
              <p>{valutazione.perche}</p>
              {valutazione.verifica && (
                <p className="muto">
                  <span className="secondario">Da controllare:</span> {valutazione.verifica}
                </p>
              )}
              {valutazione.fornitore && (
                <p className="muto">
                  <span className="secondario">Sul fornitore:</span> {valutazione.fornitore}
                </p>
              )}
            </div>
          )}

          <dl className="cifre">
            <div>
              <dt>Contributo fino a</dt>
              <dd>{importo(bando.agevolazioneMax)}</dd>
            </div>
            <div>
              <dt>Spesa ammessa fino a</dt>
              <dd>{importo(bando.spesaMax)}</dd>
            </div>
            <div>
              <dt>Scadenza</dt>
              <dd>
                <Scadenza bando={bando} oggi={oggi} />
              </dd>
            </div>
            <div>
              <dt>Dotazione</dt>
              <dd>{importo(bando.dotazione)}</dd>
            </div>
          </dl>

          <p className="meta">
            {[dove, bando.forme.includes(FONDO_PERDUTO) ? "Fondo perduto" : bando.forme[0]]
              .concat(bando.ambito.map((a) => `Solo ${a}`))
              .filter(Boolean)
              .join(" · ")}
          </p>

          <Sezione titolo="Cos'è" testo={bando.cose} />
          <Sezione titolo="A chi si rivolge" testo={bando.chi} />
          <Sezione titolo="Cosa prevede" testo={bando.cosa} />
          <Sezione titolo="Come e quando fare domanda" testo={bando.notaScadenza} />

          <div className="azioni">
            {bando.link && (
              <a className="bottone primario" href={bando.link} target="_blank" rel="noreferrer">
                Bando ufficiale
                <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden />
              </a>
            )}
            <a className="bottone secondario" href={bando.scheda} target="_blank" rel="noreferrer">
              Scheda su Incentivi Italia
            </a>
          </div>
          <p className="avviso">
            I dati vengono dal catalogo pubblico di Incentivi Italia. Controlla sempre requisiti e scadenze sul bando
            ufficiale prima di fare domanda.
          </p>

          {invito && (
            <aside className="invito">
              <p>{invito.testo}</p>
              <a href={invito.url} target="_blank" rel="noreferrer" className="link-quieto">
                {invito.azione}
                <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden />
              </a>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
