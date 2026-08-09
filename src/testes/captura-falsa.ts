// Dublê do módulo de captura de áudio (src/lib/captura-audio.ts), para
// vi.mock:
//   vi.mock("@/lib/captura-audio", () => import("@/testes/captura-falsa"));
// Os testes emitem blocos com emitirBloco e observam o estado da captura;
// uma falha programada faz o próximo criarCapturaDoMicrofone rejeitar.
// Reiniciar em beforeEach.

import type { AoBloco, CapturaDeAudio } from "@/lib/captura-audio";

/** Taxa fixa do microfone falso — já a do Whisper, para contas diretas. */
export const TAXA_DA_CAPTURA_FALSA = 16000;

interface CapturaFalsa {
  aoBloco: AoBloco;
  parada: boolean;
}

let captura: CapturaFalsa | null = null;
let falhaProgramada: unknown = null;

export function reiniciarCapturaFalsa(): void {
  captura = null;
  falhaProgramada = null;
}

/** Programa a rejeição do próximo criarCapturaDoMicrofone (ex.: sem permissão). */
export function programarFalhaDeCaptura(erro: unknown): void {
  falhaProgramada = erro;
}

/** O microfone está ligado (captura criada e não parada)? */
export function capturaEstaAtiva(): boolean {
  return captura !== null && !captura.parada;
}

/** Emite um bloco captado de `duracaoS` segundos com amplitude constante. */
export function emitirBloco(duracaoS: number, amplitude: number): void {
  if (captura === null || captura.parada) {
    throw new Error("Nenhuma captura ativa para emitir blocos");
  }
  captura.aoBloco(
    new Float32Array(duracaoS * TAXA_DA_CAPTURA_FALSA).fill(amplitude),
  );
}

export async function criarCapturaDoMicrofone(
  aoBloco: AoBloco,
): Promise<CapturaDeAudio> {
  if (falhaProgramada !== null) {
    const falha = falhaProgramada;
    falhaProgramada = null;
    throw falha;
  }
  const criada: CapturaFalsa = { aoBloco, parada: false };
  captura = criada;
  return {
    taxa: TAXA_DA_CAPTURA_FALSA,
    parar() {
      criada.parada = true;
    },
  };
}
