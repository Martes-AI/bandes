import { useState } from "react";
import { BadgeCheck, CircleHelp, Globe, LoaderCircle, Search, X } from "lucide-react";
import type { Impresa, ImpresaTrovata } from "../lib/tipi";

interface Props {
  impresa: Impresa | null;
  onImpresa: (i: Impresa | null) => void;
}

const ERRORI: Record<string, string> = {
  "ricerca-troppo-corta": "Scrivi almeno 3 lettere",
  "troppe-richieste": "Troppe ricerche, riprova tra un minuto",
  "ai-non-configurata": "La ricerca per nome non è attiva: usa la partita IVA",
};

const dominio = (sito: string) => sito.replace(/^https?:\/\/(www\.)?/, "");

/** Nella lista dei risultati è testo (sta dentro un bottone); sulla scheda scelta è un link. */
function Sito({ sito, link = false }: { sito?: string | null; link?: boolean }) {
  if (!sito) return null;
  const contenuto = (
    <>
      <Globe size={12} strokeWidth={1.5} aria-hidden />
      {dominio(sito)}
    </>
  );
  return link ? (
    <a className="sito mono" href={sito} target="_blank" rel="noreferrer">
      {contenuto}
    </a>
  ) : (
    <span className="sito mono">{contenuto}</span>
  );
}

/** Chi fornirà il servizio: si cerca per partita IVA o per nome, poi si sceglie dalla lista. */
export function CampoFornitore({ impresa, onImpresa }: Props) {
  const [testo, setTesto] = useState("");
  const [stato, setStato] = useState<
    | { fase: "pronto" }
    | { fase: "cerco" }
    | { fase: "trovate"; imprese: ImpresaTrovata[] }
    | { fase: "errore"; messaggio: string }
  >({ fase: "pronto" });

  async function cerca() {
    const q = testo.trim();
    if (q.length < 3) return setStato({ fase: "errore", messaggio: ERRORI["ricerca-troppo-corta"] });
    setStato({ fase: "cerco" });
    try {
      const r = await fetch(`/api/cerca-impresa?q=${encodeURIComponent(q)}`);
      const dati = await r.json();
      if (!r.ok) throw new Error(dati.errore);
      setStato({ fase: "trovate", imprese: dati.imprese });
    } catch (e) {
      const codice = e instanceof Error ? e.message : "";
      setStato({ fase: "errore", messaggio: ERRORI[codice] ?? "Ricerca non riuscita, riprova tra poco" });
    }
  }

  function scegli(i: ImpresaTrovata) {
    const { verificata: _v, ...scelta } = i;
    onImpresa(scelta);
    setTesto("");
    setStato({ fase: "pronto" });
  }

  if (impresa) {
    return (
      <div className="impresa">
        <BadgeCheck className="impresa-segno" size={16} strokeWidth={1.5} aria-hidden />
        <span className="impresa-testo">
          <span className="impresa-nome">{impresa.nome}</span>
          <span className="impresa-meta mono">
            {impresa.piva}
            {impresa.comune && ` · ${impresa.comune}${impresa.provincia ? ` (${impresa.provincia})` : ""}`}
          </span>
          <Sito sito={impresa.sito} link />
        </span>
        <button className="icona-bottone piccola" onClick={() => onImpresa(null)} aria-label="Cambia fornitore">
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>
    );
  }

  return (
    <div className="ricerca-impresa">
      <form
        className="cerca"
        onSubmit={(e) => {
          e.preventDefault();
          cerca();
        }}
      >
        <Search size={16} strokeWidth={1.5} aria-hidden />
        <input
          aria-label="Partita IVA o nome del fornitore"
          placeholder="Partita IVA o nome dell'azienda"
          value={testo}
          maxLength={100}
          onChange={(e) => setTesto(e.target.value)}
        />
        {stato.fase === "cerco" ? (
          <LoaderCircle className="gira" size={16} strokeWidth={1.5} aria-hidden />
        ) : (
          <button className="bottone secondario mini" type="submit">
            Cerca
          </button>
        )}
      </form>

      {stato.fase === "errore" && <span className="campo-nota errore">{stato.messaggio}</span>}
      {stato.fase === "trovate" &&
        (stato.imprese.length === 0 ? (
          <span className="campo-nota">Nessuna azienda trovata. Prova con la partita IVA</span>
        ) : (
          <ul className="risultati" aria-label="Aziende trovate">
            {stato.imprese.map((i) => (
              <li key={`${i.piva}-${i.nome}`}>
                <button className="risultato" onClick={() => scegli(i)}>
                  {i.verificata ? (
                    <BadgeCheck className="impresa-segno" size={16} strokeWidth={1.5} aria-label="Partita IVA verificata" />
                  ) : (
                    <CircleHelp className="muto" size={16} strokeWidth={1.5} aria-label="Partita IVA non verificata" />
                  )}
                  <span className="impresa-testo">
                    <span className="impresa-nome">{i.nome}</span>
                    <span className="impresa-meta mono">
                      {i.verificata ? i.piva : i.piva ? `${i.piva} non verificata` : "partita IVA non trovata"}
                      {i.comune && ` · ${i.comune}${i.provincia ? ` (${i.provincia})` : ""}`}
                    </span>
                    <Sito sito={i.sito} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
