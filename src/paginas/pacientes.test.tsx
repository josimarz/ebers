import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useParams } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { EVENTO_PACIENTE_CADASTRADO } from "@/db/eventos";
import type { DadosPaciente } from "@/dominio/paciente";
import {
  chamadasDeComando,
  programarComando,
  reiniciarComandosFalsos,
} from "@/testes/comandos-falsos";
import {
  emitirEventoFalso,
  reiniciarEventosFalsos,
  totalDeOuvintes,
} from "@/testes/eventos-falsos";
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
import { PaginaPacientes } from "./pacientes";

// Fronteiras do sistema: o banco SQLite atrás do tauri-plugin-sql, o comando
// Tauri que lê fotos e os eventos Tauri que o backend emite. O caminho
// página → listarPacientes → drizzle roda de verdade.
vi.mock("@tauri-apps/plugin-sql", () => import("@/testes/plugin-sql-falso"));
vi.mock("@tauri-apps/api/core", () => import("@/testes/comandos-falsos"));
vi.mock("@tauri-apps/api/event", () => import("@/testes/eventos-falsos"));

beforeEach(() => {
  reiniciarBancoFalso();
  reiniciarComandosFalsos();
  reiniciarEventosFalsos();
  proximoId = 1;
  // Só o relógio de parede é falso (idades estáveis); timers continuam reais
  // para não interferir no user-event e nos findBy*.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 7, 8, 12));
});

afterEach(() => {
  vi.useRealTimers();
});

function renderizarPagina() {
  return render(
    <MemoryRouter>
      <PaginaPacientes />
    </MemoryRouter>,
  );
}

let proximoId = 1;

function pacienteNaListagem(ajustes: Partial<DadosPaciente> = {}) {
  return linhaDePaciente({ id: proximoId++, ...dadosPacienteValidos(ajustes) });
}

/** Nomes das linhas do corpo da tabela, na ordem exibida. */
function nomesExibidos(): string[] {
  const corpo = screen.getAllByRole("rowgroup")[1];
  return within(corpo)
    .getAllByRole("row")
    .map((linha) => within(linha).getAllByRole("cell")[1].textContent ?? "");
}

test("sem pacientes cadastrados, a página mostra o estado vazio", async () => {
  renderizarPagina();

  expect(
    await screen.findByText("Nenhum paciente cadastrado"),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Pacientes" }),
  ).toBeInTheDocument();
});

test("a página oferece o cadastro de novo paciente", async () => {
  renderizarPagina();

  expect(
    await screen.findByRole("link", { name: "Novo Paciente" }),
  ).toHaveAttribute("href", "/pacientes/novo");
});

test("a tabela tem as colunas da spec, na ordem", async () => {
  enfileirarSelect([pacienteNaListagem()]);
  renderizarPagina();

  await screen.findByText("Ana Lima");
  const cabecalhos = screen
    .getAllByRole("columnheader")
    .map((cabecalho) => cabecalho.textContent);
  expect(cabecalhos).toEqual([
    "Foto",
    "Nome",
    "Idade",
    "Telefone",
    "Periodicidade",
    "Dia da semana",
    "Créditos",
    "Ações",
  ]);
});

test("cada paciente vira uma linha com idade calculada, telefone, periodicidade, dia e créditos", async () => {
  enfileirarSelect([pacienteNaListagem()]);
  renderizarPagina();

  const linha = (await screen.findByText("Ana Lima")).closest("tr");
  expect(linha).not.toBeNull();
  const celulas = within(linha as HTMLElement)
    .getAllByRole("cell")
    .map((celula) => celula.textContent);
  // Nascida em 1990-03-10, aos 2026-08-08 tem 36 anos; sem Movimentos de
  // crédito no sistema, o saldo é 0; sem Consulta Aberta, a ação é Nova
  // Consulta.
  expect(celulas).toEqual([
    "",
    "Ana Lima",
    "36",
    "(11) 91234-5678",
    "Semanal",
    "Quarta",
    "0",
    "EditarNova Consulta",
  ]);
});

function PaginaConsultaStub() {
  const { id } = useParams();
  return <p>Consulta {id} em tela</p>;
}

