import { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutGrid, SlidersHorizontal } from "lucide-react";
import { Barra } from "./components/Barra";
import { ChiediAi, type StatoAi } from "./components/ChiediAi";
import { Dettaglio } from "./components/Dettaglio";
import { Lista } from "./components/Lista";
import { Logo } from "./components/Logo";
import { Mappa } from "./components/Mappa";
import mappa from "./data/mappa.json";
import {
  FONDO_PERDUTO,
  OBIETTIVI,
  giorniAllaScadenza,
  ordina,
  passa,
  profiloVuoto,
  vaInRegione,
  type Ordine,
} from "./lib/filtri";
import { data, dataLunga, numero, oggiIso } from "./lib/formato";
import { MAX_BANDI_DA_VALUTARE, type Catalogo, type Profilo, type Valutazione } from "./lib/tipi";

const CHIAVE_PROFILO = "bandolo.profilo";
const PAGINA = 40;

function profiloSalvato(): Profilo {
  try {
    const salvato = JSON.parse(localStorage.getItem(CHIAVE_PROFILO) ?? "null");
    return salvato ? { ...profiloVuoto, ...salvato, cerca: "" } : profiloVuoto;
  } catch {
    return profiloVuoto;
  }
}

const MESSAGGI_ERRORE: Record<string, string> = {
  "troppe-richieste": "Troppe richieste in poco tempo. Riprova tra un minuto",
  "credito-ai-esaurito": "Il credito dell'AI di questa installazione è finito",
  "ai-non-configurata": "La valutazione con l'AI non è attiva",
};

