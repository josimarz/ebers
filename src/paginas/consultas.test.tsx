import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useParams } from "react-router";
import { beforeEach, expect, test, vi } from "vitest";
import type { Consulta } from "@/db/consultas";
import { reiniciarComandosFalsos } from "@/testes/comandos-falsos";
import { consultaAberta, linhaDeConsulta } from "@/testes/fixtures-consulta";
import {
  dadosPacienteValidos,
  linhaDePaciente,
} from "@/testes/fixtures-paciente";
import {
  enfileirarSelect,
  reiniciarBancoFalso,
} from "@/testes/plugin-sql-falso";
import { PaginaConsultas } from "./consultas";

// Fronteiras do sistema: o banco SQLite atrás do tauri-plugin-sql e o comando
// Tauri que lê fotos. O caminho página → listarConsultas → drizzle roda de
// verdade.
vi.mock("@tauri-apps/plugin-sql", () => import("@/testes/plugin-sql-falso"));
vi.mock("@tauri-apps/api/core", () => import("@/testes/comandos-falsos"));

beforeEach(() => {
  reiniciarBancoFalso();
  reiniciarComandosFalsos();
  proximoId = 1;
});

let proximoId = 1;

/** Instante ISO construído em hora local — expectativas valem em qualquer fuso. */
function iso(dia: number, hora: number, minuto = 0): string {
  return new Date(2026, 7, dia, hora, minuto).toISOString();
}

function consultaNaListagem(ajustes: Partial<Consulta> = {}) {
  return linhaDeConsulta(
    consultaAberta({ id: proximoId++, iniciadoEm: iso(8, 14), ...ajustes }),
  );
}

/**
 * A página carrega consultas e pacientes, nesta ordem — a mesma dos selects
 * enfileirados.
 */
function programarCarga(consultas: unknown[], pacientes: unknown[] = []) {
  enfileirarSelect(consultas as Parameters<typeof enfileirarSelect>[0]);
  enfileirarSelect(pacientes as Parameters<typeof enfileirarSelect>[0]);
}

function pacienteAna() {
  return linhaDePaciente({ id: 1, ...dadosPacienteValidos() });
}

function renderizarPagina() {
  return render(
    <MemoryRouter>
      <PaginaConsultas />
    </MemoryRouter>,
  );
}

test("sem consultas registradas, a página mostra o estado vazio", async () => {
  programarCarga([]);
  renderizarPagina();

  expect(
    await screen.findByText("Nenhuma consulta registrada"),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Consultas" }),
  ).toBeInTheDocument();
});

test("a tabela tem as colunas da spec, na ordem", async () => {
  programarCarga([consultaNaListagem()], [pacienteAna()]);
  renderizarPagina();

  await screen.findByText("08/08/2026");
  const cabecalhos = screen
    .getAllByRole("columnheader")
    .map((cabecalho) => cabecalho.textContent);
  expect(cabecalhos).toEqual([
    "Foto",
    "Paciente",
    "Data",
    "Início",
    "Fim",
    "Status",
    "Pago",
  ]);
});

test("consulta Aberta vira uma linha com data, início, fim vazio e Pago Não", async () => {
  programarCarga(
    [consultaNaListagem({ iniciadoEm: iso(8, 14, 30) })],
    [pacienteAna()],
  );
  renderizarPagina();

  const linha = (await screen.findByText("08/08/2026")).closest("tr");
  expect(linha).not.toBeNull();
  const celulas = within(linha as HTMLElement)
    .getAllByRole("cell")
    .map((celula) => celula.textContent);
  expect(celulas).toEqual([
    "",
    "Ana Lima",
    "08/08/2026",
    "14:30",
    "—",
    "Aberta",
    "Não",
  ]);
});

test("consulta Finalizada e paga mostra o fim e Pago Sim", async () => {
  programarCarga(
    [
      consultaNaListagem({
        iniciadoEm: iso(8, 14),
        finalizadoEm: iso(8, 15, 5),
        status: "Finalizada",
        pago: true,
        pagoEm: iso(8, 15),
        origemPagamento: "Direto",
      }),
    ],
    [pacienteAna()],
  );
  renderizarPagina();

  const linha = (await screen.findByText("08/08/2026")).closest("tr");
  const celulas = within(linha as HTMLElement)
    .getAllByRole("cell")
    .map((celula) => celula.textContent);
  expect(celulas).toEqual([
    "",
    "Ana Lima",
    "08/08/2026",
    "14:00",
    "15:05",
    "Finalizada",
    "Sim",
  ]);
});

