import { Channel, invoke } from "@tauri-apps/api/core";
import { bytesDasAmostras } from "@/db/transcricao";

/**
 * Fronteira com os comandos Tauri da Prévia (src-tauri/src/previa.rs,
 * ADR-0007): o reconhecedor de fala do sistema ouve o mesmo áudio do
 * microfone e devolve, por um canal, a Prévia de cada janela. Onde ela não
 * existe (fora do macOS 13+), nada além de `disponibilidadeDaPrevia` é
 * chamado.
 */

export type EventoPrevia =
  | { tipo: "texto"; janela: number; texto: string }
  | { tipo: "erro"; janela: number; mensagem: string };

/**
 * `disponivel`: reconhecimento on-device em pt-BR pronto e autorizado.
 * `indisponivel`: existe nesta plataforma, mas falta permissão, Ditado ou o
 * modelo de pt-BR (docs/operacao.md) — vale um aviso.
 * `inexistente`: não existe nesta plataforma — nada muda, nem aviso.
 */
export type DisponibilidadeDaPrevia =
  | "disponivel"
  | "indisponivel"
  | "inexistente";

/** Pede a permissão de Reconhecimento de Fala se ainda não foi decidida. */
export async function disponibilidadeDaPrevia(): Promise<DisponibilidadeDaPrevia> {
  return await invoke<DisponibilidadeDaPrevia>("previa_disponibilidade");
}

let avisoDePreviaJaDado = false;

/**
 * O aviso de Prévia indisponível é dado uma vez por execução do app — não a
 * cada Consulta: verdadeiro só na primeira consulta.
 */
export function deveAvisarPreviaIndisponivel(): boolean {
  if (avisoDePreviaJaDado) return false;
  avisoDePreviaJaDado = true;
  return true;
}

/** Abre a Prévia (janela 1); os eventos chegam por `aoEvento`. */
export async function iniciarPrevia(
  aoEvento: (evento: EventoPrevia) => void,
): Promise<void> {
  const canal = new Channel<EventoPrevia>();
  canal.onmessage = aoEvento;
  await invoke("previa_iniciar", { canal });
}

/** Entrega um bloco captado (16 kHz mono) à janela aberta. */
export async function enviarAudioDaPrevia(bloco: Float32Array): Promise<void> {
  await invoke("previa_audio", bytesDasAmostras(bloco));
}

/** Fecha a janela aberta (o trecho dela vai ao Whisper) e abre a seguinte. */
export async function fecharJanelaDaPrevia(): Promise<void> {
  await invoke("previa_fechar_janela");
}

/** Encerra a Prévia; a janela aberta ainda entrega o que ouviu. */
export async function pararPrevia(): Promise<void> {
  await invoke("previa_parar");
}
