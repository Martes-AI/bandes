# Bandolo

Tutti i bandi aperti per le imprese italiane, in una pagina.
Scegli regione, dimensione e cosa vuoi finanziare: la lista si stringe sui bandi che puoi chiedere.
Se vuoi, l'AI legge i primi 20 e ti dice quali fanno davvero per te, con una frase sul perché e una sulla cosa da controllare.

È gratuito e open source: puoi usarlo, modificarlo e pubblicarlo sul tuo account Cloudflare in pochi minuti.

Fatto da [Martes AI](https://martes-ai.com).

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Martes-AI/bandolo)

## Cosa fa

- **Catalogo completo.** Ogni giorno scarica l'open data di [Incentivi Italia](https://www.incentivitalia.gov.it/open-data) (il portale del MIMIT con i bandi di ministeri, regioni e Camere di Commercio) e tiene solo i bandi aperti.
- **Filtri immediati.** Regione, dimensione, tipo di impresa, settore, cosa vuoi finanziare, solo fondo perduto. Tutto gira nel browser, senza server.
- **Mappa d'Italia.** Ogni regione si accende in base a quanti bandi regionali ha. Si tocca una regione per filtrare.
- **Valutazione con l'AI (facoltativa).** Racconti in due righe cosa fa la tua azienda. Il modello legge i primi 20 bandi e per ognuno dice "fa per te", "da verificare" o "non fa per te".
- **Scheda di ogni bando.** Cos'è, a chi si rivolge, cosa prevede, importi, scadenza, link al bando ufficiale.

## Come è fatto

```
public/catalogo.json     i bandi aperti, rigenerato ogni giorno (circa 330 KB compressi)
src/                     l'app React: filtri, mappa, lista, scheda
src/lib/filtri.ts        le regole dei filtri e dell'ordinamento
src/data/mappa.json      l'Italia a puntini (generata una volta da scripts/mappa.mjs)
worker/                  il Cloudflare Worker: serve l'app e l'endpoint /api/valuta
scripts/catalogo.mjs     scarica e riduce l'open data di Incentivi Italia
.github/workflows/       aggiornamento giornaliero del catalogo
```

Il filtro è in due passi.
Prima le regole sui campi del catalogo (regione, dimensione, settore, spese ammesse), istantanee e gratis.
Poi, solo se lo chiedi, un modello linguistico legge il testo dei primi 20 bandi.
Senza chiave AI l'app funziona lo stesso, con i soli filtri.

## Provarlo sul tuo computer

Serve Node.js 20 o più recente.

```bash
git clone https://github.com/Martes-AI/bandolo
cd bandolo
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
L'AI la paga chi pubblica l'app: con il modello predefinito (`deepseek/deepseek-v4.1-flash`) una valutazione di 20 bandi costa circa un centesimo.
Ogni indirizzo IP può chiedere al massimo 5 valutazioni al minuto, e le domande uguali nello stesso giorno escono dalla cache senza pagare.
Metti comunque un tetto di spesa alla chiave su OpenRouter.
Il modello si cambia nella variabile `MODELLO` di `wrangler.jsonc`.

### Aggiornamento automatico del catalogo

Il workflow `.github/workflows/catalogo.yml` gira ogni mattina: scarica il catalogo, e se è cambiato lo salva nella repo e ripubblica l'app.
Per la pubblicazione servono due secret nella repo GitHub (Settings → Secrets and variables → Actions):

- `CLOUDFLARE_API_TOKEN`: un token con il permesso "Edit Cloudflare Workers"
- `CLOUDFLARE_ACCOUNT_ID`: l'ID del tuo account Cloudflare

Se hai collegato la repo a Cloudflare con il pulsante, i secret non servono: Cloudflare ripubblica da solo a ogni commit.

## Personalizzarlo

Nome, link al codice, autore e invito finale stanno in `src/config.ts`.
Le voci di "Cosa vuoi finanziare" sono in `src/lib/filtri.ts`: ognuna è una regola sui campi del catalogo.

## Limiti da sapere

- I dati sono quelli del catalogo pubblico, che a volte è in ritardo o incompleto: un bando chiuso può risultare ancora aperto per qualche giorno, e alcuni bandi delle Camere di Commercio mancano.
- I bandi "a sportello" senza data di chiusura aperti prima del 2025 vengono esclusi, perché quasi sempre i fondi sono finiti.
- L'AI legge solo la scheda del catalogo, non il PDF del bando. Il suo giudizio è un primo filtro, non un parere: requisiti e scadenze vanno sempre controllati sul bando ufficiale.

## Crediti e licenze

- Codice: licenza [MIT](LICENSE), © Martes AI.
- Dati dei bandi: [Incentivi Italia](https://www.incentivitalia.gov.it), licenza [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Confini delle regioni: [openpolis/geojson-italy](https://github.com/openpolis/geojson-italy) su dati ISTAT, licenza CC BY 4.0.
- Interfaccia disegnata con il metodo [unslop](https://github.com/heydamir/unslop) di Damir Sokolovsky ([@heydamir](https://x.com/heydamir)), licenza CC BY 4.0.
