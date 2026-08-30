import { expect, test } from "vitest";
import {
  alternarOrdenacao,
  montarPaginaDePacientes,
  type ParametrosListagem,
} from "./listagem-pacientes";

function paciente(nomeCompleto: string, dataNascimento = "1990-01-01") {
  return { nomeCompleto, dataNascimento };
}

function parametros(
  ajustes: Partial<ParametrosListagem> = {},
): ParametrosListagem {
  return {
    busca: "",
    ordenacao: { coluna: "nome", direcao: "asc" },
    pagina: 1,
    ...ajustes,
  };
}

function nomes(resultado: { itens: { nomeCompleto: string }[] }): string[] {
  return resultado.itens.map((item) => item.nomeCompleto);
}

test("ordena por nome em pt-BR, ignorando acentos e caixa", () => {
  const pacientes = [
    paciente("Édson"),
    paciente("ana"),
    paciente("Bruno"),
    paciente("Álvaro"),
  ];

  const crescente = montarPaginaDePacientes(pacientes, parametros());
  expect(nomes(crescente)).toEqual(["Álvaro", "ana", "Bruno", "Édson"]);

  const decrescente = montarPaginaDePacientes(
    pacientes,
    parametros({ ordenacao: { coluna: "nome", direcao: "desc" } }),
  );
  expect(nomes(decrescente)).toEqual(["Édson", "Bruno", "ana", "Álvaro"]);
});

test("ordena por idade: crescente traz o mais novo primeiro", () => {
  const pacientes = [
    paciente("Ana", "1990-06-15"),
    paciente("Bia", "2010-02-01"),
    paciente("Carla", "2000-11-30"),
  ];

  const crescente = montarPaginaDePacientes(
    pacientes,
    parametros({ ordenacao: { coluna: "idade", direcao: "asc" } }),
  );
  expect(nomes(crescente)).toEqual(["Bia", "Carla", "Ana"]);

  const decrescente = montarPaginaDePacientes(
    pacientes,
    parametros({ ordenacao: { coluna: "idade", direcao: "desc" } }),
  );
  expect(nomes(decrescente)).toEqual(["Ana", "Carla", "Bia"]);
});

test("empate de idade é desempatado pelo nome", () => {
  const pacientes = [
    paciente("Zeca", "2000-05-05"),
    paciente("Ana", "2000-05-05"),
  ];

  const resultado = montarPaginaDePacientes(
    pacientes,
    parametros({ ordenacao: { coluna: "idade", direcao: "asc" } }),
  );
  expect(nomes(resultado)).toEqual(["Ana", "Zeca"]);
});

test("busca por nome ignora acentos e caixa, nos dois sentidos", () => {
  const pacientes = [
    paciente("José da Silva"),
    paciente("Joana"),
    paciente("Marcos"),
  ];

  const semAcento = montarPaginaDePacientes(
    pacientes,
    parametros({ busca: "jose" }),
  );
  expect(nomes(semAcento)).toEqual(["José da Silva"]);

  const comAcento = montarPaginaDePacientes(
    pacientes,
    parametros({ busca: "JOÃ" }),
  );
  expect(nomes(comAcento)).toEqual(["Joana"]);
});

test("busca casa com trecho no meio do nome e ignora espaços nas pontas", () => {
  const pacientes = [paciente("José da Silva"), paciente("Joana")];

  const resultado = montarPaginaDePacientes(
    pacientes,
    parametros({ busca: "  silva " }),
  );
  expect(nomes(resultado)).toEqual(["José da Silva"]);
});

function pacientesNumerados(quantidade: number) {
  return Array.from({ length: quantidade }, (_, i) =>
    paciente(`Paciente ${String(i + 1).padStart(2, "0")}`),
  );
}

test("pagina de 10 em 10", () => {
  const pacientes = pacientesNumerados(25);

  const primeira = montarPaginaDePacientes(pacientes, parametros());
  expect(primeira.itens).toHaveLength(10);
  expect(primeira.pagina).toBe(1);
  expect(primeira.totalPaginas).toBe(3);

  const ultima = montarPaginaDePacientes(pacientes, parametros({ pagina: 3 }));
  expect(ultima.itens).toHaveLength(5);
  expect(nomes(ultima)).toEqual([
    "Paciente 21",
    "Paciente 22",
    "Paciente 23",
    "Paciente 24",
    "Paciente 25",
  ]);
});

test("página fora do intervalo é trazida de volta para dentro dele", () => {
  const pacientes = pacientesNumerados(25);

  const alemDoFim = montarPaginaDePacientes(
    pacientes,
    parametros({ pagina: 99 }),
  );
  expect(alemDoFim.pagina).toBe(3);
  expect(alemDoFim.itens).toHaveLength(5);

  const antesDoComeco = montarPaginaDePacientes(
    pacientes,
    parametros({ pagina: 0 }),
  );
  expect(antesDoComeco.pagina).toBe(1);
});

test("busca sem correspondência devolve página única e vazia", () => {
  const pacientes = [paciente("Ana"), paciente("Bruno")];

  const resultado = montarPaginaDePacientes(
    pacientes,
    parametros({ busca: "zulmira" }),
  );
  expect(resultado.itens).toEqual([]);
  expect(resultado.pagina).toBe(1);
  expect(resultado.totalPaginas).toBe(1);
});

test("busca e ordenação são aplicadas antes da paginação", () => {
  const pacientes = [paciente("Fulano"), ...pacientesNumerados(11)];

  const resultado = montarPaginaDePacientes(
    pacientes,
    parametros({ busca: "paciente", pagina: 2 }),
  );
  expect(nomes(resultado)).toEqual(["Paciente 11"]);
  expect(resultado.totalPaginas).toBe(2);
});

test("clicar noutra coluna ordena por ela, crescente", () => {
  expect(
    alternarOrdenacao({ coluna: "nome", direcao: "desc" }, "idade"),
  ).toEqual({ coluna: "idade", direcao: "asc" });
});

test("clicar na coluna já ordenada inverte a direção", () => {
  expect(alternarOrdenacao({ coluna: "nome", direcao: "asc" }, "nome")).toEqual(
    { coluna: "nome", direcao: "desc" },
  );
  expect(
    alternarOrdenacao({ coluna: "idade", direcao: "desc" }, "idade"),
  ).toEqual({ coluna: "idade", direcao: "asc" });
});

test("a listagem original não é alterada pela ordenação", () => {
  const pacientes = [paciente("Zeca"), paciente("Ana")];

  montarPaginaDePacientes(pacientes, parametros());

  expect(nomes({ itens: pacientes })).toEqual(["Zeca", "Ana"]);
});
