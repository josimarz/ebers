import { invoke } from "@tauri-apps/api/core";

/**
 * Fronteira com os comandos Tauri da transcrição (src-tauri/src/lib.rs,
 * spec 5.3; issue #34). O áudio viaja como corpo bruto do invoke (sem custo
 * de JSON): amostras f32 little-endian a 16 kHz mono. O backend junta os
 * blocos em Trechos (gravador.rs) e transcreve cada um (transcricao.rs).
 * Gravação e Trecho têm ids, e toda chamada leva o seu: religar depressa ou
 * trocar de Consulta nunca mistura o áudio de uma gravação com outra.
 */

/** Id de uma gravação ou de um Trecho, dado pelo backend. */
export type Id = number;

/**
 * O que um bloco fez com a Janela aberta: fechou-a? Se fechou com fala, o
 * Trecho que foi à fila; sem fala, nenhum (a Prévia só recomeça a Janela).
 */
export interface Corte {
  fechou: boolean;
  trecho: Id | null;
}

/** O cabeçalho que leva o id da gravação junto do corpo bruto (lib.rs). */
const CABECALHO_GRAVACAO = "x-gravacao";

/** As amostras como corpo bruto de um invoke: f32 little-endian, sem cópia. */
export function bytesDasAmostras(amostras: Float32Array): Uint8Array {
  return new Uint8Array(
    amostras.buffer,
    amostras.byteOffset,
    amostras.byteLength,
  );
}

/**
 * Começa uma gravação e devolve o id dela. Nulo quando falta um modelo no
 * app: instalação avariada.
 */
export async function iniciarTranscricao(): Promise<Id | null> {
  return await invoke<Id | null>("iniciar_transcricao");
}

/** Entrega um bloco captado (16 kHz mono) à gravação. */
export async function enviarBloco(
  gravacao: Id,
  bloco: Float32Array,
): Promise<Corte> {
  return await invoke<Corte>("audio_bloco", bytesDasAmostras(bloco), {
    headers: { [CABECALHO_GRAVACAO]: String(gravacao) },
  });
}

/**
 * Encerra a gravação; devolve o Trecho que restou, se houve fala nele (ele
 * já espera na fila por `transcreverTrecho`).
 */
export async function descarregarAudio(gravacao: Id): Promise<Id | null> {
  return await invoke<Id | null>("descarregar_audio", { gravacao });
}

/** Transcreve o Trecho e devolve o texto em pt-BR. */
export async function transcreverTrecho(trecho: Id): Promise<string> {
  return await invoke<string>("transcrever_trecho", { trecho });
}
