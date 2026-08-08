import { expect, test } from "vitest";
import { mapearResultadoProxy } from "./proxy";

// Contrato entre o tauri-plugin-sql (linhas como objetos coluna→valor) e o
// drizzle sqlite-proxy (linhas como arrays de valores, na ordem das colunas).

test("all: converte cada linha em array de valores na ordem das colunas", () => {
  const linhas = [
    { id: 1, nome_completo: "Ana" },
    { id: 2, nome_completo: "Bia" },
  ];
  expect(mapearResultadoProxy("all", linhas)).toEqual({
    rows: [
      [1, "Ana"],
      [2, "Bia"],
    ],
  });
});

test("get: retorna somente a primeira linha, como array de valores", () => {
  const linhas = [{ id: 7, nome_completo: "Ana" }];
  expect(mapearResultadoProxy("get", linhas)).toEqual({ rows: [7, "Ana"] });
});

test("get sem resultado: retorna rows vazio", () => {
  expect(mapearResultadoProxy("get", [])).toEqual({ rows: [] });
});

test("values: converte como all", () => {
  expect(mapearResultadoProxy("values", [{ total: 0 }])).toEqual({
    rows: [[0]],
  });
});
