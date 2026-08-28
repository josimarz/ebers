import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { Consulta } from "@/db/consultas";
import {
  capturaEstaAtiva,
  emitirBloco,
  programarFalhaDeCaptura,
  reiniciarCapturaFalsa,
} from "@/testes/captura-falsa";
import {
  chamadasDeComando,
  programarComando,
  programarErroDeComando,
  reiniciarComandosFalsos,
} from "@/testes/comandos-falsos";
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
import {
  amostrasRecebidasPelaPrevia,
  emitirErroDaPrevia,
  emitirTextoDaPrevia,
  janelasFechadasDaPrevia,
  previaEstaAtiva,
  programarFalhaAoIniciarPrevia,
  programarPreviaIndisponivel,
  programarPreviaInexistente,
  reiniciarPreviaFalsa,
} from "@/testes/previa-falsa";
import { PaginaConsulta } from "./consulta";

// Fronteiras do sistema: o banco SQLite atrás do tauri-plugin-sql, os
// comandos Tauri (fotos, transcrição) e a captura de áudio do navegador
// (getUserMedia/AudioContext, que o jsdom não tem). O caminho página →
// consultas/pacientes → drizzle roda de verdade.
vi.mock("@tauri-apps/plugin-sql", () => import("@/testes/plugin-sql-falso"));
vi.mock("@tauri-apps/api/core", () => import("@/testes/comandos-falsos"));
vi.mock("@/lib/captura-audio", () => import("@/testes/captura-falsa"));
vi.mock("@/db/previa", () => import("@/testes/previa-falsa"));

const AGORA_ISO = "2026-08-08T14:00:00.000Z";

