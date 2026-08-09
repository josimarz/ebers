import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import {
  linhaDeMovimento,
  movimentoDoExtrato,
} from "@/testes/fixtures-movimento";
import {
  dadosPacienteValidos,
  linhaDePaciente,
} from "@/testes/fixtures-paciente";
import {
  chamadas,
  enfileirarSelect,
  reiniciarBancoFalso,
} from "@/testes/plugin-sql-falso";
import { ModalCreditos } from "./modal-creditos";

// Fronteira do sistema: o SQLite atrás do tauri-plugin-sql. O caminho
// modal → db → drizzle roda de verdade sobre o dublê.
vi.mock("@tauri-apps/plugin-sql", () => import("@/testes/plugin-sql-falso"));

beforeEach(reiniciarBancoFalso);

/** Instante ISO construído em hora local — expectativas valem em qualquer fuso. */
function iso(dia: number, hora: number): string {
  return new Date(2026, 7, dia, hora).toISOString();
}

function renderizarModal(
  props: Partial<Parameters<typeof ModalCreditos>[0]> = {},
) {
  return render(
    <ModalCreditos
      paciente={{
        id: 7,
        nomeCompleto: "Ana Lima",
        valorConsultaCentavos: 25000,
      }}
      aoFechar={vi.fn()}
      aoMudarSaldo={vi.fn()}
      {...props}
    />,
  );
}

/** Células das linhas do extrato, na ordem exibida. */
function linhasDoExtrato(): string[][] {
  const corpo = screen.getAllByRole("rowgroup")[1];
  return within(corpo)
    .getAllByRole("row")
    .map((linha) =>
      within(linha)
        .getAllByRole("cell")
        .map((celula) => celula.textContent ?? ""),
    );
}

test("mostra o saldo derivado do extrato e as linhas do mais recente ao mais antigo", async () => {
  enfileirarSelect([
    linhaDeMovimento(
      movimentoDoExtrato({
        id: 1,
        tipo: "Venda",
        quantidade: 3,
        ocorridoEm: iso(6, 10),
        valorUnitarioCentavos: 25000,
      }),
    ),
    linhaDeMovimento(
      movimentoDoExtrato({
        id: 2,
        tipo: "Consumo",
        quantidade: -1,
        ocorridoEm: iso(7, 15),
        consultaIniciadaEm: iso(7, 15),
        valorUnitarioCentavos: null,
      }),
    ),
  ]);
  renderizarModal();

  expect(await screen.findByText("2 créditos")).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Créditos de Ana Lima" }),
  ).toBeInTheDocument();
  expect(
    screen
      .getAllByRole("columnheader")
      .map((cabecalho) => cabecalho.textContent),
  ).toEqual(["Data/hora", "Tipo", "Quantidade", "Referência"]);
  expect(linhasDoExtrato()).toEqual([
    ["07/08/2026 15:00", "Consumo", "-1", "Consulta de 07/08/2026 15:00"],
    ["06/08/2026 10:00", "Venda", "+3", "R$ 250,00 por crédito"],
  ]);
});

test("sem movimentos, mostra saldo zero e o estado vazio do extrato", async () => {
  enfileirarSelect([]);
  renderizarModal();

  expect(await screen.findByText("0 créditos")).toBeInTheDocument();
  expect(screen.getByText("Nenhum movimento de crédito.")).toBeInTheDocument();
});

test("vender mostra o total (quantidade × Valor da consulta) e registra a Venda", async () => {
  const terapeuta = userEvent.setup();
  const aoMudarSaldo = vi.fn();
  enfileirarSelect([]);
  renderizarModal({ aoMudarSaldo });
  await screen.findByText("0 créditos");

  await terapeuta.type(screen.getByLabelText("Quantidade a vender"), "3");
  expect(screen.getByText("Total: R$ 750,00")).toBeInTheDocument();

  // A confirmação relê o paciente (valor vigente), insere a Venda e o modal
  // recarrega o extrato.
  enfileirarSelect([linhaDePaciente({ id: 7, ...dadosPacienteValidos() })]);
  enfileirarSelect([
    linhaDeMovimento(movimentoDoExtrato({ id: 1, quantidade: 3 })),
  ]);
  await terapeuta.click(screen.getByRole("button", { name: "Vender" }));

  expect(await screen.findByText("3 créditos")).toBeInTheDocument();
  expect(aoMudarSaldo).toHaveBeenCalledWith(3);
  const insercoes = chamadas.filter((chamada) => /insert/i.test(chamada.sql));
  expect(insercoes).toHaveLength(1);
  expect(insercoes[0].valores).toEqual([
    7,
    "Venda",
    3,
    expect.any(String),
    25000,
  ]);
});

