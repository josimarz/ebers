import { fireEvent, render, screen } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, expect, test, vi } from "vitest";
import {
  dadosPacienteValidos,
  linhaDePaciente,
} from "@/testes/fixtures-paciente";
import {
  chamadas,
  enfileirarSelect,
  reiniciarBancoFalso,
} from "@/testes/plugin-sql-falso";
import { PaginaFormularioPaciente } from "./paciente-formulario";

// Fronteira do sistema: o SQLite atrás do tauri-plugin-sql. O caminho
// página → dominio → db → drizzle (sqlite-proxy) roda de verdade.
vi.mock("@tauri-apps/plugin-sql", () => import("@/testes/plugin-sql-falso"));

beforeEach(reiniciarBancoFalso);

function renderizarFormulario(rota: string) {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/pacientes" element={<p>Listagem de pacientes</p>} />
        <Route path="/pacientes/novo" element={<PaginaFormularioPaciente />} />
        <Route
          path="/pacientes/:id/editar"
          element={<PaginaFormularioPaciente />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

function informarDataNascimento(valor: string) {
  fireEvent.change(screen.getByLabelText("Data de nascimento"), {
    target: { value: valor },
  });
}

/** Preenche os campos obrigatórios com uma adulta válida, sem tocar nos opcionais. */
async function preencherCamposObrigatorios(terapeuta: UserEvent) {
  await terapeuta.type(screen.getByLabelText("Nome completo"), "Ana Lima");
  informarDataNascimento("1990-03-10");
  await terapeuta.selectOptions(screen.getByLabelText("Gênero"), "Feminino");
  await terapeuta.type(screen.getByLabelText("CPF"), "529.982.247-25");
  await terapeuta.selectOptions(
    screen.getByLabelText("Religião"),
    "Sem religião",
  );
  await terapeuta.type(screen.getByLabelText("Telefone 1"), "(11) 91234-5678");
  await terapeuta.selectOptions(
    screen.getByLabelText("Já fez terapia?"),
    "Não",
  );
  await terapeuta.selectOptions(
    screen.getByLabelText("Toma algum medicamento?"),
    "Não",
  );
  await terapeuta.selectOptions(
    screen.getByLabelText("Já foi hospitalizado por questões psicológicas?"),
    "Não",
  );
}

const salvar = () => screen.getByRole("button", { name: "Salvar" });

test("novo cadastro nasce com o Valor da consulta pré-preenchido e editável", () => {
  renderizarFormulario("/pacientes/novo");

  expect(
    screen.getByRole("heading", { name: "Novo Paciente" }),
  ).toBeInTheDocument();
  const valor = screen.getByLabelText("Valor da consulta (R$)");
  expect(valor).toHaveValue("250,00");
  expect(valor).toBeEnabled();
});

test("menor de 18 anos passa a exigir os três campos do Responsável legal imediatamente", () => {
  renderizarFormulario("/pacientes/novo");

  const responsavel = () => screen.getByLabelText("Responsável legal");
  const emailResponsavel = () =>
    screen.getByLabelText("Email do responsável legal");
  const cpfResponsavel = () =>
    screen.getByLabelText("CPF do responsável legal");

  expect(responsavel()).not.toBeRequired();
  expect(emailResponsavel()).not.toBeRequired();
  expect(cpfResponsavel()).not.toBeRequired();

  informarDataNascimento("2015-01-01");

  expect(responsavel()).toBeRequired();
  expect(emailResponsavel()).toBeRequired();
  expect(cpfResponsavel()).toBeRequired();

  informarDataNascimento("1990-03-10");

  expect(responsavel()).not.toBeRequired();
});

test("responder Sim exibe e exige os campos clínicos dependentes", async () => {
  const terapeuta = userEvent.setup();
  renderizarFormulario("/pacientes/novo");

  expect(
    screen.queryByLabelText("Quando fez terapia?"),
  ).not.toBeInTheDocument();
  await terapeuta.selectOptions(
    screen.getByLabelText("Já fez terapia?"),
    "Sim",
  );
  expect(screen.getByLabelText("Quando fez terapia?")).toBeRequired();

  expect(
    screen.queryByLabelText("Toma medicamento desde quando?"),
  ).not.toBeInTheDocument();
  await terapeuta.selectOptions(
    screen.getByLabelText("Toma algum medicamento?"),
    "Sim",
  );
  expect(
    screen.getByLabelText("Toma medicamento desde quando?"),
  ).toBeRequired();
  expect(screen.getByLabelText("Nomes dos medicamentos")).toBeRequired();

  expect(
    screen.queryByLabelText("Quando foi hospitalizado?"),
  ).not.toBeInTheDocument();
  await terapeuta.selectOptions(
    screen.getByLabelText("Já foi hospitalizado por questões psicológicas?"),
    "Sim",
  );
  expect(screen.getByLabelText("Quando foi hospitalizado?")).toBeRequired();
  expect(screen.getByLabelText("Razão da hospitalização")).toBeRequired();

  // Voltar para Não esconde os dependentes de novo.
  await terapeuta.selectOptions(
    screen.getByLabelText("Já fez terapia?"),
    "Não",
  );
  expect(
    screen.queryByLabelText("Quando fez terapia?"),
  ).not.toBeInTheDocument();
});

test("os enums do cadastro oferecem exatamente as opções da spec", () => {
  renderizarFormulario("/pacientes/novo");

  const opcoesDe = (rotulo: string) =>
    Array.from(
      (screen.getByLabelText(rotulo) as HTMLSelectElement).options,
    ).map((opcao) => opcao.label);

  expect(opcoesDe("Gênero")).toEqual([
    "Selecione…",
    "Masculino",
    "Feminino",
    "Não binário",
    "Prefiro não informar",
  ]);
  expect(opcoesDe("Religião")).toEqual([
    "Selecione…",
    "Ateu",
    "Budismo",
    "Candomblé",
    "Católica",
    "Espírita",
    "Espiritualista",
    "Evangélica",
    "Hinduísmo",
    "Islamismo",
    "Judaísmo",
    "Mórmon",
    "Sem religião",
    "Testemunha de Jeová",
    "Umbanda",
    "Outra",
    "Prefiro não informar",
  ]);
  expect(opcoesDe("Periodicidade da consulta")).toEqual([
    "Selecione…",
    "Semanal",
    "Quinzenal",
    "Mensal",
    "Esporádica",
  ]);
  expect(opcoesDe("Dia da semana da consulta")).toEqual([
    "Selecione…",
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
  ]);
  expect(opcoesDe("Já fez terapia?")).toEqual(["Selecione…", "Sim", "Não"]);
});

test("salvar com obrigatórios vazios aponta os campos e não grava nada", async () => {
  const terapeuta = userEvent.setup();
  renderizarFormulario("/pacientes/novo");

  await terapeuta.click(salvar());

  expect(
    (await screen.findAllByText("Campo obrigatório")).length,
  ).toBeGreaterThanOrEqual(9);
  expect(chamadas).toHaveLength(0);
});

test("CPF com dígitos verificadores errados é apontado e nada é gravado", async () => {
  const terapeuta = userEvent.setup();
  renderizarFormulario("/pacientes/novo");

  await preencherCamposObrigatorios(terapeuta);
  await terapeuta.clear(screen.getByLabelText("CPF"));
  await terapeuta.type(screen.getByLabelText("CPF"), "111.111.111-11");
  await terapeuta.click(salvar());

  expect(await screen.findByText("CPF inválido")).toBeInTheDocument();
  expect(chamadas).toHaveLength(0);
});

test("CPF já cadastrado aparece como erro no campo e nada é inserido", async () => {
  const terapeuta = userEvent.setup();
  renderizarFormulario("/pacientes/novo");
  enfileirarSelect([{ total: 1 }]);

  await preencherCamposObrigatorios(terapeuta);
  await terapeuta.click(salvar());

  expect(await screen.findByText("CPF já cadastrado")).toBeInTheDocument();
  expect(chamadas).toHaveLength(1);
  expect(chamadas[0].sql).toMatch(/select count/i);
});

test("cadastro válido persiste o paciente e volta à listagem", async () => {
  const terapeuta = userEvent.setup();
  renderizarFormulario("/pacientes/novo");
  enfileirarSelect([{ total: 0 }]);

  await preencherCamposObrigatorios(terapeuta);
  await terapeuta.click(salvar());

  expect(await screen.findByText("Listagem de pacientes")).toBeInTheDocument();
  expect(chamadas).toHaveLength(2);
  const [, insercao] = chamadas;
  expect(insercao.sql).toMatch(/insert into "pacientes"/i);
  expect(insercao.valores).toContain("Ana Lima");
  expect(insercao.valores).toContain("52998224725");
  expect(insercao.valores).toContain(25000);
});

test("edição carrega o paciente, mostra o CPF com máscara e salva a atualização", async () => {
  const terapeuta = userEvent.setup();
  enfileirarSelect([linhaDePaciente({ id: 7, ...dadosPacienteValidos() })]);
  renderizarFormulario("/pacientes/7/editar");

  expect(
    await screen.findByRole("heading", { name: "Editar Paciente" }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Nome completo")).toHaveValue("Ana Lima");
  expect(screen.getByLabelText("CPF")).toHaveValue("529.982.247-25");
  expect(screen.getByLabelText("Já fez terapia?")).toHaveValue("Não");
  expect(screen.getByLabelText("Valor da consulta (R$)")).toHaveValue("250,00");

  await terapeuta.clear(screen.getByLabelText("Nome completo"));
  await terapeuta.type(
    screen.getByLabelText("Nome completo"),
    "Ana Lima Santos",
  );
  enfileirarSelect([{ total: 0 }]);
  await terapeuta.click(salvar());

  expect(await screen.findByText("Listagem de pacientes")).toBeInTheDocument();
  expect(chamadas).toHaveLength(3);
  const [carga, conferencia, atualizacao] = chamadas;
  expect(carga.valores).toEqual([7, 1]);
  expect(conferencia.valores).toEqual(["52998224725", 7]);
  expect(atualizacao.sql).toMatch(/update "pacientes" set/i);
  expect(atualizacao.valores).toContain("Ana Lima Santos");
  expect(atualizacao.valores).toContain(7);
});

test("edição de paciente inexistente avisa em vez de mostrar o formulário", async () => {
  enfileirarSelect([]);
  renderizarFormulario("/pacientes/99/editar");

  expect(
    await screen.findByText("Não foi possível carregar o paciente."),
  ).toBeInTheDocument();
  expect(screen.queryByLabelText("Nome completo")).not.toBeInTheDocument();
});
