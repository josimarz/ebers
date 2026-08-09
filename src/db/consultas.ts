import { and, eq, ne } from "drizzle-orm";
import { pagamentoNaCriacao } from "@/dominio/consulta";
import { banco } from "./banco";
import { saldoDeCreditos } from "./creditos";
import { buscarPaciente } from "./pacientes";
import { consultas, movimentosCredito } from "./schema";

export type Consulta = typeof consultas.$inferSelect;

/** Pré-condição da criação (spec 2.2): no máximo uma Aberta por paciente. */
export class ConsultaAbertaError extends Error {
  constructor() {
    super("O paciente já tem uma Consulta Aberta");
    this.name = "ConsultaAbertaError";
  }
}

/**
 * Consulta Aberta de cada paciente (id do paciente → id da consulta), para a
 * coluna Ações da listagem (spec 1.2) decidir entre "Nova Consulta" e
 * "Consulta".
 */
export async function consultasAbertas(): Promise<Map<number, number>> {
  const linhas = await banco
    .select({ pacienteId: consultas.pacienteId, id: consultas.id })
    .from(consultas)
    .where(eq(consultas.status, "Aberta"));
  return new Map(linhas.map((linha) => [linha.pacienteId, linha.id]));
}

async function consultaAbertaDoPaciente(
  pacienteId: number,
): Promise<Consulta | undefined> {
  const linhas = await banco
    .select()
    .from(consultas)
    .where(
      and(eq(consultas.pacienteId, pacienteId), eq(consultas.status, "Aberta")),
    )
    .limit(1);
  return linhas[0];
}

/**
 * Cria a Consulta do paciente (spec 2.2): Preço congelado a partir do Valor
 * da consulta e, havendo saldo de Créditos, já nasce paga por Crédito.
 * Devolve o id da consulta criada — relido pela unicidade da Aberta, porque o
 * caminho drizzle → tauri-plugin-sql descarta o lastInsertId dos inserts.
 *
 * As gravações são sequenciais, sem transação: o proxy executa um comando por
 * vez sobre o pool do plugin, sem como manter um BEGIN/COMMIT entre chamadas.
 * Janela aceita para o app local single-user: uma queda exatamente entre os
 * dois inserts deixa a consulta paga por Crédito sem o Consumo no extrato.
 */
export async function criarConsulta(pacienteId: number): Promise<number> {
  if (await consultaAbertaDoPaciente(pacienteId)) {
    throw new ConsultaAbertaError();
  }

  const paciente = await buscarPaciente(pacienteId);
  if (paciente === undefined) throw new Error("Paciente não encontrado");

  const agora = new Date().toISOString();
  const pagamento = pagamentoNaCriacao(
    await saldoDeCreditos(pacienteId),
    agora,
  );

  await banco.insert(consultas).values({
    pacienteId,
    iniciadoEm: agora,
    precoCentavos: paciente.valorConsultaCentavos,
    ...pagamento,
  });

  const criada = await consultaAbertaDoPaciente(pacienteId);
  if (criada === undefined) {
    throw new Error("Consulta recém-criada não encontrada");
  }

  // Paga por Crédito: o débito entra no extrato como Consumo (spec 3.3).
  if (pagamento.origemPagamento === "Crédito") {
    await banco.insert(movimentosCredito).values({
      pacienteId,
      tipo: "Consumo",
      quantidade: -1,
      ocorridoEm: agora,
      consultaId: criada.id,
    });
  }

  return criada.id;
}

export async function buscarConsulta(
  id: number,
): Promise<Consulta | undefined> {
  const linhas = await banco
    .select()
    .from(consultas)
    .where(eq(consultas.id, id))
    .limit(1);
  return linhas[0];
}

// O salvamento automático grava Conteúdo e Notas separadamente, cada um na
// sua própria pausa de digitação. A cláusula de status respalda no banco a
// regra da spec 2.3: Cancelada é somente leitura.
function salvavel(id: number) {
  return and(eq(consultas.id, id), ne(consultas.status, "Cancelada"));
}

export async function salvarConteudo(id: number, texto: string): Promise<void> {
  await banco.update(consultas).set({ conteudo: texto }).where(salvavel(id));
}

export async function salvarNotas(id: number, texto: string): Promise<void> {
  await banco.update(consultas).set({ notas: texto }).where(salvavel(id));
}

/** Finalizar Consulta (spec 2.3): Status → Finalizada, Finalizado em = agora. */
export async function finalizarConsulta(id: number): Promise<void> {
  await banco
    .update(consultas)
    .set({ status: "Finalizada", finalizadoEm: new Date().toISOString() })
    .where(and(eq(consultas.id, id), eq(consultas.status, "Aberta")));
}
