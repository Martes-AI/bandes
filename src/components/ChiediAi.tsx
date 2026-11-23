import { LoaderCircle } from "lucide-react";
import { CONFIG } from "../config";
import { numero } from "../lib/formato";
import { MAX_DESCRIZIONE, type Fornitore, type Impresa, type Valutazione } from "../lib/tipi";
import { CampoFornitore } from "./CampoFornitore";

export type StatoAi =
  | { fase: "pronta" }
  | { fase: "in-corso" }
  | { fase: "fatta"; esiti: Valutazione[] }
  | { fase: "errore"; messaggio: string };

interface Props {
  disponibile: boolean | null;
  azienda: Impresa | null;
  descrizione: string;
  cambiaDescrizione: (s: string) => void;
  fornitore: Fornitore;
  cambiaFornitore: (f: Fornitore) => void;
  stato: StatoAi;
  quanti: number;
  valuta: () => void;
}

export function ChiediAi(props: Props) {
  const { stato, disponibile, fornitore } = props;
  if (disponibile === false) {
    return (
      <section className="scheda chiedi spenta">
        <p className="muto">
          La valutazione con l'AI non è attiva su questa installazione. Chi pubblica l'app può attivarla con una
          chiave OpenRouter: le istruzioni sono nel README.
        </p>
      </section>
    );
  }
  const conti =
    stato.fase === "fatta"
      ? (["si", "forse", "no"] as const).map((e) => stato.esiti.filter((x) => x.esito === e).length)
      : null;
  const suggerito = CONFIG.fornitoreSuggerito;
  // Il testo "cosa ti fornisce" di Martes non vale per un altro fornitore: si svuota.
  const cambiaImpresa = (impresa: Impresa | null) =>
    props.cambiaFornitore({ impresa, cosa: suggerito && fornitore.cosa === suggerito.cosa ? "" : fornitore.cosa });

  return (
    <section className="scheda chiedi" aria-labelledby="titolo-chiedi">
      <div className="chiedi-testo">
        <h2 id="titolo-chiedi">Quali fanno davvero per te</h2>
        <p className="secondario">
          Racconta cosa fa la tua azienda e cosa vuoi finanziare. L'AI legge i primi {numero(props.quanti)} bandi
          della lista e ti dice quali puoi chiedere.
        </p>
        <p className="secondario">
          Se sai già a chi affidare il lavoro, indica anche il fornitore: molti bandi hanno regole su chi può
          fornire il servizio.
        </p>
      </div>

      <div className="chiedi-modulo">
        <label className="campo">
          <span className="campo-etichetta">
            {props.azienda ? `Cosa fa ${props.azienda.nome} e cosa vuole finanziare` : "La tua azienda"}
          </span>
          <textarea
            value={props.descrizione}
            maxLength={MAX_DESCRIZIONE}
            rows={3}
            placeholder="Es. Carpenteria metallica di 18 persone a Vicenza. Vogliamo un gestionale e formare il team sull'AI"
            onChange={(e) => props.cambiaDescrizione(e.target.value)}
          />
        </label>

        <fieldset className="fornitore">
          <legend className="campo-etichetta">
            A chi vuoi affidare il lavoro <span className="muto">facoltativo</span>
          </legend>
          <div className="fornitore-campi">
            <div className="campo">
              <span className="campo-etichetta">Fornitore</span>
              <CampoFornitore impresa={fornitore.impresa} onImpresa={cambiaImpresa} />
            </div>
            <label className="campo">
              <span className="campo-etichetta">Cosa ti fornisce</span>
              <input
                className="testo"
                value={fornitore.cosa}
                maxLength={300}
                placeholder="Es. software gestionale e formazione AI"
                onChange={(e) => props.cambiaFornitore({ ...fornitore, cosa: e.target.value })}
              />
            </label>
          </div>
          {suggerito && fornitore.impresa?.piva !== suggerito.impresa.piva && (
            <button
              className="link-bottone"
              onClick={() => props.cambiaFornitore({ impresa: suggerito.impresa, cosa: suggerito.cosa })}
            >
              Usa {suggerito.impresa.nome} come fornitore
            </button>
          )}
        </fieldset>

        <div className="chiedi-piede">
          <span className="muto piccolo">
            {stato.fase === "errore" ? (
              <span className="errore">{stato.messaggio}</span>
            ) : conti ? (
              <span className="mono">
                {conti[0]} fanno per te · {conti[1]} da verificare · {conti[2]} no
              </span>
            ) : (
              "Quello che scrivi va solo al modello che valuta i bandi, non viene salvato"
            )}
          </span>
          <button
            className="bottone primario"
            disabled={stato.fase === "in-corso" || props.quanti === 0}
            onClick={props.valuta}
          >
            {stato.fase === "in-corso" ? (
              <>
                <LoaderCircle className="gira" size={16} strokeWidth={1.5} aria-hidden />
                Sto leggendo i bandi
              </>
            ) : stato.fase === "fatta" ? (
              "Valuta di nuovo"
            ) : (
              `Valuta ${numero(props.quanti)} bandi`
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
