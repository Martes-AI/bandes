import {
  DIMENSIONI,
  MAX_BANDI_DA_VALUTARE,
  MAX_DESCRIZIONE,
  type Bando,
  type Catalogo,
  type Profilo,
  type RichiestaValutazione,
} from "../src/lib/tipi";
import { SCHEMA, costruisciPrompt, pulisciEsiti } from "./valuta";

interface Env {
  ASSETS: Fetcher;
  LIMITE_AI?: RateLimit;
  OPENROUTER_API_KEY?: string;
  MODELLO: string;
}

const OPENROUTER = "https://openrouter.ai/api/v1/chat/completions";
const SOGGETTI = ["impresa", "startup", "professionista", "nonprofit", "da-costituire"];

let catalogo: Promise<Map<string, Bando>> | null = null;

function caricaCatalogo(env: Env, url: URL) {
  catalogo ??= env.ASSETS.fetch(new URL("/catalogo.json", url))
    .then((r) => {
      if (!r.ok) throw new Error(`catalogo.json: HTTP ${r.status}`);
      return r.json<Catalogo>();
    })
    .then((c) => new Map(c.bandi.map((b) => [b.id, b])))
    .catch((e) => {
      catalogo = null;
      throw e;
    });
  return catalogo;
}

const json = (dati: unknown, status = 200) =>
  new Response(JSON.stringify(dati), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const testoOppureNull = (v: unknown, max = 80) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/** Il corpo arriva dal browser: si ricostruisce campo per campo, niente passa così com'è. */
export function leggiRichiesta(corpo: unknown): RichiestaValutazione | null {
  if (!corpo || typeof corpo !== "object") return null;
  const c = corpo as Record<string, unknown>;
  const p = (c.profilo ?? {}) as Record<string, unknown>;
  const ids = Array.isArray(c.ids) ? [...new Set(c.ids.filter((x): x is string => typeof x === "string" && /^\d{1,10}$/.test(x)))] : [];
  if (ids.length === 0 || ids.length > MAX_BANDI_DA_VALUTARE) return null;
  const profilo: Profilo = {
    regione: testoOppureNull(p.regione),
    dimensione: DIMENSIONI.includes(p.dimensione as never) ? (p.dimensione as Profilo["dimensione"]) : null,
    soggetto: SOGGETTI.includes(p.soggetto as string) ? (p.soggetto as Profilo["soggetto"]) : null,
    settore: testoOppureNull(p.settore),
    obiettivi: [],
    soloFondoPerduto: false,
    cerca: "",
  };
  const descrizione = typeof c.descrizione === "string" ? c.descrizione.slice(0, MAX_DESCRIZIONE) : "";
  return { profilo, descrizione, ids };
}

async function impronta(testo: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(testo));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function valuta(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (!env.OPENROUTER_API_KEY) return json({ errore: "ai-non-configurata" }, 503);

  const ip = request.headers.get("cf-connecting-ip") ?? "sconosciuto";
  if (env.LIMITE_AI) {
    const { success } = await env.LIMITE_AI.limit({ key: ip });
    if (!success) return json({ errore: "troppe-richieste" }, 429);
  }

  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return json({ errore: "richiesta-non-valida" }, 400);
  }
  const richiesta = leggiRichiesta(corpo);
  if (!richiesta) return json({ errore: "richiesta-non-valida" }, 400);

  const url = new URL(request.url);
  const indice = await caricaCatalogo(env, url);
  const bandi = richiesta.ids.map((id) => indice.get(id)).filter((b): b is Bando => Boolean(b));
  if (bandi.length === 0) return json({ errore: "bandi-non-trovati" }, 400);

  const oggi = new Date().toISOString().slice(0, 10);
  const prompt = costruisciPrompt(richiesta.profilo, richiesta.descrizione, bandi, oggi);

  // Stessa domanda nello stesso giorno: stessa risposta, senza pagare due volte.
  const chiaveCache = new Request(`${url.origin}/__cache/valuta/${await impronta(`${env.MODELLO}\n${prompt}`)}`);
  const cache = caches.default;
  const inCache = await cache.match(chiaveCache);
  if (inCache) return inCache;

  let risposta: Response;
  try {
    risposta = await fetch(OPENROUTER, {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "content-type": "application/json",
        "x-title": "Bandolo",
      },
      body: JSON.stringify({
        model: env.MODELLO,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_schema", json_schema: { name: "esiti", strict: true, schema: SCHEMA } },
        provider: { require_parameters: true },
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch {
    return json({ errore: "ai-non-risponde" }, 502);
  }
  if (risposta.status === 402 || risposta.status === 403) return json({ errore: "credito-ai-esaurito" }, 503);
  if (!risposta.ok) return json({ errore: "ai-non-risponde" }, 502);

  let esiti;
  try {
    const dati = await risposta.json<{ choices?: { message?: { content?: string } }[] }>();
    esiti = pulisciEsiti(JSON.parse(dati.choices?.[0]?.message?.content ?? ""), bandi.map((b) => b.id));
  } catch {
    return json({ errore: "ai-risposta-non-valida" }, 502);
  }
  if (esiti.length === 0) return json({ errore: "ai-risposta-non-valida" }, 502);

  const finale = new Response(JSON.stringify({ esiti }), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=86400" },
  });
  ctx.waitUntil(cache.put(chiaveCache, finale.clone()));
  return finale;
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/stato" && request.method === "GET") {
      return json({ ai: Boolean(env.OPENROUTER_API_KEY), modello: env.MODELLO });
    }
    if (url.pathname === "/api/valuta" && request.method === "POST") {
      try {
        return await valuta(request, env, ctx);
      } catch (e) {
        console.error("valuta", e);
        return json({ errore: "errore-interno" }, 500);
      }
    }
    if (url.pathname.startsWith("/api/")) return json({ errore: "non-trovato" }, 404);
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
