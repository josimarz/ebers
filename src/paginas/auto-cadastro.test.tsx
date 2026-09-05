import { fireEvent, render, screen } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, expect, test, vi } from "vitest";
import {
  chamadasDeComando,
  reiniciarComandosFalsos,
} from "@/testes/comandos-falsos";
import {
  fetchFalso,
  programarResposta,
  reiniciarFetchFalso,
  requisicoesHttp,
} from "@/testes/fetch-falso";
import { chamadas, reiniciarBancoFalso } from "@/testes/plugin-sql-falso";
import { PaginaAutoCadastro } from "./auto-cadastro";

// Fronteira do Modo tablet: as rotas REST do servidor local, atrás do fetch.
// O caminho desktop (tauri-plugin-sql e invoke) fica mockado só para provar
// que o tablet nunca passa por ele.
vi.mock("@tauri-apps/plugin-sql", () => import("@/testes/plugin-sql-falso"));
vi.mock("@tauri-apps/api/core", () => import("@/testes/comandos-falsos"));
vi.stubGlobal("fetch", fetchFalso);

beforeEach(() => {
  reiniciarFetchFalso();
  reiniciarBancoFalso();
  reiniciarComandosFalsos();
});

function renderizarAutoCadastro() {
  return render(
    <MemoryRouter>
      <PaginaAutoCadastro />
    </MemoryRouter>,
  );
}

test("o tablet mostra o Auto-cadastro sem os campos da Terapeuta e sem saída", () => {
  renderizarAutoCadastro();

  expect(
    screen.getByRole("heading", { name: "Auto-cadastro" }),
  ).toBeInTheDocument();
  // Campos ocultos no Modo tablet (spec 1.3).
  expect(
    screen.queryByLabelText("Valor da consulta (R$)"),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByLabelText("Periodicidade da consulta"),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByLabelText("Dia da semana da consulta"),
  ).not.toBeInTheDocument();
  // Sem saída: nem menu lateral, nem Cancelar, nem qualquer link.
  expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Cancelar" }),
  ).not.toBeInTheDocument();
});

function informarDataNascimento(valor: string) {
  fireEvent.change(screen.getByLabelText("Data de nascimento"), {
    target: { value: valor },
  });
}

/** Preenche os campos obrigatórios com uma adulta válida, como o paciente faria. */
async function preencherCamposObrigatorios(paciente: UserEvent) {
  await paciente.type(screen.getByLabelText("Nome completo"), "Ana Lima");
  informarDataNascimento("1990-03-10");
  await paciente.selectOptions(screen.getByLabelText("Gênero"), "Feminino");
  await paciente.type(screen.getByLabelText("CPF"), "529.982.247-25");
  await paciente.selectOptions(
    screen.getByLabelText("Religião"),
    "Sem religião",
  );
  await paciente.type(screen.getByLabelText("Telefone 1"), "(11) 91234-5678");
  await paciente.type(
    screen.getByLabelText("Motivo da terapia"),
    "Ansiedade no trabalho",
  );
  await paciente.selectOptions(screen.getByLabelText("Já fez terapia?"), "Não");
  await paciente.selectOptions(
    screen.getByLabelText("Toma algum medicamento?"),
    "Não",
  );
  await paciente.selectOptions(
    screen.getByLabelText("Já foi hospitalizado por questões psicológicas?"),
    "Não",
  );
}

const enviar = () => screen.getByRole("button", { name: "Enviar" });

test("cadastro enviado vai à rota REST, confirma e volta em branco para o próximo paciente", async () => {
  const paciente = userEvent.setup();
  renderizarAutoCadastro();
  programarResposta(201);

  await preencherCamposObrigatorios(paciente);
  await paciente.click(enviar());

  expect(await screen.findByText("Cadastro recebido!")).toBeInTheDocument();
  // Foi pela rota do Auto-cadastro — nunca pelo caminho do app desktop.
  expect(requisicoesHttp).toHaveLength(1);
  expect(requisicoesHttp[0].url).toBe("/api/auto-cadastro/pacientes");
  const corpo = JSON.parse(String(requisicoesHttp[0].corpo));
  expect(corpo.nomeCompleto).toBe("Ana Lima");
  expect(corpo.cpf).toBe("52998224725");
  expect(corpo.motivoTerapia).toBe("Ansiedade no trabalho");
  expect(chamadas).toHaveLength(0);
  expect(chamadasDeComando).toHaveLength(0);

  // Pronto para o próximo paciente: formulário de volta, em branco.
  await paciente.click(
    screen.getByRole("button", { name: "Iniciar novo cadastro" }),
  );
  expect(screen.getByLabelText("Nome completo")).toHaveValue("");
  expect(screen.getByLabelText("CPF")).toHaveValue("");
});

