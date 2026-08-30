import { CircleCheck, ImagePlus } from "lucide-react";
import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { AvisoErro } from "@/components/aviso";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FotoPaciente } from "@/components/foto-paciente";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNativo } from "@/components/ui/select-nativo";
import {
  criarPacienteAutoCadastro,
  salvarFotoAutoCadastro,
} from "@/db/auto-cadastro";
import { removerFoto, salvarFoto } from "@/db/fotos";
import {
  atualizarPaciente,
  buscarPaciente,
  CpfJaCadastradoError,
  criarPaciente,
} from "@/db/pacientes";
import { aplicarMascaraCpf } from "@/dominio/cpf";
import { hojeIso } from "@/dominio/idade";
import {
  alterarFormularioPaciente,
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
import { cn } from "@/lib/utils";

type Carga = "carregando" | "pronto" | "erro";

/**
 * Extras dos dois campos de CPF: máscara a cada tecla e teclado numérico —
 * o Auto-cadastro roda em tablet, onde o teclado certo economiza toques.
 */
const CAMPO_CPF = {
  mascara: aplicarMascaraCpf,
  modoEntrada: "numeric",
} as const satisfies Partial<PropsCampoTexto>;

/**
 * A foto não vive no estado do formulário de texto: ou não há foto, ou há um
 * arquivo novo escolhido agora (com prévia local), ou o cadastro mantém a
 * foto já gravada no backend.
 */
type EstadoFoto =
  | { tipo: "sem-foto" }
  | { tipo: "nova"; arquivo: File; previa: string }
  | { tipo: "existente"; arquivo: string };

export type ModoFormularioPaciente = "desktop" | "tablet";

export function PaginaFormularioPaciente({
  modo = "desktop",
}: {
  /**
   * No Modo tablet (Auto-cadastro, spec 1.3) o formulário só cria Pacientes:
   * esconde os campos da Terapeuta, persiste pelas rotas REST do servidor
   * local e termina em "Cadastro recebido!" com o formulário em branco.
   */
  modo?: ModoFormularioPaciente;
}) {
  const tablet = modo === "tablet";
  const { id } = useParams();
  const idPaciente = tablet || id === undefined ? undefined : Number(id);
  const editando = idPaciente !== undefined;

  const [carga, setCarga] = useState<Carga>(editando ? "carregando" : "pronto");
  const [formulario, setFormulario] = useState(FORMULARIO_PACIENTE_VAZIO);
  const [foto, setFoto] = useState<EstadoFoto>({ tipo: "sem-foto" });
  // Foto que estava gravada ao abrir a edição: se o salvar terminar com outra
  // (troca ou remoção), o arquivo antigo é apagado do disco.
  const [fotoOriginal, setFotoOriginal] = useState<string | null>(null);
  const [erros, setErros] = useState<ErrosPaciente>({});
  const [tentouSalvar, setTentouSalvar] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroAoSalvar, setErroAoSalvar] = useState(false);
  // Tela de confirmação do Auto-cadastro (spec 1.3), entre um envio e o
  // próximo paciente.
  const [cadastroRecebido, setCadastroRecebido] = useState(false);
  const navegar = useNavigate();

  useEffect(() => {
    if (idPaciente === undefined) return;
    let ativo = true;
    buscarPaciente(idPaciente)
      .then((paciente) => {
        if (!ativo) return;
        if (paciente) {
          setFormulario(dadosParaFormulario(paciente));
          setFoto(
            paciente.foto === null
              ? { tipo: "sem-foto" }
              : { tipo: "existente", arquivo: paciente.foto },
          );
          setFotoOriginal(paciente.foto);
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
  // Cada "Sim" clínico libera para edição os campos que dependem dele.
  const fezTerapia = formulario.jaFezTerapia === "Sim";
  const tomaMedicamento = formulario.tomaMedicamento === "Sim";
  const foiHospitalizado = formulario.jaFoiHospitalizado === "Sim";
  // No tablet quem toca é o Paciente, "enviando" o próprio cadastro; no
  // desktop é a Terapeuta salvando um registro.
  const rotulosEnvio = tablet
    ? { botao: "Enviar", executando: "Enviando…" }
    : { botao: "Salvar", executando: "Salvando…" };

  const alterar = (campo: keyof FormularioPaciente) => (valor: string) => {
    const proximo = alterarFormularioPaciente(formulario, campo, valor);
    setFormulario(proximo);
    // Depois da primeira tentativa de salvar, os erros reagem a cada tecla.
    if (tentouSalvar) setErros(validarFormularioPaciente(proximo, hoje));
  };

  function aoEscolherFoto(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    // Limpa o input para o mesmo arquivo poder ser escolhido de novo.
    evento.target.value = "";
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = () =>
      setFoto({ tipo: "nova", arquivo, previa: String(leitor.result) });
    leitor.readAsDataURL(arquivo);
  }

  async function aoSalvar(evento: FormEvent) {
    evento.preventDefault();
    setTentouSalvar(true);
    const errosAtuais = validarFormularioPaciente(formulario, hoje);
    setErros(errosAtuais);
    if (Object.keys(errosAtuais).length > 0) return;

    setSalvando(true);
    setErroAoSalvar(false);
    try {
      let nomeFoto: string | null = null;
      if (foto.tipo === "nova") {
        nomeFoto = tablet
          ? await salvarFotoAutoCadastro(foto.arquivo)
          : await salvarFoto(foto.arquivo);
      }
      if (foto.tipo === "existente") nomeFoto = foto.arquivo;

      try {
        const dados = formularioParaDados(formulario, nomeFoto);
        if (tablet) {
          await criarPacienteAutoCadastro(dados);
        } else if (idPaciente === undefined) {
          await criarPaciente(dados);
        } else {
          await atualizarPaciente(idPaciente, dados);
        }
      } catch (erro) {
        // O banco recusou o cadastro (ex.: CPF duplicado): a foto que acabou
        // de ir ao disco não pode ficar órfã; o estado "nova" regrava na
        // próxima tentativa. O tablet não tem rota de remoção (as rotas do
        // Auto-cadastro só criam — ADR-0003): o arquivo fica órfão no disco,
        // inofensivo, sem cadastro que o referencie.
        if (!tablet && foto.tipo === "nova" && nomeFoto !== null) {
          await removerFoto(nomeFoto).catch(() => {});
        }
        throw erro;
      }

      if (tablet) {
        // "Cadastro recebido!" e formulário em branco para o próximo
        // paciente (spec 1.3).
        setCadastroRecebido(true);
        setFormulario(FORMULARIO_PACIENTE_VAZIO);
        setFoto({ tipo: "sem-foto" });
        setErros({});
        setTentouSalvar(false);
        setSalvando(false);
        return;
      }

      // A foto antiga só sai do disco depois de o banco aceitar o cadastro;
      // se a remoção falhar, sobra um arquivo órfão — inofensivo.
      if (fotoOriginal !== null && fotoOriginal !== nomeFoto) {
        await removerFoto(fotoOriginal).catch(() => {});
      }
      navegar("/pacientes");
    } catch (erro) {
      if (erro instanceof CpfJaCadastradoError) {
        setErros({
          cpf: tablet
            ? "CPF já cadastrado — chame a terapeuta"
            : "CPF já cadastrado",
        });
      } else {
        setErroAoSalvar(true);
      }
      setSalvando(false);
    }
  }

  if (cadastroRecebido) {
    return (
      <section className="glass-bg flex max-w-3xl flex-col items-center gap-4 rounded-2xl p-10 text-center">
        <span
          aria-hidden="true"
          className="flex size-14 items-center justify-center rounded-full bg-success-subtle text-success"
        >
          <CircleCheck className="size-7" />
        </span>
        <h2 className="font-heading text-2xl font-bold tracking-tight">
          Cadastro recebido!
        </h2>
        <p className="text-muted-foreground">
          Obrigada! Pode devolver o tablet.
        </p>
        <Button type="button" onClick={() => setCadastroRecebido(false)}>
          Iniciar novo cadastro
        </Button>
      </section>
    );
  }

  if (carga === "carregando") {
    return (
      <p className="text-sm text-muted-foreground">Carregando paciente…</p>
    );
  }

  if (carga === "erro") {
    return <AvisoErro>Não foi possível carregar o paciente.</AvisoErro>;
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
      <CabecalhoPagina
        titulo={
          tablet
            ? "Auto-cadastro"
            : editando
              ? "Editar Paciente"
              : "Novo Paciente"
        }
        descricao={
          tablet ? "Preencha seus dados e toque em Enviar ao final." : undefined
        }
      />

      <form
        noValidate
        onSubmit={aoSalvar}
        className="flex flex-col gap-6"
        aria-label={
          tablet
            ? "Auto-cadastro de paciente"
            : editando
              ? "Edição de paciente"
              : "Cadastro de paciente"
        }
      >
        <SecaoFormulario titulo="Dados pessoais">
          <div className="flex items-center gap-5 md:col-span-2">
            {foto.tipo === "nova" ? (
              <img
                src={foto.previa}
                alt="Prévia da foto de perfil"
                className="size-20 rounded-full object-cover ring-1 ring-glass-border"
              />
            ) : (
              <FotoPaciente
                arquivo={foto.tipo === "existente" ? foto.arquivo : null}
                nome={formulario.nomeCompleto.trim() || "perfil"}
                className="size-20"
              />
            )}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Foto de perfil</span>
              <div className="flex items-center gap-2">
                <label
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "cursor-pointer",
                  )}
                >
                  <ImagePlus aria-hidden="true" />
                  {foto.tipo === "sem-foto" ? "Anexar foto" : "Trocar foto"}
                  <input
                    type="file"
                    // Espelha os formatos que o backend decodifica (features
                    // do crate image em src-tauri/Cargo.toml).
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={aoEscolherFoto}
                  />
                </label>
                {foto.tipo !== "sem-foto" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFoto({ tipo: "sem-foto" })}
                  >
                    Remover foto
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                JPEG, PNG ou WebP.
              </p>
            </div>
          </div>
          {campoTexto("nomeCompleto", "Nome completo", { obrigatorio: true })}
          {campoTexto("dataNascimento", "Data de nascimento", {
            obrigatorio: true,
            tipo: "date",
          })}
          {campoSelect("genero", "Gênero", GENEROS, { obrigatorio: true })}
          {campoTexto("cpf", "CPF", { obrigatorio: true, ...CAMPO_CPF })}
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
            ...CAMPO_CPF,
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

        {/* Cada pergunta clínica abre um grupo com os próprios dependentes:
            todos ficam sempre na tela, só o somente-leitura muda. Assim
            nenhuma resposta reposiciona os campos das outras perguntas. */}
        <SecaoFormulario titulo="Histórico clínico">
          <GrupoCampos>
            {campoSelect("jaFezTerapia", "Já fez terapia?", SIM_NAO, {
              obrigatorio: true,
            })}
            {campoTexto("quandoFezTerapia", "Quando fez terapia?", {
              obrigatorio: fezTerapia,
              somenteLeitura: !fezTerapia,
            })}
          </GrupoCampos>
          <GrupoCampos>
            {campoSelect(
              "tomaMedicamento",
              "Toma algum medicamento?",
              SIM_NAO,
              { obrigatorio: true },
            )}
            {campoTexto(
              "tomaMedicamentoDesdeQuando",
              "Toma medicamento desde quando?",
              {
                obrigatorio: tomaMedicamento,
                somenteLeitura: !tomaMedicamento,
              },
            )}
            {campoTexto("nomesMedicamentos", "Nomes dos medicamentos", {
              obrigatorio: tomaMedicamento,
              somenteLeitura: !tomaMedicamento,
              larguraTotal: true,
            })}
          </GrupoCampos>
          <GrupoCampos>
            {campoSelect(
              "jaFoiHospitalizado",
              "Já foi hospitalizado por questões psicológicas?",
              SIM_NAO,
              { obrigatorio: true },
            )}
            {campoTexto("quandoFoiHospitalizado", "Quando foi hospitalizado?", {
              obrigatorio: foiHospitalizado,
              somenteLeitura: !foiHospitalizado,
            })}
            {campoTexto("razaoHospitalizacao", "Razão da hospitalização", {
              obrigatorio: foiHospitalizado,
              somenteLeitura: !foiHospitalizado,
              larguraTotal: true,
            })}
          </GrupoCampos>
        </SecaoFormulario>

        {/* Campos que só a Terapeuta define — ocultos no Auto-cadastro
            (spec 1.3); o Valor da consulta recebe o padrão no servidor. */}
        {!tablet && (
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
        )}

        {/* Barra de ações grudada ao fim da janela: Salvar sempre ao alcance
            num formulário longo. */}
        <div className="glass-frosted sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3">
          <Button type="submit" disabled={salvando}>
            {salvando ? rotulosEnvio.executando : rotulosEnvio.botao}
          </Button>
          {/* No tablet não há para onde sair da tela de cadastro. */}
          {!tablet && (
            <Button type="button" variant="outline" asChild>
              <Link to="/pacientes">Cancelar</Link>
            </Button>
          )}
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
    <section className="glass-bg flex flex-col gap-5 rounded-2xl p-6">
      <header className="flex flex-col gap-1">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          {titulo}
        </h2>
        {descricao && (
          <p className="text-sm text-muted-foreground">{descricao}</p>
        )}
      </header>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

/**
 * Bloco de campos que começa numa linha nova da grade da seção: mantém
 * juntos uma pergunta e os campos que dependem dela.
 */
function GrupoCampos({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-4 md:col-span-2 md:grid-cols-2">{children}</div>
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
  /** Campo visível mas não editável — a resposta de que ele depende não é "Sim". */
  somenteLeitura?: boolean;
  /** Reescreve o que foi digitado antes de guardar (ex.: máscara de CPF). */
  mascara?: (valor: string) => string;
  modoEntrada?: React.ComponentProps<"input">["inputMode"];
  /** Ocupa a linha inteira da grade, em vez de meia. */
  larguraTotal?: boolean;
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
  somenteLeitura = false,
  mascara,
  modoEntrada,
  larguraTotal = false,
}: PropsCampoTexto) {
  return (
    <div
      className={cn("flex flex-col gap-1.5", larguraTotal && "md:col-span-2")}
    >
      <RotuloCampo para={id} obrigatorio={obrigatorio} texto={rotulo} />
      <Input
        id={id}
        type={tipo}
        value={valor}
        onChange={(evento) =>
          aoAlterar(
            mascara ? mascara(evento.target.value) : evento.target.value,
          )
        }
        readOnly={somenteLeitura}
        inputMode={modoEntrada}
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
