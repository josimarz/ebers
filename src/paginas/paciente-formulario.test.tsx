import { fireEvent, render, screen } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, expect, test, vi } from "vitest";
import {
  chamadasDeComando,
  programarComando,
  programarErroDeComando,
  reiniciarComandosFalsos,
} from "@/testes/comandos-falsos";
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

// Fronteiras do sistema: o SQLite atrás do tauri-plugin-sql e os comandos
// Tauri de foto atrás do invoke. O caminho página → dominio → db roda de
// verdade.
vi.mock("@tauri-apps/plugin-sql", () => import("@/testes/plugin-sql-falso"));
vi.mock("@tauri-apps/api/core", () => import("@/testes/comandos-falsos"));

beforeEach(() => {
  reiniciarBancoFalso();
  reiniciarComandosFalsos();
});

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
  await terapeuta.type(
    screen.getByLabelText("Motivo da terapia"),
    "Ansiedade no trabalho",
  );
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

const DICA_DO_TABLET =
  "Conte com suas palavras. Não precisa ser detalhado, a terapeuta vai conversar sobre isso com você.";

const ultima = <T,>(itens: T[]): T | undefined => itens[itens.length - 1];

test("novo cadastro nasce com o Valor da consulta pré-preenchido e editável", () => {
  renderizarFormulario("/pacientes/novo");

  expect(
    screen.getByRole("heading", { name: "Novo Paciente" }),
  ).toBeInTheDocument();
  const valor = screen.getByLabelText("Valor da consulta (R$)");
  expect(valor).toHaveValue("250,00");
  expect(valor).toBeEnabled();
});

