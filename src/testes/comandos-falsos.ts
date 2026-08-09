// Dublê do @tauri-apps/api/core com respostas programáveis, para vi.mock:
//   vi.mock("@tauri-apps/api/core", () => import("@/testes/comandos-falsos"));
// Grava todo invoke e devolve a próxima resposta enfileirada para o comando;
// um comando sem resposta programada falha, para manter os testes explícitos.
// Reiniciar em beforeEach.

export interface ChamadaDeComando {
  comando: string;
  argumentos: unknown;
}

/** Invokes executados, na ordem, desde o último reinício. */
export const chamadasDeComando: ChamadaDeComando[] = [];

type Resposta =
  | { tipo: "ok"; valor: unknown }
  | { tipo: "erro"; erro: unknown };

const filas = new Map<string, Resposta[]>();

export function reiniciarComandosFalsos(): void {
  chamadasDeComando.length = 0;
  filas.clear();
}

function enfileirar(comando: string, resposta: Resposta): void {
  const fila = filas.get(comando) ?? [];
  fila.push(resposta);
  filas.set(comando, fila);
}

/** Programa o valor que o próximo invoke do comando devolverá. */
export function programarComando(comando: string, valor: unknown): void {
  enfileirar(comando, { tipo: "ok", valor });
}

/** Programa a falha que o próximo invoke do comando lançará. */
export function programarErroDeComando(comando: string, erro: unknown): void {
  enfileirar(comando, { tipo: "erro", erro });
}

export async function invoke(
  comando: string,
  argumentos?: unknown,
): Promise<unknown> {
  chamadasDeComando.push({ comando, argumentos });
  const resposta = filas.get(comando)?.shift();
  if (resposta === undefined) {
    throw new Error(`Sem resposta programada para o comando ${comando}`);
  }
  if (resposta.tipo === "erro") throw resposta.erro;
  return resposta.valor;
}
