// Dublê do fetch com respostas programáveis, para vi.stubGlobal:
//   vi.stubGlobal("fetch", fetchFalso);
// Grava toda requisição e devolve a próxima resposta enfileirada; uma
// requisição sem resposta programada falha, para manter os testes explícitos.
// Reiniciar em beforeEach.

export interface RequisicaoHttp {
  url: string;
  metodo: string;
  corpo: BodyInit | null;
}

/** Requisições feitas, na ordem, desde o último reinício. */
export const requisicoesHttp: RequisicaoHttp[] = [];

interface RespostaProgramada {
  status: number;
  corpo?: unknown;
}

const fila: RespostaProgramada[] = [];

export function reiniciarFetchFalso(): void {
  requisicoesHttp.length = 0;
  fila.length = 0;
}

/** Programa o status (e corpo JSON) que a próxima requisição receberá. */
export function programarResposta(status: number, corpo?: unknown): void {
  fila.push({ status, corpo });
}

export const fetchFalso: typeof fetch = async (recurso, opcoes) => {
  requisicoesHttp.push({
    url: String(recurso),
    metodo: opcoes?.method ?? "GET",
    corpo: opcoes?.body ?? null,
  });
  const resposta = fila.shift();
  if (resposta === undefined) {
    throw new Error(`Sem resposta programada para ${String(recurso)}`);
  }
  return new Response(
    resposta.corpo === undefined ? null : JSON.stringify(resposta.corpo),
    { status: resposta.status },
  );
};
