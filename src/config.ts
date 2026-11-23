// Chi pubblica l'app cambia solo questo file.
export const CONFIG = {
  nome: "Bandolo",
  codice: "https://github.com/Martes-AI/bandolo",
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
};
