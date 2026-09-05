import { sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
// Imports relativos: o drizzle-kit compila este arquivo fora do Vite e não
// resolve o alias "@".
import {
  ORIGENS_PAGAMENTO,
  STATUS_CONSULTA,
  TIPOS_MOVIMENTO_CREDITO,
} from "../dominio/consulta";
import {
  DIAS_SEMANA_CONSULTA,
  GENEROS,
  PERIODICIDADES,
  RELIGIOES,
} from "../dominio/paciente";

// Cadastro do Paciente (spec 1.1). Datas em ISO (AAAA-MM-DD); dinheiro em
// centavos (inteiro); perguntas Sim/Não como boolean; CPF só dígitos, único.
// `foto` guarda só o nome do arquivo — os bytes vivem no diretório fotos/ do
// backend Rust (src-tauri/src/fotos.rs). Créditos fica de fora: saldo derivado.
export const pacientes = sqliteTable("pacientes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nomeCompleto: text("nome_completo").notNull(),
  foto: text("foto"),
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
  // Nula só para quem foi cadastrado antes do campo existir (migração 0004);
  // a obrigatoriedade é do domínio, como nos condicionais clínicos.
  motivoTerapia: text("motivo_terapia"),
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

// Consulta (spec 2.1). Datas/horas em ISO completo; Preço congelado na criação
// a partir do Valor da consulta do Paciente. O índice único parcial garante no
// banco a pré-condição da spec 2.2: no máximo uma Aberta por Paciente.
export const consultas = sqliteTable(
  "consultas",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    pacienteId: integer("paciente_id")
      .notNull()
      .references(() => pacientes.id),
    iniciadoEm: text("iniciado_em").notNull(),
    finalizadoEm: text("finalizado_em"),
    pagoEm: text("pago_em"),
    status: text("status", { enum: STATUS_CONSULTA })
      .notNull()
      .default("Aberta"),
    conteudo: text("conteudo").notNull().default(""),
    notas: text("notas").notNull().default(""),
    precoCentavos: integer("preco_centavos").notNull(),
    pago: integer("pago", { mode: "boolean" }).notNull().default(false),
    origemPagamento: text("origem_pagamento", { enum: ORIGENS_PAGAMENTO }),
  },
  (tabela) => [
    uniqueIndex("consultas_paciente_aberta_unica")
      .on(tabela.pacienteId)
      .where(sql`${tabela.status} = 'Aberta'`),
  ],
);

// Movimento de crédito (spec 3.3): o saldo de Créditos é a soma das
// quantidades, nunca um campo editado. Consumo/Estorno referenciam a Consulta;
// Venda guarda o valor unitário vigente (informativo); Ajuste exige motivo —
// obrigatoriedades por tipo ficam na camada de domínio, não no banco.
export const movimentosCredito = sqliteTable("movimentos_credito", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pacienteId: integer("paciente_id")
    .notNull()
    .references(() => pacientes.id),
  tipo: text("tipo", { enum: TIPOS_MOVIMENTO_CREDITO }).notNull(),
  quantidade: integer("quantidade").notNull(),
  ocorridoEm: text("ocorrido_em").notNull(),
  consultaId: integer("consulta_id").references(() => consultas.id),
  valorUnitarioCentavos: integer("valor_unitario_centavos"),
  motivo: text("motivo"),
});
