import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Rotas } from "@/rotas";
import { reiniciarComandosFalsos } from "@/testes/comandos-falsos";
import { fetchFalso, reiniciarFetchFalso } from "@/testes/fetch-falso";
import { encerrarModoDesktop, simularModoDesktop } from "@/testes/modo-desktop";
import { reiniciarBancoFalso } from "@/testes/plugin-sql-falso";

vi.mock("@tauri-apps/plugin-sql", () => import("@/testes/plugin-sql-falso"));
vi.mock("@tauri-apps/api/core", () => import("@/testes/comandos-falsos"));
vi.stubGlobal("fetch", fetchFalso);

beforeEach(() => {
  reiniciarFetchFalso();
  reiniciarBancoFalso();
  reiniciarComandosFalsos();
});

afterEach(encerrarModoDesktop);

function renderizarRotas(rota: string) {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Rotas />
    </MemoryRouter>,
  );
}

test("sem window.__TAURI__, qualquer caminho cai no Auto-cadastro, sem menu", () => {
  renderizarRotas("/pacientes");

  expect(
    screen.getByRole("heading", { name: "Auto-cadastro" }),
  ).toBeInTheDocument();
  expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});

test("no app desktop (window.__TAURI__), as seções e o menu continuam lá", async () => {
  simularModoDesktop();
  renderizarRotas("/pacientes");

  expect(
    await screen.findByRole("navigation", { name: "Menu principal" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Pacientes" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "Auto-cadastro" }),
  ).not.toBeInTheDocument();
});
