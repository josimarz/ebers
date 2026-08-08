/**
 * Saldo de Créditos por paciente (id → saldo), derivado do extrato de
 * Movimentos de crédito (spec 3.3) — nunca um campo editado diretamente.
 * A tabela de movimentos chega com os tickets de Nova Consulta e do modal
 * "Créditos"; até lá não existe movimento algum e o mapa vazio deixa todo
 * paciente com saldo 0 (leitura com `?? 0`).
 */
export async function saldosDeCreditos(): Promise<Map<number, number>> {
  return new Map();
}
