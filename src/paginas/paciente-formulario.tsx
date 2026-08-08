import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNativo } from "@/components/ui/select-nativo";
import {
  atualizarPaciente,
  buscarPaciente,
  CpfJaCadastradoError,
  criarPaciente,
} from "@/db/pacientes";
import { hojeIso } from "@/dominio/idade";
import {
  DIAS_SEMANA_CONSULTA,
  dadosParaFormulario,
  type ErrosPaciente,
  ehMenorDeIdade,
  FORMULARIO_PACIENTE_VAZIO,
  type FormularioPaciente,
  formularioParaDados,
  GENEROS,
  PERIODICIDADES,
  RELIGIOES,
  SIM_NAO,
  validarFormularioPaciente,
} from "@/dominio/paciente";

type Carga = "carregando" | "pronto" | "erro";

export function PaginaFormularioPaciente() {
  const { id } = useParams();
  const idPaciente = id === undefined ? undefined : Number(id);
  const editando = idPaciente !== undefined;

  const [carga, setCarga] = useState<Carga>(editando ? "carregando" : "pronto");
  const [formulario, setFormulario] = useState(FORMULARIO_PACIENTE_VAZIO);
  const [erros, setErros] = useState<ErrosPaciente>({});
  const [tentouSalvar, setTentouSalvar] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroAoSalvar, setErroAoSalvar] = useState(false);
  const navegar = useNavigate();

  useEffect(() => {
    if (idPaciente === undefined) return;
    let ativo = true;
    buscarPaciente(idPaciente)
      .then((paciente) => {
        if (!ativo) return;
        if (paciente) {
          setFormulario(dadosParaFormulario(paciente));
          setCarga("pronto");
        } else {
          setCarga("erro");
        }
      })
      .catch(() => {
        if (ativo) setCarga("erro");
      });
    return () => {
      ativo = false;
    };
  }, [idPaciente]);

  const hoje = hojeIso();
  const menorDeIdade = ehMenorDeIdade(formulario.dataNascimento, hoje);

  const alterar = (campo: keyof FormularioPaciente) => (valor: string) => {
    const proximo = { ...formulario, [campo]: valor };
    setFormulario(proximo);
    // Depois da primeira tentativa de salvar, os erros reagem a cada tecla.
    if (tentouSalvar) setErros(validarFormularioPaciente(proximo, hoje));
  };

  async function aoSalvar(evento: FormEvent) {
    evento.preventDefault();
    setTentouSalvar(true);
    const errosAtuais = validarFormularioPaciente(formulario, hoje);
    setErros(errosAtuais);
    if (Object.keys(errosAtuais).length > 0) return;

    setSalvando(true);
    setErroAoSalvar(false);
    try {
      const dados = formularioParaDados(formulario);
      if (idPaciente === undefined) {
        await criarPaciente(dados);
      } else {
        await atualizarPaciente(idPaciente, dados);
      }
      navegar("/pacientes");
    } catch (erro) {
      if (erro instanceof CpfJaCadastradoError) {
        setErros({ cpf: "CPF já cadastrado" });
      } else {
        setErroAoSalvar(true);
      }
      setSalvando(false);
    }
  }

  if (carga === "carregando") {
    return <p className="text-muted-foreground">Carregando paciente…</p>;
  }

  if (carga === "erro") {
    return (
      <p className="text-destructive">Não foi possível carregar o paciente.</p>
    );
  }

  const campoTexto = (
    campo: keyof FormularioPaciente,
    rotulo: string,
    extras: Omit<
      PropsCampoTexto,
      "id" | "rotulo" | "valor" | "aoAlterar" | "erro"
    > = {},
  ) => (
    <CampoTexto
      id={campo}
      rotulo={rotulo}
      valor={formulario[campo]}
      aoAlterar={alterar(campo)}
      erro={erros[campo]}
      {...extras}
    />
  );

  const campoSelect = (
    campo: keyof FormularioPaciente,
    rotulo: string,
    opcoes: readonly string[],
    extras: Omit<
      PropsCampoSelect,
      "id" | "rotulo" | "valor" | "aoAlterar" | "erro" | "opcoes"
    > = {},
  ) => (
    <CampoSelect
      id={campo}
      rotulo={rotulo}
      valor={formulario[campo]}
      aoAlterar={alterar(campo)}
      erro={erros[campo]}
      opcoes={opcoes}
      {...extras}
    />
  );

  return (
    <section className="flex max-w-3xl flex-col gap-6">
      <h1 className="font-heading text-2xl font-semibold">
        {editando ? "Editar Paciente" : "Novo Paciente"}
      </h1>

      <form
        noValidate
        onSubmit={aoSalvar}
        className="flex flex-col gap-6"
        aria-label={editando ? "Edição de paciente" : "Cadastro de paciente"}
      >
        <SecaoFormulario titulo="Dados pessoais">
          {campoTexto("nomeCompleto", "Nome completo", { obrigatorio: true })}
          {campoTexto("dataNascimento", "Data de nascimento", {
            obrigatorio: true,
            tipo: "date",
          })}
          {campoSelect("genero", "Gênero", GENEROS, { obrigatorio: true })}
          {campoTexto("cpf", "CPF", { obrigatorio: true })}
          {campoTexto("rg", "RG")}
          {campoSelect("religiao", "Religião", RELIGIOES, {
            obrigatorio: true,
          })}
        </SecaoFormulario>

        <SecaoFormulario
          titulo="Responsável legal"
          descricao="Obrigatório para paciente menor de 18 anos."
        >
          {campoTexto("responsavelLegal", "Responsável legal", {
            obrigatorio: menorDeIdade,
          })}
          {campoTexto("emailResponsavelLegal", "Email do responsável legal", {
            obrigatorio: menorDeIdade,
            tipo: "email",
          })}
          {campoTexto("cpfResponsavelLegal", "CPF do responsável legal", {
            obrigatorio: menorDeIdade,
          })}
        </SecaoFormulario>

        <SecaoFormulario titulo="Contato">
          {campoTexto("telefone1", "Telefone 1", {
            obrigatorio: true,
            dica: menorDeIdade
              ? "Para menor de 18 anos, informar o telefone do Responsável legal."
              : undefined,
          })}
          {campoTexto("telefone2", "Telefone 2")}
          {campoTexto("email", "Email", { tipo: "email" })}
        </SecaoFormulario>

        <SecaoFormulario titulo="Histórico clínico">
          {campoSelect("jaFezTerapia", "Já fez terapia?", SIM_NAO, {
            obrigatorio: true,
          })}
          {formulario.jaFezTerapia === "Sim" &&
            campoTexto("quandoFezTerapia", "Quando fez terapia?", {
              obrigatorio: true,
            })}
          {campoSelect("tomaMedicamento", "Toma algum medicamento?", SIM_NAO, {
            obrigatorio: true,
          })}
          {formulario.tomaMedicamento === "Sim" && (
            <>
              {campoTexto(
                "tomaMedicamentoDesdeQuando",
                "Toma medicamento desde quando?",
                { obrigatorio: true },
              )}
              {campoTexto("nomesMedicamentos", "Nomes dos medicamentos", {
                obrigatorio: true,
              })}
            </>
          )}
          {campoSelect(
            "jaFoiHospitalizado",
            "Já foi hospitalizado por questões psicológicas?",
            SIM_NAO,
            { obrigatorio: true },
          )}
          {formulario.jaFoiHospitalizado === "Sim" && (
            <>
              {campoTexto(
                "quandoFoiHospitalizado",
                "Quando foi hospitalizado?",
                { obrigatorio: true },
              )}
              {campoTexto("razaoHospitalizacao", "Razão da hospitalização", {
                obrigatorio: true,
              })}
            </>
          )}
        </SecaoFormulario>

        <SecaoFormulario titulo="Consulta">
          {campoTexto("valorConsulta", "Valor da consulta (R$)", {
            obrigatorio: true,
          })}
          {campoSelect(
            "periodicidade",
            "Periodicidade da consulta",
            PERIODICIDADES,
          )}
          {campoSelect(
            "diaSemanaConsulta",
            "Dia da semana da consulta",
            DIAS_SEMANA_CONSULTA,
          )}
        </SecaoFormulario>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to="/pacientes">Cancelar</Link>
          </Button>
          {erroAoSalvar && (
            <p className="text-sm text-destructive">
              Não foi possível salvar. Tente de novo.
            </p>
          )}
        </div>
      </form>
    </section>
  );
}

