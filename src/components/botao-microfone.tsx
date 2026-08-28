import { Mic, MicOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  deveAvisarPreviaIndisponivel,
  disponibilidadeDaPrevia,
  type EventoPrevia,
  enviarAudioDaPrevia,
  fecharJanelaDaPrevia,
  iniciarPrevia,
  pararPrevia,
} from "@/db/previa";
import { modeloDeTranscricao, transcreverAudio } from "@/db/transcricao";
import {
  abrirProximaJanela,
  descartarJanela,
  janelaAberta,
  type Previa,
  previaVazia,
  registrarTextoDaJanela,
  textoDaPrevia,
} from "@/dominio/previa";
import {
  AcumuladorDeAudio,
  reamostrarParaWhisper,
} from "@/dominio/transcricao";
import {
  type CapturaDeAudio,
  criarCapturaDoMicrofone,
} from "@/lib/captura-audio";

const AVISO_SEM_MODELO =
  "Modelo de transcrição não instalado — veja o guia de operação.";
const AVISO_SEM_MICROFONE = "Não foi possível acessar o microfone.";
const AVISO_TRANSCRICAO_FALHOU = "A transcrição falhou — microfone desligado.";
const AVISO_PREVIA_INDISPONIVEL =
  "Prévia indisponível — veja o guia de operação.";

type Fase = "desligado" | "ligando" | "gravando";

/** Uma gravação em andamento: captura ligada, acumulador, fila e Prévia. */
interface Gravacao {
  captura: CapturaDeAudio;
  acumulador: AcumuladorDeAudio;
  /** Transcrições em série, na ordem da fala. */
  fila: Promise<void>;
  /** Nula quando a Prévia não está disponível nesta gravação. */
  previa: Previa | null;
}

interface PropsBotaoMicrofone {
  /** Recebe cada Transcrição, na ordem em que foi falada. */
  aoTranscrever: (texto: string) => void;
  /** Recebe o texto da Prévia a cada mudança; vazio quando não há Prévia. */
  aoMudarPrevia: (texto: string) => void;
}

/**
 * Liga/desliga a transcrição de voz da Consulta (spec 2.3): com o microfone
 * ligado, os blocos captados viram trechos (AcumuladorDeAudio), cada trecho
 * vai ao Whisper do backend e a Transcrição volta por aoTranscrever. Os
 * mesmos blocos alimentam a Prévia (ADR-0007), que volta por aoMudarPrevia.
 * Desligar ainda transcreve o que ficou pendente — a última frase não se
 * perde.
 */
