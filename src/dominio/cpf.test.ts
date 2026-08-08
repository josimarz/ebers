import { expect, test } from "vitest";
import { formatarCpf, validarCpf } from "./cpf";

// CPFs de exemplo com dígitos verificadores corretos (calculados pela
// regra da Receita: pesos 10..2 e 11..2, resto < 2 → 0, senão 11 − resto).
test("aceita CPF válido com máscara", () => {
  expect(validarCpf("529.982.247-25")).toBe(true);
});

test("aceita CPF válido só com dígitos", () => {
  expect(validarCpf("12345678909")).toBe(true);
});

test("rejeita CPF com dígito verificador errado", () => {
  expect(validarCpf("529.982.247-24")).toBe(false);
  expect(validarCpf("12345678908")).toBe(false);
});

test("rejeita sequência de dígitos repetidos, mesmo com verificadores aritmeticamente corretos", () => {
  expect(validarCpf("111.111.111-11")).toBe(false);
  expect(validarCpf("00000000000")).toBe(false);
});

test("formata 11 dígitos com a máscara de CPF", () => {
  expect(formatarCpf("52998224725")).toBe("529.982.247-25");
  expect(formatarCpf("529.982.247-25")).toBe("529.982.247-25");
});

test("deixa intacto o que não tem 11 dígitos", () => {
  expect(formatarCpf("1234")).toBe("1234");
  expect(formatarCpf("")).toBe("");
});

test("rejeita tamanho errado e entrada sem dígitos", () => {
  expect(validarCpf("529.982.247-2")).toBe(false);
  expect(validarCpf("529.982.247-255")).toBe(false);
  expect(validarCpf("")).toBe(false);
  expect(validarCpf("abc")).toBe(false);
});
