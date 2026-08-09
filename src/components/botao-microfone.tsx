import { Mic, MicOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { modeloDeTranscricao, transcreverAudio } from "@/db/transcricao";
import { AcumuladorDeAudio } from "@/dominio/transcricao";
import {
  type CapturaDeAudio,
  criarCapturaDoMicrofone,
} from "@/lib/captura-audio";

const AVISO_SEM_MODELO =
  "Modelo de transcrição não instalado — veja o guia de operação.";
const AVISO_SEM_MICROFONE = "Não foi possível acessar o microfone.";
const AVISO_TRANSCRICAO_FALHOU = "A transcrição falhou — microfone desligado.";

type Fase = "desligado" | "ligando" | "gravando";

/** Uma gravação em andamento: captura ligada, acumulador e fila de trechos. */
interface Sessao {
  captura: CapturaDeAudio;
  acumulador: AcumuladorDeAudio;
  /** Transcrições em série, na ordem da fala. */
  fila: Promise<void>;
}

interface PropsBotaoMicrofone {
  /** Recebe cada texto transcrito, na ordem em que foi falado. */
  aoTranscrever: (texto: string) => void;
}

/**
 * Liga/desliga a transcrição de voz da Consulta (spec 2.3): com o microfone
 * ligado, os blocos captados viram trechos (AcumuladorDeAudio), cada trecho
 * vai ao Whisper do backend e o texto volta por aoTranscrever. Desligar ainda
 * transcreve o que ficou pendente — a última frase não se perde.
 */
export function BotaoMicrofone({ aoTranscrever }: PropsBotaoMicrofone) {
  const [fase, setFase] = useState<Fase>("desligado");
  const [aviso, setAviso] = useState<string | null>(null);
  const sessao = useRef<Sessao | null>(null);
  const aoTranscreverAtual = useRef(aoTranscrever);
  aoTranscreverAtual.current = aoTranscrever;

  const transcrever = useCallback((alvo: Sessao, trecho: Float32Array) => {
    alvo.fila = alvo.fila
      .then(async () => {
        aoTranscreverAtual.current(await transcreverAudio(trecho));
      })
      .catch(() => {
        if (sessao.current === alvo) {
          alvo.captura.parar();
          sessao.current = null;
        }
        setFase("desligado");
        setAviso(AVISO_TRANSCRICAO_FALHOU);
      });
  }, []);

  const desligar = useCallback(() => {
    const atual = sessao.current;
    if (atual === null) return;
    sessao.current = null;
    atual.captura.parar();
    const resto = atual.acumulador.descarregar();
    if (resto !== null) transcrever(atual, resto);
    setFase("desligado");
  }, [transcrever]);

  // Desmonte com o microfone ligado — ex.: "Finalizar Consulta", que tira o
  // microfone da página (spec 2.3) — vale um desligar: solta o hardware e
  // ainda transcreve a fala pendente; o Conteúdo continua lá para recebê-la.
  useEffect(() => desligar, [desligar]);

  function aoBloco(bloco: Float32Array) {
    const atual = sessao.current;
    if (atual === null) return;
    const trecho = atual.acumulador.registrar(bloco);
    if (trecho !== null) transcrever(atual, trecho);
  }

  async function ligar() {
    setAviso(null);
    setFase("ligando");
    try {
      if ((await modeloDeTranscricao()) === null) {
        setFase("desligado");
        setAviso(AVISO_SEM_MODELO);
        return;
      }
      const captura = await criarCapturaDoMicrofone(aoBloco);
      sessao.current = {
        captura,
        acumulador: new AcumuladorDeAudio(captura.taxa),
        fila: Promise.resolve(),
      };
      setFase("gravando");
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
    </div>
  );
}
