// Controle financeiro (spec 3.1): contagens de consultas por paciente,
// Pendência financeira e ordenação pela maior diferença entre feitas e
// pagas, em funções puras sobre as listagens completas em memória.

import { colacaoPtBr } from "./busca";
import type { StatusConsulta } from "./consulta";

interface PacienteDeListagem {
  id: number;
  nomeCompleto: string;
}

interface ConsultaContada {
  pacienteId: number;
  status: StatusConsulta;
  pago: boolean;
}

export interface LinhaFinanceira<P extends PacienteDeListagem> {
  paciente: P;
  /** Consultas feitas = Finalizadas; Abertas e Canceladas ficam de fora. */
  feitas: number;
  /** Consultas pagas = Finalizadas com Pago. */
  pagas: number;
  /** Saldo de Créditos do paciente; sem movimento, zero. */
  creditos: number;
  /** Pendência financeira (pagas < feitas) — o destaque vermelho da tabela. */
  pendencia: boolean;
}

/**
 * Monta as linhas do Controle financeiro: uma por paciente (só a do
 * selecionado quando há filtro), com as contagens da spec 3.1, ordenadas da
 * maior diferença (feitas − pagas) para a menor — a maior Pendência
 * financeira no topo. Empates seguem por nome.
 */
export function montarLinhasFinanceiras<P extends PacienteDeListagem>(
  pacientes: readonly P[],
  consultas: readonly ConsultaContada[],
  saldos: ReadonlyMap<number, number>,
  pacienteId: number | null,
): LinhaFinanceira<P>[] {
  const listados = pacientes.filter(
    (paciente) => pacienteId === null || paciente.id === pacienteId,
  );
  const linhas = listados.map((paciente) => {
    const finalizadas = consultas.filter(
      (consulta) =>
        consulta.pacienteId === paciente.id && consulta.status === "Finalizada",
    );
    const feitas = finalizadas.length;
    const pagas = finalizadas.filter((consulta) => consulta.pago).length;

    return {
      paciente,
      feitas,
      pagas,
      creditos: saldos.get(paciente.id) ?? 0,
      pendencia: pagas < feitas,
    };
  });

  linhas.sort(
    (a, b) =>
      b.feitas - b.pagas - (a.feitas - a.pagas) ||
      colacaoPtBr.compare(a.paciente.nomeCompleto, b.paciente.nomeCompleto),
  );

  return linhas;
}
