import { beforeEach, expect, test, vi } from "vitest";
import {
  dadosPacienteValidos,
  linhaDePaciente,
} from "@/testes/fixtures-paciente";
import {
  chamadas,
  enfileirarSelect,
  reiniciarBancoFalso,
} from "@/testes/plugin-sql-falso";
import {
  atualizarPaciente,
  buscarPaciente,
  CpfJaCadastradoError,
  criarPaciente,
} from "./pacientes";

// Fronteira do sistema: o SQLite atrás do tauri-plugin-sql. O caminho
// pacientes → drizzle (sqlite-proxy) roda de verdade sobre o dublê.
vi.mock("@tauri-apps/plugin-sql", () => import("@/testes/plugin-sql-falso"));

beforeEach(reiniciarBancoFalso);

test("criarPaciente confere o CPF e insere o registro", async () => {
  enfileirarSelect([{ total: 0 }]);

  await criarPaciente(dadosPacienteValidos());

  expect(chamadas).toHaveLength(2);
  const [conferencia, insercao] = chamadas;
  expect(conferencia.sql).toMatch(/select count/i);
  expect(conferencia.valores).toEqual(["52998224725"]);
  expect(insercao.sql).toMatch(/insert into "pacientes"/i);
  expect(insercao.valores).toContain("Ana Lima");
  expect(insercao.valores).toContain(25000);
});

test("criarPaciente com CPF já existente falha sem inserir nada", async () => {
  enfileirarSelect([{ total: 1 }]);

  await expect(criarPaciente(dadosPacienteValidos())).rejects.toBeInstanceOf(
    CpfJaCadastradoError,
  );

  expect(chamadas).toHaveLength(1);
  expect(chamadas[0].sql).toMatch(/select count/i);
});

test("atualizarPaciente ignora o próprio id ao conferir o CPF", async () => {
  enfileirarSelect([{ total: 0 }]);

  await atualizarPaciente(7, dadosPacienteValidos());

  expect(chamadas).toHaveLength(2);
  const [conferencia, atualizacao] = chamadas;
  expect(conferencia.valores).toEqual(["52998224725", 7]);
  expect(atualizacao.sql).toMatch(/update "pacientes" set/i);
  expect(atualizacao.valores).toContain(7);
  expect(atualizacao.valores).toContain("Ana Lima");
});

test("atualizarPaciente para o CPF de outro paciente falha sem atualizar", async () => {
  enfileirarSelect([{ total: 1 }]);

  await expect(
    atualizarPaciente(7, dadosPacienteValidos()),
  ).rejects.toBeInstanceOf(CpfJaCadastradoError);

  expect(chamadas).toHaveLength(1);
});

test("buscarPaciente devolve o registro decodificado pelo drizzle", async () => {
  enfileirarSelect([
    linhaDePaciente({ id: 7, ...dadosPacienteValidos({ jaFezTerapia: true }) }),
  ]);

  const paciente = await buscarPaciente(7);

  expect(paciente?.id).toBe(7);
  expect(paciente?.nomeCompleto).toBe("Ana Lima");
  expect(paciente?.jaFezTerapia).toBe(true);
  expect(paciente?.tomaMedicamento).toBe(false);
  expect(chamadas[0].valores).toEqual([7, 1]);
});

test("buscarPaciente sem registro devolve undefined", async () => {
  enfileirarSelect([]);

  expect(await buscarPaciente(99)).toBeUndefined();
});