test("CPF já cadastrado orienta a chamar a terapeuta e preserva o que foi digitado", async () => {
  const paciente = userEvent.setup();
  renderizarAutoCadastro();
  programarResposta(409);

  await preencherCamposObrigatorios(paciente);
  await paciente.click(enviar());

  expect(
    await screen.findByText("CPF já cadastrado — chame a terapeuta"),
  ).toBeInTheDocument();
  // Nada foi criado nem alterado; o formulário continua com os dados.
  expect(screen.queryByText("Cadastro recebido!")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Nome completo")).toHaveValue("Ana Lima");
});

test("o Motivo da terapia é obrigatório no tablet e traz a dica para o Paciente", async () => {
  const paciente = userEvent.setup();
  renderizarAutoCadastro();

  const motivo = screen.getByLabelText("Motivo da terapia");
  expect(motivo).toBeRequired();
  expect(motivo).toHaveAccessibleDescription(
    "Conte com suas palavras. Não precisa ser detalhado, a terapeuta vai conversar sobre isso com você.",
  );

  await paciente.click(enviar());

  expect(motivo).toBeInvalid();
  expect(motivo).toHaveAccessibleDescription(/Campo obrigatório/);
  expect(requisicoesHttp).toHaveLength(0);
});

test("as regras reativas valem no navegador: menor de 18 exige o Responsável legal", async () => {
  const paciente = userEvent.setup();
  renderizarAutoCadastro();

  expect(screen.getByLabelText("Responsável legal")).not.toBeRequired();
  informarDataNascimento("2015-01-01");
  expect(screen.getByLabelText("Responsável legal")).toBeRequired();
  expect(screen.getByLabelText("Email do responsável legal")).toBeRequired();
  expect(screen.getByLabelText("CPF do responsável legal")).toBeRequired();

  // Condicional clínico: "Sim" exibe e exige o campo dependente.
  await paciente.selectOptions(screen.getByLabelText("Já fez terapia?"), "Sim");
  expect(screen.getByLabelText("Quando fez terapia?")).toBeRequired();
});

test("CPF com dígitos verificadores errados é barrado no navegador, sem ir ao servidor", async () => {
  const paciente = userEvent.setup();
  renderizarAutoCadastro();

  await preencherCamposObrigatorios(paciente);
  await paciente.clear(screen.getByLabelText("CPF"));
  await paciente.type(screen.getByLabelText("CPF"), "111.111.111-11");
  await paciente.click(enviar());

  expect(await screen.findByText("CPF inválido")).toBeInTheDocument();
  expect(requisicoesHttp).toHaveLength(0);
});

test("foto anexada no tablet vai pela rota REST e o nome entra no cadastro", async () => {
  const paciente = userEvent.setup();
  renderizarAutoCadastro();

  await paciente.upload(
    screen.getByLabelText("Anexar foto"),
    new File([new Uint8Array([1, 2, 3])], "eu.png", { type: "image/png" }),
  );
  expect(
    await screen.findByAltText("Prévia da foto de perfil"),
  ).toBeInTheDocument();

  await preencherCamposObrigatorios(paciente);
  programarResposta(201, { arquivo: "foto-55.jpg" });
  programarResposta(201);
  await paciente.click(enviar());

  expect(await screen.findByText("Cadastro recebido!")).toBeInTheDocument();
  expect(requisicoesHttp.map((requisicao) => requisicao.url)).toEqual([
    "/api/auto-cadastro/fotos",
    "/api/auto-cadastro/pacientes",
  ]);
  const cadastro = JSON.parse(String(requisicoesHttp[1].corpo));
  expect(cadastro.foto).toBe("foto-55.jpg");
  // Nenhum comando Tauri no tablet — fotos também vão pelo servidor local.
  expect(chamadasDeComando).toHaveLength(0);
});

test("falha do servidor avisa e mantém o formulário para tentar de novo", async () => {
  const paciente = userEvent.setup();
  renderizarAutoCadastro();
  programarResposta(500);

  await preencherCamposObrigatorios(paciente);
  await paciente.click(enviar());

  expect(
    await screen.findByText("Não foi possível salvar. Tente de novo."),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Nome completo")).toHaveValue("Ana Lima");
});
