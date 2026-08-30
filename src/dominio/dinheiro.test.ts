import { expect, test } from "vitest";
import { formatarReais, parsearReais } from "./dinheiro";

test("interpreta valores em reais no formato pt-BR, em centavos", () => {
  expect(parsearReais("250,00")).toBe(25000);
  expect(parsearReais("250")).toBe(25000);
  expect(parsearReais("250,5")).toBe(25050);
  expect(parsearReais("1.234,56")).toBe(123456);
  expect(parsearReais(" 180 ")).toBe(18000);
});

test("rejeita entradas que não são um valor em reais", () => {
  expect(parsearReais("")).toBeNull();
  expect(parsearReais("abc")).toBeNull();
  expect(parsearReais("12,345")).toBeNull();
  expect(parsearReais("-50")).toBeNull();
  expect(parsearReais("1,2,3")).toBeNull();
});

test("formata centavos como reais em pt-BR", () => {
  expect(formatarReais(25000)).toBe("250,00");
  expect(formatarReais(123456)).toBe("1.234,56");
  expect(formatarReais(25050)).toBe("250,50");
});
