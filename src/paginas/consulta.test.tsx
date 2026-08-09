import { act, render, screen, within } from "@testing-library/react";
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
  carregarConsulta({
    conteudo: "Relato até aqui",
    notas: "<p>Hipóteses</p>",
  });
  await renderizarPagina();

  expect(screen.getByRole("heading", { name: "Ana Lima" })).toBeInTheDocument();
  expect(screen.getByText("36 anos")).toBeInTheDocument();

  const timer = screen.getByLabelText("Timer da consulta");
  expect(timer).toHaveTextContent("60:00");
  expect(timer).toHaveClass("text-chart-2");

  expect(screen.getByLabelText("Conteúdo")).toHaveValue("Relato até aqui");
  expect(screen.getByLabelText("Notas")).toHaveTextContent("Hipóteses");
  expect(
    screen.getByRole("button", { name: "Finalizar Consulta" }),
  ).toBeInTheDocument();
});

test("as Notas re-renderizam fielmente o HTML salvo", async () => {
  carregarConsulta({
    notas:
      '<h2>Plano</h2><p><strong>Respiração</strong> e <span style="color: rgb(220, 38, 38)">exposição</span></p>',
  });
  await renderizarPagina();

  const notas = screen.getByLabelText("Notas");
  expect(
    within(notas).getByRole("heading", { level: 2, name: "Plano" }),
  ).toBeInTheDocument();
  expect(within(notas).getByText("Respiração").tagName).toBe("STRONG");
  expect(within(notas).getByText("exposição")).toHaveStyle({
    color: "rgb(220, 38, 38)",
  });
});

test("notas de texto plano (anteriores ao editor) viram parágrafos fiéis", async () => {
  // Consultas gravadas antes do editor guardavam as Notas como texto plano de
  // um textarea: quebras de linha e sinais como < e & entravam literais.
  carregarConsulta({ notas: "Relatou <muita> ansiedade & medo\nSegue tensa" });
  await renderizarPagina();

  const notas = screen.getByLabelText("Notas");
  expect(
    within(notas).getByText("Relatou <muita> ansiedade & medo"),
  ).toBeInTheDocument();
  expect(within(notas).getByText("Segue tensa")).toBeInTheDocument();
});

