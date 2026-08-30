import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, expect, test, vi } from "vitest";
import { reiniciarComandosFalsos } from "@/testes/comandos-falsos";
import { consultaAberta, linhaDeConsulta } from "@/testes/fixtures-consulta";
import {
  linhaDeMovimento,
  movimentoDoExtrato,
} from "@/testes/fixtures-movimento";
import {
  dadosPacienteValidos,
  linhaDePaciente,
} from "@/testes/fixtures-paciente";
import {
  enfileirarSelect,
  reiniciarBancoFalso,
} from "@/testes/plugin-sql-falso";
import { PaginaConsultas } from "./consultas";
import { PaginaFinanceiro } from "./financeiro";

// Fronteiras do sistema: o banco SQLite atrás do tauri-plugin-sql e o comando
// Tauri que lê fotos. O caminho página → db → drizzle roda de verdade.
vi.mock("@tauri-apps/plugin-sql", () => import("@/testes/plugin-sql-falso"));
vi.mock("@tauri-apps/api/core", () => import("@/testes/comandos-falsos"));

beforeEach(() => {
  reiniciarBancoFalso();
  reiniciarComandosFalsos();
  proximoId = 1;
});

let proximoId = 1;

function paciente(id: number, nomeCompleto: string) {
  return linhaDePaciente({
    id,
    ...dadosPacienteValidos({ nomeCompleto, cpf: String(id) }),
  });
}

/** Consulta Finalizada do paciente — uma "feita"; paga conta em "pagas". */
function finalizada(pacienteId: number, pago: boolean) {
  return linhaDeConsulta(
    consultaAberta({
      id: proximoId++,
      pacienteId,
      status: "Finalizada",
      finalizadoEm: "2026-08-08T15:00:00.000Z",
      pago,
      pagoEm: pago ? "2026-08-08T15:00:00.000Z" : null,
      origemPagamento: pago ? "Direto" : null,
    }),
  );
}

/**
 * A página carrega pacientes, consultas e saldos de créditos, nesta ordem —
 * a mesma dos selects enfileirados.
 */
function programarCarga(
  pacientes: unknown[],
  consultas: unknown[] = [],
  saldos: unknown[] = [],
) {
  enfileirarSelect(pacientes as Parameters<typeof enfileirarSelect>[0]);
  enfileirarSelect(consultas as Parameters<typeof enfileirarSelect>[0]);
  enfileirarSelect(saldos as Parameters<typeof enfileirarSelect>[0]);
}

function renderizarPagina() {
  return render(
    <MemoryRouter>
      <PaginaFinanceiro />
    </MemoryRouter>,
  );
}

test("sem pacientes cadastrados, a página mostra o estado vazio", async () => {
  programarCarga([]);
  renderizarPagina();

  expect(
    await screen.findByText("Nenhum paciente cadastrado"),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Financeiro" }),
  ).toBeInTheDocument();
});

test("a tabela tem as colunas da spec, na ordem", async () => {
  programarCarga([paciente(1, "Ana Lima")]);
  renderizarPagina();

  await screen.findByText("Ana Lima");
  const cabecalhos = screen
    .getAllByRole("columnheader")
    .map((cabecalho) => cabecalho.textContent);
  expect(cabecalhos).toEqual([
    "Foto",
    "Nome",
    "Consultas feitas",
    "Consultas pagas",
    "Créditos",
    "Ações",
  ]);
});

test("pagas < feitas destaca a linha em vermelho: Pendência financeira", async () => {
  programarCarga(
    [paciente(1, "Ana Lima"), paciente(2, "Bruno Castro")],
    [finalizada(1, false), finalizada(2, true)],
  );
  renderizarPagina();

  const linhaAna = (await screen.findByText("Ana Lima")).closest("tr");
  expect(linhaAna).toHaveClass("bg-destructive/10");

  const linhaBruno = screen.getByText("Bruno Castro").closest("tr");
  expect(linhaBruno).not.toHaveClass("bg-destructive/10");
});

