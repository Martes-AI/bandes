import { useEffect, useId, useRef, useState } from "react";
import { BadgeCheck, LoaderCircle, X } from "lucide-react";
import { pivaValida, pulisciPiva } from "../lib/piva";
import type { Impresa } from "../lib/tipi";

interface Props {
  etichetta: string;
  impresa: Impresa | null;
  onImpresa: (i: Impresa | null) => void;
  nota?: string;
}

const ERRORI: Record<string, string> = {
  "piva-non-valida": "Partita IVA non valida",
  "piva-non-attiva": "Partita IVA non attiva nel registro europeo",
  "troppe-richieste": "Troppe ricerche, riprova tra un minuto",
  "registro-non-risponde": "Il registro VIES non risponde, riprova tra poco",
};

/** Partita IVA: al numero giusto cerca da sola l'impresa nel registro europeo VIES. */
export function CampoPiva({ etichetta, impresa, onImpresa, nota }: Props) {
  const id = useId();
  const [testo, setTesto] = useState("");
  const [stato, setStato] = useState<{ fase: "pronto" | "cerco" } | { fase: "errore"; messaggio: string }>({
    fase: "pronto",
  });

  // In un ref: se il genitore passa una funzione nuova a ogni render, la ricerca non riparte.
  const avvisa = useRef(onImpresa);
  avvisa.current = onImpresa;

  useEffect(() => {
    const piva = pulisciPiva(testo);
    if (!piva) {
      setStato({ fase: "pronto" });
      return;
    }
    if (!pivaValida(piva)) {
      setStato({ fase: "errore", messaggio: ERRORI["piva-non-valida"] });
      return;
    }
    const annulla = new AbortController();
    setStato({ fase: "cerco" });
    fetch(`/api/impresa?piva=${piva}`, { signal: annulla.signal })
      .then(async (r) => {
        const dati = await r.json();
        if (!r.ok) throw new Error(dati.errore);
        avvisa.current(dati.impresa as Impresa);
        setTesto("");
        setStato({ fase: "pronto" });
      })
      .catch((e: Error) => {
        if (annulla.signal.aborted) return;
        setStato({ fase: "errore", messaggio: ERRORI[e.message] ?? ERRORI["registro-non-risponde"] });
      });
    return () => annulla.abort();
  }, [testo]);

  return (
    <div className="campo">
      <label className="campo-etichetta" htmlFor={id}>
        {etichetta}
      </label>
      {impresa ? (
        <div className="impresa">
          <BadgeCheck className="impresa-segno" size={16} strokeWidth={1.5} aria-hidden />
          <span className="impresa-testo">
            <span className="impresa-nome">{impresa.nome}</span>
            <span className="impresa-meta mono">
              {impresa.piva}
              {impresa.comune && ` · ${impresa.comune}${impresa.provincia ? ` (${impresa.provincia})` : ""}`}
            </span>
          </span>
          <button className="icona-bottone piccola" onClick={() => onImpresa(null)} aria-label="Togli la partita IVA">
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
      ) : (
        <>
          <span className="cerca piva">
            <input
              id={id}
              inputMode="numeric"
              autoComplete="off"
              placeholder="11 cifre"
              value={testo}
              maxLength={16}
              onChange={(e) => setTesto(e.target.value)}
            />
            {stato.fase === "cerco" && <LoaderCircle className="gira" size={16} strokeWidth={1.5} aria-hidden />}
          </span>
          {stato.fase === "errore" ? (
            <span className="campo-nota errore">{stato.messaggio}</span>
          ) : (
            nota && <span className="campo-nota">{nota}</span>
          )}
        </>
      )}
    </div>
  );
}
