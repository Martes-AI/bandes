// "always": in italiano Intl non mette il punto sotto 10.000 (scriverebbe 6095).
const intero = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0, useGrouping: "always" });
const giornoMese = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric" });
const lunga = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" });

/** € 80.000, € 1,5 mln, € 34 mln */
export function importo(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1_000_000) {
    const mln = v / 1_000_000;
    return `€ ${mln.toLocaleString("it-IT", { maximumFractionDigits: mln < 10 ? 1 : 0 })} mln`;
  }
  return `€ ${intero.format(v)}`;
}

export const numero = (v: number) => intero.format(v);

export function data(iso: string | null): string {
  if (!iso) return "—";
  return giornoMese.format(new Date(`${iso}T12:00:00`)).replace(".", "");
}

export function dataLunga(iso: string): string {
  return lunga.format(new Date(`${iso}T12:00:00`));
}

export function oggiIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "Valle d'Aosta/Vallée d'Aoste" → "Valle d'Aosta" */
export const regioneBreve = (r: string) => r.split("/")[0];