/** Coluna Nome das linhas do corpo da tabela, na ordem exibida. */
function nomesExibidos(): string[] {
  const corpo = screen.getAllByRole("rowgroup")[1];
  return within(corpo)
    .getAllByRole("row")
    .map((linha) => within(linha).getAllByRole("cell")[1].textContent ?? "");
}

test("a listagem nasce ordenada pela maior diferença entre feitas e pagas", async () => {
  programarCarga(
    [paciente(1, "Ana Lima"), paciente(2, "Bruno Castro"), paciente(3, "Zé")],
    [
      // Ana: diferença 1; Bruno: diferença 2; Zé: em dia.
      finalizada(1, true),
      finalizada(1, false),
      finalizada(2, false),
      finalizada(2, false),
      finalizada(3, true),
    ],
  );
  renderizarPagina();

  await screen.findByText("Ana Lima");
  expect(nomesExibidos()).toEqual(["Bruno Castro", "Ana Lima", "Zé"]);
});

test("feitas conta só Finalizadas, pagas só Finalizadas pagas; Créditos traz o saldo", async () => {
  programarCarga(
    [paciente(1, "Ana Lima")],
    [
      finalizada(1, true),
      finalizada(1, true),
      finalizada(1, false),
      // Aberta paga por Crédito e Cancelada: fora das duas contagens.
      linhaDeConsulta(
        consultaAberta({
          id: proximoId++,
          pacienteId: 1,
          pago: true,
          pagoEm: "2026-08-08T14:00:00.000Z",
          origemPagamento: "Crédito",
        }),
      ),
      linhaDeConsulta(
        consultaAberta({ id: proximoId++, pacienteId: 1, status: "Cancelada" }),
      ),
    ],
    [{ paciente_id: 1, saldo: 5 }],
  );
  renderizarPagina();

  const linha = (await screen.findByText("Ana Lima")).closest("tr");
  expect(linha).not.toBeNull();
  const celulas = within(linha as HTMLElement)
    .getAllByRole("cell")
    .map((celula) => celula.textContent);
  expect(celulas).toEqual([
    "",
    "Ana Lima",
    "3",
    "2",
    "5",
    "Listar consultasAcessar cadastroCréditos",
  ]);
});

test("selecionar um paciente no filtro deixa só a linha dele; limpar volta a todos", async () => {
  const terapeuta = userEvent.setup();
  programarCarga([paciente(1, "Ana Lima"), paciente(2, "Bruno Castro")]);
  renderizarPagina();
  await screen.findByText("Ana Lima");

  await terapeuta.click(
    screen.getByRole("combobox", { name: "Filtrar por paciente" }),
  );
  await terapeuta.click(screen.getByRole("option", { name: "Bruno Castro" }));

  expect(nomesExibidos()).toEqual(["Bruno Castro"]);

  await terapeuta.click(screen.getByRole("button", { name: "Limpar filtro" }));

  expect(nomesExibidos()).toEqual(["Ana Lima", "Bruno Castro"]);
});

test("Acessar cadastro leva ao formulário de edição do paciente", async () => {
  programarCarga([paciente(7, "Ana Lima")]);
  renderizarPagina();

  const linha = (await screen.findByText("Ana Lima")).closest("tr");
  expect(
    within(linha as HTMLElement).getByRole("link", {
      name: "Acessar cadastro",
    }),
  ).toHaveAttribute("href", "/pacientes/7/editar");
});

/** Instante ISO construído em hora local — expectativas valem em qualquer fuso. */
function iso(dia: number, hora: number): string {
  return new Date(2026, 7, dia, hora).toISOString();
}

