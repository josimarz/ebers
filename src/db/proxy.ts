export type MetodoProxy = "run" | "all" | "values" | "get";

export type LinhaSql = Record<string, unknown>;

/**
 * Converte o resultado do tauri-plugin-sql (linhas como objetos coluna→valor)
 * para o formato esperado pelo drizzle sqlite-proxy (arrays de valores na
 * ordem das colunas; "get" recebe uma única linha).
 *
 * Assume que a ordem das chaves do objeto é a ordem das colunas do SELECT —
 * vale para as queries do Drizzle (colunas explícitas, nomes não numéricos),
 * mas quebra com colunas duplicadas (joins sem alias) ou aliases numéricos.
 */
export function mapearResultadoProxy(
  metodo: MetodoProxy,
  linhas: LinhaSql[],
): { rows: unknown[] } {
  const valores = linhas.map((linha) => Object.values(linha));
  if (metodo === "get") {
    return { rows: valores[0] ?? [] };
  }
  return { rows: valores };
}