test("com quantidade inválida, Vender fica desabilitado e sem total", async () => {
  const terapeuta = userEvent.setup();
  enfileirarSelect([]);
  renderizarModal();
  await screen.findByText("0 créditos");

  const botao = screen.getByRole("button", { name: "Vender" });
  expect(botao).toBeDisabled();

  await terapeuta.type(screen.getByLabelText("Quantidade a vender"), "0");
  expect(botao).toBeDisabled();
  expect(screen.queryByText(/^Total:/)).not.toBeInTheDocument();
});

test("ajustar exige motivo: mostra o erro e não grava nada", async () => {
  const terapeuta = userEvent.setup();
  enfileirarSelect([
    linhaDeMovimento(movimentoDoExtrato({ id: 1, quantidade: 2 })),
  ]);
  renderizarModal();
  await screen.findByText("2 créditos");

  await terapeuta.type(screen.getByLabelText("Quantidade do ajuste"), "-1");
  await terapeuta.click(screen.getByRole("button", { name: "Ajustar" }));

  expect(
    await screen.findByText("Informe o motivo do ajuste."),
  ).toBeInTheDocument();
  expect(
    chamadas.filter((chamada) => /insert/i.test(chamada.sql)),
  ).toHaveLength(0);
});

test("ajuste que deixaria o saldo negativo é bloqueado sem gravar", async () => {
  const terapeuta = userEvent.setup();
  enfileirarSelect([
    linhaDeMovimento(movimentoDoExtrato({ id: 1, quantidade: 2 })),
  ]);
  renderizarModal();
  await screen.findByText("2 créditos");

  await terapeuta.type(screen.getByLabelText("Quantidade do ajuste"), "-3");
  await terapeuta.type(screen.getByLabelText("Motivo"), "Correção");
  await terapeuta.click(screen.getByRole("button", { name: "Ajustar" }));

  expect(
    await screen.findByText("O ajuste deixaria o saldo negativo."),
  ).toBeInTheDocument();
  expect(
    chamadas.filter((chamada) => /insert/i.test(chamada.sql)),
  ).toHaveLength(0);
});

test("ajuste válido grava o motivo, atualiza o extrato e avisa o novo saldo", async () => {
  const terapeuta = userEvent.setup();
  const aoMudarSaldo = vi.fn();
  enfileirarSelect([
    linhaDeMovimento(movimentoDoExtrato({ id: 1, quantidade: 2 })),
  ]);
  renderizarModal({ aoMudarSaldo });
  await screen.findByText("2 créditos");

  await terapeuta.type(screen.getByLabelText("Quantidade do ajuste"), "-1");
  await terapeuta.type(screen.getByLabelText("Motivo"), "Cortesia");
  // ajustarCreditos re-deriva o saldo no banco; depois o modal recarrega.
  enfileirarSelect([{ saldo: 2 }]);
  enfileirarSelect([
    linhaDeMovimento(
      movimentoDoExtrato({
        id: 2,
        tipo: "Ajuste",
        quantidade: -1,
        motivo: "Cortesia",
        valorUnitarioCentavos: null,
        ocorridoEm: iso(8, 16),
      }),
    ),
    linhaDeMovimento(movimentoDoExtrato({ id: 1, quantidade: 2 })),
  ]);
  await terapeuta.click(screen.getByRole("button", { name: "Ajustar" }));

  expect(await screen.findByText("1 crédito")).toBeInTheDocument();
  expect(aoMudarSaldo).toHaveBeenCalledWith(1);
  expect(screen.getByText("Cortesia")).toBeInTheDocument();
  const insercoes = chamadas.filter((chamada) => /insert/i.test(chamada.sql));
  expect(insercoes).toHaveLength(1);
  expect(insercoes[0].valores).toEqual([
    7,
    "Ajuste",
    -1,
    expect.any(String),
    "Cortesia",
  ]);
});

test("Fechar aciona aoFechar", async () => {
  const terapeuta = userEvent.setup();
  const aoFechar = vi.fn();
  enfileirarSelect([]);
  renderizarModal({ aoFechar });
  await screen.findByText("0 créditos");

  await terapeuta.click(screen.getByRole("button", { name: "Fechar" }));

  expect(aoFechar).toHaveBeenCalled();
});
