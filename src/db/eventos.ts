import { listen, type UnlistenFn } from "@tauri-apps/api/event";

/**
 * Evento que o servidor do Auto-cadastro (src-tauri/src/servidor.rs) emite ao
 * gravar um Paciente vindo do tablet — espelho de EVENTO_PACIENTE_CADASTRADO
 * no Rust. Só existe no Modo desktop: o webview é quem recebe eventos Tauri.
 */
export const EVENTO_PACIENTE_CADASTRADO = "paciente-cadastrado";

/** Reage a cada Auto-cadastro gravado; devolve como parar de escutar. */
export function aoPacienteCadastrado(reagir: () => void): Promise<UnlistenFn> {
  return listen(EVENTO_PACIENTE_CADASTRADO, reagir);
}
