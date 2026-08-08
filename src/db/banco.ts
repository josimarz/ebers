import { drizzle } from "drizzle-orm/sqlite-proxy";
import { type ExecutorSql, executorTauri } from "./executor";
import { mapearResultadoProxy } from "./proxy";
import * as schema from "./schema";

export function criarBanco(obterExecutor: () => Promise<ExecutorSql>) {
  return drizzle(
    async (sql, params, method) => {
      const executor = await obterExecutor();
      if (method === "run") {
        await executor.execute(sql, params);
        return { rows: [] };
      }
      const linhas = await executor.select(sql, params);
      return mapearResultadoProxy(method, linhas);
    },
    { schema },
  );
}

/** Cliente Drizzle do app: consultas SQL executadas pelo backend Rust. */
export const banco = criarBanco(executorTauri);
