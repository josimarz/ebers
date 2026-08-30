// Listagem de Pacientes (spec 1.2): busca, ordenação e paginação em memória,
// em funções puras (ver dominio/paginacao.ts e dominio/busca.ts).

import { colacaoPtBr, filtrarPorNome } from "./busca";
import { compararIso } from "./data-hora";
import { type Pagina, paginar } from "./paginacao";

export interface OrdenacaoPacientes {
  coluna: "nome" | "idade";
  direcao: "asc" | "desc";
}

export interface ParametrosListagem {
  busca: string;
  ordenacao: OrdenacaoPacientes;
  pagina: number;
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
 * busca (ignorando acentos e caixa), ordena e pagina.
 */
export function montarPaginaDePacientes<P extends CamposDeListagem>(
  pacientes: readonly P[],
  { busca, ordenacao, pagina }: ParametrosListagem,
): Pagina<P> {
  const filtrados = filtrarPorNome(pacientes, busca);
  filtrados.sort(comparador(ordenacao));

  return paginar(filtrados, pagina);
}
