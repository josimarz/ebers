import Database from "@tauri-apps/plugin-sql";
import type { LinhaSql } from "./proxy";

// Mesmo banco declarado nas migrações do backend (src-tauri/src/lib.rs).
export const URL_BANCO = "sqlite:ebers.db";

/** Fronteira com o tauri-plugin-sql: o que o cliente Drizzle precisa executar. */
export interface ExecutorSql {
  select(sql: string, valores?: unknown[]): Promise<LinhaSql[]>;
  execute(sql: string, valores?: unknown[]): Promise<unknown>;
}

let instancia: Promise<ExecutorSql> | undefined;

/** Conexão única com o SQLite do app, aberta sob demanda. */
export function executorTauri(): Promise<ExecutorSql> {
  instancia ??= Database.load(URL_BANCO);
  return instancia;
}
