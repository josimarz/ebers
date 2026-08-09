import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { FotoPaciente } from "@/components/foto-paciente";
import { Button } from "@/components/ui/button";
import {
  buscarConsulta,
  type Consulta,
  finalizarConsulta,
  salvarConteudo,
  salvarNotas,
} from "@/db/consultas";
import { buscarPaciente, type Paciente } from "@/db/pacientes";
import { timerDaConsulta } from "@/dominio/consulta";
import { calcularIdade, hojeIso } from "@/dominio/idade";
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
  const [erroAoFinalizar, setErroAoFinalizar] = useState(false);

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

  async function finalizar() {
    if (carga.estado !== "pronto") return;
    try {
      await finalizarConsulta(carga.consulta.id);
      setCarga({
        ...carga,
        consulta: {
          ...carga.consulta,
          status: "Finalizada",
          finalizadoEm: new Date().toISOString(),
        },
      });
    } catch {
      setErroAoFinalizar(true);
    }
  }

  if (carga.estado === "carregando") {
    return <p className="text-muted-foreground">Carregando consulta…</p>;
  }
  if (carga.estado === "nao-encontrada") {
    return <p className="text-muted-foreground">Consulta não encontrada.</p>;
  }
  if (carga.estado === "erro") {
    return (
      <p className="text-destructive">Não foi possível carregar a consulta.</p>
    );
  }

  const { consulta, paciente } = carga;
  // Editabilidade por status (spec 2.3): Aberta e Finalizada continuam
  // editáveis; Cancelada é somente leitura.
  const editavel = consulta.status !== "Cancelada";

  return (
    <section className="flex flex-col gap-6">
      <header className="glass-bg flex items-center gap-4 rounded-xl px-6 py-4">
        <FotoPaciente
          arquivo={paciente.foto}
          nome={paciente.nomeCompleto}
          className="size-14"
        />
        <div>
          <h1 className="font-heading text-2xl font-semibold">
            {paciente.nomeCompleto}
          </h1>
          <p className="text-sm text-muted-foreground">
            {calcularIdade(paciente.dataNascimento, hojeIso())} anos
          </p>
        </div>
        <div className="ml-auto flex items-center gap-4">
          {consulta.status === "Aberta" ? (
            <>
              <TimerConsulta iniciadoEm={consulta.iniciadoEm} />
              <Button onClick={finalizar}>Finalizar Consulta</Button>
            </>
          ) : (
            <p className="rounded-full border px-3 py-1 text-sm">
              {consulta.status}
            </p>
          )}
        </div>
      </header>

      {erroAoFinalizar && (
        <p className="text-destructive">
          Não foi possível finalizar a consulta.
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <CampoDaConsulta
          id="conteudo"
          rotulo="Conteúdo"
          descricao="Relato do paciente"
          valorInicial={consulta.conteudo}
          desabilitado={!editavel}
          aoSalvar={(texto) => salvarConteudo(consulta.id, texto)}
        />
        <CampoDaConsulta
          id="notas"
          rotulo="Notas"
          descricao="Anotações da terapeuta"
          valorInicial={consulta.notas}
          desabilitado={!editavel}
          aoSalvar={(texto) => salvarNotas(consulta.id, texto)}
        />
      </div>
    </section>
  );
}

const CLASSES_DO_TIMER = {
  verde: "text-chart-2",
  amarela: "text-chart-3",
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
        "font-mono text-2xl font-semibold tabular-nums",
        CLASSES_DO_TIMER[timer.cor],
      )}
    >
      {timer.texto}
    </p>
  );
}

/** Pausa de digitação que dispara o salvamento automático. */
const ATRASO_SALVAMENTO_MS = 600;
/** Digitação (ou transcrição) contínua nunca espera mais que isto. */
const ESPERA_MAXIMA_SALVAMENTO_MS = 2000;

interface PropsCampoDaConsulta {
  id: string;
  rotulo: string;
  descricao: string;
  valorInicial: string;
  desabilitado: boolean;
  aoSalvar: (texto: string) => Promise<void>;
}

/**
 * Campo de texto da Consulta com salvamento automático (spec 2.3): sem botão
 * "Salvar", o texto é persistido na pausa da digitação — e, sob digitação
 * contínua, no máximo a cada ESPERA_MAXIMA_SALVAMENTO_MS.
 */
function CampoDaConsulta({
  id,
  rotulo,
  descricao,
  valorInicial,
  desabilitado,
  aoSalvar,
}: PropsCampoDaConsulta) {
  const [valor, setValor] = useState(valorInicial);
  const pendenteDesdeMs = useRef<number | null>(null);
  const atual = useRef({ valor, aoSalvar });
  atual.current = { valor, aoSalvar };

  useEffect(() => {
    if (pendenteDesdeMs.current === null) return;
    const prazoMaximo =
      pendenteDesdeMs.current + ESPERA_MAXIMA_SALVAMENTO_MS - Date.now();
    const espera = Math.max(0, Math.min(ATRASO_SALVAMENTO_MS, prazoMaximo));
    const temporizador = setTimeout(() => {
      pendenteDesdeMs.current = null;
      aoSalvar(valor).catch(() => {
        // Falha de gravação: o texto segue na tela como pendente, e a
        // próxima alteração dispara nova tentativa.
        pendenteDesdeMs.current ??= Date.now();
      });
    }, espera);
    return () => clearTimeout(temporizador);
  }, [valor, aoSalvar]);

  // Sair da página no meio da pausa (ex.: navegar pela sidebar) não pode
  // descartar o que ainda não foi gravado: o desmonte faz o flush imediato.
  useEffect(() => {
    return () => {
      if (pendenteDesdeMs.current === null) return;
      pendenteDesdeMs.current = null;
      atual.current.aoSalvar(atual.current.valor).catch(() => {
        // Desmontado: não há mais tela para sinalizar a falha.
      });
    };
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div>
        <label htmlFor={id} className="font-medium">
          {rotulo}
        </label>
        <p className="text-sm text-muted-foreground">{descricao}</p>
      </div>
      <textarea
        id={id}
        value={valor}
        disabled={desabilitado}
        onChange={(evento) => {
          pendenteDesdeMs.current ??= Date.now();
          setValor(evento.target.value);
        }}
        className="glass-bg min-h-64 flex-1 resize-y rounded-xl p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70"
      />
    </div>
  );
}
