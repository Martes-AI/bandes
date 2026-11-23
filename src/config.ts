import type { Impresa } from "./lib/tipi";

// Chi pubblica l'app cambia solo questo file.
export const CONFIG = {
  nome: "Bandes",
  codice: "https://github.com/Martes-AI/bandes",
  autore: { nome: "Martes AI", url: "https://martes-ai.com" },
  /**
   * Invito mostrato sui bandi che pagano digitale, AI, software o formazione.
   * Mettilo a null per toglierlo.
   */
  invito: {
    testo: "Questo bando può pagare un progetto di AI o la formazione del tuo team. Martes AI può esserne il fornitore",
    azione: "Parliamone",
    url: "https://martes-ai.com",
  } as { testo: string; azione: string; url: string } | null,
  /**
   * Il fornitore già impostato nella valutazione con l'AI, che l'utente può cambiare.
   * Mettilo a null per partire senza fornitore.
   */
  fornitoreSuggerito: {
    impresa: {
      piva: "18331241002",
      nome: "Martes AI",
      comune: "Roma",
      provincia: "RM",
      regione: "Lazio",
      sito: "https://martes-ai.com",
    },
    cosa: "Progetti di AI su misura, automazione dei processi e formazione del team sull'AI",
  } as { impresa: Impresa; cosa: string } | null,
};
