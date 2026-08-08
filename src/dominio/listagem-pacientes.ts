// Listagem de Pacientes (spec 1.2): busca, ordenação e paginação em memória.
// O SQLite (NOCASE) não compara pt-BR ignorando acentos, e o volume de um
// consultório de uma única Terapeuta é pequeno — a página carrega todos os
// Pacientes e o recorte acontece aqui, em funções puras.

export const PACIENTES_POR_PAGINA = 10;

export interface OrdenacaoPacientes {
  coluna: "nome" | "idade";
  direcao: "asc" | "desc";
}

export interface ParametrosListagem {
  busca: string;
  ordenacao: OrdenacaoPacientes;
  pagina: number;
}

export interface PaginaDePacientes<P> {
  itens: P[];
  /** Página efetivamente exibida, já trazida para dentro do intervalo. */
  pagina: number;
  totalPaginas: number;
}

interface CamposDeListagem {
  nomeCompleto: string;
  dataNascimento: string;
}

/** Clique num cabeçalho: outra coluna começa crescente; a mesma inverte. */
export function alternarOrdenacao(
  atual: OrdenacaoPacientes,
  coluna: OrdenacaoPacientes["coluna"],
): OrdenacaoPacientes {
  if (atual.coluna !== coluna) return { coluna, direcao: "asc" };
  return { coluna, direcao: atual.direcao === "asc" ? "desc" : "asc" };
}

const colacaoPtBr = new Intl.Collator("pt-BR", { sensitivity: "base" });

function normalizarParaBusca(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** Datas em ISO (AAAA-MM-DD) comparam cronologicamente como texto. */
function compararIso(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function comparador(ordenacao: OrdenacaoPacientes) {
  const sentido = ordenacao.direcao === "asc" ? 1 : -1;
  return (a: CamposDeListagem, b: CamposDeListagem): number => {
    if (ordenacao.coluna === "idade") {
      // Idade crescente = nascimento decrescente (o mais novo nasceu depois);
      // empate de nascimento é desempatado pelo nome, sempre crescente.
      const porNascimento = compararIso(b.dataNascimento, a.dataNascimento);
      if (porNascimento !== 0) return sentido * porNascimento;
      return colacaoPtBr.compare(a.nomeCompleto, b.nomeCompleto);
    }
    return sentido * colacaoPtBr.compare(a.nomeCompleto, b.nomeCompleto);
  };
}

/**
 * Recorta a listagem completa de Pacientes na página a exibir: filtra pela
 * busca (ignorando acentos e caixa), ordena e pagina. A página pedida é
 * trazida para dentro do intervalo válido — uma busca que encolhe o
 * resultado nunca deixa a Terapeuta numa página inexistente.
 */
export function montarPaginaDePacientes<P extends CamposDeListagem>(
  pacientes: readonly P[],
  { busca, ordenacao, pagina }: ParametrosListagem,
): PaginaDePacientes<P> {
  const termo = normalizarParaBusca(busca.trim());
  const filtrados = pacientes.filter(
    (paciente) =>
      termo === "" ||
      normalizarParaBusca(paciente.nomeCompleto).includes(termo),
  );
  filtrados.sort(comparador(ordenacao));

  const totalPaginas = Math.max(
    1,
    Math.ceil(filtrados.length / PACIENTES_POR_PAGINA),
  );
  const paginaExibida = Math.min(Math.max(pagina, 1), totalPaginas);
  const inicio = (paginaExibida - 1) * PACIENTES_POR_PAGINA;

  return {
    itens: filtrados.slice(inicio, inicio + PACIENTES_POR_PAGINA),
    pagina: paginaExibida,
    totalPaginas,
  };
}
