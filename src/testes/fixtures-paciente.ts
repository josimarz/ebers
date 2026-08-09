import { getTableColumns } from "drizzle-orm";
import type { Paciente } from "@/db/pacientes";
import type { LinhaSql } from "@/db/proxy";
import { pacientes } from "@/db/schema";
import type { DadosPaciente } from "@/dominio/paciente";

/** Registro de Paciente válido e adulto, com os opcionais preenchidos à parte. */
export function dadosPacienteValidos(
  ajustes: Partial<DadosPaciente> = {},
): DadosPaciente {
  return {
    nomeCompleto: "Ana Lima",
    foto: null,
    dataNascimento: "1990-03-10",
    genero: "Feminino",
    cpf: "52998224725",
    rg: null,
    religiao: "Sem religião",
    responsavelLegal: null,
    emailResponsavelLegal: null,
    cpfResponsavelLegal: null,
    telefone1: "(11) 91234-5678",
    telefone2: null,
    email: "ana@exemplo.com",
    jaFezTerapia: false,
    quandoFezTerapia: null,
    tomaMedicamento: false,
    tomaMedicamentoDesdeQuando: null,
    nomesMedicamentos: null,
    jaFoiHospitalizado: false,
    quandoFoiHospitalizado: null,
    razaoHospitalizacao: null,
    valorConsultaCentavos: 25000,
    periodicidade: "Semanal",
    diaSemanaConsulta: "Quarta",
    ...ajustes,
  };
}

/**
 * Converte um Paciente na linha que o SQLite devolveria por um
 * `select * from pacientes`: chaves são os nomes das colunas, na ordem do
 * schema (a ordem que o mapeamento posicional do sqlite-proxy pressupõe),
 * com booleanos como 0/1.
 */
export function linhaDePaciente(paciente: Paciente): LinhaSql {
  const linha: LinhaSql = {};
  for (const [chave, coluna] of Object.entries(getTableColumns(pacientes))) {
    const valor = paciente[chave as keyof Paciente];
    linha[coluna.name] = typeof valor === "boolean" ? (valor ? 1 : 0) : valor;
  }
  return linha;
}
