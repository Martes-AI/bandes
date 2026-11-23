import { useEffect, useRef } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { CONFIG } from "../config";
import { OBIETTIVI, SOGGETTI } from "../lib/filtri";
import { numero, regioneBreve } from "../lib/formato";
import { DIMENSIONI, type Impresa, type Profilo } from "../lib/tipi";
import { CampoPiva } from "./CampoPiva";
import { Logo } from "./Logo";

interface Props {
  profilo: Profilo;
  cambia: (p: Partial<Profilo>) => void;
  azzera: () => void;
  regioni: string[];
  settori: string[];
  conteggiObiettivi: Record<string, number>;
  contoFondoPerduto: number;
  azienda: Impresa | null;
  cambiaAzienda: (i: Impresa | null) => void;
  aperta: boolean;
  chiudi: () => void;
}

function IconaGitHub() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

const ETICHETTE_DIMENSIONE: Record<string, string> = {
  Microimpresa: "Micro",
  "Piccola Impresa": "Piccola",
  "Media Impresa": "Media",
  "Grande Impresa": "Grande",
};

function Scelta({
  etichetta,
  valore,
  opzioni,
  vuoto,
  onCambia,
}: {
  etichetta: string;
  valore: string | null;
  opzioni: { valore: string; testo: string }[];
  vuoto: string;
  onCambia: (v: string | null) => void;
}) {
  return (
    <label className="campo">
      <span className="campo-etichetta">{etichetta}</span>
      <span className="scelta">
        <select value={valore ?? ""} onChange={(e) => onCambia(e.target.value || null)}>
          <option value="">{vuoto}</option>
          {opzioni.map((o) => (
            <option key={o.valore} value={o.valore}>
              {o.testo}
            </option>
          ))}
        </select>
        <ChevronDown size={16} strokeWidth={1.5} aria-hidden />
      </span>
    </label>
  );
}

export function Barra(props: Props) {
  const { profilo, cambia, regioni, settori, conteggiObiettivi } = props;
  const cerca = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const tasto = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        cerca.current?.focus();
      }
    };
    window.addEventListener("keydown", tasto);
    return () => window.removeEventListener("keydown", tasto);
  }, []);

  const filtriAttivi =
    [profilo.regione, profilo.dimensione, profilo.soggetto, profilo.settore].filter(Boolean).length +
    profilo.obiettivi.length +
    (profilo.soloFondoPerduto ? 1 : 0) +
    (profilo.cerca ? 1 : 0);

  return (
    <aside className={props.aperta ? "barra aperta" : "barra"}>
      <div className="barra-testa">
        <Logo />
        <button className="icona-bottone solo-mobile" onClick={props.chiudi} aria-label="Chiudi i filtri">
          <X size={18} strokeWidth={1.5} />
        </button>
      </div>

      <div className="barra-corpo">
        <label className="cerca">
          <Search size={16} strokeWidth={1.5} aria-hidden />
          <input
            ref={cerca}
            type="search"
            placeholder="Cerca"
            value={profilo.cerca}
            onChange={(e) => cambia({ cerca: e.target.value })}
          />
          <span className="tasti" aria-hidden>
            <kbd>⌘</kbd>
            <kbd>K</kbd>
          </span>
        </label>

        <section className="gruppo">
          <h2 className="gruppo-titolo">La tua impresa</h2>
          <CampoPiva
            etichetta="Partita IVA"
            impresa={props.azienda}
            onImpresa={props.cambiaAzienda}
            nota="Facoltativa: trova la sede e imposta la regione"
          />
          <Scelta
            etichetta="Regione"
            valore={profilo.regione}
            vuoto="Tutta Italia"
            opzioni={regioni.map((r) => ({ valore: r, testo: regioneBreve(r) }))}
            onCambia={(regione) => cambia({ regione })}
          />
          <div className="campo">
            <span className="campo-etichetta">Dimensione</span>
            <div className="segmenti" role="group" aria-label="Dimensione">
              {DIMENSIONI.map((d) => (
                <button
                  key={d}
                  className={profilo.dimensione === d ? "segmento attivo" : "segmento"}
                  aria-pressed={profilo.dimensione === d}
                  onClick={() => cambia({ dimensione: profilo.dimensione === d ? null : d })}
                >
                  {ETICHETTE_DIMENSIONE[d]}
                </button>
              ))}
            </div>
          </div>
          <Scelta
            etichetta="Chi sei"
            valore={profilo.soggetto}
            vuoto="Qualsiasi"
            opzioni={SOGGETTI.map((s) => ({ valore: s.chiave, testo: s.etichetta }))}
            onCambia={(v) => cambia({ soggetto: v as Profilo["soggetto"] })}
          />
          <Scelta
            etichetta="Settore"
            valore={profilo.settore}
            vuoto="Tutti i settori"
            opzioni={settori.map((s) => ({ valore: s, testo: s }))}
            onCambia={(settore) => cambia({ settore })}
          />
        </section>

        <section className="gruppo">
          <h2 className="gruppo-titolo">Cosa vuoi finanziare</h2>
          <ul className="voci">
            {OBIETTIVI.map((o) => {
              const attivo = profilo.obiettivi.includes(o.chiave);
              return (
                <li key={o.chiave}>
                  <button
                    className={attivo ? "voce attiva" : "voce"}
                    aria-pressed={attivo}
                    onClick={() =>
                      cambia({
                        obiettivi: attivo
                          ? profilo.obiettivi.filter((k) => k !== o.chiave)
                          : [...profilo.obiettivi, o.chiave],
                      })
                    }
                  >
                    <span className="spunta" aria-hidden>
                      {attivo && <Check size={12} strokeWidth={2.5} />}
                    </span>
                    <span className="voce-testo">{o.etichetta}</span>
                    <span className="conteggio">{numero(conteggiObiettivi[o.chiave] ?? 0)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            className={profilo.soloFondoPerduto ? "interruttore acceso" : "interruttore"}
            role="switch"
            aria-checked={profilo.soloFondoPerduto}
            onClick={() => cambia({ soloFondoPerduto: !profilo.soloFondoPerduto })}
          >
            <span className="voce-testo">Solo fondo perduto</span>
            <span className="conteggio">{numero(props.contoFondoPerduto)}</span>
            <span className="levetta" aria-hidden />
          </button>
        </section>

        {filtriAttivi > 0 && (
          <button className="azzera" onClick={props.azzera}>
            Azzera {filtriAttivi === 1 ? "il filtro" : `${filtriAttivi} filtri`}
          </button>
        )}
      </div>

      <footer className="barra-piede">
        <a href={CONFIG.codice} target="_blank" rel="noreferrer" className="link-quieto">
          <IconaGitHub />
          Codice open source
        </a>
        <p>
          Fatto da{" "}
          <a href={CONFIG.autore.url} target="_blank" rel="noreferrer">
            {CONFIG.autore.nome}
          </a>
        </p>
      </footer>
    </aside>
  );
}
