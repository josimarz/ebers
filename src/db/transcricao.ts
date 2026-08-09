import { invoke } from "@tauri-apps/api/core";

/**
 * Fronteira com os comandos Tauri de transcrição (src-tauri/src/lib.rs,
 * spec 5.3). O trecho de áudio viaja como corpo bruto do invoke (sem custo
 * de JSON): amostras f32 little-endian a 16 kHz mono.
 */

/** Nome do modelo Whisper disponível no diretório de modelos, ou nulo. */
export async function modeloDeTranscricao(): Promise<string | null> {
  return await invoke<string | null>("modelo_de_transcricao");
}

/** Transcreve um trecho de áudio (16 kHz mono) e devolve o texto em pt-BR. */
export async function transcreverAudio(trecho: Float32Array): Promise<string> {
  const bytes = new Uint8Array(
    trecho.buffer,
    trecho.byteOffset,
    trecho.byteLength,
  );
  return await invoke<string>("transcrever_audio", bytes);
}
