# Bandes

Tutti i bandi aperti per le imprese italiane, in una pagina.
Scegli regione, dimensione e cosa vuoi finanziare: la lista si stringe sui bandi che puoi chiedere.
Se vuoi, l'AI legge i primi 20 e ti dice quali fanno davvero per te, con una frase sul perché, una sulla cosa da controllare e una sul fornitore a cui vuoi affidare il lavoro.

È gratuito e open source: puoi usarlo, modificarlo e pubblicarlo sul tuo account Cloudflare in pochi minuti.

Fatto da [Martes AI](https://martes-ai.com).

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Martes-AI/bandes)

## Cosa fa

- **Catalogo completo.** Ogni notte il Worker scarica l'open data di [Incentivi Italia](https://www.incentivitalia.gov.it/open-data) (il portale del MIMIT con i bandi di ministeri, regioni e Camere di Commercio) e tiene solo i bandi aperti.
- **Filtri immediati.** Regione, dimensione, tipo di impresa, settore, cosa vuoi finanziare, solo fondo perduto. Tutto gira nel browser, senza server.
- **Mappa d'Italia.** Ogni regione si accende in base a quanti bandi regionali ha. Si tocca una regione per filtrare.
- **Partita IVA.** Scrivi la tua partita IVA: Bandes la verifica sul registro europeo [VIES](https://ec.europa.eu/taxation_customs/vies/), trova ragione sociale e sede e imposta da solo la regione.
- **Il fornitore.** Indica a chi vuoi affidare il lavoro, per partita IVA o per nome: Bandes cerca l'azienda sul web, verifica la partita IVA su VIES e ti mostra sede e sito da scegliere. L'AI controlla le regole del bando su chi può fare da fornitore (elenchi, accreditamenti, legami con l'impresa).
- **Valutazione con l'AI (facoltativa).** Racconti in due righe cosa fa la tua azienda. Il modello legge i primi 20 bandi e per ognuno dice "fa per te", "da verificare" o "non fa per te".
- **Scheda di ogni bando.** Cos'è, a chi si rivolge, cosa prevede, importi, scadenza, link al bando ufficiale.

## Come è fatto

```
public/catalogo.json     i bandi aperti al momento del deploy (circa 330 KB compressi)
src/                     l'app React: filtri, mappa, lista, scheda
src/lib/filtri.ts        le regole dei filtri e dell'ordinamento
src/data/mappa.json      l'Italia a puntini (generata una volta da scripts/mappa.mjs)
worker/                  il Cloudflare Worker: app, API e aggiornamento notturno del catalogo
worker/catalogo.ts       legge a flusso i 28 MB di Incentivi Italia e salva i bandi aperti in KV
src/lib/piva.ts          controllo della partita IVA e sede dal registro VIES
scripts/catalogo.mjs     lo stesso aggiornamento dal tuo computer, per il catalogo incluso nel deploy
```

Le API del Worker:

| Endpoint | Cosa fa |
|---|---|
| `GET /api/catalogo` | il catalogo più recente tra quello in KV e quello incluso nel deploy |
| `GET /api/impresa?piva=` | ragione sociale e sede dal registro VIES |
| `GET /api/cerca-impresa?q=` | cerca un'azienda per nome o partita IVA (ricerca web + verifica VIES) |
| `POST /api/valuta` | il giudizio dell'AI sui primi 20 bandi |

Il filtro è in due passi.
Prima le regole sui campi del catalogo (regione, dimensione, settore, spese ammesse), istantanee e gratis.
Poi, solo se lo chiedi, un modello linguistico legge il testo dei primi 20 bandi.
Senza chiave AI l'app funziona lo stesso, con i soli filtri e la ricerca per partita IVA.

## Provarlo sul tuo computer

Serve Node.js 20 o più recente.

```bash
git clone https://github.com/Martes-AI/bandes
cd bandes
npm install
npm run catalogo   # scarica i bandi aperti di oggi
npm run dev        # apre l'app su http://localhost:5173
```

Per la valutazione con l'AI copia `.dev.vars.example` in `.dev.vars` e mettici la tua chiave [OpenRouter](https://openrouter.ai/keys).

## Pubblicarlo su Cloudflare

Con il pulsante "Deploy to Cloudflare" qui sopra, oppure a mano:

```bash
npx wrangler login
npm run deploy
npx wrangler secret put OPENROUTER_API_KEY   # facoltativo, per l'AI
```

Il piano gratuito di Cloudflare Workers basta.
L'AI la paga chi pubblica l'app: con il modello predefinito (`deepseek/deepseek-v4.1-flash`) una valutazione di 20 bandi costa circa un centesimo, una ricerca del fornitore per nome meno di un centesimo.
Ogni indirizzo IP può chiedere al massimo 5 valutazioni e 20 ricerche al minuto, e le domande uguali escono dalla cache senza pagare.
Metti comunque un tetto di spesa alla chiave su OpenRouter.
Il modello si cambia nella variabile `MODELLO` di `wrangler.jsonc`.

### Aggiornamento del catalogo

Ogni giorno alle 5:15 UTC il cron del Worker scarica il catalogo di Incentivi Italia e lo salva nel KV `CATALOGO`, che wrangler crea da solo al primo deploy.
Se il download fallisce resta il catalogo del giorno prima, e se il KV è vuoto l'app usa quello incluso nel deploy.

Il portale di Incentivi Italia non risponde ai server di GitHub Actions (negli Stati Uniti), per questo l'aggiornamento gira su Cloudflare.
Leggere 28 MB a flusso chiede qualche secondo di CPU: sul piano gratuito di Workers il cron può fermarsi per il limite di CPU.
In quel caso aggiorna il catalogo dal tuo computer e ripubblica:

```bash
npm run catalogo && npm run deploy
```

### Renderlo privato

Se pubblichi l'app solo per il tuo team, proteggi l'indirizzo con [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/self-hosted-apps/): chi non è autorizzato non vede la pagina e non consuma la tua chiave AI.
La demo di Martes AI è protetta così.

## Personalizzarlo

Nome, link al codice, autore, invito finale e fornitore preimpostato stanno in `src/config.ts`.
Le voci di "Cosa vuoi finanziare" sono in `src/lib/filtri.ts`: ognuna è una regola sui campi del catalogo.

## Limiti da sapere

- I dati sono quelli del catalogo pubblico, che a volte è in ritardo o incompleto: un bando chiuso può risultare ancora aperto per qualche giorno, e alcuni bandi delle Camere di Commercio mancano.
- I bandi "a sportello" senza data di chiusura aperti prima del 2025 vengono esclusi, perché quasi sempre i fondi sono finiti.
- La ricerca del fornitore per nome passa dal web: i risultati con la spunta hanno la partita IVA verificata su VIES, gli altri no.
- L'AI legge solo la scheda del catalogo, non il PDF del bando. Il suo giudizio è un primo filtro, non un parere: requisiti e scadenze vanno sempre controllati sul bando ufficiale.

## Crediti e licenze

- Codice: licenza [MIT](LICENSE), © Martes AI.
- Registro delle partite IVA: [VIES](https://ec.europa.eu/taxation_customs/vies/) della Commissione europea.
- Dati dei bandi: [Incentivi Italia](https://www.incentivitalia.gov.it), licenza [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Confini delle regioni: [openpolis/geojson-italy](https://github.com/openpolis/geojson-italy) su dati ISTAT, licenza CC BY 4.0.
- Interfaccia disegnata con il metodo [unslop](https://github.com/heydamir/unslop) di Damir Sokolovsky ([@heydamir](https://x.com/heydamir)), licenza CC BY 4.0.