test("sem Consulta Aberta, Nova Consulta cria a consulta e abre a sua página", async () => {
  const terapeuta = userEvent.setup();
  enfileirarSelect([pacienteNaListagem()]);
  render(
    <MemoryRouter initialEntries={["/pacientes"]}>
      <Routes>
        <Route path="/pacientes" element={<PaginaPacientes />} />
        <Route path="/consultas/:id" element={<PaginaConsultaStub />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByText("Ana Lima");

  // Criação: nenhuma Aberta, o paciente, o saldo e a consulta recém-criada.
  enfileirarSelect([]);
  enfileirarSelect([pacienteNaListagem({ nomeCompleto: "Ana Lima" })]);
  enfileirarSelect([{ saldo: 0 }]);
  enfileirarSelect([linhaDeConsulta(consultaAberta({ id: 3, pacienteId: 1 }))]);

  await terapeuta.click(screen.getByRole("button", { name: "Nova Consulta" }));

  expect(await screen.findByText("Consulta 3 em tela")).toBeInTheDocument();
  const insercoes = chamadas.filter((chamada) =>
    /insert into "consultas"/i.test(chamada.sql),
  );
  expect(insercoes).toHaveLength(1);
});

test("com Consulta Aberta, a ação vira o botão Consulta apontando para ela", async () => {
  enfileirarSelect([pacienteNaListagem()]); // listagem (paciente 1)
  enfileirarSelect([]); // saldos de créditos
  enfileirarSelect([{ paciente_id: 1, id: 5 }]); // consultas Abertas
  renderizarPagina();

  const linha = (await screen.findByText("Ana Lima")).closest("tr");
  expect(
    within(linha as HTMLElement).getByRole("link", { name: "Consulta" }),
  ).toHaveAttribute("href", "/consultas/5");
  expect(
    within(linha as HTMLElement).queryByRole("button", {
      name: "Nova Consulta",
    }),
  ).not.toBeInTheDocument();
});

test("periodicidade e dia da semana vazios aparecem como travessão", async () => {
  enfileirarSelect([
    pacienteNaListagem({ periodicidade: null, diaSemanaConsulta: null }),
  ]);
  renderizarPagina();

  const linha = (await screen.findByText("Ana Lima")).closest("tr");
  const celulas = within(linha as HTMLElement)
    .getAllByRole("cell")
    .map((celula) => celula.textContent);
  expect(celulas.slice(4, 6)).toEqual(["—", "—"]);
});

test("paciente com foto aparece com a foto redonda carregada do backend", async () => {
  enfileirarSelect([pacienteNaListagem({ foto: "foto-1.jpg" })]);
  programarComando("carregar_foto_paciente", new Uint8Array([255, 216, 255]));
  renderizarPagina();

  const foto = await screen.findByAltText("Foto de Ana Lima");
  expect(foto).toHaveAttribute("src", "data:image/jpeg;base64,/9j/");
  expect(foto).toHaveClass("rounded-full");
  expect(chamadasDeComando).toEqual([
    {
      comando: "carregar_foto_paciente",
      argumentos: { arquivo: "foto-1.jpg" },
    },
  ]);
});

test("paciente sem foto fica com o avatar neutro, sem consultar o backend", async () => {
  enfileirarSelect([pacienteNaListagem()]);
  renderizarPagina();

  await screen.findByText("Ana Lima");
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  expect(chamadasDeComando).toHaveLength(0);
});

test("o botão Editar abre o formulário de edição do paciente", async () => {
  enfileirarSelect([
    pacienteNaListagem(),
    pacienteNaListagem({ nomeCompleto: "Bia Souza", cpf: "12345678909" }),
  ]);
  renderizarPagina();

  const linha = (await screen.findByText("Ana Lima")).closest("tr");
  expect(
    within(linha as HTMLElement).getByRole("link", { name: "Editar" }),
  ).toHaveAttribute("href", "/pacientes/1/editar");
});

test("a listagem nasce ordenada por nome, ignorando acentos e caixa", async () => {
  enfileirarSelect([
    pacienteNaListagem({ nomeCompleto: "Édson Prado" }),
    pacienteNaListagem({ nomeCompleto: "ana beatriz" }),
    pacienteNaListagem({ nomeCompleto: "Bruno Castro" }),
  ]);
  renderizarPagina();

  await screen.findByText("Bruno Castro");
  expect(nomesExibidos()).toEqual([
    "ana beatriz",
    "Bruno Castro",
    "Édson Prado",
  ]);
  expect(screen.getByRole("columnheader", { name: "Nome" })).toHaveAttribute(
    "aria-sort",
    "ascending",
  );
});

test("clicar em Nome inverte a ordenação", async () => {
  const terapeuta = userEvent.setup();
  enfileirarSelect([
    pacienteNaListagem({ nomeCompleto: "Ana Lima" }),
    pacienteNaListagem({ nomeCompleto: "Bia Souza", cpf: "12345678909" }),
  ]);
  renderizarPagina();
  await screen.findByText("Ana Lima");

  await terapeuta.click(screen.getByRole("button", { name: "Nome" }));

  expect(nomesExibidos()).toEqual(["Bia Souza", "Ana Lima"]);
  expect(screen.getByRole("columnheader", { name: "Nome" })).toHaveAttribute(
    "aria-sort",
    "descending",
  );
});

test("clicar em Idade ordena do mais novo para o mais velho, e de novo inverte", async () => {
  const terapeuta = userEvent.setup();
  enfileirarSelect([
    pacienteNaListagem({ nomeCompleto: "Ana Lima" }),
    pacienteNaListagem({
      nomeCompleto: "Bia Souza",
      cpf: "12345678909",
      dataNascimento: "2010-01-20",
    }),
    pacienteNaListagem({
      nomeCompleto: "Carla Nunes",
      cpf: "11144477735",
      dataNascimento: "2000-09-01",
    }),
  ]);
  renderizarPagina();
  await screen.findByText("Ana Lima");

  const idade = () => screen.getByRole("button", { name: "Idade" });

  await terapeuta.click(idade());
  expect(nomesExibidos()).toEqual(["Bia Souza", "Carla Nunes", "Ana Lima"]);
  expect(screen.getByRole("columnheader", { name: "Idade" })).toHaveAttribute(
    "aria-sort",
    "ascending",
  );
  expect(
    screen.getByRole("columnheader", { name: "Nome" }),
  ).not.toHaveAttribute("aria-sort");

  await terapeuta.click(idade());
  expect(nomesExibidos()).toEqual(["Ana Lima", "Carla Nunes", "Bia Souza"]);
  expect(screen.getByRole("columnheader", { name: "Idade" })).toHaveAttribute(
    "aria-sort",
    "descending",
  );
});

test("a busca filtra por nome ignorando acentos e caixa", async () => {
  const terapeuta = userEvent.setup();
  enfileirarSelect([
    pacienteNaListagem({ nomeCompleto: "José da Silva" }),
    pacienteNaListagem({ nomeCompleto: "Joana Prado", cpf: "12345678909" }),
  ]);
  renderizarPagina();
  await screen.findByText("José da Silva");

  await terapeuta.type(
    screen.getByRole("searchbox", { name: "Buscar por nome" }),
    "JOSE",
  );

  expect(nomesExibidos()).toEqual(["José da Silva"]);
  expect(screen.queryByText("Joana Prado")).not.toBeInTheDocument();
});

test("busca sem correspondência explica o resultado vazio", async () => {
  const terapeuta = userEvent.setup();
  enfileirarSelect([pacienteNaListagem()]);
  renderizarPagina();
  await screen.findByText("Ana Lima");

  await terapeuta.type(
    screen.getByRole("searchbox", { name: "Buscar por nome" }),
    "zulmira",
  );

  expect(screen.getByText("Nenhum paciente encontrado")).toBeInTheDocument();
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
});

function onzePacientes() {
  return Array.from({ length: 11 }, (_, i) =>
    pacienteNaListagem({
      nomeCompleto: `Paciente ${String(i + 1).padStart(2, "0")}`,
    }),
  );
}

test("a listagem é paginada de 10 em 10", async () => {
  const terapeuta = userEvent.setup();
  enfileirarSelect(onzePacientes());
  renderizarPagina();
  await screen.findByText("Paciente 01");

  expect(nomesExibidos()).toHaveLength(10);
  expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();

  await terapeuta.click(screen.getByRole("button", { name: "Próxima" }));

  expect(nomesExibidos()).toEqual(["Paciente 11"]);
  expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Próxima" })).toBeDisabled();

  await terapeuta.click(screen.getByRole("button", { name: "Anterior" }));

  expect(nomesExibidos()).toHaveLength(10);
  expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
});

/** Recarga vinda do banco: Ana já cadastrada e Bia recém-chegada do tablet. */
function anaEBia() {
  return [
    pacienteNaListagem(),
    pacienteNaListagem({ nomeCompleto: "Bia Souza", cpf: "12345678909" }),
  ];
}

test("um Auto-cadastro chegando do tablet recarrega a listagem", async () => {
  enfileirarSelect([pacienteNaListagem()]);
  renderizarPagina();
  await screen.findByText("Ana Lima");

  // O servidor local gravou Bia e avisou; a página relê o banco (issue #22).
  enfileirarSelect(anaEBia());
  emitirEventoFalso(EVENTO_PACIENTE_CADASTRADO);

  expect(await screen.findByText("Bia Souza")).toBeInTheDocument();
  expect(screen.getByText("Ana Lima")).toBeInTheDocument();
});

test("a recarga preserva a busca digitada", async () => {
  const terapeuta = userEvent.setup();
  enfileirarSelect([pacienteNaListagem()]);
  renderizarPagina();
  await screen.findByText("Ana Lima");

  await terapeuta.type(
    screen.getByRole("searchbox", { name: "Buscar por nome" }),
    "bia",
  );
  expect(screen.getByText("Nenhum paciente encontrado")).toBeInTheDocument();

  enfileirarSelect(anaEBia());
  emitirEventoFalso(EVENTO_PACIENTE_CADASTRADO);

  // A linha nova entra já filtrada pela busca que estava na tela.
  expect(await screen.findByText("Bia Souza")).toBeInTheDocument();
  expect(screen.queryByText("Ana Lima")).not.toBeInTheDocument();
  expect(
    screen.getByRole("searchbox", { name: "Buscar por nome" }),
  ).toHaveValue("bia");
});

test("a recarga preserva a página em exibição", async () => {
  const terapeuta = userEvent.setup();
  enfileirarSelect(onzePacientes());
  renderizarPagina();
  await screen.findByText("Paciente 01");
  await terapeuta.click(screen.getByRole("button", { name: "Próxima" }));
  expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();

  enfileirarSelect([
    ...onzePacientes(),
    pacienteNaListagem({ nomeCompleto: "Bia Souza", cpf: "12345678909" }),
  ]);
  emitirEventoFalso(EVENTO_PACIENTE_CADASTRADO);

  // Bia entra na primeira página (ordem por nome) e empurra o Paciente 10
  // para a segunda — que segue em exibição, sem voltar ao início.
  await waitFor(() => {
    expect(nomesExibidos()).toEqual(["Paciente 10", "Paciente 11"]);
  });
  expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();
});

test("sair da página para de escutar o Auto-cadastro", async () => {
  enfileirarSelect([pacienteNaListagem()]);
  const { unmount } = renderizarPagina();
  await screen.findByText("Ana Lima");
  expect(totalDeOuvintes(EVENTO_PACIENTE_CADASTRADO)).toBe(1);

  unmount();

  await vi.waitFor(() => {
    expect(totalDeOuvintes(EVENTO_PACIENTE_CADASTRADO)).toBe(0);
  });
});

test("buscar volta para a primeira página", async () => {
  const terapeuta = userEvent.setup();
  enfileirarSelect(onzePacientes());
  renderizarPagina();
  await screen.findByText("Paciente 01");

  await terapeuta.click(screen.getByRole("button", { name: "Próxima" }));
  expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();

  await terapeuta.type(
    screen.getByRole("searchbox", { name: "Buscar por nome" }),
    "paciente",
  );

  expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
  expect(nomesExibidos()).toHaveLength(10);
});
