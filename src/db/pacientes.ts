import { and, count, eq, ne } from "drizzle-orm";
import type { DadosPaciente } from "@/dominio/paciente";
import { banco } from "./banco";
import { pacientes } from "./schema";

export type Paciente = typeof pacientes.$inferSelect;

/** CPF é único no sistema (spec 1.1) — a UI traduz em erro no campo. */
export class CpfJaCadastradoError extends Error {
  constructor() {
    super("CPF já cadastrado");
    this.name = "CpfJaCadastradoError";
  }
}

export async function listarPacientes(): Promise<Paciente[]> {
  return banco.select().from(pacientes);
}

export async function buscarPaciente(
  id: number,
): Promise<Paciente | undefined> {
  const linhas = await banco
    .select()
    .from(pacientes)
    .where(eq(pacientes.id, id))
    .limit(1);
  return linhas[0];
}

export async function criarPaciente(dados: DadosPaciente): Promise<void> {
  if (await cpfJaCadastrado(dados.cpf)) throw new CpfJaCadastradoError();
  await banco.insert(pacientes).values(dados);
}

export async function atualizarPaciente(
  id: number,
  dados: DadosPaciente,
): Promise<void> {
  if (await cpfJaCadastrado(dados.cpf, id)) throw new CpfJaCadastradoError();
  await banco.update(pacientes).set(dados).where(eq(pacientes.id, id));
}

/**
 * Conferência amigável de duplicata antes de gravar; o índice UNIQUE do
 * banco continua como garantia final. Na edição, o próprio registro não
 * conta como duplicata.
 */
async function cpfJaCadastrado(
  cpf: string,
  ignorarId?: number,
): Promise<boolean> {
  const mesmoCpf = eq(pacientes.cpf, cpf);
  const condicao =
    ignorarId === undefined
      ? mesmoCpf
      : and(mesmoCpf, ne(pacientes.id, ignorarId));
  const [{ total }] = await banco
    .select({ total: count() })
    .from(pacientes)
    .where(condicao);
  return total > 0;
}
