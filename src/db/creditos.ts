import { eq, sql } from "drizzle-orm";
import { banco } from "./banco";
import { movimentosCredito } from "./schema";

/**
 * Saldo de Créditos por paciente (id → saldo), derivado do extrato de
 * Movimentos de crédito (spec 3.3) — nunca um campo editado diretamente.
 * Paciente sem movimento fica fora do mapa (leitura com `?? 0`).
 */
export async function saldosDeCreditos(): Promise<Map<number, number>> {
  const linhas = await banco
    .select({
      pacienteId: movimentosCredito.pacienteId,
      saldo: sql<number>`sum(${movimentosCredito.quantidade})`,
    })
    .from(movimentosCredito)
    .groupBy(movimentosCredito.pacienteId);
  return new Map(linhas.map((linha) => [linha.pacienteId, linha.saldo]));
}

/** Saldo de Créditos de um paciente — a soma do seu extrato (spec 3.3). */
export async function saldoDeCreditos(pacienteId: number): Promise<number> {
  const [{ saldo }] = await banco
    .select({
      saldo: sql<number>`coalesce(sum(${movimentosCredito.quantidade}), 0)`,
    })
    .from(movimentosCredito)
    .where(eq(movimentosCredito.pacienteId, pacienteId));
  return saldo;
}
