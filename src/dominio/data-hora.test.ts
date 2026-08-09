import { expect, test } from "vitest";
import { formatarData, formatarHora } from "./data-hora";

// As entradas são construídas em hora local e convertidas para ISO — o mesmo
// caminho dos registros reais — para as expectativas valerem em qualquer fuso.

test("formatarData exibe a data local como dd/mm/aaaa", () => {
  const iso = new Date(2026, 7, 8, 14, 30).toISOString();

  expect(formatarData(iso)).toBe("08/08/2026");
});

test("formatarData preenche dia e mês com zero à esquerda", () => {
  const iso = new Date(2026, 0, 5, 9, 0).toISOString();

  expect(formatarData(iso)).toBe("05/01/2026");
});

test("formatarHora exibe a hora local como HH:MM", () => {
  const iso = new Date(2026, 7, 8, 14, 30).toISOString();

  expect(formatarHora(iso)).toBe("14:30");
});

test("formatarHora preenche hora e minuto com zero à esquerda", () => {
  const iso = new Date(2026, 7, 8, 9, 5).toISOString();

  expect(formatarHora(iso)).toBe("09:05");
});
