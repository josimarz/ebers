import type { LinhaSql } from "@/db/proxy";
import type { MovimentoDoExtrato } from "@/dominio/creditos";

/** Movimento de Venda de 1 crédito, pronto para ajustes por teste. */
export function movimentoDoExtrato(
  ajustes: Partial<MovimentoDoExtrato> = {},
): MovimentoDoExtrato {
  return {
    id: 1,
    tipo: "Venda",
    quantidade: 1,
    ocorridoEm: "2026-08-08T14:00:00.000Z",
    consultaIniciadaEm: null,
    valorUnitarioCentavos: 25000,
    motivo: null,
    ...ajustes,
  };
}

/**
 * Converte um movimento na linha que o SQLite devolveria pelo select de
 * listarMovimentos: chaves são as colunas do select, na mesma ordem (a ordem
 * que o mapeamento posicional do sqlite-proxy pressupõe).
 */
export function linhaDeMovimento(movimento: MovimentoDoExtrato): LinhaSql {
  return {
    id: movimento.id,
    tipo: movimento.tipo,
    quantidade: movimento.quantidade,
    ocorrido_em: movimento.ocorridoEm,
    iniciado_em: movimento.consultaIniciadaEm,
    valor_unitario_centavos: movimento.valorUnitarioCentavos,
    motivo: movimento.motivo,
  };
}
