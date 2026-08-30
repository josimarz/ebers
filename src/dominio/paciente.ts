import { formatarCpf, validarCpf } from "./cpf";
import { formatarReais, parsearReais } from "./dinheiro";
import { calcularIdade } from "./idade";

// Enums do cadastro de Paciente (spec 1.1) — valores exatos exibidos na UI.
export const GENEROS = [
  "Masculino",
  "Feminino",
  "Não binário",
  "Prefiro não informar",
] as const;

export const RELIGIOES = [
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
] as const;

export const PERIODICIDADES = [
  "Semanal",
  "Quinzenal",
  "Mensal",
  "Esporádica",
] as const;

export const DIAS_SEMANA_CONSULTA = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const;

/** Opções das perguntas clínicas de Sim/Não (spec 1.1). */
export const SIM_NAO = ["Sim", "Não"] as const;

export type Genero = (typeof GENEROS)[number];
export type Religiao = (typeof RELIGIOES)[number];
export type Periodicidade = (typeof PERIODICIDADES)[number];
export type DiaSemanaConsulta = (typeof DIAS_SEMANA_CONSULTA)[number];

/** Valor padrão da consulta do consultório — fixo no v1 (spec 1.1). */
export const VALOR_PADRAO_CONSULTA_CENTAVOS = 25000;

/** Estado bruto do formulário: tudo string, como digitado nos campos. */
export interface FormularioPaciente {
  nomeCompleto: string;
  dataNascimento: string;
  genero: string;
  cpf: string;
  rg: string;
  religiao: string;
  responsavelLegal: string;
  emailResponsavelLegal: string;
  cpfResponsavelLegal: string;
  telefone1: string;
  telefone2: string;
  email: string;
  jaFezTerapia: string;
  quandoFezTerapia: string;
  tomaMedicamento: string;
  tomaMedicamentoDesdeQuando: string;
  nomesMedicamentos: string;
  jaFoiHospitalizado: string;
  quandoFoiHospitalizado: string;
  razaoHospitalizacao: string;
  valorConsulta: string;
  periodicidade: string;
  diaSemanaConsulta: string;
}

/** Formulário em branco do modo desktop: Valor da consulta já pré-preenchido. */
export const FORMULARIO_PACIENTE_VAZIO: FormularioPaciente = {
  nomeCompleto: "",
  dataNascimento: "",
  genero: "",
  cpf: "",
  rg: "",
  religiao: "",
  responsavelLegal: "",
  emailResponsavelLegal: "",
  cpfResponsavelLegal: "",
  telefone1: "",
  telefone2: "",
  email: "",
  jaFezTerapia: "",
  quandoFezTerapia: "",
  tomaMedicamento: "",
  tomaMedicamentoDesdeQuando: "",
  nomesMedicamentos: "",
  jaFoiHospitalizado: "",
  quandoFoiHospitalizado: "",
  razaoHospitalizacao: "",
  valorConsulta: formatarReais(VALOR_PADRAO_CONSULTA_CENTAVOS),
  periodicidade: "",
  diaSemanaConsulta: "",
};

export type ErrosPaciente = Partial<Record<keyof FormularioPaciente, string>>;

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Menor de 18 anos na data de referência. Enquanto a data de nascimento
 * está vazia ou incompleta, ninguém é tratado como menor.
 */
export function ehMenorDeIdade(dataNascimento: string, hoje: string): boolean {
  if (!DATA_ISO.test(dataNascimento)) return false;
  return calcularIdade(dataNascimento, hoje) < 18;
}

/**
 * Campos clínicos que só valem quando a pergunta correspondente é "Sim"
 * (spec 1.1). Ficam sempre na tela, apenas somente-leitura enquanto a
 * resposta não for "Sim".
 */
const DEPENDENTES_CLINICOS: Partial<
  Record<keyof FormularioPaciente, readonly (keyof FormularioPaciente)[]>
> = {
  jaFezTerapia: ["quandoFezTerapia"],
  tomaMedicamento: ["tomaMedicamentoDesdeQuando", "nomesMedicamentos"],
  jaFoiHospitalizado: ["quandoFoiHospitalizado", "razaoHospitalizacao"],
};

/**
 * Altera um campo do formulário. Responder algo diferente de "Sim" a uma
 * pergunta clínica esvazia os campos que dependiam dela: o que está na tela
 * passa a ser exatamente o que formularioParaDados gravaria.
 */
