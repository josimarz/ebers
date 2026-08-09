import { expect, test } from "vitest";
import type { StatusConsulta } from "./consulta";
import { montarLinhasFinanceiras } from "./financeiro";

let proximoId = 1;

function paciente(nomeCompleto: string) {
  return { id: proximoId++, nomeCompleto };
}

function consulta(pacienteId: number, status: StatusConsulta, pago = false) {
  return { pacienteId, status, pago };
}

test("consultas feitas contam só as Finalizadas; pagas, só as Finalizadas com Pago", () => {
  const ana = paciente("Ana Lima");
  const consultas = [
    consulta(ana.id, "Finalizada", true),
    consulta(ana.id, "Finalizada"),
    // Aberta paga por Crédito: ainda não é feita nem paga.
    consulta(ana.id, "Aberta", true),
    consulta(ana.id, "Cancelada"),
  ];

  const [linha] = montarLinhasFinanceiras([ana], consultas, new Map(), null);

  expect(linha.feitas).toBe(2);
  expect(linha.pagas).toBe(1);
});

test("pagas < feitas marca a Pendência financeira; contas em dia não", () => {
  const ana = paciente("Ana Lima");
  const bruno = paciente("Bruno Castro");
  const clara = paciente("Clara Dias");
  const consultas = [
    consulta(ana.id, "Finalizada", true),
    consulta(ana.id, "Finalizada"),
    consulta(bruno.id, "Finalizada", true),
  ];

  const linhas = montarLinhasFinanceiras(
    [ana, bruno, clara],
    consultas,
    new Map(),
    null,
  );

  const porNome = new Map(
    linhas.map((linha) => [linha.paciente.nomeCompleto, linha.pendencia]),
  );
  expect(porNome.get("Ana Lima")).toBe(true);
  expect(porNome.get("Bruno Castro")).toBe(false);
  expect(porNome.get("Clara Dias")).toBe(false);
});

function nomes(linhas: { paciente: { nomeCompleto: string } }[]): string[] {
  return linhas.map((linha) => linha.paciente.nomeCompleto);
}

test("ordena pela maior diferença entre feitas e pagas; empate vai por nome", () => {
  const carla = paciente("Carla Nunes");
  const bia = paciente("Bia Rocha");
  const alice = paciente("Alice Prado");
  const consultas = [
    // Carla: 2 feitas, 0 pagas → diferença 2.
    consulta(carla.id, "Finalizada"),
    consulta(carla.id, "Finalizada"),
    // Bia: 1 feita, 0 pagas → diferença 1.
    consulta(bia.id, "Finalizada"),
    // Alice: 1 feita, 1 paga → diferença 0, empatada com quem não tem consultas.
    consulta(alice.id, "Finalizada", true),
  ];
  const zeca = paciente("Zeca Moura");

  const linhas = montarLinhasFinanceiras(
    [zeca, alice, bia, carla],
    consultas,
    new Map(),
    null,
  );

  expect(nomes(linhas)).toEqual([
    "Carla Nunes",
    "Bia Rocha",
    "Alice Prado",
    "Zeca Moura",
  ]);
});

test("com um paciente selecionado, só a linha dele entra; null lista todos", () => {
  const ana = paciente("Ana Lima");
  const bruno = paciente("Bruno Castro");

  const todas = montarLinhasFinanceiras([ana, bruno], [], new Map(), null);
  expect(nomes(todas)).toEqual(["Ana Lima", "Bruno Castro"]);

  const soBruno = montarLinhasFinanceiras(
    [ana, bruno],
    [],
    new Map(),
    bruno.id,
  );
  expect(nomes(soBruno)).toEqual(["Bruno Castro"]);
});

test("Créditos vem do saldo do paciente; sem movimentos, zero", () => {
  const ana = paciente("Ana Lima");
  const bruno = paciente("Bruno Castro");

  const linhas = montarLinhasFinanceiras(
    [ana, bruno],
    [],
    new Map([[ana.id, 3]]),
    null,
  );

  const porNome = new Map(
    linhas.map((linha) => [linha.paciente.nomeCompleto, linha.creditos]),
  );
  expect(porNome.get("Ana Lima")).toBe(3);
  expect(porNome.get("Bruno Castro")).toBe(0);
});

test("a lista original de pacientes não é reordenada", () => {
  const zeca = paciente("Zeca Moura");
  const ana = paciente("Ana Lima");
  const pacientes = [zeca, ana];
  const consultas = [consulta(ana.id, "Finalizada")];

  montarLinhasFinanceiras(pacientes, consultas, new Map(), null);

  expect(pacientes.map((p) => p.nomeCompleto)).toEqual([
    "Zeca Moura",
    "Ana Lima",
  ]);
});
