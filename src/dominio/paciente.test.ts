import { expect, test } from "vitest";
import {
  type DadosPaciente,
  dadosParaFormulario,
  ehMenorDeIdade,
  type FormularioPaciente,
  formularioParaDados,
  validarFormularioPaciente,
} from "./paciente";

const HOJE = "2026-08-08";

function formularioValido(
  ajustes: Partial<FormularioPaciente> = {},
): FormularioPaciente {
  return {
    nomeCompleto: "Ana Lima",
    dataNascimento: "1990-03-10",
    genero: "Feminino",
    cpf: "529.982.247-25",
    rg: "",
    religiao: "Sem religião",
    responsavelLegal: "",
    emailResponsavelLegal: "",
    cpfResponsavelLegal: "",
    telefone1: "(11) 91234-5678",
    telefone2: "",
    email: "ana@exemplo.com",
    jaFezTerapia: "Não",
    quandoFezTerapia: "",
    tomaMedicamento: "Não",
    tomaMedicamentoDesdeQuando: "",
    nomesMedicamentos: "",
    jaFoiHospitalizado: "Não",
    quandoFoiHospitalizado: "",
    razaoHospitalizacao: "",
    valorConsulta: "250,00",
    periodicidade: "Semanal",
    diaSemanaConsulta: "Quarta",
    ...ajustes,
  };
}

test("formulário completo e válido não tem erros", () => {
  expect(validarFormularioPaciente(formularioValido(), HOJE)).toEqual({});
});

test("campos obrigatórios vazios são apontados", () => {
  const erros = validarFormularioPaciente(
    formularioValido({
      nomeCompleto: "  ",
      dataNascimento: "",
      genero: "",
      cpf: "",
      religiao: "",
      telefone1: "",
      jaFezTerapia: "",
      tomaMedicamento: "",
      jaFoiHospitalizado: "",
      valorConsulta: "",
    }),
    HOJE,
  );

  for (const campo of [
    "nomeCompleto",
    "dataNascimento",
    "genero",
    "cpf",
    "religiao",
    "telefone1",
    "jaFezTerapia",
    "tomaMedicamento",
    "jaFoiHospitalizado",
    "valorConsulta",
  ] as const) {
    expect(erros[campo], campo).toBe("Campo obrigatório");
  }
});

test("menor de 18 anos exige os três campos do Responsável legal", () => {
  const erros = validarFormularioPaciente(
    formularioValido({ dataNascimento: "2010-05-20" }),
    HOJE,
  );

  expect(erros.responsavelLegal).toBe("Campo obrigatório");
  expect(erros.emailResponsavelLegal).toBe("Campo obrigatório");
  expect(erros.cpfResponsavelLegal).toBe("Campo obrigatório");
});

test("quem completa 18 anos hoje não precisa de Responsável legal", () => {
  const erros = validarFormularioPaciente(
    formularioValido({ dataNascimento: "2008-08-08" }),
    HOJE,
  );
  expect(erros).toEqual({});
});

test("menor de 18 com responsável preenchido e válido passa", () => {
  const erros = validarFormularioPaciente(
    formularioValido({
      dataNascimento: "2010-05-20",
      responsavelLegal: "Marcos Lima",
      emailResponsavelLegal: "marcos@exemplo.com",
      cpfResponsavelLegal: "123.456.789-09",
    }),
    HOJE,
  );
  expect(erros).toEqual({});
});

test("responder Sim exige os campos clínicos dependentes", () => {
  const erros = validarFormularioPaciente(
    formularioValido({
      jaFezTerapia: "Sim",
      tomaMedicamento: "Sim",
      jaFoiHospitalizado: "Sim",
    }),
    HOJE,
  );

  expect(erros.quandoFezTerapia).toBe("Campo obrigatório");
  expect(erros.tomaMedicamentoDesdeQuando).toBe("Campo obrigatório");
  expect(erros.nomesMedicamentos).toBe("Campo obrigatório");
  expect(erros.quandoFoiHospitalizado).toBe("Campo obrigatório");
  expect(erros.razaoHospitalizacao).toBe("Campo obrigatório");
});

test("respondendo Sim com os dependentes preenchidos passa", () => {
  const erros = validarFormularioPaciente(
    formularioValido({
      jaFezTerapia: "Sim",
      quandoFezTerapia: "Entre 2018 e 2020",
      tomaMedicamento: "Sim",
      tomaMedicamentoDesdeQuando: "Desde 2021",
      nomesMedicamentos: "Sertralina 50mg",
      jaFoiHospitalizado: "Sim",
      quandoFoiHospitalizado: "Em 2019",
      razaoHospitalizacao: "Crise de ansiedade",
    }),
    HOJE,
  );
  expect(erros).toEqual({});
});

