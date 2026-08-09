// Créditos do paciente (spec 3.2 e 3.3): saldo derivado do extrato, linhas
// prontas para exibição e validações de Venda e Ajuste, em funções puras —
// as gravações vivem em db/creditos.ts.

import type { TipoMovimentoCredito } from "./consulta";
import { compararIso, formatarDataHora } from "./data-hora";
import { formatarReais } from "./dinheiro";

/** Movimento do extrato, com a Consulta referenciada quando houver (spec 3.3). */
export interface MovimentoDoExtrato {
  id: number;
  tipo: TipoMovimentoCredito;
  quantidade: number;
  ocorridoEm: string;
  consultaIniciadaEm: string | null;
  valorUnitarioCentavos: number | null;
  motivo: string | null;
}

/** O saldo de Créditos é a soma das quantidades do extrato (spec 3.3). */
export function saldoDoExtrato(
  movimentos: readonly { quantidade: number }[],
): number {
  return movimentos.reduce((soma, movimento) => soma + movimento.quantidade, 0);
}

export interface LinhaDoExtrato {
  id: number;
  /** Data e hora locais do movimento: "08/08/2026 14:00". */
  dataHora: string;
  tipo: TipoMovimentoCredito;
  /** Quantidade com sinal explícito: "+3", "-1". */
  quantidade: string;
  /** Consulta referenciada, valor unitário da Venda ou motivo do Ajuste. */
  referencia: string;
}

/**
 * Linhas do extrato para o modal (spec 3.2): do mais recente ao mais antigo
 * (empate decidido pelo id, também decrescente), sem paginação.
 */
export function montarExtrato(
  movimentos: readonly MovimentoDoExtrato[],
): LinhaDoExtrato[] {
  return [...movimentos]
    .sort((a, b) => compararIso(b.ocorridoEm, a.ocorridoEm) || b.id - a.id)
    .map((movimento) => ({
      id: movimento.id,
      dataHora: formatarDataHora(movimento.ocorridoEm),
      tipo: movimento.tipo,
      quantidade:
        movimento.quantidade > 0
          ? `+${movimento.quantidade}`
          : String(movimento.quantidade),
      referencia: referenciaDoMovimento(movimento),
    }));
}

// A coluna "referência" da spec 3.3, por tipo: Venda mostra o valor unitário
// vigente (informativo), Consumo/Estorno a consulta, Ajuste o motivo.
function referenciaDoMovimento(movimento: MovimentoDoExtrato): string {
  switch (movimento.tipo) {
    case "Venda":
      return movimento.valorUnitarioCentavos === null
        ? "—"
        : `R$ ${formatarReais(movimento.valorUnitarioCentavos)} por crédito`;
    case "Consumo":
    case "Estorno":
      return movimento.consultaIniciadaEm === null
        ? "—"
        : `Consulta de ${formatarDataHora(movimento.consultaIniciadaEm)}`;
    case "Ajuste":
      return movimento.motivo ?? "—";
  }
}

/** Interpreta a quantidade digitada como inteiro (sinal opcional); senão, null. */
export function parsearQuantidade(texto: string): number | null {
  const aparado = texto.trim();
  return /^[+-]?\d+$/.test(aparado) ? Number(aparado) : null;
}

/** Venda válida (spec 3.2): quantidade inteira de pelo menos 1 crédito. */
export function vendaValida(quantidade: number | null): quantidade is number {
  return quantidade !== null && Number.isInteger(quantidade) && quantidade >= 1;
}

/** Total da Venda (spec 3.2): quantidade × Valor da consulta, em centavos. */
export function totalDaVenda(
  quantidade: number,
  valorConsultaCentavos: number,
): number {
  return quantidade * valorConsultaCentavos;
}

/**
 * Valida o Ajuste (spec 3.2): quantidade inteira não nula, motivo obrigatório
 * e o saldo resultante nunca negativo. Devolve a mensagem do primeiro
 * problema, ou null quando o ajuste é válido.
 */
export function erroDoAjuste(
  saldo: number,
  quantidade: number | null,
  motivo: string,
): string | null {
  if (
    quantidade === null ||
    quantidade === 0 ||
    !Number.isInteger(quantidade)
  ) {
    return "Informe uma quantidade inteira diferente de zero.";
  }
  if (motivo.trim() === "") {
    return "Informe o motivo do ajuste.";
  }
  if (saldo + quantidade < 0) {
    return "O ajuste deixaria o saldo negativo.";
  }
  return null;
}
