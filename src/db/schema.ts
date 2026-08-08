import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
// Import relativo: o drizzle-kit compila este arquivo fora do Vite e não
// resolve o alias "@".
import {
  DIAS_SEMANA_CONSULTA,
  GENEROS,
  PERIODICIDADES,
  RELIGIOES,
} from "../dominio/paciente";

// Cadastro do Paciente (spec 1.1). Datas em ISO (AAAA-MM-DD); dinheiro em
// centavos (inteiro); perguntas Sim/Não como boolean; CPF só dígitos, único.
// Foto de perfil e Créditos ficam de fora: chegam nos tickets próprios
// (a foto vai para o sistema de arquivos; Créditos é saldo derivado).
export const pacientes = sqliteTable("pacientes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nomeCompleto: text("nome_completo").notNull(),
  dataNascimento: text("data_nascimento").notNull(),
  genero: text("genero", { enum: GENEROS }).notNull(),
  cpf: text("cpf").notNull().unique(),
  rg: text("rg"),
  religiao: text("religiao", { enum: RELIGIOES }).notNull(),
  responsavelLegal: text("responsavel_legal"),
  emailResponsavelLegal: text("email_responsavel_legal"),
  cpfResponsavelLegal: text("cpf_responsavel_legal"),
  telefone1: text("telefone_1").notNull(),
  telefone2: text("telefone_2"),
  email: text("email"),
  jaFezTerapia: integer("ja_fez_terapia", { mode: "boolean" }).notNull(),
  quandoFezTerapia: text("quando_fez_terapia"),
  tomaMedicamento: integer("toma_medicamento", { mode: "boolean" }).notNull(),
  tomaMedicamentoDesdeQuando: text("toma_medicamento_desde_quando"),
  nomesMedicamentos: text("nomes_medicamentos"),
  jaFoiHospitalizado: integer("ja_foi_hospitalizado", {
    mode: "boolean",
  }).notNull(),
  quandoFoiHospitalizado: text("quando_foi_hospitalizado"),
  razaoHospitalizacao: text("razao_hospitalizacao"),
  valorConsultaCentavos: integer("valor_consulta_centavos").notNull(),
  periodicidade: text("periodicidade", { enum: PERIODICIDADES }),
  diaSemanaConsulta: text("dia_semana_consulta", {
    enum: DIAS_SEMANA_CONSULTA,
  }),
});
