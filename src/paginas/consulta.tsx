import { Mic } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { AvisoErro } from "@/components/aviso";
import { BotaoMicrofone } from "@/components/botao-microfone";
import { EditorNotas } from "@/components/editor-notas";
import { FotoPaciente } from "@/components/foto-paciente";
import { PainelConsulta } from "@/components/painel-consulta";
import { StatusConsulta } from "@/components/status-consulta";
import { Button } from "@/components/ui/button";
import {
  buscarConsulta,
  type Consulta,
  cancelarConsulta,
  desfazerPagamento,
  efetuarPagamento,
  finalizarConsulta,
  salvarConteudo,
  salvarNotas,
} from "@/db/consultas";
import { buscarPaciente, type Paciente } from "@/db/pacientes";
import {
  acoesDaConsulta,
  SEM_PAGAMENTO,
  timerDaConsulta,
} from "@/dominio/consulta";
import { calcularIdade, hojeIso } from "@/dominio/idade";
import { anexarTranscricao } from "@/dominio/transcricao";
import { useSalvamentoAutomatico } from "@/hooks/use-salvamento-automatico";
import { cn } from "@/lib/utils";

type Carga =
  | { estado: "carregando" }
  | { estado: "pronto"; consulta: Consulta; paciente: Paciente }
  | { estado: "nao-encontrada" }
  | { estado: "erro" };

export function PaginaConsulta() {
  const { id } = useParams();
  const idConsulta = Number(id);
  const [carga, setCarga] = useState<Carga>({ estado: "carregando" });
  const [erroDaAcao, setErroDaAcao] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const consulta = await buscarConsulta(idConsulta);
      const paciente =
        consulta === undefined
          ? undefined
          : await buscarPaciente(consulta.pacienteId);
      if (!ativo) return;
      if (consulta === undefined || paciente === undefined) {
        setCarga({ estado: "nao-encontrada" });
      } else {
        setCarga({ estado: "pronto", consulta, paciente });
      }
    })().catch(() => {
      if (ativo) setCarga({ estado: "erro" });
    });
    return () => {
      ativo = false;
    };
  }, [idConsulta]);

  /**
   * Ação contextual do cabeçalho: grava no banco e aplica a mesma transição
   * na consulta em memória — a página reflete o novo estado sem reler.
   */
  async function executarAcao(
    gravar: (id: number) => Promise<void>,
    transicao: (consulta: Consulta) => Consulta,
    mensagemDeErro: string,
  ) {
    if (carga.estado !== "pronto") return;
    setErroDaAcao(null);
    try {
      await gravar(carga.consulta.id);
      setCarga({ ...carga, consulta: transicao(carga.consulta) });
    } catch {
      setErroDaAcao(mensagemDeErro);
    }
  }

  const finalizar = () =>
    executarAcao(
      finalizarConsulta,
      (consulta) => ({
        ...consulta,
        status: "Finalizada",
        finalizadoEm: new Date().toISOString(),
      }),
      "Não foi possível finalizar a consulta.",
    );

  const efetuar = () =>
    executarAcao(
      efetuarPagamento,
      (consulta) => ({
        ...consulta,
        pago: true,
        pagoEm: new Date().toISOString(),
        origemPagamento: "Direto",
      }),
      "Não foi possível registrar o pagamento.",
    );

  const desfazer = () =>
    executarAcao(
      desfazerPagamento,
      (consulta) => ({ ...consulta, ...SEM_PAGAMENTO }),
      "Não foi possível desfazer o pagamento.",
    );

  const cancelar = () =>
    executarAcao(
      cancelarConsulta,
      (consulta) => ({ ...consulta, status: "Cancelada", ...SEM_PAGAMENTO }),
      "Não foi possível cancelar a consulta.",
    );

  if (carga.estado === "carregando") {
    return (
      <p className="text-sm text-muted-foreground">Carregando consulta…</p>
    );
  }
  if (carga.estado === "nao-encontrada") {
    return (
      <p className="text-sm text-muted-foreground">Consulta não encontrada.</p>
    );
  }
  if (carga.estado === "erro") {
    return <AvisoErro>Não foi possível carregar a consulta.</AvisoErro>;
  }

  const { consulta, paciente } = carga;
  // A tabela de editabilidade e ações por status (spec 2.3) vive no domínio;
  // a página só reflete a linha do estado atual.
  const acoes = acoesDaConsulta(consulta);

  return (
    <section className="flex flex-col gap-6">
      <header className="glass-bg flex flex-wrap items-center gap-5 rounded-2xl px-6 py-5">
        <FotoPaciente
          arquivo={paciente.foto}
          nome={paciente.nomeCompleto}
          className="size-14"
        />
        <div className="min-w-0">
          <h1 className="truncate font-heading text-2xl font-bold tracking-tight">
            {paciente.nomeCompleto}
          </h1>
          <p className="text-sm text-muted-foreground">
            {calcularIdade(paciente.dataNascimento, hojeIso())} anos
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          {consulta.status === "Aberta" ? (
            <TimerConsulta iniciadoEm={consulta.iniciadoEm} />
          ) : (
            <StatusConsulta status={consulta.status} className="mr-1" />
          )}
          {acoes.cancelar && (
            <Button variant="destructive" onClick={cancelar}>
              Cancelar Consulta
            </Button>
          )}
          {acoes.efetuarPagamento && (
            <Button variant="outline" onClick={efetuar}>
              Efetuar Pagamento
            </Button>
          )}
          {acoes.desfazerPagamento && (
            <Button variant="outline" onClick={desfazer}>
              Desfazer Pagamento
            </Button>
          )}
          {acoes.finalizar && (
            <Button onClick={finalizar}>Finalizar Consulta</Button>
          )}
        </div>
      </header>

      {erroDaAcao !== null && <AvisoErro>{erroDaAcao}</AvisoErro>}

      <div className="grid gap-6 md:grid-cols-2">
        <CampoDaConsulta
          id="conteudo"
          rotulo="Conteúdo"
          descricao="Relato do paciente"
          valorInicial={consulta.conteudo}
          desabilitado={!acoes.camposEditaveis}
          comMicrofone={acoes.microfone}
          aoSalvar={(texto) => salvarConteudo(consulta.id, texto)}
        />
        <EditorNotas
          valorInicial={consulta.notas}
          desabilitado={!acoes.camposEditaveis}
          aoSalvar={(html) => salvarNotas(consulta.id, html)}
        />
      </div>
    </section>
  );
}