export function alterarFormularioPaciente(
  dados: FormularioPaciente,
  campo: keyof FormularioPaciente,
  valor: string,
): FormularioPaciente {
  const alterado = { ...dados, [campo]: valor };
  if (valor !== "Sim") {
    for (const dependente of DEPENDENTES_CLINICOS[campo] ?? []) {
      alterado[dependente] = "";
    }
  }
  return alterado;
}

const CAMPOS_SEMPRE_OBRIGATORIOS = [
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
] as const satisfies readonly (keyof FormularioPaciente)[];

/**
 * Valida o formulário de Paciente (spec 1.1): obrigatórios, condicionais
 * reativos e formatos. Devolve mensagens por campo; sem erros = objeto vazio.
 */
export function validarFormularioPaciente(
  dados: FormularioPaciente,
  hoje: string,
): ErrosPaciente {
  const erros: ErrosPaciente = {};

  const exigir = (campo: keyof FormularioPaciente) => {
    if (dados[campo].trim() === "") erros[campo] = "Campo obrigatório";
  };

  for (const campo of CAMPOS_SEMPRE_OBRIGATORIOS) exigir(campo);

  // Regra reativa: menor de 18 anos exige os três campos do Responsável legal.
  if (ehMenorDeIdade(dados.dataNascimento, hoje)) {
    exigir("responsavelLegal");
    exigir("emailResponsavelLegal");
    exigir("cpfResponsavelLegal");
  }

  // Condicionais clínicos: "Sim" torna os campos dependentes obrigatórios.
  if (dados.jaFezTerapia === "Sim") exigir("quandoFezTerapia");
  if (dados.tomaMedicamento === "Sim") {
    exigir("tomaMedicamentoDesdeQuando");
    exigir("nomesMedicamentos");
  }
  if (dados.jaFoiHospitalizado === "Sim") {
    exigir("quandoFoiHospitalizado");
    exigir("razaoHospitalizacao");
  }

  // Formatos, só sobre o que está preenchido (vazio já é tratado acima).
  const validarFormato = (
    campo: keyof FormularioPaciente,
    valido: (valor: string) => boolean,
    mensagem: string,
  ) => {
    const valor = dados[campo].trim();
    if (valor !== "" && !erros[campo] && !valido(valor)) {
      erros[campo] = mensagem;
    }
  };

  validarFormato("cpf", validarCpf, "CPF inválido");
  validarFormato("cpfResponsavelLegal", validarCpf, "CPF inválido");
  validarFormato("email", ehEmailValido, "Email inválido");
  validarFormato("emailResponsavelLegal", ehEmailValido, "Email inválido");
  validarFormato(
    "valorConsulta",
    (valor) => parsearReais(valor) !== null,
    "Valor inválido",
  );
  validarFormato(
    "dataNascimento",
    (valor) => !DATA_ISO.test(valor) || valor <= hoje,
    "Data no futuro",
  );

  // Pertencimento aos enums: o select fecha as opções na UI, mas o domínio
  // não confia na tela — é isto que respalda os casts de formularioParaDados.
  const validarOpcao = (
    campo: keyof FormularioPaciente,
    opcoes: readonly string[],
  ) => {
    validarFormato(campo, (valor) => opcoes.includes(valor), "Opção inválida");
  };

  validarOpcao("genero", GENEROS);
  validarOpcao("religiao", RELIGIOES);
  validarOpcao("jaFezTerapia", SIM_NAO);
  validarOpcao("tomaMedicamento", SIM_NAO);
  validarOpcao("jaFoiHospitalizado", SIM_NAO);
  validarOpcao("periodicidade", PERIODICIDADES);
  validarOpcao("diaSemanaConsulta", DIAS_SEMANA_CONSULTA);

  return erros;
}

function ehEmailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Registro de Paciente como vai ao banco (sem id): tipos do domínio. */
export interface DadosPaciente {
  nomeCompleto: string;
  /** Nome do arquivo no diretório de fotos do backend; null = sem foto. */
  foto: string | null;
  dataNascimento: string;
  genero: Genero;
  cpf: string;
  rg: string | null;
  religiao: Religiao;
  responsavelLegal: string | null;
  emailResponsavelLegal: string | null;
  cpfResponsavelLegal: string | null;
  telefone1: string;
  telefone2: string | null;
  email: string | null;
  jaFezTerapia: boolean;
  quandoFezTerapia: string | null;
  tomaMedicamento: boolean;
  tomaMedicamentoDesdeQuando: string | null;
  nomesMedicamentos: string | null;
  jaFoiHospitalizado: boolean;
  quandoFoiHospitalizado: string | null;
  razaoHospitalizacao: string | null;
  valorConsultaCentavos: number;
  periodicidade: Periodicidade | null;
  diaSemanaConsulta: DiaSemanaConsulta | null;
}

