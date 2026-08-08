import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { expect, test, vi } from "vitest";
import { Rotas } from "@/rotas";

vi.mock("@tauri-apps/plugin-sql", () => import("@/testes/plugin-sql-vazio"));

function renderizarApp(caminho = "/") {
  return render(
    <MemoryRouter initialEntries={[caminho]}>
      <Rotas />
    </MemoryRouter>,
  );
}

test("abre na página Pacientes, com estado vazio vindo do banco", async () => {
  renderizarApp();

  expect(
    await screen.findByRole("heading", { name: "Pacientes" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Nenhum paciente cadastrado")).toBeInTheDocument();
});

test("a sidebar tem as seções Pacientes, Consultas e Financeiro", async () => {
  renderizarApp();

  await screen.findByRole("heading", { name: "Pacientes" });
  const menu = screen.getByRole("navigation", { name: "Menu principal" });
  expect(within(menu).getByRole("link", { name: "Pacientes" })).toHaveAttribute(
    "href",
    "/pacientes",
  );
  expect(within(menu).getByRole("link", { name: "Consultas" })).toHaveAttribute(
    "href",
    "/consultas",
  );
  expect(
    within(menu).getByRole("link", { name: "Financeiro" }),
  ).toHaveAttribute("href", "/financeiro");
});

test("o cabeçalho traz o breadcrumb da seção atual", async () => {
  renderizarApp("/consultas");

  const breadcrumb = await screen.findByRole("navigation", {
    name: "Trilha de navegação",
  });
  expect(within(breadcrumb).getByText("Ebers")).toBeInTheDocument();
  expect(within(breadcrumb).getByText("Consultas")).toBeInTheDocument();
});

test("o rodapé está presente", async () => {
  renderizarApp();

  await screen.findByRole("heading", { name: "Pacientes" });
  expect(screen.getByRole("contentinfo")).toHaveTextContent("Ebers");
});
