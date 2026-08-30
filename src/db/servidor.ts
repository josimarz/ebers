import { invoke } from "@tauri-apps/api/core";

/**
 * Fronteira com o comando Tauri do servidor local do Auto-cadastro
 * (src-tauri/src/endereco.rs, issue #21): o endereço que o tablet abre — o
 * que o QR code da modal "Auto-cadastro no tablet" codifica — ou por que não
 * há um. O app escolhe o endereço sozinho quando a máquina tem vários; a
 * terapeuta nunca escolhe rede.
 */

/**
 * `no-ar`: o servidor abriu a porta e `url` é o endereço na rede local.
 * `fora-do-ar`: a porta não abriu (ocupada, por exemplo) — só reabrir o app.
 * `sem-rede`: a porta está aberta, mas o computador não tem endereço numa
 * rede local que o tablet alcance.
 */
export type EnderecoAutoCadastro =
  | { estado: "no-ar"; url: string }
  | { estado: "fora-do-ar" }
  | { estado: "sem-rede" };

/** Relido a cada consulta: o endereço muda quando a máquina troca de rede. */
export async function enderecoAutoCadastro(): Promise<EnderecoAutoCadastro> {
  return await invoke<EnderecoAutoCadastro>("endereco_auto_cadastro");
}