test("consultas Canceladas aparecem normalmente na listagem", async () => {
  programarCarga(
    [
      consultaNaListagem({ iniciadoEm: iso(7, 10) }),
      consultaNaListagem({ iniciadoEm: iso(8, 14), status: "Cancelada" }),
    ],
    [pacienteAna()],
  );
  renderizarPagina();

  const linha = (await screen.findByText("Cancelada")).closest("tr");
  expect(linha).not.toBeNull();
  expect(datasExibidas()).toHaveLength(2);
});

/** Uma coluna das linhas do corpo da tabela, na ordem exibida. */
function colunaExibida(indice: number): string[] {
  const corpo = screen.getAllByRole("rowgroup")[1];
  return within(corpo)
    .getAllByRole("row")
    .map(
      (linha) => within(linha).getAllByRole("cell")[indice].textContent ?? "",
    );
}

/** Coluna Data das linhas, na ordem exibida. */
function datasExibidas(): string[] {
  return colunaExibida(2);
}

test("cada linha mostra o nome do paciente da consulta", async () => {
  programarCarga(
    [
      consultaNaListagem({ pacienteId: 2, iniciadoEm: iso(7, 10) }),
      consultaNaListagem({ pacienteId: 1, iniciadoEm: iso(8, 14) }),
    ],
    [pacienteAna(), pacienteBruno()],
  );
  renderizarPagina();

  await screen.findByText("08/08/2026");
  expect(colunaExibida(1)).toEqual(["Ana Lima", "Bruno Castro"]);
});

test("a listagem nasce ordenada da mais recente para a mais antiga; clicar em Data inverte", async () => {
  const terapeuta = userEvent.setup();
  programarCarga(
    [
      consultaNaListagem({ iniciadoEm: iso(1, 9) }),
      consultaNaListagem({ iniciadoEm: iso(8, 14) }),
      consultaNaListagem({ iniciadoEm: iso(5, 11) }),
    ],
    [pacienteAna()],
  );
  renderizarPagina();

  await screen.findByText("08/08/2026");
  expect(datasExibidas()).toEqual(["08/08/2026", "05/08/2026", "01/08/2026"]);
  expect(screen.getByRole("columnheader", { name: "Data" })).toHaveAttribute(
    "aria-sort",
    "descending",
  );

  await terapeuta.click(screen.getByRole("button", { name: "Data" }));

  expect(datasExibidas()).toEqual(["01/08/2026", "05/08/2026", "08/08/2026"]);
  expect(screen.getByRole("columnheader", { name: "Data" })).toHaveAttribute(
    "aria-sort",
    "ascending",
  );
});

function pacienteBruno() {
  return linhaDePaciente({
    id: 2,
    ...dadosPacienteValidos({
      nomeCompleto: "Bruno Castro",
      cpf: "12345678909",
    }),
  });
}

