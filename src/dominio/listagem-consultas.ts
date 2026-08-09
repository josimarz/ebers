// Listagem de Consultas (spec 2.4): filtro por paciente, ordenação por data e
// paginação em memória, em funções puras (ver dominio/paginacao.ts).

import { compararIso } from "./data-hora";
import { type Pagina, paginar } from "./paginacao";

export interface ParametrosListagemConsultas {
  /** Paciente do filtro; null lista as consultas de todos. */
  pacienteId: number | null;
  /** Ordenação por data; o padrão da spec é "desc" (mais recente primeiro). */
  direcao: "asc" | "desc";
  pagina: number;
}

interface CamposDeListagem {
  pacienteId: number;
  iniciadoEm: string;
}

/**
 * Recorta a listagem completa de Consultas na página a exibir: filtra pelo
 * paciente selecionado, ordena pela data de início e pagina. Canceladas
 * passam como qualquer outra — a listagem não oculta nenhum status.
 */
export function montarPaginaDeConsultas<C extends CamposDeListagem>(
  consultas: readonly C[],
  { pacienteId, direcao, pagina }: ParametrosListagemConsultas,
): Pagina<C> {
  const sentido = direcao === "asc" ? 1 : -1;
  const filtradas = consultas.filter(
    (consulta) => pacienteId === null || consulta.pacienteId === pacienteId,
  );
  filtradas.sort((a, b) => sentido * compararIso(a.iniciadoEm, b.iniciadoEm));

  return paginar(filtradas, pagina);
}
