/**
 * Fronteira com o microfone do navegador (getUserMedia + Web Audio API,
 * spec 5.3). Este módulo só capta: cada bloco de amostras mono sai na taxa
 * nativa do hardware; juntar blocos em trechos é papel do domínio
 * (AcumuladorDeAudio). Nos testes, o módulo inteiro é substituído pelo dublê
 * de src/testes/captura-falsa.ts — o jsdom não tem áudio.
 */

export interface CapturaDeAudio {
  /** Taxa de amostragem nativa da captura (44,1/48 kHz conforme o hardware). */
  taxa: number;
  /** Solta o microfone e encerra o processamento de áudio. */
  parar(): void;
}

export type AoBloco = (bloco: Float32Array) => void;

/** Amostras por bloco entregue (~85 ms a 48 kHz) — latência imperceptível. */
const AMOSTRAS_POR_BLOCO = 4096;

/**
 * Liga o microfone e passa a entregar blocos de áudio a `aoBloco`. Usa
 * ScriptProcessorNode — obsoleto, mas o caminho estável no WKWebView do
 * Tauri, onde AudioWorklet via blob ainda falha; trocar quando o worklet
 * for confiável ali.
 */
export async function criarCapturaDoMicrofone(
  aoBloco: AoBloco,
): Promise<CapturaDeAudio> {
  const midia = await navigator.mediaDevices.getUserMedia({ audio: true });
  const contexto = new AudioContext();
  const origem = contexto.createMediaStreamSource(midia);
  const processador = contexto.createScriptProcessor(AMOSTRAS_POR_BLOCO, 1, 1);
  processador.onaudioprocess = (evento) => {
    // O buffer é reutilizado pelo navegador entre eventos; a cópia é nossa.
    aoBloco(evento.inputBuffer.getChannelData(0).slice());
  };
  origem.connect(processador);
  // Sem um destino conectado o processador não dispara; a saída fica em
  // silêncio (outputBuffer intocado), então nada ecoa nos alto-falantes.
  processador.connect(contexto.destination);

  return {
    taxa: contexto.sampleRate,
    parar() {
      processador.disconnect();
      origem.disconnect();
      for (const trilha of midia.getTracks()) {
        trilha.stop();
      }
      void contexto.close();
    },
  };
}