test("Motivo da terapia tem seção própria entre Contato e Histórico clínico, obrigatória e sem dica no desktop", () => {
  renderizarFormulario("/pacientes/novo");

  expect(
    screen
      .getAllByRole("heading", { level: 2 })
      .map((titulo) => titulo.textContent),
  ).toEqual([
    "Dados pessoais",
    "Responsável legal",
    "Contato",
    "Motivo da terapia",
    "Histórico clínico",
    "Consulta",
  ]);
  const motivo = screen.getByLabelText("Motivo da terapia");
  // Texto livre multilinha, nas palavras do Paciente — nunca uma lista.
  expect(motivo.tagName).toBe("TEXTAREA");
  expect(motivo).toBeRequired();
  expect(screen.queryByText(DICA_DO_TABLET)).not.toBeInTheDocument();
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

test("campos clínicos dependentes ficam sempre na tela, só de leitura até a resposta ser Sim", async () => {
  const terapeuta = userEvent.setup();
  renderizarFormulario("/pacientes/novo");

  const dependentes = [
    "Quando fez terapia?",
    "Toma medicamento desde quando?",
    "Nomes dos medicamentos",
    "Quando foi hospitalizado?",
    "Razão da hospitalização",
  ];
  for (const rotulo of dependentes) {
    const campo = screen.getByLabelText(rotulo);
    expect(campo).toHaveAttribute("readonly");
    expect(campo).not.toBeRequired();
  }

  await terapeuta.selectOptions(
    screen.getByLabelText("Já fez terapia?"),
    "Sim",
  );
  expect(screen.getByLabelText("Quando fez terapia?")).not.toHaveAttribute(
    "readonly",
  );
  expect(screen.getByLabelText("Quando fez terapia?")).toBeRequired();
  // Só os dependentes daquela pergunta saem do somente-leitura.
  expect(screen.getByLabelText("Nomes dos medicamentos")).toHaveAttribute(
    "readonly",
  );

  await terapeuta.selectOptions(
    screen.getByLabelText("Toma algum medicamento?"),
    "Sim",
  );
  expect(
    screen.getByLabelText("Toma medicamento desde quando?"),
  ).toBeRequired();
  expect(screen.getByLabelText("Nomes dos medicamentos")).toBeRequired();

  await terapeuta.selectOptions(
    screen.getByLabelText("Já foi hospitalizado por questões psicológicas?"),
    "Sim",
  );
  expect(screen.getByLabelText("Quando foi hospitalizado?")).toBeRequired();
  expect(screen.getByLabelText("Razão da hospitalização")).toBeRequired();
});

test("voltar para Não tranca o campo dependente e apaga o que estava nele", async () => {
  const terapeuta = userEvent.setup();
  renderizarFormulario("/pacientes/novo");

  await terapeuta.selectOptions(
    screen.getByLabelText("Já fez terapia?"),
    "Sim",
  );
  await terapeuta.type(
    screen.getByLabelText("Quando fez terapia?"),
    "Entre 2018 e 2020",
  );

  await terapeuta.selectOptions(
    screen.getByLabelText("Já fez terapia?"),
    "Não",
  );

  const campo = screen.getByLabelText("Quando fez terapia?");
  expect(campo).toHaveAttribute("readonly");
  expect(campo).toHaveValue("");
  expect(campo).not.toBeRequired();
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

test("CPF ganha a máscara a cada dígito digitado, nos dois campos de CPF", async () => {
  const terapeuta = userEvent.setup();
  renderizarFormulario("/pacientes/novo");

  const cpf = screen.getByLabelText("CPF");
  await terapeuta.type(cpf, "529");
  expect(cpf).toHaveValue("529");
  await terapeuta.type(cpf, "9");
  expect(cpf).toHaveValue("529.9");
  await terapeuta.type(cpf, "82247");
  expect(cpf).toHaveValue("529.982.247");
  // Depois do 11º dígito a máscara está completa e o resto é ignorado.
  await terapeuta.type(cpf, "25999");
  expect(cpf).toHaveValue("529.982.247-25");

  await terapeuta.type(
    screen.getByLabelText("CPF do responsável legal"),
    "12345678909",
  );
  expect(screen.getByLabelText("CPF do responsável legal")).toHaveValue(
    "123.456.789-09",
  );
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
  expect(insercao.valores).toContain("Ansiedade no trabalho");
  expect(insercao.valores).toContain(25000);
});

test("Paciente cadastrado antes do Motivo da terapia abre com o campo vazio e só salva depois de preenchê-lo", async () => {
  const terapeuta = userEvent.setup();
  enfileirarSelect([
    linhaDePaciente({
      id: 7,
      ...dadosPacienteValidos({ motivoTerapia: null }),
    }),
  ]);
  renderizarFormulario("/pacientes/7/editar");

  expect(
    await screen.findByRole("heading", { name: "Editar Paciente" }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Motivo da terapia")).toHaveValue("");

  await terapeuta.click(salvar());

  expect(await screen.findByText("Campo obrigatório")).toBeInTheDocument();
  expect(screen.getByLabelText("Motivo da terapia")).toBeInvalid();
  // Só a carga do paciente; nenhuma gravação.
  expect(chamadas).toHaveLength(1);

  await terapeuta.type(
    screen.getByLabelText("Motivo da terapia"),
    "Luto recente",
  );
  enfileirarSelect([{ total: 0 }]);
  await terapeuta.click(salvar());

  expect(await screen.findByText("Listagem de pacientes")).toBeInTheDocument();
  const atualizacao = ultima(chamadas);
  expect(atualizacao?.sql).toMatch(/update "pacientes" set/i);
  expect(atualizacao?.valores).toContain("Luto recente");
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

test("anexar foto mostra a prévia e salvar grava o arquivo e o nome no banco", async () => {
  const terapeuta = userEvent.setup();
  renderizarFormulario("/pacientes/novo");

  await terapeuta.upload(
    screen.getByLabelText("Anexar foto"),
    new File([new Uint8Array([1, 2, 3])], "ana.png", { type: "image/png" }),
  );

  expect(
    await screen.findByAltText("Prévia da foto de perfil"),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Trocar foto")).toBeInTheDocument();

  await preencherCamposObrigatorios(terapeuta);
  programarComando("salvar_foto_paciente", "foto-123.jpg");
  enfileirarSelect([{ total: 0 }]);
  await terapeuta.click(salvar());

  expect(await screen.findByText("Listagem de pacientes")).toBeInTheDocument();
  expect(chamadasDeComando).toHaveLength(1);
  expect(chamadasDeComando[0].comando).toBe("salvar_foto_paciente");
  expect(Array.from(chamadasDeComando[0].argumentos as Uint8Array)).toEqual([
    1, 2, 3,
  ]);
  const insercao = ultima(chamadas);
  expect(insercao?.sql).toMatch(/insert into "pacientes"/i);
  expect(insercao?.valores).toContain("foto-123.jpg");
});

test("cadastro sem foto não aciona o backend de fotos", async () => {
  const terapeuta = userEvent.setup();
  renderizarFormulario("/pacientes/novo");
  enfileirarSelect([{ total: 0 }]);

  await preencherCamposObrigatorios(terapeuta);
  await terapeuta.click(salvar());

  expect(await screen.findByText("Listagem de pacientes")).toBeInTheDocument();
  expect(chamadasDeComando).toHaveLength(0);
});

/** Abre a edição do paciente 7, que tem a foto "foto-7.jpg" gravada. */
async function abrirEdicaoComFoto() {
  enfileirarSelect([
    linhaDePaciente({ id: 7, ...dadosPacienteValidos({ foto: "foto-7.jpg" }) }),
  ]);
  programarComando("carregar_foto_paciente", new Uint8Array([9, 9]));
  renderizarFormulario("/pacientes/7/editar");
  await screen.findByAltText("Foto de Ana Lima");
}

test("salvar a edição sem mexer na foto preserva a foto atual", async () => {
  const terapeuta = userEvent.setup();
  await abrirEdicaoComFoto();

  enfileirarSelect([{ total: 0 }]);
  await terapeuta.click(salvar());

  expect(await screen.findByText("Listagem de pacientes")).toBeInTheDocument();
  const atualizacao = ultima(chamadas);
  expect(atualizacao?.sql).toMatch(/update "pacientes" set/i);
  expect(atualizacao?.valores).toContain("foto-7.jpg");
  // Só a leitura para exibir — nenhuma gravação ou remoção de arquivo.
  expect(chamadasDeComando.map((chamada) => chamada.comando)).toEqual([
    "carregar_foto_paciente",
  ]);
});

test("remover a foto limpa o cadastro e apaga o arquivo depois de salvar", async () => {
  const terapeuta = userEvent.setup();
  await abrirEdicaoComFoto();

  await terapeuta.click(screen.getByRole("button", { name: "Remover foto" }));
  expect(screen.queryByAltText("Foto de Ana Lima")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Anexar foto")).toBeInTheDocument();

  enfileirarSelect([{ total: 0 }]);
  programarComando("remover_foto_paciente", null);
  await terapeuta.click(salvar());

  expect(await screen.findByText("Listagem de pacientes")).toBeInTheDocument();
  const atualizacao = ultima(chamadas);
  expect(atualizacao?.sql).toMatch(/update "pacientes" set/i);
  expect(atualizacao?.valores).not.toContain("foto-7.jpg");
  expect(ultima(chamadasDeComando)).toEqual({
    comando: "remover_foto_paciente",
    argumentos: { arquivo: "foto-7.jpg" },
  });
});

test("trocar a foto grava a nova e apaga a antiga depois de salvar", async () => {
  const terapeuta = userEvent.setup();
  await abrirEdicaoComFoto();

  await terapeuta.upload(
    screen.getByLabelText("Trocar foto"),
    new File([new Uint8Array([4, 5])], "nova.png", { type: "image/png" }),
  );
  expect(
    await screen.findByAltText("Prévia da foto de perfil"),
  ).toBeInTheDocument();

  programarComando("salvar_foto_paciente", "foto-8.jpg");
  programarComando("remover_foto_paciente", null);
  enfileirarSelect([{ total: 0 }]);
  await terapeuta.click(salvar());

  expect(await screen.findByText("Listagem de pacientes")).toBeInTheDocument();
  expect(ultima(chamadas)?.valores).toContain("foto-8.jpg");
  expect(chamadasDeComando.map((chamada) => chamada.comando)).toEqual([
    "carregar_foto_paciente",
    "salvar_foto_paciente",
    "remover_foto_paciente",
  ]);
  expect(ultima(chamadasDeComando)?.argumentos).toEqual({
    arquivo: "foto-7.jpg",
  });
});

test("banco recusando o cadastro apaga a foto recém-gravada em vez de deixá-la órfã", async () => {
  const terapeuta = userEvent.setup();
  renderizarFormulario("/pacientes/novo");

  await preencherCamposObrigatorios(terapeuta);
  await terapeuta.upload(
    screen.getByLabelText("Anexar foto"),
    new File([new Uint8Array([1])], "ana.png", { type: "image/png" }),
  );
  await screen.findByAltText("Prévia da foto de perfil");

  // CPF já cadastrado: a foto foi gravada antes, mas o cadastro não entra.
  programarComando("salvar_foto_paciente", "foto-9.jpg");
  programarComando("remover_foto_paciente", null);
  enfileirarSelect([{ total: 1 }]);
  await terapeuta.click(salvar());

  expect(await screen.findByText("CPF já cadastrado")).toBeInTheDocument();
  expect(chamadasDeComando.map((chamada) => chamada.comando)).toEqual([
    "salvar_foto_paciente",
    "remover_foto_paciente",
  ]);
  expect(ultima(chamadasDeComando)?.argumentos).toEqual({
    arquivo: "foto-9.jpg",
  });
});

test("falha ao gravar a foto avisa e não persiste o paciente", async () => {
  const terapeuta = userEvent.setup();
  renderizarFormulario("/pacientes/novo");

  await preencherCamposObrigatorios(terapeuta);
  await terapeuta.upload(
    screen.getByLabelText("Anexar foto"),
    new File([new Uint8Array([1])], "ana.png", { type: "image/png" }),
  );
  await screen.findByAltText("Prévia da foto de perfil");

  programarErroDeComando(
    "salvar_foto_paciente",
    "O arquivo não é uma imagem válida",
  );
  await terapeuta.click(salvar());

  expect(
    await screen.findByText("Não foi possível salvar. Tente de novo."),
  ).toBeInTheDocument();
  expect(chamadas).toHaveLength(0);
});

test("edição de paciente inexistente avisa em vez de mostrar o formulário", async () => {
  enfileirarSelect([]);
  renderizarFormulario("/pacientes/99/editar");

  expect(
    await screen.findByText("Não foi possível carregar o paciente."),
  ).toBeInTheDocument();
  expect(screen.queryByLabelText("Nome completo")).not.toBeInTheDocument();
});