test("CPF com dígitos verificadores errados é rejeitado", () => {
  const erros = validarFormularioPaciente(
    formularioValido({ cpf: "529.982.247-24" }),
    HOJE,
  );
  expect(erros.cpf).toBe("CPF inválido");
});

test("CPF do responsável, quando preenchido, também é validado", () => {
  const erros = validarFormularioPaciente(
    formularioValido({ cpfResponsavelLegal: "111.111.111-11" }),
    HOJE,
  );
  expect(erros.cpfResponsavelLegal).toBe("CPF inválido");
});

test("emails preenchidos precisam ter formato válido", () => {
  const erros = validarFormularioPaciente(
    formularioValido({
      email: "ana@",
      emailResponsavelLegal: "sem-arroba",
    }),
    HOJE,
  );
  expect(erros.email).toBe("Email inválido");
  expect(erros.emailResponsavelLegal).toBe("Email inválido");
});

test("valor da consulta precisa ser um valor em reais", () => {
  const erros = validarFormularioPaciente(
    formularioValido({ valorConsulta: "abc" }),
    HOJE,
  );
  expect(erros.valorConsulta).toBe("Valor inválido");
});

test("data de nascimento no futuro é rejeitada", () => {
  const erros = validarFormularioPaciente(
    formularioValido({ dataNascimento: "2027-01-01" }),
    HOJE,
  );
  expect(erros.dataNascimento).toBe("Data no futuro");
});

test("menor de idade é reconhecido pela data de nascimento", () => {
  expect(ehMenorDeIdade("2010-05-20", HOJE)).toBe(true);
  expect(ehMenorDeIdade("2008-08-08", HOJE)).toBe(false);
  expect(ehMenorDeIdade("", HOJE)).toBe(false);
});

test("opção fora do enum é rejeitada, mesmo chegando por fora do select", () => {
  const erros = validarFormularioPaciente(
    formularioValido({
      genero: "Outro",
      religiao: "Jedi",
      jaFezTerapia: "Talvez",
      periodicidade: "Diária",
      diaSemanaConsulta: "Domingo",
    }),
    HOJE,
  );

  expect(erros.genero).toBe("Opção inválida");
  expect(erros.religiao).toBe("Opção inválida");
  expect(erros.jaFezTerapia).toBe("Opção inválida");
  expect(erros.periodicidade).toBe("Opção inválida");
  expect(erros.diaSemanaConsulta).toBe("Opção inválida");
});

test("campos opcionais vazios não geram erro", () => {
  const erros = validarFormularioPaciente(
    formularioValido({
      rg: "",
      telefone2: "",
      email: "",
      periodicidade: "",
      diaSemanaConsulta: "",
    }),
    HOJE,
  );
  expect(erros).toEqual({});
});

test("converte o formulário validado no registro do banco", () => {
  const dados = formularioParaDados(
    formularioValido({
      jaFezTerapia: "Sim",
      quandoFezTerapia: "Entre 2018 e 2020",
      rg: "",
      telefone2: "",
    }),
  );

  expect(dados).toEqual({
    nomeCompleto: "Ana Lima",
    dataNascimento: "1990-03-10",
    genero: "Feminino",
    cpf: "52998224725",
    rg: null,
    religiao: "Sem religião",
    responsavelLegal: null,
    emailResponsavelLegal: null,
    cpfResponsavelLegal: null,
    telefone1: "(11) 91234-5678",
    telefone2: null,
    email: "ana@exemplo.com",
    jaFezTerapia: true,
    quandoFezTerapia: "Entre 2018 e 2020",
    tomaMedicamento: false,
    tomaMedicamentoDesdeQuando: null,
    nomesMedicamentos: null,
    jaFoiHospitalizado: false,
    quandoFoiHospitalizado: null,
    razaoHospitalizacao: null,
    valorConsultaCentavos: 25000,
    periodicidade: "Semanal",
    diaSemanaConsulta: "Quarta",
  } satisfies DadosPaciente);
});

test("resposta Não descarta o que sobrou nos campos dependentes", () => {
  const dados = formularioParaDados(
    formularioValido({
      jaFezTerapia: "Não",
      quandoFezTerapia: "texto esquecido após trocar para Não",
    }),
  );
  expect(dados.jaFezTerapia).toBe(false);
  expect(dados.quandoFezTerapia).toBeNull();
});

test("registro do banco volta ao formulário para edição", () => {
  const ida = formularioValido({
    cpf: "529.982.247-25",
    jaFezTerapia: "Sim",
    quandoFezTerapia: "Entre 2018 e 2020",
    rg: "",
    telefone2: "",
    periodicidade: "",
    diaSemanaConsulta: "",
  });

  const volta = dadosParaFormulario(formularioParaDados(ida));

  expect(volta).toEqual(ida);
});
