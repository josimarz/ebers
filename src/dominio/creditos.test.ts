import { expect, test } from "vitest";
import { movimentoDoExtrato } from "@/testes/fixtures-movimento";
import {
  erroDoAjuste,
  montarExtrato,
  parsearQuantidade,
  saldoDoExtrato,
  totalDaVenda,
  vendaValida,
} from "./creditos";

/** Instante ISO construído em hora local — expectativas valem em qualquer fuso. */
function iso(dia: number, hora: number): string {
  return new Date(2026, 7, dia, hora).toISOString();
}

test("saldoDoExtrato é a soma das quantidades dos movimentos", () => {
  expect(
    saldoDoExtrato([
      movimentoDoExtrato({ quantidade: 5 }),
      movimentoDoExtrato({ quantidade: -1 }),
    ]),
  ).toBe(4);
});

test("sem movimentos, o saldo é zero", () => {
  expect(saldoDoExtrato([])).toBe(0);
});

test("montarExtrato ordena do mais recente ao mais antigo, empate pelo id", () => {
  const linhas = montarExtrato([
    movimentoDoExtrato({ id: 1, ocorridoEm: iso(6, 10) }),
    movimentoDoExtrato({ id: 3, ocorridoEm: iso(8, 9) }),
    movimentoDoExtrato({ id: 2, ocorridoEm: iso(8, 9) }),
  ]);

  expect(linhas.map((linha) => linha.id)).toEqual([3, 2, 1]);
});

test("cada linha traz data/hora local e a quantidade com sinal explícito", () => {
  const [credito] = montarExtrato([
    movimentoDoExtrato({ ocorridoEm: iso(8, 14), quantidade: 3 }),
  ]);
  expect(credito.dataHora).toBe("08/08/2026 14:00");
  expect(credito.quantidade).toBe("+3");

  const [debito] = montarExtrato([movimentoDoExtrato({ quantidade: -1 })]);
  expect(debito.quantidade).toBe("-1");
});

test("a referência acompanha o tipo: valor unitário, consulta ou motivo", () => {
  const linhas = montarExtrato([
    movimentoDoExtrato({
      id: 4,
      tipo: "Ajuste",
      quantidade: -2,
      motivo: "Cortesia devolvida",
      ocorridoEm: iso(8, 12),
    }),
    movimentoDoExtrato({
      id: 3,
      tipo: "Estorno",
      quantidade: 1,
      consultaIniciadaEm: iso(7, 15),
      valorUnitarioCentavos: null,
      ocorridoEm: iso(8, 11),
    }),
    movimentoDoExtrato({
      id: 2,
      tipo: "Consumo",
      quantidade: -1,
      consultaIniciadaEm: iso(7, 15),
      valorUnitarioCentavos: null,
      ocorridoEm: iso(8, 10),
    }),
    movimentoDoExtrato({
      id: 1,
      tipo: "Venda",
      quantidade: 3,
      valorUnitarioCentavos: 25000,
      ocorridoEm: iso(8, 9),
    }),
  ]);

  expect(linhas.map((linha) => [linha.tipo, linha.referencia])).toEqual([
    ["Ajuste", "Cortesia devolvida"],
    ["Estorno", "Consulta de 07/08/2026 15:00"],
    ["Consumo", "Consulta de 07/08/2026 15:00"],
    ["Venda", "R$ 250,00 por crédito"],
  ]);
});

test("sem consulta, valor unitário ou motivo, a referência vira travessão", () => {
  const linhas = montarExtrato([
    movimentoDoExtrato({ id: 3, tipo: "Venda", valorUnitarioCentavos: null }),
    movimentoDoExtrato({
      id: 2,
      tipo: "Consumo",
      quantidade: -1,
      consultaIniciadaEm: null,
    }),
    movimentoDoExtrato({ id: 1, tipo: "Ajuste", quantidade: 1, motivo: null }),
  ]);

  expect(linhas.map((linha) => linha.referencia)).toEqual(["—", "—", "—"]);
});

test("parsearQuantidade aceita inteiros com sinal e rejeita o resto", () => {
  expect(parsearQuantidade("3")).toBe(3);
  expect(parsearQuantidade("+2")).toBe(2);
  expect(parsearQuantidade("-4")).toBe(-4);
  expect(parsearQuantidade(" 0 ")).toBe(0);
  expect(parsearQuantidade("")).toBeNull();
  expect(parsearQuantidade("1,5")).toBeNull();
  expect(parsearQuantidade("1.5")).toBeNull();
  expect(parsearQuantidade("abc")).toBeNull();
});

test("vendaValida exige quantidade inteira de pelo menos 1", () => {
  expect(vendaValida(1)).toBe(true);
  expect(vendaValida(10)).toBe(true);
  expect(vendaValida(0)).toBe(false);
  expect(vendaValida(-2)).toBe(false);
  expect(vendaValida(1.5)).toBe(false);
  expect(vendaValida(null)).toBe(false);
});

test("totalDaVenda multiplica a quantidade pelo Valor da consulta", () => {
  expect(totalDaVenda(3, 25000)).toBe(75000);
});

test("erroDoAjuste exige quantidade inteira diferente de zero", () => {
  const mensagem = "Informe uma quantidade inteira diferente de zero.";
  expect(erroDoAjuste(5, null, "Correção")).toBe(mensagem);
  expect(erroDoAjuste(5, 0, "Correção")).toBe(mensagem);
  expect(erroDoAjuste(5, 0.5, "Correção")).toBe(mensagem);
});

test("erroDoAjuste exige motivo", () => {
  expect(erroDoAjuste(5, 2, "")).toBe("Informe o motivo do ajuste.");
  expect(erroDoAjuste(5, 2, "   ")).toBe("Informe o motivo do ajuste.");
});

test("erroDoAjuste nunca deixa o saldo negativo; no limite exato, passa", () => {
  expect(erroDoAjuste(2, -3, "Correção")).toBe(
    "O ajuste deixaria o saldo negativo.",
  );
  expect(erroDoAjuste(2, -2, "Correção")).toBeNull();
  expect(erroDoAjuste(0, 5, "Compra registrada fora do sistema")).toBeNull();
});