test("sair da página com Notas pendentes também grava na hora", async () => {
  const terapeuta = terapeutaComTimersFalsos();
  carregarConsulta();
  const tela = await renderizarPagina();

  await terapeuta.type(screen.getByLabelText("Notas"), "Hipóteses");
  expect(atualizacoesDe("notas")).toHaveLength(0); // pausa ainda correndo

  tela.unmount();
  await act(async () => {});

  expect(atualizacoesDe("notas")).toHaveLength(1);
  expect(atualizacoesDe("notas")[0].valores[0]).toBe("<p>Hipóteses</p>");
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

test("a pausa na digitação também salva as Notas como HTML, de forma independente", async () => {
  const terapeuta = terapeutaComTimersFalsos();
  carregarConsulta();
  await renderizarPagina();

  await terapeuta.type(screen.getByLabelText("Notas"), "Hipóteses");
  await passar(600);

  expect(atualizacoesDe("notas")).toHaveLength(1);
  expect(atualizacoesDe("notas")[0].valores).toEqual([
    "<p>Hipóteses</p>",
    3,
    "Cancelada",
  ]);
  expect(atualizacoesDe("conteudo")).toHaveLength(0);
});

test("Negrito, Itálico, Sublinhado e Riscado marcam o que se digita e acendem no toolbar", async () => {
  const terapeuta = terapeutaComTimersFalsos();
  carregarConsulta();
  await renderizarPagina();
  const notas = screen.getByLabelText("Notas");
  const botao = (nome: string) => screen.getByRole("button", { name: nome });

  // A terapeuta põe o cursor no texto e liga as marcas pelo toolbar; os
  // botões seguram o foco no editor (mousedown cancelado), então o que ela
  // digita em seguida sai marcado.
  await terapeuta.click(notas);
  expect(botao("Negrito")).toHaveAttribute("aria-pressed", "false");
  await terapeuta.click(botao("Negrito"));
  await terapeuta.click(botao("Itálico"));
  await terapeuta.click(botao("Sublinhado"));
  await terapeuta.click(botao("Riscado"));
  expect(botao("Negrito")).toHaveAttribute("aria-pressed", "true");
  expect(botao("Riscado")).toHaveAttribute("aria-pressed", "true");

  await terapeuta.type(notas, "tudo", { skipClick: true });
  await passar(600);

  expect(atualizacoesDe("notas")).toHaveLength(1);
  expect(atualizacoesDe("notas")[0].valores[0]).toBe(
    "<p><strong><em><s><u>tudo</u></s></em></strong></p>",
  );
});

test("o seletor de título transforma o bloco em h1–h6 e volta a texto normal", async () => {
  const terapeuta = terapeutaComTimersFalsos();
  carregarConsulta({ notas: "<p>Plano de exposição</p>" });
  await renderizarPagina();
  const titulo = () => screen.getByLabelText("Título");

  await terapeuta.selectOptions(titulo(), "Título 2");
  await passar(600);

  // O <p></p> final é o parágrafo vazio que o editor mantém após um título,
  // para haver onde clicar e seguir escrevendo.
  expect(atualizacoesDe("notas")[0].valores[0]).toBe(
    "<h2>Plano de exposição</h2><p></p>",
  );
  expect(titulo()).toHaveValue("2");

  await terapeuta.selectOptions(titulo(), "Texto normal");
  await passar(600);

  expect(atualizacoesDe("notas")[1].valores[0]).toBe(
    "<p>Plano de exposição</p><p></p>",
  );
  expect(titulo()).toHaveValue("0");
});

test("o seletor de tamanho da fonte aplica o tamanho ao que se digita", async () => {
  const terapeuta = terapeutaComTimersFalsos();
  carregarConsulta();
  await renderizarPagina();
  const notas = screen.getByLabelText("Notas");

  await terapeuta.selectOptions(
    screen.getByLabelText("Tamanho da fonte"),
    "18",
  );
  await terapeuta.click(notas); // volta o cursor ao texto
  await terapeuta.type(notas, "foco", { skipClick: true });
  await passar(600);

  expect(atualizacoesDe("notas")[0].valores[0]).toBe(
    '<p><span style="font-size: 18px;">foco</span></p>',
  );
});

test("as cores básicas colorem o que se digita; a cor padrão volta ao normal", async () => {
  const terapeuta = terapeutaComTimersFalsos();
  carregarConsulta();
  await renderizarPagina();
  const notas = screen.getByLabelText("Notas");

  await terapeuta.click(notas);
  await terapeuta.click(screen.getByRole("button", { name: "Cor vermelha" }));
  await terapeuta.type(notas, "alerta", { skipClick: true });
  await passar(600);

  expect(atualizacoesDe("notas")[0].valores[0]).toBe(
    '<p><span style="color: rgb(220, 38, 38);">alerta</span></p>',
  );

  await terapeuta.click(screen.getByRole("button", { name: "Cor padrão" }));
  await terapeuta.type(notas, " ok", { skipClick: true });
  await passar(600);

  expect(atualizacoesDe("notas")[1].valores[0]).toBe(
    '<p><span style="color: rgb(220, 38, 38);">alerta</span> ok</p>',
  );
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
  // toBeEnabled passaria em qualquer div; a editabilidade do editor está no
  // atributo contenteditable.
  expect(screen.getByLabelText("Notas")).toHaveAttribute(
    "contenteditable",
    "true",
  );
});

test("consulta Cancelada é somente leitura, sem timer e sem ações", async () => {
  carregarConsulta({ status: "Cancelada" });
  await renderizarPagina();

  expect(screen.getByText("Cancelada")).toBeInTheDocument();
  expect(screen.getByLabelText("Conteúdo")).toBeDisabled();
  expect(screen.getByLabelText("Notas")).toHaveAttribute(
    "contenteditable",
    "false",
  );
  expect(screen.getByRole("button", { name: "Negrito" })).toBeDisabled();
  expect(screen.getByLabelText("Título")).toBeDisabled();
  expect(
    screen.queryByRole("button", { name: "Finalizar Consulta" }),
  ).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Timer da consulta")).not.toBeInTheDocument();
});