/**
 * Converte o formulário já validado no registro do banco. CPF é normalizado
 * para só dígitos; campos dependentes de uma resposta "Não" são descartados.
 * A foto não é um campo do formulário: é o nome de arquivo devolvido pelo
 * backend ao gravar a imagem, decidido pela página na hora de salvar.
 */
export function formularioParaDados(
  dados: FormularioPaciente,
  foto: string | null,
): DadosPaciente {
  const texto = (valor: string): string | null => {
    const aparado = valor.trim();
    return aparado === "" ? null : aparado;
  };
  const dependente = (resposta: string, valor: string): string | null =>
    resposta === "Sim" ? texto(valor) : null;

  return {
    nomeCompleto: dados.nomeCompleto.trim(),
    foto,
    dataNascimento: dados.dataNascimento,
    genero: dados.genero as Genero,
    cpf: dados.cpf.replace(/\D/g, ""),
    rg: texto(dados.rg),
    religiao: dados.religiao as Religiao,
    responsavelLegal: texto(dados.responsavelLegal),
    emailResponsavelLegal: texto(dados.emailResponsavelLegal),
    cpfResponsavelLegal: texto(dados.cpfResponsavelLegal),
    telefone1: dados.telefone1.trim(),
    telefone2: texto(dados.telefone2),
    email: texto(dados.email),
    jaFezTerapia: dados.jaFezTerapia === "Sim",
    quandoFezTerapia: dependente(dados.jaFezTerapia, dados.quandoFezTerapia),
    tomaMedicamento: dados.tomaMedicamento === "Sim",
    tomaMedicamentoDesdeQuando: dependente(
      dados.tomaMedicamento,
      dados.tomaMedicamentoDesdeQuando,
    ),
    nomesMedicamentos: dependente(
      dados.tomaMedicamento,
      dados.nomesMedicamentos,
    ),
    jaFoiHospitalizado: dados.jaFoiHospitalizado === "Sim",
    quandoFoiHospitalizado: dependente(
      dados.jaFoiHospitalizado,
      dados.quandoFoiHospitalizado,
    ),
    razaoHospitalizacao: dependente(
      dados.jaFoiHospitalizado,
      dados.razaoHospitalizacao,
    ),
    valorConsultaCentavos: parsearReais(dados.valorConsulta) ?? 0,
    periodicidade: (texto(dados.periodicidade) as Periodicidade | null) ?? null,
    diaSemanaConsulta:
      (texto(dados.diaSemanaConsulta) as DiaSemanaConsulta | null) ?? null,
  };
}

/** Inverso de formularioParaDados: carrega um registro no formulário (edição). */
export function dadosParaFormulario(dados: DadosPaciente): FormularioPaciente {
  const simNao = (valor: boolean): string => (valor ? "Sim" : "Não");

  return {
    nomeCompleto: dados.nomeCompleto,
    dataNascimento: dados.dataNascimento,
    genero: dados.genero,
    cpf: formatarCpf(dados.cpf),
    rg: dados.rg ?? "",
    religiao: dados.religiao,
    responsavelLegal: dados.responsavelLegal ?? "",
    emailResponsavelLegal: dados.emailResponsavelLegal ?? "",
    cpfResponsavelLegal: dados.cpfResponsavelLegal ?? "",
    telefone1: dados.telefone1,
    telefone2: dados.telefone2 ?? "",
    email: dados.email ?? "",
    jaFezTerapia: simNao(dados.jaFezTerapia),
    quandoFezTerapia: dados.quandoFezTerapia ?? "",
    tomaMedicamento: simNao(dados.tomaMedicamento),
    tomaMedicamentoDesdeQuando: dados.tomaMedicamentoDesdeQuando ?? "",
    nomesMedicamentos: dados.nomesMedicamentos ?? "",
    jaFoiHospitalizado: simNao(dados.jaFoiHospitalizado),
    quandoFoiHospitalizado: dados.quandoFoiHospitalizado ?? "",
    razaoHospitalizacao: dados.razaoHospitalizacao ?? "",
    valorConsulta: formatarReais(dados.valorConsultaCentavos),
    periodicidade: dados.periodicidade ?? "",
    diaSemanaConsulta: dados.diaSemanaConsulta ?? "",
  };
}
