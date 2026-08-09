import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { Consulta } from "@/db/consultas";
import { reiniciarComandosFalsos } from "@/testes/comandos-falsos";
import { consultaAberta, linhaDeConsulta } from "@/testes/fixtures-consulta";
import {
  dadosPacienteValidos,
  linhaDePaciente,
} from "@/testes/fixtures-paciente";
import {
  chamadas,
  enfileirarSelect,
  reiniciarBancoFalso,
} from "@/testes/plugin-sql-falso";
import { PaginaConsulta } from "./consulta";

// Fronteiras do sistema: o banco SQLite atrás do tauri-plugin-sql e o comando
// Tauri que lê fotos. O caminho página → consultas/pacientes → drizzle roda
// de verdade.
vi.mock("@tauri-apps/plugin-sql", () => import("@/testes/plugin-sql-falso"));
vi.mock("@tauri-apps/api/core", () => import("@/testes/comandos-falsos"));

const AGORA_ISO = "2026-08-08T14:00:00.000Z";

beforeEach(() => {
  reiniciarBancoFalso();
  reiniciarComandosFalsos();
  // Timers falsos por inteiro: o timer da consulta e o salvamento automático
  // andam com vi.advanceTimersByTime; a carga da página é liberada com um
  // act assíncrono (só microtarefas), então findBy*/waitFor não são usados.
  vi.useFakeTimers();
  vi.setSystemTime(new Date(AGORA_ISO));
});

afterEach(() => {
  vi.useRealTimers();
});

/** Programa a carga da página: a consulta 3 do paciente 7 (Ana Lima). */
function carregarConsulta(ajustes: Partial<Consulta> = {}) {
  enfileirarSelect([
    linhaDeConsulta(
      consultaAberta({
        id: 3,
        pacienteId: 7,
        iniciadoEm: AGORA_ISO,
        ...ajustes,
      }),
    ),
  ]);
  enfileirarSelect([linhaDePaciente({ id: 7, ...dadosPacienteValidos() })]);
}

async function renderizarPagina() {
  const tela = render(
    <MemoryRouter initialEntries={["/consultas/3"]}>
      <Routes>
        <Route path="/consultas/:id" element={<PaginaConsulta />} />
      </Routes>
    </MemoryRouter>,
  );
  await act(async () => {});
  return tela;
}

/** user-event dirigindo os timers falsos do teste. */
function terapeutaComTimersFalsos() {
  return userEvent.setup({
    advanceTimers: (ms) => vi.advanceTimersByTime(ms),
  });
}

test("o cabeçalho traz nome, idade e timer verde; Conteúdo e Notas vêm carregados", async () => {
  carregarConsulta({ conteudo: "Relato até aqui", notas: "Hipóteses" });
  await renderizarPagina();

  expect(screen.getByRole("heading", { name: "Ana Lima" })).toBeInTheDocument();
  expect(screen.getByText("36 anos")).toBeInTheDocument();

  const timer = screen.getByLabelText("Timer da consulta");
  expect(timer).toHaveTextContent("60:00");
  expect(timer).toHaveClass("text-chart-2");

  expect(screen.getByLabelText("Conteúdo")).toHaveValue("Relato até aqui");
  expect(screen.getByLabelText("Notas")).toHaveValue("Hipóteses");
  expect(
    screen.getByRole("button", { name: "Finalizar Consulta" }),
  ).toBeInTheDocument();
});

test("consulta inexistente explica a ausência", async () => {
  enfileirarSelect([]);
  await renderizarPagina();

  expect(screen.getByText("Consulta não encontrada.")).toBeInTheDocument();
});

