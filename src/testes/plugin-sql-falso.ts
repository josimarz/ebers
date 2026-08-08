// Dublê do @tauri-apps/plugin-sql com respostas programáveis, para vi.mock:
//   vi.mock("@tauri-apps/plugin-sql", () => import("@/testes/plugin-sql-falso"));
// Grava toda chamada SQL e devolve, para cada select, a próxima resposta
// enfileirada (ou nenhuma linha). Reiniciar em beforeEach.
import type { LinhaSql } from "@/db/proxy";

export interface ChamadaSql {
  sql: string;
  valores: unknown[];
}

/** Chamadas executadas, na ordem, desde o último reinício. */
export const chamadas: ChamadaSql[] = [];

const respostasSelect: LinhaSql[][] = [];

export function reiniciarBancoFalso(): void {
  chamadas.length = 0;
  respostasSelect.length = 0;
}

/** Programa as linhas que o próximo select devolverá. */
export function enfileirarSelect(linhas: LinhaSql[]): void {
  respostasSelect.push(linhas);
}

export default {
  load: async () => ({
    select: async (sql: string, valores?: unknown[]) => {
      chamadas.push({ sql, valores: valores ?? [] });
      return respostasSelect.shift() ?? [];
    },
    execute: async (sql: string, valores?: unknown[]) => {
      chamadas.push({ sql, valores: valores ?? [] });
      return { rowsAffected: 1, lastInsertId: 1 };
    },
  }),
};
