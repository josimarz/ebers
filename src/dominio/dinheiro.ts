const FORMATO_PT_BR = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Interpreta um valor em reais digitado em pt-BR ("250", "250,5", "1.234,56")
 * e devolve o total em centavos — ou null se a entrada não for um valor.
 */
export function parsearReais(texto: string): number | null {
  const combinacao = texto
    .trim()
    .match(/^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/);
  if (!combinacao) return null;

  const reais = Number(combinacao[1].replace(/\./g, ""));
  const centavos = Number((combinacao[2] ?? "").padEnd(2, "0"));
  return reais * 100 + centavos;
}

/** Formata centavos como reais em pt-BR, sem o símbolo: 123456 → "1.234,56". */
export function formatarReais(centavos: number): string {
  return FORMATO_PT_BR.format(centavos / 100);
}
