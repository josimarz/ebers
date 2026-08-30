// Paginação em memória das listagens (specs 1.2 e 2.4): o volume de um
// consultório de uma única Terapeuta é pequeno, então cada página carrega a
// listagem completa e o recorte acontece aqui, em funções puras.

export const ITENS_POR_PAGINA = 10;

export interface Pagina<T> {
  itens: T[];
  /** Página efetivamente exibida, já trazida para dentro do intervalo. */
  pagina: number;
  totalPaginas: number;
}

/**
 * Recorta a listagem já filtrada e ordenada na página a exibir. A página
 * pedida é trazida para dentro do intervalo válido — um filtro que encolhe o
 * resultado nunca deixa a Terapeuta numa página inexistente.
 */
export function paginar<T>(itens: readonly T[], pagina: number): Pagina<T> {
  const totalPaginas = Math.max(1, Math.ceil(itens.length / ITENS_POR_PAGINA));
  const paginaExibida = Math.min(Math.max(pagina, 1), totalPaginas);
  const inicio = (paginaExibida - 1) * ITENS_POR_PAGINA;

  return {
    itens: itens.slice(inicio, inicio + ITENS_POR_PAGINA),
    pagina: paginaExibida,
    totalPaginas,
  };
}
