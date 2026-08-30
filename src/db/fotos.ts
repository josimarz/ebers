import { invoke } from "@tauri-apps/api/core";

/**
 * Fronteira com os comandos Tauri de foto de perfil (src-tauri/src/lib.rs).
 * Os bytes viajam como corpo bruto do invoke (sem custo de JSON); o banco
 * guarda só o nome do arquivo devolvido por salvarFoto.
 */

export async function salvarFoto(arquivo: Blob): Promise<string> {
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  return invoke<string>("salvar_foto_paciente", bytes);
}

export async function carregarFoto(arquivo: string): Promise<Uint8Array> {
  const bytes = await invoke<ArrayBuffer>("carregar_foto_paciente", {
    arquivo,
  });
  return new Uint8Array(bytes);
}

export async function removerFoto(arquivo: string): Promise<void> {
  await invoke("remover_foto_paciente", { arquivo });
}