/** Cor do timer por faixa (spec 2.3): tokens de estado, não de gráfico. */
const CLASSES_DO_TIMER = {
  verde: "text-success",
  amarela: "text-warning",
  vermelha: "text-destructive",
} as const;

/**
 * Timer em tempo real da Consulta (spec 2.3). Componente próprio para o tique
 * de cada segundo re-renderizar só o relógio — e não a página, o que
 * reiniciaria a espera do salvamento automático a cada segundo.
 */
function TimerConsulta({ iniciadoEm }: { iniciadoEm: string }) {
  const [agoraMs, setAgoraMs] = useState(() => Date.now());

  useEffect(() => {
    const intervalo = setInterval(() => setAgoraMs(Date.now()), 1000);
    return () => clearInterval(intervalo);
  }, []);

  const timer = timerDaConsulta(iniciadoEm, agoraMs);
  return (
    <p
      role="timer"
      aria-label="Timer da consulta"
      className={cn(
        "rounded-xl border border-glass-border bg-glass-fill px-3 py-1 font-mono text-2xl font-semibold tabular-nums",
        CLASSES_DO_TIMER[timer.cor],
      )}
    >
      {timer.texto}
    </p>
  );
}

interface PropsCampoDaConsulta {
  id: string;
  rotulo: string;
  descricao: string;
  valorInicial: string;
  desabilitado: boolean;
  /** Transcrição de voz junto ao rótulo — o Conteúdo da Aberta (spec 2.3). */
  comMicrofone?: boolean;
  aoSalvar: (texto: string) => Promise<void>;
}

/** Campo de texto plano da Consulta com salvamento automático (spec 2.3). */
function CampoDaConsulta({
  id,
  rotulo,
  descricao,
  valorInicial,
  desabilitado,
  comMicrofone = false,
  aoSalvar,
}: PropsCampoDaConsulta) {
  const [valor, setValor] = useState(valorInicial);
  // A Prévia (ADR-0007) vive fora do valor: nunca é salva nem editável.
  const [previa, setPrevia] = useState("");
  // Digitação e transcrição alteram o mesmo texto por um único caminho; o ref
  // dá à transcrição (callback fora do render) o valor mais recente.
  const valorRef = useRef(valorInicial);
  const registrar = useSalvamentoAutomatico(aoSalvar);

  function alterar(novo: string) {
    valorRef.current = novo;
    setValor(novo);
    registrar(novo);
  }

  return (
    <PainelConsulta
      titulo={<label htmlFor={id}>{rotulo}</label>}
      descricao={descricao}
      desabilitado={desabilitado}
      acao={
        comMicrofone && (
          <BotaoMicrofone
            aoTranscrever={(texto) =>
              alterar(anexarTranscricao(valorRef.current, texto))
            }
            aoMudarPrevia={setPrevia}
          />
        )
      }
    >
      <textarea
        id={id}
        value={valor}
        disabled={desabilitado}
        onChange={(evento) => alterar(evento.target.value)}
        className="min-h-64 flex-1 resize-y bg-transparent p-4 outline-none disabled:cursor-not-allowed disabled:text-muted-foreground"
      />
      {previa !== "" && (
        <p className="flex items-start gap-2 border-t border-border/60 px-4 py-3 text-sm text-muted-foreground">
          <Mic className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span className="sr-only">Prévia:</span>
          <span>{previa}</span>
        </p>
      )}
    </PainelConsulta>
  );
}