beforeEach(() => {
  reiniciarBancoFalso();
  reiniciarComandosFalsos();
  reiniciarCapturaFalsa();
  reiniciarPreviaFalsa();
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

test("Efetuar Pagamento grava o pagamento Direto e a ação vira Desfazer Pagamento", async () => {
  const terapeuta = terapeutaComTimersFalsos();
  carregarConsulta(); // Aberta não paga
  await renderizarPagina();

  await terapeuta.click(
    screen.getByRole("button", { name: "Efetuar Pagamento" }),
  );
  await passar(0); // drena a gravação e a re-renderização do cabeçalho

  const atualizacoes = chamadas.filter((chamada) =>
    /update "consultas" set/i.test(chamada.sql),
  );
  expect(atualizacoes).toHaveLength(1);
  expect(atualizacoes[0].valores).toEqual([
    AGORA_ISO,
    1,
    "Direto",
    3,
    "Cancelada",
    0,
  ]);

  // Paga Direto: Efetuar vira Desfazer e o Cancelar some — cancelar agora
  // exigiria desfazer o pagamento antes (spec 2.3).
  expect(
    screen.getByRole("button", { name: "Desfazer Pagamento" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Efetuar Pagamento" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Cancelar Consulta" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Finalizar Consulta" }),
  ).toBeInTheDocument();
});

test("Desfazer Pagamento zera o pagamento e as ações voltam a Efetuar e Cancelar", async () => {
  const terapeuta = terapeutaComTimersFalsos();
  carregarConsulta({
    pago: true,
    pagoEm: AGORA_ISO,
    origemPagamento: "Direto",
  });
  await renderizarPagina();

  // Paga Direto: sem Efetuar nem Cancelar — só Desfazer (e Finalizar).
  expect(
    screen.queryByRole("button", { name: "Efetuar Pagamento" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Cancelar Consulta" }),
  ).not.toBeInTheDocument();

  await terapeuta.click(
    screen.getByRole("button", { name: "Desfazer Pagamento" }),
  );
  await passar(0);

  const atualizacoes = chamadas.filter((chamada) =>
    /update "consultas" set/i.test(chamada.sql),
  );
  expect(atualizacoes).toHaveLength(1);
  expect(atualizacoes[0].valores).toEqual([
    null,
    0,
    null,
    3,
    "Cancelada",
    "Direto",
  ]);

  expect(
    screen.getByRole("button", { name: "Efetuar Pagamento" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Cancelar Consulta" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Desfazer Pagamento" }),
  ).not.toBeInTheDocument();
});

test("Cancelar Consulta paga por Crédito estorna o crédito e trava a página", async () => {
  const terapeuta = terapeutaComTimersFalsos();
  carregarConsulta({
    pago: true,
    pagoEm: AGORA_ISO,
    origemPagamento: "Crédito",
  });
  await renderizarPagina();

  // Paga por Crédito: cancelar pode; efetuar/desfazer não (spec 2.3).
  expect(
    screen.queryByRole("button", { name: "Efetuar Pagamento" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Desfazer Pagamento" }),
  ).not.toBeInTheDocument();

  // cancelarConsulta relê a consulta antes de gravar.
  enfileirarSelect([
    linhaDeConsulta(
      consultaAberta({
        id: 3,
        pacienteId: 7,
        iniciadoEm: AGORA_ISO,
        pago: true,
        pagoEm: AGORA_ISO,
        origemPagamento: "Crédito",
      }),
    ),
  ]);
  await terapeuta.click(
    screen.getByRole("button", { name: "Cancelar Consulta" }),
  );
  await passar(0);

  const atualizacoes = chamadas.filter((chamada) =>
    /update "consultas" set/i.test(chamada.sql),
  );
  expect(atualizacoes).toHaveLength(1);
  expect(atualizacoes[0].valores).toEqual([
    null,
    "Cancelada",
    0,
    null,
    3,
    "Aberta",
  ]);
  const estornos = chamadas.filter((chamada) =>
    /insert into "movimentos_credito"/i.test(chamada.sql),
  );
  expect(estornos).toHaveLength(1);
  expect(estornos[0].valores).toEqual([7, "Estorno", 1, AGORA_ISO, 3]);

  // A página passa a Cancelada: somente leitura, sem nenhuma ação.
  expect(screen.getByText("Cancelada")).toBeInTheDocument();
  expect(screen.queryByLabelText("Timer da consulta")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Conteúdo")).toBeDisabled();
  expect(screen.getByLabelText("Notas")).toHaveAttribute(
    "contenteditable",
    "false",
  );
  expect(
    screen.queryAllByRole("button", { name: /Consulta|Pagamento/ }),
  ).toEqual([]);
});

test("consulta Finalizada não paga oferece só Efetuar Pagamento", async () => {
  carregarConsulta({
    status: "Finalizada",
    finalizadoEm: AGORA_ISO,
  });
  await renderizarPagina();

  expect(screen.getByText("Finalizada")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Efetuar Pagamento" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Finalizar Consulta" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Cancelar Consulta" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Desfazer Pagamento" }),
  ).not.toBeInTheDocument();
});

/** Emite `duracaoS` segundos de áudio no microfone falso, em blocos de 0,5 s. */
async function captar(duracaoS: number, amplitude: number) {
  await act(async () => {
    for (let indice = 0; indice < duracaoS * 2; indice++) {
      emitirBloco(0.5, amplitude);
    }
  });
}

/** Liga o microfone com o modelo já disponível no backend. */
async function ligarMicrofone(terapeuta: ReturnType<typeof userEvent.setup>) {
  programarComando("modelo_de_transcricao", "ggml-base.bin");
  await terapeuta.click(
    screen.getByRole("button", { name: "Ligar microfone" }),
  );
  await act(async () => {});
}

test("o botão do microfone existe só na Consulta Aberta", async () => {
  carregarConsulta();
  const aberta = await renderizarPagina();
  expect(
    screen.getByRole("button", { name: "Ligar microfone" }),
  ).toBeInTheDocument();
  aberta.unmount();

  carregarConsulta({ status: "Finalizada", finalizadoEm: AGORA_ISO });
  const finalizada = await renderizarPagina();
  expect(
    screen.queryByRole("button", { name: "Ligar microfone" }),
  ).not.toBeInTheDocument();
  finalizada.unmount();

  carregarConsulta({ status: "Cancelada" });
  await renderizarPagina();
  expect(
    screen.queryByRole("button", { name: "Ligar microfone" }),
  ).not.toBeInTheDocument();
});

test("com o microfone ligado, a fala transcrita entra no Conteúdo e é salva sozinha", async () => {
  const terapeuta = terapeutaComTimersFalsos();
  carregarConsulta({ conteudo: "Relato até aqui." });
  await renderizarPagina();

  await ligarMicrofone(terapeuta);
  expect(capturaEstaAtiva()).toBe(true);
  expect(
    screen.getByRole("button", { name: "Desligar microfone" }),
  ).toBeInTheDocument();

  // 12 s de fala e 1 s de pausa fecham um trecho; o Whisper falso responde.
  programarComando("transcrever_audio", " Sentiu ansiedade na semana. ");
  await captar(12, 0.25);
  await captar(1, 0);

  expect(screen.getByLabelText("Conteúdo")).toHaveValue(
    "Relato até aqui. Sentiu ansiedade na semana.",
  );
  // O trecho cruzou a fronteira como bytes crus: 13 s × 16 kHz × 4 bytes.
  const envios = chamadasDeComando.filter(
    (chamada) => chamada.comando === "transcrever_audio",
  );
  expect(envios).toHaveLength(1);
  expect((envios[0].argumentos as Uint8Array).byteLength).toBe(13 * 16000 * 4);

  // O salvamento automático grava o Conteúdo com a transcrição anexada.
  await passar(600);
  expect(atualizacoesDe("conteudo")).toHaveLength(1);
  expect(atualizacoesDe("conteudo")[0].valores[0]).toBe(
    "Relato até aqui. Sentiu ansiedade na semana.",
  );
});

test("a Prévia mostra o que o microfone ouve até a Transcrição da janela entrar no Conteúdo", async () => {
  const terapeuta = terapeutaComTimersFalsos();
  carregarConsulta({ conteudo: "Relato até aqui." });
  await renderizarPagina();
  await ligarMicrofone(terapeuta);
  expect(previaEstaAtiva()).toBe(true);

  // O reconhecedor devolve o que vai ouvindo na janela 1 — e só a Prévia
  // muda; o Conteúdo continua intacto.
  await act(async () => {
    emitirTextoDaPrevia(1, "Sentiu ansiedade");
  });
  expect(screen.getByText("Sentiu ansiedade")).toBeInTheDocument();
  expect(screen.getByLabelText("Conteúdo")).toHaveValue("Relato até aqui.");
  await act(async () => {
    emitirTextoDaPrevia(1, "Sentiu ansiedade na semana");
  });
  expect(screen.getByText("Sentiu ansiedade na semana")).toBeInTheDocument();

  // 12 s de fala e 1 s de pausa fecham o trecho: a janela 1 fecha e a 2
  // abre; quando a Transcrição entra no Conteúdo, a Prévia da janela some.
  programarComando("transcrever_audio", " Sentiu ansiedade na semana. ");
  await captar(12, 0.25);
  await captar(1, 0);
  expect(janelasFechadasDaPrevia()).toBe(1);
  expect(screen.getByLabelText("Conteúdo")).toHaveValue(
    "Relato até aqui. Sentiu ansiedade na semana.",
  );
  expect(
    screen.queryByText("Sentiu ansiedade na semana"),
  ).not.toBeInTheDocument();
  // O mesmo áudio captado alimentou a Prévia: 13 s a 16 kHz.
  expect(amostrasRecebidasPelaPrevia()).toBe(13 * 16000);
});

test("sem Prévia disponível, o microfone funciona só com o Whisper e avisa uma vez", async () => {
  const terapeuta = terapeutaComTimersFalsos();
  carregarConsulta();
  await renderizarPagina();

  programarPreviaIndisponivel();
  await ligarMicrofone(terapeuta);
  expect(capturaEstaAtiva()).toBe(true);
  expect(previaEstaAtiva()).toBe(false);
  expect(
    screen.getByText("Prévia indisponível — veja o guia de operação."),
  ).toBeInTheDocument();

  // A Transcrição segue chegando pelo Whisper.
  programarComando("transcrever_audio", "Segue sem Prévia.");
  await captar(12, 0.25);
  await captar(1, 0);
  expect(screen.getByLabelText("Conteúdo")).toHaveValue("Segue sem Prévia.");
  expect(amostrasRecebidasPelaPrevia()).toBe(0);

  // Religar não repete o aviso: ele aparece uma vez por execução do app.
  await terapeuta.click(
    screen.getByRole("button", { name: "Desligar microfone" }),
  );
  await act(async () => {});
  await ligarMicrofone(terapeuta);
  expect(
    screen.queryByText("Prévia indisponível — veja o guia de operação."),
  ).not.toBeInTheDocument();
});

test("onde a Prévia não existe (fora do macOS), nada muda — nem aviso", async () => {
  const terapeuta = terapeutaComTimersFalsos();
  carregarConsulta();
  await renderizarPagina();

  programarPreviaInexistente();
  await ligarMicrofone(terapeuta);
  expect(capturaEstaAtiva()).toBe(true);
  expect(previaEstaAtiva()).toBe(false);
  expect(
    screen.queryByText("Prévia indisponível — veja o guia de operação."),
  ).not.toBeInTheDocument();

  programarComando("transcrever_audio", "Segue como sempre.");
  await captar(12, 0.25);
  await captar(1, 0);
  expect(screen.getByLabelText("Conteúdo")).toHaveValue("Segue como sempre.");
});

test("se abrir a Prévia falha, o microfone segue só com o Whisper e avisa", async () => {
  const terapeuta = terapeutaComTimersFalsos();
  carregarConsulta();
  await renderizarPagina();

  programarFalhaAoIniciarPrevia(new Error("Siri and Dictation are disabled"));
  await ligarMicrofone(terapeuta);
  expect(capturaEstaAtiva()).toBe(true);
  expect(previaEstaAtiva()).toBe(false);
  expect(
    screen.getByText("Prévia indisponível — veja o guia de operação."),
  ).toBeInTheDocument();
});

test("digitar com a Prévia na tela: o Conteúdo recebe o digitado e a Prévia segue na linha", async () => {
  const terapeuta = terapeutaComTimersFalsos();
  carregarConsulta({ conteudo: "" });
  await renderizarPagina();
  await ligarMicrofone(terapeuta);

  await act(async () => {
    emitirTextoDaPrevia(1, "Sentiu ansiedade");
  });
  await terapeuta.type(
    screen.getByLabelText("Conteúdo"),
    "Anotação da terapeuta.",
  );
  expect(screen.getByLabelText("Conteúdo")).toHaveValue(
    "Anotação da terapeuta.",
  );
  expect(screen.getByText("Sentiu ansiedade")).toBeInTheDocument();

  // A Transcrição entra no fim do que foi digitado, como sempre.
  programarComando("transcrever_audio", "Sentiu ansiedade na semana.");
  await captar(12, 0.25);
  await captar(1, 0);
  expect(screen.getByLabelText("Conteúdo")).toHaveValue(
    "Anotação da terapeuta. Sentiu ansiedade na semana.",
  );
  expect(screen.queryByText("Sentiu ansiedade")).not.toBeInTheDocument();
});

test("silêncio longo fecha a janela da Prévia mesmo sem trecho para o Whisper", async () => {
  const terapeuta = terapeutaComTimersFalsos();
  carregarConsulta();
  await renderizarPagina();
  await ligarMicrofone(terapeuta);

  // 12 s sem fala: o acumulador fecha a janela vazia — nada vai ao Whisper,
  // mas o reconhecedor recomeça, para nunca viver além de um trecho.
  await captar(12, 0);
  expect(janelasFechadasDaPrevia()).toBe(1);
  expect(
    chamadasDeComando.filter(
      (chamada) => chamada.comando === "transcrever_audio",
    ),
  ).toHaveLength(0);
  expect(previaEstaAtiva()).toBe(true);

  await act(async () => {
    emitirTextoDaPrevia(2, "Voltou a falar");
  });
  expect(screen.getByText("Voltou a falar")).toBeInTheDocument();
});

test("erro na janela aberta derruba só a Prévia; o microfone continua", async () => {
  const terapeuta = terapeutaComTimersFalsos();
  carregarConsulta();
  await renderizarPagina();
  await ligarMicrofone(terapeuta);

  await act(async () => {
    emitirTextoDaPrevia(1, "Começou a falar");
  });
  expect(screen.getByText("Começou a falar")).toBeInTheDocument();
  await act(async () => {
    emitirErroDaPrevia(1, "Siri and Dictation are disabled");
  });

  expect(screen.queryByText("Começou a falar")).not.toBeInTheDocument();
  expect(previaEstaAtiva()).toBe(false);
  expect(
    screen.getByText("Prévia indisponível — veja o guia de operação."),
  ).toBeInTheDocument();
  expect(capturaEstaAtiva()).toBe(true);
  expect(
    screen.getByRole("button", { name: "Desligar microfone" }),
  ).toBeInTheDocument();

  // Sem Prévia, o áudio deixa de ser enviado a ela, mas o Whisper segue.
  programarComando("transcrever_audio", "Continua transcrevendo.");
  await captar(12, 0.25);
  await captar(1, 0);
  expect(screen.getByLabelText("Conteúdo")).toHaveValue(
    "Continua transcrevendo.",
  );
});

test("erro numa janela já fechada é o fim natural dela e não derruba a Prévia", async () => {
  const terapeuta = terapeutaComTimersFalsos();
  carregarConsulta();
  await renderizarPagina();
  await ligarMicrofone(terapeuta);

  // A janela 1 fecha com o trecho e a 2 abre; o reconhecedor encerra a 1
  // avisando que não há mais fala nela.
  programarComando("transcrever_audio", "Primeiro trecho.");
  await captar(12, 0.25);
  await captar(1, 0);
  await act(async () => {
    emitirErroDaPrevia(1, "No speech detected");
    emitirTextoDaPrevia(2, "Já na segunda janela");
  });

  expect(previaEstaAtiva()).toBe(true);
  expect(screen.getByText("Já na segunda janela")).toBeInTheDocument();
  expect(
    screen.queryByText("Prévia indisponível — veja o guia de operação."),
  ).not.toBeInTheDocument();
});

test("desligar o microfone mantém a Prévia congelada até a última Transcrição entrar", async () => {
  const terapeuta = terapeutaComTimersFalsos();
  carregarConsulta();
  await renderizarPagina();
  await ligarMicrofone(terapeuta);

  await captar(1, 0.25);
  await act(async () => {
    emitirTextoDaPrevia(1, "Última frase");
  });
  // O Whisper falso só responde depois de liberado: enquanto isso, a Prévia
  // continua na tela, congelada.
  let responder: (texto: string) => void = () => {};
  programarComando(
    "transcrever_audio",
    new Promise<string>((resolve) => {
      responder = resolve;
    }),
  );
  await terapeuta.click(
    screen.getByRole("button", { name: "Desligar microfone" }),
  );
  await act(async () => {});
  expect(previaEstaAtiva()).toBe(false);
  expect(screen.getByText("Última frase")).toBeInTheDocument();
  expect(screen.getByLabelText("Conteúdo")).toHaveValue("");

  await act(async () => {
    responder("Última frase.");
  });
  expect(screen.getByLabelText("Conteúdo")).toHaveValue("Última frase.");
  expect(screen.queryByText("Última frase")).not.toBeInTheDocument();
});

test("Finalizar Consulta com Prévia na tela: ela some quando a Transcrição pendente entra", async () => {
  const terapeuta = terapeutaComTimersFalsos();
  carregarConsulta();
  await renderizarPagina();
  await ligarMicrofone(terapeuta);

  await captar(1, 0.25);
  await act(async () => {
    emitirTextoDaPrevia(1, "Frase final");
  });
  programarComando("transcrever_audio", "Frase final.");
  await terapeuta.click(
    screen.getByRole("button", { name: "Finalizar Consulta" }),
  );
  await passar(0);

  expect(previaEstaAtiva()).toBe(false);
  expect(screen.getByLabelText("Conteúdo")).toHaveValue("Frase final.");
  expect(screen.queryByText("Frase final")).not.toBeInTheDocument();
});

test("desligar o microfone transcreve a fala que ainda não fechou trecho", async () => {
  const terapeuta = terapeutaComTimersFalsos();
  carregarConsulta();
  await renderizarPagina();
  await ligarMicrofone(terapeuta);

  // 1 s de fala: abaixo do mínimo, nada foi transcrito ainda.
  await captar(1, 0.25);
  expect(screen.getByLabelText("Conteúdo")).toHaveValue("");

  programarComando("transcrever_audio", "Última frase.");
  await terapeuta.click(
    screen.getByRole("button", { name: "Desligar microfone" }),
  );
  await act(async () => {});

  expect(capturaEstaAtiva()).toBe(false);
  expect(screen.getByLabelText("Conteúdo")).toHaveValue("Última frase.");
  expect(
    screen.getByRole("button", { name: "Ligar microfone" }),
  ).toBeInTheDocument();
});

test("Finalizar Consulta com o microfone ligado ainda transcreve o que restou", async () => {
  const terapeuta = terapeutaComTimersFalsos();
  carregarConsulta();
  await renderizarPagina();
  await ligarMicrofone(terapeuta);

  // 1 s de fala que ainda não fechou trecho quando a Consulta é finalizada.
  await captar(1, 0.25);
  programarComando("transcrever_audio", "Frase final.");
  await terapeuta.click(
    screen.getByRole("button", { name: "Finalizar Consulta" }),
  );
  await passar(0);

  // Finalizada não tem microfone (spec 2.3): botão some e a captura para…
  expect(
    screen.queryByRole("button", { name: /microfone/ }),
  ).not.toBeInTheDocument();
  expect(capturaEstaAtiva()).toBe(false);
  // …mas a fala pendente não se perde: entra no Conteúdo, que segue editável.
  expect(screen.getByLabelText("Conteúdo")).toHaveValue("Frase final.");
});

test("sem modelo baixado, ligar o microfone explica o que falta", async () => {
  const terapeuta = terapeutaComTimersFalsos();
  carregarConsulta();
  await renderizarPagina();

  programarComando("modelo_de_transcricao", null);
  await terapeuta.click(
    screen.getByRole("button", { name: "Ligar microfone" }),
  );
  await act(async () => {});

  expect(
    screen.getByText(
      "Modelo de transcrição não instalado — veja o guia de operação.",
    ),
  ).toBeInTheDocument();
  expect(capturaEstaAtiva()).toBe(false);
  expect(
    screen.getByRole("button", { name: "Ligar microfone" }),
  ).toBeInTheDocument();
});

test("sem acesso ao microfone, o aviso aparece no lugar da gravação", async () => {
  const terapeuta = terapeutaComTimersFalsos();
  carregarConsulta();
  await renderizarPagina();

  programarComando("modelo_de_transcricao", "ggml-base.bin");
  programarFalhaDeCaptura(new Error("Permissão negada"));
  await terapeuta.click(
    screen.getByRole("button", { name: "Ligar microfone" }),
  );
  await act(async () => {});

  expect(
    screen.getByText("Não foi possível acessar o microfone."),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Ligar microfone" }),
  ).toBeInTheDocument();
});

test("falha na transcrição desliga o microfone e avisa", async () => {
  const terapeuta = terapeutaComTimersFalsos();
  carregarConsulta();
  await renderizarPagina();
  await ligarMicrofone(terapeuta);

  programarErroDeComando("transcrever_audio", "sem memória");
  await captar(12, 0.25);
  await captar(1, 0);

  expect(capturaEstaAtiva()).toBe(false);
  expect(
    screen.getByText("A transcrição falhou — microfone desligado."),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Ligar microfone" }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Conteúdo")).toHaveValue("");
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
  expect(
    screen.queryByRole("button", { name: "Efetuar Pagamento" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Desfazer Pagamento" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Cancelar Consulta" }),
  ).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Timer da consulta")).not.toBeInTheDocument();
});
