import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Rotas } from "@/rotas";
import {
  programarComando,
  reiniciarComandosFalsos,
} from "@/testes/comandos-falsos";
import { encerrarModoDesktop, simularModoDesktop } from "@/testes/modo-desktop";

vi.mock("@tauri-apps/plugin-sql", () => import("@/testes/plugin-sql-vazio"));
vi.mock("@tauri-apps/api/core", () => import("@/testes/comandos-falsos"));

// Estas telas são o Modo desktop: o layout só aparece dentro do webview do app.
beforeEach(() => {
  simularModoDesktop();
  reiniciarComandosFalsos();
});
afterEach(encerrarModoDesktop);

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

test("as rotas de cadastro e edição de paciente vivem dentro do layout", async () => {
  renderizarApp("/pacientes/novo");

  expect(
    await screen.findByRole("heading", { name: "Novo Paciente" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("navigation", { name: "Menu principal" }),
  ).toBeInTheDocument();
});

test("o rodapé está presente", async () => {
  renderizarApp();

  await screen.findByRole("heading", { name: "Pacientes" });
  expect(screen.getByRole("contentinfo")).toHaveTextContent("Ebers");
});

test("o cabeçalho tem o botão Auto-cadastro, que abre a modal com o QR code", async () => {
  programarComando("endereco_auto_cadastro", {
    estado: "no-ar",
    url: "http://192.168.0.10:8738",
  });
  renderizarApp("/consultas");
  await screen.findByRole("heading", { name: "Consultas" });

  await userEvent.click(screen.getByRole("button", { name: "Auto-cadastro" }));

  expect(
    await screen.findByRole("dialog", { name: "Auto-cadastro no tablet" }),
  ).toBeInTheDocument();
  expect(
    await screen.findByText("http://192.168.0.10:8738"),
  ).toBeInTheDocument();
});

test("reabrir a modal consulta o endereço de novo", async () => {
  // A máquina trocou de rede entre uma abertura e outra.
  programarComando("endereco_auto_cadastro", {
    estado: "no-ar",
    url: "http://192.168.0.10:8738",
  });
  programarComando("endereco_auto_cadastro", {
    estado: "no-ar",
    url: "http://10.0.0.4:8738",
  });
  renderizarApp();
  await screen.findByRole("heading", { name: "Pacientes" });

  await userEvent.click(screen.getByRole("button", { name: "Auto-cadastro" }));
  await screen.findByText("http://192.168.0.10:8738");
  await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
  await userEvent.click(screen.getByRole("button", { name: "Auto-cadastro" }));

  expect(await screen.findByText("http://10.0.0.4:8738")).toBeInTheDocument();
  expect(
    screen.queryByText("http://192.168.0.10:8738"),
  ).not.toBeInTheDocument();
});