/** Avança o relógio e os timers, drenando efeitos e promessas pendentes. */
async function passar(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

test("o timer amarela nos 15 minutos finais, avermelha nos 5 e conta o excedido", async () => {
  carregarConsulta();
  await renderizarPagina();
  const timer = () => screen.getByLabelText("Timer da consulta");

  await passar(45 * 60 * 1000); // 45 min decorridos
  expect(timer()).toHaveTextContent("15:00");
  expect(timer()).toHaveClass("text-chart-3");

  await passar(10 * 60 * 1000); // 55 min decorridos
  expect(timer()).toHaveTextContent("05:00");
  expect(timer()).toHaveClass("text-destructive");

  await passar(6 * 60 * 1000 + 23 * 1000); // 1h01min23s decorridos
  expect(timer()).toHaveTextContent("+01:23");
  expect(timer()).toHaveClass("text-destructive");
});

function atualizacoesDe(coluna: "conteudo" | "notas") {
  const padrao = new RegExp(`update "consultas" set "${coluna}"`, "i");
  return chamadas.filter((chamada) => padrao.test(chamada.sql));
}

test("a pausa na digitação salva o Conteúdo sozinho, sem botão Salvar", async () => {
  const terapeuta = terapeutaComTimersFalsos();
  carregarConsulta();
  await renderizarPagina();

  await terapeuta.type(screen.getByLabelText("Conteúdo"), "Relato de hoje");
  expect(atualizacoesDe("conteudo")).toHaveLength(0); // ainda digitando

  await passar(600);

  expect(atualizacoesDe("conteudo")).toHaveLength(1);
  expect(atualizacoesDe("conteudo")[0].valores).toEqual([
    "Relato de hoje",
    3,
    "Cancelada",
  ]);
  expect(
    screen.queryByRole("button", { name: "Salvar" }),
  ).not.toBeInTheDocument();
});

test("a pausa na digitação também salva as Notas, de forma independente", async () => {
  const terapeuta = terapeutaComTimersFalsos();
  carregarConsulta();
  await renderizarPagina();

  await terapeuta.type(screen.getByLabelText("Notas"), "Hipóteses");
  await passar(600);

  expect(atualizacoesDe("notas")).toHaveLength(1);
  expect(atualizacoesDe("notas")[0].valores).toEqual([
    "Hipóteses",
    3,
    "Cancelada",
  ]);
  expect(atualizacoesDe("conteudo")).toHaveLength(0);
});

test("digitação contínua não adia o salvamento além da espera máxima", async () => {
  const terapeuta = terapeutaComTimersFalsos();
  carregarConsulta();
  await renderizarPagina();
  const conteudo = () => screen.getByLabelText("Conteúdo");

  // Uma tecla a cada 500 ms: nunca há pausa de 600 ms, mas aos 2 s da
  // primeira alteração o texto pendente é gravado mesmo assim.
  await terapeuta.type(conteudo(), "a");
  await passar(500);
  await terapeuta.type(conteudo(), "b");
  await passar(500);
  await terapeuta.type(conteudo(), "c");
  await passar(500);
  await terapeuta.type(conteudo(), "d");
  expect(atualizacoesDe("conteudo")).toHaveLength(0);

  await passar(500); // 2 s desde o "a"

  expect(atualizacoesDe("conteudo")).toHaveLength(1);
  expect(atualizacoesDe("conteudo")[0].valores).toEqual([
    "abcd",
    3,
    "Cancelada",
  ]);
});

test("sair da página no meio da pausa grava o texto pendente na hora", async () => {
  const terapeuta = terapeutaComTimersFalsos();
  carregarConsulta();
  const tela = await renderizarPagina();

  await terapeuta.type(screen.getByLabelText("Conteúdo"), "Última frase");
  expect(atualizacoesDe("conteudo")).toHaveLength(0); // pausa ainda correndo

  tela.unmount();
  await act(async () => {});

  expect(atualizacoesDe("conteudo")).toHaveLength(1);
  expect(atualizacoesDe("conteudo")[0].valores).toEqual([
    "Última frase",
    3,
    "Cancelada",
  ]);
});

test("Finalizar Consulta grava o novo status e a página passa a Finalizada", async () => {
  const terapeuta = terapeutaComTimersFalsos();
  carregarConsulta();
  await renderizarPagina();

  await terapeuta.click(
    screen.getByRole("button", { name: "Finalizar Consulta" }),
  );
  await passar(0); // drena a gravação e a re-renderização do cabeçalho

  const atualizacoes = chamadas.filter((chamada) =>
    /update "consultas" set/i.test(chamada.sql),
  );
  expect(atualizacoes).toHaveLength(1);
  expect(atualizacoes[0].valores).toEqual([
    AGORA_ISO,
    "Finalizada",
    3,
    "Aberta",
  ]);

  // O cabeçalho troca timer e ação pelo status; os textos seguem editáveis.
  expect(screen.getByText("Finalizada")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Finalizar Consulta" }),
  ).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Timer da consulta")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Conteúdo")).toBeEnabled();
  expect(screen.getByLabelText("Notas")).toBeEnabled();
});

test("consulta Cancelada é somente leitura, sem timer e sem ações", async () => {
  carregarConsulta({ status: "Cancelada" });
  await renderizarPagina();

  expect(screen.getByText("Cancelada")).toBeInTheDocument();
  expect(screen.getByLabelText("Conteúdo")).toBeDisabled();
  expect(screen.getByLabelText("Notas")).toBeDisabled();
  expect(
    screen.queryByRole("button", { name: "Finalizar Consulta" }),
  ).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Timer da consulta")).not.toBeInTheDocument();
});
