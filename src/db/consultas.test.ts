import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { consultaAberta, linhaDeConsulta } from "@/testes/fixtures-consulta";
import {
  dadosPacienteValidos,
  linhaDePaciente,
} from "@/testes/fixtures-paciente";
import {
  chamadas,
  enfileirarSelect,
  reiniciarBancoFalso,
} from "@/testes/plugin-sql-falso";
import {
  buscarConsulta,
  ConsultaAbertaError,
  consultasAbertas,
  criarConsulta,
  finalizarConsulta,
  salvarConteudo,
  salvarNotas,
} from "./consultas";

// Fronteira do sistema: o SQLite atrás do tauri-plugin-sql. O caminho
// consultas → drizzle (sqlite-proxy) roda de verdade sobre o dublê.
vi.mock("@tauri-apps/plugin-sql", () => import("@/testes/plugin-sql-falso"));

const AGORA = "2026-08-08T14:00:00.000Z";

beforeEach(() => {
  reiniciarBancoFalso();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(AGORA));
});

afterEach(() => {
  vi.useRealTimers();
});

test("criarConsulta sem créditos cria a consulta não paga, com o preço congelado", async () => {
  enfileirarSelect([]); // nenhuma Consulta Aberta do paciente
  enfileirarSelect([linhaDePaciente({ id: 7, ...dadosPacienteValidos() })]);
  enfileirarSelect([{ saldo: 0 }]);
  enfileirarSelect([linhaDeConsulta(consultaAberta({ id: 3, pacienteId: 7 }))]);

  const id = await criarConsulta(7);

  expect(id).toBe(3);
  const insercoes = chamadas.filter((chamada) => /insert/i.test(chamada.sql));
  expect(insercoes).toHaveLength(1);
  expect(insercoes[0].sql).toMatch(/insert into "consultas"/i);
  // Nasce Aberta com os textos vazios e não paga: Pago = false, Pago em e
  // Origem nulos; Preço vem do Valor da consulta do paciente (25000) e
  // Iniciado em é o agora.
  expect(insercoes[0].valores).toEqual([
    7,
    AGORA,
    null,
    "Aberta",
    "",
    "",
    25000,
    0,
    null,
  ]);
});

test("criarConsulta com saldo debita um crédito com Movimento Consumo", async () => {
  enfileirarSelect([]); // nenhuma Consulta Aberta do paciente
  enfileirarSelect([linhaDePaciente({ id: 7, ...dadosPacienteValidos() })]);
  enfileirarSelect([{ saldo: 2 }]);
  enfileirarSelect([linhaDeConsulta(consultaAberta({ id: 9, pacienteId: 7 }))]);

  const id = await criarConsulta(7);

  expect(id).toBe(9);
  const insercoes = chamadas.filter((chamada) => /insert/i.test(chamada.sql));
  expect(insercoes).toHaveLength(2);
  // Já nasce paga: Pago = true, Pago em = agora, Origem = "Crédito".
  expect(insercoes[0].valores).toEqual([
    7,
    AGORA,
    AGORA,
    "Aberta",
    "",
    "",
    25000,
    1,
    "Crédito",
  ]);
  // Movimento Consumo (−1) referenciando a consulta criada.
  expect(insercoes[1].sql).toMatch(/insert into "movimentos_credito"/i);
  expect(insercoes[1].valores).toEqual([7, "Consumo", -1, AGORA, 9]);
});

test("criarConsulta com uma Aberta existente falha sem gravar nada", async () => {
  enfileirarSelect([linhaDeConsulta(consultaAberta({ id: 5, pacienteId: 7 }))]);

  await expect(criarConsulta(7)).rejects.toBeInstanceOf(ConsultaAbertaError);

  expect(chamadas).toHaveLength(1);
  expect(chamadas[0].sql).toMatch(/select .* from "consultas"/i);
});

test("buscarConsulta devolve o registro decodificado pelo drizzle", async () => {
  enfileirarSelect([
    linhaDeConsulta(
      consultaAberta({
        id: 3,
        pacienteId: 7,
        pago: true,
        pagoEm: AGORA,
        origemPagamento: "Crédito",
      }),
    ),
  ]);

  const consulta = await buscarConsulta(3);

  expect(consulta?.id).toBe(3);
  expect(consulta?.pacienteId).toBe(7);
  expect(consulta?.status).toBe("Aberta");
  expect(consulta?.pago).toBe(true);
  expect(consulta?.origemPagamento).toBe("Crédito");
  expect(chamadas[0].valores).toEqual([3, 1]);
});

test("buscarConsulta sem registro devolve undefined", async () => {
  enfileirarSelect([]);

  expect(await buscarConsulta(99)).toBeUndefined();
});

test("salvarConteudo e salvarNotas gravam o texto, nunca em Cancelada", async () => {
  await salvarConteudo(3, "Relato de hoje");
  await salvarNotas(3, "Anotações da terapeuta");

  expect(chamadas).toHaveLength(2);
  expect(chamadas[0].sql).toMatch(/update "consultas" set "conteudo"/i);
  expect(chamadas[0].valores).toEqual(["Relato de hoje", 3, "Cancelada"]);
  expect(chamadas[1].sql).toMatch(/update "consultas" set "notas"/i);
  expect(chamadas[1].valores).toEqual([
    "Anotações da terapeuta",
    3,
    "Cancelada",
  ]);
});

test("finalizarConsulta marca Finalizada com o momento, só a partir de Aberta", async () => {
  await finalizarConsulta(3);

  expect(chamadas).toHaveLength(1);
  expect(chamadas[0].sql).toMatch(/update "consultas" set/i);
  expect(chamadas[0].valores).toEqual([AGORA, "Finalizada", 3, "Aberta"]);
});

test("consultasAbertas mapeia cada paciente para a sua Consulta Aberta", async () => {
  enfileirarSelect([
    { paciente_id: 7, id: 3 },
    { paciente_id: 9, id: 5 },
  ]);

  const abertas = await consultasAbertas();

  expect(abertas).toEqual(
    new Map([
      [7, 3],
      [9, 5],
    ]),
  );
  expect(chamadas[0].valores).toEqual(["Aberta"]);
});