function SecaoFormulario({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-bg flex flex-col gap-4 rounded-xl p-6">
      <header className="flex flex-col gap-1">
        <h2 className="font-heading text-lg font-semibold">{titulo}</h2>
        {descricao && (
          <p className="text-sm text-muted-foreground">{descricao}</p>
        )}
      </header>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

interface PropsCampoTexto {
  id: string;
  rotulo: string;
  valor: string;
  aoAlterar: (valor: string) => void;
  obrigatorio?: boolean;
  erro?: string;
  dica?: string;
  tipo?: "text" | "date" | "email";
}

function CampoTexto({
  id,
  rotulo,
  valor,
  aoAlterar,
  obrigatorio = false,
  erro,
  dica,
  tipo = "text",
}: PropsCampoTexto) {
  return (
    <div className="flex flex-col gap-1.5">
      <RotuloCampo para={id} obrigatorio={obrigatorio} texto={rotulo} />
      <Input
        id={id}
        type={tipo}
        value={valor}
        onChange={(evento) => aoAlterar(evento.target.value)}
        aria-required={obrigatorio}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-erro` : undefined}
      />
      {dica && <p className="text-xs text-muted-foreground">{dica}</p>}
      <MensagemErroCampo id={`${id}-erro`} erro={erro} />
    </div>
  );
}

interface PropsCampoSelect {
  id: string;
  rotulo: string;
  valor: string;
  aoAlterar: (valor: string) => void;
  opcoes: readonly string[];
  obrigatorio?: boolean;
  erro?: string;
}

function CampoSelect({
  id,
  rotulo,
  valor,
  aoAlterar,
  opcoes,
  obrigatorio = false,
  erro,
}: PropsCampoSelect) {
  return (
    <div className="flex flex-col gap-1.5">
      <RotuloCampo para={id} obrigatorio={obrigatorio} texto={rotulo} />
      <SelectNativo
        id={id}
        value={valor}
        onChange={(evento) => aoAlterar(evento.target.value)}
        aria-required={obrigatorio}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-erro` : undefined}
      >
        <option value="">Selecione…</option>
        {opcoes.map((opcao) => (
          <option key={opcao} value={opcao}>
            {opcao}
          </option>
        ))}
      </SelectNativo>
      <MensagemErroCampo id={`${id}-erro`} erro={erro} />
    </div>
  );
}

function RotuloCampo({
  para,
  obrigatorio,
  texto,
}: {
  para: string;
  obrigatorio: boolean;
  texto: string;
}) {
  // O asterisco fica fora do <label> para não sujar o nome acessível do campo.
  return (
    <span className="flex items-center gap-1 text-sm font-medium">
      <label htmlFor={para}>{texto}</label>
      {obrigatorio && (
        <span aria-hidden="true" className="text-destructive">
          *
        </span>
      )}
    </span>
  );
}

function MensagemErroCampo({ id, erro }: { id: string; erro?: string }) {
  if (!erro) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {erro}
    </p>
  );
}