test("Créditos abre o modal com o saldo e o extrato do paciente", async () => {
  const terapeuta = userEvent.setup();
  programarCarga([paciente(7, "Ana Lima")], [], [{ paciente_id: 7, saldo: 2 }]);
  renderizarPagina();
  const linha = (await screen.findByText("Ana Lima")).closest("tr");

  // O modal carrega o extrato do paciente ao abrir.
  enfileirarSelect([
    linhaDeMovimento(movimentoDoExtrato({ id: 1, quantidade: 2 })),
  ]);
  await terapeuta.click(
    within(linha as HTMLElement).getByRole("button", { name: "Créditos" }),
  );

  expect(
    await screen.findByRole("heading", { name: "Créditos de Ana Lima" }),
  ).toBeInTheDocument();
  expect(await screen.findByText("2 créditos")).toBeInTheDocument();
});

test("a venda no modal atualiza a coluna Créditos da listagem", async () => {
  const terapeuta = userEvent.setup();
  programarCarga([paciente(7, "Ana Lima")], [], [{ paciente_id: 7, saldo: 2 }]);
  renderizarPagina();
  const linha = (await screen.findByText("Ana Lima")).closest("tr");

  enfileirarSelect([
    linhaDeMovimento(movimentoDoExtrato({ id: 1, quantidade: 2 })),
  ]);
  await terapeuta.click(
    within(linha as HTMLElement).getByRole("button", { name: "Créditos" }),
  );
  await screen.findByText("2 créditos");

  await terapeuta.type(screen.getByLabelText("Quantidade a vender"), "1");
  // A venda relê o paciente, insere e o modal recarrega o extrato.
  enfileirarSelect([paciente(7, "Ana Lima")]);
  enfileirarSelect([
    linhaDeMovimento(movimentoDoExtrato({ id: 1, quantidade: 2 })),
    linhaDeMovimento(movimentoDoExtrato({ id: 2, quantidade: 1 })),
  ]);
  await terapeuta.click(screen.getByRole("button", { name: "Vender" }));
  await screen.findByText("3 créditos");

  await terapeuta.click(screen.getByRole("button", { name: "Fechar" }));

  const celulas = within(
    (screen.getByText("Ana Lima").closest("tr") as HTMLElement) ??
      document.body,
  )
    .getAllByRole("cell")
    .map((celula) => celula.textContent);
  expect(celulas[4]).toBe("3");
});

test("Listar consultas abre a listagem de consultas já filtrada no paciente", async () => {
  const terapeuta = userEvent.setup();
  programarCarga(
    [paciente(1, "Ana Lima"), paciente(2, "Bruno Castro")],
    [finalizada(2, false)],
  );
  // A navegação monta a listagem de consultas, que carrega consultas e
  // pacientes, nesta ordem.
  enfileirarSelect([
    linhaDeConsulta(
      consultaAberta({ id: 51, pacienteId: 1, iniciadoEm: iso(8, 14) }),
    ),
    linhaDeConsulta(
      consultaAberta({ id: 52, pacienteId: 2, iniciadoEm: iso(7, 10) }),
    ),
  ]);
  enfileirarSelect([paciente(1, "Ana Lima"), paciente(2, "Bruno Castro")]);

  render(
    <MemoryRouter initialEntries={["/financeiro"]}>
      <Routes>
        <Route path="/financeiro" element={<PaginaFinanceiro />} />
        <Route path="/consultas" element={<PaginaConsultas />} />
      </Routes>
    </MemoryRouter>,
  );

  const linhaBruno = (await screen.findByText("Bruno Castro")).closest("tr");
  await terapeuta.click(
    within(linhaBruno as HTMLElement).getByRole("link", {
      name: "Listar consultas",
    }),
  );

  expect(await screen.findByText("07/08/2026")).toBeInTheDocument();
  expect(screen.queryByText("08/08/2026")).not.toBeInTheDocument();
  expect(
    screen.getByRole("combobox", { name: "Filtrar por paciente" }),
  ).toHaveValue("Bruno Castro");
});
