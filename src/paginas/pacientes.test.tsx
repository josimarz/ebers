import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, expect, test, vi } from "vitest";
import {
  dadosPacienteValidos,
  linhaDePaciente,
} from "@/testes/fixtures-paciente";
import {
  enfileirarSelect,
  reiniciarBancoFalso,
} from "@/testes/plugin-sql-falso";
import { PaginaPacientes } from "./pacientes";

// Fronteira do sistema: o banco SQLite atrás do tauri-plugin-sql. O caminho
// página → listarPacientes → drizzle (sqlite-proxy) roda de verdade.
vi.mock("@tauri-apps/plugin-sql", () => import("@/testes/plugin-sql-falso"));

beforeEach(reiniciarBancoFalso);

function renderizarPagina() {
  return render(
    <MemoryRouter>
      <PaginaPacientes />
    </MemoryRouter>,
  );
}

test("sem pacientes cadastrados, a página mostra o estado vazio", async () => {
  renderizarPagina();

  expect(
    await screen.findByText("Nenhum paciente cadastrado"),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Pacientes" }),
  ).toBeInTheDocument();
});

test("a página oferece o cadastro de novo paciente", async () => {
  renderizarPagina();

  expect(
    await screen.findByRole("link", { name: "Novo Paciente" }),
  ).toHaveAttribute("href", "/pacientes/novo");
});

test("pacientes cadastrados aparecem com a ação Editar", async () => {
  enfileirarSelect([
    linhaDePaciente({ id: 1, ...dadosPacienteValidos() }),
    linhaDePaciente({
      id: 2,
      ...dadosPacienteValidos({
        nomeCompleto: "Bia Souza",
        cpf: "12345678909",
      }),
    }),
  ]);
  renderizarPagina();

  expect(await screen.findByText("Ana Lima")).toBeInTheDocument();
  expect(screen.getByText("Bia Souza")).toBeInTheDocument();

  const linha = screen.getByText("Ana Lima").closest("li");
  expect(linha).not.toBeNull();
  expect(
    within(linha as HTMLElement).getByRole("link", { name: "Editar" }),
  ).toHaveAttribute("href", "/pacientes/1/editar");
});
