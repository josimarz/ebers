import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  linhaDeMovimento,
  movimentoDoExtrato,
} from "@/testes/fixtures-movimento";
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
  AjusteInvalidoError,
  ajustarCreditos,
  listarMovimentos,
  saldosDeCreditos,
  VendaInvalidaError,
  venderCreditos,
} from "./creditos";

// Fronteira do sistema: o SQLite atrás do tauri-plugin-sql. O caminho
// creditos → drizzle (sqlite-proxy) roda de verdade sobre o dublê.
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

test("saldosDeCreditos deriva o saldo de cada paciente da soma do extrato", async () => {
  enfileirarSelect([
    { paciente_id: 1, saldo: 3 },
    { paciente_id: 2, saldo: 0 },
  ]);

  const saldos = await saldosDeCreditos();

  expect(saldos).toEqual(
    new Map([
      [1, 3],
      [2, 0],
    ]),
  );
  expect(chamadas).toHaveLength(1);
  expect(chamadas[0].sql).toMatch(/sum/i);
  expect(chamadas[0].sql).toMatch(/group by/i);
});

test("sem movimento algum, o mapa de saldos fica vazio", async () => {
  enfileirarSelect([]);

  expect(await saldosDeCreditos()).toEqual(new Map());
});

test("listarMovimentos traz o extrato do paciente com a consulta referenciada", async () => {
  const consumo = movimentoDoExtrato({
    id: 2,
    tipo: "Consumo",
    quantidade: -1,
    consultaIniciadaEm: "2026-08-07T15:00:00.000Z",
    valorUnitarioCentavos: null,
  });
  const venda = movimentoDoExtrato({ id: 1, quantidade: 3 });
  enfileirarSelect([linhaDeMovimento(consumo), linhaDeMovimento(venda)]);

  const movimentos = await listarMovimentos(7);

  expect(movimentos).toEqual([consumo, venda]);
  expect(chamadas).toHaveLength(1);
  expect(chamadas[0].sql).toMatch(/left join "consultas"/i);
  expect(chamadas[0].valores).toEqual([7]);
});

test("venderCreditos grava a Venda com o Valor da consulta vigente", async () => {
  enfileirarSelect([linhaDePaciente({ id: 7, ...dadosPacienteValidos() })]);

  await venderCreditos(7, 3);

  const insercoes = chamadas.filter((chamada) => /insert/i.test(chamada.sql));
  expect(insercoes).toHaveLength(1);
  expect(insercoes[0].sql).toMatch(/insert into "movimentos_credito"/i);
  // Venda +3 agora, com o valor unitário vigente (25000) — informativo.
  expect(insercoes[0].valores).toEqual([7, "Venda", 3, AGORA, 25000]);
});

test("venderCreditos rejeita quantidade que não seja inteiro positivo", async () => {
  await expect(venderCreditos(7, 0)).rejects.toBeInstanceOf(VendaInvalidaError);
  await expect(venderCreditos(7, -2)).rejects.toBeInstanceOf(
    VendaInvalidaError,
  );
  await expect(venderCreditos(7, 1.5)).rejects.toBeInstanceOf(
    VendaInvalidaError,
  );

  expect(chamadas).toHaveLength(0);
});

test("venderCreditos falha sem gravar quando o paciente não existe", async () => {
  enfileirarSelect([]);

  await expect(venderCreditos(99, 1)).rejects.toThrow(
    "Paciente não encontrado",
  );

  expect(chamadas).toHaveLength(1);
});

test("ajustarCreditos deriva o saldo antes e grava o Ajuste com o motivo", async () => {
  enfileirarSelect([{ saldo: 2 }]);

  await ajustarCreditos(7, -2, "  Cortesia devolvida  ");

  expect(chamadas[0].sql).toMatch(/sum/i);
  const insercoes = chamadas.filter((chamada) => /insert/i.test(chamada.sql));
  expect(insercoes).toHaveLength(1);
  expect(insercoes[0].sql).toMatch(/insert into "movimentos_credito"/i);
  // Motivo gravado aparado — é o que o extrato exibe.
  expect(insercoes[0].valores).toEqual([
    7,
    "Ajuste",
    -2,
    AGORA,
    "Cortesia devolvida",
  ]);
});

test("ajustarCreditos nunca deixa o saldo negativo", async () => {
  enfileirarSelect([{ saldo: 2 }]);

  await expect(ajustarCreditos(7, -3, "Correção")).rejects.toBeInstanceOf(
    AjusteInvalidoError,
  );

  // Só o select do saldo — nada gravado.
  expect(chamadas).toHaveLength(1);
});

test("ajustarCreditos exige motivo", async () => {
  enfileirarSelect([{ saldo: 2 }]);

  await expect(ajustarCreditos(7, 1, "   ")).rejects.toBeInstanceOf(
    AjusteInvalidoError,
  );

  expect(chamadas).toHaveLength(1);
});

test("ajustarCreditos rejeita quantidade fracionária sem gravar", async () => {
  enfileirarSelect([{ saldo: 2 }]);

  await expect(ajustarCreditos(7, 0.5, "Correção")).rejects.toBeInstanceOf(
    AjusteInvalidoError,
  );

  expect(chamadas).toHaveLength(1);
});
