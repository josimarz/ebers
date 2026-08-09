// Datas/horas em ISO: comparação cronológica e exibição no fuso local — os
// registros guardam ISO completo em UTC; a Terapeuta lê no fuso do
// consultório.

/** Instantes (ou datas AAAA-MM-DD) em ISO comparam cronologicamente como texto. */
export function compararIso(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

const formatoData = new Intl.DateTimeFormat("pt-BR");

const formatoHora = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

/** Data local de um instante ISO como dd/mm/aaaa. */
export function formatarData(iso: string): string {
  return formatoData.format(new Date(iso));
}

/** Hora local de um instante ISO como HH:MM. */
export function formatarHora(iso: string): string {
  return formatoHora.format(new Date(iso));
}

/** Data e hora locais de um instante ISO: "dd/mm/aaaa HH:MM". */
export function formatarDataHora(iso: string): string {
  return `${formatarData(iso)} ${formatarHora(iso)}`;
}
