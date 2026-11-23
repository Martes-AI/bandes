import type { Bando } from "../src/lib/tipi";

export const SPORTELLO_VALIDO_DAL: string;
export function aperto(r: Record<string, unknown>, oggi: string): boolean;
export function sezioni(descrizione: unknown): { cose: string; chi: string; cosa: string };
export function normalizza(r: Record<string, unknown>): Bando;
