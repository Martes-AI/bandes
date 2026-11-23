import { LoaderCircle } from "lucide-react";
import { numero } from "../lib/formato";
import { MAX_DESCRIZIONE, type Valutazione } from "../lib/tipi";

export type StatoAi =
  | { fase: "pronta" }
  | { fase: "in-corso" }
  | { fase: "fatta"; esiti: Valutazione[] }
  | { fase: "errore"; messaggio: string };

interface Props {
  disponibile: boolean | null;
  descrizione: string;
  cambiaDescrizione: (s: string) => void;
  stato: StatoAi;
  quanti: number;
  valuta: () => void;
}

export function ChiediAi(props: Props) {
  const { stato, disponibile } = props;
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
      ? {
          si: stato.esiti.filter((e) => e.esito === "si").length,
          forse: stato.esiti.filter((e) => e.esito === "forse").length,
          no: stato.esiti.filter((e) => e.esito === "no").length,
        }
      : null;

  return (
    <section className="scheda chiedi" aria-labelledby="titolo-chiedi">
      <div className="chiedi-testo">
        <h2 id="titolo-chiedi">Quali fanno davvero per te</h2>
        <p className="secondario">
          Racconta in due righe cosa fa la tua azienda e cosa vuoi finanziare. L'AI legge i primi{" "}
          {numero(props.quanti)} bandi della lista e ti dice quali puoi chiedere.
        </p>
      </div>
      <div className="chiedi-modulo">
        <textarea
          value={props.descrizione}
          maxLength={MAX_DESCRIZIONE}
          rows={3}
          placeholder="Es. Siamo una carpenteria metallica di 18 persone a Vicenza. Vogliamo un gestionale e formare il team sull'AI"
          onChange={(e) => props.cambiaDescrizione(e.target.value)}
        />
        <div className="chiedi-piede">
          <span className="muto piccolo">
            {stato.fase === "errore" ? (
              <span className="errore">{stato.messaggio}</span>
            ) : conti ? (
              <span className="mono">
                {conti.si} fanno per te · {conti.forse} da verificare · {conti.no} no
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
