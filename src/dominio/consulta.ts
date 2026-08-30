/** Status da Consulta (spec 2.1) — valores exatos exibidos na UI. */
export const STATUS_CONSULTA = ["Aberta", "Finalizada", "Cancelada"] as const;

export type StatusConsulta = (typeof STATUS_CONSULTA)[number];

/** Como uma Consulta paga foi paga (spec 2.1). */
export const ORIGENS_PAGAMENTO = ["Crédito", "Direto"] as const;

export type OrigemPagamento = (typeof ORIGENS_PAGAMENTO)[number];

/** Tipos de Movimento de crédito do extrato (spec 3.3). */
export const TIPOS_MOVIMENTO_CREDITO = [
  "Venda",
  "Consumo",
  "Estorno",
  "Ajuste",
] as const;

export type TipoMovimentoCredito = (typeof TIPOS_MOVIMENTO_CREDITO)[number];

export interface PagamentoDaConsulta {
  pago: boolean;
  pagoEm: string | null;
  origemPagamento: OrigemPagamento | null;
}

/**
 * O pagamento de uma Consulta não paga (spec 2.1) — também o que sobra depois
 * de "Desfazer Pagamento" e em toda Cancelada, que nunca conta como paga
 * (spec 2.3).
 */
export const SEM_PAGAMENTO: PagamentoDaConsulta = {
  pago: false,
  pagoEm: null,
  origemPagamento: null,
};

/**
 * Regra de crédito na criação da Consulta (spec 2.2): com saldo, ela já nasce
 * paga por Crédito; sem saldo, nasce não paga. O débito do Movimento Consumo
 * acompanha o caso pago — crédito nunca quita Consultas passadas (spec 3.3).
 */
export function pagamentoNaCriacao(
  saldo: number,
  agora: string,
): PagamentoDaConsulta {
  if (saldo > 0) {
    return { pago: true, pagoEm: agora, origemPagamento: "Crédito" };
  }
  return SEM_PAGAMENTO;
}

export interface AcoesDaConsulta {
  camposEditaveis: boolean;
  /** Transcrição de voz no Conteúdo — só na Consulta Aberta. */
  microfone: boolean;
  finalizar: boolean;
  efetuarPagamento: boolean;
  desfazerPagamento: boolean;
  cancelar: boolean;
}

/**
 * A tabela de editabilidade e ações por status (spec 2.3), como uma linha por
 * estado da Consulta: Aberta e Finalizada seguem editáveis; Cancelada é
 * somente leitura. Efetuar Pagamento pede não paga; Desfazer pede Origem
 * "Direto" (Crédito só é devolvido via cancelamento); Cancelar pede Aberta
 * não paga ou paga por Crédito — paga com Origem "Direto" exige desfazer o
 * pagamento antes.
 */
export function acoesDaConsulta(consulta: {
  status: StatusConsulta;
  pago: boolean;
  origemPagamento: OrigemPagamento | null;
}): AcoesDaConsulta {
  const { status, pago, origemPagamento } = consulta;
  const abertaOuFinalizada = status === "Aberta" || status === "Finalizada";
  return {
    camposEditaveis: status !== "Cancelada",
    microfone: status === "Aberta",
    finalizar: status === "Aberta",
    efetuarPagamento: abertaOuFinalizada && !pago,
    desfazerPagamento:
      abertaOuFinalizada && pago && origemPagamento === "Direto",
    cancelar: status === "Aberta" && (!pago || origemPagamento === "Crédito"),
  };
}

/** Duração fixa da Consulta no v1 (spec 2.3) — não configurável. */
export const DURACAO_CONSULTA_MS = 60 * 60 * 1000;

const MINUTOS_EM_VERDE_MS = 15 * 60 * 1000;
const MINUTOS_EM_AMARELO_MS = 5 * 60 * 1000;

export interface TimerDaConsulta {
  /** Restante em MM:SS; excedido vira "+MM:SS" contando para cima. */
  texto: string;
  cor: "verde" | "amarela" | "vermelha";
}

/**
 * Estado do timer da Consulta (spec 2.3): contagem regressiva de 1 hora a
 * partir de "Iniciado em"; verde acima de 15 min restantes, amarela até 15,
 * vermelha nos 5 finais. Zerado, conta o excedido em vermelho — sem nenhuma
 * ação automática.
 */
export function timerDaConsulta(
  iniciadoEm: string,
  agoraMs: number,
): TimerDaConsulta {
  const restanteMs = DURACAO_CONSULTA_MS - (agoraMs - Date.parse(iniciadoEm));
  const excedido = restanteMs < 0;
  const cor =
    restanteMs > MINUTOS_EM_VERDE_MS
      ? "verde"
      : restanteMs > MINUTOS_EM_AMARELO_MS
        ? "amarela"
        : "vermelha";

  const totalSegundos = Math.floor(Math.abs(restanteMs) / 1000);
  const minutos = String(Math.floor(totalSegundos / 60)).padStart(2, "0");
  const segundos = String(totalSegundos % 60).padStart(2, "0");

  return {
    texto: `${excedido ? "+" : ""}${minutos}:${segundos}`,
    cor,
  };
}