export function BotaoMicrofone({
  aoTranscrever,
  aoMudarPrevia,
}: PropsBotaoMicrofone) {
  const [fase, setFase] = useState<Fase>("desligado");
  const [aviso, setAviso] = useState<string | null>(null);
  const [avisoDePrevia, setAvisoDePrevia] = useState<string | null>(null);
  /** A gravação que está captando agora. */
  const gravacao = useRef<Gravacao | null>(null);
  /**
   * A dona da linha da Prévia: a gravação mais recente. Religar depressa não
   * deixa a anterior — ainda transcrevendo o resto — disputar a tela; o que
   * ela transcreve entra no Conteúdo, não na linha.
   */
  const exibindo = useRef<Gravacao | null>(null);
  const aoTranscreverAtual = useRef(aoTranscrever);
  aoTranscreverAtual.current = aoTranscrever;
  const aoMudarPreviaAtual = useRef(aoMudarPrevia);
  aoMudarPreviaAtual.current = aoMudarPrevia;

  const exibirPrevia = useCallback((alvo: Gravacao) => {
    if (exibindo.current !== alvo) return;
    aoMudarPreviaAtual.current(
      alvo.previa === null ? "" : textoDaPrevia(alvo.previa),
    );
  }, []);

  const avisarPreviaIndisponivel = useCallback(() => {
    if (deveAvisarPreviaIndisponivel()) {
      setAvisoDePrevia(AVISO_PREVIA_INDISPONIVEL);
    }
  }, []);

  /** Solta a Prévia desta gravação: o reconhecedor para e a linha esvazia. */
  const soltarPrevia = useCallback(
    (alvo: Gravacao) => {
      if (alvo.previa === null) return;
      alvo.previa = null;
      pararPrevia().catch(() => {});
      exibirPrevia(alvo);
    },
    [exibirPrevia],
  );

  /** A Prévia falhou no meio da gravação: some, e o microfone continua. */
  const encerrarPrevia = useCallback(
    (alvo: Gravacao) => {
      if (alvo.previa === null) return;
      soltarPrevia(alvo);
      avisarPreviaIndisponivel();
    },
    [soltarPrevia, avisarPreviaIndisponivel],
  );

  const aoEventoDaPrevia = useCallback(
    (alvo: Gravacao, evento: EventoPrevia) => {
      const previa = alvo.previa;
      if (previa === null) return;
      if (evento.tipo === "texto") {
        alvo.previa = registrarTextoDaJanela(
          previa,
          evento.janela,
          evento.texto,
        );
        exibirPrevia(alvo);
        return;
      }
      // Erro numa janela já fechada é o fim natural dela (o reconhecedor
      // avisa "sem fala" ao encerrar); só a janela aberta derruba a Prévia.
      if (gravacao.current === alvo && evento.janela === janelaAberta(previa)) {
        encerrarPrevia(alvo);
      }
    },
    [exibirPrevia, encerrarPrevia],
  );

  /**
   * Fecha a janela aberta da Prévia e abre a seguinte; devolve o número da
   * fechada, para descartar a parte congelada dela depois — nulo sem Prévia.
   */
  const fecharJanela = useCallback(
    (alvo: Gravacao): number | null => {
      const previa = alvo.previa;
      if (previa === null) return null;
      alvo.previa = abrirProximaJanela(previa);
      fecharJanelaDaPrevia().catch(() => {
        if (gravacao.current === alvo) encerrarPrevia(alvo);
      });
      return janelaAberta(previa);
    },
    [encerrarPrevia],
  );

  /** A Transcrição da janela entrou (ou a janela ficou vazia): a Prévia dela some. */
  const descartar = useCallback(
    (alvo: Gravacao, janela: number | null) => {
      if (janela === null || alvo.previa === null) return;
      alvo.previa = descartarJanela(alvo.previa, janela);
      exibirPrevia(alvo);
    },
    [exibirPrevia],
  );

  const transcrever = useCallback(
    (alvo: Gravacao, trecho: Float32Array, janela: number | null) => {
      alvo.fila = alvo.fila
        .then(async () => {
          aoTranscreverAtual.current(await transcreverAudio(trecho));
          descartar(alvo, janela);
        })
        .catch(() => {
          if (gravacao.current === alvo) {
            alvo.captura.parar();
            gravacao.current = null;
          }
          soltarPrevia(alvo);
          setFase("desligado");
          setAviso(AVISO_TRANSCRICAO_FALHOU);
        });
    },
    [descartar, soltarPrevia],
  );

  const desligar = useCallback(() => {
    const atual = gravacao.current;
    if (atual === null) return;
    gravacao.current = null;
    atual.captura.parar();
    const resto = atual.acumulador.descarregar();
    if (resto === null) {
      soltarPrevia(atual);
    } else {
      // O reconhecedor para, mas a Prévia da última janela fica congelada
      // até a Transcrição dela entrar.
      const janela = atual.previa === null ? null : janelaAberta(atual.previa);
      if (atual.previa !== null) pararPrevia().catch(() => {});
      transcrever(atual, resto, janela);
    }
    setFase("desligado");
  }, [transcrever, soltarPrevia]);

  // Desmonte com o microfone ligado — ex.: "Finalizar Consulta", que tira o
  // microfone da página (spec 2.3) — vale um desligar: solta o hardware e
  // ainda transcreve a fala pendente; o Conteúdo continua lá para recebê-la.
  useEffect(() => desligar, [desligar]);

  function aoBloco(bloco: Float32Array) {
    const atual = gravacao.current;
    if (atual === null) return;
    if (atual.previa !== null) {
      enviarAudioDaPrevia(
        reamostrarParaWhisper(bloco, atual.captura.taxa),
      ).catch(() => {
        if (gravacao.current === atual) encerrarPrevia(atual);
      });
    }
    const corte = atual.acumulador.registrar(bloco);
    if (corte === null) return;
    // Toda janela fechada — com fala ou sem — recomeça o reconhecedor: um
    // request nunca vive além de um trecho.
    const janela = fecharJanela(atual);
    if (corte.trecho !== null) {
      transcrever(atual, corte.trecho, janela);
    } else {
      descartar(atual, janela);
    }
  }

  async function ligarPrevia(alvo: Gravacao) {
    try {
      const disponibilidade = await disponibilidadeDaPrevia();
      // Onde a Prévia não existe, nada muda — nem aviso.
      if (disponibilidade === "inexistente") return;
      if (disponibilidade === "indisponivel") {
        avisarPreviaIndisponivel();
        return;
      }
      if (gravacao.current !== alvo) return;
      alvo.previa = previaVazia();
      await iniciarPrevia((evento) => aoEventoDaPrevia(alvo, evento));
      // O microfone foi desligado no meio: nada a exibir, só encerrar.
      if (gravacao.current !== alvo) soltarPrevia(alvo);
    } catch {
      alvo.previa = null;
      avisarPreviaIndisponivel();
    }
  }

  async function ligar() {
    setAviso(null);
    setAvisoDePrevia(null);
    setFase("ligando");
    try {
      if ((await modeloDeTranscricao()) === null) {
        setFase("desligado");
        setAviso(AVISO_SEM_MODELO);
        return;
      }
      const captura = await criarCapturaDoMicrofone(aoBloco);
      const nova: Gravacao = {
        captura,
        acumulador: new AcumuladorDeAudio(captura.taxa),
        fila: Promise.resolve(),
        previa: null,
      };
      gravacao.current = nova;
      exibindo.current = nova;
      exibirPrevia(nova);
      setFase("gravando");
      await ligarPrevia(nova);
    } catch {
      setFase("desligado");
      setAviso(AVISO_SEM_MICROFONE);
    }
  }

  const gravando = fase === "gravando";
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant={gravando ? "destructive" : "outline"}
        disabled={fase === "ligando"}
        onClick={gravando ? desligar : ligar}
      >
        {gravando ? <MicOff /> : <Mic />}
        {gravando ? "Desligar microfone" : "Ligar microfone"}
      </Button>
      {aviso !== null && <p className="text-sm text-destructive">{aviso}</p>}
      {avisoDePrevia !== null && (
        <p className="text-sm text-muted-foreground">{avisoDePrevia}</p>
      )}
    </div>
  );
}
