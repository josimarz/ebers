import { eq, sql } from "drizzle-orm";
import {
  erroDoAjuste,
  type MovimentoDoExtrato,
  vendaValida,
} from "@/dominio/creditos";
import { banco } from "./banco";
import { buscarPaciente } from "./pacientes";
import { consultas, movimentosCredito } from "./schema";

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

/**
 * Extrato de um paciente para o modal Créditos (spec 3.2), com o início da
 * Consulta referenciada nos Consumos/Estornos — ordenação e apresentação
 * ficam no domínio (montarExtrato).
 */
export async function listarMovimentos(
  pacienteId: number,
): Promise<MovimentoDoExtrato[]> {
  return banco
    .select({
      id: movimentosCredito.id,
      tipo: movimentosCredito.tipo,
      quantidade: movimentosCredito.quantidade,
      ocorridoEm: movimentosCredito.ocorridoEm,
      consultaIniciadaEm: consultas.iniciadoEm,
      valorUnitarioCentavos: movimentosCredito.valorUnitarioCentavos,
      motivo: movimentosCredito.motivo,
    })
    .from(movimentosCredito)
    .leftJoin(consultas, eq(movimentosCredito.consultaId, consultas.id))
    .where(eq(movimentosCredito.pacienteId, pacienteId));
}

/** Venda fora da regra da spec 3.2: quantidade inteira de pelo menos 1. */
export class VendaInvalidaError extends Error {
  constructor() {
    super("A quantidade da venda deve ser um inteiro positivo");
    this.name = "VendaInvalidaError";
  }
}

/**
 * Vender créditos (spec 3.2): registra o Movimento Venda (+quantidade)
 * gravando o Valor da consulta vigente do paciente — informativo, para o
 * extrato. O valor é relido do cadastro na hora da gravação, nunca recebido
 * da tela, para registrar sempre o vigente.
 */
export async function venderCreditos(
  pacienteId: number,
  quantidade: number,
): Promise<void> {
  if (!vendaValida(quantidade)) throw new VendaInvalidaError();

  const paciente = await buscarPaciente(pacienteId);
  if (paciente === undefined) throw new Error("Paciente não encontrado");

  await banco.insert(movimentosCredito).values({
    pacienteId,
    tipo: "Venda",
    quantidade,
    ocorridoEm: new Date().toISOString(),
    valorUnitarioCentavos: paciente.valorConsultaCentavos,
  });
}

/** Ajuste fora das regras da spec 3.2 — inclusive o que negativaria o saldo. */
export class AjusteInvalidoError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "AjusteInvalidoError";
  }
}

/**
 * Ajustar créditos (spec 3.2): quantidade positiva ou negativa com motivo
 * obrigatório. O saldo é re-derivado do extrato imediatamente antes de
 * gravar — o banco respalda a regra de nunca deixar o saldo negativo.
 *
 * Como em criarConsulta, select e insert são sequenciais, sem transação —
 * janela aceita para o app local single-user.
 */
export async function ajustarCreditos(
  pacienteId: number,
  quantidade: number,
  motivo: string,
): Promise<void> {
  const erro = erroDoAjuste(
    await saldoDeCreditos(pacienteId),
    quantidade,
    motivo,
  );
  if (erro !== null) throw new AjusteInvalidoError(erro);

  await banco.insert(movimentosCredito).values({
    pacienteId,
    tipo: "Ajuste",
    quantidade,
    ocorridoEm: new Date().toISOString(),
    motivo: motivo.trim(),
  });
}
