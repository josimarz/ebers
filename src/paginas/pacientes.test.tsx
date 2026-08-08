import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { PaginaPacientes } from "./pacientes";

// Fronteira do sistema: o banco SQLite atrás do tauri-plugin-sql. O caminho
// página → listarPacientes → drizzle (sqlite-proxy) roda de verdade.
vi.mock("@tauri-apps/plugin-sql", () => import("@/testes/plugin-sql-vazio"));

test("sem pacientes cadastrados, a página mostra o estado vazio", async () => {
  render(<PaginaPacientes />);

  expect(
    await screen.findByText("Nenhum paciente cadastrado"),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Pacientes" }),
  ).toBeInTheDocument();
});