export function App() {
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [erroreCatalogo, setErroreCatalogo] = useState(false);
  const [profilo, setProfilo] = useState<Profilo>(profiloSalvato);
  const [ordine, setOrdine] = useState<Ordine>("pertinenza");
  const [mostrati, setMostrati] = useState(PAGINA);
  const [aperto, setAperto] = useState<string | null>(null);
  const [filtriAperti, setFiltriAperti] = useState(false);
  const [aiDisponibile, setAiDisponibile] = useState<boolean | null>(null);
  const [descrizione, setDescrizione] = useState("");
  const [statoAi, setStatoAi] = useState<StatoAi>({ fase: "pronta" });
  const [valutazioni, setValutazioni] = useState<Record<string, Valutazione>>({});
  const oggi = oggiIso();

  useEffect(() => {
    fetch("/catalogo.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setCatalogo)
      .catch(() => setErroreCatalogo(true));
    fetch("/api/stato")
      .then((r) => r.json())
      .then((s: { ai: boolean }) => setAiDisponibile(s.ai))
      .catch(() => setAiDisponibile(false));
  }, []);

  useEffect(() => {
    try {
      const { cerca: _cerca, ...daSalvare } = profilo;
      localStorage.setItem(CHIAVE_PROFILO, JSON.stringify(daSalvare));
    } catch {
      // Senza localStorage il profilo vale solo per questa visita.
    }
  }, [profilo]);

  const cambia = useCallback((parte: Partial<Profilo>) => {
    setProfilo((p) => ({ ...p, ...parte }));
    setMostrati(PAGINA);
  }, []);

  const bandi = catalogo?.bandi ?? [];

  const filtrati = useMemo(() => bandi.filter((b) => passa(b, profilo)), [bandi, profilo]);

  const ordinati = useMemo(() => {
    const base = ordina(filtrati, profilo, ordine);
    if (ordine !== "pertinenza" || Object.keys(valutazioni).length === 0) return base;
    // Dopo la valutazione: prima quelli che fanno per te, poi da verificare, in fondo i no.
    const peso = (id: string) => ({ si: 0, forse: 1, no: 3 })[valutazioni[id]?.esito ?? "x"] ?? 2;
    return [...base].sort((a, b) => peso(a.id) - peso(b.id));
  }, [filtrati, profilo, ordine, valutazioni]);

  const regioni = mappa.regioni.slice().sort((a, b) => a.localeCompare(b, "it"));
  const settori = useMemo(
    () => [...new Set(bandi.flatMap((b) => b.settori))].sort((a, b) => a.localeCompare(b, "it")),
    [bandi],
  );

  const { conteggiRegioni, regionali } = useMemo(() => {
    const senzaRegione = bandi.filter((b) => passa(b, profilo, ["regione"]));
    const conteggi: Record<string, number> = {};
    const soloRegionali: Record<string, number> = {};
    for (const r of mappa.regioni) {
      conteggi[r] = senzaRegione.filter((b) => vaInRegione(b, r)).length;
      soloRegionali[r] = senzaRegione.filter((b) => !b.nazionale && b.regioni.includes(r)).length;
    }
    return { conteggiRegioni: conteggi, regionali: soloRegionali };
  }, [bandi, profilo]);

  const conteggiObiettivi = useMemo(() => {
    const base = bandi.filter((b) => passa(b, profilo, ["obiettivi"]));
    return Object.fromEntries(OBIETTIVI.map((o) => [o.chiave, base.filter(o.tocca).length]));
  }, [bandi, profilo]);

  const contoFondoPerduto = useMemo(
    () => bandi.filter((b) => passa(b, profilo, ["soloFondoPerduto"]) && b.forme.includes(FONDO_PERDUTO)).length,
    [bandi, profilo],
  );

  const inScadenza = filtrati
    .map((b) => ({ b, g: giorniAllaScadenza(b, oggi) }))
    .filter((x): x is { b: typeof x.b; g: number } => x.g !== null && x.g <= 30)
    .sort((a, b) => a.g - b.g);
  const fondoPerduto = filtrati.filter((b) => b.forme.includes(FONDO_PERDUTO)).length;

  const daValutare = ordina(filtrati, profilo, "pertinenza").slice(0, MAX_BANDI_DA_VALUTARE);

  async function valuta() {
    setStatoAi({ fase: "in-corso" });
    try {
      const risposta = await fetch("/api/valuta", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profilo, descrizione, ids: daValutare.map((b) => b.id) }),
      });
      const dati = await risposta.json();
      if (!risposta.ok) throw new Error(dati.errore);
      const esiti = dati.esiti as Valutazione[];
      setValutazioni((v) => ({ ...v, ...Object.fromEntries(esiti.map((e) => [e.id, e])) }));
      setStatoAi({ fase: "fatta", esiti });
      setOrdine("pertinenza");
    } catch (e) {
      const codice = e instanceof Error ? e.message : "";
      setStatoAi({ fase: "errore", messaggio: MESSAGGI_ERRORE[codice] ?? "L'AI non ha risposto. Riprova tra poco" });
    }
  }

  const bandoAperto = aperto ? (bandi.find((b) => b.id === aperto) ?? null) : null;
  const chiudiDettaglio = useCallback(() => setAperto(null), []);

  return (
    <div className="guscio">
      <Barra
        profilo={profilo}
        cambia={cambia}
        azzera={() => cambia(profiloVuoto)}
        regioni={regioni}
        settori={settori}
        conteggiObiettivi={conteggiObiettivi}
        contoFondoPerduto={contoFondoPerduto}
        aperta={filtriAperti}
        chiudi={() => setFiltriAperti(false)}
      />

      <main className="contenuto">
        <header className="testata">
          <span className="briciole">
            <span className="solo-mobile">
              <Logo />
            </span>
            <span className="solo-desktop briciola">
              <LayoutGrid size={16} strokeWidth={1.5} aria-hidden />
              Bandi aperti
            </span>
          </span>
          <span className="testata-destra">
            {catalogo && (
              <span className="muto mono piccolo solo-desktop">Dati del {data(catalogo.aggiornato)}</span>
            )}
            <button className="bottone secondario solo-mobile" onClick={() => setFiltriAperti(true)}>
              <SlidersHorizontal size={16} strokeWidth={1.5} aria-hidden />
              Filtri
            </button>
          </span>
        </header>

        {erroreCatalogo && <p className="scheda vuoto">Non riesco a caricare i bandi. Ricarica la pagina.</p>}

        {catalogo && (
          <div className="pagina">
            <h1 className="titolo-pagina">
              {numero(filtrati.length)} bandi{" "}
              <span className="muto">{filtrati.length < bandi.length ? "per te" : "aperti oggi"}</span>
            </h1>
            <p className="sottotitolo secondario">
              Dal catalogo pubblico di Incentivi Italia, aggiornato il {dataLunga(catalogo.aggiornato)}. Scegli regione,
              dimensione e cosa vuoi finanziare: la lista si stringe sui bandi che puoi chiedere.
            </p>

            <div className="griglia-alta">
              <section className="scheda scheda-mappa" aria-label="Bandi per regione">
                <header className="scheda-testa">
                  <span>Dove sono i bandi</span>
                  <span className="muto mono piccolo">Tocca una regione</span>
                </header>
                <Mappa
                  conteggi={conteggiRegioni}
                  regionali={regionali}
                  selezionata={profilo.regione}
                  onScegli={(regione) => cambia({ regione })}
                />
              </section>

              <div className="numeri">
                <section className="scheda numero">
                  <span className="numero-etichetta">{filtrati.length < bandi.length ? "Bandi per te" : "Bandi aperti"}</span>
                  <span className="numero-cifra">{numero(filtrati.length)}</span>
                  <span className="numero-nota mono">
                    {filtrati.length < bandi.length
                      ? `su ${numero(bandi.length)} aperti oggi`
                      : `su ${numero(catalogo.totaleCatalogo)} nel catalogo`}
                  </span>
                </section>
                <section className="scheda numero">
                  <span className="numero-etichetta">Scadono entro 30 giorni</span>
                  <span className="numero-cifra">{numero(inScadenza.length)}</span>
                  <span className="numero-nota mono">
                    {inScadenza[0]
                      ? inScadenza[0].g === 0
                        ? "il primo scade oggi"
                        : `il primo il ${data(inScadenza[0].b.chiusura)}`
                      : "nessuno a breve"}
                  </span>
                </section>
                <section className="scheda numero">
                  <span className="numero-etichetta">A fondo perduto</span>
                  <span className="numero-cifra">{numero(fondoPerduto)}</span>
                  <span className="numero-nota mono">
                    {filtrati.length ? Math.round((fondoPerduto / filtrati.length) * 100) : 0}% {filtrati.length < bandi.length ? "di quelli per te" : "del totale"}
                  </span>
                </section>
              </div>
            </div>

            <ChiediAi
              disponibile={aiDisponibile}
              descrizione={descrizione}
              cambiaDescrizione={setDescrizione}
              stato={statoAi}
              quanti={daValutare.length}
              valuta={valuta}
            />

            <Lista
              bandi={ordinati.slice(0, mostrati)}
              totale={ordinati.length}
              mostrati={mostrati}
              altri={() => setMostrati((m) => m + PAGINA)}
              ordine={ordine}
              cambiaOrdine={setOrdine}
              valutazioni={valutazioni}
              regione={profilo.regione}
              oggi={oggi}
              apri={setAperto}
            />
          </div>
        )}
      </main>

      <Dettaglio
        bando={bandoAperto}
        valutazione={aperto ? valutazioni[aperto] : undefined}
        oggi={oggi}
        chiudi={chiudiDettaglio}
      />
    </div>
  );
}
