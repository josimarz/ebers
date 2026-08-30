// Busca por nome nas listagens: o SQLite (NOCASE) não compara pt-BR
// ignorando acentos, então filtro e ordenação de nomes acontecem aqui.

/** Colação pt-BR que ignora acentos e caixa, para ordenar nomes. */
export const colacaoPtBr = new Intl.Collator("pt-BR", { sensitivity: "base" });

function normalizarParaBusca(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/**
 * Filtra os itens cujo nome contém a busca, ignorando acentos, caixa e
 * espaços nas pontas; busca vazia mantém todos.
 */
export function filtrarPorNome<T extends { nomeCompleto: string }>(
  itens: readonly T[],
  busca: string,
): T[] {
  const termo = normalizarParaBusca(busca.trim());
  return itens.filter(
    (item) =>
      termo === "" || normalizarParaBusca(item.nomeCompleto).includes(termo),
  );
}
