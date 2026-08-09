import { expect, test } from "vitest";
import { pagamentoNaCriacao, timerDaConsulta } from "./consulta";

const AGORA = "2026-08-08T14:30:00.000Z";

test("com saldo de créditos, a consulta nasce paga por Crédito", () => {
  expect(pagamentoNaCriacao(2, AGORA)).toEqual({
    pago: true,
    pagoEm: AGORA,
    origemPagamento: "Crédito",
  });
});

test("sem saldo, a consulta nasce não paga", () => {
  expect(pagamentoNaCriacao(0, AGORA)).toEqual({
    pago: false,
    pagoEm: null,
    origemPagamento: null,
  });
});

const INICIO = "2026-08-08T14:00:00.000Z";

/** Instante `minutos:segundos` depois do início da consulta. */
function decorrido(minutos: number, segundos = 0): number {
  return Date.parse(INICIO) + (minutos * 60 + segundos) * 1000;
}

test("a consulta começa com 60 minutos no timer, em verde", () => {
  expect(timerDaConsulta(INICIO, decorrido(0))).toEqual({
    texto: "60:00",
    cor: "verde",
  });
});

test("acima de 15 minutos restantes o timer segue verde", () => {
  expect(timerDaConsulta(INICIO, decorrido(44, 59))).toEqual({
    texto: "15:01",
    cor: "verde",
  });
});

test("com 15 minutos restantes ou menos o timer fica amarelo", () => {
  expect(timerDaConsulta(INICIO, decorrido(45))).toEqual({
    texto: "15:00",
    cor: "amarela",
  });
  expect(timerDaConsulta(INICIO, decorrido(54, 59)).cor).toBe("amarela");
});

test("com 5 minutos restantes ou menos o timer fica vermelho", () => {
  expect(timerDaConsulta(INICIO, decorrido(55))).toEqual({
    texto: "05:00",
    cor: "vermelha",
  });
});

test("ao zerar, o timer mostra 00:00 em vermelho", () => {
  expect(timerDaConsulta(INICIO, decorrido(60))).toEqual({
    texto: "00:00",
    cor: "vermelha",
  });
});

test("depois de zerar, o timer conta o excedido em vermelho", () => {
  expect(timerDaConsulta(INICIO, decorrido(61, 23))).toEqual({
    texto: "+01:23",
    cor: "vermelha",
  });
});
