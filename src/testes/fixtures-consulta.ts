import { getTableColumns } from "drizzle-orm";
import type { Consulta } from "@/db/consultas";
import type { LinhaSql } from "@/db/proxy";
import { consultas } from "@/db/schema";

/** Consulta Aberta recém-criada, não paga, com os textos vazios. */
export function consultaAberta(ajustes: Partial<Consulta> = {}): Consulta {
  return {
    id: 1,
    pacienteId: 1,
    iniciadoEm: "2026-08-08T14:00:00.000Z",
    finalizadoEm: null,
    pagoEm: null,
    status: "Aberta",
    conteudo: "",
    notas: "",
    precoCentavos: 25000,
    pago: false,
    origemPagamento: null,
    ...ajustes,
  };
}

/**
 * Converte uma Consulta na linha que o SQLite devolveria por um
 * `select * from consultas`: chaves são os nomes das colunas, na ordem do
 * schema (a ordem que o mapeamento posicional do sqlite-proxy pressupõe),
 * com booleanos como 0/1.
 */
export function linhaDeConsulta(consulta: Consulta): LinhaSql {
  const linha: LinhaSql = {};
  for (const [chave, coluna] of Object.entries(getTableColumns(consultas))) {
    const valor = consulta[chave as keyof Consulta];
    linha[coluna.name] = typeof valor === "boolean" ? (valor ? 1 : 0) : valor;
  }
  return linha;
}
