import { expect, test } from "vitest";
import {
  montarPaginaDeConsultas,
  type ParametrosListagemConsultas,
} from "./listagem-consultas";

let proximoId = 1;

function consulta(iniciadoEm: string, pacienteId = 1) {
  return { id: proximoId++, pacienteId, iniciadoEm };
}

function parametros(
  ajustes: Partial<ParametrosListagemConsultas> = {},
): ParametrosListagemConsultas {
  return { pacienteId: null, direcao: "desc", pagina: 1, ...ajustes };
}

function inicios(resultado: { itens: { iniciadoEm: string }[] }): string[] {
  return resultado.itens.map((item) => item.iniciadoEm);
}

test("ordena por data decrescente por padrão: a mais recente primeiro", () => {
  const consultas = [
    consulta("2026-08-01T14:00:00.000Z"),
    consulta("2026-08-08T14:00:00.000Z"),
    consulta("2026-08-05T09:00:00.000Z"),
  ];

  const resultado = montarPaginaDeConsultas(consultas, parametros());

  expect(inicios(resultado)).toEqual([
    "2026-08-08T14:00:00.000Z",
    "2026-08-05T09:00:00.000Z",
    "2026-08-01T14:00:00.000Z",
  ]);
});

test("direção crescente traz a mais antiga primeiro", () => {
  const consultas = [
    consulta("2026-08-08T14:00:00.000Z"),
    consulta("2026-08-01T14:00:00.000Z"),
  ];

  const resultado = montarPaginaDeConsultas(
    consultas,
    parametros({ direcao: "asc" }),
  );

  expect(inicios(resultado)).toEqual([
    "2026-08-01T14:00:00.000Z",
    "2026-08-08T14:00:00.000Z",
  ]);
});

test("filtra pelas consultas do paciente selecionado", () => {
  const consultas = [
    consulta("2026-08-01T14:00:00.000Z", 1),
    consulta("2026-08-02T14:00:00.000Z", 2),
    consulta("2026-08-03T14:00:00.000Z", 1),
  ];

  const resultado = montarPaginaDeConsultas(
    consultas,
    parametros({ pacienteId: 1 }),
  );

  expect(inicios(resultado)).toEqual([
    "2026-08-03T14:00:00.000Z",
    "2026-08-01T14:00:00.000Z",
  ]);
});

test("sem paciente selecionado, todas as consultas entram", () => {
  const consultas = [
    consulta("2026-08-01T14:00:00.000Z", 1),
    consulta("2026-08-02T14:00:00.000Z", 2),
  ];

  const resultado = montarPaginaDeConsultas(consultas, parametros());

  expect(resultado.itens).toHaveLength(2);
});

function consultasNumeradas(quantidade: number) {
  // Dias crescentes: a ordem decrescente devolve o dia mais alto primeiro.
  return Array.from({ length: quantidade }, (_, i) =>
    consulta(`2026-07-${String(i + 1).padStart(2, "0")}T14:00:00.000Z`),
  );
}

test("pagina de 10 em 10", () => {
  const consultas = consultasNumeradas(25);

  const primeira = montarPaginaDeConsultas(consultas, parametros());
  expect(primeira.itens).toHaveLength(10);
  expect(primeira.pagina).toBe(1);
  expect(primeira.totalPaginas).toBe(3);
  expect(inicios(primeira)[0]).toBe("2026-07-25T14:00:00.000Z");

  const ultima = montarPaginaDeConsultas(consultas, parametros({ pagina: 3 }));
  expect(ultima.itens).toHaveLength(5);
  expect(inicios(ultima)).toEqual([
    "2026-07-05T14:00:00.000Z",
    "2026-07-04T14:00:00.000Z",
    "2026-07-03T14:00:00.000Z",
    "2026-07-02T14:00:00.000Z",
    "2026-07-01T14:00:00.000Z",
  ]);
});

test("página fora do intervalo é trazida de volta para dentro dele", () => {
  const consultas = consultasNumeradas(25);

  const alemDoFim = montarPaginaDeConsultas(
    consultas,
    parametros({ pagina: 99 }),
  );
  expect(alemDoFim.pagina).toBe(3);

  const antesDoComeco = montarPaginaDeConsultas(
    consultas,
    parametros({ pagina: 0 }),
  );
  expect(antesDoComeco.pagina).toBe(1);
});

test("filtro e ordenação são aplicados antes da paginação", () => {
  const consultas = [
    ...consultasNumeradas(11),
    consulta("2026-08-30T14:00:00.000Z", 2),
  ];

  const resultado = montarPaginaDeConsultas(
    consultas,
    parametros({ pacienteId: 1, pagina: 2 }),
  );

  expect(inicios(resultado)).toEqual(["2026-07-01T14:00:00.000Z"]);
  expect(resultado.totalPaginas).toBe(2);
});

test("paciente sem consultas devolve página única e vazia", () => {
  const consultas = [consulta("2026-08-01T14:00:00.000Z", 1)];

  const resultado = montarPaginaDeConsultas(
    consultas,
    parametros({ pacienteId: 99 }),
  );

  expect(resultado.itens).toEqual([]);
  expect(resultado.pagina).toBe(1);
  expect(resultado.totalPaginas).toBe(1);
});

test("a listagem original não é alterada pela ordenação", () => {
  const consultas = [
    consulta("2026-08-01T14:00:00.000Z"),
    consulta("2026-08-08T14:00:00.000Z"),
  ];

  montarPaginaDeConsultas(consultas, parametros());

  expect(inicios({ itens: consultas })).toEqual([
    "2026-08-01T14:00:00.000Z",
    "2026-08-08T14:00:00.000Z",
  ]);
});
