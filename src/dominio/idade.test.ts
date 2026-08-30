import { expect, test } from "vitest";
import { calcularIdade } from "./idade";

test("calcula a idade quando o aniversário já passou no ano", () => {
  expect(calcularIdade("2000-01-15", "2026-08-08")).toBe(26);
});

test("desconta um ano quando o aniversário ainda não chegou", () => {
  expect(calcularIdade("2000-12-25", "2026-08-08")).toBe(25);
  expect(calcularIdade("2008-08-09", "2026-08-08")).toBe(17);
});

test("no dia do aniversário, a idade já conta como completada", () => {
  expect(calcularIdade("2008-08-08", "2026-08-08")).toBe(18);
});