test("o filtro sugere pacientes conforme a digitação, ignorando acentos e caixa", async () => {
  const terapeuta = userEvent.setup();
  programarCarga([consultaNaListagem()], [pacienteAna(), pacienteBruno()]);
  renderizarPagina();
  await screen.findByText("08/08/2026");

  await terapeuta.type(
    screen.getByRole("combobox", { name: "Filtrar por paciente" }),
    "BRU",
  );

  expect(
    screen.getByRole("option", { name: "Bruno Castro" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("option", { name: "Ana Lima" }),
  ).not.toBeInTheDocument();
});

test("as sugestões do filtro vêm em ordem alfabética", async () => {
  const terapeuta = userEvent.setup();
  programarCarga([consultaNaListagem()], [pacienteBruno(), pacienteAna()]);
  renderizarPagina();
  await screen.findByText("08/08/2026");

  await terapeuta.click(
    screen.getByRole("combobox", { name: "Filtrar por paciente" }),
  );

  const opcoes = screen
    .getAllByRole("option")
    .map((opcao) => opcao.textContent);
  expect(opcoes).toEqual(["Ana Lima", "Bruno Castro"]);
});

test("selecionar um paciente filtra a listagem; limpar volta a listar todas", async () => {
  const terapeuta = userEvent.setup();
  programarCarga(
    [
      consultaNaListagem({ pacienteId: 1, iniciadoEm: iso(8, 14) }),
      consultaNaListagem({ pacienteId: 2, iniciadoEm: iso(7, 10) }),
    ],
    [pacienteAna(), pacienteBruno()],
  );
  renderizarPagina();
  await screen.findByText("08/08/2026");

  await terapeuta.click(
    screen.getByRole("combobox", { name: "Filtrar por paciente" }),
  );
  await terapeuta.click(screen.getByRole("option", { name: "Bruno Castro" }));

  expect(datasExibidas()).toEqual(["07/08/2026"]);
  expect(
    screen.getByRole("combobox", { name: "Filtrar por paciente" }),
  ).toHaveValue("Bruno Castro");

  await terapeuta.click(screen.getByRole("button", { name: "Limpar filtro" }));

  expect(datasExibidas()).toEqual(["08/08/2026", "07/08/2026"]);
});

test("aberta com ?paciente= na URL, a listagem nasce filtrada nesse paciente", async () => {
  programarCarga(
    [
      consultaNaListagem({ pacienteId: 1, iniciadoEm: iso(8, 14) }),
      consultaNaListagem({ pacienteId: 2, iniciadoEm: iso(7, 10) }),
    ],
    [pacienteAna(), pacienteBruno()],
  );
  render(
    <MemoryRouter initialEntries={["/consultas?paciente=2"]}>
      <PaginaConsultas />
    </MemoryRouter>,
  );

  await screen.findByText("07/08/2026");
  expect(datasExibidas()).toEqual(["07/08/2026"]);
  expect(
    screen.getByRole("combobox", { name: "Filtrar por paciente" }),
  ).toHaveValue("Bruno Castro");
});

test("paciente selecionado sem consultas explica o resultado vazio", async () => {
  const terapeuta = userEvent.setup();
  programarCarga(
    [consultaNaListagem({ pacienteId: 1 })],
    [pacienteAna(), pacienteBruno()],
  );
  renderizarPagina();
  await screen.findByText("08/08/2026");

  await terapeuta.click(
    screen.getByRole("combobox", { name: "Filtrar por paciente" }),
  );
  await terapeuta.click(screen.getByRole("option", { name: "Bruno Castro" }));

  expect(screen.getByText("Nenhuma consulta encontrada")).toBeInTheDocument();
  expect(
    screen.getByText("O paciente selecionado não tem consultas registradas."),
  ).toBeInTheDocument();
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
});

function onzeConsultas() {
  // Dias crescentes de agosto: a ordem padrão exibe o dia 11 primeiro.
  return Array.from({ length: 11 }, (_, i) =>
    consultaNaListagem({ iniciadoEm: iso(i + 1, 14) }),
  );
}

test("a listagem é paginada de 10 em 10", async () => {
  const terapeuta = userEvent.setup();
  programarCarga(onzeConsultas(), [pacienteAna()]);
  renderizarPagina();
  await screen.findByText("11/08/2026");

  expect(datasExibidas()).toHaveLength(10);
  expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();

  await terapeuta.click(screen.getByRole("button", { name: "Próxima" }));

  expect(datasExibidas()).toEqual(["01/08/2026"]);
  expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Próxima" })).toBeDisabled();

  await terapeuta.click(screen.getByRole("button", { name: "Anterior" }));

  expect(datasExibidas()).toHaveLength(10);
  expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
});

test("selecionar um paciente volta para a primeira página", async () => {
  const terapeuta = userEvent.setup();
  programarCarga(onzeConsultas(), [pacienteAna()]);
  renderizarPagina();
  await screen.findByText("11/08/2026");

  await terapeuta.click(screen.getByRole("button", { name: "Próxima" }));
  expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();

  await terapeuta.click(
    screen.getByRole("combobox", { name: "Filtrar por paciente" }),
  );
  await terapeuta.click(screen.getByRole("option", { name: "Ana Lima" }));

  expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
  expect(datasExibidas()).toHaveLength(10);
});

function PaginaConsultaStub() {
  const { id } = useParams();
  return <p>Consulta {id} em tela</p>;
}

test("clicar na linha abre a página da consulta", async () => {
  const terapeuta = userEvent.setup();
  programarCarga([consultaNaListagem({ id: 7 })], [pacienteAna()]);
  render(
    <MemoryRouter initialEntries={["/consultas"]}>
      <Routes>
        <Route path="/consultas" element={<PaginaConsultas />} />
        <Route path="/consultas/:id" element={<PaginaConsultaStub />} />
      </Routes>
    </MemoryRouter>,
  );

  await terapeuta.click(await screen.findByText("08/08/2026"));

  expect(await screen.findByText("Consulta 7 em tela")).toBeInTheDocument();
});

test("a linha também abre a consulta pelo teclado, com Enter", async () => {
  const terapeuta = userEvent.setup();
  programarCarga([consultaNaListagem({ id: 7 })], [pacienteAna()]);
  render(
    <MemoryRouter initialEntries={["/consultas"]}>
      <Routes>
        <Route path="/consultas" element={<PaginaConsultas />} />
        <Route path="/consultas/:id" element={<PaginaConsultaStub />} />
      </Routes>
    </MemoryRouter>,
  );

  const linha = (await screen.findByText("08/08/2026")).closest("tr");
  (linha as HTMLElement).focus();
  await terapeuta.keyboard("{Enter}");

  expect(await screen.findByText("Consulta 7 em tela")).toBeInTheDocument();
});
